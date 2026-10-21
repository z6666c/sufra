import { clearExamples, examplesExist, seedExamples } from "@/lib/customers";
import { getPlans } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return json({ exists: await examplesExist() });
}

/** يضيف عملاء وتصاميم وطلبات دفع تجريبية لعرض كل حالات اللوحة */
export async function POST(req: Request) {
  const g = await requireAdmin(req, "examples");
  if (g instanceof Response) return g;
  if (await examplesExist()) return json({ error: "البيانات التجريبية موجودة بالفعل" }, 400);
  const PLANS = await getPlans();
  const n = await seedExamples("menu", { once: PLANS.once.price, monthly: PLANS.monthly.price }, PLANS.once.months);
  return json({ ok: true, customers: n });
}

export async function DELETE(req: Request) {
  const g = await requireAdmin(req, "examples");
  if (g instanceof Response) return g;
  return json({ ok: true, removed: await clearExamples() });
}
