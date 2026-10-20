// قائمة جاهزية الخادم في لوحة الإدارة
import { accounts, authSecret, publicDemo } from "./auth";
import { kvKind } from "./kv";
import { emailProvider, smsProvider, whatsappProvider, phoneProvider, devEcho } from "./otp";
import { DRAFT_DAYS } from "./customers";
import { PLANS } from "./plans";

export function settingsRows() {
  const e = process.env;
  const kv = kvKind();
  return [
    { label: "مفتاح الجلسات AUTH_SECRET", value: e.AUTH_SECRET ? "مضبوط" : authSecret() ? "افتراضي للتطوير" : "غير مضبوط", ok: !!e.AUTH_SECRET },
    { label: "حسابات الإدارة والديمو", value: accounts().map((a) => `${a.username} (${a.role === "admin" ? "إدارة" : "ديمو"})`).join("، ") || "لا يوجد" },
    { label: "الديمو العام بدون تسجيل", value: publicDemo() ? "مفعّل" : "متوقف", ok: true, hint: "PUBLIC_DEMO" },
    { label: "قاعدة البيانات (العملاء والتصاميم)", value: kv === "redis" ? "Upstash Redis" : kv === "file" ? "ملف محلي (تطوير)" : "غير مربوطة", ok: kv === "redis", hint: "اربط Upstash من Vercel ← Storage" },
    { label: "الباقات", value: `مرة واحدة ${PLANS.once.price} ر.س · شهري ${PLANS.monthly.price} ر.س`, hint: "NEXT_PUBLIC_PRICE_ONCE و NEXT_PUBLIC_PRICE_MONTHLY" },
    { label: "حفظ المسودة غير المدفوعة", value: `${DRAFT_DAYS} أيام لإكمال الشراء (لا توجد فترة مجانية)`, hint: "DRAFT_DAYS" },
    { label: "طريقة الدفع", value: process.env.NEXT_PUBLIC_PAYMENT_NOTE ? "تعليمات تحويل يدوي مضبوطة" : "يدوي — يطلب العميل التفعيل وتفعّله من «الطلبات والمدفوعات»", ok: !!process.env.NEXT_PUBLIC_PAYMENT_NOTE, hint: "NEXT_PUBLIC_PAYMENT_NOTE و NEXT_PUBLIC_WHATSAPP — بوابة الدفع لاحقاً" },
    { label: "التسجيل بالبريد", value: emailProvider() ? "Resend" : devEcho() ? "وضع تجربة (الرمز يظهر على الشاشة)" : "غير مفعّل", ok: !!emailProvider(), hint: "RESEND_API_KEY و MAIL_FROM" },
    { label: "رمز الدخول بالجوال", value: whatsappProvider() ? `واتساب${smsProvider() ? " (وSMS احتياطي)" : ""}` : smsProvider() === "twilio" ? "SMS عبر Twilio" : smsProvider() === "unifonic" ? "SMS عبر Unifonic" : devEcho() ? "وضع تجربة (الرمز يظهر على الشاشة)" : "غير مفعّل", ok: !!phoneProvider(), hint: "واتساب: WHATSAPP_TOKEN و WHATSAPP_PHONE_ID و WHATSAPP_TEMPLATE — أو SMS: TWILIO_* / UNIFONIC_APP_SID" },
    ...(e.OTP_DEV_ECHO === "true" && e.NODE_ENV === "production" ? [{ label: "تحذير أمني", value: "OTP_DEV_ECHO مفعّل في الإنتاج", ok: false, hint: "يعرض الرمز للزائر — أوقفه بعد تفعيل الإرسال" }] : []),
    { label: "Gemini (الهوية، فحص الاسم، المنيو)", value: e.GEMINI_API_KEY ? e.GEMINI_MODEL || "gemini-3.8-flash" : "غير مفعّل", ok: !!e.GEMINI_API_KEY },
    { label: "Recraft (شعارات متجهية وصور)", value: e.RECRAFT_API_KEY ? e.RECRAFT_LOGO_MODEL || "recraftv3_vector" : "غير مفعّل", ok: !!e.RECRAFT_API_KEY },
    { label: "حدود الذكاء الاصطناعي", value: e.DEMO_AI === "false" ? "متوقف للزوار" : `زائر: ${e.DEMO_AI_LOGOS_PER_HOUR || 2} دفعة بالساعة × شعاران (Gemini) · لم يدفع: ${e.AI_LOGOS_UNPAID_PER_DAY || 3} دفعات يومياً × شعاران · دافع: ${e.AI_LOGOS_PAID_PER_DAY || 20} دفعة يومياً × 6`, hint: "DEMO_AI_LOGOS_PER_HOUR و AI_LOGOS_UNPAID_PER_DAY و AI_LOGOS_PAID_PER_DAY" },
    { label: "بيئة التشغيل", value: e.VERCEL_ENV ? `Vercel (${e.VERCEL_ENV})` : e.NODE_ENV ?? "development" },
  ];
}
