import { NextResponse } from "next/server";
import { parseIdentifier, upsertCustomer } from "@/lib/customers";
import { verifyOtp } from "@/lib/otp";
import { kvAvailable } from "@/lib/kv";
import { SESSION_COOKIE, CUSTOMER_MAX_AGE, cookieOptions, createToken, authSecret } from "@/lib/auth";
import { json, noKv } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!kvAvailable()) return noKv();
  if (!authSecret()) return json({ error: "الخادم غير مهيأ (AUTH_SECRET)" }, 500);
  const body = await req.json().catch(() => ({}));
  const ident = parseIdentifier(String(body.identifier ?? ""));
  const code = String(body.code ?? "").replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  if (!ident || !/^\d{6}$/.test(code)) return json({ error: "الرمز من 6 أرقام" }, 400);
  const v = await verifyOtp(ident, code);
  if (v !== "ok") return json({ error: v === "expired" ? "انتهت صلاحية الرمز، اطلب رمزاً جديداً" : v === "locked" ? "محاولات كثيرة، اطلب رمزاً جديداً" : "الرمز غير صحيح" }, 400);
  const { customer, created } = await upsertCustomer(ident);
  const res = NextResponse.json({ ok: true, created, customer });
  res.cookies.set(SESSION_COOKIE, await createToken({ username: customer.id, role: "customer" }), { ...cookieOptions, maxAge: CUSTOMER_MAX_AGE });
  return res;
}
