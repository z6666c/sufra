"use client";
// حالة حساب العميل في المتصفح + فتح نافذة التسجيل عند الحاجة (قبل التحميل أو النشر)
import * as React from "react";

export interface CustomerInfo { id: string; email?: string; phone?: string; name?: string; status: "trial" | "paid"; trialEndsAt: number; createdAt: number }
export interface DesignMeta { id: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; size: number }
export interface Me {
  role: "admin" | "demo" | "customer" | null;
  guest?: boolean;
  customer?: CustomerInfo;
  designs?: DesignMeta[];
  signup?: { available: boolean; email: boolean; phone: boolean; trialDays: number; store: string };
}

const PREVIEW = process.env.NEXT_PUBLIC_SUFRA_DEMO === "1";

type State = { me: Me | null; loading: boolean; signup: { open: boolean; reason?: string }; designsOpen: boolean };
let state: State = { me: null, loading: false, signup: { open: false }, designsOpen: false };
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
