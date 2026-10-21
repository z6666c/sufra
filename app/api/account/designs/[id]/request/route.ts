import { requestPayment, type RequestedCoupon } from "@/lib/customers";
import { quoteCoupon } from "@/lib/pricing";
import { json, requireCustomer } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** العميل يطلب تفعيل الدفع لتصميمه (حتى ربط بوابة الدفع) */
export async function POST(req: Request, { params }: Ctx) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  const body = await req.json().catch(() => ({}));
  const plan = body.plan === "monthly" ? "monthly" : "once";
  let coupon: RequestedCoupon | null = null;
  if (body.coupon) {
    const q = await quoteCoupon(String(body.coupon), plan);
    if (!q.ok) return json({ error: q.error }, 400);
    coupon = { code: q.coupon.code, plan, base: q.base, price: q.price };
  }
  const d = await requestPayment((await params).id, c.id, plan, coupon);
  return d ? json({ ok: true, requestedAt: d.paymentRequestedAt }) : json({ error: "التصميم غير موجود" }, 404);
}
