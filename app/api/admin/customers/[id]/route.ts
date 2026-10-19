import { deleteCustomer, getCustomer, listDesigns, TRIAL_DAYS, updateCustomer } from "@/lib/customers";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const id = (await params).id;
  const c = await getCustomer(id);
  return c ? json({ customer: c, designs: await listDesigns(id) }) : json({ error: "غير موجود" }, 404);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const id = (await params).id;
  const body = await req.json().catch(() => ({}));
  const c = await getCustomer(id);
  if (!c) return json({ error: "غير موجود" }, 404);
  const day = 86_400_000;
  let patch: Parameters<typeof updateCustomer>[1] = {};
  if (body.action === "extend") patch = { status: "trial", trialEndsAt: Math.max(Date.now(), c.trialEndsAt) + (Number(body.days) || TRIAL_DAYS) * day };
  else if (body.action === "paid") patch = { status: "paid" };
  else if (body.action === "trial") patch = { status: "trial", trialEndsAt: Math.max(Date.now() + TRIAL_DAYS * day, c.trialEndsAt) };
  if (typeof body.note === "string") patch.note = body.note.slice(0, 300);
  if (typeof body.name === "string") patch.name = body.name.slice(0, 80);
  return json({ customer: await updateCustomer(id, patch) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return (await deleteCustomer((await params).id)) ? json({ ok: true }) : json({ error: "غير موجود" }, 404);
}
