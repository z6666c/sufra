// أزواج الخطوط المعتمدة (حسب الوثيقة) وربطها بمتغيرات CSS التي يحمّلها next/font

export const FONTS = {
  "Readex Pro": { cssVar: "--font-readex-pro", role: "arabicHeading" },
  Tajawal: { cssVar: "--font-tajawal", role: "arabicHeading" },
  "IBM Plex Sans Arabic": { cssVar: "--font-plex-arabic", role: "arabicBody" },
  Inter: { cssVar: "--font-inter", role: "englishHeading" },
  Outfit: { cssVar: "--font-outfit", role: "englishHeading" },
  "Plus Jakarta Sans": { cssVar: "--font-jakarta", role: "englishBody" },
} as const;

export type FontName = keyof typeof FONTS;

export const FONT_CHOICES = {
  arabicHeading: ["Readex Pro", "Tajawal"],
  arabicBody: ["IBM Plex Sans Arabic"],
  englishHeading: ["Inter", "Outfit"],
  englishBody: ["Plus Jakarta Sans"],
} as const;

export const DEFAULT_TYPOGRAPHY = {
  arabicHeading: "Readex Pro",
  arabicBody: "IBM Plex Sans Arabic",
  englishHeading: "Inter",
  englishBody: "Plus Jakarta Sans",
};

/** سلسلة CSS للاستخدام داخل التطبيق (تعمل مع الأسماء المعمّاة لـ next/font) */
export function fontStack(name: string): string {
  const f = FONTS[name as FontName];
  return f ? `var(${f.cssVar}), '${name}', system-ui, sans-serif` : `'${name}', system-ui, sans-serif`;
}

/** سلسلة صالحة للملفات المستقلة (SVG المصدَّر) */
export function fontStackFile(name: string): string {
  return `'${name}', 'IBM Plex Sans Arabic', Arial, sans-serif`;
}

/** التحقق من أن الخط ضمن القائمة المعتمدة وإلا استخدام البديل */
export function sanitizeTypography(t: Partial<Record<keyof typeof FONT_CHOICES, string>> | undefined) {
  const out = { ...DEFAULT_TYPOGRAPHY };
  if (!t) return out;
  (Object.keys(FONT_CHOICES) as (keyof typeof FONT_CHOICES)[]).forEach((k) => {
    const v = t[k];
    const match = (FONT_CHOICES[k] as readonly string[]).find((n) => v && v.toLowerCase().includes(n.toLowerCase()));
    if (match) out[k] = match as never;
  });
  return out;
}

export const hasArabic = (s?: string) => !!s && /[؀-ۿ]/.test(s);
