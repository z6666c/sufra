// قياس عرض النص بدقة باستخدام محرك المتصفح (يدعم تشكيل الحروف العربية)

export type Measurer = (text: string, fontCss: string, weight: number, size: number, letterSpacingEm?: number) => number;

export const estimateMeasure: Measurer = (text, _f, weight, size, ls = 0) => {
  const factor = /[؀-ۿ]/.test(text) ? 0.5 : 0.58;
  return text.length * size * (factor + (weight >= 700 ? 0.03 : 0) + ls);
};

let cache = new Map<string, number>();
let probe: HTMLSpanElement | null = null;

export function resetMeasureCache() {
  cache = new Map();
}

export const browserMeasure: Measurer = (text, fontCss, weight, size, ls = 0) => {
  if (typeof document === "undefined") return estimateMeasure(text, fontCss, weight, size, ls);
  const key = `${text}|${fontCss}|${weight}|${size}|${ls}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!probe) {
    // حاوية صفرية المقاس تقص المحتوى: لا تُحدث تمريراً أفقياً في الصفحات ذات الاتجاه RTL
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, { position: "fixed", left: "0", top: "0", width: "0", height: "0", overflow: "hidden", pointerEvents: "none" });
    probe = document.createElement("span");
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", whiteSpace: "pre", left: "0", top: "0" });
    host.appendChild(probe);
    document.body.appendChild(host);
  }
  probe.style.fontFamily = fontCss;
  probe.style.fontWeight = String(weight);
  probe.style.fontSize = `${size}px`;
  probe.style.letterSpacing = ls ? `${ls}em` : "normal";
  probe.textContent = text;
  const w = probe.getBoundingClientRect().width;
  cache.set(key, w);
  return w;
};
