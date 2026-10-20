// المالية: الإيراد الفعلي من المدفوعات، والتكاليف من عدد العمليات الفعلي × سعر الوحدة، والمصاريف الثابتة لهذا التطبيق وحده.
// كل سعر قابل للتعديل من متغيرات البيئة. الأسعار الافتراضية من صفحات المزودين (أكتوبر 2026)، والدولار = 3.75 ريال.
const APP_KIND: "identity" | "menu" = "menu";
const env = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== "" && process.env[k] !== undefined ? v : d; };

export interface UnitCost { metric: string; label: string; unit: number; source: string; estimate?: boolean; only?: "identity" | "menu" }
export const UNIT_COSTS: UnitCost[] = ([
  { metric: "ai_logo_image", label: "شعار متجهي (Recraft V3 Vector)", unit: env("COST_AI_LOGO_SAR", 0.3), source: "0.08$ للصورة" },
  { metric: "dish_photo", label: "صورة طبق (Recraft V3 Raster)", unit: env("COST_DISH_PHOTO_SAR", 0.15), source: "0.04$ للصورة", only: "menu" },
  { metric: "ai_identity", label: "توليد هوية (Gemini Flash)", unit: env("COST_AI_IDENTITY_SAR", 0.05), source: "≈ 4 آلاف رمز للعملية", estimate: true, only: "identity" },
  { metric: "menu_ai", label: "اقتراحات وترجمة المنيو (Gemini Flash)", unit: env("COST_MENU_AI_SAR", 0.05), source: "≈ 4 آلاف رمز للعملية", estimate: true, only: "menu" },
  { metric: "name_check", label: "فحص الاسم (Gemini Flash)", unit: env("COST_NAME_CHECK_SAR", 0.02), source: "≈ 1.5 ألف رمز للعملية", estimate: true },
  { metric: "otp_sms", label: "رمز دخول برسالة جوال", unit: env("COST_SMS_SAR", 0.73), source: "Twilio للسعودية 0.1949$" },
  { metric: "otp_email", label: "رمز دخول بالبريد", unit: env("COST_EMAIL_SAR", 0), source: "ضمن اشتراك Resend الثابت" },
] as UnitCost[]).filter((u) => !u.only || u.only === APP_KIND);

/** رسوم بوابة الدفع: نسبة مرجّحة (مدى 70% بـ 1%، بطاقات 30% بـ 2.5%) + رسم ثابت لكل عملية — تقديري حتى عرض السعر */
export const GATEWAY = { pct: env("GATEWAY_PCT", 1.45) / 100, fixed: env("GATEWAY_FIXED_SAR", 1) };

/** المصاريف الثابتة لهذا التطبيق وحده (شهرياً بالريال). المشترك بين التطبيقين محسوب بالنص */
export interface FixedCost { label: string; monthly: number; note: string; estimate?: boolean }
export function fixedCosts(): FixedCost[] {
  const list: FixedCost[] = [
    { label: "Vercel Pro (نصف اشتراك الفريق)", monthly: env("FIXED_VERCEL_SAR", 37.5), note: "20$ شهرياً للتطبيقين" },
    { label: "Resend Pro لرموز البريد (النصف)", monthly: env("FIXED_EMAIL_SAR", 37.5), note: "20$ شهرياً للتطبيقين" },
    { label: "Upstash Redis", monthly: env("FIXED_REDIS_SAR", APP_KIND === "menu" ? 37.5 : 0), note: APP_KIND === "menu" ? "10$ لزيارات المنيو" : "ضمن المجاني", estimate: APP_KIND === "menu" },
    { label: "السجل والغرفة والنطاق (النصف ÷ 12)", monthly: env("FIXED_LEGAL_SAR", (100 + 50 + 45) / 12), note: "200 + 100 سنوياً للتطبيقين، والنطاق 45", estimate: true },
  ];
  return list.filter((f) => f.monthly > 0 || f.label.startsWith("Upstash"));
}
export const ZAKAT_RATE = env("ZAKAT_RATE", 2.5) / 100;
export const FIN_METRICS = ["revenue", "revenue_once", "revenue_monthly", "payment", "payment_once", "payment_monthly", ...UNIT_COSTS.map((u) => u.metric)];

export function computeFinance(totals: Record<string, number>, days: number) {
  const months = days / 30.44;
  const revenue = totals.revenue ?? 0;
  const once = totals.revenue_once ?? 0, monthly = totals.revenue_monthly ?? 0;
  const variable = UNIT_COSTS.map((u) => ({ ...u, qty: totals[u.metric] ?? 0, amount: (totals[u.metric] ?? 0) * u.unit })).filter((u) => u.qty > 0 || u.unit > 0);
  const payments = totals.payment ?? 0;
  const gateway = { qty: payments, amount: payments * GATEWAY.fixed + revenue * GATEWAY.pct };
  const fixed = fixedCosts().map((f) => ({ ...f, amount: f.monthly * months }));
  const varTotal = variable.reduce((a, b) => a + b.amount, 0) + gateway.amount;
  const fixedTotal = fixed.reduce((a, b) => a + b.amount, 0);
  const pre = revenue - varTotal - fixedTotal;
  const zakat = Math.max(0, pre) * ZAKAT_RATE;
  const costs = varTotal + fixedTotal + zakat;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    days, revenue: r2(revenue), revenueOnce: r2(once), revenueMonthly: r2(monthly), revenueOther: r2(Math.max(0, revenue - once - monthly)),
    payments, paymentsOnce: totals.payment_once ?? 0, paymentsMonthly: totals.payment_monthly ?? 0,
    variable: variable.map((v) => ({ ...v, amount: r2(v.amount) })), gateway: { ...gateway, amount: r2(gateway.amount), pct: GATEWAY.pct, fixed: GATEWAY.fixed },
    fixed: fixed.map((f) => ({ ...f, amount: r2(f.amount) })), varTotal: r2(varTotal), fixedTotal: r2(fixedTotal), zakat: r2(zakat), zakatRate: ZAKAT_RATE,
    costs: r2(costs), net: r2(pre - zakat), margin: revenue ? (pre - zakat) / revenue : 0,
  };
}
