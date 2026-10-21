import { startCheckout } from "@/lib/payments";
import { json, requireCustomer } from "@/lib/api-guard";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** العميل يضغط «ادفع الآن»: ننشئ صفحة الدفع عند البوابة ونرجع رابطها */
export async function POST(req: Request) {
  const c = await requireCustomer(req);
  if (c instanceof Response) return c;
  if (!rateLimit(`checkout:${c.id}:${clientIp(req)}`, 15)) return json({ error: "محاولات كثيرة، حاول بعد شوي" }, 429);
  const b = await req.json().catch(() => ({}));
  try {
    const co = await startCheckout({ customer: c, designId: String(b.designId ?? ""), plan: b.plan === "monthly" ? "monthly" : "once", coupon: b.coupon ? String(b.coupon) : undefined, origin: new URL(req.url).origin });
    return json({ url: co.url, amount: co.amount });
  } catch (e) {
    const m = (e as Error).message;
    if (m === "NO_GATEWAY") return json({ error: "الدفع الإلكتروني غير مفعّل حالياً، استخدم طرق السداد الأخرى" }, 503);
    console.error("[pay] checkout", m);
    return json({ error: /^\d{3}:/.test(m) ? "تعذر فتح صفحة الدفع، حاول مرة ثانية" : m }, 400);
  }
}
