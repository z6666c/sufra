"use client";
import * as React from "react";
import { deleteAccount, openSignup, useAccount } from "../account/account-client";
import { AccountModals } from "../account/account-modals";

export function DeleteAccountBox() {
  const { me } = useAccount();
  const [step, setStep] = React.useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [err, setErr] = React.useState("");
  const c = me?.customer;
  if (step === "done") return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">تم حذف حسابك وكل بياناتك.</p>;
  return (
    <div className="rounded-xl border border-line bg-white p-4 text-sm">
      <AccountModals onOpenDesign={() => {}} />
      {!c ? (
        <button onClick={() => openSignup("لحذف حسابك.")} className="h-10 rounded-xl bg-ink px-4 text-paper">سجّل دخولك للمتابعة</button>
      ) : step === "idle" ? (
        <><p className="mb-3">مسجّل باسم <b dir="ltr">{c.email ?? c.phone}</b></p><button onClick={() => setStep("confirm")} className="h-10 rounded-xl bg-red-600 px-4 text-white">حذف حسابي نهائياً</button></>
      ) : (
        <div className="text-red-800">
          <p>متأكد؟ بنحذف حسابك وكل تصاميمك وما نقدر نرجّعها.</p>
          {err && <p className="mt-1 font-semibold">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={step === "busy"} onClick={async () => { setStep("busy"); setErr(""); try { await deleteAccount(); setStep("done"); } catch (e) { setErr((e as Error).message); setStep("confirm"); } }} className="h-10 rounded-xl bg-red-600 px-4 font-semibold text-white">{step === "busy" ? "…" : "نعم، احذف"}</button>
            <button onClick={() => setStep("idle")} className="h-10 rounded-xl border border-line px-4">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
