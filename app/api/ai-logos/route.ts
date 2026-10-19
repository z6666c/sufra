import { NextResponse } from "next/server";
import type { IntakeInput, Palette } from "@/lib/types";
import { aiLogoProvider, generateAiLogos } from "@/lib/ai-logo";
import { sessionFromRequest } from "@/lib/auth";
import { clientIp, demoAiAllowed, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (!aiLogoProvider()) return NextResponse.json({ error: "NO_KEY" }, { status: 501 });
  if (session.r === "demo" && !demoAiAllowed()) return NextResponse.json({ error: "DEMO" }, { status: 403 });
  // الديمو: 3 دفعات بالساعة لكل زائر، الإدارة: 40
  const ok = session.r === "admin" ? rateLimit(`ai-logos:admin:${session.u}`, 40) : rateLimit(`ai-logos:${clientIp(req)}`, Number(process.env.DEMO_AI_LOGOS_PER_HOUR || 3));
  if (!ok) return NextResponse.json({ error: "وصلت للحد المسموح من توليد الشعارات بالذكاء الاصطناعي، حاول بعد ساعة" }, { status: 429 });

  let body: { input?: IntakeInput; palette?: Palette; count?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  if (!body.input?.brandName?.trim() || !body.palette?.primary?.hex) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const count = Math.max(1, Math.min(6, Number(body.count) || 4));
  try {
    const { provider, concepts } = await generateAiLogos({ input: body.input, palette: body.palette, count }, AbortSignal.timeout(85_000));
    if (!concepts.length) return NextResponse.json({ error: "لم يرجع الذكاء الاصطناعي شعارات صالحة، جرّب مرة أخرى" }, { status: 502 });
    return NextResponse.json({ provider, concepts });
  } catch (e) {
    console.error("[ai-logos]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "تعذر الاتصال بمولّد الشعارات" }, { status: 502 });
  }
}
