import { confirmByRef } from "@/lib/payments";
import { json } from "@/lib/api-guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ gateway: string }> };

/** إشعار البوابة بعد الدفع — نأخذ رقم العملية فقط ونتأكد من حالتها بالمفتاح السري */
export async function POST(req: Request, { params }: Ctx) {
  const gateway = (await params).gateway;
  const b = await req.json().catch(() => ({}));
  const ref = String(b?.id ?? b?.data?.id ?? b?.invoice?.id ?? b?.invoice_id ?? "");
  try {
    const r = await confirmByRef(gateway, ref);
    return json({ ok: true, state: r.state });
  } catch (e) {
    console.error("[pay] webhook", gateway, (e as Error).message);
    return json({ ok: false }, 500); // البوابة تعيد المحاولة
  }
}
