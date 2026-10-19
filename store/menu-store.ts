"use client";
// حالة سُفرة: منيو واحد قابل للتحرير يتزامن لحظياً مع كل المعاينات والمخرجات
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Allergen, ItemTag, MenuCategory, MenuDoc, MenuItem, MenuSettings, PaletteKey, Typography, Venue, VenueType,
} from "@/lib/types";
import { freshSeed, uid } from "@/lib/random";
import { TEMPLATES } from "@/lib/templates";
import { createBrand, moreConcepts, newConcepts } from "@/lib/brand";
import { refreshSwatch } from "@/lib/validate";

export type Stage = "onboarding" | "studio";
export type OutputTab = "digital" | "print" | "table" | "social" | "export";
export type EditorTab = "menu" | "brand" | "venue" | "settings";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function newDoc(type: VenueType, name: string, nameEn: string, city: string): MenuDoc {
  const venue: Venue = {
    name: name.trim() || "مطعمي",
    nameEn: nameEn.trim() || undefined,
    tagline: "",
    type,
    city: city.trim() || "الرياض",
    phone: "+966 55 000 0000",
    instagram: "@" + ((nameEn || "myplace").toLowerCase().replace(/[^a-z0-9_]/g, "") || "myplace"),
    hours: "يومياً 7 ص – 12 م",
    address: `${city.trim() || "الرياض"}، المملكة العربية السعودية`,
  };
  const seed = freshSeed(name + type);
  return {
    id: uid(),
    venue,
    brand: createBrand(venue, seed),
    categories: clone(TEMPLATES[type]),
    settings: { layout: type === "cafe" || type === "bakery" ? "elegant" : type === "burger" ? "cards" : "modern", showCalories: true, showAllergens: true, vatIncluded: true, currency: "ر.س" },
    updatedAt: new Date().toISOString(),
  };
}

interface Publish { slug: string; editKey: string; url: string; at: string }

interface MenuState {
  stage: Stage;
  outTab: OutputTab;
  edTab: EditorTab;
  doc: MenuDoc | null;
  published: Publish | null;
  socialItemId: string | null;
  offerText: string;

  start: (type: VenueType, name: string, nameEn: string, city: string, logoDataUrl?: string) => void;
  reset: () => void;
  setOutTab: (t: OutputTab) => void;
  setEdTab: (t: EditorTab) => void;
  setPublished: (p: Publish | null) => void;
  setSocialItem: (id: string | null) => void;
  setOfferText: (t: string) => void;

  updateVenue: (p: Partial<Venue>) => void;
  updateSettings: (p: Partial<MenuSettings>) => void;
  updateColor: (k: PaletteKey, hex: string) => void;
  updateTypography: (k: keyof Typography, v: string) => void;
  selectConcept: (i: number) => void;
  setLogoImage: (dataUrl: string) => void;
  regenerateBrand: (keepLogo?: boolean) => void;
  regenerateLogos: () => void;
  addConcepts: (c: import("@/lib/types").LogoConcept[]) => void;
  moreLogos: () => void;

  addCategory: () => void;
  updateCategory: (id: string, p: Partial<Omit<MenuCategory, "items">>) => void;
  removeCategory: (id: string) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;
  addItem: (catId: string) => void;
  updateItem: (catId: string, itemId: string, p: Partial<MenuItem>) => void;
  removeItem: (catId: string, itemId: string) => void;
  moveItem: (catId: string, itemId: string, dir: -1 | 1) => void;
  toggleTag: (catId: string, itemId: string, t: ItemTag) => void;
  toggleAllergen: (catId: string, itemId: string, a: Allergen) => void;
  replaceCategories: (cats: MenuCategory[]) => void;
}

const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

export const useMenu = create<MenuState>()(
  persist(
    (set, get) => {
      const patchDoc = (fn: (d: MenuDoc) => MenuDoc) => {
        const d = get().doc;
        if (d) set({ doc: { ...fn(d), updatedAt: new Date().toISOString() } });
      };
      const patchCats = (fn: (c: MenuCategory[]) => MenuCategory[]) => patchDoc((d) => ({ ...d, categories: fn(d.categories) }));
      const patchItem = (catId: string, itemId: string, fn: (it: MenuItem) => MenuItem) =>
        patchCats((cs) => cs.map((c) => (c.id !== catId ? c : { ...c, items: c.items.map((it) => (it.id === itemId ? fn(it) : it)) })));
      return {
        stage: "onboarding",
        outTab: "digital",
        edTab: "menu",
        doc: null,
        published: null,
        socialItemId: null,
        offerText: "خصم\n20%",

        start: (type, name, nameEn, city, logo) => {
          const doc = newDoc(type, name, nameEn, city);
          if (logo) doc.brand.logo = { kind: "image", dataUrl: logo };
          set({ doc, stage: "studio", outTab: "digital", edTab: "menu", published: null, socialItemId: null });
        },
        reset: () => set({ stage: "onboarding" }),
        setOutTab: (outTab) => set({ outTab }),
        setEdTab: (edTab) => set({ edTab }),
        setPublished: (published) => set({ published }),
        setSocialItem: (socialItemId) => set({ socialItemId }),
        setOfferText: (offerText) => set({ offerText }),

        updateVenue: (p) => patchDoc((d) => ({ ...d, venue: { ...d.venue, ...p } })),
        updateSettings: (p) => patchDoc((d) => ({ ...d, settings: { ...d.settings, ...p } })),
        updateColor: (k, hex) => patchDoc((d) => ({ ...d, brand: { ...d.brand, palette: refreshSwatch(k, hex, d.brand.palette) } })),
        updateTypography: (k, v) => patchDoc((d) => ({ ...d, brand: { ...d.brand, typography: { ...d.brand.typography, [k]: v } } })),
        selectConcept: (index) => patchDoc((d) => ({ ...d, brand: { ...d.brand, logo: { kind: "concept", index } } })),
        setLogoImage: (dataUrl) => patchDoc((d) => ({ ...d, brand: { ...d.brand, logo: { kind: "image", dataUrl } } })),
        regenerateBrand: (keepLogo) =>
          patchDoc((d) => {
            const seed = freshSeed(d.id);
            const fresh = createBrand(d.venue, seed);
            const concepts = newConcepts(d.venue, d.brand, seed);
            return { ...d, brand: { ...fresh, concepts, logo: keepLogo && d.brand.logo.kind === "image" ? d.brand.logo : { kind: "concept", index: 0 } } };
          }),

        regenerateLogos: () =>
          patchDoc((d) => ({ ...d, brand: { ...d.brand, concepts: [...d.brand.concepts.filter((c) => c.ai), ...newConcepts(d.venue, d.brand, freshSeed(d.id + "l"))], logo: d.brand.logo.kind === "image" ? d.brand.logo : { kind: "concept", index: 0 } } })),
        addConcepts: (c) => patchDoc((d) => ({ ...d, brand: { ...d.brand, concepts: [...c, ...d.brand.concepts].slice(0, 40), logo: { kind: "concept", index: 0 } } })),
        moreLogos: () => patchDoc((d) => ({ ...d, brand: { ...d.brand, concepts: moreConcepts(d.venue, d.brand, freshSeed(d.id + d.brand.concepts.length)) } })),

        addCategory: () => patchCats((cs) => [...cs, { id: uid(), name: "قسم جديد", nameEn: "New section", items: [] }]),
        updateCategory: (id, p) => patchCats((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c))),
        removeCategory: (id) => patchCats((cs) => cs.filter((c) => c.id !== id)),
        moveCategory: (id, dir) => patchCats((cs) => move(cs, cs.findIndex((c) => c.id === id), dir)),
        addItem: (catId) =>
          patchCats((cs) => cs.map((c) => (c.id !== catId ? c : {
            ...c, items: [...c.items, { id: uid(), name: "صنف جديد", nameEn: "", desc: "", price: 0, calories: undefined, tags: [], allergens: [], available: true }],
          }))),
        updateItem: (catId, itemId, p) => patchItem(catId, itemId, (it) => ({ ...it, ...p })),
        removeItem: (catId, itemId) => patchCats((cs) => cs.map((c) => (c.id !== catId ? c : { ...c, items: c.items.filter((i) => i.id !== itemId) }))),
        moveItem: (catId, itemId, dir) =>
          patchCats((cs) => cs.map((c) => (c.id !== catId ? c : { ...c, items: move(c.items, c.items.findIndex((i) => i.id === itemId), dir) }))),
        toggleTag: (catId, itemId, t) =>
          patchItem(catId, itemId, (it) => ({ ...it, tags: it.tags.includes(t) ? it.tags.filter((x) => x !== t) : [...it.tags, t] })),
        toggleAllergen: (catId, itemId, a) =>
          patchItem(catId, itemId, (it) => ({ ...it, allergens: it.allergens.includes(a) ? it.allergens.filter((x) => x !== a) : [...it.allergens, a] })),
        replaceCategories: (cats) => patchCats(() => cats),
      };
    },
    { name: "sufra-v1", partialize: (s) => ({ stage: s.stage, outTab: s.outTab, edTab: s.edTab, doc: s.doc, published: s.published, offerText: s.offerText, socialItemId: s.socialItemId }) },
  ),
);

export const allItems = (d: MenuDoc) => d.categories.flatMap((c) => c.items.map((it) => ({ cat: c, item: it })));
