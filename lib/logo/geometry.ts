// أدوات هندسية تُنتج مسارات SVG نظيفة (أرقام مقربة، بدون تحويلات)

export const f = (n: number) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
};

export type Pt = [number, number];

export const polar = (cx: number, cy: number, r: number, deg: number): Pt => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy + r * Math.sin((deg * Math.PI) / 180),
];

export function polygon(pts: Pt[]): string {
  return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

export function rect(x: number, y: number, w: number, h: number, r = 0): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r < 0.01) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  return (
    `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}` +
    `v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}` +
    `h${f(-(w - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}` +
    `v${f(-(h - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}Z`
  );
}

/** قطاع حلقي: الزوايا بالدرجات مع عقارب الساعة على الشاشة */
export function annularSector(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [ox0, oy0] = polar(cx, cy, r2, a0);
  const [ox1, oy1] = polar(cx, cy, r2, a1);
  const [ix1, iy1] = polar(cx, cy, r1, a1);
  const [ix0, iy0] = polar(cx, cy, r1, a0);
  return (
    `M${f(ox0)} ${f(oy0)}A${f(r2)} ${f(r2)} 0 ${large} 1 ${f(ox1)} ${f(oy1)}` +
    `L${f(ix1)} ${f(iy1)}A${f(r1)} ${f(r1)} 0 ${large} 0 ${f(ix0)} ${f(iy0)}Z`
  );
}

export type Corner = "tl" | "tr" | "br" | "bl";

/** ربع دائرة مركزه في زاوية الخلية ويغطيها */
export function quarter(x: number, y: number, s: number, corner: Corner): string {
  const c: Record<Corner, [Pt, number]> = {
    tl: [[x, y], 0],
    tr: [[x + s, y], 90],
    br: [[x + s, y + s], 180],
    bl: [[x, y + s], 270],
  };
  const [[cx, cy], a] = c[corner];
  const p0 = polar(cx, cy, s, a);
  const p1 = polar(cx, cy, s, a + 90);
  return `M${f(cx)} ${f(cy)}L${f(p0[0])} ${f(p0[1])}A${f(s)} ${f(s)} 0 0 1 ${f(p1[0])} ${f(p1[1])}Z`;
}

/** نصف دائرة قطرها على حافة الخلية (side = الحافة الملاصقة) */
export function half(x: number, y: number, s: number, side: "top" | "right" | "bottom" | "left"): string {
  const r = s / 2;
  switch (side) {
    case "top":
      return `M${f(x)} ${f(y)}h${f(s)}a${f(r)} ${f(r)} 0 0 1 ${f(-s)} 0Z`;
    case "bottom":
      return `M${f(x + s)} ${f(y + s)}h${f(-s)}a${f(r)} ${f(r)} 0 0 1 ${f(s)} 0Z`;
    case "left":
      return `M${f(x)} ${f(y + s)}v${f(-s)}a${f(r)} ${f(r)} 0 0 1 0 ${f(s)}Z`;
    case "right":
      return `M${f(x + s)} ${f(y)}v${f(s)}a${f(r)} ${f(r)} 0 0 1 0 ${f(-s)}Z`;
  }
}

/** ورقة (عدسة من قوسين) بين زاويتين متقابلتين */
export function leaf(x: number, y: number, s: number, diag: "main" | "anti"): string {
  if (diag === "main")
    return `M${f(x)} ${f(y)}A${f(s)} ${f(s)} 0 0 1 ${f(x + s)} ${f(y + s)}A${f(s)} ${f(s)} 0 0 1 ${f(x)} ${f(y)}Z`;
  return `M${f(x + s)} ${f(y)}A${f(s)} ${f(s)} 0 0 1 ${f(x)} ${f(y + s)}A${f(s)} ${f(s)} 0 0 1 ${f(x + s)} ${f(y)}Z`;
}

/** مثلث قائم يملأ نصف الخلية؛ corner = موضع الزاوية القائمة */
export function tri(x: number, y: number, s: number, corner: Corner): string {
  const P: Record<Corner, Pt> = { tl: [x, y], tr: [x + s, y], br: [x + s, y + s], bl: [x, y + s] };
  const order: Record<Corner, [Corner, Corner]> = { tl: ["tr", "bl"], tr: ["br", "tl"], br: ["bl", "tr"], bl: ["tl", "br"] };
  const [a, b] = order[corner];
  return polygon([P[corner], P[a], P[b]]);
}

export function rotatePt([x, y]: Pt, cx: number, cy: number, deg: number): Pt {
  const t = (deg * Math.PI) / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(t) - dy * Math.sin(t), cy + dx * Math.sin(t) + dy * Math.cos(t)];
}
