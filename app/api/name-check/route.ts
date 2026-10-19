import { NextResponse } from "next/server";
import { stat } from "@/lib/customers";
import { aiNameSearch, checkDotCom, officialLinks, type NameCheckResult } from "@/lib/name-check";

export const runtime = "nodejs";
export const maxDuration = 60;

// حد بسيط لكل IP (البحث المؤرض له حصة مجانية شهرية)
const hits = new Map<string, { n: number; t: number }>();
const WINDOW = 60 * 60_000, LIMIT = 15;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now(), h = hits.get(ip);
  if (h && now - h.t < WINDOW && h.n >= LIMIT) return NextResponse.json({ error: "وصلت للحد المسموح من الفحوصات، حاول بعد ساعة" }, { status: 429 });
  hits.set(ip, h && now - h.t < WINDOW ? { n: h.n + 1, t: h.t } : { n: 1, t: now });

  let body: { name?: string; nameEn?: string; activity?: string; city?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (name.length < 2) return NextResponse.json({ error: "اكتب الاسم أولاً" }, { status: 400 });
  const input = { name, nameEn: String(body.nameEn ?? "").trim().slice(0, 60) || undefined, activity: String(body.activity ?? "نشاط تجاري").slice(0, 60), city: body.city ? String(body.city).slice(0, 40) : undefined };

  const [domain, ai] = await Promise.all([
    checkDotCom(input.nameEn),
    process.env.GEMINI_API_KEY ? aiNameSearch(input, AbortSignal.timeout(50_000)).catch((e) => { console.error("[name-check]", e instanceof Error ? e.message : e); return null; }) : Promise.resolve(null),
  ]);
  if (ai) await stat("name_check");
  const result: NameCheckResult = {
    verdict: ai?.verdict ?? "unknown",
    summary: ai?.summary || (process.env.GEMINI_API_KEY ? "تعذر إكمال البحث الآلي الآن؛ استخدم الروابط أدناه للتحقق." : "البحث الآلي غير مفعّل (أضف GEMINI_API_KEY). استخدم الروابط أدناه للتحقق يدوياً."),
    sameField: ai?.sameField ?? [], otherFields: ai?.otherFields ?? [], suggestions: ai?.suggestions ?? [], sources: ai?.sources ?? [],
    domain, links: officialLinks(input), ai: !!ai,
  };
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
