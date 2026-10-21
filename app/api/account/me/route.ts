import { sessionFromRequest, GUEST, SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { DRAFT_DAYS, deleteCustomer, getCustomer, getDesign, listDesigns } from "@/lib/customers";
import { deleteMenu } from "@/lib/storage";
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
  return json({ role: s?.r === "customer" ? null : s?.r ?? null, guest: s?.u === GUEST, username: s?.r === "customer" ? undefined : s?.u, signup, prices, pay, gateway });
}

/** حذف حساب العميل وكل تصاميمه نهائياً (شرط متاجر التطبيقات) */
export async function DELETE(req: Request) {
  const s = await sessionFromRequest(req);
  if (s?.r !== "customer" || !kvAvailable()) return json({ error: "سجّل دخولك أولاً" }, 401);
  const c = await getCustomer(s.u);
  if (!c) return json({ error: "الحساب غير موجود" }, 404);
  // سُفرة: إيقاف روابط المنيوهات المنشورة من تصاميم العميل
  for (const d of await listDesigns(c.id)) {
    const full = await getDesign(d.id, c.id);
    const slug = (full?.data as { published?: { slug?: string } } | null)?.published?.slug;
    if (slug) await deleteMenu(slug).catch(() => false);
  }
  await deleteCustomer(c.id);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
