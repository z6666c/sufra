"use client";
import { nativeApp, saveFile } from "../native";
// تحويل عناصر المعاينة إلى صور عالية الدقة مع تضمين الخطوط
import { getFontEmbedCSS, toCanvas } from "html-to-image";

const fontCssCache = new Map<string, string>();

export const DPI = 300;
export const PRINT_PIXEL_RATIO = DPI / 96; // 1 CSS px = 1/96 بوصة

export async function rasterize(node: HTMLElement, pixelRatio: number, fontKey = "default"): Promise<HTMLCanvasElement> {
  let css = fontCssCache.get(fontKey);
  if (css === undefined) {
    try {
      css = await getFontEmbedCSS(node);
    } catch {
      css = "";
    }
    fontCssCache.set(fontKey, css);
  }
  const rect = node.getBoundingClientRect();
  return toCanvas(node, {
    pixelRatio,
    fontEmbedCSS: css,
    width: node.offsetWidth || rect.width,
    height: node.offsetHeight || rect.height,
    skipAutoScale: true,
    cacheBust: false,
    style: { transform: "none", margin: "0" },
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg" = "image/png", quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذر إنشاء الصورة"))), type, quality),
  );
}

export async function canvasBytes(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg" = "image/png", quality = 0.95) {
  return new Uint8Array(await (await canvasToBlob(canvas, type, quality)).arrayBuffer());
}

export function resizeCanvas(src: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = Math.round((src.height / src.width) * size);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function downloadBlob(blob: Blob, filename: string) {
  // داخل تطبيق الجوال: حفظ ومشاركة بدل رابط التنزيل
  if (nativeApp()) { saveFile(blob, filename).catch((e) => console.error("[save]", e)); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
