// توليد صورة طبق واقعية عبر Recraft (اختياري) — تُعاد كـ data URL ليضغطها المتصفح ويحفظها مع المنيو
import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (session.r === "demo") return NextResponse.json({ error: "توليد صور الأطباق غير متاح في حساب الديمو" }, { status: 403 });
  const key = process.env.RECRAFT_API_KEY;
  if (!key) return NextResponse.json({ error: "NO_KEY" }, { status: 501 });
  const { name, nameEn, desc, venueType } = (await req.json()) as { name: string; nameEn?: string; desc?: string; venueType?: string };
  if (!name) return NextResponse.json({ error: "اسم الصنف مطلوب" }, { status: 400 });

  const prompt = [
    `Appetizing professional food photography of ${nameEn || name}`,
    desc ? `(${desc})` : "",
    `served as in a Saudi ${venueType || "restaurant"}, top-down 45 degree angle, natural window light, clean ceramic plate on a neutral surface, shallow depth of field, no text, no logos, no hands`,
  ].join(" ");

  const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style: "realistic_image", model: process.env.RECRAFT_MODEL || "recraftv3", size: "1024x1024", n: 1 }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) return NextResponse.json({ error: `Recraft ${res.status}: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
  const data = await res.json();
  const url: string | undefined = data?.data?.[0]?.url;
  if (!url) return NextResponse.json({ error: "لم تُرجع الخدمة صورة" }, { status: 502 });
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const type = img.headers.get("content-type") || "image/webp";
  return NextResponse.json({ dataUrl: `data:${type};base64,${buf.toString("base64")}` });
}
