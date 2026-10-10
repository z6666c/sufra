// نظام الألوان: تحويلات OKLCH، فحص التباين WCAG، CMYK، أقرب Pantone، تسمية عربية

export interface RGB { r: number; g: number; b: number } // 0..255
export interface OKLCH { l: number; c: number; h: number }

export function normalizeHex(input: string): string | null {
  if (!input) return null;
  let h = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return "#" + h.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const h = (normalizeHex(hex) ?? "#000000").slice(1);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return ("#" + c(r) + c(g) + c(b)).toUpperCase();
}

const toLinear = (v: number) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const fromLinear = (x: number) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: Math.sqrt(A * A + B * B), h };
}

function oklchToLinear({ l: L, c, h }: OKLCH) {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** تحويل OKLCH إلى HEX مع إسقاط داخل نطاق sRGB بتقليل التشبع */
export function oklchToHex(col: OKLCH): string {
  let c = col.c;
  for (let i = 0; i < 40; i++) {
    const lin = oklchToLinear({ ...col, c });
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) {
      return rgbToHex({ r: fromLinear(Math.max(0, lin[0])), g: fromLinear(Math.max(0, lin[1])), b: fromLinear(Math.max(0, lin[2])) });
    }
    c *= 0.93;
  }
  const lin = oklchToLinear({ ...col, c: 0 });
  return rgbToHex({ r: fromLinear(lin[0]), g: fromLinear(lin[1]), b: fromLinear(lin[2]) });
}

export const hexToOklch = (hex: string) => rgbToOklch(hexToRgb(hex));

// ── WCAG ──
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
export type WcagLevel = "AAA" | "AA" | "AA كبير" | "غير مجتاز";
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA كبير";
  return "غير مجتاز";
}
/** لون النص الأنسب فوق خلفية معينة */
export function bestTextOn(bg: string, light = "#FFFFFF", dark = "#111111"): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

/** تعديل الإضاءة حتى بلوغ نسبة تباين مستهدفة مقابل لون مرجعي */
export function adjustForContrast(hex: string, against: string, target: number): string {
  if (contrastRatio(hex, against) >= target) return hex;
  const base = hexToOklch(hex);
  const goDarker = luminance(against) > 0.4;
  let cur = hex;
  for (let i = 1; i <= 60; i++) {
    const l = Math.min(0.99, Math.max(0.03, base.l + (goDarker ? -1 : 1) * i * 0.012));
    cur = oklchToHex({ ...base, l });
    if (contrastRatio(cur, against) >= target) return cur;
  }
  return cur;
}

// ── CMYK (تحويل أولي غير مُدار لونياً — للمرجع فقط، والاعتماد النهائي لدى المطبعة) ──
export function hexToCmyk(hex: string): [number, number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const k = 1 - Math.max(R, G, B);
  if (k >= 0.999) return [0, 0, 0, 100];
  const c = (1 - R - k) / (1 - k), m = (1 - G - k) / (1 - k), y = (1 - B - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)) as [number, number, number, number];
}
export const cmykString = (hex: string) => {
  const [c, m, y, k] = hexToCmyk(hex);
  return `C${c} M${m} Y${y} K${k}`;
};
export const rgbString = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `R${r} G${g} B${b}`;
};

// ── Pantone تقريبي (قيم شاشة مرجعية مقربة لدرجات Coated) ──
const PANTONE: [string, string][] = [
  ["Yellow C", "#FEDD00"], ["109 C", "#FFD100"], ["116 C", "#FFCD00"], ["123 C", "#FFC72C"], ["130 C", "#F2A900"],
  ["137 C", "#FFA300"], ["144 C", "#ED8B00"], ["151 C", "#FF8200"], ["165 C", "#FF6720"], ["172 C", "#FA4616"],
  ["179 C", "#E03C31"], ["485 C", "#DA291C"], ["186 C", "#C8102E"], ["199 C", "#D50032"], ["200 C", "#BA0C2F"],
  ["201 C", "#9D2235"], ["202 C", "#862633"], ["7421 C", "#651C32"], ["7427 C", "#97233F"], ["219 C", "#DA1884"],
  ["213 C", "#E31C79"], ["226 C", "#D0006F"], ["189 C", "#F8A3BC"], ["7416 C", "#E5554F"], ["7417 C", "#E04E39"],
  ["2685 C", "#330072"], ["2597 C", "#5C068C"], ["266 C", "#753BBD"], ["2665 C", "#9063CD"], ["7446 C", "#9595D2"],
  ["7658 C", "#6A3460"], ["7674 C", "#878CB4"], ["2728 C", "#0047BB"], ["286 C", "#0033A0"], ["287 C", "#003087"],
  ["288 C", "#002D72"], ["289 C", "#0C2340"], ["2767 C", "#13294B"], ["282 C", "#041E42"], ["300 C", "#005EB8"],
  ["2935 C", "#0057B8"], ["285 C", "#0072CE"], ["299 C", "#00A3E0"], ["2925 C", "#009CDE"], ["3005 C", "#0077C8"],
  ["7462 C", "#00558C"], ["7699 C", "#34657F"], ["5405 C", "#4F758B"], ["3015 C", "#00629B"], ["7704 C", "#0085AD"],
  ["3125 C", "#00AEC7"], ["320 C", "#009CA6"], ["3272 C", "#00A499"], ["3285 C", "#009681"], ["3305 C", "#004F3D"],
  ["3435 C", "#154734"], ["342 C", "#006747"], ["348 C", "#00843D"], ["355 C", "#009639"], ["361 C", "#43B02A"],
  ["376 C", "#84BD00"], ["382 C", "#C4D600"], ["390 C", "#B5BD00"], ["5743 C", "#3E4827"], ["7737 C", "#6BA539"],
  ["7741 C", "#44883E"], ["7727 C", "#007749"], ["567 C", "#17453F"], ["5535 C", "#183029"], ["7473 C", "#1E988A"],
  ["7474 C", "#00778B"], ["7475 C", "#487A7B"], ["7476 C", "#0D5257"], ["5463 C", "#00313C"], ["7546 C", "#253746"],
  ["432 C", "#333F48"], ["433 C", "#1D252D"], ["Black C", "#2D2926"], ["Black 6 C", "#101820"], ["7547 C", "#131E29"],
  ["Cool Gray 11 C", "#53565A"], ["Cool Gray 7 C", "#97999B"], ["Cool Gray 1 C", "#D9D9D6"], ["Warm Gray 1 C", "#D7D2CB"],
  ["Warm Gray 7 C", "#968C83"], ["7527 C", "#D6D2C4"], ["7529 C", "#B7A99A"], ["4685 C", "#E0C6AD"], ["7502 C", "#CEB888"],
  ["4655 C", "#AD7C59"], ["7516 C", "#A45A2A"], ["4625 C", "#4F2C1D"], ["1675 C", "#A9431E"], ["7579 C", "#DC582A"],
  ["7577 C", "#E07E3C"], ["7408 C", "#F6BE00"], ["7406 C", "#F1C400"], ["7553 C", "#5A4522"], ["7562 C", "#BD9B60"],
  ["465 C", "#B9975B"], ["7509 C", "#D6A461"], ["7522 C", "#C66E4E"], ["7623 C", "#8A2A2B"], ["7752 C", "#CFB500"],
];
export function nearestPantone(hex: string): string {
  const t = hexToOklch(hex);
  const ta = t.c * Math.cos((t.h * Math.PI) / 180), tb = t.c * Math.sin((t.h * Math.PI) / 180);
  let best = PANTONE[0][0], bd = Infinity;
  for (const [name, ph] of PANTONE) {
    const p = hexToOklch(ph);
    const pa = p.c * Math.cos((p.h * Math.PI) / 180), pb = p.c * Math.sin((p.h * Math.PI) / 180);
    const d = (t.l - p.l) ** 2 + (ta - pa) ** 2 + (tb - pb) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return `PANTONE ${best} (تقريبي)`;
}

// ── تسمية عربية للون ──
const HUE_NAMES: [number, [string, string, string]][] = [
  [20, ["عنابي داكن", "توتي", "وردي ناعم"]],
  [40, ["أحمر قرميدي", "مرجاني", "مرجاني فاتح"]],
  [65, ["بني طوبي", "برتقالي ترابي", "مشمشي"]],
  [90, ["برونزي", "ذهبي صحراوي", "رملي"]],
  [115, ["زيتوني داكن", "خردلي", "قشّي"]],
  [150, ["أخضر زيتي", "أخضر ليموني", "أخضر نعناعي"]],
  [175, ["أخضر زمردي", "أخضر نخيلي", "أخضر ندي"]],
  [205, ["بترولي", "فيروزي", "تركوازي فاتح"]],
  [235, ["أزرق بحري", "أزرق محيطي", "سماوي"]],
  [265, ["أزرق ليلي", "أزرق ملكي", "أزرق ضبابي"]],
  [300, ["نيلي عميق", "بنفسجي", "لافندر"]],
  [340, ["أرجواني ملكي", "أرجواني", "ليلكي"]],
  [361, ["عنابي داكن", "توتي", "وردي ناعم"]],
];
export function arabicColorName(hex: string): string {
  const { l, c, h } = hexToOklch(hex);
  if (c < 0.03) {
    if (l > 0.93) return "أبيض عاجي";
    if (l > 0.8) return "رمادي لؤلؤي";
    if (l > 0.55) return "رمادي حجري";
    if (l > 0.3) return "رمادي فحمي";
    return "أسود حبري";
  }
  const names = HUE_NAMES.find(([max]) => h < max)![1];
  return l < 0.45 ? names[0] : l > 0.78 ? names[2] : names[1];
}
