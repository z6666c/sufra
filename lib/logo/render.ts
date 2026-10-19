// بناء ملفات SVG للشعار: الأيقونة، الشعار الكامل (أفقي/عمودي)، الأحادي، أيقونة المفضلة
import type { LogoConcept, LogoShape, Palette, Typography } from "../types";
import { DEFAULT_TYPOGRAPHY, fontStack, fontStackFile, hasArabic } from "../fonts";
import { type Measurer, estimateMeasure } from "../measure";
import { bestTextOn } from "../color";
import { f } from "./geometry";

export interface SymbolColors { primary: string; secondary: string; accent: string }
export interface SymbolFonts { ar: string; en: string }

let uidCounter = 0;
const nextId = (p: string) => `${p}${(++uidCounter).toString(36)}`;

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const colorsOf = (p: Palette): SymbolColors => ({ primary: p.primary.hex, secondary: p.secondary.hex, accent: p.accent.hex });

/** خطوط الحروف داخل الرمز: متغيرات التطبيق أو أسماء الخطوط للملفات المستقلة */
let activeTypography: Typography = DEFAULT_TYPOGRAPHY;
/** خطوط الهوية النشطة في التطبيق (تُضبط عند عرض الهوية) */
export function setSymbolTypography(t?: Typography) { if (t) activeTypography = t; }
export function symbolFonts(t: Typography = activeTypography, mode: "app" | "file" = "app"): SymbolFonts {
  const fam = mode === "file" ? fontStackFile : fontStack;
  return { ar: fam(t.arabicHeading), en: fam(t.englishHeading) };
}

const attrStyle = (css: string) => esc(css).replace(/&quot;/g, "'");

/** عنصر SVG واحد لشكل */
function el(s: LogoShape, fill: string, fonts: SymbolFonts, defs: string[], forMask = false): string {
  const op = !forMask && s.opacity !== undefined && s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
  if (s.text) {
    const t = s.text;
    const style = `font-family:${t.script === "ar" ? fonts.ar : fonts.en};font-weight:${t.weight};font-size:${f(t.size)}px${t.letterSpacing ? `;letter-spacing:${t.letterSpacing}em` : ""}`;
    const stroke = s.stroke ? ` stroke="${fill}" stroke-width="${s.stroke}" stroke-linejoin="round"` : "";
    return `<text x="${f(t.x)}" y="${f(t.y)}" text-anchor="middle" dominant-baseline="central" fill="${fill}"${stroke}${op} style="${attrStyle(style)}">${esc(t.value)}</text>`;
  }
  if (s.textPath) {
    const t = s.textPath, id = nextId("bfp");
    defs.push(`<path id="${id}" d="M${f(50 - t.r)} 50A${f(t.r)} ${f(t.r)} 0 1 1 ${f(50 + t.r)} 50A${f(t.r)} ${f(t.r)} 0 1 1 ${f(50 - t.r)} 50"/>`);
    const style = `font-family:${t.script === "ar" ? fonts.ar : fonts.en};font-weight:${t.weight};font-size:${f(t.size)}px${t.letterSpacing ? `;letter-spacing:${t.letterSpacing}em` : ""}`;
    return `<text fill="${fill}" dominant-baseline="central"${op} style="${attrStyle(style)}"><textPath href="#${id}" startOffset="${t.offset ?? 25}%" text-anchor="middle">${esc(t.value)}</textPath></text>`;
  }
  if (s.stroke) return `<path d="${s.d}" fill="none" stroke="${fill}" stroke-width="${s.stroke}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
  return `<path d="${s.d}" fill="${fill}" fill-rule="evenodd"${op}/>`;
}

/** محتوى الرمز داخل مربع 0..100 — يدعم الاقتطاع (مساحة سالبة) والطبقة العلوية والنصوص */
/** شعار SVG مولّد بالذكاء الاصطناعي داخل مربع 0..100 — معرفات فريدة لكل عرض، والأحادي عبر مرشّح لون */
function aiSvgInner(concept: LogoConcept, mono: string | undefined, fonts: SymbolFonts): string {
  const svg = concept.svg!;
  const p = nextId("bfa");
  const markup = svg.markup
    .replace(/\bid="([^"]+)"/g, (_m, id) => `id="${p}-${id}"`)
    .replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g, (_m, id) => `url(#${p}-${id})`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, (_m, a, id) => `${a}="#${p}-${id}"`);
  const font = `font-family:${fonts.ar}`;
  const body = `<svg x="2" y="2" width="96" height="96" viewBox="${svg.viewBox}" preserveAspectRatio="xMidYMid meet" style="overflow:visible;${attrStyle(font)}">${markup}</svg>`;
  if (!mono) return body;
  const fid = `${p}-mono`;
  return `<defs><filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 1 0" result="ink"/><feComponentTransfer in="ink" result="cut"><feFuncA type="discrete" tableValues="0 1 1 1 1 1 1 1 1 1 1 1"/></feComponentTransfer><feFlood flood-color="${mono}"/><feComposite in2="cut" operator="in"/></filter></defs><g filter="url(#${fid})">${body}</g>`;
}

export function symbolInner(concept: LogoConcept, colors: SymbolColors | null, mono?: string, fonts: SymbolFonts = symbolFonts()): string {
  if (concept.svg) return aiSvgInner(concept, mono, fonts);
  const ink = mono ?? "#000";
  const color = (s: LogoShape) => (!mono && colors ? colors[s.role] : ink);
  const defs: string[] = [];
  const legacy = !concept.shapes.some((s) => s.knock || s.layer || s.text || s.textPath || s.stroke);

  if (mono && legacy && concept.family === "star") {
    const id = nextId("bfm");
    const base = concept.shapes.filter((s) => s.role === "primary");
    const knock = concept.shapes.filter((s) => s.role === "secondary");
    const top = concept.shapes.filter((s) => s.role === "accent");
    return (
      `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="110"><rect x="-5" y="-5" width="110" height="110" fill="#fff"/>` +
      knock.map((s) => `<path d="${s.d}" fill="#000" fill-rule="evenodd"/>`).join("") +
      `</mask></defs><g mask="url(#${id})">${base.map((s) => el(s, ink, fonts, defs)).join("")}</g>` +
      top.map((s) => el(s, ink, fonts, defs)).join("")
    );
  }
  if (mono && legacy && concept.family === "facets") {
    // قناع تراكمي بترتيب الرسام: كل وجه يغطي حواف ما خلفه، فتبقى فواصل الأوجه المرئية فقط
    const id = nextId("bfm");
    return (
      `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="110"><rect x="-5" y="-5" width="110" height="110" fill="#000"/>` +
      concept.shapes.map((s) => `<path d="${s.d}" fill="#fff" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/>`).join("") +
      `</mask></defs><rect x="-5" y="-5" width="110" height="110" fill="${ink}" mask="url(#${id})"/>`
    );
  }

  const knocks = concept.shapes.filter((s) => s.knock);
  const base = concept.shapes.filter((s) => !s.knock && !s.layer);
  const top = concept.shapes.filter((s) => !s.knock && s.layer === 1);
  // في النسخة الأحادية: أشكال الطبقة العلوية تُفصل عمّا تحتها بحدّ مقتطع رفيع
  const monoSeparators = mono ? top.filter((s) => !s.stroke && !s.textPath) : [];
  let body: string;
  if (knocks.length || monoSeparators.length) {
    const id = nextId("bfk");
    const maskParts = knocks.map((s) => el({ ...s, opacity: undefined }, "#000", fonts, defs, true)).join("") +
      monoSeparators.map((s) => (s.text ? el({ ...s, stroke: 3.2, opacity: undefined }, "#000", fonts, defs, true) : `<path d="${s.d}" fill="#000" stroke="#000" stroke-width="2.4"/>`)).join("");
    body =
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${maskParts}</mask>` +
      `<g mask="url(#${id})">${base.map((s) => el(s, color(s), fonts, defs)).join("")}</g>` +
      top.map((s) => el(s, color(s), fonts, defs)).join("");
  } else {
    body = [...base, ...top].map((s) => el(s, color(s), fonts, defs)).join("");
  }
  return (defs.length ? `<defs>${defs.join("")}</defs>` : "") + body;
}

/** رمز بلون واحد (للأنماط الزخرفية والعلامات المائية) */
export function symbolFlat(concept: LogoConcept, color: string, fonts?: SymbolFonts): string {
  return symbolInner(concept, null, color, fonts);
}

export function iconSvg(concept: LogoConcept, palette: Palette, opts: { mono?: string; size?: number; typography?: Typography; fontMode?: "app" | "file" } = {}): string {
  const size = opts.size ?? 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${symbolInner(concept, colorsOf(palette), opts.mono, symbolFonts(opts.typography, opts.fontMode))}</svg>`;
}

export function faviconSvg(concept: LogoConcept, palette: Palette, size = 64, typography?: Typography, fontMode: "app" | "file" = "app"): string {
  const bg = palette.primary.hex;
  const fg = bestTextOn(bg, palette.neutralLight.hex, palette.neutralDark.hex);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">` +
    `<rect width="100" height="100" rx="22" fill="${bg}"/>` +
    `<g transform="translate(17 17) scale(0.66)">${symbolInner(concept, null, fg, symbolFonts(typography, fontMode))}</g></svg>`
  );
}

export type LockupLayout = "horizontal" | "vertical";
export type LockupVariant = "color" | "mono-dark" | "mono-light" | "reverse";

export interface LockupOptions {
  concept: LogoConcept;
  palette: Palette;
  typography: Typography;
  name: string;
  nameEn?: string;
  tagline?: string;
  layout: LockupLayout;
  variant?: LockupVariant;
  fontMode?: "app" | "file";
  measure?: Measurer;
  showTagline?: boolean;
}

interface Line { text: string; font: string; weight: number; size: number; fill: string; ls: number; lh: number }

/** الشعار الكامل: رمز + اسم (+ الاسم اللاتيني + الشعار اللفظي) */
export function lockupSvg(o: LockupOptions): { svg: string; width: number; height: number } {
  const measure = o.measure ?? estimateMeasure;
  const variant = o.variant ?? "color";
  const fam = o.fontMode === "file" ? fontStackFile : fontStack;
  const p = o.palette;
  const textColor = variant === "mono-dark" ? "#111111" : variant === "mono-light" || variant === "reverse" ? "#FFFFFF" : p.neutralDark.hex;
  const muted = variant === "color" ? p.secondary.hex : textColor;
  const iconMono = variant === "mono-dark" ? "#111111" : variant === "mono-light" || variant === "reverse" ? "#FFFFFF" : undefined;

  const ar = hasArabic(o.name);
  const lines: Line[] = [];
  const headFont = ar ? o.typography.arabicHeading : o.typography.englishHeading;
  const big = o.layout === "horizontal" ? 46 : 40;
  lines.push({ text: o.name, font: fam(headFont), weight: 700, size: big, fill: textColor, ls: 0, lh: ar ? 1.35 : 1.15 });
  if (o.nameEn && ar) {
    lines.push({ text: o.nameEn.toUpperCase(), font: fam(o.typography.englishHeading), weight: 600, size: big * 0.42, fill: textColor, ls: 0.18, lh: 1.5 });
  }
  if (o.tagline && o.showTagline !== false) {
    const tAr = hasArabic(o.tagline);
    lines.push({ text: o.tagline, font: fam(tAr ? o.typography.arabicBody : o.typography.englishBody), weight: 400, size: big * 0.38, fill: muted, ls: 0, lh: 1.6 });
  }
  const widths = lines.map((l) => measure(l.text, l.font, l.weight, l.size, l.ls) + (l.ls ? -l.ls * l.size : 0));
  const textW = Math.max(...widths);
  const blockH = lines.reduce((s, l) => s + l.size * l.lh, 0);

  const icon = 100, pad = 6;
  let width: number, height: number, iconX: number, iconY: number, textCx: number, textTop: number;
  if (o.layout === "horizontal") {
    const gap = 26;
    width = icon + gap + textW + pad * 2;
    height = Math.max(icon, blockH) + pad * 2;
    iconY = (height - icon) / 2;
    textTop = (height - blockH) / 2;
    if (ar) { iconX = width - pad - icon; textCx = pad + textW / 2; }
    else { iconX = pad; textCx = pad + icon + gap + textW / 2; }
  } else {
    const gap = 18;
    width = Math.max(icon, textW) + pad * 2;
    height = icon + gap + blockH + pad * 2;
    iconX = (width - icon) / 2;
    iconY = pad;
    textTop = pad + icon + gap;
    textCx = width / 2;
  }
  let y = textTop;
  const texts = lines.map((l) => {
    const lineH = l.size * l.lh;
    const baseline = y + lineH / 2 + l.size * 0.34;
    y += lineH;
    const style = `font-family:${l.font};font-weight:${l.weight};font-size:${f(l.size)}px${l.ls ? `;letter-spacing:${l.ls}em` : ""}`;
    return `<text x="${f(textCx)}" y="${f(baseline)}" text-anchor="middle" fill="${l.fill}" style="${esc(style).replace(/&quot;/g, "'")}">${esc(l.text)}</text>`;
  });
  const bg = variant === "reverse" ? `<rect width="${f(width)}" height="${f(height)}" fill="${p.primary.hex}"/>` : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${f(height)}" width="${f(width * 2)}" height="${f(height * 2)}">` +
    bg +
    `<g transform="translate(${f(iconX)} ${f(iconY)})">${symbolInner(o.concept, colorsOf(p), iconMono, symbolFonts(o.typography, o.fontMode ?? "app"))}</g>` +
    texts.join("") +
    `</svg>`;
  return { svg, width, height };
}
