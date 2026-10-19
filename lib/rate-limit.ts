// حد استخدام بسيط في الذاكرة لكل مفتاح (IP أو مستخدم) — يكفي لخادم واحد/Serverless بحمل خفيف
const buckets = new Map<string, { n: number; t: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60 * 60_000): boolean {
  const now = Date.now(), b = buckets.get(key);
  if (!b || now - b.t >= windowMs) { buckets.set(key, { n: 1, t: now }); return true; }
  if (b.n >= limit) return false;
  b.n++;
  return true;
}

export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
/** هل يسمح للديمو باستخدام الذكاء المدفوع؟ (افتراضياً نعم بحدود) */
export const demoAiAllowed = () => process.env.DEMO_AI !== "false";
