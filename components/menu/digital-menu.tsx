"use client";
// المنيو الرقمي: الصفحة التي يفتحها الزبون من رمز QR على الطاولة (تُستخدم في المعاينة وفي /m/[slug])
import * as React from "react";
import type { MenuDoc, MenuItem } from "@/lib/types";
import { fontStack } from "@/lib/fonts";
import { bestTextOn } from "@/lib/color";
import { patternDef } from "@/lib/pattern";
import { ALLERGENS, SFDA_CALORIE_NOTE, SFDA_CALORIE_NOTE_EN, TAGS } from "@/lib/templates";
import { Mark, onPrimaryTone } from "../brand-mark";
import { DishImage } from "./dish-placeholder";
import { Clock, MapPin, Phone } from "lucide-react";

type Lang = "ar" | "en";
const t = (lang: Lang, ar: string, en?: string) => (lang === "en" && en ? en : ar);

export function priceText(n: number, lang: Lang, currency = "ر.س") {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return lang === "en" ? `SAR ${v}` : `${v} ${currency}`;
}

function Pattern({ doc, color, opacity }: { doc: MenuDoc; color: string; opacity: number }) {
  const logo = doc.brand.logo;
  const concept = logo.kind === "concept" ? doc.brand.concepts[logo.index] : doc.brand.concepts[0];
  if (!concept) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs>${patternDef(concept, { color, id: "dmp", opacity, scale: 0.45, typography: doc.brand.typography, fontMode: "app" })}</defs><rect width="100%" height="100%" fill="url(#dmp)"/></svg>`;
  return <div aria-hidden className="svg-fit" style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function DigitalMenu({ doc, embedded = false, initialLang = "ar" }: { doc: MenuDoc; embedded?: boolean; initialLang?: Lang }) {
  const [lang, setLang] = React.useState<Lang>(initialLang);
  const [active, setActive] = React.useState(doc.categories[0]?.id);
  const p = doc.brand.palette, ty = doc.brand.typography, s = doc.settings, v = doc.venue;
  const onP = bestTextOn(p.primary.hex, p.neutralLight.hex, p.neutralDark.hex);
  const head = fontStack(lang === "en" ? ty.englishHeading : ty.arabicHeading);
  const body = fontStack(lang === "en" ? ty.englishBody : ty.arabicBody);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const go = (id: string) => {
    setActive(id);
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Badges = ({ it }: { it: MenuItem }) => (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {it.tags.map((tg) => (
        <span key={tg} style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: tg === "spicy" ? "#C2410C1A" : `${p.accent.hex}33`, color: tg === "spicy" ? "#B4380B" : p.neutralDark.hex }}>
          {t(lang, TAGS[tg].label, TAGS[tg].en)}
        </span>
      ))}
      {s.showAllergens && it.allergens.map((a) => (
        <span key={a} title={t(lang, ALLERGENS[a].label, ALLERGENS[a].en)} aria-label={t(lang, ALLERGENS[a].label, ALLERGENS[a].en)} style={{ width: 17, height: 17, borderRadius: 99, border: `1px solid ${p.neutralDark.hex}33`, fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", color: `${p.neutralDark.hex}AA` }}>
          {lang === "en" ? ALLERGENS[a].en[0] : ALLERGENS[a].abbr}
        </span>
      ))}
    </span>
  );

  const Meta = ({ it }: { it: MenuItem }) =>
    s.showCalories && it.calories !== undefined ? (
      <span style={{ fontSize: 11.5, color: `${p.neutralDark.hex}99`, fontFamily: body }}>
        {it.calories} {lang === "en" ? "kcal" : "سعرة حرارية"}
      </span>
    ) : null;

  const Price = ({ it }: { it: MenuItem }) => (
    <span style={{ fontFamily: fontStack(ty.englishHeading), fontWeight: 700, color: p.primary.hex, whiteSpace: "nowrap", fontSize: 15 }} dir="ltr">
      {priceText(it.price, lang, s.currency)}
    </span>
  );

  const renderItem = (it: MenuItem, catId: string) => {
    const off = !it.available;
    const name = t(lang, it.name, it.nameEn);
    const desc = t(lang, it.desc || "", it.descEn);
    const common: React.CSSProperties = { opacity: off ? 0.45 : 1, position: "relative" };
    const unavailable = off ? <span style={{ fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>{lang === "en" ? "Unavailable" : "غير متوفر حالياً"}</span> : null;
    if (s.layout === "cards") {
      return (
        <div key={it.id} style={{ ...common, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: `0 1px 2px ${p.neutralDark.hex}14` }}>
          <DishImage src={it.photo} palette={p} label={name} font={head} radius={0} style={{ width: "100%", aspectRatio: "4 / 3" }} />
          <div style={{ padding: "10px 12px 12px", display: "grid", gap: 4 }}>
            <div style={{ fontFamily: head, fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>{name}</div>
            {desc && <div style={{ fontSize: 12, lineHeight: 1.6, color: `${p.neutralDark.hex}B3` }}>{desc}</div>}
            <Badges it={it} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 8px", marginTop: 2 }}><Price it={it} /><Meta it={it} /></div>
            {unavailable}
          </div>
        </div>
      );
    }
    if (s.layout === "modern") {
      return (
        <div key={it.id} style={{ ...common, display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${p.neutralDark.hex}12` }}>
          <DishImage src={it.photo} palette={p} label={name} font={head} style={{ width: 78, height: 78 }} />
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 3, alignContent: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: head, fontWeight: 700, fontSize: 15.5 }}>{name}</span>
              <Price it={it} />
            </div>
            {desc && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: `${p.neutralDark.hex}B3` }}>{desc}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Badges it={it} /><Meta it={it} /></div>
            {unavailable}
          </div>
        </div>
      );
    }
    return (
      <div key={it.id} style={{ ...common, padding: "11px 0", display: "grid", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: head, fontWeight: 600, fontSize: 16 }}>{name}</span>
          <span aria-hidden style={{ flex: 1, borderBottom: `1.5px dotted ${p.neutralDark.hex}40`, transform: "translateY(-4px)" }} />
          <Price it={it} />
        </div>
        {desc && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: `${p.neutralDark.hex}B3` }}>{desc}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Badges it={it} /><Meta it={it} /></div>
        {unavailable}
      </div>
    );
  };

  return (
    <div ref={rootRef} dir={lang === "en" ? "ltr" : "rtl"} lang={lang} style={{ background: p.neutralLight.hex, color: p.neutralDark.hex, fontFamily: body, minHeight: embedded ? "100%" : "100dvh" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <header style={{ position: "relative", overflow: "hidden", background: p.primary.hex, color: onP, padding: "28px 20px 26px", textAlign: "center" }}>
          <Pattern doc={doc} color={onP} opacity={0.14} />
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 2, background: `${onP}22`, color: onP, border: `1px solid ${onP}44`, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontStack(ty.englishBody) }}
          >
            {lang === "ar" ? "English" : "عربي"}
          </button>
          <div style={{ position: "relative", display: "grid", justifyItems: "center", gap: 10 }}>
            <Mark doc={doc} tone={onPrimaryTone(doc)} size={64} />
            <div style={{ fontFamily: head, fontWeight: 800, fontSize: 26, lineHeight: 1.25 }}>{t(lang, v.name, v.nameEn)}</div>
            {v.tagline && <div style={{ fontSize: 13, opacity: 0.85 }}>{v.tagline}</div>}
          </div>
        </header>

        <nav style={{ position: "sticky", top: 0, zIndex: 5, background: p.neutralLight.hex, borderBottom: `1px solid ${p.neutralDark.hex}14`, overflowX: "auto", whiteSpace: "nowrap", padding: "10px 14px", scrollbarWidth: "none" }}>
          {doc.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c.id)}
              style={{
                display: "inline-block", marginInlineEnd: 8, padding: "7px 14px", borderRadius: 99, fontSize: 13.5, cursor: "pointer", fontFamily: head, fontWeight: 600,
                border: `1px solid ${active === c.id ? p.primary.hex : `${p.neutralDark.hex}22`}`,
                background: active === c.id ? p.primary.hex : "transparent", color: active === c.id ? onP : p.neutralDark.hex,
              }}
            >
              {t(lang, c.name, c.nameEn)}
            </button>
          ))}
        </nav>

        <main style={{ padding: "6px 18px 10px" }}>
          {doc.categories.map((c) => (
            <section key={c.id} data-cat={c.id} style={{ paddingTop: 18, scrollMarginTop: 56 }}>
              <h2 style={{ fontFamily: head, fontWeight: 800, fontSize: 19, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 3, borderRadius: 2, background: p.accent.hex, display: "inline-block" }} />
                {t(lang, c.name, c.nameEn)}
              </h2>
              <div style={s.layout === "cards" ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 8 } : undefined}>
                {c.items.map((it) => renderItem(it, c.id))}
              </div>
            </section>
          ))}
        </main>

        <footer style={{ padding: "18px 20px 30px", fontSize: 12, lineHeight: 1.9, color: `${p.neutralDark.hex}B3`, borderTop: `1px solid ${p.neutralDark.hex}14`, marginTop: 14 }}>
          {s.vatIncluded && <div>{lang === "en" ? "All prices include 15% VAT." : "جميع الأسعار شاملة ضريبة القيمة المضافة 15%."}</div>}
          {s.showCalories && <div>{lang === "en" ? SFDA_CALORIE_NOTE_EN : SFDA_CALORIE_NOTE}.</div>}
          {s.showAllergens && (
            <div>
              {lang === "en" ? "Allergens: " : "مسببات الحساسية: "}
              {Object.values(ALLERGENS).map((a) => `${lang === "en" ? a.en[0] : a.abbr} = ${t(lang, a.label, a.en)}`).join(" · ")}
            </div>
          )}
          <div style={{ marginTop: 10, display: "grid", gap: 2, color: p.neutralDark.hex }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Clock size={13} /> {v.hours}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><MapPin size={13} /> {v.address}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Phone size={13} /> <span dir="ltr">{v.phone} · {v.instagram}</span></span>
          </div>
          <div style={{ marginTop: 14, fontSize: 10.5, opacity: 0.6 }}>{lang === "en" ? "Menu by Sufra" : "صُنع بواسطة سُفرة"}</div>
        </footer>
      </div>
    </div>
  );
}
