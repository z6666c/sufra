import type { IntakeInput, LogoConcept, LogoFamily, PatternSpec } from "../types";
import { mulberry32, weightedDistinct, int, chance, hashString, pick } from "../random";
import { FAMILIES, type FamilyResult } from "./families";
import { NAME_FAMILIES, readName, type NameCtx } from "./name-families";
import { validateShapes } from "../validate";
import { compose, compositionSpace, totalSpace } from "./composer";
export { compositionSpace, totalSpace };
import type { RNG } from "../random";

type Gen = (rng: RNG, ctx: NameCtx) => FamilyResult;
const ALL: Record<LogoFamily, Gen> = {
  ...(Object.fromEntries(Object.entries(FAMILIES).map(([k, fn]) => [k, (rng: RNG) => fn(rng)])) as Record<string, Gen>),
  ...NAME_FAMILIES,
  compose,
} as Record<LogoFamily, Gen>;

const ABSTRACT: LogoFamily[] = ["grid", "star", "arcs", "facets", "petals", "bars", "kufic"];
const LETTER: LogoFamily[] = ["letterBox", "letterRing", "monogram", "seal"];
const MOTIF: LogoFamily[] = ["motif", "motifBox", "motifLetter"];
const DUO: LogoFamily[] = ["nameDuo"];
const COMPOSE: LogoFamily[] = ["compose"];

const STYLE_WEIGHTS: Record<IntakeInput["visualStyle"], Partial<Record<LogoFamily, number>>> = {
  minimal: { grid: 3, arcs: 3, bars: 2, petals: 1.5, kufic: 0.6, facets: 0.6, star: 0.4, letterBox: 3, letterRing: 3, monogram: 2, seal: 1, motif: 3, motifBox: 2, motifLetter: 1.5, compose: 3, nameDuo: 3 },
  geometric: { grid: 3, facets: 2.5, kufic: 2, arcs: 2, bars: 1.2, star: 1, petals: 0.6, letterBox: 3, letterRing: 2, monogram: 2.5, seal: 1, motif: 2, motifBox: 3, motifLetter: 2, compose: 3, nameDuo: 3 },
  islamic: { star: 4, kufic: 3.5, petals: 1.5, grid: 1.2, bars: 1, arcs: 0.5, facets: 0.4, letterBox: 3, letterRing: 2, monogram: 1.5, seal: 2.5, motif: 1.5, motifBox: 2.5, motifLetter: 1.5, compose: 3, nameDuo: 3 },
  tech3d: { facets: 4, grid: 2, bars: 2, arcs: 2, kufic: 0.8, petals: 0.4, star: 0.5, letterBox: 3, letterRing: 2.5, monogram: 2.5, seal: 0.4, motif: 2.5, motifBox: 2.5, motifLetter: 2, compose: 3, nameDuo: 3 },
};

const PATTERN_MODE: Partial<Record<LogoFamily, PatternSpec["mode"]>> = { grid: "truchet", star: "lattice", kufic: "lattice", seal: "lattice" };

export const FAMILY_LABEL: Record<LogoFamily, string> = {
  grid: "هندسي", star: "زخرفة إسلامية", arcs: "مدارات", facets: "منظوري", petals: "شعاعي", bars: "أعمدة", kufic: "كوفي مربع",
  letterBox: "حرف الاسم", letterRing: "حرف ومدار", monogram: "مونوغرام", seal: "ختم", motif: "رمز النشاط", motifBox: "رمز في شكل", motifLetter: "رمز وحرف", compose: "تركيبي", nameDuo: "الاسم + النشاط",
};

const sigOf = (r: FamilyResult) => hashString(JSON.stringify(r.shapes)).toString(36);

/**
 * توليد مفاهيم متنوعة تقرأ الاسم ونوع النشاط.
 * - count: عدد المفاهيم (الافتراضي 6)
 * - exclude: عائلات عُرضت سابقاً (يقل وزنها)
 * - seen: بصمات مفاهيم سابقة لمنع التكرار التام
 */
export function generateConcepts(input: IntakeInput, seed: number, exclude: LogoFamily[] = [], count = 6, seen: string[] = []): LogoConcept[] {
  const rng = mulberry32(seed ^ hashString(input.brandName + (input.brandNameEn ?? "")));
  const ctx = readName(input.brandName, input.brandNameEn, input.industry, input.industryOther);
  const weights = STYLE_WEIGHTS[input.visualStyle] ?? STYLE_WEIGHTS.geometric;
  const seenSet = new Set(seen);
  const used = new Map<LogoFamily, number>();
  const titles = new Set<string>();

  // خطة متوازنة: حروف الاسم + رموز النشاط + لمسة تجريدية
  const hasMeaning = ctx.meanings.length > 0;
  // عند وجود معنى في الاسم: مفهوم «الاسم + النشاط» مضمون في كل دفعة
  const plan: LogoFamily[][] = hasMeaning
    ? [DUO, COMPOSE, LETTER, MOTIF, COMPOSE, DUO, COMPOSE, LETTER, ABSTRACT, COMPOSE, MOTIF, COMPOSE]
    : [COMPOSE, LETTER, COMPOSE, MOTIF, COMPOSE, chance(rng, 0.5) ? LETTER : MOTIF, COMPOSE, ABSTRACT, COMPOSE, LETTER, MOTIF, COMPOSE];
  const out: LogoConcept[] = [];
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const pool = plan[i % plan.length];
    const cands = pool
      .filter((fam) => (fam !== "monogram" || ctx.pairEn || ctx.pairAr) && (fam !== "nameDuo" || hasMeaning))
      .map((fam) => ({ item: fam, w: (weights[fam] ?? 1) * (exclude.includes(fam) && fam !== "compose" ? 0.35 : 1) / (1 + (fam === "compose" ? 0 : 2.5) * (used.get(fam) ?? 0)) }));
    const [family] = weightedDistinct(rng, cands, 1);
    if (!family) continue;
    const c = buildConcept(family, (seed + (i + 1) * 7919 + int(rng, 0, 99999)) >>> 0, ctx, seenSet);
    if (!c || titles.has(c.title)) continue;
    titles.add(c.title);
    seenSet.add(c.signature!);
    used.set(family, (used.get(family) ?? 0) + 1);
    out.push(c);
  }
  return out;
}

export function buildConcept(family: LogoFamily, seed: number, ctx?: NameCtx, seen?: Set<string>): LogoConcept | null {
  const nctx = ctx ?? readName("علامة", "Brand", "other");
  let s = seed;
  for (let attempt = 0; attempt < 10; attempt++) {
    const rng = mulberry32(s);
    const res = ALL[family](rng, nctx);
    const check = validateShapes(res.shapes);
    const signature = res.key ?? `${family}:${sigOf({ ...res, shapes: check.shapes })}`;
    if (check.ok && !seen?.has(signature)) {
      return {
        id: `${family}-${s.toString(36)}`,
        family,
        signature,
        title: res.title,
        rationale: res.rationale,
        seed: s,
        shapes: check.shapes,
        pattern: { mode: PATTERN_MODE[family] ?? "repeat", tile: chance(rng, 0.5) ? 48 : 64, rotateAlt: chance(rng, 0.5), seed: s ^ 0x9e3779b9 },
      };
    }
    s = (s * 1103515245 + 12345) >>> 0;
  }
  return null;
}

export { pick };
