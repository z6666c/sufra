// توليد الشعارات مباشرة بالذكاء الاصطناعي (الخادم فقط)
// - Recraft (متجهي SVG حقيقي) عند ضبط RECRAFT_API_KEY
// - وإلا Gemini يرسم SVG مباشرة عند ضبط GEMINI_API_KEY
// الوصف يُبنى من: الاسم ومعناه، النشاط، القيم، النمط، الألوان، نوع الشعار، والعناصر المفضلة/الممنوعة
import type { IntakeInput, LogoConcept, LogoKind, Palette } from "./types";
import { readMeaning } from "./logo/name-motifs";
import { readName } from "./logo/name-families";

const INDUSTRY_EN: Record<string, string> = {
  tech: "technology company", realestate: "real estate developer", food: "restaurant / food brand", ecommerce: "online store", finance: "financial services",
  health: "healthcare clinic", education: "education / training", beauty: "beauty & cosmetics", logistics: "logistics & shipping", other: "business",
  cafe: "specialty coffee shop", restaurant: "Arabic restaurant", burger: "burger restaurant", bakery: "bakery & sweets", juice: "juice bar", seafood: "seafood restaurant",
};
const STYLE_EN: Record<string, string> = {
  minimal: "minimalist, generous negative space, very few shapes",
  geometric: "bold geometric construction, precise grid-based shapes",
  islamic: "contemporary Islamic geometric pattern influence, star and arabesque geometry, refined",
  tech3d: "modern tech feel, subtle depth through layered flat facets",
};
const VALUE_EN: Record<string, string> = {
  luxury: "luxurious and premium", modern: "modern", simple: "simple and clear", playful: "friendly and playful", trust: "trustworthy and solid", authentic: "authentic, rooted in Saudi heritage",
};
const IDEA_EN: Record<string, string> = {
  flower: "a flower", palm: "a palm tree", falcon: "a falcon", mountain: "a mountain peak", sun: "the sun", crescent: "a crescent moon", spark: "a star",
  tree: "a tree", leafpair: "leaves", crown: "a crown", key: "a key", arch: "an arched doorway", tower: "a tower", cloud: "a cloud", heart: "a heart",
  anchor: "an anchor", waves: "sea waves", diamond: "a gem", shield: "a shield", book: "a book", comb: "honeycomb", flame: "a flame", drop: "a water drop",
  chevrons: "speed arrows", route: "a winding road", wheat: "wheat", bean: "a coffee bean",
};
const KIND_EN: Record<LogoKind, string> = {
  symbol: "an abstract symbol logo mark",
  pictorial: "a pictorial icon logo mark",
  lettermark: "a lettermark logo built from the initial letter(s)",
  combo: "a combination mark merging the initial letter with a meaningful symbol",
  emblem: "an emblem / badge logo inside a circular or shield frame",
};
const KIND_AR: Record<LogoKind, string> = { symbol: "رمز مجرد", pictorial: "رمز تصويري", lettermark: "حرف / مونوغرام", combo: "رمز + حرف", emblem: "ختم / شارة" };

export interface AiLogoRequest { input: IntakeInput; palette: Palette; count?: number }

const hexRgb = (h: string) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** يقرر أنواع الشعارات المطلوبة في الدفعة حسب اختيار العميل */
export function planKinds(input: IntakeInput, count: number): LogoKind[] {
  const chosen = input.logoTypes?.length ? input.logoTypes : (["pictorial", "symbol", "combo", "lettermark"] as LogoKind[]);
  return Array.from({ length: count }, (_, i) => chosen[i % chosen.length]);
}

/** وصف إنجليزي دقيق للشعار (Recraft يفهم الإنجليزية أفضل) */
export function buildLogoPrompt(input: IntakeInput, kind: LogoKind): string {
  const ctx = readName(input.brandName, input.brandNameEn, input.industry, input.industryOther);
  const meanings = readMeaning(input.brandName, input.brandNameEn).map((m) => IDEA_EN[m.motif]).filter(Boolean);
  const field = INDUSTRY_EN[input.industryOther ?? ""] ?? INDUSTRY_EN[input.industry] ?? input.industryOther ?? "business";
  const brand = input.brandNameEn?.trim() || input.brandName;
  const letter = kind === "lettermark" || kind === "combo" ? (ctx.initialEn ?? ctx.initialAr) : undefined;
  return [
    `${KIND_EN[kind]} for "${brand}", a ${field} in Saudi Arabia`,
    meanings.length ? `the name means ${meanings.join(" and ")}, express this meaning in the symbol` : "",
    letter ? `use the letter "${letter}" as the core shape` : "",
    `personality: ${input.brandValues.map((v) => VALUE_EN[v] ?? v).join(", ") || "modern"}`,
    `style: ${STYLE_EN[input.visualStyle] ?? "modern"}`,
    input.likes?.trim() ? `include: ${input.likes.trim()}` : "",
    input.targetAudience?.trim() ? `audience: ${input.targetAudience.trim()}` : "",
    "flat vector, clean scalable shapes, works at 16px favicon size, centered on plain white background, professional brand identity",
    letter ? "no other text" : "no text, no letters, no words",
  ].filter(Boolean).join(". ");
}

function negativePrompt(input: IntakeInput) {
  return ["text", "words", "watermark", "mockup", "photo", "3d render", "gradient mesh", "clutter", "clipart cliche", input.avoid?.trim() ?? ""].filter(Boolean).join(", ");
}

// ── تنظيف SVG ────────────────────────────────────────────────
const TAGS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "use", "text", "tspan"]);
const ATTRS = new Set([
  "d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity",
  "transform", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "viewbox", "id", "offset", "stop-color", "stop-opacity",
  "gradientunits", "gradienttransform", "clip-path", "mask", "href", "xlink:href", "text-anchor", "font-size", "font-weight", "dominant-baseline", "letter-spacing",
  "maskunits", "clippathunits", "spreadmethod", "fx", "fy", "style", "preserveaspectratio",
]);
const WHITE = /^(#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i;

export function sanitizeSvg(raw: string): { markup: string; viewBox: string } | null {
  if (!raw || raw.length > 600_000) return null;
  let s = raw.replace(/<\?xml[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|foreignObject|image|a|iframe|metadata|title|desc)\b[\s\S]*?<\/\1>/gi, "").replace(/<(script|image|a|iframe)\b[^>]*\/>/gi, "");
  const root = s.match(/<svg\b([^>]*)>/i);
  if (!root) return null;
  const vbm = root[1].match(/viewBox\s*=\s*["']([\d.\-\s,]+)["']/i);
  let viewBox = vbm?.[1].trim().replace(/,/g, " ");
  if (!viewBox) {
    const w = root[1].match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1], h = root[1].match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1];
    viewBox = w && h ? `0 0 ${w} ${h}` : "0 0 100 100";
  }
  const start = s.indexOf(root[0]) + root[0].length, end = s.lastIndexOf("</svg>");
  const inner = s.slice(start, end > start ? end : undefined);
  const out = inner.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g, (_m, close: string, tag: string, attrs: string, self: string) => {
    const t = tag.toLowerCase();
    if (!TAGS.has(t) || t === "svg") return "";
    if (close) return `</${tag}>`;
    const kept: string[] = [];
    attrs.replace(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_a: string, name: string, _q: string, v1?: string, v2?: string) => {
      const n = name.toLowerCase(), v = (v1 ?? v2 ?? "").trim();
      if (!ATTRS.has(n) || /javascript:|expression\(|@import/i.test(v)) return "";
      if ((n === "href" || n === "xlink:href") && !v.startsWith("#")) return "";
      if (/url\(/i.test(v) && !/url\(\s*['"]?#/i.test(v)) return "";
      if (n === "font-family") return "";
      kept.push(`${name}="${v.replace(/"/g, "&quot;")}"`);
      return "";
    });
    return `<${tag}${kept.length ? " " + kept.join(" ") : ""}${self ? "/" : ""}>`;
  });
  // إزالة الخلفية البيضاء الكاملة (Recraft يضيفها أحياناً) حتى تعمل النسخة الأحادية والخلفيات الملونة
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number);
  const cleaned = out.replace(/^\s*(<g[^>]*>\s*)?<(rect|path)\b([^>]*)\/?>(<\/\2>)?/i, (m, g = "", tag: string, a: string) => {
    const fill = a.match(/fill="([^"]+)"/i)?.[1] ?? "";
    if (!WHITE.test(fill)) return m;
    if (tag.toLowerCase() === "rect") {
      const w = Number(a.match(/width="([\d.]+)/)?.[1]), h = Number(a.match(/height="([\d.]+)/)?.[1]);
      if (w >= vw * 0.95 && h >= vh * 0.95) return g;
      return m;
    }
    return /d="M\s*0[\s,]+0/i.test(a) ? g : m;
  });
  return /<(path|circle|rect|polygon|ellipse|polyline|line|text)\b/i.test(cleaned) ? { markup: cleaned.trim(), viewBox } : null;
}

// ── المزودون ──────────────────────────────────────────────────
function concept(kind: LogoKind, provider: "recraft" | "gemini", svg: { markup: string; viewBox: string }, i: number, title?: string, rationale?: string): LogoConcept {
  const seed = (Date.now() + i * 7919) >>> 0;
  return {
    id: `ai-${provider}-${seed.toString(36)}`,
    family: "ai",
    signature: `ai:${provider}:${seed.toString(36)}:${svg.markup.length}`,
    title: title || `${KIND_AR[kind]} — ذكاء اصطناعي`,
    rationale: rationale || `رسمه الذكاء الاصطناعي مباشرة من اسمك ونشاطك واختياراتك (${KIND_AR[kind]}).`,
    seed,
    shapes: [],
    svg,
    ai: { provider, kind },
    pattern: { mode: "repeat", tile: 64, rotateAlt: i % 2 === 0, seed: seed ^ 0x9e3779b9 },
  };
}

async function recraftLogos(req: AiLogoRequest, signal?: AbortSignal): Promise<LogoConcept[]> {
  const key = process.env.RECRAFT_API_KEY!;
  const model = process.env.RECRAFT_LOGO_MODEL || "recraftv3_vector";
  const kinds = planKinds(req.input, req.count ?? 4);
  const p = req.palette;
  const colors = [p.primary.hex, p.secondary.hex, p.accent.hex].map((h) => ({ rgb: hexRgb(h) }));
  const results = await Promise.all(kinds.map(async (kind, i) => {
    const r = await fetch("https://external.api.recraft.ai/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        prompt: buildLogoPrompt(req.input, kind), negative_prompt: negativePrompt(req.input), model, style: "vector_illustration", n: 1, size: "1024x1024",
        controls: { colors, background_color: { rgb: [255, 255, 255] } }, response_format: "url",
      }),
      signal,
    });
    if (!r.ok) throw new Error(`Recraft ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const url: string | undefined = (await r.json())?.data?.[0]?.url;
    if (!url) return null;
    const svgText = await (await fetch(url, { signal })).text();
    const svg = sanitizeSvg(svgText);
    return svg ? concept(kind, "recraft", svg, i) : null;
  }));
  return results.filter((x): x is LogoConcept => !!x);
}

function geminiPrompt(req: AiLogoRequest) {
  const i = req.input, p = req.palette;
  const kinds = planKinds(i, req.count ?? 4);
  const meanings = readMeaning(i.brandName, i.brandNameEn).map((m) => `«${m.word}» = ${m.label}`);
  return `أنت مصمم شعارات محترف. صمّم ${kinds.length} شعارات مختلفة تماماً (رموز فقط بدون اسم العلامة) لهذه العلامة السعودية:
- الاسم: ${i.brandName}${i.brandNameEn ? ` / ${i.brandNameEn}` : ""}${meanings.length ? ` — معنى الاسم: ${meanings.join("، ")}` : ""}
- النشاط: ${i.industryOther || i.industry}
- القيم: ${i.brandValues.join("، ")} — النمط: ${i.visualStyle}
- الفئة المستهدفة: ${i.targetAudience || "—"}
- يحب أن يرى: ${i.likes || "—"} — يتجنب: ${i.avoid || "—"}
- أنواع الشعارات المطلوبة بالترتيب: ${kinds.map((k) => KIND_AR[k]).join("، ")}
قواعد SVG: viewBox="0 0 100 100"، أشكال مسطحة نظيفة (path/circle/rect/polygon)، استخدم فقط هذه الألوان: ${p.primary.hex}، ${p.secondary.hex}، ${p.accent.hex}، بدون خلفية، بدون نصوص إلا حرفاً واحداً في نوع «حرف» أو «رمز + حرف» عبر <text>، يجب أن يبقى واضحاً بحجم 16px، ابتكر ولا تستخدم كليشيهات (مصباح، ترس، فنجان مكرر).
أعد JSON فقط: {"logos":[{"title":"اسم المفهوم بالعربية","rationale":"جملة عن الدلالة","svg":"<svg ...>...</svg>"}]}`;
}

async function geminiLogos(req: AiLogoRequest, signal?: AbortSignal): Promise<LogoConcept[]> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: geminiPrompt(req) }] }], generationConfig: { responseMimeType: "application/json", temperature: 1 } }),
    signal,
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("") ?? "";
  const j = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  const kinds = planKinds(req.input, req.count ?? 4);
  return (Array.isArray(j.logos) ? j.logos : []).map((l: { title?: string; rationale?: string; svg?: string }, i: number) => {
    const svg = sanitizeSvg(String(l.svg ?? ""));
    return svg ? concept(kinds[i % kinds.length], "gemini", svg, i, l.title?.slice(0, 60), l.rationale?.slice(0, 220)) : null;
  }).filter(Boolean) as LogoConcept[];
}

export const aiLogoProvider = (): "recraft" | "gemini" | null =>
  process.env.RECRAFT_API_KEY ? "recraft" : process.env.GEMINI_API_KEY ? "gemini" : null;

export async function generateAiLogos(req: AiLogoRequest, signal?: AbortSignal): Promise<{ provider: "recraft" | "gemini"; concepts: LogoConcept[] }> {
  const provider = aiLogoProvider();
  if (!provider) throw new Error("NO_KEY");
  if (provider === "recraft") {
    try {
      const c = await recraftLogos(req, signal);
      if (c.length) return { provider, concepts: c };
    } catch (e) {
      if (!process.env.GEMINI_API_KEY) throw e;
      console.error("[ai-logos] recraft failed, falling back to gemini", e instanceof Error ? e.message : e);
    }
  }
  return { provider: "gemini", concepts: await geminiLogos(req, signal) };
}
