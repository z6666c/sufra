import { isPaid, listAllDesigns, statsSeries } from "@/lib/customers";
import { FIN_METRICS, computeFinance } from "@/lib/finance";
import { getPlans } from "@/lib/pricing";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

/** المالية الفعلية لهذا التطبيق وحده — للمالك فقط */
export async function GET(req: Request) {
  const PLANS = await getPlans();
  const g = await requireAdmin(req, "finance");
  if (g instanceof Response) return g;
  const days = [30, 90, 365].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 30;
  const [s, designs] = await Promise.all([statsSeries(FIN_METRICS, days), listAllDesigns(2000)]);
  const totals = Object.fromEntries(FIN_METRICS.map((m) => [m, (s.series[m] ?? []).reduce((a, b) => a + b, 0)]));
  const fin = computeFinance(totals, days);
  const active = designs.filter((d) => isPaid(d));
  const subs = active.filter((d) => d.paid?.plan === "monthly").length;
  const paidCustomers = new Set(active.map((d) => d.customerId)).size;
  return json({
    ...fin,
    series: { days: s.days, revenue: s.series.revenue ?? [] },
    snapshot: { paidCustomers, activeOnce: active.length - subs, subscribers: subs, mrr: subs * PLANS.monthly.price },
    perCustomer: { revenue: paidCustomers ? fin.revenue / paidCustomers : 0, cost: paidCustomers ? fin.costs / paidCustomers : 0 },
    plans: { once: PLANS.once.price, monthly: PLANS.monthly.price },
  });
}
