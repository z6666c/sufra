// حدود الذكاء الاصطناعي حسب نوع المستخدم — تحمي الرصيد من الزوار وتعطي الدافعين التوليد الكامل
// زائر: شعاران تجريبيان بـ Gemini (أرخص بكثير من Recraft) · مسجّل لم يدفع: شعاران بالدفعة وحد يومي صغير · دافع: كامل
import type { Session } from "./auth";
import { isPaid, listDesigns } from "./customers";
import { kvAvailable } from "./kv";

export type AiTier = "admin" | "paid" | "unpaid" | "guest";
const n = (k: string, d: number) => { const v = Number(process.env[k]); return process.env[k] && Number.isFinite(v) ? v : d; };

export async function aiTier(s: Session): Promise<AiTier> {
  if (s.r === "admin") return "admin";
  if (s.r !== "customer" || !kvAvailable()) return "guest";
  try { return (await listDesigns(s.u)).some((d) => isPaid(d)) ? "paid" : "unpaid"; } catch { return "unpaid"; }
}

export interface AiLimits {
  /** أقصى عدد شعارات في الدفعة */ logosPerBatch: number;
  /** عدد الدفعات في النافذة */ logoBatches: number;
  /** طول النافذة بالساعات */ windowH: number;
  /** Gemini فقط (بدون Recraft) */ cheap: boolean;
  /** هويات Gemini (الهويات) وصور أطباق واقتراحات منيو (سُفرة) يومياً */ identities: number; dish: number; menu: number;
}
export function aiLimits(t: AiTier): AiLimits {
  switch (t) {
    case "admin": return { logosPerBatch: 6, logoBatches: 40, windowH: 1, cheap: false, identities: 100, dish: 1000, menu: 1000 };
    case "paid": return { logosPerBatch: 6, logoBatches: n("AI_LOGOS_PAID_PER_DAY", 20), windowH: 24, cheap: false, identities: n("AI_IDENTITIES_PAID_PER_DAY", 30), dish: n("AI_DISH_PER_DAY", 20), menu: n("AI_MENU_PER_DAY", 15) };
    case "unpaid": return { logosPerBatch: 2, logoBatches: n("AI_LOGOS_UNPAID_PER_DAY", 3), windowH: 24, cheap: false, identities: n("AI_IDENTITIES_UNPAID_PER_DAY", 5), dish: n("AI_DISH_UNPAID_PER_DAY", 3), menu: n("AI_MENU_UNPAID_PER_DAY", 5) };
    default: return { logosPerBatch: 2, logoBatches: n("DEMO_AI_LOGOS_PER_HOUR", 2), windowH: 1, cheap: true, identities: n("DEMO_AI_IDENTITIES_PER_HOUR", 3), dish: 0, menu: 0 };
  }
}

export const TIER_NOTE: Record<AiTier, string> = {
  admin: "",
  paid: "",
  unpaid: "رسمنا لك شعارين تجريبيين بالذكاء الاصطناعي. بعد اختيار باقتك يُفتح التوليد الكامل (حتى 6 شعارات بالدفعة).",
  guest: "رسمنا لك شعارين تجريبيين. سجّل واختر باقتك لتوليد شعارات متجهية احترافية أكثر.",
};
export const limitMessage = (t: AiTier) =>
  t === "guest" ? "وصلت حد الزائر للرسم بالذكاء الاصطناعي هذه الساعة. سجّل واختر باقتك للتوليد الكامل، أو استخدم شعارات المحرك المجانية."
  : t === "unpaid" ? "وصلت الحد اليومي للتجربة. اختر باقتك لفتح التوليد الكامل، أو استخدم شعارات المحرك المجانية."
  : "وصلت الحد اليومي للتوليد، جرّب بكرة.";
