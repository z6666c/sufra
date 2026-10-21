import { removeMember, updateMember } from "@/lib/team";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** تعديل عضو: الاسم، الصلاحية، كلمة المرور، الإيقاف — أي تغيير في الصلاحية أو كلمة المرور يُخرج جلساته */
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  try {
    const m = await updateMember((await params).id, {
      name: typeof b.name === "string" ? b.name : undefined,
      level: b.level === "viewer" || b.level === "manager" || b.level === "custom" ? b.level : undefined,
      perms: b.perms,
      password: typeof b.password === "string" ? b.password : undefined,
      disabled: typeof b.disabled === "boolean" ? b.disabled : undefined,
    });
    return m ? json({ member: m }) : json({ error: "العضو غير موجود" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  return (await removeMember((await params).id)) ? json({ ok: true }) : json({ error: "العضو غير موجود" }, 404);
}
