// الأسعار وأكواد الخصم: تُعدّل من لوحة التحكم وتُحفظ في قاعدة البيانات، وتتقدم على أسعار البيئة
import { kv, kvJson, kvAvailable, kvMemory } from "./kv";
import { KV_PREFIX } from "./customers";
import { PLANS, withPrices, type PlanKind, type PriceSet } from "./plans";

const K = { prices: `${KV_PREFIX}:pricing`, coupon: (c: string) => `${KV_PREFIX}:coupon:${c}`, coupons: `${KV_PREFIX}:coupons` };
const stored = () => kvAvailable() || kvMemory();

// ── الأسعار ──
export interface PriceOverride extends PriceSet { at?: number; by?: string }
let cache: { v: PriceOverride | null; t: number } | null = null;
export async function getPriceOverride(): Promise<PriceOverride | null> {
  if (!stored()) return null;
  if (cache && Date.now() - cache.t < 15_000) return cache.v;
  const v = await kvJson.get<PriceOverride>(K.prices).catch(() => null);
  cache = { v, t: Date.now() };
  return v;
}
export async function getPlans() { return withPrices(await getPriceOverride()); }
export async function getPrices(): Promise<Record<PlanKind, number>> { const p = await getPlans(); return { once: p.once.price, monthly: p.monthly.price }; }
export const defaultPrices = (): Record<PlanKind, number> => ({ once: PLANS.once.price, monthly: PLANS.monthly.price });

const validPrice = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 100_000;
export async function setPrices(p: PriceSet | null, by: string) {
  if (!p) { await kv("DEL", K.prices); cache = null; return null; }
  for (const k of ["once", "monthly"] as PlanKind[]) if (p[k] !== undefined && !validPrice(p[k])) throw new Error("السعر لازم يكون رقم بين 1 و100,000 ريال");
  const next: PriceOverride = { once: p.once, monthly: p.monthly, at: Date.now(), by };
  await kvJson.set(K.prices, next);
  cache = null;
  return next;
}

// ── أكواد الخصم ──
export type CouponType = "percent" | "fixed";
export interface Coupon {
  code: string; type: CouponType; value: number; plans: PlanKind[];
  maxUses: number | null; uses: number; expiresAt: number | null; active: boolean; note?: string; createdAt: number; by: string;
}
export const CODE_RE = /^[A-Z0-9_-]{3,24}$/;
export const normCode = (c: unknown) => String(c ?? "").trim().toUpperCase().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export async function listCoupons(): Promise<Coupon[]> {
  if (!stored()) return [];
  const codes = await kv<string[]>("SMEMBERS", K.coupons);
  const rows = await Promise.all(codes.map((c) => kvJson.get<Coupon>(K.coupon(c))));
  return rows.filter((x): x is Coupon => !!x).sort((a, b) => b.createdAt - a.createdAt);
}
export const getCoupon = (code: string) => kvJson.get<Coupon>(K.coupon(normCode(code)));

export async function createCoupon(input: Partial<Coupon>, by: string): Promise<Coupon> {
  const code = normCode(input.code);
  if (!CODE_RE.test(code)) throw new Error("الكود: 3 إلى 24 حرفاً إنجليزياً أو رقماً (ويُسمح بـ - و _)");
  if (await getCoupon(code)) throw new Error("هذا الكود موجود من قبل");
  const type: CouponType = input.type === "fixed" ? "fixed" : "percent";
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100) || (type === "fixed" && value > 100_000)) throw new Error(type === "percent" ? "النسبة بين 1 و100" : "المبلغ لازم يكون أكبر من صفر");
  const plans = (Array.isArray(input.plans) ? input.plans : ["once", "monthly"]).filter((p): p is PlanKind => p === "once" || p === "monthly");
  if (!plans.length) throw new Error("اختر باقة وحدة على الأقل");
  const maxUses = input.maxUses ? Math.max(1, Math.floor(Number(input.maxUses))) : null;
  const expiresAt = input.expiresAt ? Number(input.expiresAt) : null;
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt < Date.now())) throw new Error("تاريخ الانتهاء لازم يكون في المستقبل");
  const c: Coupon = { code, type, value, plans, maxUses, uses: 0, expiresAt, active: true, note: String(input.note ?? "").slice(0, 80) || undefined, createdAt: Date.now(), by };
  await kvJson.set(K.coupon(code), c);
  await kv("SADD", K.coupons, code);
  return c;
}

export async function updateCoupon(code: string, p: Partial<Pick<Coupon, "active" | "maxUses" | "expiresAt" | "note">>) {
  const c = await getCoupon(code);
  if (!c) return null;
  const next: Coupon = { ...c };
  if (typeof p.active === "boolean") next.active = p.active;
  if (p.maxUses !== undefined) next.maxUses = p.maxUses ? Math.max(1, Math.floor(Number(p.maxUses))) : null;
  if (p.expiresAt !== undefined) next.expiresAt = p.expiresAt ? Number(p.expiresAt) : null;
  if (p.note !== undefined) next.note = String(p.note ?? "").slice(0, 80) || undefined;
  await kvJson.set(K.coupon(c.code), next);
  return next;
}
export async function deleteCoupon(code: string) {
  const c = normCode(code);
  if (!(await getCoupon(c))) return false;
  await kv("DEL", K.coupon(c)); await kv("SREM", K.coupons, c);
  return true;
}
/** تُحسب الاستخدامات عند تفعيل الإدارة للدفع (لا عند الطلب) */
export async function useCoupon(code: string) {
  const c = await getCoupon(code);
  if (c) await kvJson.set(K.coupon(c.code), { ...c, uses: c.uses + 1 });
}

export function applyCoupon(c: Coupon, base: number) {
  const off = c.type === "percent" ? (base * c.value) / 100 : c.value;
  return Math.max(0, Math.round((base - off) * 100) / 100);
}
/** يتحقق من الكود للباقة ويعيد السعر بعد الخصم أو سبب الرفض */
export async function quoteCoupon(code: string, plan: PlanKind): Promise<{ ok: true; coupon: Coupon; base: number; price: number } | { ok: false; error: string }> {
  const c = await getCoupon(code);
  if (!c || !c.active) return { ok: false, error: "كود الخصم غير صحيح" };
  if (c.expiresAt && c.expiresAt < Date.now()) return { ok: false, error: "انتهت صلاحية كود الخصم" };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, error: "انتهى عدد استخدامات كود الخصم" };
  if (!c.plans.includes(plan)) return { ok: false, error: plan === "monthly" ? "الكود ما يشمل الاشتراك الشهري" : "الكود ما يشمل باقة المرة الواحدة" };
  const base = (await getPrices())[plan];
  return { ok: true, coupon: c, base, price: applyCoupon(c, base) };
}
export const couponLabel = (c: Pick<Coupon, "type" | "value">) => (c.type === "percent" ? `خصم ${c.value}%` : `خصم ${c.value} ر.س`);
