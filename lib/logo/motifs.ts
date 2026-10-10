// مكتبة رموز قطاعية مجرّدة (بعيدة عن الكليشيهات): كل رمز يُرسم بقلم قابل للإزاحة والتكبير والتدوير
import type { LogoShape, ShapeRole } from "../types";
import { type RNG, chance, int, pick, range } from "../random";
import { f } from "./geometry";

type Pt = [number, number];

/** قلم يحوّل إحداثيات محلية (0..100) إلى الإطار المطلوب */
export class Pen {
  constructor(public cx = 50, public cy = 50, public k = 1, public rot = 0) {}
  m(x: number, y: number): Pt {
    const t = (this.rot * Math.PI) / 180, dx = x - 50, dy = y - 50;
    return [this.cx + (dx * Math.cos(t) - dy * Math.sin(t)) * this.k, this.cy + (dx * Math.sin(t) + dy * Math.cos(t)) * this.k];
  }
  s(v: number) { return v * this.k; }
  circle(x: number, y: number, r: number) {
    const [X, Y] = this.m(x, y), R = r * this.k;
    return `M${f(X - R)} ${f(Y)}a${f(R)} ${f(R)} 0 1 0 ${f(2 * R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2 * R)} 0Z`;
  }
  poly(pts: Pt[]) { return "M" + pts.map(([x, y]) => this.m(x, y).map(f).join(" ")).join("L") + "Z"; }
  path() { return new PathB(this); }
  /** مستطيل بزوايا دائرية (يُرسم بأقواس حتى مع التدوير) */
  rect(x: number, y: number, w: number, h: number, r = 0) {
    r = Math.min(r, w / 2, h / 2);
    const p = this.path();
    if (r < 0.01) return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    return p.M(x + r, y).L(x + w - r, y).A(r, r, 0, 1, x + w, y + r).L(x + w, y + h - r).A(r, r, 0, 1, x + w - r, y + h)
      .L(x + r, y + h).A(r, r, 0, 1, x, y + h - r).L(x, y + r).A(r, r, 0, 1, x + r, y).Z();
  }
  ellipse(cx: number, cy: number, rx: number, ry: number) {
    const p = this.path();
    return p.M(cx - rx, cy).A(rx, ry, 0, 1, cx + rx, cy, true).A(rx, ry, 0, 1, cx - rx, cy, true).Z();
  }
}

class PathB {
  private d = "";
  constructor(private p: Pen) {}
  private pt(x: number, y: number) { return this.p.m(x, y).map(f).join(" "); }
  M(x: number, y: number) { this.d += `M${this.pt(x, y)}`; return this; }
  L(x: number, y: number) { this.d += `L${this.pt(x, y)}`; return this; }
  Q(a: number, b: number, x: number, y: number) { this.d += `Q${this.pt(a, b)} ${this.pt(x, y)}`; return this; }
  C(a: number, b: number, c: number, e: number, x: number, y: number) { this.d += `C${this.pt(a, b)} ${this.pt(c, e)} ${this.pt(x, y)}`; return this; }
  A(rx: number, ry: number, large: 0 | 1, sweep: 0 | 1, x: number, y: number, bigFlag = false) {
    this.d += `A${f(this.p.s(rx))} ${f(this.p.s(ry))} ${f(this.p.rot)} ${bigFlag ? 1 : large} ${sweep} ${this.pt(x, y)}`;
    return this;
  }
  Z() { return this.d + "Z"; }
  open() { return this.d; }
}

export const S = (d: string, role: ShapeRole = "primary", extra: Partial<LogoShape> = {}): LogoShape => ({ d, role, ...extra });
export const K = (d: string, extra: Partial<LogoShape> = {}): LogoShape => ({ d, role: "primary", knock: true, ...extra });

/** عدسة (ورقة صغيرة) بين نقطتين */
export function lens(p: Pen, x1: number, y1: number, x2: number, y2: number, w: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w, ny = (dx / len) * w;
  return p.path().M(x1, y1).Q(mx + nx, my + ny, x2, y2).Q(mx - nx, my - ny, x1, y1).Z();
}

export type MotifFn = (p: Pen, rng: RNG) => LogoShape[];

export const MOTIFS: Record<string, { label: string; meaning: string; fn: MotifFn }> = {
  // ── قهوة ومطاعم ──
  bean: {
    label: "حبة البن", meaning: "حبة بن مجرّدة يشقها منحنى واحد؛ أصل المذاق ودفء المحمصة",
    fn: (p) => [S(p.ellipse(50, 50, 25, 37)), K(p.path().M(50, 15).C(36, 36, 64, 62, 50, 86).open(), { stroke: 5.5 })],
  },
  steam: {
    label: "البخار", meaning: "ثلاث خطوط بخار متموجة تعبّر عن الطزاجة واللحظة الدافئة",
    fn: (p, rng) => [32, 50, 68].map((x, i) => S(p.path().M(x, 86).C(x - 9, 70, x + 9, 56, x, 42).C(x - 8, 30, x + 5, 20, x, 12 + i * 2).open(), i === 1 ? "accent" : "primary", { stroke: range(rng, 6, 8) })),
  },
  leaf: {
    label: "الورقة", meaning: "ورقة بعرق واحد ترمز للطبيعة والمكونات الطازجة",
    fn: (p) => [S(p.path().M(50, 10).Q(88, 40, 50, 90).Q(12, 40, 50, 10).Z()), K(p.path().M(50, 24).L(50, 82).open(), { stroke: 3.5 })],
  },
  wheat: {
    label: "السنبلة", meaning: "سنبلة قمح تعبّر عن الخبز الطازج والبركة والوفرة",
    fn: (p) => {
      const out = [S(p.path().M(50, 92).L(50, 30).open(), "primary", { stroke: 4.5 })];
      [26, 41, 56, 71].forEach((y, i) => {
        out.push(S(lens(p, 50, y + 8, 33, y - 6, 6), i === 0 ? "accent" : "primary"));
        out.push(S(lens(p, 50, y + 8, 67, y - 6, 6), i === 0 ? "accent" : "primary"));
      });
      out.push(S(lens(p, 50, 30, 50, 8, 6), "accent"));
      return out;
    },
  },
  flame: {
    label: "اللهب", meaning: "لهب الحطب والشواء بصياغة هندسية ناعمة",
    fn: (p) => [
      S(p.path().M(50, 8).C(68, 28, 80, 42, 76, 62).C(72, 82, 60, 92, 50, 92).C(38, 92, 25, 82, 24, 64).C(23, 50, 33, 40, 38, 28).C(41, 40, 46, 46, 50, 48).C(51, 34, 47, 20, 50, 8).Z()),
      S(p.path().M(51, 54).C(60, 62, 64, 70, 61, 79).C(58, 86, 44, 86, 41, 78).C(39, 71, 44, 64, 51, 54).Z(), "accent", { layer: 1 }),
    ],
  },
  stack: {
    label: "الطبقات", meaning: "طبقات متراصة بإيقاع مرح تختصر الوجبة المتكاملة",
    fn: (p) => [
      S(p.path().M(16, 44).Q(16, 16, 50, 16).Q(84, 16, 84, 44).Z()),
      S(p.rect(12, 50, 76, 9, 4.5), "accent"),
      S(p.rect(16, 63, 68, 7, 3.5), "secondary"),
      S(p.rect(16, 74, 68, 14, 7)),
    ],
  },
  citrus: {
    label: "شريحة الحمضيات", meaning: "شريحة فاكهة دائرية بفصوص منتظمة للانتعاش والطزاجة",
    fn: (p, rng) => {
      const n = pick(rng, [6, 8, 10]);
      const out: LogoShape[] = [S(p.circle(50, 50, 42))];
      out.push(K(p.circle(50, 50, 35)));
      for (let i = 0; i < n; i++) {
        const a0 = (i * 360) / n + 4, a1 = ((i + 1) * 360) / n - 4, r = 31;
        const P = (a: number): Pt => [50 + r * Math.cos((a * Math.PI) / 180), 50 + r * Math.sin((a * Math.PI) / 180)];
        out.push(S(p.path().M(50, 50).L(...P(a0)).A(r, r, 0, 1, ...P(a1)).Z(), i % 2 ? "accent" : "secondary", { layer: 1 }));
      }
      return out;
    },
  },
  waves: {
    label: "الموج", meaning: "موجات متتابعة تستحضر البحر وصيد اليوم",
    fn: (p, rng) => [34, 50, 66].map((y, i) => S(p.path().M(12, y).C(24, y - 10, 36, y - 10, 50, y).C(64, y + 10, 76, y + 10, 88, y).open(), i === 1 ? "accent" : "primary", { stroke: range(rng, 6, 8) })),
  },
  fish: {
    label: "السمكة", meaning: "سمكة من قوسين ومثلث، بسيطة وواضحة حتى في المقاسات الصغيرة",
    fn: (p) => [S(p.path().M(14, 50).Q(46, 18, 74, 50).Q(46, 82, 14, 50).Z()), S(p.poly([[70, 50], [90, 32], [90, 68]]), "accent"), K(p.circle(30, 46, 4))],
  },
  crescent: {
    label: "الهلال الذهبي", meaning: "هلال بثنيات منتظمة يشبه المخبوزات المورقة",
    fn: (p) => [S(p.circle(50, 50, 40) + p.circle(57, 45, 29)), ...[0, 1, 2].map((i) => K(p.path().M(22 + i * 10, 76 - i * 12).L(30 + i * 9, 68 - i * 11).open(), { stroke: 3.5 }))],
  },
  // ── تقنية ──
  nodes: {
    label: "الشبكة", meaning: "عُقد مترابطة تعبّر عن الاتصال وتبادل البيانات",
    fn: (p, rng) => {
      const pts: Pt[] = [[50, 16], [84, 50], [50, 84], [16, 50]];
      const out = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]].map(([a, b]) => S(p.path().M(...pts[a]).L(...pts[b]).open(), "secondary", { stroke: 4.5 }));
      pts.forEach((q, i) => out.push(S(p.circle(q[0], q[1], i === 0 ? 11 : 9), i === int(rng, 0, 3) ? "accent" : "primary", { layer: 1 })));
      return out;
    },
  },
  brackets: {
    label: "الأقواس البرمجية", meaning: "قوسا الشيفرة يحتضنان نقطة البداية",
    fn: (p) => [
      S(p.poly([[38, 20], [46, 28], [26, 50], [46, 72], [38, 80], [10, 50]])),
      S(p.poly([[62, 20], [90, 50], [62, 80], [54, 72], [74, 50], [54, 28]])),
      S(p.circle(50, 50, 7), "accent"),
    ],
  },
  pixel: {
    label: "البصمة البكسلية", meaning: "نمط بكسلي متناظر مشتق من اسم العلامة نفسه، فلا يتكرر لعلامتين",
    fn: (p, rng) => {
      const out: LogoShape[] = [];
      const n = 5, s = 15, off = 50 - (n * s + (n - 1) * 2) / 2;
      for (let y = 0; y < n; y++) for (let x = 0; x < 3; x++) if (rng() > 0.45 || (x === 2 && y === 2)) {
        const role: ShapeRole = x === 2 && y === 2 ? "accent" : rng() > 0.8 ? "secondary" : "primary";
        out.push(S(p.rect(off + x * 17, off + y * 17, s, s, 3), role));
        if (x < 2) out.push(S(p.rect(off + (4 - x) * 17, off + y * 17, s, s, 3), role));
      }
      return out;
    },
  },
  signal: {
    label: "الإشارة", meaning: "موجات إشارة تنطلق من نقطة واحدة؛ وصول وانتشار",
    fn: (p) => {
      const out: LogoShape[] = [S(p.circle(22, 78, 9), "accent")];
      [30, 48, 66].forEach((r) => out.push(S(p.path().M(22, 78 - r).A(r, r, 0, 1, 22 + r, 78).open(), "primary", { stroke: 9 })));
      return out;
    },
  },
  // ── عقار وعمارة ──
  arch: {
    label: "القوس", meaning: "قوس باب مستلهم من العمارة النجدية؛ ترحيب واستقرار",
    fn: (p) => [S(p.path().M(22, 90).L(22, 46).A(28, 28, 0, 1, 78, 46).L(78, 90).Z()), K(p.path().M(36, 90).L(36, 50).A(14, 14, 0, 1, 64, 50).L(64, 90).Z()), S(p.rect(44, 70, 12, 20, 2), "accent", { layer: 1 })],
  },
  keystone: {
    label: "حجر العقد", meaning: "قوس من كتل متراصة يجمعها حجر مركزي؛ متانة البناء",
    fn: (p) => {
      const out: LogoShape[] = [];
      const n = 5, r1 = 22, r2 = 42;
      for (let i = 0; i < n; i++) {
        const a0 = 180 + (i * 180) / n + 2, a1 = 180 + ((i + 1) * 180) / n - 2;
        const P = (r: number, a: number): Pt => [50 + r * Math.cos((a * Math.PI) / 180), 70 + r * Math.sin((a * Math.PI) / 180)];
        out.push(S(p.path().M(...P(r2, a0)).A(r2, r2, 0, 1, ...P(r2, a1)).L(...P(r1, a1)).A(r1, r1, 0, 0, ...P(r1, a0)).Z(), i === 2 ? "accent" : "primary"));
      }
      out.push(S(p.rect(8, 74, 18, 14, 2)), S(p.rect(74, 74, 18, 14, 2)));
      return out;
    },
  },
  floors: {
    label: "الطوابق", meaning: "طوابق متدرجة بنوافذ منتظمة؛ نمو عمراني مدروس",
    fn: (p) => {
      const out: LogoShape[] = [];
      [[30, 10, 40], [22, 36, 56], [14, 62, 72]].forEach(([x, y, w], i) => {
        out.push(S(p.rect(x, y, w, 22, 3), i === 0 ? "accent" : "primary"));
        for (let k = 0; k < Math.floor(w / 14); k++) out.push(K(p.rect(x + 6 + k * 14, y + 8, 6, 6, 1)));
      });
      return out;
    },
  },
  // ── تجارة ──
  tag: {
    label: "البطاقة", meaning: "بطاقة سعر مائلة بثقب دائري؛ تسوق سهل وعروض واضحة",
    fn: (p) => [S(p.poly([[20, 22], [62, 22], [88, 50], [62, 78], [20, 78]])), K(p.circle(36, 50, 7)), S(p.circle(36, 50, 3), "accent", { layer: 1 })],
  },
  loop: {
    label: "الدورة", meaning: "حلقة متصلة بسهم؛ طلب، توصيل، ثم عودة",
    fn: (p) => {
      const r2 = 38, r1 = 24, a0 = -60, a1 = 230;
      const P = (r: number, a: number): Pt => [50 + r * Math.cos((a * Math.PI) / 180), 50 + r * Math.sin((a * Math.PI) / 180)];
      return [
        S(p.path().M(...P(r2, a0)).A(r2, r2, 1, 1, ...P(r2, a1)).L(...P(r1, a1)).A(r1, r1, 1, 0, ...P(r1, a0)).Z()),
        S(p.poly([P(r2 + 9, a0), P(r1 - 9, a0), P((r1 + r2) / 2, a0 - 26)]), "accent"),
      ];
    },
  },
  box: {
    label: "الصندوق", meaning: "صندوق منظوري مفتوح الغطاء؛ شحنة في طريقها للعميل",
    fn: (p) => [
      S(p.poly([[50, 34], [86, 22], [86, 66], [50, 82]]), "secondary"),
      S(p.poly([[50, 34], [14, 22], [14, 66], [50, 82]])),
      S(p.poly([[14, 22], [50, 34], [40, 10], [6, 0]]), "accent"),
    ],
  },
  click: {
    label: "النقرة", meaning: "مؤشر يضغط فتنطلق موجات التفاعل",
    fn: (p) => [S(p.poly([[30, 24], [74, 54], [54, 58], [64, 80], [56, 84], [46, 62], [30, 76]])), ...[200, 240, 280].map((a) => {
      const P = (r: number): Pt => [30 + r * Math.cos((a * Math.PI) / 180), 24 + r * Math.sin((a * Math.PI) / 180)];
      return S(p.path().M(...P(9)).L(...P(18)).open(), "accent", { stroke: 5 });
    })],
  },
  // ── مالية ──
  coins: {
    label: "المدخرات", meaning: "قطع متراصة بثبات؛ نمو تراكمي آمن",
    fn: (p) => [70, 52, 34].flatMap((y, i) => [S(p.path().M(18, y).L(18, y + 12).A(32, 9, 0, 0, 82, y + 12).L(82, y).Z()), S(p.ellipse(50, y, 32, 9), i === 2 ? "accent" : "secondary", { layer: 1 })]),
  },
  diamond: {
    label: "الجوهرة", meaning: "أوجه متعددة لقيمة واحدة؛ ندرة وموثوقية",
    fn: (p) => [S(p.poly([[24, 20], [76, 20], [92, 40], [50, 40], [8, 40]]), "accent"), S(p.poly([[8, 40], [50, 40], [50, 90]])), S(p.poly([[50, 40], [92, 40], [50, 90]]), "secondary")],
  },
  stairs: {
    label: "الدرج", meaning: "درجات صاعدة بثبات؛ تقدم خطوة بخطوة",
    fn: (p) => [S(p.poly([[10, 90], [10, 70], [30, 70], [30, 50], [50, 50], [50, 30], [70, 30], [70, 10], [90, 10], [90, 90]])), S(p.circle(28, 30, 9), "accent")],
  },
  // ── صحة وجمال ──
  drop: {
    label: "القطرة", meaning: "قطرة نقية تعبّر عن الصفاء والعناية",
    fn: (p) => [S(p.path().M(50, 8).C(50, 8, 80, 44, 80, 62).A(30, 30, 0, 1, 20, 62).C(20, 44, 50, 8, 50, 8).Z()), K(p.path().M(34, 62).A(16, 16, 0, 0, 46, 78).open(), { stroke: 4.5 })],
  },
  molecule: {
    label: "الجزيء", meaning: "ذرات مترابطة؛ علم دقيق في خدمة الإنسان",
    fn: (p) => {
      const c: Pt[] = [[50, 22], [80, 70], [20, 70]];
      return [...c.map((q) => S(p.path().M(50, 54).L(...q).open(), "secondary", { stroke: 5 })), ...c.map((q, i) => S(p.circle(q[0], q[1], 12), i === 0 ? "accent" : "primary", { layer: 1 })), S(p.circle(50, 54, 9), "primary", { layer: 1 })];
    },
  },
  leafpair: {
    label: "الورقتان", meaning: "ورقتان تحتضنان بعضهما؛ رعاية ونمو",
    fn: (p) => [S(lens(p, 50, 88, 18, 22, 14)), S(lens(p, 50, 88, 82, 22, 14), "secondary"), S(p.circle(50, 26, 7), "accent")],
  },
  spark: {
    label: "الومضة", meaning: "نجمة رباعية لامعة؛ فكرة مضيئة ولحظة إلهام",
    fn: (p) => [S(p.path().M(46, 8).Q(50, 46, 86, 50).Q(50, 54, 46, 92).Q(42, 54, 6, 50).Q(42, 46, 46, 8).Z()), S(p.path().M(80, 12).Q(81, 21, 90, 22).Q(81, 23, 80, 32).Q(79, 23, 70, 22).Q(79, 21, 80, 12).Z(), "accent")],
  },
  mirror: {
    label: "المرآة", meaning: "إطار بيضاوي أنيق؛ عناية بالتفاصيل والجمال",
    fn: (p) => [S(p.ellipse(50, 40, 30, 34) + p.ellipse(50, 40, 22, 26)), S(p.rect(45, 74, 10, 20, 5)), S(p.ellipse(50, 40, 22, 26), "accent", { opacity: 0.35 })],
  },
  // ── تعليم ──
  book: {
    label: "الكتاب المفتوح", meaning: "صفحتان مفتوحتان وعلامة؛ معرفة متاحة للجميع",
    fn: (p) => [S(p.poly([[10, 26], [47, 34], [47, 84], [10, 76]])), S(p.poly([[90, 26], [53, 34], [53, 84], [90, 76]]), "secondary"), S(p.poly([[60, 30], [70, 28], [70, 52], [65, 47], [60, 52]]), "accent", { layer: 1 })],
  },
  pencil: {
    label: "القلم", meaning: "سن قلم مائل؛ تعلّم وكتابة وإبداع",
    fn: (p) => [S(p.poly([[30, 20], [80, 70], [70, 80], [20, 30]])), S(p.poly([[80, 70], [92, 92], [70, 80]]), "accent"), S(p.poly([[30, 20], [20, 30], [12, 22], [22, 12]]), "secondary")],
  },
  // ── لوجستيات ──
  chevrons: {
    label: "الانطلاق", meaning: "أسهم متتابعة باتجاه واحد؛ سرعة ووضوح",
    fn: (p) => [0, 1, 2].map((i) => S(p.poly([[10 + i * 26, 22], [26 + i * 26, 22], [50 + i * 26, 50], [26 + i * 26, 78], [10 + i * 26, 78], [34 + i * 26, 50]]), i === 2 ? "accent" : "primary")),
  },
  route: {
    label: "المسار", meaning: "طريق بنقطتي انطلاق ووصول؛ التزام بالموعد",
    fn: (p) => [S(p.path().M(22, 78).C(22, 40, 78, 60, 78, 22).open(), "secondary", { stroke: 8 }), S(p.circle(22, 78, 10)), S(p.circle(78, 22, 12), "accent"), K(p.circle(78, 22, 4.5))],
  },
  globe: {
    label: "الكرة", meaning: "خطوط طول وعرض؛ وصول لكل مكان",
    fn: (p) => [S(p.circle(50, 50, 40) + p.circle(50, 50, 33)), S(p.ellipse(50, 50, 15, 33), "secondary", { stroke: 5 }), S(p.path().M(17, 50).L(83, 50).open(), "accent", { stroke: 5 })],
  },
};

const BY_INDUSTRY: Record<string, string[]> = {
  tech: ["nodes", "brackets", "pixel", "signal", "spark"],
  realestate: ["arch", "keystone", "floors"],
  food: ["bean", "leaf", "wheat", "flame", "steam", "stack", "citrus", "waves", "fish", "crescent"],
  ecommerce: ["tag", "loop", "box", "click"],
  finance: ["coins", "diamond", "stairs", "keystone"],
  health: ["drop", "molecule", "leafpair", "spark"],
  education: ["book", "spark", "pencil", "stairs"],
  beauty: ["drop", "spark", "mirror", "leafpair"],
  logistics: ["chevrons", "route", "globe", "loop"],
  other: ["spark", "arch", "loop", "leaf", "nodes", "diamond"],
};
const BY_VENUE: Record<string, string[]> = {
  cafe: ["bean", "steam", "leaf", "crescent"],
  restaurant: ["flame", "wheat", "leaf", "arch"],
  burger: ["stack", "flame"],
  bakery: ["wheat", "crescent", "spark"],
  juice: ["citrus", "drop", "leaf"],
  seafood: ["waves", "fish"],
};

export function motifsFor(industry: string, sub?: string): string[] {
  return (sub && BY_VENUE[sub]) || BY_INDUSTRY[industry] || BY_INDUSTRY.other;
}

export function drawMotif(id: string, p: Pen, rng: RNG) {
  return MOTIFS[id].fn(p, rng);
}

export { chance };
