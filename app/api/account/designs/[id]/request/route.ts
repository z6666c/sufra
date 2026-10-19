import { requestPayment } from "@/lib/customers";
import { json, requireCustomer } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** العميل يطلب تفعيل الدفع لتصميمه (حتى ربط بوابة الدفع) */
export async function POST(req: Request, { params }: Ctx) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  const body = await req.json().catch(() => ({}));
  const d = await requestPayment((await params).id, c.id, body.plan === "monthly" ? "monthly" : "once");
  return d ? json({ ok: true, requestedAt: d.paymentRequestedAt }) : json({ error: "التصميم غير موجود" }, 404);
}
