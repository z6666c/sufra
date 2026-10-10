"use client";
// المنيو المطبوع A4 بعمودين وتوزيع تلقائي على الصفحات
import * as React from "react";
import type { MenuCategory, MenuDoc, MenuItem } from "@/lib/types";
import { fontStack } from "@/lib/fonts";
import { bestTextOn } from "@/lib/color";
import { ALLERGENS, SFDA_CALORIE_NOTE } from "@/lib/templates";
import { Mark, onPrimaryTone } from "../brand-mark";
import { PatternLayer, Sheet, SPECS } from "./kit";

type Block = { kind: "cat"; cat: MenuCategory; cont?: boolean } | { kind: "item"; item: MenuItem };
const B = SPECS.menuPage.bleed;
const M = 16; // الهامش الداخلي بالملّيمتر
const COL_H_FIRST = 297 - M - 62 - 22; // ارتفاع العمود في الصفحة الأولى (ترويسة كبيرة)
const COL_H = 297 - M - 26 - 22;

const itemH = (it: MenuItem) => 8.5 + (it.desc ? (it.desc.length > 46 ? 9 : 5) : 0);

/** توزيع الأقسام والأصناف على عمودين وصفحات، مع موازنة العمودين في الصفحة الأخيرة */
export function paginate(doc: MenuDoc): Block[][][] {
  type Unit = { blocks: Block[]; h: number; cat: MenuCategory };
  const units: Unit[] = [];
  for (const c of doc.categories) {
    if (!c.items.length) { units.push({ blocks: [{ kind: "cat", cat: c }], h: 17, cat: c }); continue; }
    c.items.forEach((it, i) => {
      const blocks: Block[] = i === 0 ? [{ kind: "cat", cat: c }, { kind: "item", item: it }] : [{ kind: "item", item: it }];
      units.push({ blocks, h: itemH(it) + (i === 0 ? 17 : 0), cat: c });
    });
  }
  const pages: Block[][][] = [];
  let u = 0;
  while (u < units.length) {
    const cap = pages.length === 0 ? COL_H_FIRST : COL_H;
    const remaining = units.slice(u).reduce((s, x) => s + x.h, 0);
    const target = remaining <= cap * 2 ? Math.min(cap, remaining / 2 + 6) : cap;
    const page: Block[][] = [[], []];
    for (let col = 0; col < 2 && u < units.length; col++) {
      let used = 0;
      const limit = col === 0 ? target : cap;
      while (u < units.length && (used === 0 || used + units[u].h <= limit)) {
        const unit = units[u];
        if (used === 0 && unit.blocks[0].kind === "item") { page[col].push({ kind: "cat", cat: unit.cat, cont: true }); used += 13; }
        page[col].push(...unit.blocks);
        used += unit.h;
        u++;
      }
    }
    pages.push(page);
  }
  return pages.length ? pages : [[[], []]];
}

export function PrintMenuPage({ doc, blocks, index, total, guides, printId }: { doc: MenuDoc; blocks: Block[][]; index: number; total: number; guides?: boolean; printId?: string }) {
  const p = doc.brand.palette, ty = doc.brand.typography, s = doc.settings, v = doc.venue;
  const onP = bestTextOn(p.primary.hex, p.neutralLight.hex, p.neutralDark.hex);
  const head = fontStack(ty.arabicHeading), body = fontStack(ty.arabicBody), latin = fontStack(ty.englishBody);
  const first = index === 0;
  const Item = ({ it }: { it: MenuItem }) => (
    <div style={{ padding: "2mm 0", opacity: it.available ? 1 : 0.45 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "2mm" }}>
        <span style={{ fontFamily: head, fontWeight: 700, fontSize: "11pt" }}>{it.name}</span>
        {it.nameEn && <span style={{ fontFamily: latin, fontSize: "7.5pt", opacity: 0.6 }} dir="ltr">{it.nameEn}</span>}
        <span style={{ flex: 1, borderBottom: `0.3mm dotted ${p.neutralDark.hex}55`, transform: "translateY(-1mm)" }} />
        <span style={{ fontFamily: fontStack(ty.englishHeading), fontWeight: 700, fontSize: "11pt", color: p.primary.hex }} dir="ltr">{it.price}</span>
      </div>
      <div style={{ fontSize: "8pt", lineHeight: 1.55, color: `${p.neutralDark.hex}B0`, display: "flex", gap: "2mm", flexWrap: "wrap" }}>
        {it.desc && <span>{it.desc}</span>}
        {s.showCalories && it.calories !== undefined && <span style={{ whiteSpace: "nowrap" }}>· {it.calories} سعرة حرارية</span>}
        {s.showAllergens && it.allergens.length > 0 && <span style={{ whiteSpace: "nowrap" }}>· {it.allergens.map((a) => ALLERGENS[a].abbr).join(" ")}</span>}
        {!it.available && <span style={{ color: "#B91C1C" }}>· غير متوفر</span>}
      </div>
    </div>
  );
  return (
    <Sheet spec={SPECS.menuPage} bg={p.neutralLight.hex} guides={guides} printId={printId}>
      <div style={{ position: "absolute", inset: 0, color: p.neutralDark.hex, fontFamily: body }}>
        {first ? (
          <div style={{ position: "relative", height: `${B + 52}mm`, background: p.primary.hex, color: onP, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: "6mm", paddingTop: `${B}mm` }}>
            <PatternLayer doc={doc} color={onP} opacity={0.13} scale={0.5} />
            <Mark doc={doc} tone={onPrimaryTone(doc)} size="26mm" style={{ position: "relative" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: head, fontWeight: 800, fontSize: "28pt", lineHeight: 1.2 }}>{v.name}</div>
              {v.nameEn && <div style={{ fontFamily: fontStack(ty.englishHeading), fontWeight: 600, letterSpacing: "0.2em", fontSize: "10pt", textTransform: "uppercase", opacity: 0.85 }} dir="ltr">{v.nameEn}</div>}
              {v.tagline && <div style={{ fontSize: "10pt", opacity: 0.85, marginTop: "1mm" }}>{v.tagline}</div>}
            </div>
          </div>
        ) : (
          <div style={{ height: `${B + 18}mm`, borderBottom: `0.4mm solid ${p.primary.hex}`, margin: `0 ${B + M}mm`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: "3mm" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
              <Mark doc={doc} size="9mm" />
              <span style={{ fontFamily: head, fontWeight: 800, fontSize: "14pt" }}>{v.name}</span>
            </div>
            <span style={{ fontFamily: latin, fontSize: "8pt", opacity: 0.6 }} dir="ltr">{index + 1} / {total}</span>
          </div>
        )}

        <div style={{ position: "absolute", top: `${B + (first ? 60 : 26)}mm`, right: `${B + M}mm`, left: `${B + M}mm`, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "10mm" }}>
          {[0, 1].map((ci) => (
            <div key={ci}>
              {(blocks[ci] ?? []).map((b, i) =>
                b.kind === "cat" ? (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "2.5mm", margin: i === 0 ? "0 0 1.5mm" : "4mm 0 1.5mm", height: "9mm" }}>
                    <span style={{ width: "6mm", height: "1mm", background: p.accent.hex, borderRadius: "1mm" }} />
                    <span style={{ fontFamily: head, fontWeight: 800, fontSize: "14pt", color: p.primary.hex }}>{b.cat.name}{b.cont ? " (تابع)" : ""}</span>
                    {b.cat.nameEn && <span style={{ fontFamily: latin, fontSize: "8pt", opacity: 0.55 }} dir="ltr">{b.cat.nameEn}</span>}
                  </div>
                ) : (
                  <Item key={i} it={b.item} />
                ),
              )}
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: `${B + 8}mm`, right: `${B + M}mm`, left: `${B + M}mm`, fontSize: "7pt", lineHeight: 1.7, color: `${p.neutralDark.hex}99`, borderTop: `0.2mm solid ${p.neutralDark.hex}22`, paddingTop: "2mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "4mm" }}>
            <span>{s.vatIncluded ? "الأسعار بالريال السعودي وشاملة ضريبة القيمة المضافة 15%." : "الأسعار بالريال السعودي."}{s.showCalories ? ` ${SFDA_CALORIE_NOTE}.` : ""}</span>
            <span dir="ltr" style={{ fontFamily: latin, whiteSpace: "nowrap" }}>{v.phone} · {v.instagram}</span>
          </div>
          {s.showAllergens && <div>مسببات الحساسية: {Object.values(ALLERGENS).map((a) => `${a.abbr} ${a.label}`).join(" · ")}</div>}
        </div>
      </div>
    </Sheet>
  );
}

export function PrintMenu({ doc, guides, idPrefix }: { doc: MenuDoc; guides?: boolean; idPrefix?: string }) {
  const pages = paginate(doc);
  return (
    <>
      {pages.map((b, i) => (
        <PrintMenuPage key={i} doc={doc} blocks={b} index={i} total={pages.length} guides={guides} printId={idPrefix ? `${idPrefix}${i}` : undefined} />
      ))}
    </>
  );
}
