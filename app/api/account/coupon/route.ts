import { couponLabel, quoteCoupon } from "@/lib/pricing";
import { kvAvailable } from "@/lib/kv";
import { json, noKv } from "@/lib/api-guard";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** يتحقق من كود الخصم للباقة ويعيد السعر بعد الخصم */
export async function POST(req: Request) {
  if (!kvAvailable()) return noKv();
  if (!rateLimit(`coupon:${clientIp(req)}`, 20)) return json({ error: "محاولات كثيرة، حاول بعد ساعة" }, 429);
  const b = await req.json().catch(() => ({}));
  const q = await quoteCoupon(String(b.code ?? ""), b.plan === "monthly" ? "monthly" : "once");
  if (!q.ok) return json({ error: q.error }, 400);
  return json({ code: q.coupon.code, label: couponLabel(q.coupon), base: q.base, price: q.price });
}
