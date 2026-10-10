"use client";
import * as React from "react";
import { ArrowRight, Globe, Megaphone, LayoutList, Palette, Printer, QrCode, Settings2, SlidersHorizontal, Store, FileArchive } from "lucide-react";
import { useMenu, type EditorTab, type OutputTab } from "@/store/menu-store";
import { fontStack } from "@/lib/fonts";
import { Mark } from "../brand-mark";
import { Button, cn } from "../ui/primitives";
import { MenuEditor } from "../editor/menu-editor";
import { BrandEditor, SettingsEditor, VenueEditor } from "../editor/other-editors";
import { DigitalTab, ExportTab, PrintTab, SocialTab, TableTab } from "./outputs";

const ED: { id: EditorTab; label: string; I: typeof Store }[] = [
  { id: "menu", label: "المنيو", I: LayoutList },
  { id: "brand", label: "الهوية", I: Palette },
  { id: "venue", label: "المنشأة", I: Store },
  { id: "settings", label: "الإعدادات", I: Settings2 },
];
const OUT: { id: OutputTab; label: string; I: typeof Store }[] = [
  { id: "digital", label: "المنيو الرقمي", I: Globe },
  { id: "print", label: "المنيو المطبوع", I: Printer },
  { id: "table", label: "بطاقة الطاولة", I: QrCode },
  { id: "social", label: "السوشيال", I: Megaphone },
  { id: "export", label: "التصدير", I: FileArchive },
];

export function Studio() {
  const doc = useMenu((s) => s.doc)!;
  const edTab = useMenu((s) => s.edTab);
  const outTab = useMenu((s) => s.outTab);
  const { setEdTab, setOutTab, reset } = useMenu.getState();
  const [drawer, setDrawer] = React.useState(false);

  return (
    <div className="flex h-[calc(100dvh-64px)]">
      <aside className={cn("fixed inset-y-16 start-0 z-30 flex w-[340px] flex-col border-e border-line bg-white shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none", drawer ? "translate-x-0" : "translate-x-full")}>
        <div className="grid grid-cols-4 border-b border-line">
          {ED.map(({ id, label, I }) => (
            <button key={id} onClick={() => setEdTab(id)} className={cn("flex flex-col items-center gap-1 py-3 text-xs transition", edTab === id ? "bg-paper font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-ember)]" : "text-muted hover:text-ink")}>
              <I className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          {edTab === "menu" && <MenuEditor />}
          {edTab === "brand" && <BrandEditor />}
          {edTab === "venue" && <VenueEditor />}
          {edTab === "settings" && <SettingsEditor />}
        </div>
      </aside>
      {drawer && <div className="fixed inset-0 top-16 z-20 bg-black/20 lg:hidden" onClick={() => setDrawer(false)} />}

      <div className="scrollbar-thin flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
            <Mark doc={doc} size={34} />
            <div className="min-w-0">
              <div className="truncate font-bold" style={{ fontFamily: fontStack(doc.brand.typography.arabicHeading) }}>{doc.venue.name}</div>
              <div className="truncate text-xs text-muted">{doc.categories.reduce((n, c) => n + c.items.length, 0)} صنفاً في {doc.categories.length} أقسام</div>
            </div>
            <div className="ms-auto flex gap-2">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setDrawer(true)}><SlidersHorizontal className="h-4 w-4" /> تعديل</Button>
              <Button variant="ghost" size="sm" onClick={reset}><ArrowRight className="h-4 w-4" /> منيو جديد</Button>
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
            {OUT.map(({ id, label, I }) => (
              <button key={id} onClick={() => setOutTab(id)} className={cn("relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm", outTab === id ? "font-semibold text-ink" : "text-muted hover:text-ink")}>
                <I className="h-4 w-4" /> {label}
                {outTab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ember" />}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-7">
          {outTab === "digital" && <DigitalTab />}
          {outTab === "print" && <PrintTab />}
          {outTab === "table" && <TableTab />}
          {outTab === "social" && <SocialTab />}
          {outTab === "export" && <ExportTab />}
        </div>
      </div>
    </div>
  );
}
