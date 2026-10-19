// حسابات العملاء وتصاميمهم: التسجيل بالبريد أو الجوال، والتصميم محفوظ 30 يوماً قبل الدفع
import crypto from "node:crypto";
import { kv, kvJson, kvPipeline } from "./kv";

const APP = "sufra";
export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 30);
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
  status: CustomerStatus; createdAt: number; lastLoginAt: number; trialEndsAt: number; note?: string;
}
export interface Design<T = unknown> {
  id: string; customerId: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; data: T; size: number;
}
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
  // الدفع يجعل التصاميم دائمة، والتمديد يحدّث صلاحيتها
  const ids = await kv<string[]>("SMEMBERS", k.custDesigns(id));
  for (const did of ids) {
    const d = await kvJson.get<Design>(k.design(did));
    if (!d) continue;
    if (next.status === "paid") { d.expiresAt = null; await kvJson.set(k.design(did), d); }
    else { d.expiresAt = Math.max(d.expiresAt ?? 0, next.trialEndsAt); await kvJson.set(k.design(did), d, (d.expiresAt - Date.now()) / 1000); }
  }
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
    d = { id: newId(), customerId: c.id, title: "", kind: input.kind, createdAt: now, updatedAt: now, expiresAt: c.status === "paid" ? null : Math.max(now + TRIAL_DAYS * DAY, c.trialEndsAt), data: null, size: 0 };
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
