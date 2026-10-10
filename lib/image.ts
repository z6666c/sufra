"use client";
// ضغط الصور في المتصفح قبل حفظها مع المنيو (يبقي حجم المنيو المنشور صغيراً)

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("تعذر قراءة الملف"));
    r.readAsDataURL(file);
  });
}

export async function compressImage(src: string, maxSide = 640, type: "image/jpeg" | "image/png" = "image/jpeg", quality = 0.8): Promise<string> {
  if (src.startsWith("data:image/svg")) return src; // SVG يبقى كما هو
  const img = new Image();
  img.src = src;
  await img.decode();
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  const ctx = c.getContext("2d")!;
  if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(type, quality);
}
