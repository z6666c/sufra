// قائمة جاهزية الخادم في لوحة الإدارة
import { accounts, authSecret, publicDemo } from "./auth";
import { kvKind } from "./kv";
import { emailProvider, smsProvider, devEcho } from "./otp";
import { TRIAL_DAYS } from "./customers";

export function settingsRows() {
  const e = process.env;
  const kv = kvKind();
  return [
    { label: "مفتاح الجلسات AUTH_SECRET", value: e.AUTH_SECRET ? "مضبوط" : authSecret() ? "افتراضي للتطوير" : "غير مضبوط", ok: !!e.AUTH_SECRET },
    { label: "حسابات الإدارة والديمو", value: accounts().map((a) => `${a.username} (${a.role === "admin" ? "إدارة" : "ديمو"})`).join("، ") || "لا يوجد" },
    { label: "الديمو العام بدون تسجيل", value: publicDemo() ? "مفعّل" : "متوقف", ok: true, hint: "PUBLIC_DEMO" },
    { label: "قاعدة البيانات (العملاء والتصاميم)", value: kv === "redis" ? "Upstash Redis" : kv === "file" ? "ملف محلي (تطوير)" : "غير مربوطة", ok: kv === "redis", hint: "اربط Upstash من Vercel ← Storage" },
    { label: "مدة حفظ التصميم قبل الدفع", value: `${TRIAL_DAYS} يوماً`, hint: "TRIAL_DAYS" },
    { label: "التسجيل بالبريد", value: emailProvider() ? "Resend" : devEcho() ? "وضع تجربة (الرمز يظهر على الشاشة)" : "غير مفعّل", ok: !!emailProvider(), hint: "RESEND_API_KEY و MAIL_FROM" },
    { label: "التسجيل بالجوال", value: smsProvider() === "twilio" ? "Twilio" : smsProvider() === "unifonic" ? "Unifonic" : devEcho() ? "وضع تجربة (الرمز يظهر على الشاشة)" : "غير مفعّل", ok: !!smsProvider(), hint: "TWILIO_* أو UNIFONIC_APP_SID" },
    ...(e.OTP_DEV_ECHO === "true" && e.NODE_ENV === "production" ? [{ label: "تحذير أمني", value: "OTP_DEV_ECHO مفعّل في الإنتاج", ok: false, hint: "يعرض الرمز للزائر — أوقفه بعد تفعيل الإرسال" }] : []),
    { label: "Gemini (الهوية، فحص الاسم، المنيو)", value: e.GEMINI_API_KEY ? e.GEMINI_MODEL || "gemini-3.8-flash" : "غير مفعّل", ok: !!e.GEMINI_API_KEY },
    { label: "Recraft (شعارات متجهية وصور)", value: e.RECRAFT_API_KEY ? e.RECRAFT_LOGO_MODEL || "recraftv3_vector" : "غير مفعّل", ok: !!e.RECRAFT_API_KEY },
    { label: "الذكاء الاصطناعي في الديمو", value: e.DEMO_AI === "false" ? "متوقف" : `${e.DEMO_AI_LOGOS_PER_HOUR || 3} دفعات شعارات و${e.DEMO_AI_IDENTITIES_PER_HOUR || 5} هويات/ساعة لكل زائر` },
    { label: "بيئة التشغيل", value: e.VERCEL_ENV ? `Vercel (${e.VERCEL_ENV})` : e.NODE_ENV ?? "development" },
  ];
}
