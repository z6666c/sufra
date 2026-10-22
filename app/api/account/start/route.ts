import { parseIdentifier, maskIdent } from "@/lib/customers";
import { canSend, startOtp } from "@/lib/otp";
import { kvAvailable } from "@/lib/kv";
import { json, noKv } from "@/lib/api-guard";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!kvAvailable()) return noKv();
  if (!rateLimit(`otp:${clientIp(req)}`, 8)) return json({ error: "محاولات كثيرة، حاول بعد ساعة" }, 429);
  const body = await req.json().catch(() => ({}));
  const ident = parseIdentifier(String(body.identifier ?? ""));
  if (!ident) return json({ error: "اكتب بريداً صحيحاً أو رقم جوال مثل 05xxxxxxxx" }, 400);
  const review = !!process.env.APP_REVIEW_EMAIL && ident.type === "email" && ident.value === process.env.APP_REVIEW_EMAIL.trim().toLowerCase();
  if (!canSend(ident.type) && !review) {
    return json({ error: ident.type === "email" ? "التسجيل بالبريد غير مفعّل بعد على الخادم" : "التسجيل بالجوال (واتساب) غير مفعّل بعد، استخدم البريد الإلكتروني" }, 503);
  }
  try {
    const r = await startOtp(ident);
    return json({ ok: true, to: maskIdent(ident), type: ident.type, via: r.via, ...(r.devCode ? { devCode: r.devCode } : {}) });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "COOLDOWN") return json({ error: "انتظر دقيقة قبل طلب رمز جديد" }, 429);
    console.error("[otp]", m);
    return json({ error: "تعذر إرسال الرمز، تأكد من البيانات وحاول مرة أخرى" }, 502);
  }
}
