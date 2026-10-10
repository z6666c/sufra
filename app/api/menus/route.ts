import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import type { MenuDoc } from "@/lib/types";
import { saveMenu } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 900_000; // الصور تُضغط في المتصفح قبل الإرسال

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (session.r === "demo") return NextResponse.json({ error: "نشر المنيو غير متاح في حساب الديمو — جرّب كل شيء آخر، والنشر متاح لحساب الإدارة" }, { status: 403 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "حجم المنيو كبير جداً؛ قلّل عدد الصور أو حجمها" }, { status: 413 });
  let body: { doc?: MenuDoc; slug?: string; editKey?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!body.doc?.venue?.name || !Array.isArray(body.doc.categories)) return NextResponse.json({ error: "بيانات المنيو ناقصة" }, { status: 400 });
  try {
    const { slug, editKey } = await saveMenu(body.doc, body.slug, body.editKey);
    const origin = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
    return NextResponse.json({ slug, editKey, url: `${origin}/m/${slug}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "مفتاح التعديل غير صحيح" }, { status: 403 });
    console.error("[menus]", msg);
    return NextResponse.json({ error: "تعذر حفظ المنيو" }, { status: 500 });
  }
}
