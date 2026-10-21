"use client";
// حالة حساب العميل في المتصفح + فتح نافذة التسجيل عند الحاجة (قبل التحميل أو النشر)
import * as React from "react";
import { withPrices } from "@/lib/plans";

export interface CustomerInfo { id: string; email?: string; phone?: string; name?: string; status: "trial" | "paid"; trialEndsAt: number; createdAt: number }
export interface DesignMeta {
  id: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; size: number;
  paid?: { plan: "once" | "monthly"; at: number; amount: number; until?: number | null } | null;
  paymentRequestedAt?: number | null; requestedPlan?: "once" | "monthly" | null; requestedCoupon?: { code: string; plan: "once" | "monthly"; base: number; price: number } | null;
}
export const designPaid = (d?: DesignMeta | null) => !!d?.paid && (!d.paid.until || d.paid.until > Date.now());
export interface Me {
  role: "admin" | "demo" | "customer" | null;
  guest?: boolean;
  customer?: CustomerInfo;
  designs?: DesignMeta[];
  signup?: { available: boolean; email: boolean; phone: boolean; trialDays: number; draftDays?: number; store: string };
  /** الأسعار الحالية من لوحة التحكم */
  prices?: { once: number; monthly: number };
  /** بوابة الدفع الإلكتروني المفعّلة (تفعيل تلقائي) */
  gateway?: { id: string; name: string; methods: string; mode: "test" | "live" | null } | null;
  /** طرق السداد المفعّلة من لوحة التحكم */
  pay?: { bank: { bankName: string; holder: string; iban: string } | null; stcpay: { number: string } | null; link: { url: string; label: string } | null; whatsapp: string | null; note: string | null };
}

const PREVIEW = process.env.NEXT_PUBLIC_SUFRA_DEMO === "1";

type State = { me: Me | null; loading: boolean; signup: { open: boolean; reason?: string }; designsOpen: boolean; paywall: { open: boolean; designId?: string; reason?: string } };
let state: State = { me: null, loading: false, signup: { open: false }, designsOpen: false, paywall: { open: false } };
const subs = new Set<() => void>();
const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
let pending: ((ok: boolean) => void) | null = null;

export async function refreshAccount(): Promise<Me | null> {
  if (PREVIEW || typeof window === "undefined") return null;
  emit({ loading: true });
  try {
    const r = await fetch("/api/account/me", { cache: "no-store" });
    const me = r.ok ? ((await r.json()) as Me) : null;
    emit({ me, loading: false });
    return me;
  } catch {
    emit({ loading: false });
    return null;
  }
}

export function useAccount() {
  const snap = React.useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
  React.useEffect(() => { if (!state.me && !state.loading) refreshAccount(); }, []);
  return snap;
}

export const isCustomer = () => state.me?.role === "customer";
export const isAdmin = () => state.me?.role === "admin";

/** يتأكد أن الزائر مسجّل قبل خطوة مهمة؛ يفتح نافذة التسجيل ويعيد true بعد النجاح */
export async function ensureAccount(reason?: string): Promise<boolean> {
  if (PREVIEW) return true;
  const me = state.me ?? (await refreshAccount());
  if (me?.role === "customer" || me?.role === "admin") return true;
  if (me && me.signup && !me.signup.available) return true; // بدون قاعدة بيانات لا نوقف العميل
  return new Promise((resolve) => { pending = resolve; emit({ signup: { open: true, reason } }); });
}

export function openSignup(reason?: string) { ensureAccount(reason); }
export function closeSignup(ok: boolean) {
  emit({ signup: { open: false } });
  const p = pending; pending = null; p?.(ok);
}
export const openDesigns = () => emit({ designsOpen: true });
export const closeDesigns = () => emit({ designsOpen: false });

export const daysLeft = (t: number | null | undefined) => (t ? Math.max(0, Math.ceil((t - Date.now()) / 86_400_000)) : null);

export async function saveDesignRemote(body: { id?: string; title: string; kind: string; data: unknown }): Promise<DesignMeta> {
  const r = await fetch("/api/account/designs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "تعذر الحفظ");
  refreshAccount();
  return d.design as DesignMeta;
}

export async function loadDesignRemote<T>(id: string): Promise<{ id: string; data: T; expiresAt: number | null; title: string }> {
  const r = await fetch(`/api/account/designs/${encodeURIComponent(id)}`, { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "تعذر فتح التصميم");
  return d.design;
}

export async function deleteDesignRemote(id: string) {
  await fetch(`/api/account/designs/${encodeURIComponent(id)}`, { method: "DELETE" });
  refreshAccount();
}

// ── الدفع: التحميل والنشر بعد الدفع فقط ──
/** هل يملك المستخدم حق التحميل لهذا التصميم؟ (الإدارة دائماً) */
export function entitled(designId?: string | null): boolean {
  const me = state.me;
  if (PREVIEW) return false;
  if (me?.role === "admin") return true;
  if (me?.signup && !me.signup.available) return true; // بدون قاعدة بيانات لا يمكن التحقق من الدفع
  return !!designId && designPaid(me?.designs?.find((d) => d.id === designId));
}

/** يتأكد من التسجيل ثم الدفع؛ يفتح نافذة الباقات إن لم يكن التصميم مدفوعاً */
export async function ensurePaid(getDesignId: () => Promise<string | undefined>, reason?: string): Promise<boolean> {
  if (PREVIEW) return true;
  if (!(await ensureAccount(reason))) return false;
  const me0 = state.me;
  if (me0?.role === "admin") return true;
  if (me0?.signup && !me0.signup.available) return true;
  const id = await getDesignId();
  if (!id) return false;
  const me = await refreshAccount();
  if (designPaid(me?.designs?.find((d) => d.id === id))) return true;
  emit({ paywall: { open: true, designId: id, reason } });
  return false;
}
export const openPaywall = (designId: string, reason?: string) => emit({ paywall: { open: true, designId, reason } });
export const closePaywall = () => emit({ paywall: { open: false } });

export async function requestActivation(designId: string, plan: "once" | "monthly", coupon?: string) {
  const r = await fetch(`/api/account/designs/${encodeURIComponent(designId)}/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, ...(coupon ? { coupon } : {}) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "تعذر إرسال الطلب");
  await refreshAccount();
}

/** يتحقق من كود الخصم ويعيد السعر بعد الخصم */
export async function quoteCoupon(code: string, plan: "once" | "monthly"): Promise<{ code: string; label: string; base: number; price: number }> {
  const r = await fetch("/api/account/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, plan }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "تعذر التحقق من الكود");
  return d;
}

/** ينقل العميل لصفحة الدفع عند البوابة — والتفعيل يصير تلقائي بعد الدفع */
export async function startPayment(designId: string, plan: "once" | "monthly", coupon?: string) {
  const r = await fetch("/api/pay/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ designId, plan, ...(coupon ? { coupon } : {}) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error(d.error ?? "تعذر فتح صفحة الدفع");
  window.location.href = d.url;
}

/** الباقات بأسعار لوحة التحكم (أو أسعار البيئة إن لم تُعدّل) */
export function usePlans() {
  const s = useAccount();
  return React.useMemo(() => withPrices(s.me?.prices), [s.me?.prices]);
}

/** حالة الدفع للتصميم الحالي (للعلامة المائية) */
export function useEntitled(designId?: string | null) {
  const s = useAccount();
  return React.useMemo(() => entitled(designId), [s.me, designId]);
}
