"use client";
// شريط الحساب: نوع الحساب + رابط الإدارة + خروج
import * as React from "react";

export type Me = { username?: string; role: "admin" | "demo" | null; guest?: boolean };
let cached: Promise<Me> | null = null;
export function fetchMe(): Promise<Me> {
  if (typeof window === "undefined") return Promise.resolve({ role: null });
  cached ??= fetch("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { role: null })).catch(() => ({ role: null }));
  return cached;
}
export function useMe(): Me | null {
  const [me, setMe] = React.useState<Me | null>(null);
  React.useEffect(() => { fetchMe().then(setMe); }, []);
  return me;
}

export function AccountBar() {
  const me = useMe();
  if (!me?.role) return null;
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };
  return (
    <div className="flex items-center gap-2 text-xs">
      {me.role === "demo" ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">نسخة ديمو</span>
      ) : (
        <a href="/admin" className="rounded-full bg-ink px-2.5 py-1 font-semibold text-paper">لوحة الإدارة</a>
      )}
      {me.guest ? (
        <a href="/login" className="rounded-full px-2 py-1 text-muted hover:bg-ink/5 hover:text-ink">دخول الإدارة</a>
      ) : (
        <button onClick={logout} className="rounded-full px-2 py-1 text-muted hover:bg-ink/5 hover:text-ink">خروج</button>
      )}
    </div>
  );
}

export function DemoNotice({ text }: { text: string }) {
  const me = useMe();
  const [open, setOpen] = React.useState(true);
  if (me?.role !== "demo" || !open) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-xs items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 shadow-lg">
      <span>{text}</span>
      <button onClick={() => setOpen(false)} aria-label="إغلاق" className="font-bold text-amber-700">×</button>
    </div>
  );
}
