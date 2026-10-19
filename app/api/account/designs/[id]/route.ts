import { deleteDesign, getDesign } from "@/lib/customers";
import { json, requireCustomer } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  const d = await getDesign((await params).id, c.id);
  return d ? json({ design: d }) : json({ error: "التصميم غير موجود أو انتهت صلاحيته" }, 404);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  return (await deleteDesign((await params).id, c.id)) ? json({ ok: true }) : json({ error: "غير موجود" }, 404);
}
