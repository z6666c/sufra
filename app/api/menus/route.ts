import { NextResponse } from "next/server";
import { getDesign, isPaid, stat } from "@/lib/customers";
import { kvAvailable } from "@/lib/kv";
import { getPlans } from "@/lib/pricing";
import { sessionFromRequest } from "@/lib/auth";
import type { MenuDoc } from "@/lib/types";
import { saveMenu } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 900_000; // الصور تُضغط في المتصفح قبل الإرسال

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (session.r === "demo") return NextResponse.json({ error: "سجّل بالبريد أو الجوال واختر باقتك لنشر المنيو" }, { status: 403 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "حجم المنيو كبير جداً؛ قلّل عدد الصور أو حجمها" }, { status: 413 });
  let body: { doc?: MenuDoc; slug?: string; editKey?: string; designId?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!body.doc?.venue?.name || !Array.isArray(body.doc.categories)) return NextResponse.json({ error: "بيانات المنيو ناقصة" }, { status: 400 });
  // النشر للعميل يتطلب أن يكون منيوه المحفوظ مدفوعاً (الإدارة مستثناة)
  if (session.r === "customer" && kvAvailable()) {
    const d = body.designId ? await getDesign(body.designId, session.u) : null;
    const PLANS = await getPlans();
    if (!d || !isPaid(d)) return NextResponse.json({ error: `النشر يُفتح بعد الدفع (${PLANS.monthly.price} ${PLANS.monthly.currency} شهرياً أو ${PLANS.once.price} مرة واحدة)`, code: "PAYMENT_REQUIRED" }, { status: 402 });
  }
  try {
    const { slug, editKey } = await saveMenu(body.doc, body.slug, body.editKey);
    const origin = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
    await stat("publish");
    return NextResponse.json({ slug, editKey, url: `${origin}/m/${slug}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "مفتاح التعديل غير صحيح" }, { status: 403 });
    console.error("[menus]", msg);
    return NextResponse.json({ error: "تعذر حفظ المنيو" }, { status: 500 });
  }
}
