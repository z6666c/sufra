import { NextResponse } from "next/server";
import { getOwnerContact, stampLogin, verifyMember } from "@/lib/team";
import { canSend, phoneProvider, startOtp, verifyOtp } from "@/lib/otp";
import { maskIdent, type Ident } from "@/lib/customers";
import { SESSION_COOKIE, cookieOptions, createToken, verifyLogin, authSecret, type Role, type TeamLevel } from "@/lib/auth";

export const runtime = "nodejs";

// حد بسيط لمحاولات الدخول لكل عنوان IP (في الذاكرة)
const attempts = new Map<string, { n: number; t: number }>();
const WINDOW = 10 * 60_000, LIMIT = 10;

/** الجوال (واتساب) أولاً إذا مفعّل، وإلا الإيميل */
const pickIdent = (c: { email?: string; phone?: string }): Ident | null =>
  c.phone && (phoneProvider() || !c.email) ? { type: "phone", value: c.phone } : c.email ? { type: "email", value: c.email } : c.phone ? { type: "phone", value: c.phone } : null;

type Acc = { username: string; role: Role; member?: { v: number; level: TeamLevel } };

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.t < WINDOW && a.n >= LIMIT) return NextResponse.json({ error: "محاولات كثيرة، حاول بعد دقائق" }, { status: 429 });
  if (!authSecret()) return NextResponse.json({ error: "الخادم غير مهيأ: أضف AUTH_SECRET (16 حرفاً على الأقل)" }, { status: 500 });
  let body: { username?: string; password?: string; code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const username = String(body.username ?? ""), password = String(body.password ?? "");

  let acc: Acc | null = await verifyLogin(username, password);
  // رمز التحقق: للمالك إذا أضاف إيميله أو جواله، ولكل أعضاء الفريق دائماً
  let ident: Ident | null = null, required = false, memberName: string | null = null;
  if (acc?.role === "admin") {
    ident = pickIdent(await getOwnerContact());
    required = !!ident && canSend(ident.type); // بدون مزود إرسال: كلمة المرور فقط (اللوحة تنبّه) حتى لا يُقفل المالك
  } else if (!acc) {
    const m = await verifyMember(username, password).catch(() => null);
    if (m) {
      ident = pickIdent(m);
      if (!ident) return NextResponse.json({ error: "ما فيه إيميل أو جوال مسجّل لحسابك — اطلب من المالك يضيفه من «الفريق»" }, { status: 403 });
      required = true; memberName = m.username;
      acc = { username: m.username, role: "admin", member: { v: m.v, level: m.level } };
    }
  }
  if (!acc) {
    attempts.set(ip, a && now - a.t < WINDOW ? { n: a.n + 1, t: a.t } : { n: 1, t: now });
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }
  attempts.delete(ip);

  if (required && ident) {
    if (!body.code) {
      if (!canSend(ident.type)) return NextResponse.json({ error: "إرسال رمز التحقق غير مفعّل على الخادم بعد" }, { status: 503 });
      try {
        const r = await startOtp(ident);
        return NextResponse.json({ otp: true, to: maskIdent(ident), via: r.via, ...(r.devCode ? { devCode: r.devCode } : {}) });
      } catch (e) {
        if ((e as Error).message === "COOLDOWN") return NextResponse.json({ otp: true, to: maskIdent(ident), wait: true });
        console.error("[login otp]", (e as Error).message);
        return NextResponse.json({ error: "تعذر إرسال رمز التحقق، حاول بعد شوي" }, { status: 502 });
      }
    }
    const v = await verifyOtp(ident, String(body.code));
    if (v !== "ok") return NextResponse.json({ error: v === "expired" ? "انتهت صلاحية الرمز، اطلب رمز جديد" : v === "locked" ? "محاولات كثيرة، اطلب رمز جديد" : "الرمز غير صحيح", otp: true }, { status: 400 });
  }
  if (memberName) await stampLogin(memberName);
  const res = NextResponse.json({ ok: true, role: acc.role });
  res.cookies.set(SESSION_COOKIE, await createToken(acc), cookieOptions);
  return res;
}
