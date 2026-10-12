"use client";
import * as React from "react";
import { ArrowLeft, Beef, Coffee, Croissant, CupSoda, Fish, Upload, UtensilsCrossed } from "lucide-react";
import { useMenu } from "@/store/menu-store";
import type { VenueType } from "@/lib/types";
import { VENUE_TYPES } from "@/lib/templates";
import { NameCheckPanel } from "./name-check-panel";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { Button, cn, Input, Label } from "./ui/primitives";

const ICONS: Record<VenueType, typeof Coffee> = { cafe: Coffee, restaurant: UtensilsCrossed, burger: Beef, bakery: Croissant, juice: CupSoda, seafood: Fish };

export function Onboarding() {
  const start = useMenu((s) => s.start);
  const existing = useMenu((s) => s.doc);
  const [type, setType] = React.useState<VenueType>("cafe");
  const [name, setName] = React.useState("");
  const [nameEn, setNameEn] = React.useState("");
  const [city, setCity] = React.useState("الرياض");
  const [logo, setLogo] = React.useState<string | undefined>();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    const raw = await fileToDataUrl(f);
    setLogo(f.type === "image/svg+xml" ? raw : await compressImage(raw, 800, "image/png"));
  };

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="font-display text-4xl font-bold leading-[1.35] md:text-5xl">
          منيو مطعمك
          <br />
          <span className="text-ember">جاهز قبل افتتاح الصباح</span>
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
          منيو رقمي برمز QR للطاولات، ومنيو مطبوع، ومنشورات سوشيال بهوية واحدة. تعدّل السعر مرة، فيتحدث في كل مكان.
        </p>
        <ul className="mt-7 space-y-2 text-sm text-ink/80">
          <li>• السعرات الحرارية وعبارة الاحتياج اليومي حسب اشتراطات هيئة الغذاء والدواء</li>
          <li>• عربي وإنجليزي في منيو واحد</li>
          <li>• ملفات PDF جاهزة للمطبعة بدقة 300 DPI</li>
        </ul>
        {existing && (
          <button onClick={() => useMenu.setState({ stage: "studio" })} className="mt-8 text-sm font-medium text-ember underline-offset-4 hover:underline">
            العودة إلى منيو «{existing.venue.name}» ←
          </button>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,.35)] md:p-8">
        <Label>نوع النشاط</Label>
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VENUE_TYPES.map((v) => {
            const I = ICONS[v.id];
            return (
              <button key={v.id} onClick={() => setType(v.id)} className={cn("flex flex-col items-start gap-2 rounded-xl border p-3 text-right transition", type === v.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40")}>
                <I className="h-5 w-5" />
                <span className="text-sm font-semibold">{v.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div><Label required>اسم المنشأة</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: محمصة الريف" maxLength={40} /></div>
          <div><Label hint="اختياري">بالإنجليزية</Label><Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Al Reef Roastery" maxLength={40} /></div>
        </div>
        <div className="mb-5"><Label>المدينة</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
        <div className="mb-5">
          <NameCheckPanel compact name={name} nameEn={nameEn} city={city} activity={VENUE_TYPES.find((v) => v.id === type)?.label ?? "مطعم"}
            onPick={(n) => (/[\u0600-\u06FF]/.test(n) ? setName(n) : setNameEn(n))} />
        </div>
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-paper p-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="الشعار" className="h-full w-full object-contain p-1" /> : <Upload className="h-5 w-5 text-muted" />}
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold">عندك شعار؟</div>
            <div className="text-xs text-muted">ارفعه الآن، أو نولّد لك رموزاً تختار منها</div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>{logo ? "تغيير" : "رفع"}</Button>
        </div>
        <Button variant="ember" size="lg" className="w-full" disabled={!name.trim()} onClick={() => start(type, name, nameEn, city, logo)}>
          ابدأ بقالب منيو جاهز <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="mt-3 text-center text-xs text-muted">القالب يتضمن أصنافاً وأسعاراً وسعرات تقديرية تعدّلها بسهولة</p>
      </div>
    </div>
  );
}
