// الحسابات والجلسات: حساب إدارة + حساب ديمو (بدون قاعدة بيانات)
// - بيانات الدخول من متغيرات البيئة، والجلسة كعكة موقّعة HMAC-SHA256 (Web Crypto: تعمل في proxy والخادم)
export type Role = "admin" | "demo" | "customer";
export type TeamLevel = "manager" | "viewer" | "custom";
/** m = عضو فريق (غير المالك)، v = نسخة صلاحيته، lv = مستواه */
export interface Session { u: string; r: Role; exp: number; m?: 1; v?: number; lv?: TeamLevel }

export const SESSION_COOKIE = "sufra_session";
const MAX_AGE = 60 * 60 * 24 * 7; // أسبوع
const isProd = () => process.env.NODE_ENV === "production";

export function authSecret(): string | null {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  return isProd() ? null : "dev-only-secret-change-me-sufra";
}

interface Account { username: string; password: string; role: Role }
/** الحسابات المفعّلة. في الإنتاج لا يُفعَّل حساب الإدارة إلا بكلمة مرور من البيئة */
export function accounts(): Account[] {
  const out: Account[] = [];
  const adminPass = process.env.ADMIN_PASSWORD || (isProd() ? "" : "admin123");
  if (adminPass) out.push({ username: (process.env.ADMIN_USERNAME || "admin").toLowerCase(), password: adminPass, role: "admin" });
  if (process.env.DEMO_ENABLED !== "false") {
    out.push({ username: (process.env.DEMO_USERNAME || "demo").toLowerCase(), password: process.env.DEMO_PASSWORD || "demo1234", role: "demo" });
  }
  return out;
}
export const demoCredentials = () =>
  process.env.DEMO_ENABLED === "false" ? null : { username: process.env.DEMO_USERNAME || "demo", password: process.env.DEMO_PASSWORD || "demo1234" };

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
/** مقارنة بزمن ثابت عبر مقارنة البصمات */
async function safeEqual(a: string, b: string) {
  const k = "cmp";
  const [x, y] = await Promise.all([hmac(k, a), hmac(k, b)]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function verifyLogin(username: string, password: string): Promise<Account | null> {
  const u = username.trim().toLowerCase();
  let found: Account | null = null;
  for (const a of accounts()) if (a.username === u && (await safeEqual(a.password, password))) found = a;
  return found;
}

export const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30;
export async function createToken(acc: { username: string; role: Role; member?: { v: number; level: TeamLevel } }, maxAge = acc.role === "customer" ? CUSTOMER_MAX_AGE : MAX_AGE): Promise<string> {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET_MISSING");
  const body = b64url(enc.encode(JSON.stringify({ u: acc.username, r: acc.role, exp: Math.floor(Date.now() / 1000) + maxAge, ...(acc.member ? { m: 1 as const, v: acc.member.v, lv: acc.member.level } : {}) } satisfies Session)));
  return `${body}.${await hmac(secret, body)}`;
}

export async function readToken(token?: string | null): Promise<Session | null> {
  const secret = authSecret();
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !(await safeEqual(sig, await hmac(secret, body)))) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (s.exp < Date.now() / 1000 || (s.r !== "admin" && s.r !== "demo" && s.r !== "customer")) return null;
    // حسابات الإدارة والديمو قد تُعطَّل لاحقاً من البيئة؛ العملاء محفوظون في قاعدة البيانات
    // أعضاء الفريق يُتحقق منهم من قاعدة البيانات في requireAdmin وصفحة الإدارة
    if (s.r !== "customer" && !s.m && !accounts().some((a) => a.username === s.u && a.role === s.r)) return null;
    return s;
  } catch {
    return null;
  }
}

/** وضع الديمو العام: أي زائر يدخل التطبيق مباشرة كحساب ديمو (عطّله بـ PUBLIC_DEMO=false) */
export const publicDemo = () => process.env.PUBLIC_DEMO !== "false" && process.env.DEMO_ENABLED !== "false";
export const GUEST = "guest";
const guestSession = (): Session => ({ u: GUEST, r: "demo", exp: Math.floor(Date.now() / 1000) + 3600 });

/** قراءة الجلسة من طلب API — الزائر بدون دخول يُعامل كديمو عند تفعيل الوضع العام */
export async function sessionFromRequest(req: Request): Promise<Session | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const s = await readToken(m ? decodeURIComponent(m.slice(SESSION_COOKIE.length + 1)) : null);
  return s ?? (publicDemo() ? guestSession() : null);
}

/** المالك = حساب الإدارة من متغيرات البيئة (ليس عضو فريق) */
export const isOwner = (s: Session | null | undefined) => s?.r === "admin" && !s.m;

export const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: isProd(), path: "/", maxAge: MAX_AGE };
