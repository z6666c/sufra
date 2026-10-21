import { getPayMethods, setPayMethods } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return json({ methods: await getPayMethods() });
}

/** حفظ طرق السداد — للمالك أو من عنده صلاحية «الأسعار وأكواد الخصم» */
export async function PUT(req: Request) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  try {
    return json({ methods: await setPayMethods(await req.json().catch(() => ({})), g.u) });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
