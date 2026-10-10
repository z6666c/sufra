"use client";
// محرر المنيو: الأقسام والأصناف والأسعار والسعرات والوسوم والصور
import * as React from "react";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useMenu } from "@/store/menu-store";
import type { Allergen, ItemTag, MenuItem } from "@/lib/types";
import { ALLERGENS, TAGS } from "@/lib/templates";
import { compressImage, fileToDataUrl } from "@/lib/image";
import { aiDescriptions, aiDishPhoto } from "@/lib/publish";
import { DishImage } from "../menu/dish-placeholder";
import { fontStack } from "@/lib/fonts";
import { Button, cn, Input } from "../ui/primitives";

const mini = "h-8 text-[13px] px-2.5 rounded-lg";

function ItemRow({ catId, it }: { catId: string; it: MenuItem }) {
  const doc = useMenu((s) => s.doc)!;
  const { updateItem, removeItem, moveItem, toggleTag, toggleAllergen } = useMenu.getState();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const up = (p: Partial<MenuItem>) => updateItem(catId, it.id, p);

  const onFile = async (f?: File) => {
    if (!f) return;
    setErr(null);
    up({ photo: await compressImage(await fileToDataUrl(f), 640) });
  };
  const genPhoto = async () => {
    setBusy("photo"); setErr(null);
    try { up({ photo: await compressImage(await aiDishPhoto(it.name, it.nameEn, it.desc, doc.venue.type), 640) }); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className={cn("rounded-xl border bg-white transition", open ? "border-ink/30 shadow-sm" : "border-line")}>
      <div className="flex items-center gap-2 p-2">
        <DishImage src={it.photo} palette={doc.brand.palette} label={it.name} font={fontStack(doc.brand.typography.arabicHeading)} radius={8} style={{ width: 36, height: 36 }} />
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-right">
          <div className={cn("truncate text-sm font-semibold", !it.available && "text-muted line-through")}>{it.name || "بدون اسم"}</div>
          <div className="font-latin text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
            {it.price} SAR{it.calories !== undefined ? ` · ${it.calories} kcal` : ""}
          </div>
        </button>
        <button onClick={() => moveItem(catId, it.id, -1)} className="rounded p-1 text-muted hover:bg-ink/5" aria-label="تحريك لأعلى"><ChevronUp className="h-4 w-4" /></button>
        <button onClick={() => moveItem(catId, it.id, 1)} className="rounded p-1 text-muted hover:bg-ink/5" aria-label="تحريك لأسفل"><ChevronDown className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="space-y-2.5 border-t border-line p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input className={mini} value={it.name} onChange={(e) => up({ name: e.target.value })} placeholder="الاسم بالعربية" aria-label="الاسم بالعربية" />
            <Input className={mini} dir="ltr" value={it.nameEn ?? ""} onChange={(e) => up({ nameEn: e.target.value })} placeholder="English name" aria-label="الاسم بالإنجليزية" />
          </div>
          <Input className={mini} value={it.desc ?? ""} onChange={(e) => up({ desc: e.target.value })} placeholder="الوصف" aria-label="الوصف" />
          <Input className={mini} dir="ltr" value={it.descEn ?? ""} onChange={(e) => up({ descEn: e.target.value })} placeholder="Description" aria-label="الوصف بالإنجليزية" />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">السعر (ر.س)
              <Input className={cn(mini, "mt-1")} type="number" min={0} step="0.5" dir="ltr" value={it.price} onChange={(e) => up({ price: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-muted">السعرات الحرارية
              <Input className={cn(mini, "mt-1")} type="number" min={0} dir="ltr" value={it.calories ?? ""} onChange={(e) => up({ calories: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TAGS) as ItemTag[]).map((t) => (
              <button key={t} onClick={() => toggleTag(catId, it.id, t)} className={cn("rounded-full border px-2.5 py-1 text-xs", it.tags.includes(t) ? "border-ink bg-ink text-paper" : "border-line")}>{TAGS[t].label}</button>
            ))}
          </div>
          <div>
            <div className="mb-1 text-xs text-muted">مسببات الحساسية</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ALLERGENS) as Allergen[]).map((a) => (
                <button key={a} onClick={() => toggleAllergen(catId, it.id, a)} className={cn("rounded-full border px-2.5 py-1 text-xs", it.allergens.includes(a) ? "border-ember bg-ember-soft text-ember-deep" : "border-line")}>{ALLERGENS[a].label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><ImagePlus className="h-3.5 w-3.5" /> صورة</Button>
            <Button size="sm" variant="outline" onClick={genPhoto} disabled={busy === "photo"}><Sparkles className="h-3.5 w-3.5" /> {busy === "photo" ? "جارٍ التوليد…" : "صورة بالذكاء الاصطناعي"}</Button>
            {it.photo && <Button size="sm" variant="ghost" onClick={() => up({ photo: undefined })}><X className="h-3.5 w-3.5" /> إزالة الصورة</Button>}
          </div>
          {err && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{err}</div>}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={it.available} onChange={(e) => up({ available: e.target.checked })} className="accent-ember" /> متوفر
            </label>
            <button onClick={() => removeItem(catId, it.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> حذف الصنف</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuEditor() {
  const doc = useMenu((s) => s.doc)!;
  const { addCategory, updateCategory, removeCategory, moveCategory, addItem, replaceCategories } = useMenu.getState();
  const [aiState, setAiState] = React.useState<{ busy: boolean; msg?: string }>({ busy: false });

  const improve = async () => {
    setAiState({ busy: true });
    try {
      const res = await aiDescriptions(doc);
      const map = new Map(res.map((r) => [r.id, r]));
      replaceCategories(doc.categories.map((c) => ({ ...c, items: c.items.map((i) => { const r = map.get(i.id); return r ? { ...i, desc: r.desc, nameEn: i.nameEn || r.nameEn, descEn: r.descEn } : i; }) })));
      setAiState({ busy: false, msg: `حُدّثت أوصاف ${res.length} صنفاً.` });
    } catch (e) {
      setAiState({ busy: false, msg: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ember-soft/60 p-3">
        <Button size="sm" variant="primary" onClick={improve} disabled={aiState.busy} className="h-auto w-full py-2 leading-snug"><WandSparkles className="h-4 w-4" /> {aiState.busy ? "جارٍ الكتابة…" : "حسّن الأوصاف والترجمة بالذكاء الاصطناعي"}</Button>
        {aiState.msg && <p className="mt-2 text-xs leading-relaxed text-ink/80">{aiState.msg}</p>}
      </div>
      {doc.categories.map((c, ci) => (
        <div key={c.id} className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Input className="h-9 flex-1 text-sm font-bold" value={c.name} onChange={(e) => updateCategory(c.id, { name: e.target.value })} aria-label="اسم القسم" />
            <Input className="h-9 w-24 text-xs" dir="ltr" value={c.nameEn ?? ""} onChange={(e) => updateCategory(c.id, { nameEn: e.target.value })} placeholder="Section" aria-label="اسم القسم بالإنجليزية" />
            <button onClick={() => moveCategory(c.id, -1)} disabled={ci === 0} className="rounded p-1 text-muted hover:bg-ink/5 disabled:opacity-30" aria-label="تحريك القسم لأعلى"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => moveCategory(c.id, 1)} disabled={ci === doc.categories.length - 1} className="rounded p-1 text-muted hover:bg-ink/5 disabled:opacity-30" aria-label="تحريك القسم لأسفل"><ChevronDown className="h-4 w-4" /></button>
            <button onClick={() => removeCategory(c.id)} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="حذف القسم"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="space-y-1.5 ps-2">
            {c.items.map((it) => <ItemRow key={it.id} catId={c.id} it={it} />)}
            <button onClick={() => addItem(c.id)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs text-muted hover:border-ink/40 hover:text-ink"><Plus className="h-3.5 w-3.5" /> صنف جديد</button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={addCategory}><Plus className="h-4 w-4" /> قسم جديد</Button>
    </div>
  );
}
