// الباقات: اشتراك شهري أو شراء مرة واحدة (الأسعار من البيئة دون تغيير الكود)
export type PlanKind = "once" | "monthly";
export interface Plan { kind: PlanKind; name: string; price: number; currency: string; period: string; months?: number; includes: string[] }

const CUR = "ر.س";
const COMMON = [
  "نشر المنيو الرقمي برابط ورمز QR وتعديل الأسعار والأصناف بلا حدود",
  "المنيو المطبوع PDF جاهز للمطبعة",
  "بطاقة الطاولة برمز QR",
  "5 منشورات سوشيال بهوية مطعمك",
  "شعار وهوية المطعم بكل الملفات",
];
export const PLANS: Record<PlanKind, Plan> = {
  once: {
    kind: "once", name: "شراء مرة واحدة", price: Number(process.env.NEXT_PUBLIC_PRICE_ONCE || 132), currency: CUR, period: "مرة واحدة",
    months: Number(process.env.NEXT_PUBLIC_ONCE_HOSTING_MONTHS || 12),
    includes: [...COMMON, "المنيو منشور سنة كاملة، والتجديد اختياري بنفس السعر"],
  },
  monthly: {
    kind: "monthly", name: "اشتراك شهري", price: Number(process.env.NEXT_PUBLIC_PRICE_MONTHLY || 29), currency: CUR, period: "شهرياً", months: 1,
    includes: [...COMMON, "المنيو منشور طوال الاشتراك", "إلغاء في أي وقت"],
  },
};
export const PREVIEW_NOTE = "المعاينة مجانية بعلامة مائية. النشر والتحميل يُفتحان بعد الدفع.";
export const PLAN = PLANS.once;

/** الأسعار المعدّلة من لوحة التحكم تتقدم على أسعار البيئة */
export type PriceSet = Partial<Record<PlanKind, number>>;
export function withPrices(p?: PriceSet | null): Record<PlanKind, Plan> {
  const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0;
  return {
    once: { ...PLANS.once, price: ok(p?.once) ? p!.once! : PLANS.once.price },
    monthly: { ...PLANS.monthly, price: ok(p?.monthly) ? p!.monthly! : PLANS.monthly.price },
  };
}
