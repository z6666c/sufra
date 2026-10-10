"use client";
import * as React from "react";
import type { MenuDoc } from "@/lib/types";
import { patternDef } from "@/lib/pattern";

export const PX_PER_MM = 96 / 25.4;
export const SPECS = {
  menuPage: { w: 210, h: 297, bleed: 3 },
  tableCard: { w: 105, h: 148, bleed: 3 },
} as const;

export function Sheet({ spec, bg, guides, children, printId }: { spec: { w: number; h: number; bleed: number }; bg: string; guides?: boolean; children: React.ReactNode; printId?: string }) {
  const W = spec.w + spec.bleed * 2, H = spec.h + spec.bleed * 2;
  return (
    <div data-print-id={printId} style={{ width: `${W}mm`, height: `${H}mm`, position: "relative", overflow: "hidden", background: bg, direction: "rtl" }}>
      {children}
      {guides && spec.bleed > 0 && <div style={{ position: "absolute", inset: `${spec.bleed}mm`, outline: "0.25mm dashed rgba(220,80,40,.9)", pointerEvents: "none", zIndex: 50 }} />}
    </div>
  );
}

export function PatternLayer({ doc, color, opacity = 0.12, scale = 0.5 }: { doc: MenuDoc; color: string; opacity?: number; scale?: number }) {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const logo = doc.brand.logo;
  const concept = logo.kind === "concept" ? doc.brand.concepts[logo.index] : doc.brand.concepts[0];
  if (!concept) return null;
  const id = `pl${rid}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs>${patternDef(concept, { color, id, opacity, scale, typography: doc.brand.typography, fontMode: "app" })}</defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
  return <div aria-hidden className="svg-fit" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** تصغير معاينة بمقاس حقيقي لتناسب العرض المتاح */
export function FitScale({ wPx, hPx, maxH, children }: { wPx: number; hPx: number; maxH?: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [avail, setAvail] = React.useState(600);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      setAvail((prev) => (Math.abs(prev - w) > 24 || w < prev - 2 ? w : prev));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  let s = Math.min(avail / wPx, 1.6);
  if (maxH) s = Math.min(s, maxH / hPx);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ width: wPx * s, height: hPx * s, margin: "0 auto", position: "relative" }}>
        <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>{children}</div>
      </div>
    </div>
  );
}
