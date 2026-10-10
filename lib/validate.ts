// طبقة التحقق الهيكلي (Validation Layer)
import type { LogoShape, Palette, PaletteKey, SwatchFull } from "./types";
import {
  adjustForContrast, arabicColorName, cmykString, contrastRatio, hexToOklch, nearestPantone, normalizeHex, oklchToHex, wcagLevel,
} from "./color";

/** سلامة المسارات المتجهية: أرقام صالحة، داخل الإطار، دون تكرار متطابق */
export function validateShapes(shapes: LogoShape[]): { ok: boolean; shapes: LogoShape[]; issues: string[] } {
  const issues: string[] = [];
  const seen = new Set<string>();
  const out: LogoShape[] = [];
  for (const s of shapes) {
    if (s.text || s.textPath) {
      const t = s.text ?? s.textPath!;
      if (!t.value || !Number.isFinite(t.size)) { issues.push("نص غير صالح"); continue; }
      out.push(s);
      continue;
    }
    if (!s.d || /NaN|Infinity|undefined/.test(s.d)) { issues.push("مسار غير صالح"); continue; }
    const key = s.d + s.role + (s.knock ? "k" : "") + (s.layer ?? 0);
    if (seen.has(key)) { issues.push("شكل مكرر حُذف"); continue; }
    seen.add(key);
    // فحص الإحداثيات المطلقة فقط (بعد أوامر M/L/A/H/V الكبيرة) — تقريبي
    const abs = s.d.match(/[ML]\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g) ?? [];
    for (const m of abs) {
      const [x, y] = m.slice(1).trim().split(/\s+/).map(Number);
      if (x < -6 || x > 106 || y < -6 || y > 106) issues.push("شكل خارج الإطار");
    }
    out.push(s);
  }
  const fatal = issues.some((i) => i !== "شكل مكرر حُذف");
  return { ok: !fatal && out.length > 0, shapes: out, issues };
}

const FULL: PaletteKey[] = ["primary", "secondary", "accent"];

/** توحيد الألوان وإعادة حساب CMYK وPantone محلياً، وتصحيح التباين تلقائياً */
export function normalizePalette(p: Partial<Palette> | undefined, fallback: Palette): { palette: Palette; notes: string[] } {
  const notes: string[] = [];
  const hexOf = (k: PaletteKey) => normalizeHex((p?.[k] as SwatchFull | undefined)?.hex ?? "") ?? fallback[k].hex;
  let light = hexOf("neutralLight");
  let dark = hexOf("neutralDark");

  // الخلفية الفاتحة يجب أن تكون فاتحة فعلاً والداكنة داكنة
  const lo = hexToOklch(light);
  if (lo.l < 0.9) { light = oklchToHex({ ...lo, l: 0.965, c: Math.min(lo.c, 0.02) }); notes.push("رُفعت إضاءة اللون المحايد الفاتح لضمان خلفية نظيفة."); }
  if (contrastRatio(dark, light) < 7) { dark = adjustForContrast(dark, light, 7); notes.push("عُمّق اللون المحايد الداكن لبلوغ تباين AAA للنصوص."); }

  const swatch = (k: "primary" | "secondary" | "accent"): SwatchFull => {
    let hex = hexOf(k);
    let adjusted = false;
    const minC = k === "accent" ? 2 : 3;
    if (contrastRatio(hex, light) < minC) {
      adjusted = true;
      hex = adjustForContrast(hex, light, minC);
      notes.push(`عُدّل اللون ${k === "primary" ? "الرئيسي" : k === "secondary" ? "الثانوي" : "التمييزي"} ليحقق تبايناً كافياً على الخلفية الفاتحة.`);
    }
    const given = (p?.[k] as SwatchFull | undefined)?.name;
    return { hex, cmyk: cmykString(hex), pantone: nearestPantone(hex), name: !adjusted && given && given.length < 30 ? given : arabicColorName(hex) };
  };

  const palette: Palette = {
    primary: swatch("primary"),
    secondary: swatch("secondary"),
    accent: swatch("accent"),
    neutralDark: { hex: dark, cmyk: cmykString(dark) },
    neutralLight: { hex: light, cmyk: cmykString(light) },
  };
  return { palette, notes };
}

export function refreshSwatch(key: PaletteKey, hex: string, prev: Palette): Palette {
  const h = normalizeHex(hex);
  if (!h) return prev;
  if (FULL.includes(key)) {
    return { ...prev, [key]: { hex: h, cmyk: cmykString(h), pantone: nearestPantone(h), name: arabicColorName(h) } };
  }
  return { ...prev, [key]: { hex: h, cmyk: cmykString(h) } };
}

export interface ContrastRow { label: string; fg: string; bg: string; ratio: number; level: string }
export function contrastReport(p: Palette): ContrastRow[] {
  const rows: [string, string, string][] = [
    ["نص داكن على خلفية فاتحة", p.neutralDark.hex, p.neutralLight.hex],
    ["الرئيسي على الفاتح", p.primary.hex, p.neutralLight.hex],
    ["الفاتح على الرئيسي", p.neutralLight.hex, p.primary.hex],
    ["الثانوي على الفاتح", p.secondary.hex, p.neutralLight.hex],
    ["التمييزي على الداكن", p.accent.hex, p.neutralDark.hex],
    ["الفاتح على الداكن", p.neutralLight.hex, p.neutralDark.hex],
  ];
  return rows.map(([label, fg, bg]) => {
    const ratio = contrastRatio(fg, bg);
    return { label, fg, bg, ratio, level: wcagLevel(ratio) };
  });
}
