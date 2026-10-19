// ─────────────────────────────────────────────────────────────
// BrandForge AI — نماذج البيانات (مطابقة لمخطط الوثيقة مع إضافات لازمة للتشغيل)
// ─────────────────────────────────────────────────────────────

export type Industry =
  | "tech"
  | "realestate"
  | "food"
  | "ecommerce"
  | "finance"
  | "health"
  | "education"
  | "beauty"
  | "logistics"
  | "other";

export type BrandValue = "luxury" | "modern" | "simple" | "playful" | "trust" | "authentic";
export type VisualStyle = "minimal" | "geometric" | "islamic" | "tech3d";
export type ColorPreference = "warm" | "earth" | "cool" | "custom";

export interface IntakeInput {
  brandName: string;
  brandNameEn?: string; // إضافة: الاسم اللاتيني للنسخ الثنائية اللغة
  tagline?: string;
  industry: Industry;
  industryOther?: string;
  brandValues: BrandValue[]; // حتى 3
  visualStyle: VisualStyle;
  targetAudience: string;
  colorPreference: ColorPreference;
  customColor?: string; // HEX عند اختيار "تخصيص حر"
  /** اختيارات الشعار الفرعية */
  logoTypes?: LogoKind[];
  likes?: string; // عناصر يحب العميل رؤيتها
  avoid?: string; // عناصر يريد تجنبها
  /** توليد مباشر بالذكاء الاصطناعي (افتراضي: نعم عند توفر المفاتيح) */
  aiDirect?: boolean;
}

export type LogoKind = "symbol" | "lettermark" | "combo" | "emblem" | "pictorial";

export interface SwatchFull {
  hex: string;
  cmyk: string;
  pantone: string;
  name: string;
}
export interface SwatchNeutral {
  hex: string;
  cmyk: string;
}

export interface Palette {
  primary: SwatchFull;
  secondary: SwatchFull;
  accent: SwatchFull;
  neutralDark: SwatchNeutral;
  neutralLight: SwatchNeutral;
}
export type PaletteKey = keyof Palette;

export interface Typography {
  arabicHeading: string;
  arabicBody: string;
  englishHeading: string;
  englishBody: string;
}

export type ShapeRole = "primary" | "secondary" | "accent";
export interface LogoText {
  value: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  script: "ar" | "en";
  letterSpacing?: number;
}

export interface LogoTextPath {
  value: string;
  r: number; // نصف قطر المسار الدائري حول المركز 50,50
  size: number;
  weight: number;
  script: "ar" | "en";
  letterSpacing?: number;
  offset?: number; // موضع منتصف النص على المسار بالنسبة المئوية (25 = أعلى الدائرة)
}

export interface LogoShape {
  d?: string;
  text?: LogoText;
  textPath?: LogoTextPath;
  role: ShapeRole;
  opacity?: number;
  /** يقتطع ما تحته (مساحة سالبة) بدل أن يُرسم */
  knock?: boolean;
  /** 1 = يُرسم فوق طبقة الاقتطاع */
  layer?: 0 | 1;
  /** عرض الخط: يُرسم كخط بدل تعبئة */
  stroke?: number;
}

export type LogoFamily =
  | "grid" | "star" | "arcs" | "facets" | "petals" | "bars" | "kufic"
  | "letterBox" | "letterRing" | "monogram" | "seal" | "motif" | "motifBox" | "motifLetter" | "compose" | "nameDuo" | "ai";

export interface LogoConcept {
  id: string;
  family: LogoFamily;
  signature?: string;
  title: string; // اسم المفهوم
  rationale: string; // دلالة المفهوم
  seed: number;
  shapes: LogoShape[]; // داخل مربع 0..100
  pattern: PatternSpec;
  /** شعار مولّد بالذكاء الاصطناعي: SVG منظّف مع viewBox الخاص به */
  svg?: { markup: string; viewBox: string };
  ai?: { provider: "recraft" | "gemini"; kind?: LogoKind };
}

export interface PatternSpec {
  mode: "truchet" | "repeat" | "lattice";
  tile: number; // حجم البلاطة بوحدات SVG
  rotateAlt: boolean;
  seed: number;
}

export interface BrandIdentity {
  id: string;
  seed: number;
  source: "ai" | "local";
  metadata: {
    brandName: string;
    brandNameEn?: string;
    tagline?: string;
    industry: string;
    values: string[];
    style: string;
    audience?: string;
    createdAt: string;
  };
  strategy: {
    brandStory: string;
    archetype: string;
  };
  palette: Palette;
  typography: Typography;
  assets: {
    logoSvg: string;
    iconSvg: string;
    monochromeSvg: string;
    patternSvg: string;
  };
  guidelines: {
    clearSpaceRatio: string;
    dos: string[];
    donts: string[];
  };
  concepts: LogoConcept[];
  selectedConcept: number;
}

/** ناتج نموذج الذكاء الاصطناعي حسب brandSystemJSONSchema */
export interface BrandSystemAI {
  brandStory: string;
  archetype: string;
  palette: Palette;
  typography: Typography;
  guidelines: { clearSpaceRatio: string; dos: string[]; donts: string[] };
}

export interface ContactInfo {
  personName: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  crNumber: string; // السجل التجاري
  vatNumber: string; // الرقم الضريبي
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface InvoiceData {
  number: string;
  date: string; // ISO yyyy-mm-dd
  clientName: string;
  clientVat: string;
  clientAddress: string;
  vatRate: number; // 0.15
  currency: string; // "ر.س"
  items: InvoiceItem[];
}

// ─────────────────────────────────────────────────────────────
// سُفرة — نماذج بيانات المنيو
// ─────────────────────────────────────────────────────────────

export type VenueType = "cafe" | "restaurant" | "burger" | "bakery" | "juice" | "seafood";

export type ItemTag = "new" | "popular" | "spicy" | "veg" | "chef";
export type Allergen = "gluten" | "milk" | "eggs" | "nuts" | "sesame" | "soy" | "fish";

export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  desc?: string;
  descEn?: string;
  price: number;
  calories?: number;
  tags: ItemTag[];
  allergens: Allergen[];
  available: boolean;
  photo?: string; // رابط أو data URL
}

export interface MenuCategory {
  id: string;
  name: string;
  nameEn?: string;
  items: MenuItem[];
}

export interface Venue {
  name: string;
  nameEn?: string;
  tagline?: string;
  type: VenueType;
  city: string;
  phone: string;
  instagram: string;
  hours: string;
  address: string;
  vatNumber?: string;
}

export type LogoSource =
  | { kind: "concept"; index: number }
  | { kind: "image"; dataUrl: string };

export interface MenuBrand {
  palette: Palette;
  typography: Typography;
  concepts: LogoConcept[];
  logo: LogoSource;
  seed: number;
}

export type MenuLayout = "elegant" | "modern" | "cards";

export interface MenuSettings {
  layout: MenuLayout;
  showCalories: boolean;
  showAllergens: boolean;
  vatIncluded: boolean;
  currency: string; // "ر.س"
  publicUrl?: string; // رابط المنيو الرقمي المنشور
}

export interface MenuDoc {
  id: string;
  slug?: string;
  venue: Venue;
  brand: MenuBrand;
  categories: MenuCategory[];
  settings: MenuSettings;
  updatedAt: string;
}
