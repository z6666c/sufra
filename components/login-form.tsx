"use client";
import * as React from "react";

export function LoginForm({ demo, next, status }: { demo: { username: string; password: string } | null; next: string; status: { secret: boolean; admin: boolean; publicDemo: boolean } }) {
  const [username, setU] = React.useState("");
  const [password, setP] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [otp, setOtp] = React.useState<{ to: string; via?: string; devCode?: string } | null>(null);
  const [code, setCode] = React.useState("");
  const enterDemo = () => {
    // الديمو العام لا يحتاج جلسة: الزائر يُعامل كحساب ديمو تلقائياً
    if (status.publicDemo) { window.location.href = "/"; return; }
    if (demo) login(demo.username, demo.password);
  };
  const login = async (u = username, p = password, c?: string) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p, ...(c ? { code: c } : {}) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "تعذر الدخول");
      // حسابات الفريق: خطوة ثانية برمز التحقق
      if (d.otp) { setOtp({ to: d.to, via: d.via, devCode: d.devCode }); setCode(""); setBusy(false); return; }
      window.location.href = d.role === "admin" && next === "/" ? "/" : next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الدخول");
      setBusy(false);
    }
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4">
      {otp ? (
        <form onSubmit={(e) => { e.preventDefault(); login(username, password, code); }} className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-sm">
          <div className="mb-1 font-display text-2xl font-bold">رمز التحقق</div>
          <p className="mb-5 text-sm leading-relaxed text-muted">أرسلنا رمز من 6 أرقام {otp.via === "whatsapp" ? "على واتساب إلى" : otp.via === "sms" ? "برسالة إلى" : "إلى"} <b dir="ltr">{otp.to}</b></p>
          {otp.devCode && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">وضع التجربة: الرمز <b dir="ltr">{otp.devCode}</b></p>}
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d٠-٩]/g, ""))} placeholder="••••••" className="mb-4 h-12 w-full rounded-xl border border-line px-3.5 text-center font-latin text-xl tracking-[0.5em] outline-none focus:border-ink/40" />
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button disabled={busy || code.length !== 6} className="h-11 w-full rounded-xl bg-ink font-medium text-paper disabled:opacity-50">{busy ? "..." : "تأكيد والدخول"}</button>
          <div className="mt-3 flex justify-between text-xs">
            <button type="button" onClick={() => { setOtp(null); setError(null); }} className="text-muted hover:text-ink">رجوع</button>
            <button type="button" disabled={busy} onClick={() => login()} className="text-muted hover:text-ink">إعادة إرسال الرمز</button>
          </div>
        </form>
      ) : (
      <form onSubmit={(e) => { e.preventDefault(); login(); }} className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-sm">
        <div className="mb-1 font-display text-2xl font-bold">سُفرة</div>
        <p className="mb-6 text-sm text-muted">سجّل الدخول للمتابعة</p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted">اسم المستخدم</span>
          <input value={username} onChange={(e) => setU(e.target.value)} autoComplete="username" dir="ltr" className="h-11 w-full rounded-xl border border-line px-3.5 outline-none focus:border-ink/40" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-muted">كلمة المرور</span>
          <input type="password" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" dir="ltr" className="h-11 w-full rounded-xl border border-line px-3.5 outline-none focus:border-ink/40" />
        </label>
        {(!status.secret || !status.admin) && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            حساب الإدارة غير مفعّل بعد على هذا الخادم. أضف في إعدادات Vercel (Environment Variables):{" "}
            {!status.secret && <b dir="ltr">AUTH_SECRET</b>}{!status.secret && !status.admin && " و "}{!status.admin && <b dir="ltr">ADMIN_PASSWORD</b>} ثم أعد النشر.
          </div>
        )}
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button disabled={busy || !username || !password} className="h-11 w-full rounded-xl bg-ink font-medium text-paper disabled:opacity-50">{busy ? "..." : "دخول"}</button>
        {(demo || status.publicDemo) && (
          <div className="mt-5 rounded-xl border border-dashed border-line p-3 text-center">
            <div className="mb-2 text-xs text-muted">
              {status.publicDemo ? "تبغى تجرب؟ الديمو مفتوح بدون تسجيل." : <>تبغى تجرب؟ حساب الديمو: <b dir="ltr">{demo?.username}</b> / <b dir="ltr">{demo?.password}</b></>}
            </div>
            <button type="button" disabled={busy} onClick={enterDemo} className="h-9 w-full rounded-lg bg-ink/5 text-sm font-medium hover:bg-ink/10">دخول كحساب ديمو</button>
          </div>
        )}
      </form>
      )}
    </main>
  );
}
