// حسابات العملاء وتصاميمهم: التسجيل بالبريد أو الجوال، والتصميم محفوظ 30 يوماً قبل الدفع
import crypto from "node:crypto";
import { kv, kvJson, kvPipeline } from "./kv";

const APP = "sufra";
/** مدة حفظ المسودة غير المدفوعة (لإكمال الشراء) — لا توجد فترة مجانية */
export const DRAFT_DAYS = Number(process.env.DRAFT_DAYS || 7);
export const TRIAL_DAYS = DRAFT_DAYS;
const DAY = 86_400_000;
const k = {
  cust: (id: string) => `${APP}:cust:${id}`,
  idx: (ident: string) => `${APP}:cust:idx:${ident}`,
  custs: `${APP}:custs`,
  custDesigns: (id: string) => `${APP}:cust:${id}:designs`,
  design: (id: string) => `${APP}:design:${id}`,
  designs: `${APP}:designs`,
  stat: (day: string, m: string) => `${APP}:stat:${day}:${m}`,
};

export type CustomerStatus = "trial" | "paid";
export interface Customer {
  id: string; email?: string; phone?: string; name?: string;
  status: CustomerStatus; createdAt: number; lastLoginAt: number; trialEndsAt: number; note?: string; example?: boolean;
}
export type PlanKind = "once" | "monthly";
export interface DesignPayment { at: number; amount: number; plan: PlanKind; until?: number | null; by?: string; ref?: string }
export interface Design<T = unknown> {
  id: string; customerId: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; data: T; size: number;
  /** الدفع يفتح التحميل (والنشر في سُفرة) ويجعل التصميم دائماً */
  paid?: DesignPayment | null;
  paymentRequestedAt?: number | null;
  requestedPlan?: PlanKind | null;
  example?: boolean;
}
export const isPaid = (d: Pick<Design, "paid">) => !!d.paid && (!d.paid.until || d.paid.until > Date.now());
export type DesignMeta = Omit<Design, "data">;

// ── المعرّف: بريد أو جوال ──
export type Ident = { type: "email" | "phone"; value: string };
export function parseIdentifier(raw: string): Ident | null {
  const s = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { type: "email", value: s.toLowerCase() };
  const d = s.replace(/[\s\-()]/g, "").replace(/^\+/, "00").replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  if (!/^\d+$/.test(d)) return null;
  // السعودية: 05xxxxxxxx أو 5xxxxxxxx أو 9665xxxxxxxx أو 009665xxxxxxxx
  const sa = d.match(/^(?:00966|966|0)?(5\d{8})$/);
  if (sa) return { type: "phone", value: `+966${sa[1]}` };
  if (d.startsWith("00") && d.length >= 10 && d.length <= 17) return { type: "phone", value: `+${d.slice(2)}` };
  return null;
}
export const maskIdent = (i: Ident) =>
  i.type === "email" ? i.value.replace(/^(.).*(@.*)$/, (_m, a, b) => `${a}•••${b}`) : `${i.value.slice(0, 5)}•••${i.value.slice(-3)}`;

const newId = () => crypto.randomBytes(9).toString("base64url");
export const dayKey = (t = Date.now()) => new Date(t + 3 * 3600_000).toISOString().slice(0, 10); // توقيت الرياض

// ── العملاء ──
export async function getCustomer(id: string) { return kvJson.get<Customer>(k.cust(id)); }

/** تسجيل دخول أو إنشاء حساب بعد التحقق من الرمز */
export async function upsertCustomer(ident: Ident): Promise<{ customer: Customer; created: boolean }> {
  const existingId = await kv<string | null>("GET", k.idx(ident.value));
  const now = Date.now();
  if (existingId) {
    const c = await getCustomer(existingId);
    if (c) {
      c.lastLoginAt = now;
      await kvJson.set(k.cust(c.id), c);
      await stat("login");
      return { customer: c, created: false };
    }
  }
  const c: Customer = { id: newId(), [ident.type]: ident.value, status: "trial", createdAt: now, lastLoginAt: now, trialEndsAt: now + TRIAL_DAYS * DAY };
  await kvPipeline([
    ["SET", k.cust(c.id), JSON.stringify(c)],
    ["SET", k.idx(ident.value), c.id],
    ["ZADD", k.custs, now, c.id],
  ]);
  await stat("signup");
  return { customer: c, created: true };
}

export async function updateCustomer(id: string, patch: Partial<Pick<Customer, "status" | "trialEndsAt" | "note" | "name">>) {
  const c = await getCustomer(id);
  if (!c) return null;
  const next = { ...c, ...patch };
  await kvJson.set(k.cust(id), next);
  return next;
}

export async function deleteCustomer(id: string) {
  const c = await getCustomer(id);
  if (!c) return false;
  const ids = await kv<string[]>("SMEMBERS", k.custDesigns(id));
  await kvPipeline([
    ...ids.map((d) => ["DEL", k.design(d)]),
    ...ids.map((d) => ["ZREM", k.designs, d]),
    ["DEL", k.custDesigns(id)], ["DEL", k.cust(id)], ["ZREM", k.custs, id],
    ...[c.email, c.phone].filter(Boolean).map((v) => ["DEL", k.idx(v!)]),
  ]);
  return true;
}

export async function listCustomers(limit = 500): Promise<(Customer & { designs: number })[]> {
  const ids = await kv<string[]>("ZREVRANGE", k.custs, 0, limit - 1);
  if (!ids.length) return [];
  const rows = await kvPipeline(ids.flatMap((id) => [["GET", k.cust(id)], ["SMEMBERS", k.custDesigns(id)]]));
  const out: (Customer & { designs: number })[] = [];
  for (let i = 0; i < ids.length; i++) {
    const raw = rows[i * 2] as string | null;
    if (!raw) continue;
    out.push({ ...(JSON.parse(raw) as Customer), designs: ((rows[i * 2 + 1] as string[]) ?? []).length });
  }
  return out;
}

// ── التصاميم ──
const MAX_DESIGN_BYTES = Number(process.env.MAX_DESIGN_BYTES || 1_500_000);
const MAX_DESIGNS = 20;

export async function listDesigns(customerId: string): Promise<DesignMeta[]> {
  const ids = await kv<string[]>("SMEMBERS", k.custDesigns(customerId));
  if (!ids.length) return [];
  const rows = await kvPipeline(ids.map((id) => ["GET", k.design(id)]));
  const out: DesignMeta[] = [];
  const gone: string[] = [];
  rows.forEach((raw, i) => {
    if (!raw) { gone.push(ids[i]); return; }
    const { data: _d, ...meta } = JSON.parse(raw as string) as Design;
    out.push(meta);
  });
  // تنظيف التصاميم المنتهية
  if (gone.length) await kvPipeline([["SREM", k.custDesigns(customerId), ...gone], ["ZREM", k.designs, ...gone]]);
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDesign(id: string, customerId?: string) {
  const d = await kvJson.get<Design>(k.design(id));
  return d && (!customerId || d.customerId === customerId) ? d : null;
}

/** حفظ تصميم جديد أو تحديثه. صلاحية التصميم في التجربة 30 يوماً من أول حفظ ولا تتجدد بالتعديل */
export async function saveDesign(c: Customer, input: { id?: string; title: string; kind: string; data: unknown }): Promise<DesignMeta> {
  const json = JSON.stringify(input.data);
  if (json.length > MAX_DESIGN_BYTES) throw new Error("TOO_BIG");
  const now = Date.now();
  let d: Design | null = input.id ? await getDesign(input.id, c.id) : null;
  if (!d) {
    const count = (await kv<string[]>("SMEMBERS", k.custDesigns(c.id))).length;
    if (count >= MAX_DESIGNS) throw new Error("LIMIT");
    d = { id: newId(), customerId: c.id, title: "", kind: input.kind, createdAt: now, updatedAt: now, expiresAt: now + DRAFT_DAYS * DAY, data: null, size: 0 };
    await kvPipeline([["SADD", k.custDesigns(c.id), d.id], ["ZADD", k.designs, now, d.id]]);
    await stat("design_new");
  }
  d = { ...d, title: input.title.slice(0, 80) || "تصميم", kind: input.kind, data: input.data, updatedAt: now, size: json.length };
  if (d.expiresAt) await kvJson.set(k.design(d.id), d, (d.expiresAt - now) / 1000);
  else await kvJson.set(k.design(d.id), d);
  await stat("design_save");
  const { data: _x, ...meta } = d;
  return meta;
}

export async function deleteDesign(id: string, customerId?: string) {
  const d = await getDesign(id, customerId);
  if (!d) return false;
  await kvPipeline([["DEL", k.design(id)], ["SREM", k.custDesigns(d.customerId), id], ["ZREM", k.designs, id]]);
  return true;
}

export async function listAllDesigns(limit = 300): Promise<DesignMeta[]> {
  const ids = await kv<string[]>("ZREVRANGE", k.designs, 0, limit - 1);
  if (!ids.length) return [];
  const rows = await kvPipeline(ids.map((id) => ["GET", k.design(id)]));
  return rows.filter(Boolean).map((raw) => { const { data: _d, ...m } = JSON.parse(raw as string) as Design; return m; });
}

// ── إحصائيات يومية ──
export async function stat(metric: string, by = 1) {
  try { await kvPipeline([["INCRBY", k.stat(dayKey(), metric), by], ["EXPIRE", k.stat(dayKey(), metric), 400 * 86400]]); } catch { /* الإحصائيات لا تعطل الطلب */ }
}

export async function statsSeries(metrics: string[], days = 30): Promise<{ days: string[]; series: Record<string, number[]> }> {
  const ds = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * DAY));
  const keys = metrics.flatMap((m) => ds.map((d) => k.stat(d, m)));
  const vals = keys.length ? await kv<(string | null)[]>("MGET", ...keys) : [];
  const series: Record<string, number[]> = {};
  metrics.forEach((m, mi) => { series[m] = ds.map((_, di) => Number(vals[mi * days + di] ?? 0)); });
  return { days: ds, series };
}

// ── الدفع ──
async function patchDesign(id: string, f: (d: Design) => Design) {
  const d = await kvJson.get<Design>(k.design(id));
  if (!d) return null;
  const next = f(d);
  if (next.expiresAt) await kvJson.set(k.design(id), next, (next.expiresAt - Date.now()) / 1000);
  else await kvJson.set(k.design(id), next);
  return next;
}

/** العميل يطلب تفعيل الدفع (حتى ربط بوابة الدفع) */
export async function requestPayment(id: string, customerId: string, plan: PlanKind = "once") {
  const d = await getDesign(id, customerId);
  if (!d) return null;
  // المسودة المطلوب دفعها تُمدد حتى تُراجع الإدارة الطلب
  const r = await patchDesign(id, (x) => ({ ...x, paymentRequestedAt: Date.now(), requestedPlan: plan, expiresAt: x.expiresAt ? Math.max(x.expiresAt, Date.now() + DRAFT_DAYS * DAY) : null }));
  await stat("payment_request");
  return r;
}

/** الإدارة تفعّل الدفع لتصميم: يصبح دائماً ويُفتح التحميل */
export async function markDesignPaid(id: string, opts: { plan: PlanKind; amount: number; months?: number; by?: string; ref?: string } | null) {
  const MONTH = 30.44 * DAY;
  const r = await patchDesign(id, (x) => {
    if (!opts) return { ...x, paid: null, requestedPlan: null, paymentRequestedAt: null, expiresAt: Date.now() + DRAFT_DAYS * DAY };
    // تجديد الاشتراك الشهري يُضاف لنهاية المدة الحالية إن كانت سارية
    const base = x.paid?.until && x.paid.until > Date.now() && opts.plan === x.paid.plan ? x.paid.until : Date.now();
    const until = opts.months ? base + opts.months * MONTH : null;
    return { ...x, expiresAt: null, paymentRequestedAt: null, requestedPlan: null, paid: { at: Date.now(), amount: opts.amount, plan: opts.plan, until, by: opts.by, ref: opts.ref } };
  });
  if (!r) return null;
  // تفعيل تصميم تجريبي لا يُحسب في الإيراد الحقيقي (أرقام الأمثلة محسوبة مسبقاً وتُحذف معها)
  if (opts && !(r as { example?: boolean }).example) { await stat("payment"); await stat("revenue", Math.round(opts.amount)); }
  // حالة العميل: مدفوع إذا عنده تصميم مدفوع واحد على الأقل
  const c = await getCustomer(r.customerId);
  if (c) {
    const anyPaid = opts ? true : (await Promise.all((await kv<string[]>("SMEMBERS", k.custDesigns(c.id))).map((x) => getDesign(x)))).some((x) => x && isPaid(x));
    await kvJson.set(k.cust(c.id), { ...c, status: anyPaid ? "paid" : "trial" });
  }
  return r;
}

// ── بيانات تجريبية للوحة التحكم ──
const EX_NAMES = ["مقهى الواحة", "مطعم نخلة", "زهرة الياسمين", "صقر للشحن", "مخبز التاج", "مرسى البحر"];
export async function seedExamples(kind: string, prices: { once: number; monthly: number }, onceMonths?: number) {
  const now = Date.now();
  const made: string[] = [];
  const idents: Ident[] = [
    { type: "email", value: "ex.waha@example.com" }, { type: "phone", value: "+966500000101" }, { type: "email", value: "ex.yasmin@example.com" },
    { type: "phone", value: "+966500000102" }, { type: "email", value: "ex.taj@example.com" }, { type: "email", value: "ex.marsa@example.com" },
  ];
  for (let i = 0; i < idents.length; i++) {
    const { customer } = await upsertCustomer(idents[i]);
    const created = now - (i * 2 + 1) * DAY;
    await kvJson.set(k.cust(customer.id), { ...customer, example: true, note: "مثال", createdAt: created, lastLoginAt: now - i * 3600_000 });
    await kv("ZADD", k.custs, created, customer.id);
    const meta = await saveDesign({ ...customer, example: true }, { title: EX_NAMES[i], kind, data: { example: true } });
    await patchDesign(meta.id, (x) => ({ ...x, example: true, createdAt: created, updatedAt: now - i * 1800_000 }));
    // حالات مختلفة: طلبا تفعيل، مدفوع مرة وحدة، اشتراك شهري، مسودة تنتهي قريباً
    if (i === 0) await requestPayment(meta.id, customer.id, "once");
    if (i === 1) await requestPayment(meta.id, customer.id, "monthly");
    if (i === 2) await markDesignPaid(meta.id, { plan: "once", amount: prices.once, months: onceMonths, by: "مثال" });
    if (i === 3) await markDesignPaid(meta.id, { plan: "monthly", amount: prices.monthly, months: 1, by: "مثال" });
    if (i === 5) await patchDesign(meta.id, (x) => ({ ...x, expiresAt: now + 2 * DAY }));
    made.push(customer.id);
  }
  // إيراد الأمثلة المدفوعة (يُحذف مع البيانات التجريبية)
  await stat("payment", 2); await stat("revenue", Math.round(prices.once) + Math.round(prices.monthly));
  // إحصائيات يومية تقريبية لآخر أسبوعين لعرض الرسوم
  const cmds: (string | number)[][] = [];
  const statLog: [string, number][] = [];
  for (let day = 1; day <= 14; day++) {
    const dk = dayKey(now - day * DAY);
    const add = (m: string, n: number) => { if (n > 0) { cmds.push(["INCRBY", k.stat(dk, m), n], ["EXPIRE", k.stat(dk, m), 400 * 86400]); statLog.push([k.stat(dk, m), n]); } };
    add("signup", (day * 7) % 4); add("ai_logos", (day * 5) % 6); add("ai_logo_image", ((day * 5) % 6) * 4); add("ai_identity", (day * 3) % 5);
    add("name_check", day % 3); add("otp_email", (day * 7) % 4 + 1);
  }
  await kvPipeline(cmds);
  await kv("SET", `${APP}:examples`, JSON.stringify({ ids: made, stats: statLog, at: now, revenue: Math.round(prices.once) + Math.round(prices.monthly) }));
  return made.length;
}

export const examplesExist = async () => !!(await kv<string | null>("GET", `${APP}:examples`));
export async function clearExamples() {
  const raw = await kv<string | null>("GET", `${APP}:examples`);
  const rec = raw ? JSON.parse(raw) : { ids: [], stats: [] };
  const ids: string[] = Array.isArray(rec) ? rec : rec.ids;
  for (const id of ids) await deleteCustomer(id);
  // إزالة الإحصائيات التجريبية وما سجلته عمليات الأمثلة (تسجيل، دفع، طلبات)
  const extra: [string, number][] = [];
  if (rec.at) {
    const dk = dayKey(rec.at);
    for (const [m, n] of [["signup", ids.length], ["login", 0], ["design_new", ids.length], ["design_save", ids.length * 2], ["payment_request", 2], ["payment", 2], ["revenue", rec.revenue ?? 0]] as [string, number][]) if (n) extra.push([k.stat(dk, m), n]);
  }
  const all = [...(rec.stats ?? []), ...extra];
  if (all.length) await kvPipeline(all.map(([key, n]) => ["DECRBY", key, n]));
  await kv("DEL", `${APP}:examples`);
  return ids.length;
}
