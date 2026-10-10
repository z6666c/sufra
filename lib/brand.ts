// توليد هوية المطعم/المقهى بمحرك BrandForge (ألوان + 3 مفاهيم شعار)
import type { IntakeInput, MenuBrand, Venue, VenueType } from "./types";
import { mulberry32, range, pick, chance } from "./random";
import { oklchToHex } from "./color";
import { normalizePalette } from "./validate";
import { generateConcepts } from "./logo";

const VENUE_STYLE: Record<VenueType, { hues: [number, number]; c: [number, number]; style: IntakeInput["visualStyle"] }> = {
  cafe: { hues: [45, 75], c: [0.05, 0.09], style: "minimal" },
  restaurant: { hues: [25, 55], c: [0.1, 0.15], style: "islamic" },
  burger: { hues: [22, 40], c: [0.15, 0.19], style: "geometric" },
  bakery: { hues: [60, 90], c: [0.07, 0.11], style: "minimal" },
  juice: { hues: [120, 160], c: [0.11, 0.15], style: "geometric" },
  seafood: { hues: [200, 240], c: [0.09, 0.13], style: "minimal" },
};

export function venuePalette(type: VenueType, seed: number, custom?: string) {
  const rng = mulberry32(seed ^ 0x5f3759df);
  const v = VENUE_STYLE[type];
  const h = range(rng, v.hues[0], v.hues[1]);
  const c = range(rng, v.c[0], v.c[1]);
  const l = type === "burger" ? range(rng, 0.5, 0.58) : range(rng, 0.32, 0.45);
  const primary = custom ?? oklchToHex({ l, c, h });
  const secondary = oklchToHex({ l: l < 0.45 ? range(rng, 0.6, 0.7) : range(rng, 0.3, 0.38), c: c * 0.75, h: h + range(rng, -30, 30) });
  const accent = oklchToHex({ l: range(rng, 0.72, 0.8), c: 0.11, h: (h + pick(rng, [-30, 30, 95, 120]) + 360) % 360 });
  const raw = {
    primary: { hex: primary, cmyk: "", pantone: "", name: "" },
    secondary: { hex: secondary, cmyk: "", pantone: "", name: "" },
    accent: { hex: accent, cmyk: "", pantone: "", name: "" },
    neutralDark: { hex: oklchToHex({ l: 0.2, c: 0.02, h }), cmyk: "" },
    neutralLight: { hex: oklchToHex({ l: chance(rng, 0.5) ? 0.97 : 0.955, c: 0.015, h }), cmyk: "" },
  };
  return normalizePalette(raw, raw).palette;
}

function asIntake(venue: Venue): IntakeInput {
  return {
    brandName: venue.name || "مطعمي",
    brandNameEn: venue.nameEn,
    tagline: venue.tagline,
    industry: "food",
    industryOther: venue.type,
    brandValues: ["authentic"],
    visualStyle: VENUE_STYLE[venue.type].style,
    targetAudience: "",
    colorPreference: "warm",
  };
}

export function createBrand(venue: Venue, seed: number): MenuBrand {
  return {
    palette: venuePalette(venue.type, seed),
    typography: {
      arabicHeading: venue.type === "restaurant" || venue.type === "bakery" ? "Tajawal" : "Readex Pro",
      arabicBody: "IBM Plex Sans Arabic",
      englishHeading: venue.type === "burger" || venue.type === "juice" ? "Outfit" : "Inter",
      englishBody: "Plus Jakarta Sans",
    },
    concepts: generateConcepts(asIntake(venue), seed),
    logo: { kind: "concept", index: 0 },
    seed,
  };
}

export function newConcepts(venue: Venue, brand: MenuBrand, seed: number) {
  return generateConcepts(asIntake(venue), seed, brand.concepts.map((c) => c.family), 6, brand.concepts.map((c) => c.signature ?? ""));
}

/** مزيد من الرموز غير المكررة مع الإبقاء على الحالية */
export function moreConcepts(venue: Venue, brand: MenuBrand, seed: number) {
  const extra = generateConcepts(asIntake(venue), seed, brand.concepts.slice(-6).map((c) => c.family), 6, brand.concepts.map((c) => c.signature ?? ""));
  return [...brand.concepts, ...extra].slice(-30);
}
