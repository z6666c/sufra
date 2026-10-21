import { deleteCustomer, getCustomer, isPaid, listDesigns, markDesignPaid, updateCustomer } from "@/lib/customers";
import { getPlans } from "@/lib/pricing";
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
  const g = await requireAdmin(req, "customers");
  if (g instanceof Response) return g;
  const id = (await params).id;
  const body = await req.json().catch(() => ({}));
  const c = await getCustomer(id);
  if (!c) return json({ error: "غير موجود" }, 404);
  let patch: Parameters<typeof updateCustomer>[1] = {};
  if (body.action === "paid") patch = { status: "paid" };
  // «تفعيل كمدفوع» على مستوى العميل يفتح كل تصاميمه الحالية
  if (body.action === "paid") { const P = await getPlans(); for (const d of await listDesigns(id)) if (!isPaid(d)) await markDesignPaid(d.id, { plan: "once", amount: P.once.price, months: P.once.months, by: g.u }); }
  if (typeof body.note === "string") patch.note = body.note.slice(0, 300);
  if (typeof body.name === "string") patch.name = body.name.slice(0, 80);
  return json({ customer: await updateCustomer(id, patch) });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  return (await deleteCustomer((await params).id)) ? json({ ok: true }) : json({ error: "غير موجود" }, 404);
}
