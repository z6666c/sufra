"use client";
import * as React from "react";
import { Check, Plus, RefreshCw, Upload } from "lucide-react";
import { AiLogoTrial } from "./ai-trial";
import { useMenu } from "@/store/menu-store";
import type { MenuLayout, PaletteKey, Venue } from "@/lib/types";
import { colorsOf, symbolFonts, symbolInner } from "@/lib/logo/render";
import { normalizeHex } from "@/lib/color";
import { FONT_CHOICES } from "@/lib/fonts";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { Button, cn, Input } from "../ui/primitives";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1 block text-xs text-muted">{label}</span>{children}</label>
);

const COLORS: { k: PaletteKey; label: string }[] = [
  { k: "primary", label: "الرئيسي" }, { k: "secondary", label: "الثانوي" }, { k: "accent", label: "التمييزي" },
  { k: "neutralDark", label: "النصوص" }, { k: "neutralLight", label: "الخلفية" },
];

function ColorRow({ k, label }: { k: PaletteKey; label: string }) {
  const hex = useMenu((s) => s.doc!.brand.palette[k].hex);
  const update = useMenu((s) => s.updateColor);
  const [draft, setDraft] = React.useState(hex);
  React.useEffect(() => setDraft(hex), [hex]);
  return (
    <div className="flex items-center gap-2.5">
      <input type="color" value={hex} onChange={(e) => update(k, e.target.value)} className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/10" aria-label={label} />
      <span className="w-16 text-xs text-muted">{label}</span>
      <input value={draft} dir="ltr" onChange={(e) => { setDraft(e.target.value); const n = normalizeHex(e.target.value); if (n) update(k, n); }} onBlur={() => setDraft(hex)} className="w-full bg-transparent font-latin text-sm font-semibold uppercase outline-none" aria-label={`${label} HEX`} />
    </div>
  );
}

export function BrandEditor() {
  const doc = useMenu((s) => s.doc)!;
  const { selectConcept, setLogoImage, regenerateBrand, updateTypography, regenerateLogos, moreLogos } = useMenu.getState();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const logo = doc.brand.logo;
  const onFile = async (f?: File) => {
    if (!f) return;
    const raw = await fileToDataUrl(f);
    setLogoImage(f.type === "image/svg+xml" ? raw : await compressImage(raw, 800, "image/png"));
  };
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-semibold">الشعار</div>
        <div className="grid grid-cols-4 gap-2">
          {doc.brand.concepts.map((c, i) => {
            const on = logo.kind === "concept" && logo.index === i;
            return (
              <button key={c.id + i} onClick={() => selectConcept(i)} title={c.title} className={cn("relative aspect-square rounded-xl border p-2", on ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink/40")} style={{ background: doc.brand.palette.neutralLight.hex }}>
                <div className="svg-fit h-full w-full" dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${symbolInner(c, colorsOf(doc.brand.palette), undefined, symbolFonts(doc.brand.typography))}</svg>` }} />
                {on && <Check className="absolute top-1 left-1 h-3.5 w-3.5 rounded-full bg-ink p-0.5 text-paper" />}
              </button>
            );
          })}
          <button onClick={() => fileRef.current?.click()} className={cn("flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[11px] text-muted", logo.kind === "image" ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink/40")}>
            {logo.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.dataUrl} alt="الشعار المرفوع" className="h-full w-full object-contain p-1.5" />
            ) : (<><Upload className="h-4 w-4" /> شعاري</>)}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="mt-2 text-[11px] leading-relaxed text-muted">عندك شعار؟ ارفعه بصيغة PNG شفاف أو SVG. أو اختر رمزاً مولّداً.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={regenerateLogos}><RefreshCw className="h-3.5 w-3.5" /> رموز جديدة</Button>
          <Button size="sm" variant="outline" onClick={moreLogos} disabled={doc.brand.concepts.length >= 30}><Plus className="h-3.5 w-3.5" /> المزيد</Button>
        </div>
        <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={() => regenerateBrand(true)}><RefreshCw className="h-3.5 w-3.5" /> رموز وألوان جديدة</Button>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">كل رمز يُركّب لحظة الطلب من اسم منشأتك ونوعها — أكثر من ١٠٠ ألف تركيبة ممكنة بلا تكرار.</p>
        <div className="mt-3"><AiLogoTrial /></div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold">الألوان</div>
        {COLORS.map((c) => <ColorRow key={c.k} {...c} />)}
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold">خط العناوين</div>
        <div className="flex gap-2">
          {FONT_CHOICES.arabicHeading.map((f) => (
            <button key={f} onClick={() => updateTypography("arabicHeading", f)} className={cn("flex-1 rounded-lg border px-2 py-2 text-sm", doc.brand.typography.arabicHeading === f ? "border-ink bg-ink text-paper" : "border-line")}>{f}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VenueEditor() {
  const v = useMenu((s) => s.doc!.venue);
  const update = useMenu((s) => s.updateVenue);
  const f = (k: keyof Venue, label: string, ltr = false) => (
    <Field label={label}><Input className="h-9 text-sm" dir={ltr ? "ltr" : "rtl"} value={(v[k] as string) ?? ""} onChange={(e) => update({ [k]: e.target.value })} /></Field>
  );
  return (
    <div className="space-y-3">
      {f("name", "اسم المنشأة")}
      {f("nameEn", "الاسم بالإنجليزية", true)}
      {f("tagline", "عبارة قصيرة (اختياري)")}
      {f("hours", "أوقات العمل")}
      {f("address", "العنوان")}
      {f("phone", "الهاتف", true)}
      {f("instagram", "إنستقرام", true)}
    </div>
  );
}

const LAYOUTS: { id: MenuLayout; label: string; hint: string }[] = [
  { id: "elegant", label: "أنيق", hint: "قائمة نصية بخطوط منقطة، مثالية للمقاهي" },
  { id: "modern", label: "عصري", hint: "صورة مصغرة بجانب كل صنف" },
  { id: "cards", label: "بطاقات", hint: "شبكة صور كبيرة، مثالية للبرجر والحلويات" },
];

export function SettingsEditor() {
  const s = useMenu((st) => st.doc!.settings);
  const update = useMenu((st) => st.updateSettings);
  const toggle = (k: "showCalories" | "showAllergens" | "vatIncluded", label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
      <input type="checkbox" checked={s[k]} onChange={(e) => update({ [k]: e.target.checked })} className="mt-1 accent-ember" />
      <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
    </label>
  );
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold">شكل المنيو الرقمي</div>
        <div className="space-y-2">
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => update({ layout: l.id })} className={cn("w-full rounded-xl border p-3 text-right", s.layout === l.id ? "border-ink ring-2 ring-ink" : "border-line")}>
              <span className="block text-sm font-semibold">{l.label}</span><span className="block text-xs text-muted">{l.hint}</span>
            </button>
          ))}
        </div>
      </div>
      {toggle("showCalories", "إظهار السعرات الحرارية", "تشترطها هيئة الغذاء والدواء بجانب كل صنف مع عبارة الاحتياج اليومي")}
      {toggle("showAllergens", "إظهار مسببات الحساسية", "رموز صغيرة بجانب الأصناف مع دليل في الأسفل")}
      {toggle("vatIncluded", "الأسعار شاملة الضريبة", "تظهر عبارة «شاملة ضريبة القيمة المضافة 15%»")}
    </div>
  );
}
