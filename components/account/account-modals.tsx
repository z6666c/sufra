"use client";
// نافذة التسجيل بالبريد أو الجوال (رمز تحقق) + نافذة «تصاميمي»
import * as React from "react";
import { closeDesigns, closePaywall, closeSignup, daysLeft, deleteDesignRemote, designPaid, refreshAccount, requestActivation, useAccount, type DesignMeta } from "./account-client";
import { PLANS, PREVIEW_NOTE, type PlanKind } from "@/lib/plans";

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
    <Shell title="سجّل دخولك" onClose={() => closeSignup(false)}>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        {reason ? `${reason} ` : ""}سجّل ببريدك أو رقم جوالك لحفظ تصميمك وإتمام الشراء. {PREVIEW_NOTE}
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
        <p className="mb-3 text-xs text-muted" dir="auto">{c.email ?? c.phone}</p>
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
                  <div className={`text-[11px] ${!designPaid(d) && left !== null && left <= 2 ? "text-red-600" : "text-muted"}`}>
                    {designPaid(d)
                      ? <span className="font-semibold text-emerald-700">مدفوع{d.paid?.plan === "monthly" ? " · اشتراك شهري" : ""}{d.paid?.until ? ` حتى ${new Date(d.paid.until).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}` : ""}</span>
                      : d.paymentRequestedAt ? <span className="font-semibold text-amber-700">بانتظار تفعيل الدفع</span>
                      : <>معاينة — {left === null ? "" : `تُحذف المسودة بعد ${left} يوم`}</>}
                    {" "}· آخر تعديل {new Date(d.updatedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}
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

function PaywallModal({ designId, reason }: { designId: string; reason?: string }) {
  const { me } = useAccount();
  const d = me?.designs?.find((x) => x.id === designId);
  const [busy, setBusy] = React.useState<PlanKind | null>(null);
  const [err, setErr] = React.useState("");
  const note = process.env.NEXT_PUBLIC_PAYMENT_NOTE;
  const wa = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "");
  const contact = me?.customer?.email ?? me?.customer?.phone ?? "";
  const pick = async (plan: PlanKind) => {
    setBusy(plan); setErr("");
    try { await requestActivation(designId, plan); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  if (designPaid(d)) return <Shell title="تم التفعيل" onClose={closePaywall}><p className="text-sm">التصميم مدفوع — أعد المحاولة للتحميل.</p></Shell>;
  return (
    <Shell title="افتح التحميل" onClose={closePaywall}>
      <p className="mb-4 text-sm leading-relaxed text-muted">{reason ? `${reason} ` : ""}اختر الباقة المناسبة لـ «{d?.title ?? "تصميمك"}».</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["once", "monthly"] as PlanKind[]).map((k) => {
          const p = PLANS[k];
          const chosen = d?.paymentRequestedAt && d.requestedPlan === k;
          return (
            <div key={k} className={`flex flex-col rounded-xl border p-4 ${chosen ? "border-ember ring-2 ring-ember/30" : "border-line"}`}>
              <div className="text-xs text-muted">{p.name}</div>
              <div className="mb-2 font-display text-2xl font-bold">{p.price} <span className="text-sm font-medium text-muted">{p.currency} {p.period}</span></div>
              <ul className="mb-3 flex-1 space-y-1 text-[11.5px] leading-relaxed text-muted">{p.includes.map((x) => <li key={x}>✓ {x}</li>)}</ul>
              <button disabled={!!busy} onClick={() => pick(k)} className={`h-9 rounded-lg text-sm font-medium ${chosen ? "bg-ember text-white" : "bg-ink text-paper"} disabled:opacity-50`}>
                {busy === k ? "…" : chosen ? "تم إرسال الطلب ✓" : "اختر هذه الباقة"}
              </button>
            </div>
          );
        })}
      </div>
      {d?.paymentRequestedAt ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900">
          استلمنا طلبك. {note ?? "سنتواصل معك لإتمام الدفع"}{contact ? ` على ${contact}` : ""}، ويُفتح التحميل فور التفعيل.
          {wa && <> <a className="font-semibold underline" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`طلب تفعيل: ${d.title} (${d.requestedPlan === "monthly" ? "شهري" : "مرة واحدة"}) — ${contact} — ${designId}`)}`}>تواصل عبر واتساب</a></>}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted">الدفع الإلكتروني قريباً. اختر باقتك وسنتواصل معك لإتمام الدفع، ويُفتح التحميل فوراً بعد التفعيل.</p>
      )}
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    </Shell>
  );
}

/** تُركّب مرة واحدة في التطبيق */
export function AccountModals({ onOpenDesign }: { onOpenDesign: (d: DesignMeta) => Promise<void> | void }) {
  const { signup, designsOpen, paywall } = useAccount();
  return (
    <>
      {signup.open && <SignupModal reason={signup.reason} />}
      {paywall.open && paywall.designId && <PaywallModal designId={paywall.designId} reason={paywall.reason} />}
      {designsOpen && <DesignsModal onOpen={onOpenDesign} />}
    </>
  );
}
