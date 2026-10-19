// أدوات مشتركة لمسارات الحساب والإدارة
import { NextResponse } from "next/server";
import { sessionFromRequest, type Session } from "./auth";
import { kvAvailable } from "./kv";
import { getCustomer, type Customer } from "./customers";

export const json = (d: unknown, status = 200) => NextResponse.json(d, { status, headers: { "Cache-Control": "no-store" } });
export const noKv = () => json({ error: "قاعدة البيانات غير مربوطة بعد (Upstash Redis). اربطها من Vercel ← Storage." }, 503);

export async function requireAdmin(req: Request): Promise<Session | Response> {
  const s = await sessionFromRequest(req);
  if (s?.r !== "admin") return json({ error: "للإدارة فقط" }, 403);
  if (!kvAvailable()) return noKv();
  return s;
}

export async function requireCustomer(req: Request): Promise<Customer | Response> {
  const s = await sessionFromRequest(req);
  if (s?.r !== "customer") return json({ error: "سجّل دخولك أولاً" }, 401);
  if (!kvAvailable()) return noKv();
  const c = await getCustomer(s.u);
  return c ?? json({ error: "الحساب غير موجود" }, 401);
}
