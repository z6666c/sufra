import { listDesigns, saveDesign } from "@/lib/customers";
import { json, requireCustomer } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  return json({ designs: await listDesigns(c.id), customer: c });
}

export async function POST(req: Request) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  const raw = await req.text();
  let body: { id?: string; title?: string; kind?: string; data?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: "طلب غير صالح" }, 400); }
  if (!body.data) return json({ error: "لا يوجد تصميم" }, 400);
  try {
    const d = await saveDesign(c, { id: body.id, title: String(body.title ?? "تصميم"), kind: String(body.kind ?? "design"), data: body.data });
    return json({ design: d });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "TOO_BIG") return json({ error: "التصميم أكبر من المسموح؛ قلّل الصور" }, 413);
    if (m === "LIMIT") return json({ error: "وصلت للحد الأقصى من التصاميم (20)، احذف تصميماً قديماً" }, 400);
    console.error("[designs]", m);
    return json({ error: "تعذر الحفظ" }, 500);
  }
}
