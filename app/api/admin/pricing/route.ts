import { defaultPrices, getPriceOverride, getPrices, setPrices } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

/** أسعار الباقات الحالية (قراءة لكل الفريق) */
export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return json({ current: await getPrices(), defaults: defaultPrices(), override: await getPriceOverride() });
}

/** تعديل الأسعار — للمالك فقط. {once, monthly} أو {reset: true} للرجوع لأسعار البيئة */
export async function PUT(req: Request) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  try {
    await setPrices(b.reset ? null : { once: b.once === undefined ? undefined : Number(b.once), monthly: b.monthly === undefined ? undefined : Number(b.monthly) }, g.u);
    return json({ current: await getPrices(), defaults: defaultPrices(), override: await getPriceOverride() });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
