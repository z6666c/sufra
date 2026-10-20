// اقتراح أوصاف عربية وإنجليزية جذابة لأصناف المنيو عبر Gemini (اختياري)
import { NextResponse } from "next/server";
import { stat } from "@/lib/customers";
import { sessionFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, desc: { type: "string" }, nameEn: { type: "string" }, descEn: { type: "string" } },
        required: ["id", "desc", "nameEn", "descEn"],
      },
    },
  },
  required: ["items"],
};

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (session.r === "demo") return NextResponse.json({ error: "سجّل مجاناً بالبريد أو الجوال لاستخدام اقتراحات الذكاء الاصطناعي" }, { status: 403 });
  // حد يومي لكل عميل يحمي رصيد الذكاء (الإدارة مستثناة) — قابل للتعديل من البيئة
  if (session.r === "customer" && !rateLimit(`menu-ai:${session.u}`, Number(process.env.AI_MENU_PER_DAY || 15), 24 * 3600_000))
    return NextResponse.json({ error: "وصلت الحد اليومي لاقتراحات الذكاء، جرّب بكرة" }, { status: 429 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "NO_KEY" }, { status: 501 });
  const { venueName, venueType, items } = (await req.json()) as {
    venueName: string; venueType: string; items: { id: string; name: string; desc?: string }[];
  };
  if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "لا توجد أصناف" }, { status: 400 });
  const prompt = `أنت كاتب محتوى قوائم طعام في مطاعم ومقاهي السعودية. للمنشأة «${venueName}» (نوعها: ${venueType})، اكتب لكل صنف:
- desc: وصفاً عربياً شهياً ودقيقاً (6–12 كلمة)، دون مبالغة ودون ادعاءات صحية.
- nameEn: اسماً إنجليزياً مناسباً للمنيو.
- descEn: ترجمة إنجليزية قصيرة للوصف.
لا تخترع مكونات غير معتادة للصنف. أعد نفس id.
الأصناف: ${JSON.stringify(items.slice(0, 60))}`;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) return NextResponse.json({ error: `Gemini ${res.status}` }, { status: 502 });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  try {
    await stat("menu_ai");
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: "استجابة غير صالحة" }, { status: 502 });
  }
}
