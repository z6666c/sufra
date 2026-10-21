import { activeGateway, gatewaySetting, listGateways, setActiveGateway } from "@/lib/payments";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  return json({ gateways: listGateways(), active: (await activeGateway())?.id ?? null, setting: await gatewaySetting() });
}

/** اختيار البوابة المفعّلة أو إيقاف الدفع الإلكتروني ("off") */
export async function PUT(req: Request) {
  const g = await requireAdmin(req, "pricing");
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  try {
    await setActiveGateway(String(b.active ?? ""));
    return json({ gateways: listGateways(), active: (await activeGateway())?.id ?? null, setting: await gatewaySetting() });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
