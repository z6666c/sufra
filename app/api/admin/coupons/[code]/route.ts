import { deleteCoupon, updateCoupon } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ code: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  const c = await updateCoupon(decodeURIComponent((await params).code), {
    active: typeof b.active === "boolean" ? b.active : undefined,
    maxUses: b.maxUses === undefined ? undefined : b.maxUses,
    expiresAt: b.expiresAt === undefined ? undefined : b.expiresAt,
    note: b.note === undefined ? undefined : b.note,
  });
  return c ? json({ coupon: c }) : json({ error: "الكود غير موجود" }, 404);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  return (await deleteCoupon(decodeURIComponent((await params).code))) ? json({ ok: true }) : json({ error: "الكود غير موجود" }, 404);
}
