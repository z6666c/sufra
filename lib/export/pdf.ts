"use client";
// محرك PDF للطباعة: أبعاد حقيقية + هامش قص + علامات القص + TrimBox/BleedBox
import { PDFDocument, StandardFonts, cmyk, rgb } from "pdf-lib";
import { canvasBytes } from "./raster";

const pt = (mm: number) => (mm * 72) / 25.4;
const SLUG = 8; // منطقة علامات القص بالملّيمتر

export interface PdfPageInput {
  canvas: HTMLCanvasElement;
  trimW: number;
  trimH: number;
  bleed: number;
  /** print: صفحة مطبعة مع علامات القص | office: مقاس القص فقط للطابعات المكتبية */
  mode: "print" | "office";
  jpeg?: boolean;
  label?: string;
}

export async function buildPdf(pages: PdfPageInput[], meta: { title: string; subject?: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setSubject(meta.subject ?? "BrandForge AI");
  doc.setCreator("BrandForge AI");
  doc.setProducer("BrandForge AI (pdf-lib)");
  doc.setLanguage("ar");
  const helv = await doc.embedFont(StandardFonts.Helvetica);

  for (const pg of pages) {
    const bytes = await canvasBytes(pg.canvas, pg.jpeg ? "image/jpeg" : "image/png", 0.94);
    const img = pg.jpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const fullW = pg.trimW + pg.bleed * 2, fullH = pg.trimH + pg.bleed * 2;

    if (pg.mode === "print" && pg.bleed > 0) {
      const W = fullW + SLUG * 2, H = fullH + SLUG * 2;
      const page = doc.addPage([pt(W), pt(H)]);
      page.drawImage(img, { x: pt(SLUG), y: pt(SLUG), width: pt(fullW), height: pt(fullH) });
      page.setBleedBox(pt(SLUG), pt(SLUG), pt(fullW), pt(fullH));
      page.setTrimBox(pt(SLUG + pg.bleed), pt(SLUG + pg.bleed), pt(pg.trimW), pt(pg.trimH));
      // علامات القص بلون التسجيل
      const reg = cmyk(1, 1, 1, 1);
      const x0 = SLUG + pg.bleed, x1 = x0 + pg.trimW, y0 = SLUG + pg.bleed, y1 = y0 + pg.trimH;
      const off = pg.bleed + 1, len = 5;
      const line = (ax: number, ay: number, bx: number, by: number) =>
        page.drawLine({ start: { x: pt(ax), y: pt(ay) }, end: { x: pt(bx), y: pt(by) }, thickness: 0.3, color: reg });
      for (const [x, sx] of [[x0, -1], [x1, 1]] as const)
        for (const [y, sy] of [[y0, -1], [y1, 1]] as const) {
          line(x + sx * off, y, x + sx * (off + len), y);
          line(x, y + sy * off, x, y + sy * (off + len));
        }
      if (pg.label)
        page.drawText(`${pg.label}  |  Trim ${pg.trimW}x${pg.trimH} mm  |  Bleed ${pg.bleed} mm  |  300 DPI`, {
          x: pt(SLUG + pg.bleed), y: pt(2.6), size: 5.5, font: helv, color: rgb(0.35, 0.35, 0.35),
        });
    } else {
      const page = doc.addPage([pt(pg.trimW), pt(pg.trimH)]);
      page.drawImage(img, { x: pt(-pg.bleed), y: pt(-pg.bleed), width: pt(fullW), height: pt(fullH) });
    }
  }
  return doc.save();
}
