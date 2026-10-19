"use client";
// شريط الحساب: عميل (تصاميمي) / زائر ديمو (سجّل مجاناً) / إدارة
import * as React from "react";
import { openDesigns, openSignup, refreshAccount, useAccount } from "./account/account-client";

export function AccountBar() {
  const { me } = useAccount();
  if (!me?.role) return null;
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); await refreshAccount(); window.location.href = "/"; };
  if (me.role === "customer") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <button onClick={openDesigns} className="rounded-full bg-ink px-3 py-1 font-semibold text-paper">تصاميمي ({me.designs?.length ?? 0})</button>
        <span className="hidden text-muted sm:inline" dir="ltr">{me.customer?.email ?? me.customer?.phone}</span>
        <button onClick={logout} className="rounded-full px-2 py-1 text-muted hover:bg-ink/5 hover:text-ink">خروج</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      {me.role === "demo" ? (
        <>
          <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800 sm:inline">نسخة ديمو</span>
          <button onClick={() => openSignup()} className="rounded-full bg-ink px-3 py-1 font-semibold text-paper">سجّل مجاناً</button>
        </>
      ) : (
        <a href="/admin" className="rounded-full bg-ink px-2.5 py-1 font-semibold text-paper">لوحة الإدارة</a>
      )}
      {me.guest ? (
        <a href="/login" className="rounded-full px-2 py-1 text-muted hover:bg-ink/5 hover:text-ink">الإدارة</a>
      ) : (
        <button onClick={logout} className="rounded-full px-2 py-1 text-muted hover:bg-ink/5 hover:text-ink">خروج</button>
      )}
    </div>
  );
}

export function DemoNotice({ text }: { text: string }) {
  const { me } = useAccount();
  const [open, setOpen] = React.useState(true);
  if (me?.role !== "demo" || !open) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-xs items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 shadow-lg">
      <span>{text}</span>
      <button onClick={() => setOpen(false)} aria-label="إغلاق" className="font-bold text-amber-700">×</button>
    </div>
  );
}
