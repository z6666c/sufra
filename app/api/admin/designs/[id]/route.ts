import { deleteDesign, getDesign, isPaid, markDesignPaid } from "@/lib/customers";
import { type PlanKind } from "@/lib/plans";
import { getPlans, useCoupon } from "@/lib/pricing";
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
  const g = await requireAdmin(req, "designs");
  if (g instanceof Response) return g;
  return (await deleteDesign((await params).id)) ? json({ ok: true }) : json({ error: "غير موجود" }, 404);
}

/** تفعيل الدفع يدوياً (تحويل بنكي مثلاً) أو إلغاؤه */
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireAdmin(req, "payments");
  if (g instanceof Response) return g;
  const body = await req.json().catch(() => ({}));
  const id = (await params).id;
  const plans = await getPlans();
  const plan = plans[(body.plan as PlanKind) in plans ? (body.plan as PlanKind) : "once"];
  // كود الخصم اللي طلبه العميل يطبَّق تلقائياً إذا فعّلت نفس الباقة
  const cur = body.action === "unpaid" ? null : await getDesign(id);
  const rc = cur && !isPaid(cur) && cur.requestedCoupon && cur.requestedCoupon.plan === plan.kind ? cur.requestedCoupon : null;
  const amount = Number(body.amount ?? (rc ? rc.price : plan.price));
  // paid = تفعيل، renew = تجديد شهر، unpaid = إلغاء
  const d = body.action === "unpaid" ? await markDesignPaid(id, null)
    : await markDesignPaid(id, { plan: plan.kind, amount: Number.isFinite(amount) ? amount : plan.price, months: plan.months, by: g.u, ref: typeof body.ref === "string" ? body.ref.slice(0, 80) : undefined, coupon: rc?.code });
  if (d && rc) await useCoupon(rc.code);
  if (!d) return json({ error: "غير موجود" }, 404);
  const { data: _x, ...meta } = d;
  return json({ design: meta });
}
