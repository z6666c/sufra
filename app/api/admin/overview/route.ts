import { listAllDesigns, listCustomers, statsSeries } from "@/lib/customers";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

// تكلفة تقديرية بالريال لكل عملية ذكاء اصطناعي (قابلة للتعديل من البيئة)
const COST = {
  ai_logo_image: Number(process.env.COST_AI_LOGO_SAR || 0.3),
  ai_identity: Number(process.env.COST_AI_IDENTITY_SAR || 0.05),
  name_check: Number(process.env.COST_NAME_CHECK_SAR || 0.02),
  menu_ai: Number(process.env.COST_MENU_AI_SAR || 0.05),
  dish_photo: Number(process.env.COST_DISH_PHOTO_SAR || 0.15),
};

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const metrics = ["signup", "login", "design_new", "design_save", "ai_logos", "ai_logo_image", "ai_identity", "name_check", "menu_ai", "dish_photo", "publish", "otp_email", "otp_sms"];
  const [customers, designs, series] = await Promise.all([listCustomers(1000), listAllDesigns(1000), statsSeries(metrics, 30)]);
  const now = Date.now(), week = 7 * 86_400_000;
  const sum = (m: string) => (series.series[m] ?? []).reduce((a, b) => a + b, 0);
  const aiCost30 = Object.entries(COST).reduce((a, [m, c]) => a + sum(m) * c, 0);
  return json({
    kpis: {
      customers: customers.length,
      paid: customers.filter((c) => c.status === "paid").length,
      trial: customers.filter((c) => c.status === "trial").length,
      signups7: customers.filter((c) => now - c.createdAt < week).length,
      designs: designs.length,
      expiring7: designs.filter((d) => d.expiresAt && d.expiresAt - now < week).length,
      aiCost30: Math.round(aiCost30 * 100) / 100,
    },
    series,
    totals: Object.fromEntries(metrics.map((m) => [m, sum(m)])),
    cost: COST,
  });
}
