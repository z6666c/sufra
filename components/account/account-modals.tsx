"use client";
// نافذة التسجيل بالبريد أو الجوال (رمز تحقق) + نافذة «تصاميمي»
import * as React from "react";
import { closeDesigns, closeSignup, daysLeft, deleteDesignRemote, refreshAccount, useAccount, type DesignMeta } from "./account-client";

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-full px-2 text-xl leading-none text-muted hover:text-ink">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SignupModal({ reason }: { reason?: string }) {
  const { me } = useAccount();
  const [step, setStep] = React.useState<"id" | "code">("id");
  const [ident, setIdent] = React.useState("");
  const [code, setCode] = React.useState("");
  const [to, setTo] = React.useState("");
  const [devCode, setDevCode] = React.useState<string | undefined>(undefined);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [wait, setWait] = React.useState(0);
  React.useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const s = me?.signup;
  const days = s?.trialDays ?? 30;

  const send = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/account/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: ident }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "تعذر الإرسال");
      setTo(d.to); setDevCode(d.devCode); setStep("code"); setWait(60); setCode("");
    } catch (e) { setErr(e instanceof Error ? e.message : "تعذر الإرسال"); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/account/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: ident, code }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "تعذر التحقق");
      await refreshAccount();
      closeSignup(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "تعذر التحقق"); } finally { setBusy(false); }
  };

  return (
    <Shell title="احفظ تصميمك مجاناً" onClose={() => closeSignup(false)}>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        {reason ? `${reason} ` : ""}سجّل ببريدك أو رقم جوالك، ويبقى تصميمك محفوظاً لك <b className="text-ink">{days} يوماً</b> تفتحه من أي جهاز قبل الدفع.
      </p>
      {step === "id" ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3">
          <input autoFocus dir="ltr" value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="name@email.com  أو  05xxxxxxxx" className="h-11 w-full rounded-xl border border-line px-3.5 text-center outline-none focus:border-ink/40" />
          {s && !s.phone && <p className="text-[11px] text-muted">التسجيل بالجوال غير مفعّل حالياً — استخدم البريد الإلكتروني.</p>}
          <button disabled={busy || ident.trim().length < 5} className="h-11 w-full rounded-xl bg-ink font-medium text-paper disabled:opacity-50">{busy ? "…" : "أرسل رمز التحقق"}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <p className="text-sm">أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">{to}</b></p>
          {devCode && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">وضع التجربة: الرمز <b dir="ltr">{devCode}</b> (لا يظهر بعد تفعيل الإرسال)</p>}
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d٠-٩]/g, ""))} placeholder="••••••" className="h-12 w-full rounded-xl border border-line px-3.5 text-center font-latin text-xl tracking-[0.5em] outline-none focus:border-ink/40" />
          <button disabled={busy || code.length !== 6} className="h-11 w-full rounded-xl bg-ink font-medium text-paper disabled:opacity-50">{busy ? "…" : "تأكيد والدخول"}</button>
          <div className="flex justify-between text-xs">
            <button type="button" onClick={() => setStep("id")} className="text-muted hover:text-ink">تغيير البريد/الرقم</button>
            <button type="button" onClick={send} disabled={wait > 0 || busy} className="text-muted hover:text-ink disabled:opacity-50">{wait > 0 ? `إعادة الإرسال بعد ${wait}ث` : "إعادة إرسال الرمز"}</button>
          </div>
        </form>
      )}
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    </Shell>
  );
}

function DesignsModal({ onOpen }: { onOpen: (d: DesignMeta) => Promise<void> | void }) {
  const { me } = useAccount();
  const [busy, setBusy] = React.useState<string | null>(null);
  const list = me?.designs ?? [];
  const c = me?.customer;
  return (
    <Shell title="تصاميمي" onClose={closeDesigns}>
      {c && (
        <p className="mb-3 text-xs text-muted">
          {c.email ?? c.phone} · {c.status === "paid" ? "حساب مدفوع — التصاميم محفوظة دائماً" : `فترة الحفظ المجانية: ${daysLeft(c.trialEndsAt)} يوماً متبقية`}
        </p>
      )}
      {!list.length ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد تصاميم محفوظة بعد.</p>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {list.map((d) => {
            const left = daysLeft(d.expiresAt);
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{d.title}</div>
                  <div className={`text-[11px] ${left !== null && left <= 5 ? "text-red-600" : "text-muted"}`}>
                    {left === null ? "محفوظ دائماً" : `يُحذف بعد ${left} يوماً`} · آخر تعديل {new Date(d.updatedAt).toLocaleDateString("ar-SA-u-ca-gregory")}
                  </div>
                </div>
                <button disabled={!!busy} onClick={async () => { setBusy(d.id); await onOpen(d); setBusy(null); closeDesigns(); }} className="rounded-lg bg-ink px-3 py-1.5 text-xs text-paper disabled:opacity-50">{busy === d.id ? "…" : "فتح"}</button>
                <button disabled={!!busy} onClick={() => deleteDesignRemote(d.id)} className="rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">حذف</button>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

/** تُركّب مرة واحدة في التطبيق */
export function AccountModals({ onOpenDesign }: { onOpenDesign: (d: DesignMeta) => Promise<void> | void }) {
  const { signup, designsOpen } = useAccount();
  return (
    <>
      {signup.open && <SignupModal reason={signup.reason} />}
      {designsOpen && <DesignsModal onOpen={onOpenDesign} />}
    </>
  );
}
