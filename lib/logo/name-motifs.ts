// معنى الاسم: قاموس للكلمات الشائعة في الأسماء التجارية السعودية مربوط برموز مرسومة
// «زهرة» ← وردة، «نخلة» ← نخلة، «صقر» ← جناح صقر، «طويق» ← جبل…
import type { LogoShape } from "../types";
import type { RNG } from "../random";
import { pick } from "../random";
import { MOTIFS, Pen, S, K, lens } from "./motifs";

const P = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

// ── رموز جديدة مرتبطة بمعاني الأسماء ──────────────────────────
const NEW: typeof MOTIFS = {
  flower: {
    label: "الوردة", meaning: "بتلات متناظرة حول قلب مضيء؛ أنوثة ورقة ونمو",
    fn: (p, rng) => {
      const n = pick(rng, [5, 6, 8]), out: LogoShape[] = [];
      for (let i = 0; i < n; i++) out.push(S(lens(p, 50, 50, ...P(50, 50, 42, -90 + (i * 360) / n), n === 8 ? 8 : 11), i % 2 && n !== 5 ? "secondary" : "primary"));
      out.push(K(p.circle(50, 50, 10)), S(p.circle(50, 50, 6.5), "accent", { layer: 1 }));
      return out;
    },
  },
  palm: {
    label: "النخلة", meaning: "نخلة بسعفات متوازنة؛ أصالة الأرض وكرمها",
    fn: (p) => {
      const out: LogoShape[] = [S(p.path().M(50, 94).Q(45, 70, 50, 44).open(), "primary", { stroke: 6 })];
      [-168, -132, -90, -48, -12].forEach((a, i) => out.push(S(lens(p, 50, 42, ...P(50, 44, 38, a), 7), i === 2 ? "accent" : "primary")));
      out.push(S(p.circle(44, 50, 4.5), "accent", { layer: 1 }), S(p.circle(56, 50, 4.5), "accent", { layer: 1 }));
      return out;
    },
  },
  falcon: {
    label: "جناح الصقر", meaning: "جناح صقر منطلق بخطوط حادة؛ قوة وسرعة ونظرة بعيدة",
    fn: (p) => [
      S(p.path().M(10, 66).C(26, 34, 58, 16, 90, 18).C(72, 28, 62, 38, 58, 50).L(80, 48).C(66, 62, 52, 68, 40, 66).L(54, 80).C(36, 82, 20, 78, 10, 66).Z()),
      S(p.path().M(58, 50).L(80, 48).C(74, 54, 68, 58, 62, 60).Z(), "accent", { layer: 1 }),
    ],
  },
  mountain: {
    label: "القمة", meaning: "قمتان متتاليتان ورأس مضيء؛ شموخ وثبات وطموح",
    fn: (p) => [
      S(p.poly([[6, 86], [40, 26], [74, 86]])),
      S(p.poly([[40, 86], [68, 42], [96, 86]]), "secondary"),
      K(p.poly([[40, 26], [50, 44], [44, 40], [38, 46], [31, 42]])),
      S(p.circle(80, 22, 7), "accent", { layer: 1 }),
    ],
  },
  sun: {
    label: "الشمس", meaning: "قرص تحيطه أشعة منتظمة؛ نور ودفء وبداية جديدة",
    fn: (p, rng) => {
      const n = pick(rng, [8, 12]), out: LogoShape[] = [S(p.circle(50, 50, 21), "accent")];
      for (let i = 0; i < n; i++) out.push(S(lens(p, ...P(50, 50, 29, (i * 360) / n), ...P(50, 50, 46, (i * 360) / n), 4.2)));
      return out;
    },
  },
  tree: {
    label: "الشجرة", meaning: "شجرة بتاج دائري وجذع ثابت؛ نمو وعطاء ممتد",
    fn: (p) => [
      S(p.circle(50, 40, 32)),
      S(p.rect(44.5, 58, 11, 34, 3)),
      K(p.path().M(50, 70).L(50, 34).M(50, 52).L(36, 40).M(50, 46).L(63, 34).open(), { stroke: 4 }),
      S(p.circle(68, 22, 5), "accent", { layer: 1 }),
    ],
  },
  crown: {
    label: "التاج", meaning: "تاج بثلاث قمم وجواهر؛ فخامة وريادة وتميز",
    fn: (p) => [
      S(p.poly([[12, 74], [16, 30], [34, 52], [50, 20], [66, 52], [84, 30], [88, 74]])),
      S(p.rect(12, 79, 76, 10, 3), "secondary"),
      ...([[16, 26], [50, 16], [84, 26]] as const).map(([x, y]) => S(p.circle(x, y, 5.5), "accent", { layer: 1 })),
      K(p.circle(50, 60, 6)),
    ],
  },
  key: {
    label: "المفتاح", meaning: "مفتاح بحلقة وأسنان؛ ثقة وحلول وبداية الوصول",
    fn: (p) => [
      S(p.circle(30, 50, 21)), K(p.circle(30, 50, 9)),
      S(p.rect(47, 45, 45, 10, 3)),
      S(p.rect(74, 55, 7, 15, 2), "accent"), S(p.rect(85, 55, 7, 10, 2), "accent"),
    ],
  },
  tower: {
    label: "البرج", meaning: "برج متدرج بقمة حادة؛ طموح وارتفاع وحضور",
    fn: (p) => [
      S(p.poly([[50, 4], [59, 22], [41, 22]]), "accent"),
      S(p.rect(39, 24, 22, 22, 2)),
      S(p.rect(33, 48, 34, 46, 3)),
      ...[56, 68, 80].map((y) => K(p.rect(44, y, 12, 6, 1.5))),
      K(p.rect(46, 30, 8, 8, 1.5)),
    ],
  },
  cloud: {
    label: "السحابة", meaning: "سحابة ناعمة الحواف؛ خفة وسعة وأفق مفتوح",
    fn: (p) => [S(p.circle(34, 58, 18)), S(p.circle(54, 44, 24)), S(p.circle(72, 58, 16)), S(p.rect(16, 58, 72, 18, 9)), S(p.circle(80, 24, 6), "accent", { layer: 1 })],
  },
  heart: {
    label: "القلب", meaning: "قلب بخط واحد متصل؛ عناية ومحبة وقرب",
    fn: (p) => [
      S(p.path().M(50, 88).C(20, 66, 6, 48, 16, 30).C(26, 12, 46, 16, 50, 32).C(54, 16, 74, 12, 84, 30).C(94, 48, 80, 66, 50, 88).Z()),
      S(p.circle(68, 32, 6), "accent", { layer: 1 }),
    ],
  },
  anchor: {
    label: "المرساة", meaning: "مرساة متزنة؛ ثبات وأمان ورحلة بحرية",
    fn: (p) => [
      S(p.circle(50, 16, 9)), K(p.circle(50, 16, 4)),
      S(p.rect(45.5, 24, 9, 60, 3)),
      S(p.rect(30, 34, 40, 7, 3.5), "secondary"),
      S(p.path().M(16, 58).Q(20, 88, 50, 90).Q(80, 88, 84, 58).open(), "primary", { stroke: 7 }),
      S(p.poly([[8, 62], [16, 50], [24, 62]]), "accent"), S(p.poly([[76, 62], [84, 50], [92, 62]]), "accent"),
    ],
  },
  shield: {
    label: "الدرع", meaning: "درع بعلامة صح؛ حماية وأمان والتزام",
    fn: (p) => [
      S(p.path().M(50, 6).L(88, 18).L(88, 48).Q(88, 78, 50, 94).Q(12, 78, 12, 48).L(12, 18).Z()),
      K(p.path().M(32, 50).L(45, 63).L(70, 36).open(), { stroke: 8 }),
    ],
  },
  comb: {
    label: "خلية العسل", meaning: "خلايا سداسية متراصة؛ إتقان وعمل جماعي وحلاوة",
    fn: (p) => {
      const hex = (cx: number, cy: number, r: number) => p.poly(Array.from({ length: 6 }, (_, i) => P(cx, cy, r, 30 + i * 60)));
      return [S(hex(50, 30, 19)), S(hex(33, 60, 19), "secondary"), S(hex(67, 60, 19)), K(hex(50, 30, 9)), S(hex(67, 60, 8), "accent", { layer: 1 })];
    },
  },
};
Object.assign(MOTIFS, NEW);

// ── القاموس ──────────────────────────────────────────────────
/** كلمة ← رمز + معنى مختصر يظهر في شرح الشعار */
const DICT: [string[], string, string][] = [
  [["زهره", "زهور", "زهر", "ورد", "ورده", "ورود", "ياسمين", "فل", "نرجس", "خزامي", "توليب", "اقحوان", "rose", "flower", "flowers", "bloom", "blossom", "jasmine", "lily", "zahra", "zahrah", "ward", "yasmin", "yasmine", "lavender"], "flower", "الزهرة"],
  [["نخله", "نخيل", "تمر", "تمور", "سعف", "واحه", "palm", "palms", "dates", "oasis", "nakhla", "nakheel", "tamr"], "palm", "النخلة"],
  [["صقر", "صقور", "نسر", "شاهين", "عقاب", "طير", "طيور", "جناح", "falcon", "eagle", "hawk", "bird", "wing", "wings", "saqr", "saker", "shaheen", "nasr"], "falcon", "الصقر"],
  [["جبل", "جبال", "قمه", "طويق", "هضبه", "شموخ", "سراه", "طود", "mountain", "mount", "peak", "summit", "jabal", "qimma", "tuwaiq"], "mountain", "القمة"],
  [["شمس", "شروق", "ضحي", "فجر", "صباح", "نور", "ضياء", "اشراق", "سنا", "sun", "sunrise", "dawn", "solar", "light", "noor", "nour", "shams", "sana", "fajr"], "sun", "الشمس والنور"],
  [["قمر", "هلال", "بدر", "ليل", "ليالي", "moon", "crescent", "luna", "night", "qamar", "hilal", "badr", "layali"], "crescent", "القمر"],
  [["نجم", "نجمه", "نجوم", "سهيل", "ثريا", "كوكب", "star", "stars", "nova", "stellar", "najm", "najma", "suhail", "thuraya"], "spark", "النجمة"],
  [["شجره", "شجر", "غصن", "دوحه", "سدره", "زيتون", "غرس", "ارز", "tree", "oak", "olive", "cedar", "sidra", "zaitoun", "zaytoon"], "tree", "الشجرة"],
  [["ورق", "ورقه", "خضراء", "اخضر", "ربيع", "روض", "روضه", "بستان", "حديقه", "مرج", "leaf", "green", "garden", "meadow", "rabea", "rawdah", "bustan"], "leafpair", "الخضرة"],
  [["تاج", "ملك", "ملكي", "مملكه", "امير", "اميره", "سلطان", "فخامه", "عرش", "crown", "king", "royal", "queen", "prince", "princess", "sultan", "taj", "malak", "ameer"], "crown", "التاج"],
  [["مفتاح", "مفاتيح", "key", "keys", "miftah"], "key", "المفتاح"],
  [["باب", "بوابه", "بيت", "دار", "منزل", "سكن", "مأوي", "قصر", "gate", "door", "home", "house", "nest", "palace", "bab", "bawaba", "bait", "dar", "qasr"], "arch", "الباب والبيت"],
  [["برج", "ابراج", "صرح", "منار", "مناره", "tower", "towers", "skyline", "burj", "manara"], "tower", "البرج"],
  [["سحاب", "سحابه", "غيم", "غيمه", "مزن", "سماء", "افق", "cloud", "clouds", "sky", "horizon", "ghaim", "muzn", "sama", "ofoq"], "cloud", "السحاب"],
  [["قلب", "حب", "محبه", "وداد", "قلوب", "heart", "love", "care", "qalb", "hob", "wedad"], "heart", "القلب"],
  [["مرسي", "مرفأ", "ميناء", "شراع", "سفينه", "anchor", "harbor", "harbour", "port", "marine", "sail", "marsa"], "anchor", "المرساة"],
  [["بحر", "بحار", "موج", "موجه", "خليج", "شاطئ", "محيط", "نسيم", "sea", "ocean", "wave", "waves", "bay", "gulf", "coast", "breeze", "bahr", "mawj", "khaleej"], "waves", "البحر"],
  [["جوهره", "ماس", "الماس", "دره", "ياقوت", "لؤلؤ", "لؤلؤه", "زمرد", "diamond", "gem", "jewel", "pearl", "ruby", "emerald", "jawhara", "durra", "lulu"], "diamond", "الجوهرة"],
  [["درع", "حصن", "امان", "امن", "حمايه", "حارس", "وقايه", "shield", "guard", "secure", "safe", "safety", "fort", "aman", "hisn"], "shield", "الدرع"],
  [["كتاب", "كتب", "قلم", "علم", "معرفه", "مداد", "حرف", "book", "books", "pen", "knowledge", "kitab", "qalam", "midad"], "book", "الكتاب"],
  [["نحل", "نحله", "عسل", "خليه", "bee", "bees", "honey", "hive", "nahl", "asal"], "comb", "خلية العسل"],
  [["نار", "شعله", "جمر", "لهيب", "حطب", "fire", "flame", "blaze", "ember", "grill", "nar", "jamr"], "flame", "الشعلة"],
  [["ماء", "مياه", "نبع", "غدير", "مطر", "قطره", "عين", "زلال", "water", "aqua", "rain", "drop", "fountain", "spring", "nabea", "ghadeer", "matar"], "drop", "الماء"],
  [["سهم", "سريع", "فوري", "انطلاق", "arrow", "swift", "fast", "express", "rapid", "sahm", "sareea", "saree"], "chevrons", "السرعة"],
  [["طريق", "درب", "مسار", "رحله", "سبيل", "road", "path", "route", "way", "journey", "darb", "masar", "tareeq"], "route", "الطريق"],
  [["ريف", "حقل", "سنبله", "حصاد", "بيدر", "قمح", "field", "harvest", "wheat", "farm", "reef"], "wheat", "الريف والحقل"],
  [["قهوه", "هيل", "دله", "فنجال", "bean", "beans", "brew", "qahwa", "dallah", "finjan"], "bean", "القهوة"],
];

const normAr = (w: string) =>
  w.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const INDEX = new Map<string, { motif: string; label: string }>();
for (const [words, motif, label] of DICT) for (const w of words) INDEX.set(/[a-z]/.test(w) ? w : normAr(w), { motif, label });

export interface NameMeaning { word: string; motif: string; label: string }

/** يبحث في كلمات الاسم (عربي وإنجليزي) عن معانٍ لها رموز */
export function readMeaning(nameAr: string, nameEn?: string): NameMeaning[] {
  const out: NameMeaning[] = [];
  const seen = new Set<string>();
  const add = (raw: string, key: string) => {
    const hit = INDEX.get(key);
    if (hit && !seen.has(hit.motif)) { seen.add(hit.motif); out.push({ word: raw, ...hit }); }
  };
  for (const raw of nameAr.split(/[\s\-_.،,]+/).filter(Boolean)) {
    if (!/[؀-ۿ]/.test(raw)) continue;
    const w = normAr(raw);
    const stripped = w.replace(/^(وال|بال|فال|كال|لل|ال)/, "");
    for (const k of [w, stripped, stripped.replace(/^و/, ""), stripped.replace(/(ات|ين|ون)$/, "")]) if (k.length >= 2) add(raw, k);
  }
  const latin = [nameEn ?? "", /[a-z]/i.test(nameAr) ? nameAr : ""].join(" ");
  for (const raw of latin.toLowerCase().split(/[^a-z]+/).filter((x) => x.length >= 2)) {
    add(raw, raw);
    if (raw.endsWith("s")) add(raw, raw.slice(0, -1));
  }
  return out;
}

export function drawNameMotif(id: string, p: Pen, rng: RNG) {
  return MOTIFS[id].fn(p, rng);
}
