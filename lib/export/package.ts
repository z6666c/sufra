"use client";
// حزمة سُفرة الكاملة: منيو PDF، بطاقة طاولة، منشورات، QR، الشعار، بيانات المنيو
import JSZip from "jszip";
import type { MenuDoc } from "../types";
import { buildPdf, type PdfPageInput } from "./pdf";
import { PRINT_PIXEL_RATIO, canvasBytes, rasterize } from "./raster";
import { qrSvg } from "../qr";
import { faviconSvg, iconSvg, lockupSvg } from "../logo/render";
import { browserMeasure } from "../measure";
import { SFDA_CALORIE_NOTE } from "../templates";

export type GetNode = (id: string) => HTMLElement;

export function slugName(doc: MenuDoc) {
  const en = doc.venue.nameEn?.trim();
  return (en ? en.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") : "") || "menu";
}

export async function renderMenuPdf(getNode: GetNode, pageCount: number, mode: "print" | "office", fontKey: string, label: string) {
  const pages: PdfPageInput[] = [];
  for (let i = 0; i < pageCount; i++) {
    const canvas = await rasterize(getNode(`menu${i}`), PRINT_PIXEL_RATIO, fontKey);
    pages.push({ canvas, trimW: 210, trimH: 297, bleed: 3, mode, jpeg: true, label: `${label} p${i + 1}` });
  }
  return buildPdf(pages, { title: `منيو ${label}` });
}

export async function renderTableCardPdf(getNode: GetNode, fontKey: string, label: string) {
  const canvas = await rasterize(getNode("tableCard"), PRINT_PIXEL_RATIO, fontKey);
  return buildPdf([{ canvas, trimW: 105, trimH: 148, bleed: 3, mode: "print", label: `${label} table card` }], { title: `بطاقة طاولة ${label}` });
}

function logoFiles(doc: MenuDoc): Record<string, string> {
  if (doc.brand.logo.kind !== "concept") return {};
  const c = doc.brand.concepts[doc.brand.logo.index];
  const base = { concept: c, palette: doc.brand.palette, typography: doc.brand.typography, name: doc.venue.name, nameEn: doc.venue.nameEn, tagline: doc.venue.tagline, measure: browserMeasure, fontMode: "file" as const };
  return {
    "logo-horizontal.svg": lockupSvg({ ...base, layout: "horizontal" }).svg,
    "logo-vertical.svg": lockupSvg({ ...base, layout: "vertical" }).svg,
    "logo-mono-black.svg": lockupSvg({ ...base, layout: "horizontal", variant: "mono-dark" }).svg,
    "logo-mono-white.svg": lockupSvg({ ...base, layout: "horizontal", variant: "mono-light" }).svg,
    "icon.svg": iconSvg(c, doc.brand.palette, { typography: doc.brand.typography, fontMode: "file" }),
    "favicon.svg": faviconSvg(c, doc.brand.palette, 64, doc.brand.typography, "file"),
  };
}

export async function buildPackage(opts: {
  doc: MenuDoc; url?: string; getNode: GetNode; menuPages: number; postIds: string[]; onProgress: (l: string, pct: number) => void;
}): Promise<{ blob: Blob; filename: string; warnings: string[] }> {
  const { doc, url, getNode, onProgress } = opts;
  const name = slugName(doc);
  const fontKey = JSON.stringify(doc.brand.typography);
  const zip = new JSZip();
  const root = zip.folder(`${name}-sufra`)!;
  const warnings: string[] = [];

  onProgress("المنيو المطبوع", 10);
  root.file("01-print/menu-A4-print.pdf", await renderMenuPdf(getNode, opts.menuPages, "print", fontKey, name));
  onProgress("نسخة الطابعة المكتبية", 30);
  root.file("01-print/menu-A4-office.pdf", await renderMenuPdf(getNode, opts.menuPages, "office", fontKey, name));
  onProgress("بطاقة الطاولة", 45);
  root.file("01-print/table-card-A6-print.pdf", await renderTableCardPdf(getNode, fontKey, name));
  if (!url) warnings.push("المنيو الرقمي غير منشور؛ بطاقة الطاولة ومنشور أوقات العمل بلا رمز QR");

  for (let i = 0; i < opts.postIds.length; i++) {
    const id = opts.postIds[i];
    onProgress("منشورات السوشيال", 55 + i * 6);
    const canvas = await rasterize(getNode(`post-${id}`), 1, fontKey);
    root.file(`02-social/${id}.png`, await canvasBytes(canvas));
  }

  onProgress("رمز QR والشعار", 88);
  if (url) {
    root.file("03-qr/menu-qr.svg", `<?xml version="1.0" encoding="UTF-8"?>\n${qrSvg(url, { fg: "#000", bg: "#fff", border: 4, ecc: "M" })}`);
    root.file("03-qr/menu-link.txt", url);
  }
  const logos = logoFiles(doc);
  Object.entries(logos).forEach(([f, s]) => root.file(`04-logo/${f}`, `<?xml version="1.0" encoding="UTF-8"?>\n${s}`));
  if (doc.brand.logo.kind === "image") {
    const m = doc.brand.logo.dataUrl.match(/^data:image\/([a-z+]+);base64,(.*)$/);
    if (m) root.file(`04-logo/logo.${m[1] === "svg+xml" ? "svg" : m[1]}`, m[2], { base64: true });
  }
  const { brand, ...rest } = doc;
  root.file("05-data/menu.json", JSON.stringify({ ...rest, brand: { palette: brand.palette, typography: brand.typography } }, null, 2));
  root.file(
    "README.txt",
    `حزمة سُفرة — ${doc.venue.name}\n\n01-print: منيو A4 للمطبعة (قص 3 مم وعلامات القص) ونسخة للطابعة المكتبية، وبطاقة طاولة A6\n02-social: منشورات إنستقرام 1080×1080 وستوري 1080×1920\n03-qr: رمز المنيو الرقمي ورابطه\n04-logo: ملفات الشعار\n05-data: بيانات المنيو\n\nتنبيه: السعرات الحرارية في القوالب تقديرية؛ تحقق منها قبل الطباعة.\nالعبارة المعروضة: ${SFDA_CALORIE_NOTE}\n`,
  );
  onProgress("ضغط الحزمة", 96);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, filename: `${name}-sufra.zip`, warnings };
}
