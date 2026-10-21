"use client";
// نافذة التسجيل بالبريد أو الجوال (رمز تحقق) + نافذة «تصاميمي»
import * as React from "react";
import { closeDesigns, closePaywall, closeSignup, daysLeft, deleteDesignRemote, designPaid, refreshAccount, requestActivation, quoteCoupon, usePlans, startPayment, openPaywall, deleteAccount, useAccount, type DesignMeta } from "./account-client";
import { PREVIEW_NOTE, type PlanKind } from "@/lib/plans";
import { storeApp } from "@/lib/native";

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
  const [via, setVia] = React.useState<string | undefined>(undefined);
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
      setTo(d.to); setDevCode(d.devCode); setVia(d.via); setStep("code"); setWait(60); setCode("");
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
          <input autoFocus dir="ltr" value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="name@email.com  أو  رقم واتساب 05xxxxxxxx" className="h-11 w-full rounded-xl border border-line px-3.5 text-center outline-none focus:border-ink/40" />
          {s && !s.phone ? <p className="text-[11px] text-muted">التسجيل بالجوال غير مفعّل حالياً — استخدم البريد الإلكتروني.</p>
            : <p className="text-[11px] text-muted">يوصلك الرمز على بريدك، أو على واتساب إذا كتبت رقم جوالك.</p>}
          <button disabled={busy || ident.trim().length < 5} className="h-11 w-full rounded-xl bg-ink font-medium text-paper disabled:opacity-50">{busy ? "…" : "أرسل رمز التحقق"}</button>
          <p className="text-center text-[11px] text-muted">بالتسجيل توافق على <a href="/terms" target="_blank" className="underline">شروط الاستخدام</a> و<a href="/privacy" target="_blank" className="underline">سياسة الخصوصية</a>.</p>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <p className="text-sm">أرسلنا رمزاً من 6 أرقام {via === "whatsapp" ? "على واتساب إلى" : via === "sms" ? "برسالة نصية إلى" : "إلى بريدك"} <b dir="ltr">{to}</b></p>
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
  const [del, setDel] = React.useState<"idle" | "confirm" | "busy">("idle");
  const [delErr, setDelErr] = React.useState("");
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
                      : d.paymentRequestedAt && !storeApp() ? <span className="font-semibold text-amber-700">بانتظار تفعيل الدفع</span>
                      : <>معاينة — {left === null ? "" : `تُحذف المسودة بعد ${left} يوم`}</>}
                    {" "}· آخر تعديل {new Date(d.updatedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}
                  </div>
                </div>
                {me?.gateway && !storeApp() && d.paid?.plan === "monthly" && <button disabled={!!busy} onClick={() => { closeDesigns(); openPaywall(d.id, "جدّد اشتراكك الشهري."); }} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">تجديد</button>}
                <button disabled={!!busy} onClick={async () => { setBusy(d.id); await onOpen(d); setBusy(null); closeDesigns(); }} className="rounded-lg bg-ink px-3 py-1.5 text-xs text-paper disabled:opacity-50">{busy === d.id ? "…" : "فتح"}</button>
                <button disabled={!!busy} onClick={() => deleteDesignRemote(d.id)} className="rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">حذف</button>
              </li>
            );
          })}
        </ul>
      )}
      {c && (
        <div className="mt-5 border-t border-line pt-3">
          {del === "idle" ? (
            <button onClick={() => setDel("confirm")} className="text-xs text-red-600 hover:underline">حذف حسابي</button>
          ) : (
            <div className="rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-800">
              <b>حذف الحساب نهائياً:</b> بنحذف حسابك وكل تصاميمك{list.some((d) => designPaid(d)) ? "، ومنها التصاميم المدفوعة،" : ""} وما نقدر نرجّعها. متأكد؟
              {delErr && <div className="mt-1 font-semibold">{delErr}</div>}
              <div className="mt-2 flex gap-2">
                <button disabled={del === "busy"} onClick={async () => { setDel("busy"); setDelErr(""); try { await deleteAccount(); } catch (e) { setDelErr((e as Error).message); setDel("confirm"); } }} className="h-8 rounded-lg bg-red-600 px-3 font-semibold text-white">{del === "busy" ? "…" : "نعم، احذف حسابي"}</button>
                <button onClick={() => setDel("idle")} className="h-8 rounded-lg border border-red-200 bg-white px-3">إلغاء</button>
              </div>
            </div>
          )}
        </div>
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
  const PLANS = usePlans();
  const [code, setCode] = React.useState("");
  const [deal, setDeal] = React.useState<Partial<Record<PlanKind, { code: string; label: string; price: number }>>>({});
  const [codeMsg, setCodeMsg] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const apply = async () => {
    const c = code.trim();
    if (!c) return;
    setChecking(true); setCodeMsg("");
    const res = await Promise.allSettled((["once", "monthly"] as PlanKind[]).map((k) => quoteCoupon(c, k)));
    const next: typeof deal = {};
    res.forEach((x, i) => { if (x.status === "fulfilled") next[(["once", "monthly"] as PlanKind[])[i]] = x.value; });
    setDeal(next);
    const first = res.find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setCodeMsg(Object.keys(next).length ? `تم تطبيق الكود: ${Object.values(next)[0]!.label}` : (first?.reason as Error)?.message ?? "كود الخصم غير صحيح");
    setChecking(false);
  };
  const gw = me?.gateway;
  const pick = async (plan: PlanKind) => {
    setBusy(plan); setErr("");
    try { await requestActivation(designId, plan, deal[plan]?.code); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const payNow = async (plan: PlanKind) => {
    setBusy(plan); setErr("");
    try { await startPayment(designId, plan, deal[plan]?.code); } catch (e) { setErr((e as Error).message); setBusy(null); }
  };
  // تطبيق المتجر: ما نعرض أسعار ولا شراء ولا روابط دفع (الشراء من الموقع فقط)
  if (storeApp() && !designPaid(d)) return (
    <Shell title="التصميم غير مفعّل" onClose={closePaywall}>
      <p className="text-sm leading-relaxed text-muted">«{d?.title ?? "تصميمك"}» غير مفعّل على حسابك بعد، فهو متاح كمعاينة بعلامة مائية. التصاميم المفعّلة على حسابك تقدر تحمّلها وتشاركها من هنا مباشرة.</p>
      <button onClick={closePaywall} className="mt-4 h-10 w-full rounded-xl bg-ink text-sm text-paper">تمام</button>
    </Shell>
  );
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
              <div className="mb-2 font-display text-2xl font-bold">
                {deal[k] ? <><span className="me-1 text-base font-medium text-muted line-through">{p.price}</span>{deal[k]!.price}</> : p.price} <span className="text-sm font-medium text-muted">{p.currency} {p.period}</span>
              </div>
              {deal[k] && <div className="-mt-1 mb-2 text-[11px] font-semibold text-emerald-700">{deal[k]!.label}{k === "monthly" ? " على أول شهر" : ""}</div>}
              <ul className="mb-3 flex-1 space-y-1 text-[11.5px] leading-relaxed text-muted">{p.includes.map((x) => <li key={x}>✓ {x}</li>)}</ul>
              {gw ? (
                <>
                  <button disabled={!!busy} onClick={() => payNow(k)} className="h-10 rounded-lg bg-ink text-sm font-semibold text-paper disabled:opacity-50">{busy === k ? "يفتح صفحة الدفع…" : `ادفع الآن ${deal[k] ? deal[k]!.price : p.price} ر.س`}</button>
                  <button disabled={!!busy} onClick={() => pick(k)} className={`mt-1.5 h-8 rounded-lg text-xs ${chosen ? "bg-ember/10 font-semibold text-ember" : "text-muted hover:bg-ink/5"}`}>{chosen ? "طلبت التحويل اليدوي ✓" : "أو ادفع بالتحويل"}</button>
                </>
              ) : (
                <button disabled={!!busy} onClick={() => pick(k)} className={`h-9 rounded-lg text-sm font-medium ${chosen ? "bg-ember text-white" : "bg-ink text-paper"} disabled:opacity-50`}>
                  {busy === k ? "…" : chosen ? "تم إرسال الطلب ✓" : "اختر هذه الباقة"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {gw && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
          🔒 دفع آمن عبر {gw.name}: {gw.methods}. يُفتح {d ? "تصميمك" : "التحميل"} تلقائياً أول ما ينجح الدفع.
          {gw.mode === "test" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">وضع تجريبي</span>}
        </p>
      )}
      {!d?.paymentRequestedAt && (
        <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="mt-3 flex gap-2">
          <input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="كود الخصم (اختياري)" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-center text-sm uppercase outline-none focus:border-ink/40" />
          <button disabled={checking || !code.trim()} className="h-9 rounded-lg border border-line px-3 text-sm disabled:opacity-50">{checking ? "…" : "تطبيق"}</button>
        </form>
      )}
      {codeMsg && <p className={`mt-1.5 text-xs ${Object.keys(deal).length ? "text-emerald-700" : "text-red-600"}`}>{codeMsg}</p>}
      {d?.paymentRequestedAt ? (
        <PayDetails
          amount={d.requestedCoupon ? d.requestedCoupon.price : PLANS[d.requestedPlan === "monthly" ? "monthly" : "once"].price}
          plan={d.requestedPlan === "monthly" ? "monthly" : "once"} coupon={d.requestedCoupon?.code} title={d.title} designId={designId}
          contact={contact} pay={me?.pay} fallbackNote={note} fallbackWa={wa}
        />
      ) : (
        <p className="mt-3 text-[11px] text-muted">
          اختر باقتك وتظهر لك تفاصيل السداد{methodsLine(me?.pay) ? `: ${methodsLine(me?.pay)}` : ""}. يُفتح التحميل فور تأكيد الدفع.
        </p>
      )}
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    </Shell>
  );
}

const payRef = (id: string) => id.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
function methodsLine(p?: NonNullable<ReturnType<typeof useAccount>["me"]>["pay"]) {
  if (!p) return "";
  return [p.bank && "تحويل بنكي", p.stcpay && "STC Pay", p.link && "مدى أو Apple Pay"].filter(Boolean).join(" · ");
}
function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = React.useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-line">
      <div className="min-w-0"><div className="text-[10.5px] text-muted">{label}</div><div className={`truncate text-sm ${mono ? "font-latin tracking-wide" : ""}`} dir={mono ? "ltr" : "auto"}>{value}</div></div>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }} className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px]">{done ? "نُسخ ✓" : "نسخ"}</button>
    </div>
  );
}
/** تفاصيل السداد بعد اختيار الباقة: المبلغ ورقم الطلب وطرق الدفع المفعّلة من لوحة التحكم */
function PayDetails({ amount, plan, coupon, title, designId, contact, pay, fallbackNote, fallbackWa }: {
  amount: number; plan: PlanKind; coupon?: string; title: string; designId: string; contact: string;
  pay?: NonNullable<ReturnType<typeof useAccount>["me"]>["pay"]; fallbackNote?: string; fallbackWa?: string;
}) {
  const ref = payRef(designId);
  const wa = pay?.whatsapp || fallbackWa;
  const note = pay?.note || fallbackNote;
  const any = !!(pay?.bank || pay?.stcpay || pay?.link);
  const msg = `السلام عليكم، أرسلت مبلغ ${amount} ر.س لطلب ${ref} (${title} — ${plan === "monthly" ? "اشتراك شهري" : "مرة واحدة"}${coupon ? ` — كود ${coupon}` : ""}). هذا إيصال التحويل. ${contact}`;
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-950">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><div className="text-xs text-emerald-800">المبلغ المطلوب</div><div className="font-display text-2xl font-bold">{amount} <span className="text-sm font-medium">ر.س</span></div></div>
        <div className="text-left"><div className="text-xs text-emerald-800">رقم الطلب (اكتبه في التحويل)</div><div className="font-latin text-lg font-bold tracking-widest" dir="ltr">{ref}</div></div>
      </div>
      {pay?.link && (
        <a href={pay.link.url} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center rounded-lg bg-ink text-sm font-medium text-paper">{pay.link.label} ←</a>
      )}
      {pay?.bank && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold">تحويل بنكي</div>
          <CopyRow label="الآيبان" value={pay.bank.iban} />
          <div className="grid grid-cols-2 gap-1.5"><CopyRow label="اسم صاحب الحساب" value={pay.bank.holder} mono={false} /><CopyRow label="البنك" value={pay.bank.bankName} mono={false} /></div>
        </div>
      )}
      {pay?.stcpay && (
        <div className="space-y-1.5"><div className="text-xs font-semibold">STC Pay</div><CopyRow label="رقم STC Pay" value={pay.stcpay.number} /></div>
      )}
      {note && <p className="text-xs leading-relaxed">{note}</p>}
      {!any && !note && <p className="text-xs">استلمنا طلبك، وبنتواصل معك{contact ? ` على ${contact}` : ""} لإتمام الدفع.</p>}
      <p className="text-[11px] leading-relaxed text-emerald-800">بعد ما تدفع{wa ? " أرسل الإيصال على واتساب" : ""}، ويُفتح {plan === "monthly" ? "اشتراكك" : "التحميل"} فور تأكيد الدفع.</p>
      {wa && <a target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} className="flex h-10 items-center justify-center rounded-lg bg-[#25D366] text-sm font-semibold text-white">أرسل إيصال الدفع على واتساب</a>}
    </div>
  );
}

/** تُركّب مرة واحدة في التطبيق */
/** نتيجة الرجوع من صفحة الدفع (?pay=paid|pending|failed) */
function PayResult() {
  const [r, setR] = React.useState<string | null>(null);
  React.useEffect(() => {
    const u = new URL(window.location.href);
    const v = u.searchParams.get("pay");
    if (!v) return;
    setR(v);
    u.searchParams.delete("pay"); u.searchParams.delete("d");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    refreshAccount();
  }, []);
  if (!r) return null;
  const t = r === "paid" ? { h: "تم الدفع ✓", b: "تفعّل تصميمك، وتقدر تحمّل ملفاتك الحين.", c: "text-emerald-700" }
    : r === "failed" ? { h: "ما تم الدفع", b: "العملية ما اكتملت ولا انخصم شي. جرّب مرة ثانية أو استخدم طريقة سداد ثانية.", c: "text-red-600" }
    : r === "mismatch" ? { h: "نراجع عملية الدفع", b: "وصلنا الدفع بمبلغ مختلف عن المطلوب، وبنراجعه ونتواصل معك.", c: "text-amber-700" }
    : { h: "بانتظار تأكيد الدفع", b: "إذا دفعت بيتفعّل تصميمك خلال دقائق تلقائياً. افتح «تصاميمي» بعد شوي.", c: "text-amber-700" };
  return (
    <Shell title={t.h} onClose={() => setR(null)}>
      <p className={`text-sm leading-relaxed ${t.c}`}>{t.b}</p>
      <button onClick={() => setR(null)} className="mt-4 h-10 w-full rounded-xl bg-ink text-sm text-paper">تمام</button>
    </Shell>
  );
}

export function AccountModals({ onOpenDesign }: { onOpenDesign: (d: DesignMeta) => Promise<void> | void }) {
  const { signup, designsOpen, paywall } = useAccount();
  return (
    <>
      <PayResult />
      {signup.open && <SignupModal reason={signup.reason} />}
      {paywall.open && paywall.designId && <PaywallModal designId={paywall.designId} reason={paywall.reason} />}
      {designsOpen && <DesignsModal onOpen={onOpenDesign} />}
    </>
  );
}
