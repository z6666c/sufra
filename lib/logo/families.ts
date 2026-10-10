// عائلات توليد الرموز — كل عائلة تبني تركيباً هندسياً فريداً من البذرة
// القائمة السلبية مطبّقة بالبناء: لا أيقونات منازل، لا عربات تسوق، لا دوائر مزدوجة متطابقة، لا شارات جاهزة.

import type { LogoFamily, LogoShape, ShapeRole } from "../types";
import { type RNG, chance, int, pick, range } from "../random";
import {
  type Corner, type Pt, annularSector, circle, f, half, leaf, polar, polygon, quarter, rect, rotatePt, tri,
} from "./geometry";

export interface FamilyResult {
  shapes: LogoShape[];
  /** مفتاح تركيبي منفصل (للتحقق من عدم التكرار) */
  key?: string;
  title: string;
  rationale: string;
}

// ───────────── 1) شبكة البناء (هندسي معاصر) ─────────────
type TileType = "empty" | "square" | "quarter" | "half" | "circle" | "tri" | "leaf";
interface Tile { t: TileType; o: number }

const CORNERS: Corner[] = ["tl", "tr", "br", "bl"];
const SIDES = ["top", "right", "bottom", "left"] as const;
const mirrorCornerH: Record<Corner, Corner> = { tl: "tr", tr: "tl", br: "bl", bl: "br" };
const rot180Corner: Record<Corner, Corner> = { tl: "br", br: "tl", tr: "bl", bl: "tr" };

function mirrorTile(tile: Tile, mode: "h" | "r"): Tile {
  const { t, o } = tile;
  if (t === "quarter" || t === "tri") {
    const c = CORNERS[o];
    const m = mode === "h" ? mirrorCornerH[c] : rot180Corner[c];
    return { t, o: CORNERS.indexOf(m) };
  }
  if (t === "half") {
    const s = SIDES[o];
    const m = mode === "h" ? ({ top: "top", bottom: "bottom", left: "right", right: "left" } as const)[s]
      : ({ top: "bottom", bottom: "top", left: "right", right: "left" } as const)[s];
    return { t, o: SIDES.indexOf(m) };
  }
  if (t === "leaf") return { t, o: o === 0 ? 1 : 0 }; // القطر ينعكس في الحالتين
  return tile;
}

function tilePath(tile: Tile, x: number, y: number, s: number): string | null {
  switch (tile.t) {
    case "square": return rect(x, y, s, s, s * 0.16);
    case "quarter": return quarter(x, y, s, CORNERS[tile.o]);
    case "half": return half(x, y, s, SIDES[tile.o]);
    case "circle": return circle(x + s / 2, y + s / 2, s * 0.42);
    case "tri": return tri(x, y, s, CORNERS[tile.o]);
    case "leaf": return leaf(x, y, s, tile.o === 0 ? "main" : "anti");
    default: return null;
  }
}

export function gridFamily(rng: RNG): FamilyResult {
  const s = 28, gap = 4, off = (100 - (3 * s + 2 * gap)) / 2;
  const palette: { t: TileType; w: number }[] = [
    { t: "empty", w: 2.2 }, { t: "square", w: 1 }, { t: "quarter", w: 2.4 }, { t: "half", w: 1.2 },
    { t: "circle", w: 0.8 }, { t: "tri", w: 1 }, { t: "leaf", w: 1.6 },
  ];
  const draw = () => {
    let r = rng() * palette.reduce((a, p) => a + p.w, 0);
    for (const p of palette) { r -= p.w; if (r <= 0) return p.t; }
    return "quarter" as TileType;
  };
  const mode: "h" | "r" = chance(rng, 0.55) ? "h" : "r";
  let grid: Tile[][] = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    grid = [[], [], []].map(() => [] as Tile[]);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) grid[row][col] = { t: "empty", o: 0 };
    const cells: [number, number][] = mode === "h"
      ? [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
      : [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]];
    for (const [r, c] of cells) {
      const tile: Tile = { t: draw(), o: int(rng, 0, 3) };
      if (tile.t === "leaf") tile.o = int(rng, 0, 1);
      grid[r][c] = tile;
      const [mr, mc] = mode === "h" ? [r, 2 - c] : [2 - r, 2 - c];
      if (mr !== r || mc !== c) grid[mr][mc] = mirrorTile(tile, mode);
    }
    const filled = grid.flat().filter((t) => t.t !== "empty").length;
    const corners = [grid[0][0], grid[0][2], grid[2][0], grid[2][2]].filter((t) => t.t !== "empty").length;
    const allSame = new Set(grid.flat().filter((t) => t.t !== "empty").map((t) => t.t)).size < 2;
    if (filled >= 5 && filled <= 7 && corners >= 2 && !allSame) break;
  }
  const shapes: LogoShape[] = [];
  const accentCell: [number, number] = grid[1][1].t !== "empty" ? [1, 1] : [int(rng, 0, 2), int(rng, 0, 2)];
  const secondaryOn = chance(rng, 0.5);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const d = tilePath(grid[r][c], off + c * (s + gap), off + r * (s + gap), s);
      if (!d) continue;
      let role: ShapeRole = "primary";
      if (r === accentCell[0] && c === accentCell[1]) role = "accent";
      else if (secondaryOn && (r + c) % 2 === 1) role = "secondary";
      shapes.push({ d, role });
    }
  if (!shapes.some((s) => s.role === "accent") && shapes.length) shapes[shapes.length - 1].role = "accent";
  return {
    shapes,
    title: "شبكة البناء",
    rationale: "تركيب على شبكة 3×3 تتكامل فيه الأقواس والزوايا بتناظر محسوب؛ يعبّر عن منهجية واضحة ونمو منظم، ويظل مقروءاً حتى بأصغر المقاسات.",
  };
}

// ───────────── 2) النجمة الهندسية (إسلامي/عربي متقدم) ─────────────
export function starFamily(rng: RNG): FamilyResult {
  const opts = [
    { n: 8, k: 3 }, { n: 8, k: 2 }, { n: 12, k: 5 }, { n: 12, k: 4 }, { n: 10, k: 3 }, { n: 10, k: 4 }, { n: 16, k: 6 },
  ];
  const { n, k } = pick(rng, opts);
  const ratio = Math.cos((Math.PI * k) / n) / Math.cos((Math.PI * (k - 1)) / n);
  const withRing = chance(rng, 0.4);
  const R = withRing ? 36 : 46;
  const rot = -90 + (chance(rng, 0.5) ? 180 / n : 0);
  const star = (Ro: number, ri: number, rotDeg: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i < n * 2; i++) pts.push(polar(50, 50, i % 2 === 0 ? Ro : ri, rotDeg + (i * 180) / n));
    return pts;
  };
  const shapes: LogoShape[] = [];
  const band = chance(rng, 0.5);
  const outer = star(R, R * ratio, rot);
  if (band) {
    const s2 = 0.78;
    const inner = star(R * s2, R * ratio * s2, rot);
    shapes.push({ d: polygon(outer) + polygon(inner), role: "primary" });
    const core = star(R * 0.5, R * ratio * 0.5, rot + 180 / n);
    shapes.push({ d: polygon(core), role: "secondary" });
  } else {
    shapes.push({ d: polygon(outer), role: "primary" });
    const ringPoly: Pt[] = [];
    for (let i = 0; i < n; i++) ringPoly.push(polar(50, 50, R * ratio * 0.86, rot + 180 / n + (i * 360) / n));
    shapes.push({ d: polygon(ringPoly), role: "secondary" });
  }
  shapes.push({ d: circle(50, 50, R * (band ? 0.16 : 0.2)), role: "accent" });
  if (withRing) {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 360) / n;
      const p: Pt[] = [polar(50, 50, 40, a), polar(50, 50, 44, a - 6), polar(50, 50, 48.5, a), polar(50, 50, 44, a + 6)];
      shapes.push({ d: polygon(p), role: "accent" });
    }
  }
  return {
    shapes,
    title: `النجمة ${n === 8 ? "الثمانية" : n === 10 ? "العشارية" : n === 12 ? "الاثنا عشرية" : "الستة عشرية"}`,
    rationale: `مستوحاة من هندسة الزخرفة الإسلامية {${n}/${k}} بنسب رياضية دقيقة؛ تمثل الاكتمال والتوازن والامتداد، بصياغة معاصرة نظيفة بعيداً عن الشارات التقليدية.`,
  };
}

// ───────────── 3) المدارات المتدرجة ─────────────
export function arcsFamily(rng: RNG): FamilyResult {
  const count = int(rng, 3, 4);
  const shapes: LogoShape[] = [];
  let r = 47;
  const roles: ShapeRole[] = ["primary", "secondary", "accent", "primary"];
  const baseStart = range(rng, 0, 360);
  const roundCaps = chance(rng, 0.6);
  const spans: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = range(rng, 6, 10) * (1 - i * 0.08);
    let span = range(rng, 150, 300);
    // منع التطابق: كل قوس يختلف بثلاثين درجة على الأقل عن السابق
    while (spans.some((s) => Math.abs(s - span) < 30)) span = range(rng, 150, 300);
    spans.push(span);
    const start = baseStart + i * range(rng, 40, 110);
    const r1 = r - t;
    shapes.push({ d: annularSector(50, 50, r1, r, start, start + span), role: roles[i] });
    if (roundCaps) {
      const mid = (r + r1) / 2;
      const [x0, y0] = polar(50, 50, mid, start);
      const [x1, y1] = polar(50, 50, mid, start + span);
      shapes.push({ d: circle(x0, y0, t / 2), role: roles[i] });
      shapes.push({ d: circle(x1, y1, t / 2), role: roles[i] });
    }
    r = r1 - range(rng, 3.5, 5.5);
  }
  if (r > 6) shapes.push({ d: circle(50, 50, Math.min(r - 1, range(rng, 6, 11))), role: "accent" });
  return {
    shapes,
    title: "المدارات المتدرجة",
    rationale: "حلقات غير مكتملة بأطوال وزوايا مختلفة تدور حول نواة واحدة؛ ترمز إلى الحركة المستمرة والانفتاح، وتتجنب الدوائر المزدوجة المتطابقة المستهلكة.",
  };
}

// ───────────── 4) الكتل المنظورية (ثلاثي الأبعاد/تقني) ─────────────
const CUBE_SETS: [number, number, number][][] = [
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]],
  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1], [2, 0, 1], [2, 0, 2]],
  [[0, 0, 0], [0, 0, 1], [0, 0, 2], [1, 0, 0], [0, 1, 0]],
  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [2, 1, 0], [0, 2, 0], [1, 2, 0], [2, 2, 0]],
  [[0, 0, 0], [1, 1, 0], [0, 0, 1], [1, 1, 1], [2, 2, 0]],
  [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [0, 0, 1]],
];
export function facetsFamily(rng: RNG): FamilyResult {
  let cubes = pick(rng, CUBE_SETS).map((c) => [...c] as [number, number, number]);
  if (chance(rng, 0.5)) cubes = cubes.map(([x, y, z]) => [y, x, z]);
  cubes.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[2] - b[2]);
  const proj = (x: number, y: number, z: number): Pt => [(x - y) * 0.8660254, (x + y) * 0.5 - z];
  const faces: { pts: Pt[]; role: ShapeRole }[] = [];
  for (const [i, j, k] of cubes) {
    faces.push({ role: "accent", pts: [proj(i, j, k + 1), proj(i + 1, j, k + 1), proj(i + 1, j + 1, k + 1), proj(i, j + 1, k + 1)] });
    faces.push({ role: "primary", pts: [proj(i + 1, j, k), proj(i + 1, j + 1, k), proj(i + 1, j + 1, k + 1), proj(i + 1, j, k + 1)] });
    faces.push({ role: "secondary", pts: [proj(i, j + 1, k), proj(i + 1, j + 1, k), proj(i + 1, j + 1, k + 1), proj(i, j + 1, k + 1)] });
  }
  const all = faces.flatMap((fc) => fc.pts);
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
  const sc = 90 / Math.max(maxX - minX, maxY - minY);
  const ox = 50 - ((minX + maxX) / 2) * sc, oy = 50 - ((minY + maxY) / 2) * sc;
  const shapes = faces.map((fc) => ({ role: fc.role, d: polygon(fc.pts.map(([x, y]) => [x * sc + ox, y * sc + oy] as Pt)) }));
  return {
    shapes,
    title: "الكتل المنظورية",
    rationale: "وحدات مكعبة متراكبة بمنظور متساوي القياس تشكّل بنية متماسكة؛ تعبر عن التقنية والبناء التراكمي والعمق، بثلاثة أوجه تتوزع عليها ألوان الهوية.",
  };
}

// ───────────── 5) البتلات الشعاعية ─────────────
export function petalsFamily(rng: RNG): FamilyResult {
  const n = pick(rng, [5, 6, 7, 8, 9]);
  const r0 = range(rng, 8, 13);
  const L = range(rng, 30, 35);
  const maxW = Math.tan(Math.PI / n) * (r0 + L / 2) * 0.9; // منع تداخل البتلات
  const w = Math.min(range(rng, 9, 16), maxW);
  const swirl = chance(rng, 0.45) ? range(rng, 0.25, 0.6) : 0;
  const rot = range(rng, 0, 360);
  const shapes: LogoShape[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    const base: Pt = [0, -r0], tip: Pt = [0, -(r0 + L)];
    const m = -(r0 + L / 2);
    const c1: Pt = [w * (1 + swirl), m + swirl * 6], c2: Pt = [-w * (1 - swirl * 0.8), m - swirl * 6];
    const tr = (p: Pt) => rotatePt([p[0] + 50, p[1] + 50], 50, 50, a);
    const [b, t, k1, k2] = [tr(base), tr(tip), tr(c1), tr(c2)];
    const d = `M${f(b[0])} ${f(b[1])}Q${f(k1[0])} ${f(k1[1])} ${f(t[0])} ${f(t[1])}Q${f(k2[0])} ${f(k2[1])} ${f(b[0])} ${f(b[1])}Z`;
    shapes.push({ d, role: n % 2 === 0 && i % 2 === 1 ? "secondary" : "primary" });
  }
  shapes.push({ d: circle(50, 50, r0 * 0.62), role: "accent" });
  return {
    shapes,
    title: swirl ? "الدوامة المزهرة" : "الزهرة الشعاعية",
    rationale: "بتلات تنطلق من مركز واحد بإيقاع متساوٍ؛ تعبّر عن النمو والعناية والضيافة، وتمنح العلامة دفئاً إنسانياً مع انضباط هندسي.",
  };
}

// ───────────── 6) الأعمدة والأقواس المعمارية ─────────────
export function barsFamily(rng: RNG): FamilyResult {
  const k = int(rng, 3, 5);
  const gap = range(rng, 4, 7);
  const total = 84;
  const w = (total - gap * (k - 1)) / k;
  const style = pick(rng, ["pill", "slant", "arch"] as const);
  const pattern = pick(rng, ["rise", "peak", "wave"] as const);
  const heights: number[] = [];
  for (let i = 0; i < k; i++) {
    const tpos = k === 1 ? 1 : i / (k - 1);
    let h = 0;
    if (pattern === "rise") h = 34 + tpos * 50;
    else if (pattern === "peak") h = 40 + (1 - Math.abs(tpos - 0.5) * 2) * 44;
    else h = 50 + Math.sin(tpos * Math.PI * 1.5 + rng()) * 22;
    heights.push(Math.min(84, Math.max(28, h)));
  }
  const bottom = 92;
  const shapes: LogoShape[] = [];
  const accentIdx = pattern === "rise" ? k - 1 : int(rng, 0, k - 1);
  for (let i = 0; i < k; i++) {
    const x = 8 + i * (w + gap), h = heights[i], y = bottom - h;
    let d: string;
    if (style === "pill") d = rect(x, y, w, h, w / 2);
    else if (style === "arch") {
      const r = w / 2;
      d = `M${f(x)} ${f(bottom)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(bottom)}Z`;
    } else {
      const cut = w * 0.9;
      d = polygon([[x, bottom], [x, y + cut], [x + w, y], [x + w, bottom]]);
    }
    shapes.push({ d, role: i === accentIdx ? "accent" : i % 2 ? "secondary" : "primary" });
  }
  const names = { pill: "الأعمدة الانسيابية", slant: "الصعود المائل", arch: "الأقواس المعمارية" };
  const why = {
    pill: "أعمدة بحواف ناعمة بإيقاع متدرج تعبّر عن الاستقرار والتقدم المحسوب.",
    slant: "قمم مائلة تتصل بصرياً في خط صاعد يوحي بالاتجاه والطموح دون اللجوء لأسهم مستهلكة.",
    arch: "أقواس مستلهمة من العمارة العربية التقليدية تتدرج في إيقاع منتظم؛ تجمع الأصالة بالبنية الحديثة.",
  };
  return { shapes, title: names[style], rationale: why[style] };
}

// ───────────── 7) العقدة الكوفية المربعة ─────────────
export function kuficFamily(rng: RNG): FamilyResult {
  const N = pick(rng, [7, 9]);
  const u = 88 / N, off = 6;
  const grid: (ShapeRole | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const rings = Math.floor(N / 4) + 1;
  for (let ri = 0; ri < rings; ri++) {
    const a = ri * 2, b = N - 1 - ri * 2;
    if (a > b) break;
    const role: ShapeRole = ri === 0 ? "primary" : ri === rings - 1 && a === b ? "accent" : "secondary";
    if (a === b) { grid[a][a] = "accent"; continue; }
    for (let i = a; i <= b; i++) { grid[a][i] = role; grid[b][i] = role; grid[i][a] = role; grid[i][b] = role; }
    // فتحة في الحلقة (ليست في الزاوية)
    const side = int(rng, 0, 3), pos = int(rng, a + 1, b - 1);
    const gapCell: [number, number] = side === 0 ? [a, pos] : side === 1 ? [pos, b] : side === 2 ? [b, pos] : [pos, a];
    grid[gapCell[0]][gapCell[1]] = null;
    // جسر يصل الحلقة بما بداخلها
    if (ri > 0) {
      const bs = (side + 2) % 4, bp = int(rng, a + 1, b - 1);
      const bridge: [number, number] = bs === 0 ? [a - 1, bp] : bs === 1 ? [bp, b + 1] : bs === 2 ? [b + 1, bp] : [bp, a - 1];
      grid[bridge[0]][bridge[1]] = "primary";
    }
  }
  const mid = (N - 1) / 2;
  if (!grid[mid][mid]) grid[mid][mid] = "accent";
  const shapes: LogoShape[] = [];
  const ov = 0.18;
  for (const role of ["primary", "secondary", "accent"] as ShapeRole[]) {
    let d = "";
    for (let r = 0; r < N; r++) {
      let c = 0;
      while (c < N) {
        if (grid[r][c] === role) {
          let e = c;
          while (e + 1 < N && grid[r][e + 1] === role) e++;
          d += rect(off + c * u - ov, off + r * u - ov, (e - c + 1) * u + 2 * ov, u + 2 * ov);
          c = e + 1;
        } else c++;
      }
    }
    if (d) shapes.push({ d, role });
  }
  return {
    shapes,
    title: "العقدة الكوفية",
    rationale: "متاهة مربعة مستوحاة من الخط الكوفي المربع، تتداخل حلقاتها عبر فتحات وجسور محسوبة؛ ترمز إلى الحكمة والترابط والعمق الثقافي.",
  };
}

export const FAMILIES: Partial<Record<LogoFamily, (rng: RNG) => FamilyResult>> = {
  grid: gridFamily,
  star: starFamily,
  arcs: arcsFamily,
  facets: facetsFamily,
  petals: petalsFamily,
  bars: barsFamily,
  kufic: kuficFamily,
};
