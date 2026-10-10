"use client";
// علامة المنشأة: رمز مولّد بمحرك الهوية أو شعار مرفوع من صاحب المنشأة
import * as React from "react";
import type { MenuDoc } from "@/lib/types";
import { colorsOf, symbolFonts, symbolInner } from "@/lib/logo/render";
import { bestTextOn } from "@/lib/color";

export type MarkTone = "color" | "light" | "dark";

export function onPrimaryTone(doc: MenuDoc): MarkTone {
  const p = doc.brand.palette;
  return bestTextOn(p.primary.hex, p.neutralLight.hex, p.neutralDark.hex) === p.neutralLight.hex ? "light" : "dark";
}

export function symbolSvg(doc: MenuDoc, tone: MarkTone = "color"): string | null {
  const logo = doc.brand.logo;
  if (logo.kind !== "concept") return null;
  const c = doc.brand.concepts[logo.index] ?? doc.brand.concepts[0];
  const p = doc.brand.palette;
  const mono = tone === "light" ? p.neutralLight.hex : tone === "dark" ? p.neutralDark.hex : undefined;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${symbolInner(c, colorsOf(p), mono, symbolFonts(doc.brand.typography))}</svg>`;
}

/** الرمز وحده بمقاس مربع */
export function Mark({ doc, tone = "color", size, style }: { doc: MenuDoc; tone?: MarkTone; size: number | string; style?: React.CSSProperties }) {
  const logo = doc.brand.logo;
  const box: React.CSSProperties = { width: size, height: size, flexShrink: 0, ...style };
  if (logo.kind === "image") {
    // الشعار المرفوع لا يُلوَّن (قد يفقد تفاصيله)؛ على الخلفيات الملونة يوضع داخل شارة فاتحة
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={logo.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />;
    if (tone === "color") return <div style={box}>{img}</div>;
    const pad = typeof size === "number" ? size * 0.13 : `calc(${size} * 0.13)`;
    return <div style={{ ...box, background: doc.brand.palette.neutralLight.hex, borderRadius: "24%", padding: pad, boxSizing: "border-box" }}>{img}</div>;
  }
  return <div className="svg-fit" style={box} dangerouslySetInnerHTML={{ __html: symbolSvg(doc, tone)! }} />;
}
