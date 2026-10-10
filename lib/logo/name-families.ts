// عائلات تقرأ اسم العلامة ونشاطها: حرف داخل شكل، حرف وحلقة، مونوغرام، ختم دائري، رموز قطاعية
import type { LogoShape, ShapeRole } from "../types";
import { type RNG, chance, int, pick, range } from "../random";
import type { FamilyResult } from "./families";
import { MOTIFS, Pen, drawMotif, motifsFor } from "./motifs";
import { readMeaning, type NameMeaning } from "./name-motifs";
import { annularSector, circle, polar, polygon, rect } from "./geometry";

export interface NameCtx {
  nameAr: string;
  nameEn?: string;
  initialAr?: string;
  initialEn?: string;
  pairEn?: string; // حرفان للمونوغرام
  pairAr?: string;
  industry: string;
  sub?: string;
  /** معاني كلمات الاسم المربوطة برموز (زهرة ← وردة…) */
  meanings: NameMeaning[];
}

const AR_SKIP = new Set(["شركة", "مؤسسة", "مطعم", "مقهى", "كافيه", "كوفي", "محمصة", "مكتب", "متجر", "مركز", "مجموعة", "دار", "بيت", "مخبز", "حلويات", "عيادة"]);
const EN_SKIP = new Set(["the", "al", "el", "co", "company", "cafe", "café", "coffee", "restaurant", "group", "house", "store", "shop", "and", "&", "of"]);

const isAr = (s: string) => /[؀-ۿ]/.test(s);

/** قراءة الاسم: تجاوز «ال» التعريف والكلمات العامة لاستخراج الحرف المميز */
export function readName(brandName: string, brandNameEn: string | undefined, industry: string, sub?: string): NameCtx {
  const ctx: NameCtx = { nameAr: brandName.trim(), nameEn: brandNameEn?.trim() || undefined, industry, sub, meanings: readMeaning(brandName, brandNameEn) };
  const arWords = brandName.trim().split(/\s+/).filter((w) => isAr(w));
  const sig = arWords.filter((w) => !AR_SKIP.has(w));
  const pickAr = (w: string) => {
    const core = w.replace(/^(وال|بال|فال|كال|لل|ال)/, "");
    return Array.from(core.length >= 2 ? core : w)[0];
  };
  if (arWords.length) {
    const words = sig.length ? sig : arWords;
    ctx.initialAr = pickAr(words[0]);
    ctx.pairAr = words.length > 1 ? pickAr(words[0]) + pickAr(words[1]) : undefined;
  }
  const latinSrc = ctx.nameEn || (!isAr(brandName) ? brandName : "");
  if (latinSrc) {
    const words = latinSrc.split(/[\s\-_.]+/).filter(Boolean);
    const sigEn = words.filter((w) => !EN_SKIP.has(w.toLowerCase()));
    const use = sigEn.length ? sigEn : words;
    const letters = use.map((w) => w.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
    if (letters.length) {
      ctx.initialEn = letters[0][0].toUpperCase();
      ctx.pairEn = letters.length > 1 ? (letters[0][0] + letters[1][0]).toUpperCase() : (letters[0].slice(0, 2)).replace(/^./, (c) => c.toUpperCase());
    }
  }
  return ctx;
}

const T = (value: string, script: "ar" | "en", size: number, x = 50, y = 50, extra: Partial<LogoShape> = {}, weight = 800): LogoShape => ({
  role: "primary", text: { value, x, y, size, weight, script, letterSpacing: 0 }, ...extra,
});

/** حرف للاستخدام: بالعربي أو اللاتيني بالتناوب */
function chooseLetter(ctx: NameCtx, rng: RNG): { ch: string; script: "ar" | "en" } {
  const opts: { ch: string; script: "ar" | "en" }[] = [];
  if (ctx.initialAr) opts.push({ ch: ctx.initialAr, script: "ar" });
  if (ctx.initialEn) opts.push({ ch: ctx.initialEn, script: "en" });
  const r = opts.length ? pick(rng, opts) : { ch: "◆", script: "en" as const };
  lastLetter = r.ch;
  return r;
}
const letterSize = (script: "ar" | "en", base: number) => (script === "ar" ? base * 1.12 : base);
// تعويض موضع الحروف العربية: الحروف النازلة تُرفع والطويلة تُخفض قليلاً لتتوسط الشكل بصرياً
const AR_LOW = new Set(Array.from("رزوؤنيىئسشصضقعغجحخمهة"));
const AR_TALL = new Set(Array.from("اأإآلكطظ"));
let lastLetter = "";
/** موضع رأسي مصحح لحرف معيّن */
export function letterYFor(ch: string, script: "ar" | "en", y = 50) { lastLetter = ch; return letterY(script, y); }
export { letterSize };
const letterY = (script: "ar" | "en", y = 50) => {
  if (script === "en") return y + 1;
  return AR_LOW.has(lastLetter) ? y - 11 : AR_TALL.has(lastLetter) ? y + 3 : y - 4;
};

type Container = "circle" | "squircle" | "hex" | "arch" | "diamond" | "octagon" | "lens" | "split";
function containerShapes(kind: Container, rng: RNG): LogoShape[] {
  switch (kind) {
    case "circle": return [{ d: circle(50, 50, 46), role: "primary" }];
    case "squircle": return [{ d: rect(5, 5, 90, 90, range(rng, 18, 30)), role: "primary" }];
    case "hex": { const pts = Array.from({ length: 6 }, (_, i) => polar(50, 50, 47, -90 + i * 60)); return [{ d: polygon(pts), role: "primary" }]; }
    case "octagon": { const pts = Array.from({ length: 8 }, (_, i) => polar(50, 50, 47, 22.5 + i * 45)); return [{ d: polygon(pts), role: "primary" }]; }
    case "diamond": return [{ d: polygon([[50, 3], [97, 50], [50, 97], [3, 50]]), role: "primary" }];
    case "arch": return [{ d: `M10 96V46A40 40 0 0 1 90 46V96Z`, role: "primary" }];
    case "lens": return [{ d: `M50 4Q104 50 50 96Q-4 50 50 4Z`, role: "primary" }];
    case "split": return [{ d: `M4 50A46 46 0 0 1 96 50Z`, role: "primary" }, { d: `M96 50A46 46 0 0 1 4 50Z`, role: "secondary" }];
  }
}
const CONTAINER_NAMES: Record<Container, string> = {
  circle: "دائرة", squircle: "مربع ناعم", hex: "سداسي", arch: "قوس", diamond: "معيّن", octagon: "ثماني", lens: "عدسة", split: "دائرة ثنائية",
};

/** 1) حرف داخل شكل بمساحة سالبة */
export function letterBox(rng: RNG, ctx: NameCtx): FamilyResult {
  const { ch, script } = chooseLetter(ctx, rng);
  const kind = pick(rng, ["circle", "squircle", "hex", "arch", "diamond", "octagon", "lens", "split"] as Container[]);
  const shapes = containerShapes(kind, rng);
  const knock = chance(rng, 0.7);
  const size = letterSize(script, kind === "diamond" ? 48 : kind === "lens" ? 50 : 62);
  const y = letterY(script, kind === "arch" ? 60 : 50);
  shapes.push(T(ch, script, size, 50, y, knock ? { knock: true } : { role: "accent", layer: 1 }));
  if (chance(rng, 0.5)) shapes.push({ d: circle(kind === "arch" ? 50 : 80, kind === "arch" ? 22 : 20, 5.5), role: "accent", layer: 1 });
  return {
    shapes,
    title: `حرف «${ch}» في ${CONTAINER_NAMES[kind]}`,
    rationale: `الحرف الأول المميز من اسم «${ctx.nameAr}» ${knock ? "مقتطع كمساحة سالبة" : "بارز"} داخل ${CONTAINER_NAMES[kind]}؛ رمز يحمل الاسم نفسه ويبقى واضحاً في الأيقونات الصغيرة.`,
  };
}

/** 2) حرف تحيطه حلقة منقطعة */
export function letterRing(rng: RNG, ctx: NameCtx): FamilyResult {
  const { ch, script } = chooseLetter(ctx, rng);
  const a0 = range(rng, 0, 360), span = range(rng, 250, 310), t = range(rng, 6, 9);
  const shapes: LogoShape[] = [
    { d: annularSector(50, 50, 46 - t, 46, a0, a0 + span), role: "primary" },
    { d: circle(...polar(50, 50, 46 - t / 2, a0), t / 2), role: "primary" },
    { d: circle(...polar(50, 50, 46 - t / 2, a0 + span), t / 2), role: "primary" },
    { d: circle(...polar(50, 50, 46 - t / 2, a0 + span + (360 - span) / 2), t * 0.75), role: "accent" },
    T(ch, script, letterSize(script, 54), 50, letterY(script), { role: chance(rng, 0.5) ? "secondary" : "primary" }),
  ];
  return { shapes, title: `حرف «${ch}» والمدار`, rationale: `حرف «${ch}» من الاسم في مركز حلقة مفتوحة تنتهي بنقطة مضيئة؛ حضور الاسم مع إحساس بالحركة والاستمرار.` };
}

/** 3) مونوغرام متشابك من حرفين */
export function monogram(rng: RNG, ctx: NameCtx): FamilyResult {
  const useEn = ctx.pairEn && (chance(rng, 0.65) || !ctx.pairAr);
  const pair = (useEn ? ctx.pairEn : ctx.pairAr) ?? ctx.pairEn ?? ctx.pairAr ?? "BF";
  const script: "ar" | "en" = useEn || !ctx.pairAr ? "en" : "ar";
  const [a, b] = Array.from(pair);
  const dx = range(rng, 14, 19), size = letterSize(script, range(rng, 58, 66));
  const first = script === "ar" ? 50 + dx : 50 - dx, second = script === "ar" ? 50 - dx : 50 + dx;
  const yb = chance(rng, 0.4) ? 56 : 50;
  lastLetter = a;
  const ya = letterY(script, 46);
  lastLetter = b;
  const yB = letterY(script, yb);
  const shapes: LogoShape[] = [
    T(a, script, size, first, ya),
    { ...T(b, script, size, second, yB), knock: true, stroke: 7 },
    T(b, script, size, second, yB, { role: chance(rng, 0.5) ? "accent" : "secondary", layer: 1 }),
  ];
  if (chance(rng, 0.45)) shapes.unshift({ d: circle(50, 50, 47) + circle(50, 50, 43.5), role: "secondary" });
  return { shapes, title: `مونوغرام ${pair}`, rationale: `الحرفان ${pair} من الاسم متشابكان بفاصل مقتطع؛ توقيع خاص بالعلامة يصلح للختم والتطريز والأيقونة.` };
}

/** 4) ختم دائري يحمل الاسم */
export function seal(rng: RNG, ctx: NameCtx): FamilyResult {
  const useEn = !!ctx.nameEn && chance(rng, 0.6);
  const label = useEn ? ctx.nameEn!.toUpperCase() : ctx.nameAr;
  const chars = Array.from(label).length;
  const size = Math.max(6, Math.min(12, 118 / (chars * (useEn ? 0.72 : 0.6))));
  const shapes: LogoShape[] = [
    { d: circle(50, 50, 48) + circle(50, 50, 34), role: "primary" },
    { role: "primary", knock: true, textPath: { value: label, r: 40.5, size, weight: 700, script: useEn ? "en" : "ar", letterSpacing: useEn ? 0.12 : 0, offset: 25 } },
  ];
  [128, 90, 52].forEach((a, i) => shapes.push({ d: circle(...polar(50, 50, 41, a), i === 1 ? 2.6 : 1.8), role: "primary", knock: true }));
  const centerMotif = chance(rng, 0.55);
  if (centerMotif) {
    const ids = ctx.meanings.length ? ctx.meanings.map((m) => m.motif) : motifsFor(ctx.industry, ctx.sub);
    const id = pick(rng, ids);
    shapes.push(...drawMotif(id, new Pen(50, 50, 0.5), rng));
  } else {
    const { ch, script } = chooseLetter(ctx, rng);
    shapes.push(T(ch, script, letterSize(script, 34), 50, letterY(script), { role: "accent", layer: 1 }));
  }
  return { shapes, title: "الختم الدائري", rationale: `اسم «${label}» يدور حول مركز ${centerMotif ? "يحمل رمز النشاط" : "يحمل الحرف الأول"}؛ طابع حِرفي يناسب العبوات والأكواب والملصقات.` };
}

/** 5) رمز النشاط وحده بأسلوب متغير */
export function motif(rng: RNG, ctx: NameCtx): FamilyResult {
  const named = ctx.meanings.length && chance(rng, 0.6) ? pick(rng, ctx.meanings) : null;
  const id = named?.motif ?? pick(rng, motifsFor(ctx.industry, ctx.sub));
  const m = MOTIFS[id];
  const tilt = chance(rng, 0.3) ? pick(rng, [-12, 12, -20, 20]) : 0;
  let shapes = drawMotif(id, new Pen(50, 50, range(rng, 0.9, 0.98), tilt), rng);
  if (chance(rng, 0.4)) shapes = shapes.map((s, i) => (!s.knock && i % 2 ? { ...s, role: s.role === "primary" ? ("secondary" as ShapeRole) : s.role } : s));
  if (named) return { shapes, title: `${m.label} من «${named.word}»`, rationale: `كلمة «${named.word}» في اسمك تعني ${named.label}، فتحولت إلى رمز: ${m.meaning}.` };
  return { shapes, title: m.label, rationale: `${m.meaning}. صُمم خصيصاً لقطاع النشاط بعيداً عن الأيقونات المستهلكة.` };
}

/** 6) رمز النشاط مقتطعاً داخل شكل */
export function motifBox(rng: RNG, ctx: NameCtx): FamilyResult {
  const id = pick(rng, motifsFor(ctx.industry, ctx.sub));
  const kind = pick(rng, ["circle", "squircle", "hex", "arch", "octagon"] as Container[]);
  const shapes = containerShapes(kind, rng);
  const inner = drawMotif(id, new Pen(50, kind === "arch" ? 58 : 50, 0.56), rng);
  inner.forEach((s) => shapes.push(s.knock ? { ...s, knock: false, role: "primary", layer: 1 } : { ...s, knock: true }));
  return { shapes, title: `${MOTIFS[id].label} في ${CONTAINER_NAMES[kind]}`, rationale: `${MOTIFS[id].meaning}، مقتطعاً داخل ${CONTAINER_NAMES[kind]} ليصبح أيقونة متماسكة تصلح للتطبيقات والعبوات.` };
}

/** 7) رمز النشاط يتشابك مع الحرف الأول */
export function motifLetter(rng: RNG, ctx: NameCtx): FamilyResult {
  const id = pick(rng, motifsFor(ctx.industry, ctx.sub));
  const { ch, script } = chooseLetter(ctx, rng);
  const side = script === "ar" ? 1 : -1;
  const shapes = drawMotif(id, new Pen(50 + side * 12, 44, 0.66), rng);
  const lx = 50 - side * 22, ly = 66, size = letterSize(script, 48);
  shapes.push({ ...T(ch, script, size, lx, letterY(script, ly)), knock: true, stroke: 8 });
  shapes.push(T(ch, script, size, lx, letterY(script, ly), { role: "accent", layer: 1 }));
  return { shapes, title: `${MOTIFS[id].label} + «${ch}»`, rationale: `يجمع رمز النشاط (${MOTIFS[id].label}) مع الحرف الأول «${ch}» من الاسم في تكوين واحد؛ ${MOTIFS[id].meaning}.` };
}

/** 8) معنى الاسم + رمز النشاط في علامة واحدة */
export function nameDuo(rng: RNG, ctx: NameCtx): FamilyResult {
  const named = ctx.meanings.length ? pick(rng, ctx.meanings) : null;
  const industryIds = motifsFor(ctx.industry, ctx.sub).filter((id) => id !== named?.motif);
  const act = pick(rng, industryIds.length ? industryIds : ["spark"]);
  if (!named) {
    // بدون معنى في الاسم: رمز النشاط مع الحرف الأول
    return motifLetter(rng, ctx);
  }
  const layout = pick(rng, ["badge", "badge", "inside"] as const);
  const shapes: LogoShape[] = [];
  if (layout === "badge") {
    // الرمز الرئيسي من الاسم، ورمز النشاط داخل شارة صغيرة يفصلها خط سالب
    shapes.push(...drawMotif(named.motif, new Pen(44, 44, 0.8), rng));
    shapes.push({ d: circle(75, 75, 22), role: "primary", knock: true });
    shapes.push({ d: circle(75, 75, 18), role: "accent", layer: 1 });
    drawMotif(act, new Pen(75, 75, 0.27), rng).forEach((s) => { if (!s.knock) shapes.push({ ...s, role: "primary", layer: 1, stroke: s.stroke ? Math.max(1.4, s.stroke * 0.5) : undefined }); });
  } else {
    // رمز النشاط مقتطع داخل رمز الاسم
    shapes.push(...drawMotif(named.motif, new Pen(50, 50, 1), rng).map((s) => (s.knock ? { ...s, knock: false, layer: 1 as const, role: "accent" as ShapeRole } : s)));
    drawMotif(act, new Pen(50, 52, 0.36), rng).forEach((s) => { if (!s.knock) shapes.push({ ...s, knock: true }); });
  }
  return {
    shapes,
    title: `${MOTIFS[named.motif].label} + ${MOTIFS[act].label}`,
    rationale: `يجمع معنى اسمك («${named.word}» ← ${named.label}) مع رمز نشاطك (${MOTIFS[act].label}) في علامة واحدة؛ ${MOTIFS[named.motif].meaning}.`,
  };
}

export const NAME_FAMILIES = { letterBox, letterRing, monogram, seal, motif, motifBox, motifLetter, nameDuo };
export { int };
