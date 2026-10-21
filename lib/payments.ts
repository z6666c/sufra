// الدفع الإلكتروني بتفعيل تلقائي — أكثر من بوابة (ميسّر، تاب) والإدارة تختار المفعّلة
// الأمان: السعر يُحسب في الخادم، والتأكيد دائماً باستعلام البوابة بالمفتاح السري (ما نثق بالإشعار أو التحويل وحده)،
// والمبلغ لازم يطابق، والتفعيل مرة وحدة فقط لكل عملية.
import crypto from "node:crypto";
import { kv, kvJson, kvAvailable, kvMemory } from "./kv";
import { KV_PREFIX, getDesign, isPaid, markDesignPaid, stat, type Customer } from "./customers";
import { getPlans, quoteCoupon, useCoupon } from "./pricing";
import type { PlanKind } from "./plans";

export type GatewayId = "moyasar" | "tap";
export interface GatewayInfo { id: GatewayId; name: string; configured: boolean; mode: "test" | "live" | null; methods: string }
interface CreateOpts { cid: string; amount: number; description: string; customer: Customer; returnUrl: string; webhookUrl: string; metadata: Record<string, string> }
interface Gateway {
  id: GatewayId; name: string; methods: string; key: () => string | undefined;
  create(o: CreateOpts): Promise<{ ref: string; url: string }>;
  fetch(ref: string): Promise<{ paid: boolean; amount: number; currency: string; status: string }>;
}
const modeOf = (k?: string) => (!k ? null : /_live_/.test(k) ? "live" : "test");
async function call(url: string, init: RequestInit) {
  const r = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

const moyasar: Gateway = {
  id: "moyasar", name: "ميسّر", methods: "مدى، فيزا، ماستركارد، آبل باي، STC Pay",
  key: () => process.env.MOYASAR_SECRET_KEY,
  async create(o) {
    const base = process.env.MOYASAR_API_BASE || "https://api.moyasar.com/v1";
    const j = await call(`${base}/invoices`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${this.key()}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(o.amount * 100), currency: "SAR", description: o.description.slice(0, 200),
        success_url: o.returnUrl, back_url: o.returnUrl, callback_url: o.webhookUrl,
        expired_at: new Date(Date.now() + 2 * 86400_000).toISOString(), metadata: o.metadata,
      }),
    });
    if (!j.id || !j.url) throw new Error("رد ميسّر ناقص");
    return { ref: String(j.id), url: String(j.url) };
  },
  async fetch(ref) {
    const base = process.env.MOYASAR_API_BASE || "https://api.moyasar.com/v1";
    const j = await call(`${base}/invoices/${encodeURIComponent(ref)}`, { headers: { Authorization: `Basic ${Buffer.from(`${this.key()}:`).toString("base64")}` } });
    return { paid: j.status === "paid", amount: Number(j.amount) / 100, currency: String(j.currency || "SAR"), status: String(j.status) };
  },
};

const tap: Gateway = {
  id: "tap", name: "تاب", methods: "مدى، فيزا، ماستركارد، آبل باي، STC Pay",
  key: () => process.env.TAP_SECRET_KEY,
  async create(o) {
    const base = process.env.TAP_API_BASE || "https://api.tap.company/v2";
    const c = o.customer;
    const j = await call(`${base}/charges`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(o.amount * 100) / 100, currency: "SAR", description: o.description.slice(0, 200), threeDSecure: true, save_card: false,
        customer: { first_name: c.name || "عميل", ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phone: { country_code: "966", number: c.phone.replace(/^\+966/, "") } } : {}) },
        source: { id: "src_all" }, redirect: { url: o.returnUrl }, post: { url: o.webhookUrl },
        reference: { transaction: o.cid, order: o.cid }, metadata: { udf1: o.metadata.design, udf2: o.metadata.plan },
      }),
    });
    const url = j?.transaction?.url;
    if (!j.id || !url) throw new Error("رد تاب ناقص");
    return { ref: String(j.id), url: String(url) };
  },
  async fetch(ref) {
    const base = process.env.TAP_API_BASE || "https://api.tap.company/v2";
    const j = await call(`${base}/charges/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${this.key()}` } });
    return { paid: j.status === "CAPTURED", amount: Number(j.amount), currency: String(j.currency || "SAR"), status: String(j.status) };
  },
};

const GATEWAYS: Record<GatewayId, Gateway> = { moyasar, tap };
export const listGateways = (): GatewayInfo[] => Object.values(GATEWAYS).map((g) => ({ id: g.id, name: g.name, configured: !!g.key(), mode: modeOf(g.key()), methods: g.methods }));

const K = {
  active: `${KV_PREFIX}:gateway`,
  checkout: (cid: string) => `${KV_PREFIX}:checkout:${cid}`,
  byRef: (g: string, ref: string) => `${KV_PREFIX}:checkoutref:${g}:${ref}`,
  done: (cid: string) => `${KV_PREFIX}:checkoutdone:${cid}`,
};
const stored = () => kvAvailable() || kvMemory();

/** البوابة المفعّلة: اختيار الإدارة، ثم PAYMENT_GATEWAY، ثم أول بوابة مضافة مفاتيحها */
export async function activeGateway(): Promise<Gateway | null> {
  const choice = stored() ? await kv<string | null>("GET", K.active).catch(() => null) : null;
  if (choice === "off") return null;
  const pick = (id?: string | null) => (id && id in GATEWAYS && GATEWAYS[id as GatewayId].key() ? GATEWAYS[id as GatewayId] : null);
  return pick(choice) ?? pick(process.env.PAYMENT_GATEWAY) ?? Object.values(GATEWAYS).find((g) => g.key()) ?? null;
}
export async function gatewaySetting() { return stored() ? await kv<string | null>("GET", K.active).catch(() => null) : null; }
export async function setActiveGateway(id: string) {
  if (id !== "off" && !(id in GATEWAYS)) throw new Error("بوابة غير معروفة");
  if (id !== "off" && !GATEWAYS[id as GatewayId].key()) throw new Error("أضف مفتاح هذه البوابة في إعدادات الخادم أولاً");
  await kv("SET", K.active, id);
}
export async function publicGateway() {
  const g = await activeGateway().catch(() => null);
  return g && kvAvailable() ? { id: g.id, name: g.name, methods: g.methods, mode: modeOf(g.key()) } : null;
}

export interface Checkout { cid: string; gateway: GatewayId; ref: string; url: string; designId: string; customerId: string; plan: PlanKind; amount: number; coupon?: string; at: number }

/** يبدأ الدفع: يحسب السعر في الخادم (مع الكود) وينشئ صفحة دفع عند البوابة */
export async function startCheckout(o: { customer: Customer; designId: string; plan: PlanKind; coupon?: string; origin: string }): Promise<Checkout> {
  const g = await activeGateway();
  if (!g) throw new Error("NO_GATEWAY");
  const d = await getDesign(o.designId, o.customer.id);
  if (!d) throw new Error("التصميم غير موجود");
  if (isPaid(d) && !(d.paid?.plan === "monthly" && o.plan === "monthly")) throw new Error("التصميم مدفوع من قبل");
  const plans = await getPlans();
  let amount = plans[o.plan].price, coupon: string | undefined;
  if (o.coupon) {
    const q = await quoteCoupon(o.coupon, o.plan);
    if (!q.ok) throw new Error(q.error);
    amount = q.price; coupon = q.coupon.code;
  }
  if (amount < 1) throw new Error("المبلغ بعد الخصم أقل من الحد الأدنى للدفع (1 ر.س) — فعّله يدوياً من لوحة التحكم");
  const cid = crypto.randomBytes(12).toString("base64url");
  const base = process.env.PUBLIC_BASE_URL || o.origin;
  const { ref, url } = await g.create({
    cid, amount, customer: o.customer,
    description: `${d.title} — ${plans[o.plan].name}${coupon ? ` (كود ${coupon})` : ""}`,
    returnUrl: `${base}/api/pay/return?cid=${cid}`, webhookUrl: `${base}/api/pay/webhook/${g.id}`,
    metadata: { cid, design: d.id, plan: o.plan },
  });
  const c: Checkout = { cid, gateway: g.id, ref, url, designId: d.id, customerId: o.customer.id, plan: o.plan, amount, coupon, at: Date.now() };
  await kvJson.set(K.checkout(cid), c, 3 * 86400);
  await kv("SET", K.byRef(g.id, ref), cid, "EX", 3 * 86400);
  await stat("checkout");
  return c;
}

export type ConfirmResult = { state: "paid" | "pending" | "failed" | "mismatch" | "unknown"; designId?: string; plan?: PlanKind; status?: string };

/** يتأكد من الدفع عند البوابة ويفعّل التصميم — آمن لو انطلب أكثر من مرة (الرجوع + الإشعار) */
export async function confirmCheckout(cid: string): Promise<ConfirmResult> {
  const c = await kvJson.get<Checkout>(K.checkout(cid));
  if (!c) return { state: "unknown" };
  if (await kv<string | null>("GET", K.done(cid))) return { state: "paid", designId: c.designId, plan: c.plan };
  const g = GATEWAYS[c.gateway];
  if (!g?.key()) return { state: "pending", designId: c.designId, plan: c.plan };
  const s = await g.fetch(c.ref);
  if (!s.paid) return { state: /fail|declin|cancel|abandon|expire|void|restrict|timedout/i.test(s.status) ? "failed" : "pending", designId: c.designId, plan: c.plan, status: s.status };
  if (s.currency !== "SAR" || Math.abs(s.amount - c.amount) > 0.009) {
    console.error("[pay] amount mismatch", cid, s.amount, c.amount);
    return { state: "mismatch", designId: c.designId, plan: c.plan, status: s.status };
  }
  // قفل التفعيل لهذه العملية قبل التنفيذ
  if (await kv<string | null>("GET", K.done(cid))) return { state: "paid", designId: c.designId, plan: c.plan };
  await kv("SET", K.done(cid), "1", "EX", 30 * 86400);
  const plans = await getPlans();
  await markDesignPaid(c.designId, { plan: c.plan, amount: c.amount, months: plans[c.plan].months, by: g.name, ref: `${g.id}:${c.ref}`, coupon: c.coupon });
  if (c.coupon) await useCoupon(c.coupon);
  await stat("checkout_paid");
  return { state: "paid", designId: c.designId, plan: c.plan };
}

/** إشعار البوابة: نأخذ رقم العملية فقط ونتأكد منها بأنفسنا */
export async function confirmByRef(gateway: string, ref: string) {
  if (!(gateway in GATEWAYS) || !ref) return { state: "unknown" } as ConfirmResult;
  const cid = await kv<string | null>("GET", K.byRef(gateway, ref));
  return cid ? confirmCheckout(cid) : ({ state: "unknown" } as ConfirmResult);
}
