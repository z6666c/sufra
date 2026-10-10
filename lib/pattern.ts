// عنصر الزخرفة المتكرر (Brand Pattern) — مشتق من هندسة الرمز المختار
import type { LogoConcept, Typography } from "./types";
import { mulberry32 } from "./random";
import { symbolFlat, symbolFonts } from "./logo/render";
import { f } from "./logo/geometry";

export interface PatternOpts { color: string; opacity?: number; scale?: number; id: string; typography?: Typography; fontMode?: "app" | "file" }

/** يعيد عنصر <pattern> جاهزاً للاستخدام عبر fill="url(#id)" */
export function patternDef(concept: LogoConcept, o: PatternOpts): string {
  const spec = concept.pattern;
  const T = spec.tile * (o.scale ?? 1);
  const op = o.opacity ?? 1;
  if (spec.mode === "truchet") {
    const rng = mulberry32(spec.seed);
    const n = 4, c = (T * 2) / n, h = c / 2, sw = c * 0.16;
    let d = "";
    for (let r = 0; r < n; r++)
      for (let k = 0; k < n; k++) {
        const x = k * c, y = r * c;
        if (rng() < 0.5) {
          d += `M${f(x + h)} ${f(y)}A${f(h)} ${f(h)} 0 0 1 ${f(x)} ${f(y + h)}`;
          d += `M${f(x + h)} ${f(y + c)}A${f(h)} ${f(h)} 0 0 1 ${f(x + c)} ${f(y + h)}`;
        } else {
          d += `M${f(x + c)} ${f(y + h)}A${f(h)} ${f(h)} 0 0 1 ${f(x + h)} ${f(y)}`;
          d += `M${f(x)} ${f(y + h)}A${f(h)} ${f(h)} 0 0 1 ${f(x + h)} ${f(y + c)}`;
        }
      }
    return `<pattern id="${o.id}" width="${f(T * 2)}" height="${f(T * 2)}" patternUnits="userSpaceOnUse"><path d="${d}" fill="none" stroke="${o.color}" stroke-width="${f(sw)}" stroke-linecap="round" opacity="${op}"/></pattern>`;
  }
  const sym = symbolFlat(concept, o.color, symbolFonts(o.typography, o.fontMode));
  const place = (x: number, y: number, size: number, rot = 0) =>
    `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${rot})` : ""} scale(${f(size / 100)}) translate(-50 -50)">${sym}</g>`;
  if (spec.mode === "lattice") {
    const s = T * 0.56;
    const body = place(T / 2, T / 2, s) + [[0, 0], [T, 0], [0, T], [T, T]].map(([x, y]) => place(x, y, s * 0.62, spec.rotateAlt ? 45 : 0)).join("");
    return `<pattern id="${o.id}" width="${f(T)}" height="${f(T)}" patternUnits="userSpaceOnUse"><g opacity="${op}">${body}</g></pattern>`;
  }
  const s = T * 0.4;
  const body = place(T * 0.25, T * 0.25, s) + place(T * 0.75, T * 0.75, s, spec.rotateAlt ? 45 : 180);
  return `<pattern id="${o.id}" width="${f(T)}" height="${f(T)}" patternUnits="userSpaceOnUse"><g opacity="${op}">${body}</g></pattern>`;
}

/** ملف SVG مستقل للنمط */
let pc = 0;
export function patternSvg(concept: LogoConcept, fg: string, bg: string, w = 800, h = 800, scale = 1, opacity = 1, typography?: Typography): string {
  const id = `bfp${(++pc).toString(36)}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"><defs>${patternDef(concept, { color: fg, id, scale, opacity, typography, fontMode: typography ? "file" : "app" })}</defs>` +
    `<rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#${id})"/></svg>`
  );
}
