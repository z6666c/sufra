// أدوات مشتركة لمسارات الحساب والإدارة
import { NextResponse } from "next/server";
import { sessionFromRequest, type Session } from "./auth";
import { kvAvailable } from "./kv";
import { getCustomer, type Customer } from "./customers";
import { getMember } from "./team";

export const json = (d: unknown, status = 200) => NextResponse.json(d, { status, headers: { "Cache-Control": "no-store" } });
export const noKv = () => json({ error: "قاعدة البيانات غير مربوطة بعد (Upstash Redis). اربطها من Vercel ← Storage." }, 503);

/** التحقق من عضو الفريق: موجود، غير موقوف، ونسخة صلاحيته مطابقة للجلسة */
export async function checkStaff(s: Session | null, need: "read" | "write" | "owner"): Promise<string | null> {
  if (s?.r !== "admin") return "للإدارة فقط";
  if (!s.m) return null; // المالك
  if (need === "owner") return "هذا الإجراء للمالك فقط";
  const m = kvAvailable() ? await getMember(s.u) : null;
  if (!m || m.disabled || m.v !== s.v) return "انتهت صلاحية دخولك، سجّل الدخول من جديد";
  if (need === "write" && m.level === "viewer") return "صلاحيتك مشاهدة فقط";
  return null;
}

/** need: افتراضياً قراءة لطلبات GET وكتابة لغيرها؛ "owner" للمالك فقط */
export async function requireAdmin(req: Request, need?: "read" | "write" | "owner"): Promise<Session | Response> {
  const s = await sessionFromRequest(req);
  const err = await checkStaff(s, need ?? (req.method === "GET" || req.method === "HEAD" ? "read" : "write"));
  if (err) return json({ error: err }, 403);
  if (!kvAvailable()) return noKv();
  return s!;
}

export async function requireCustomer(req: Request): Promise<Customer | Response> {
  const s = await sessionFromRequest(req);
  if (s?.r !== "customer") return json({ error: "سجّل دخولك أولاً" }, 401);
  if (!kvAvailable()) return noKv();
  const c = await getCustomer(s.u);
  return c ?? json({ error: "الحساب غير موجود" }, 401);
}
