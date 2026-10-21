import { sessionFromRequest, GUEST } from "@/lib/auth";
import { DRAFT_DAYS, getCustomer, listDesigns } from "@/lib/customers";
import { kvAvailable, kvKind } from "@/lib/kv";
import { canSend } from "@/lib/otp";
import { json } from "@/lib/api-guard";
import { getPrices, publicPayMethods } from "@/lib/pricing";
import { publicGateway } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await sessionFromRequest(req);
  const prices = await getPrices().catch(() => undefined);
  const pay = await publicPayMethods().catch(() => undefined);
  const gateway = await publicGateway().catch(() => null);
  const signup = { available: kvAvailable(), email: canSend("email"), phone: canSend("phone"), trialDays: DRAFT_DAYS, draftDays: DRAFT_DAYS, store: kvKind() };
  if (s?.r === "customer" && kvAvailable()) {
    const c = await getCustomer(s.u);
    if (c) return json({ role: "customer", customer: c, designs: await listDesigns(c.id), signup, prices, pay, gateway });
  }
  return json({ role: s?.r ?? null, guest: s?.u === GUEST, username: s?.r === "customer" ? undefined : s?.u, signup, prices, pay, gateway });
}
