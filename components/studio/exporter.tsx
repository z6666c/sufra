"use client";
// منصة تصدير خفية تركّب المخرجات بمقاسها الحقيقي ثم تحوّلها إلى ملفات
import { paidGate } from "./paid-gate";
import * as React from "react";
import { create } from "zustand";
import { allItems, useMenu } from "@/store/menu-store";
import { PrintMenu, paginate } from "../print/print-menu";
import { TableCard } from "../print/table-card";
import { POSTS, SocialPost } from "../social/posts";
import { buildPackage, renderMenuPdf, renderTableCardPdf, slugName, type GetNode } from "@/lib/export/package";
import { canvasToBlob, downloadBlob, rasterize } from "@/lib/export/raster";

interface UI { mounted: boolean; busy: string | null; progress: number; set: (p: Partial<Omit<UI, "set">>) => void }
export const useExportUI = create<UI>((set) => ({ mounted: false, busy: null, progress: 0, set: (p) => set(p) }));
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

async function withStage<T>(label: string, job: (get: GetNode) => Promise<T>): Promise<T> {
  const ui = useExportUI.getState();
  if (ui.busy) throw new Error("هناك عملية تصدير جارية");
  ui.set({ mounted: true, busy: label, progress: 0 });
  try {
    for (let i = 0; i < 60 && !document.querySelector("[data-export-stage]"); i++) await frame();
    await document.fonts?.ready;
    await frame(); await frame();
    await new Promise((r) => setTimeout(r, 150));
    const get: GetNode = (id) => {
      const el = document.querySelector<HTMLElement>(`[data-export-stage] [data-print-id="${id}"]`);
      if (!el) throw new Error(`عنصر غير موجود: ${id}`);
      return el;
    };
    return await job(get);
  } finally {
    useExportUI.getState().set({ mounted: false, busy: null, progress: 0 });
  }
}

const state = () => useMenu.getState();
const fk = () => JSON.stringify(state().doc!.brand.typography);

export async function exportMenuPdf(mode: "print" | "office") {
  if (!(await paidGate("لتحميل المنيو المطبوع PDF."))) return;
  const doc = state().doc!;
  const bytes = await withStage("تجهيز المنيو PDF", (g) => renderMenuPdf(g, paginate(doc).length, mode, fk(), slugName(doc)));
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${slugName(doc)}_menu-A4-${mode}.pdf`);
}

export async function exportTableCard() {
  if (!(await paidGate("لتحميل بطاقة الطاولة."))) return;
  const doc = state().doc!;
  const bytes = await withStage("تجهيز بطاقة الطاولة", (g) => renderTableCardPdf(g, fk(), slugName(doc)));
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${slugName(doc)}_table-card-A6.pdf`);
}

export async function exportPost(id: string) {
  if (!(await paidGate("لتحميل منشورات السوشيال."))) return;
  const doc = state().doc!;
  const blob = await withStage("تجهيز المنشور", async (g) => canvasToBlob(await rasterize(g(`post-${id}`), 1, fk())));
  downloadBlob(blob, `${slugName(doc)}_${id}.png`);
}

export async function exportAll(): Promise<string[]> {
  if (!(await paidGate("لتحميل حزمة ملفات مطعمك."))) return [];
  const { doc, published } = state();
  const res = await withStage("تجهيز الحزمة الكاملة", (g) =>
    buildPackage({
      doc: doc!, url: published?.url, getNode: g, menuPages: paginate(doc!).length, postIds: POSTS.map((p) => p.id),
      onProgress: (busy, progress) => useExportUI.getState().set({ busy, progress }),
    }),
  );
  downloadBlob(res.blob, res.filename);
  return res.warnings;
}

export function ExportStage() {
  const mounted = useExportUI((s) => s.mounted);
  const doc = useMenu((s) => s.doc);
  const published = useMenu((s) => s.published);
  const offerText = useMenu((s) => s.offerText);
  const socialItemId = useMenu((s) => s.socialItemId);
  if (!mounted || !doc) return null;
  const items = allItems(doc);
  const item = items.find((x) => x.item.id === socialItemId)?.item ?? items[0]?.item;
  const newItem = items.find((x) => x.item.tags.includes("new"))?.item ?? item;
  return (
    <div aria-hidden style={{ position: "fixed", left: 0, top: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
      <div data-export-stage style={{ position: "absolute", left: 0, top: 0, width: 2400, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 40 }}>
        <PrintMenu doc={doc} idPrefix="menu" />
        <TableCard doc={doc} url={published?.url} printId="tableCard" />
        {POSTS.map((p) => (
          <SocialPost key={p.id} doc={doc} kind={p.id} item={p.id === "new" ? newItem : item} offerText={offerText} url={published?.url} printId={`post-${p.id}`} />
        ))}
      </div>
    </div>
  );
}

export function ExportOverlay() {
  const busy = useExportUI((s) => s.busy);
  const progress = useExportUI((s) => s.progress);
  if (!busy) return null;
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-4 rounded-2xl bg-ink px-5 py-4 text-paper shadow-2xl">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-paper/30 border-t-saffron" />
        <div className="flex-1">
          <div className="text-sm font-medium">{busy}…</div>
          {progress > 0 && <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper/15"><div className="h-full bg-saffron transition-all" style={{ width: `${progress}%` }} /></div>}
        </div>
      </div>
    </div>
  );
}
