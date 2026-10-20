// رمز التحقق (OTP) للتسجيل بالبريد أو الجوال
// البريد: Resend (RESEND_API_KEY, MAIL_FROM) — الجوال: واتساب (WhatsApp Cloud API من Meta) أولاً، ثم SMS (Twilio أو Unifonic) احتياطاً
import crypto from "node:crypto";
import { kv, kvJson } from "./kv";
import { stat, type Ident } from "./customers";

const APP = "sufra";
const BRAND = "سُفرة";
const TTL = 10 * 60, COOLDOWN = 60_000, MAX_TRIES = 5;
const key = (v: string) => `${APP}:otp:${v}`;
const hash = (code: string, v: string) => crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev").update(`${v}:${code}`).digest("hex");

export const emailProvider = () => (process.env.RESEND_API_KEY ? "resend" : null);
export const smsProvider = () => (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "twilio" : process.env.UNIFONIC_APP_SID ? "unifonic" : null);
/** في التطوير (أو عند التفعيل الصريح) يُعاد الرمز في الاستجابة بدل إرساله */
export const devEcho = () => process.env.NODE_ENV !== "production" || process.env.OTP_DEV_ECHO === "true";
/** واتساب: رسالة «مصادقة» برمز الدخول — أرخص بكثير من SMS (حوالي 0.04 ر.س للرسالة في السعودية) */
export const whatsappProvider = () => (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID ? "whatsapp" : null);
export const phoneProvider = () => whatsappProvider() ?? smsProvider();
export const canSend = (t: Ident["type"]) => devEcho() || (t === "email" ? !!emailProvider() : !!phoneProvider());

async function sendEmail(to: string, code: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || `${BRAND} <onboarding@resend.dev>`,
      to: [to],
      subject: `رمز الدخول إلى ${BRAND}: ${code}`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;line-height:1.8"><p>رمز الدخول إلى ${BRAND}:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px">${code}</p><p>صالح لمدة 10 دقائق. إذا لم تطلبه تجاهل هذه الرسالة.</p></div>`,
    }),
  });
  if (!r.ok) throw new Error(`EMAIL ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

async function sendSms(to: string, code: string) {
  const body = `${code} رمز الدخول إلى ${BRAND}. صالح 10 دقائق.`;
  if (smsProvider() === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID!, tok = process.env.TWILIO_AUTH_TOKEN!;
    const form = new URLSearchParams({ To: to, Body: body });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else form.set("From", process.env.TWILIO_FROM || "");
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
    });
    if (!r.ok) throw new Error(`SMS ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return;
  }
  const form = new URLSearchParams({ AppSid: process.env.UNIFONIC_APP_SID!, SenderID: process.env.UNIFONIC_SENDER || BRAND, Recipient: to.replace(/^\+/, ""), Body: body });
  const r = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false || j.success === "false") throw new Error(`SMS ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
}

/** قالب واتساب من نوع «Authentication» بزر «نسخ الرمز» (يُعتمد من Meta مرة واحدة) */
async function sendWhatsApp(to: string, code: string) {
  const v = process.env.WHATSAPP_API_VERSION || "v23.0";
  const r = await fetch(`https://graph.facebook.com/${v}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "login_code",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "ar" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`WHATSAPP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

interface OtpRec { h: string; tries: number; sentAt: number }

export type OtpVia = "email" | "whatsapp" | "sms";
export async function startOtp(ident: Ident): Promise<{ devCode?: string; via: OtpVia }> {
  const prev = await kvJson.get<OtpRec>(key(ident.value));
  if (prev && Date.now() - prev.sentAt < COOLDOWN) throw new Error("COOLDOWN");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await kvJson.set(key(ident.value), { h: hash(code, ident.value), tries: 0, sentAt: Date.now() } satisfies OtpRec, TTL);
  if (devEcho() && !(ident.type === "email" ? emailProvider() : phoneProvider())) return { devCode: code, via: ident.type === "email" ? "email" : whatsappProvider() ? "whatsapp" : "sms" };
  if (ident.type === "email") {
    await sendEmail(ident.value, code);
    await stat("otp_email");
    return { via: "email" };
  }
  if (whatsappProvider()) {
    try {
      await sendWhatsApp(ident.value, code);
      await stat("otp_whatsapp");
      return { via: "whatsapp" };
    } catch (e) {
      // الرقم بدون واتساب أو خطأ مؤقت: نرسل SMS إن كان مفعّلاً
      if (!smsProvider()) throw e;
      console.error("[otp] whatsapp failed, falling back to sms", e instanceof Error ? e.message : e);
    }
  }
  await sendSms(ident.value, code);
  await stat("otp_sms");
  return { via: "sms" };
}

export async function verifyOtp(ident: Ident, code: string): Promise<"ok" | "invalid" | "expired" | "locked"> {
  const rec = await kvJson.get<OtpRec>(key(ident.value));
  if (!rec) return "expired";
  if (rec.tries >= MAX_TRIES) return "locked";
  const a = Buffer.from(rec.h), b = Buffer.from(hash(code.trim(), ident.value));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) { await kv("DEL", key(ident.value)); return "ok"; }
  rec.tries++;
  await kvJson.set(key(ident.value), rec, TTL);
  return rec.tries >= MAX_TRIES ? "locked" : "invalid";
}
