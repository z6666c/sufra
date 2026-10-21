import { createCoupon, listCoupons } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return json({ coupons: await listCoupons() });
}

/** إنشاء كود خصم — للمالك فقط */
export async function POST(req: Request) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  try {
    return json({ coupon: await createCoupon(b, g.u) });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
