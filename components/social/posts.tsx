"use client";
// منشورات سوشيال جاهزة بمقاسات إنستقرام (1080×1080) والستوري (1080×1920)
import * as React from "react";
import type { MenuDoc, MenuItem } from "@/lib/types";
import { fontStack } from "@/lib/fonts";
import { bestTextOn } from "@/lib/color";
import { qrSvg } from "@/lib/qr";
import { Mark, onPrimaryTone } from "../brand-mark";
import { DishImage } from "../menu/dish-placeholder";
import { PatternLayer } from "../print/kit";

export type PostKind = "featured" | "new" | "offer" | "hours" | "story";
export const POSTS: { id: PostKind; label: string; w: number; h: number }[] = [
  { id: "featured", label: "طبق مميز", w: 1080, h: 1080 },
  { id: "new", label: "جديد في المنيو", w: 1080, h: 1080 },
  { id: "offer", label: "عرض خاص", w: 1080, h: 1080 },
  { id: "hours", label: "أوقات العمل", w: 1080, h: 1080 },
  { id: "story", label: "ستوري", w: 1080, h: 1920 },
];

interface P { doc: MenuDoc; item?: MenuItem; offerText: string; url?: string; kind: PostKind; printId?: string }

export function SocialPost({ doc, item, offerText, url, kind, printId }: P) {
  const p = doc.brand.palette, ty = doc.brand.typography, v = doc.venue;
  const onP = bestTextOn(p.primary.hex, p.neutralLight.hex, p.neutralDark.hex);
  const head = fontStack(ty.arabicHeading), body = fontStack(ty.arabicBody), latin = fontStack(ty.englishHeading);
  const spec = POSTS.find((x) => x.id === kind)!;
  const root: React.CSSProperties = { width: spec.w, height: spec.h, position: "relative", overflow: "hidden", direction: "rtl", fontFamily: body, color: p.neutralDark.hex, background: p.neutralLight.hex };
  const brandRow = (tone: "color" | "light" | "dark", color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, color }}>
      <Mark doc={doc} tone={tone} size={84} />
      <div>
        <div style={{ fontFamily: head, fontWeight: 800, fontSize: 40, lineHeight: 1.2 }}>{v.name}</div>
        <div style={{ fontFamily: fontStack(ty.englishBody), fontSize: 24, opacity: 0.75 }} dir="ltr">{v.instagram}</div>
      </div>
    </div>
  );
  const price = item ? (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10, background: p.accent.hex, color: bestTextOn(p.accent.hex), padding: "14px 30px", borderRadius: 999, fontFamily: latin, fontWeight: 800, fontSize: 52 }}>
      <span dir="ltr">{item.price}</span><span style={{ fontFamily: head, fontSize: 30 }}>ر.س</span>
    </div>
  ) : null;

  if (kind === "featured" || kind === "new" || kind === "story") {
    const story = kind === "story";
    const photoH = story ? 1080 : 640;
    return (
      <div data-print-id={printId} style={root}>
        <DishImage src={item?.photo} palette={p} label={item?.name} font={head} radius={0} style={{ position: "absolute", top: 0, left: 0, width: spec.w, height: photoH }} />
        <div style={{ position: "absolute", top: photoH - 140, left: 0, right: 0, height: 140, background: `linear-gradient(transparent, ${p.neutralLight.hex})` }} />
        {kind === "new" && (
          <div style={{ position: "absolute", top: 60, right: 60, background: p.primary.hex, color: onP, fontFamily: head, fontWeight: 800, fontSize: 44, padding: "16px 36px", borderRadius: 999 }}>جديد في المنيو</div>
        )}
        <div style={{ position: "absolute", top: photoH - 30, right: 70, left: 70, display: "grid", gap: story ? 34 : 22 }}>
          <div style={{ fontFamily: head, fontWeight: 800, fontSize: story ? 96 : 76, lineHeight: 1.15 }}>{item?.name ?? "اختر صنفاً"}</div>
          {item?.desc && <div style={{ fontSize: story ? 40 : 32, lineHeight: 1.6, color: `${p.neutralDark.hex}B3`, maxWidth: 900 }}>{item.desc}</div>}
          <div>{price}</div>
        </div>
        <div style={{ position: "absolute", bottom: story ? 110 : 60, right: 70, left: 70, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {brandRow("color", p.neutralDark.hex)}
          {item?.calories !== undefined && doc.settings.showCalories && <span style={{ fontSize: 26, opacity: 0.6 }}>{item.calories} سعرة حرارية</span>}
        </div>
      </div>
    );
  }
  if (kind === "offer") {
    return (
      <div data-print-id={printId} style={{ ...root, background: p.primary.hex, color: onP }}>
        <PatternLayer doc={doc} color={onP} opacity={0.12} scale={1.4} />
        <div style={{ position: "absolute", inset: 80, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {brandRow(onPrimaryTone(doc), onP)}
          <div>
            <div style={{ fontFamily: head, fontWeight: 800, fontSize: 132, lineHeight: 1.1, whiteSpace: "pre-line" }}>{offerText}</div>
            {item && <div style={{ fontSize: 40, marginTop: 30, opacity: 0.9 }}>على {item.name}</div>}
          </div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>العرض لفترة محدودة · {v.city}</div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22, background: p.accent.hex }} />
      </div>
    );
  }
  return (
    <div data-print-id={printId} style={root}>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 360, background: p.primary.hex, overflow: "hidden" }}>
        <PatternLayer doc={doc} color={onP} opacity={0.16} scale={1.2} />
      </div>
      <div style={{ position: "absolute", top: 90, right: 440, left: 80, bottom: 90, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {brandRow("color", p.neutralDark.hex)}
        <div>
          <div style={{ fontFamily: head, fontWeight: 800, fontSize: 84, color: p.primary.hex }}>أوقات العمل</div>
          <div style={{ fontSize: 46, marginTop: 20, lineHeight: 1.5 }}>{v.hours}</div>
          <div style={{ fontSize: 30, marginTop: 24, opacity: 0.7, lineHeight: 1.6 }}>{v.address}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {url && <div className="svg-fit" style={{ width: 180, height: 180, background: "#fff", padding: 12, borderRadius: 18 }} dangerouslySetInnerHTML={{ __html: qrSvg(url, { fg: p.neutralDark.hex, border: 0 }) }} />}
          <div style={{ fontSize: 30, opacity: 0.8 }}>{url ? "امسح لعرض المنيو" : <span dir="ltr">{v.phone}</span>}</div>
        </div>
      </div>
    </div>
  );
}
