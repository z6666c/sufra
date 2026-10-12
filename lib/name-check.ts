// فحص توفر الاسم التجاري: بحث في الويب عن نشاطات بنفس الاسم أو اسم مشابه في السعودية
// يستخدم Gemini مع البحث في Google (Grounding)، وفحص نطاق ‎.com عبر RDAP، وروابط الجهات الرسمية.
// فحص أولي فقط — الحجز الرسمي عبر المركز السعودي للأعمال، والعلامة التجارية عبر الهيئة السعودية للملكية الفكرية.

export type Verdict = "clear" | "similar" | "taken" | "unknown";
export interface NameHit { name: string; activity: string; city?: string; url?: string; note?: string }
export interface NameCheckResult {
  verdict: Verdict;
  summary: string;
  sameField: NameHit[];
  otherFields: NameHit[];
  suggestions: string[];
  sources: { title: string; url: string }[];
  domain?: { name: string; available: boolean | null };
  links: { label: string; url: string }[];
  ai: boolean;
}

export interface NameCheckInput { name: string; nameEn?: string; activity: string; city?: string }

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function officialLinks(i: NameCheckInput) {
  const q = (s: string) => encodeURIComponent(s);
  const n = i.name.trim(), en = i.nameEn?.trim();
  const links = [
    { label: "حجز الاسم التجاري — المركز السعودي للأعمال", url: "https://business.sa" },
    { label: "البحث في العلامات التجارية — الهيئة السعودية للملكية الفكرية", url: "https://www.saip.gov.sa" },
    { label: `بحث Google: «${n}» ${i.activity}`, url: `https://www.google.com/search?q=${q(`"${n}" ${i.activity} السعودية`)}` },
    { label: `خرائط Google: «${n}»`, url: `https://www.google.com/maps/search/${q(`${n} ${i.city ?? "السعودية"}`)}` },
  ];
  if (en) {
    const handle = en.toLowerCase().replace(/[^a-z0-9]+/g, "");
    links.push({ label: `بحث Google: "${en}"`, url: `https://www.google.com/search?q=${q(`"${en}" Saudi ${i.activity}`)}` });
    if (handle) links.push({ label: `إنستقرام @${handle}`, url: `https://www.instagram.com/${handle}/` });
  }
  return links;
}

/** توفر نطاق ‎.com عبر سجل RDAP الرسمي (404 = متاح) */
export async function checkDotCom(nameEn?: string): Promise<{ name: string; available: boolean | null } | undefined> {
  const slug = nameEn?.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!slug || slug.length < 2) return undefined;
  const name = `${slug}.com`;
  try {
    const r = await fetch(`https://rdap.verisign.com/com/v1/domain/${name}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    return { name, available: r.status === 404 ? true : r.ok ? false : null };
  } catch {
    return { name, available: null };
  }
}

function prompt(i: NameCheckInput) {
  return `أنت باحث أسماء تجارية في السعودية. ابحث في الويب عن أي منشأة أو متجر أو علامة تجارية في المملكة العربية السعودية تستخدم الاسم «${i.name}»${i.nameEn ? ` أو «${i.nameEn}»` : ""} أو اسماً مشابهاً جداً (اختلاف حرف، جمع/مفرد، «ال» التعريف، نطق متشابه)${i.city ? `، مع التركيز على ${i.city}` : ""}.
النشاط المقصود: ${i.activity}.
افصل النتائج إلى: (1) نفس النشاط أو نشاط قريب منه، (2) نشاطات أخرى. لا تخترع منشآت؛ اذكر فقط ما وجدته في نتائج البحث مع رابطه.
الحكم: "taken" إذا وجدت منشأة قائمة بنفس الاسم في نفس النشاط، "similar" إذا وجدت اسماً مطابقاً في نشاط آخر أو اسماً مشابهاً جداً في نفس النشاط، "clear" إذا لم تجد شيئاً واضحاً.
اقترح 4 بدائل قريبة من روح الاسم إذا كان الحكم غير "clear".
أعد JSON فقط بدون أي نص آخر، بهذا الشكل:
{"verdict":"clear|similar|taken","summary":"جملتان بالعربية","sameField":[{"name":"","activity":"","city":"","url":"","note":""}],"otherFields":[{"name":"","activity":"","city":"","url":"","note":""}],"suggestions":[""]}`;
}

function parseJson(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("NO_JSON");
  return JSON.parse(m[0]);
}

const clean = (h: unknown): NameHit | null => {
  if (!h || typeof h !== "object") return null;
  const o = h as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 160) : "");
  const url = s("url");
  return s("name") ? { name: s("name"), activity: s("activity"), city: s("city") || undefined, url: /^https?:\/\//.test(url) ? url : undefined, note: s("note") || undefined } : null;
};

export async function aiNameSearch(i: NameCheckInput, signal?: AbortSignal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(i) }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } }),
    signal,
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text: string = cand?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  const j = parseJson(text);
  const chunks: { web?: { uri?: string; title?: string } }[] = cand?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks.map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" })).filter((s) => s.url).slice(0, 8);
  const verdict: Verdict = ["clear", "similar", "taken"].includes(j.verdict) ? j.verdict : "unknown";
  return {
    verdict,
    summary: typeof j.summary === "string" ? j.summary.slice(0, 400) : "",
    sameField: (Array.isArray(j.sameField) ? j.sameField : []).map(clean).filter(Boolean).slice(0, 6) as NameHit[],
    otherFields: (Array.isArray(j.otherFields) ? j.otherFields : []).map(clean).filter(Boolean).slice(0, 6) as NameHit[],
    suggestions: (Array.isArray(j.suggestions) ? j.suggestions : []).filter((x: unknown) => typeof x === "string").slice(0, 4) as string[],
    sources,
  };
}
