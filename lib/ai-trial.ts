// أداة ذكاء اصطناعي تجريبية لتوليد أفكار شعارات كصور (للاستلهام فقط — ليست ملفات نهائية)
// تستخدم Pollinations.ai المجانية بلا مفتاح. للإنتاج استبدلها بـ Recraft (SVG متجهي) عبر الخادم.

const INDUSTRY_EN: Record<string, string> = {
  tech: "technology", realestate: "real estate", food: "food and beverage", ecommerce: "online store", finance: "finance",
  health: "healthcare", education: "education", beauty: "beauty and cosmetics", logistics: "logistics and shipping", other: "business",
  cafe: "specialty coffee shop", restaurant: "restaurant", burger: "burger restaurant", bakery: "bakery", juice: "juice bar", seafood: "seafood restaurant",
};
const STYLE_EN: Record<string, string> = {
  minimal: "minimalist", geometric: "bold geometric", islamic: "modern islamic geometric pattern inspired", tech3d: "modern tech with subtle depth",
  modern: "modern", classic: "classic heritage", playful: "playful friendly", luxury: "luxury elegant",
};
const VARIANTS = [
  "abstract symbol", "lettermark monogram", "emblem badge", "negative space icon", "line art icon", "mascot-free pictorial mark",
];

export interface AiTrialInput { name: string; nameEn?: string; industry: string; sub?: string; style?: string; colors: string[] }

export function aiTrialPrompt(i: AiTrialInput, variant: number): string {
  const what = INDUSTRY_EN[i.sub ?? ""] ?? INDUSTRY_EN[i.industry] ?? i.industry;
  const brand = i.nameEn?.trim() || i.name;
  return [
    `${STYLE_EN[i.style ?? ""] ?? "modern"} flat vector logo, ${VARIANTS[variant % VARIANTS.length]}`,
    `for a ${what} brand called "${brand}"`,
    `color palette ${i.colors.join(", ")}`,
    "centered on plain white background, simple shapes, high contrast, professional brand identity, no mockup, no extra text",
  ].join(", ");
}

export function aiTrialUrls(i: AiTrialInput, seed: number, n = 4, size = 512): { url: string; prompt: string }[] {
  return Array.from({ length: n }, (_, k) => {
    const prompt = aiTrialPrompt(i, seed + k);
    const q = new URLSearchParams({ width: String(size), height: String(size), seed: String((seed + k * 101) % 1_000_000), nologo: "true", model: "flux" });
    return { prompt, url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${q}` };
  });
}

export const AI_TRIAL_NOTE = "تجريبي: صور نقطية للاستلهام فقط، قد تحتوي أخطاء في الحروف، وليست ملفات طباعة نهائية. المزود: Pollinations.ai (مجاني بدون مفتاح).";
