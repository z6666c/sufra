import { NextResponse } from "next/server";
import { verifyMember } from "@/lib/team";
import { SESSION_COOKIE, cookieOptions, createToken, verifyLogin, authSecret } from "@/lib/auth";

export const runtime = "nodejs";

// حد بسيط لمحاولات الدخول لكل عنوان IP (في الذاكرة)
const attempts = new Map<string, { n: number; t: number }>();
const WINDOW = 10 * 60_000, LIMIT = 10;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.t < WINDOW && a.n >= LIMIT) return NextResponse.json({ error: "محاولات كثيرة، حاول بعد دقائق" }, { status: 429 });
  if (!authSecret()) return NextResponse.json({ error: "الخادم غير مهيأ: أضف AUTH_SECRET (16 حرفاً على الأقل)" }, { status: 500 });
  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  let acc: { username: string; role: "admin" | "demo" | "customer"; member?: { v: number; level: "manager" | "viewer" } } | null = await verifyLogin(String(body.username ?? ""), String(body.password ?? ""));
  if (!acc) {
    const m = await verifyMember(String(body.username ?? ""), String(body.password ?? "")).catch(() => null);
    if (m) acc = { username: m.username, role: "admin", member: { v: m.v, level: m.level } };
  }
  if (!acc) {
    attempts.set(ip, a && now - a.t < WINDOW ? { n: a.n + 1, t: a.t } : { n: 1, t: now });
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true, role: acc.role });
  res.cookies.set(SESSION_COOKIE, await createToken(acc), cookieOptions);
  return res;
}
