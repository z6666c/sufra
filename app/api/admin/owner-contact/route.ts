import { getOwnerContact, setOwnerContact } from "@/lib/team";
import { canSend } from "@/lib/otp";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

const status = async () => {
  const c = await getOwnerContact();
  const active = (c.phone && canSend("phone")) || (c.email && canSend("email"));
  return { ...c, active: !!active, canEmail: canSend("email"), canPhone: canSend("phone") };
};

/** إيميل وجوال المالك لرمز التحقق عند الدخول — للمالك فقط */
export async function GET(req: Request) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  return json(await status());
}

export async function PUT(req: Request) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  if ((await getOwnerContact()).fromEnv) return json({ error: "بياناتك مضبوطة من متغيرات البيئة ADMIN_EMAIL / ADMIN_PHONE — عدّلها من فيرسل" }, 400);
  const b = await req.json().catch(() => ({}));
  try {
    await setOwnerContact(b.email, b.phone);
    return json(await status());
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
