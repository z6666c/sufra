// رمز التحقق (OTP) للتسجيل بالبريد أو الجوال
// البريد: Resend (RESEND_API_KEY, MAIL_FROM) — الجوال: Twilio أو Unifonic
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
export const canSend = (t: Ident["type"]) => devEcho() || (t === "email" ? !!emailProvider() : !!smsProvider());

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

interface OtpRec { h: string; tries: number; sentAt: number }

export async function startOtp(ident: Ident): Promise<{ devCode?: string }> {
  const prev = await kvJson.get<OtpRec>(key(ident.value));
  if (prev && Date.now() - prev.sentAt < COOLDOWN) throw new Error("COOLDOWN");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await kvJson.set(key(ident.value), { h: hash(code, ident.value), tries: 0, sentAt: Date.now() } satisfies OtpRec, TTL);
  if (devEcho() && !(ident.type === "email" ? emailProvider() : smsProvider())) return { devCode: code };
  if (ident.type === "email") await sendEmail(ident.value, code);
  else await sendSms(ident.value, code);
  await stat(ident.type === "email" ? "otp_email" : "otp_sms");
  return {};
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
