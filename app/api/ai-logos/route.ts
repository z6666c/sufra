import { NextResponse } from "next/server";
import { stat } from "@/lib/customers";
import type { IntakeInput, Palette } from "@/lib/types";
import { aiLogoProvider, generateAiLogos } from "@/lib/ai-logo";
import { sessionFromRequest } from "@/lib/auth";
import { aiLimits, aiTier, limitMessage, TIER_NOTE } from "@/lib/ai-tier";
import { clientIp, demoAiAllowed, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (!aiLogoProvider()) return NextResponse.json({ error: "NO_KEY" }, { status: 501 });
  if (session.r === "demo" && !demoAiAllowed()) return NextResponse.json({ error: "DEMO" }, { status: 403 });
  // الحدود حسب نوع المستخدم: زائر / مسجّل لم يدفع / دافع / إدارة (lib/ai-tier.ts)
  const tier = await aiTier(session);
  const lim = aiLimits(tier);
  const rlKey = tier === "guest" ? `ai-logos:guest:${clientIp(req)}` : `ai-logos:${tier}:${session.u}`;
  if (!rateLimit(rlKey, lim.logoBatches, lim.windowH * 3600_000)) return NextResponse.json({ error: limitMessage(tier), tier }, { status: 429 });

  let body: { input?: IntakeInput; palette?: Palette; count?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  if (!body.input?.brandName?.trim() || !body.palette?.primary?.hex) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const asked = Math.max(1, Math.min(6, Number(body.count) || 4));
  const count = Math.min(asked, lim.logosPerBatch);
  try {
    const { provider, concepts } = await generateAiLogos({ input: body.input, palette: body.palette, count }, AbortSignal.timeout(85_000), { cheap: lim.cheap });
    if (!concepts.length) return NextResponse.json({ error: "لم يرجع الذكاء الاصطناعي شعارات صالحة، جرّب مرة أخرى" }, { status: 502 });
    await stat("ai_logos");
    await stat(provider === "recraft" ? "ai_logo_image" : "ai_identity", provider === "recraft" ? concepts.length : 1);
    return NextResponse.json({ provider, concepts, tier, ...(count < asked && TIER_NOTE[tier] ? { note: TIER_NOTE[tier] } : {}) });
  } catch (e) {
    console.error("[ai-logos]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "تعذر الاتصال بمولّد الشعارات" }, { status: 502 });
  }
}
