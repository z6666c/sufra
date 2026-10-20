import { json, requireAdmin } from "@/lib/api-guard";
import { UNIT_COSTS } from "@/lib/finance";

export const runtime = "nodejs";
export const maxDuration = 30;

type Check = { name: string; ok: boolean; detail: string; balance?: string };

/** فحص مفاتيح أدوات الذكاء بدون استهلاك رصيد: قراءة بيانات النموذج من Gemini ورصيد الحساب من Recraft */
export async function GET(req: Request) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  const out: Check[] = [];
  const gk = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!gk) out.push({ name: "Gemini", ok: false, detail: "المفتاح GEMINI_API_KEY غير مضاف" });
  else {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": gk }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      out.push(r.ok ? { name: "Gemini", ok: true, detail: `يعمل · النموذج ${j.displayName || model}` } : { name: "Gemini", ok: false, detail: `رفض المفتاح أو النموذج (${r.status}): ${String(j?.error?.message ?? "").slice(0, 140)}` });
    } catch (e) { out.push({ name: "Gemini", ok: false, detail: "تعذر الاتصال: " + (e as Error).message }); }
  }
  const rk = process.env.RECRAFT_API_KEY;
  if (!rk) out.push({ name: "Recraft", ok: false, detail: "المفتاح RECRAFT_API_KEY غير مضاف — تُستخدم شعارات المحرك المجاني و Gemini بدلاً منه" });
  else {
    try {
      const r = await fetch("https://external.api.recraft.ai/v1/users/me", { headers: { Authorization: `Bearer ${rk}` }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) out.push({ name: "Recraft", ok: false, detail: `رفض المفتاح (${r.status})` });
      else {
        const units = Number(j.credits ?? j.balance ?? j.units ?? NaN);
        const logo = UNIT_COSTS.find((u) => u.metric === "ai_logo_image")?.unit ?? 0.3;
        const usd = units / 1000;
        out.push({
          name: "Recraft", ok: Number.isFinite(units) ? units > 80 : true, detail: Number.isFinite(units) && units <= 80 ? "يعمل لكن الرصيد شبه منتهي — اشحن من حسابك في Recraft" : "يعمل",
          balance: Number.isFinite(units) ? `${units.toLocaleString("en")} وحدة ≈ ${usd.toFixed(2)}$ ≈ ${Math.floor(units / 80).toLocaleString("en")} شعار متجهي (${(usd * 3.75).toFixed(0)} ر.س · ${logo} ر.س للشعار)` : undefined,
        });
      }
    } catch (e) { out.push({ name: "Recraft", ok: false, detail: "تعذر الاتصال: " + (e as Error).message }); }
  }
  return json({ checks: out, at: Date.now() });
}
