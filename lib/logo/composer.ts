// المُركِّب: يبني الشعار لحظة الطلب من محاور تصميم مستقلة
// (النواة × الإطار × المعالجة × الحلية × اللمسة × نظام الألوان × المقياس)
// كل تركيبة لها مفتاح فريد، فلا يتكرر شعار سبق عرضه لنفس العلامة.
import type { LogoShape, ShapeRole } from "../types";
import { type RNG, pick, chance } from "../random";
import type { FamilyResult } from "./families";
import { MOTIFS, Pen, drawMotif, motifsFor } from "./motifs";
import { annularSector, circle, polar, polygon, rect } from "./geometry";
import { type NameCtx, letterSize, letterYFor } from "./name-families";

// ── المحاور ───────────────────────────────────────────────────
const CONTAINERS = [
  "circle", "squircle", "square", "hex", "hexFlat", "octagon", "diamond", "arch", "lens",
  "shield", "drop", "leaf", "rosette", "badge", "cutCorner", "tab", "pill", "split",
] as const;
type Container = (typeof CONTAINERS)[number] | "none";
const TREATMENTS = ["knock", "solid", "outline", "shadow", "soft"] as const;
type Treatment = (typeof TREATMENTS)[number] | "plain" | "echo";
const FRAMES = ["none", "inner", "dots", "outer"] as const;
type Frame = (typeof FRAMES)[number];
const ACCENTS = ["none", "dotTR", "dotTL", "sparkle", "bar", "orbit", "twin", "ticks"] as const;
type Accent = (typeof ACCENTS)[number];
const SCHEMES = [
  { box: "primary", core: "accent", mark: "accent" },
  { box: "secondary", core: "accent", mark: "primary" },
  { box: "primary", core: "secondary", mark: "secondary" },
] as const;
const SCALES = [1, 0.84] as const;
const GENERIC_MOTIFS = ["spark", "diamond", "loop", "arch"];

const C_NAME: Record<Container, string> = {
  none: "حر", circle: "دائرة", squircle: "مربع ناعم", square: "مربع", hex: "سداسي", hexFlat: "سداسي أفقي", octagon: "ثماني",
  diamond: "معيّن", arch: "قوس", lens: "عدسة", shield: "درع", drop: "قطرة", leaf: "ورقة", rosette: "نجمة ثمانية",
  badge: "شارة مسننة", cutCorner: "مربع مشطوف", tab: "لسان", pill: "كبسولة", split: "دائرة ثنائية",
};
const T_NAME: Record<Treatment, string> = {
  knock: "مساحة سالبة", solid: "بارز", outline: "خطي", shadow: "بظل متراكب", soft: "ناعم", plain: "مجرد", echo: "بصدى",
};

/** مركز النواة ومقاسها داخل كل إطار */
const FIT: Record<Container, { y: number; k: number }> = {
  none: { y: 50, k: 1.25 }, circle: { y: 50, k: 1 }, squircle: { y: 50, k: 1.05 }, square: { y: 50, k: 1.05 }, hex: { y: 50, k: 0.92 },
  hexFlat: { y: 50, k: 0.92 }, octagon: { y: 50, k: 0.98 }, diamond: { y: 50, k: 0.74 }, arch: { y: 60, k: 0.9 }, lens: { y: 50, k: 0.74 },
  shield: { y: 46, k: 0.86 }, drop: { y: 62, k: 0.76 }, leaf: { y: 50, k: 0.8 }, rosette: { y: 50, k: 0.8 }, badge: { y: 50, k: 0.9 },
  cutCorner: { y: 50, k: 1 }, tab: { y: 54, k: 0.96 }, pill: { y: 50, k: 0.8 }, split: { y: 50, k: 0.96 },
};

function containerPaths(kind: Container, p: Pen): { d: string; half?: boolean }[] {
  const ring = (n: number, r: number, a0: number) => p.poly(Array.from({ length: n }, (_, i) => polar(50, 50, r, a0 + (i * 360) / n)));
  switch (kind) {
    case "none": return [];
    case "circle": return [{ d: p.circle(50, 50, 46) }];
    case "squircle": return [{ d: p.rect(5, 5, 90, 90, 27) }];
    case "square": return [{ d: p.rect(6, 6, 88, 88, 9) }];
    case "hex": return [{ d: ring(6, 47, -90) }];
    case "hexFlat": return [{ d: ring(6, 47, 0) }];
    case "octagon": return [{ d: ring(8, 47, 22.5) }];
    case "diamond": return [{ d: p.poly([[50, 3], [97, 50], [50, 97], [3, 50]]) }];
    case "arch": return [{ d: p.path().M(10, 96).L(10, 46).A(40, 40, 0, 1, 90, 46).L(90, 96).Z() }];
    case "lens": return [{ d: p.path().M(50, 4).Q(104, 50, 50, 96).Q(-4, 50, 50, 4).Z() }];
    case "shield": return [{ d: p.path().M(12, 8).L(88, 8).L(88, 50).Q(88, 82, 50, 96).Q(12, 82, 12, 50).Z() }];
    case "drop": return [{ d: p.path().M(50, 4).Q(86, 44, 86, 62).A(36, 36, 0, 1, 14, 62).Q(14, 44, 50, 4).Z() }];
    case "leaf": return [{ d: p.path().M(8, 92).Q(8, 8, 92, 8).Q(92, 92, 8, 92).Z() }];
    case "rosette": return [{ d: p.poly(Array.from({ length: 16 }, (_, i) => polar(50, 50, i % 2 ? 39 : 48, -90 + i * 22.5))) }];
    case "badge": return [{ d: p.poly(Array.from({ length: 32 }, (_, i) => polar(50, 50, i % 2 ? 44 : 48, -90 + i * 11.25))) }];
    case "cutCorner": return [{ d: p.poly([[22, 5], [95, 5], [95, 78], [78, 95], [5, 95], [5, 22]]) }];
    case "tab": return [{ d: p.path().M(50, 5).L(95, 5).L(95, 95).L(5, 95).L(5, 50).A(45, 45, 0, 1, 50, 5).Z() }];
    case "pill": return [{ d: p.rect(17, 4, 66, 92, 33) }];
    case "split": return [{ d: p.path().M(4, 50).A(46, 46, 0, 1, 96, 50).Z() }, { d: p.path().M(96, 50).A(46, 46, 0, 1, 4, 50).Z(), half: true }];
  }
}

// ── النواة: حرف/حرفان/رمز نشاط ─────────────────────────────
type Core = { kind: "letter"; ch: string; script: "ar" | "en" } | { kind: "pair"; pair: string; script: "ar" | "en" } | { kind: "motif"; id: string };

export function coresFor(ctx: NameCtx): Core[] {
  const out: Core[] = [];
  if (ctx.initialAr) out.push({ kind: "letter", ch: ctx.initialAr, script: "ar" });
  if (ctx.initialEn) out.push({ kind: "letter", ch: ctx.initialEn, script: "en" });
  if (ctx.pairAr) out.push({ kind: "pair", pair: ctx.pairAr, script: "ar" });
  if (ctx.pairEn && ctx.pairEn.length === 2) out.push({ kind: "pair", pair: ctx.pairEn, script: "en" });
  const ids = Array.from(new Set([...motifsFor(ctx.industry, ctx.sub), ...GENERIC_MOTIFS]));
  ids.forEach((id) => out.push({ kind: "motif", id }));
  return out;
}
const coreKey = (c: Core) => (c.kind === "motif" ? `m-${c.id}` : c.kind === "pair" ? `p-${c.pair}` : `l-${c.ch}`);

function textShape(ch: string, script: "ar" | "en", size: number, x: number, y: number, extra: Partial<LogoShape>): LogoShape {
  return { role: "primary", text: { value: ch, x, y: letterYFor(ch, script, y), size: letterSize(script, size), weight: 800, script, letterSpacing: 0 }, ...extra };
}

/** يرسم النواة بالأسلوب المطلوب: cut = مقتطعة من الإطار، top = فوقه، free = مستقلة */
function drawCore(core: Core, mode: "cut" | "top" | "free", cy: number, k: number, role: ShapeRole, rng: RNG, dx = 0, dy = 0): LogoShape[] {
  const extra = (): Partial<LogoShape> => (mode === "cut" ? { knock: true } : mode === "top" ? { role, layer: 1 } : { role });
  if (core.kind === "letter") return [textShape(core.ch, core.script, 60 * k, 50 + dx, cy + dy, extra())];
  if (core.kind === "pair") {
    const [a, b] = Array.from(core.pair);
    const gap = 17 * k, first = core.script === "ar" ? 50 + gap : 50 - gap, second = core.script === "ar" ? 50 - gap : 50 + gap;
    return [textShape(a, core.script, 46 * k, first + dx, cy + dy, extra()), textShape(b, core.script, 46 * k, second + dx, cy + dy, extra())];
  }
  const inner = drawMotif(core.id, new Pen(50 + dx, cy + dy, (mode === "free" ? 0.62 : 0.56) * k), rng);
  if (mode === "cut") return inner.map((s) => (s.knock ? { ...s, knock: false, role: "primary" as ShapeRole, layer: 1 as const } : { ...s, knock: true }));
  if (mode === "top") return inner.map((s) => (s.knock ? { ...s, knock: false, role: "primary" as ShapeRole, layer: 1 as const } : { ...s, role, layer: 1 as const }));
  return inner.map((s) => (s.knock ? s : { ...s, role: s.role === "accent" ? "accent" : role }));
}

function accentShapes(a: Accent): LogoShape[] {
  const A = (d: string): LogoShape => ({ d, role: "accent", layer: 1 });
  switch (a) {
    case "none": return [];
    case "dotTR": return [A(circle(83, 17, 5.5))];
    case "dotTL": return [A(circle(17, 17, 5.5))];
    case "sparkle": {
      const pts = Array.from({ length: 8 }, (_, i) => polar(83, 17, i % 2 ? 2.4 : 9, -90 + i * 45));
      return [A(polygon(pts))];
    }
    case "bar": return [A(rect(38, 87, 24, 5, 2.5))];
    case "orbit": return [A(annularSector(50, 50, 46.5, 50, -70, 10))];
    case "twin": return [A(circle(80, 15, 3.6)), A(circle(89, 25, 2.6))];
    case "ticks": return [A(rect(76, 7, 16, 3.6, 1.8)), A(rect(88.4, 10.6, 3.6, 11, 1.8))];
  }
}

// ── عدد التركيبات الممكنة ─────────────────────────────────────
const PER_CORE = (CONTAINERS.length * TREATMENTS.length * FRAMES.length + 2) * ACCENTS.length * SCHEMES.length * SCALES.length;
/** عدد الشعارات المختلفة الممكنة لهذه العلامة تحديداً */
export function compositionSpace(ctx: NameCtx): number {
  return coresFor(ctx).length * PER_CORE;
}
/** إجمالي التركيبات عبر كل الرموز والحروف (عربي 28 + لاتيني 26) */
export function totalSpace(): number {
  return (Object.keys(MOTIFS).length + 28 + 26) * PER_CORE;
}

// ── التركيب ─────────────────────────────────────────────────
export function compose(rng: RNG, ctx: NameCtx): FamilyResult {
  const cores = coresFor(ctx);
  const core = pick(rng, cores);
  const container: Container = chance(rng, 0.08) ? "none" : pick(rng, CONTAINERS);
  const treat: Treatment = container === "none" ? (chance(rng, 0.5) ? "plain" : "echo") : pick(rng, TREATMENTS);
  const frame: Frame = container === "none" ? "none" : pick(rng, FRAMES);
  const accent = pick(rng, ACCENTS);
  const si = Math.floor(rng() * SCHEMES.length);
  const scheme = SCHEMES[si];
  const scale = pick(rng, SCALES);
  const fit = FIT[container];
  const k = fit.k * scale;

  const shapes: LogoShape[] = [];
  const outer = frame === "outer";
  const pen = new Pen(50, 50, outer ? 0.86 : 1);
  const cy = 50 + (fit.y - 50) * (outer ? 0.86 : 1);
  const kk = k * (outer ? 0.88 : 1);
  const filled = treat === "knock" || treat === "solid" || treat === "shadow";
  const boxRole = scheme.box as ShapeRole;

  if (treat === "shadow") {
    const sp = new Pen(55, 55, 0.88);
    containerPaths(container, sp).forEach((c) => shapes.push({ d: c.d, role: boxRole === "primary" ? "secondary" : "primary", opacity: 0.9 }));
    const mp = new Pen(46, 46, 0.88);
    containerPaths(container, mp).forEach((c) => shapes.push({ d: c.d, role: c.half ? "accent" : boxRole }));
    shapes.push(...drawCore(core, "cut", 46 + (fit.y - 50) * 0.88, k * 0.88, "primary", rng, -4, 0));
  } else {
    containerPaths(container, pen).forEach((c) => {
      if (treat === "outline") shapes.push({ d: c.d, role: boxRole, stroke: 4.5 });
      else if (treat === "soft") shapes.push({ d: c.d, role: c.half ? "accent" : boxRole, opacity: c.half ? 0.35 : 0.16 });
      else shapes.push({ d: c.d, role: c.half ? (boxRole === "primary" ? "secondary" : "primary") : boxRole });
    });
    if (treat === "knock") shapes.push(...drawCore(core, "cut", cy, kk, "primary", rng));
    else if (treat === "solid") shapes.push(...drawCore(core, "top", cy, kk, scheme.core as ShapeRole, rng));
    else if (treat === "outline" || treat === "soft") shapes.push(...drawCore(core, "free", cy, kk * (treat === "outline" ? 0.9 : 1), boxRole, rng));
    else if (treat === "echo") {
      shapes.push(...drawCore(core, "free", 50, kk, "secondary", rng, 4, 4).map((s) => ({ ...s, opacity: 0.55 })));
      shapes.push(...drawCore(core, "top", 50, kk, boxRole, rng, -2, -2));
    } else shapes.push(...drawCore(core, "free", 50, kk, boxRole, rng));
  }

  if (frame === "inner") {
    containerPaths(container, new Pen(50, 50, 0.84)).filter((c) => !c.half).forEach((c) =>
      shapes.push(filled && treat !== "shadow" ? { d: c.d, role: "primary", knock: true, stroke: 1.8 } : { d: c.d, role: boxRole, stroke: 1.6, layer: 1 }));
  } else if (frame === "dots") {
    [45, 135, 225, 315].forEach((a) => {
      const [x, y] = polar(50, 50, 36, a);
      shapes.push(filled && treat !== "shadow" ? { d: circle(x, y, 2.2), role: "primary", knock: true } : { d: circle(x, y, 2.2), role: "accent", layer: 1 });
    });
  } else if (outer) {
    containerPaths(container, new Pen(50, 50, 1)).filter((c) => !c.half).forEach((c) => shapes.push({ d: c.d, role: boxRole, stroke: 2 }));
  }

  // لا نضع حلية فوق قوس كامل أو مع الإطار الخارجي في نفس الزاوية
  const acc: Accent = outer && accent === "orbit" ? "dotTR" : accent;
  shapes.push(...accentShapes(acc).map((s) => ({ ...s, role: (scheme.mark === boxRole && filled ? "accent" : scheme.mark) as ShapeRole })));

  const coreLabel = core.kind === "motif" ? MOTIFS[core.id].label : core.kind === "pair" ? `«${core.pair}»` : `«${core.ch}»`;
  const key = ["cmp", coreKey(core), container, treat, frame, acc, si, scale].join("|");
  const coreMeaning =
    core.kind === "motif" ? MOTIFS[core.id].meaning
      : core.kind === "pair" ? `الحرفان ${core.pair} من اسم «${ctx.nameAr}» كتوقيع خاص`
        : `الحرف المميز «${core.ch}» من اسم «${ctx.nameAr}»`;
  return {
    key,
    shapes,
    title: `${coreLabel} — ${C_NAME[container]} ${T_NAME[treat]}`,
    rationale: `${coreMeaning}، داخل ${C_NAME[container]} بأسلوب ${T_NAME[treat]}. تركيبة فريدة وُلّدت لحظة الطلب.`,
  };
}
