// حسابات العملاء وتصاميمهم: التسجيل بالبريد أو الجوال، والتصميم محفوظ 30 يوماً قبل الدفع
import crypto from "node:crypto";
import { kv, kvJson, kvPipeline } from "./kv";

export const DESIGN_KIND = "menu";
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
  if (opts && !(r as { example?: boolean }).example) {
    await stat("payment"); await stat("revenue", Math.round(opts.amount));
    await stat(`payment_${opts.plan}`); await stat(`revenue_${opts.plan}`, Math.round(opts.amount));
  }
  // حالة العميل: مدفوع إذا عنده تصميم مدفوع واحد على الأقل
  const c = await getCustomer(r.customerId);
  if (c) {
    const anyPaid = opts ? true : (await Promise.all((await kv<string[]>("SMEMBERS", k.custDesigns(c.id))).map((x) => getDesign(x)))).some((x) => x && isPaid(x));
    await kvJson.set(k.cust(c.id), { ...c, status: anyPaid ? "paid" : "trial" });
  }
  return r;
}

// ── بيانات تجريبية للوحة التحكم: 100 عميل دافع ──
// 58 مرة واحدة + 2 طلب مرة واحدة، 34 شهري نشط + 4 ألغوا + 2 طلب شهري، وزيارات 900 زائر جربوا ولم يدفعوا.
// تُكتب دفعة وحدة (pipeline) وتُسجل كل إحصائياتها لتُحذف بالضبط عند «حذف البيانات التجريبية».
const EX_FIRST = ["مقهى", "مطعم", "مخبز", "محمصة", "مطبخ", "بيت", "متجر", "استوديو", "عيادة", "مؤسسة", "شركة", "صالون"];
const EX_LAST = ["الواحة", "نخلة", "الياسمين", "التاج", "البحر", "الريف", "السدرة", "الديرة", "الأصيل", "النخبة", "القمة", "الندى", "الهيل", "الزعفران", "الفنار", "المرجان", "الجود", "السنا", "اللؤلؤ", "الرمال"];
const EX_PEOPLE = ["أحمد", "سارة", "محمد", "نورة", "خالد", "ريم", "فهد", "لمى", "عبدالله", "هيا", "سلطان", "جود", "تركي", "منيرة", "ماجد", "دانة"];
export const EXAMPLE_COUNT = 100;
export const EXAMPLE_VISITORS = 900;

/** استخدام الذكاء لكل نوع تطبيق: إنشاء العميل الدافع، والزائر غير الدافع، والمشترك شهرياً */
const EX_USAGE: Record<string, { create: Record<string, number>; visitor: Record<string, number>; monthly: Record<string, number> }> = {
  identity: {
    create: { ai_identity: 5, ai_logos: 3, ai_logo_image: 12, name_check: 3 },
    // الزائر: شعاران بـ Gemini (تُحسب كعملية Gemini) بدل 4 شعارات Recraft
    visitor: { ai_identity: 3, ai_logos: 1, name_check: 1 },
    monthly: { ai_logos: 1, ai_logo_image: 4, ai_identity: 2 },
  },
  menu: {
    create: { menu_ai: 5, dish_photo: 15, ai_logos: 1, ai_logo_image: 4, name_check: 2, publish: 2 },
    // الزائر: شعاران بـ Gemini، وصور الأطباق واقتراحات المنيو بعد التسجيل فقط
    visitor: { menu_ai: 1, dish_photo: 1, ai_logos: 1, ai_identity: 1 },
    monthly: { dish_photo: 3, menu_ai: 2, publish: 2 },
  },
};

export async function seedExamples(kind: string, prices: { once: number; monthly: number }, onceMonths?: number) {
  const now = Date.now();
  const MONTH = 30.44 * DAY;
  const rnd = (i: number, salt: number) => { const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cmds: (string | number)[][] = [];
  const stats = new Map<string, number>();
  const add = (t: number, m: string, n: number) => { if (n > 0) { const key = k.stat(dayKey(t), m); stats.set(key, (stats.get(key) ?? 0) + n); } };
  const custIds: string[] = [], designIds: string[] = [], idents: string[] = [];
  const usage = EX_USAGE[kind] ?? EX_USAGE.identity;
  for (let i = 0; i < EXAMPLE_COUNT; i++) {
    // الحالة حسب الترتيب
    const st = i < 58 ? "once" : i < 60 ? "req_once" : i < 94 ? "monthly" : i < 98 ? "churned" : "req_monthly";
    const ageDays = st === "churned" ? 35 + rnd(i, 1) * 20 : st === "monthly" ? rnd(i, 1) * 29 : st.startsWith("req") ? rnd(i, 1) * 2 : rnd(i, 1) * 44;
    const created = Math.round(now - ageDays * DAY - rnd(i, 2) * 6 * 3600_000);
    const id = newId(), did = newId();
    const phone = i % 10 < 3;
    const ident = phone ? `+9665${String(10000000 + i * 7919).slice(-8)}` : `ex${i + 1}@example.com`;
    const name = EX_PEOPLE[i % EX_PEOPLE.length];
    const title = `${EX_FIRST[(i * 7) % EX_FIRST.length]} ${EX_LAST[(i * 3 + Math.floor(i / 20)) % EX_LAST.length]}`;
    const paidAt = created + Math.round((1 + rnd(i, 3) * 20) * 3600_000);
    let paid: DesignPayment | null = null;
    if (st === "once") paid = { at: paidAt, amount: prices.once, plan: "once", until: onceMonths ? paidAt + onceMonths * MONTH : null, by: "مثال" };
    if (st === "monthly" || st === "churned") paid = { at: paidAt, amount: prices.monthly, plan: "monthly", until: paidAt + MONTH, by: "مثال" };
    const pending = st.startsWith("req");
    const c: Customer = { id, ...(phone ? { phone: ident } : { email: ident }), name, status: paid && isPaid({ paid }) ? "paid" : "trial", createdAt: created, lastLoginAt: Math.max(created, now - rnd(i, 4) * 10 * DAY), trialEndsAt: created, note: "مثال", example: true };
    const d: Design = {
      id: did, customerId: id, title, kind, createdAt: created, updatedAt: Math.max(created, now - rnd(i, 5) * 5 * DAY), expiresAt: pending ? now + DRAFT_DAYS * DAY : null,
      data: { example: true }, size: 40_000 + Math.round(rnd(i, 6) * 400_000), paid,
      paymentRequestedAt: pending ? now - rnd(i, 7) * 20 * 3600_000 : null, requestedPlan: pending ? (st === "req_once" ? "once" : "monthly") : null, example: true,
    };
    // لا نسجل المعرّف في فهرس الدخول حتى لا يتعارض مع رقم أو بريد عميل حقيقي
    cmds.push(["SET", k.cust(id), JSON.stringify(c)], ["ZADD", k.custs, created, id]);
    cmds.push(d.expiresAt ? ["SET", k.design(did), JSON.stringify(d), "EX", Math.ceil((d.expiresAt - now) / 1000)] : ["SET", k.design(did), JSON.stringify(d)]);
    cmds.push(["SADD", k.custDesigns(id), did], ["ZADD", k.designs, d.updatedAt, did]);
    custIds.push(id); designIds.push(did); idents.push(ident);
    // إحصائيات العميل
    add(created, "signup", 1); add(created, "design_new", 1); add(created, "design_save", 3);
    add(created, phone ? "otp_whatsapp" : "otp_email", 1);
    for (const [m, n] of Object.entries(usage.create)) add(created, m, n);
    if (pending) add(d.paymentRequestedAt!, "payment_request", 1);
    if (paid) {
      add(paid.at, "payment", 1); add(paid.at, "revenue", Math.round(paid.amount));
      add(paid.at, `payment_${paid.plan}`, 1); add(paid.at, `revenue_${paid.plan}`, Math.round(paid.amount));
      if (paid.plan === "monthly") for (const [m, n] of Object.entries(usage.monthly)) add(Math.min(paid.at + 10 * DAY, now), m, n);
    }
  }
  // زوار جربوا المعاينة ولم يدفعوا (تكلفة ذكاء بدون إيراد) — موزعون على آخر 45 يوماً
  for (let v = 0; v < EXAMPLE_VISITORS; v++) {
    const t = now - rnd(v, 9) * 45 * DAY;
    for (const [m, n] of Object.entries(usage.visitor)) add(t, m, n);
    if (v % 2 === 0) add(t, v % 6 === 0 ? "otp_whatsapp" : "otp_email", 1);
  }
  const statLog: [string, number][] = [...stats.entries()];
  for (const [key, n] of statLog) cmds.push(["INCRBY", key, n], ["EXPIRE", key, 400 * 86400]);
  for (let j = 0; j < cmds.length; j += 400) await kvPipeline(cmds.slice(j, j + 400));
  await kv("SET", `${APP}:examples`, JSON.stringify({ v: 2, ids: custIds, designs: designIds, idents, stats: statLog, at: now }));
  return custIds.length;
}

export const examplesExist = async () => !!(await kv<string | null>("GET", `${APP}:examples`));
export async function clearExamples() {
  const raw = await kv<string | null>("GET", `${APP}:examples`);
  const rec = raw ? JSON.parse(raw) : { ids: [], stats: [] };
  const ids: string[] = Array.isArray(rec) ? rec : rec.ids;
  if (rec.v === 2) {
    // كل تصاميم العملاء التجريبيين (بما فيها أي تصميم أُضيف لاحقاً)
    const sets = ids.length ? await kvPipeline(ids.map((id) => ["SMEMBERS", k.custDesigns(id)])) : [];
    const dids = [...new Set([...(rec.designs as string[]), ...sets.flatMap((x) => (x as string[]) ?? [])])];
    const cmds: (string | number)[][] = [
      ...dids.flatMap((d) => [["DEL", k.design(d)], ["ZREM", k.designs, d]]),
      ...ids.flatMap((id) => [["DEL", k.cust(id)], ["DEL", k.custDesigns(id)], ["ZREM", k.custs, id]]),
      ...(rec.stats as [string, number][]).map(([key, n]) => ["DECRBY", key, n]),
    ];
    for (let j = 0; j < cmds.length; j += 400) await kvPipeline(cmds.slice(j, j + 400));
  } else {
    // صيغة الأمثلة القديمة (6 عملاء)
    for (const id of ids) await deleteCustomer(id);
    const extra: [string, number][] = [];
    if (rec.at) {
      const dk = dayKey(rec.at);
      for (const [m, n] of [["signup", ids.length], ["design_new", ids.length], ["design_save", ids.length * 2], ["payment_request", 2], ["payment", 2], ["revenue", rec.revenue ?? 0]] as [string, number][]) if (n) extra.push([k.stat(dk, m), n]);
    }
    const all = [...(rec.stats ?? []), ...extra];
    if (all.length) await kvPipeline(all.map(([key, n]) => ["DECRBY", key, n]));
  }
  await kv("DEL", `${APP}:examples`);
  return ids.length;
}
