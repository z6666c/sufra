import { deleteDesign, getDesign } from "@/lib/customers";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const d = await getDesign((await params).id);
  return d ? json({ design: d }) : json({ error: "غير موجود" }, 404);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return (await deleteDesign((await params).id)) ? json({ ok: true }) : json({ error: "غير موجود" }, 404);
}
