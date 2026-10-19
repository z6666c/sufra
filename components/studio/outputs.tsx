"use client";
import { ensureAccount, isCustomer } from "../account/account-client";
import * as React from "react";
import { Copy, Download, ExternalLink, FileArchive, Globe, Printer, QrCode, Send } from "lucide-react";
import { allItems, useMenu } from "@/store/menu-store";
import { publishMenu } from "@/lib/publish";
import { qrSvg } from "@/lib/qr";
import { DigitalMenu } from "../menu/digital-menu";
import { PrintMenuPage, paginate } from "../print/print-menu";
import { TableCard } from "../print/table-card";
import { FitScale, PX_PER_MM } from "../print/kit";
import { POSTS, SocialPost } from "../social/posts";
import { Badge, Button, Card, cn, Textarea } from "../ui/primitives";
import { exportAll, exportMenuPdf, exportPost, exportTableCard } from "./exporter";

function Note({ kind = "info", children }: { kind?: "info" | "warn" | "ok"; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", { info: "border-sky-200 bg-sky-50 text-sky-900", warn: "border-amber-200 bg-amber-50 text-amber-900", ok: "border-emerald-200 bg-emerald-50 text-emerald-900" }[kind])}>{children}</div>;
}

const useRun = () => {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return { msg, busy, run, setMsg };
};

export function DigitalTab() {
  const doc = useMenu((s) => s.doc)!;
  const published = useMenu((s) => s.published);
  const setPublished = useMenu((s) => s.setPublished);
  const { msg, busy, run } = useRun();
  const [copied, setCopied] = React.useState(false);
  const stale = !!published && doc.updatedAt > published.at;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,390px)_1fr]">
      <div className="mx-auto w-full max-w-[390px]">
        <div className="rounded-[2.6rem] bg-ink p-3 shadow-[0_30px_60px_-25px_rgba(0,0,0,.5)]">
          <div className="scrollbar-thin h-[720px] overflow-y-auto overflow-x-hidden rounded-[2rem] bg-white">
            <DigitalMenu doc={doc} embedded />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-ember"><Globe className="h-3.5 w-3.5" /> المنيو الرقمي</div>
          <h3 className="mb-2 font-display text-xl font-bold">انشر المنيو واطبع رمز QR</h3>
          <p className="mb-5 text-sm leading-relaxed text-muted">تحصل على رابط ثابت لمنيوك. أي تعديل لاحق في الأسعار أو الأصناف تنشره بضغطة واحدة، والرمز المطبوع على الطاولات يبقى كما هو.</p>
          <Button variant="ember" disabled={busy} onClick={() => run(async () => {
            if (!(await ensureAccount("لنشر المنيو الرقمي برابط ورمز QR."))) return;
            const r = await publishMenu(doc, published); setPublished({ ...r, at: new Date().toISOString() });
            if (isCustomer()) await useMenu.getState().saveToAccount();
          })}>
            <Send className="h-4 w-4" /> {published ? "نشر التحديثات" : "انشر المنيو"}
          </Button>
          {msg && <div className="mt-4"><Note kind="warn">{msg}</Note></div>}
          {published && (
            <div className="mt-5 flex flex-wrap items-center gap-5 rounded-xl bg-paper p-4">
              <div className="svg-fit h-28 w-28 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg(published.url, { border: 0 }) }} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="truncate font-latin text-sm font-semibold" dir="ltr">{published.url}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(published.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}><Copy className="h-3.5 w-3.5" /> {copied ? "نُسخ" : "نسخ الرابط"}</Button>
                  <a href={published.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> فتح</Button></a>
                </div>
                {stale && <Badge tone="warn">لديك تعديلات لم تُنشر بعد</Badge>}
              </div>
            </div>
          )}
        </Card>
        <Note>المعاينة هي ما يراه الزبون بعد مسح الرمز، ويستطيع التبديل للإنجليزية من أعلى الصفحة.</Note>
      </div>
    </div>
  );
}

export function PrintTab() {
  const doc = useMenu((s) => s.doc)!;
  const { msg, busy, run } = useRun();
  const [guides, setGuides] = React.useState(false);
  const pages = paginate(doc).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Badge><Printer className="me-1 h-3 w-3" /> A4 · {pages} {pages === 1 ? "صفحة" : "صفحات"}</Badge><Badge>300 DPI · قص 3 مم</Badge></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm"><input type="checkbox" checked={guides} onChange={() => setGuides(!guides)} className="accent-ember" /> خط القص</label>
          <Button disabled={busy} onClick={() => run(() => exportMenuPdf("print"))}><Download className="h-4 w-4" /> PDF للمطبعة</Button>
          <Button variant="outline" disabled={busy} onClick={() => run(() => exportMenuPdf("office"))}><Download className="h-4 w-4" /> PDF للطابعة المكتبية</Button>
        </div>
      </div>
      {msg && <Note kind="warn">{msg}</Note>}
      <div className="studio-canvas grid gap-6 rounded-2xl p-6 xl:grid-cols-2">
        <PrintPages guides={guides} />
      </div>
    </div>
  );
}

function PrintPages({ guides }: { guides: boolean }) {
  const doc = useMenu((s) => s.doc)!;
  const W = 216 * PX_PER_MM, H = 303 * PX_PER_MM;
  const pages = paginate(doc);
  return (
    <>
      {pages.map((blocks, i) => (
        <FitScale key={i} wPx={W} hPx={H}>
          <div className="shadow-[0_18px_40px_-12px_rgba(0,0,0,.3)]">
            <PrintMenuPage doc={doc} blocks={blocks} index={i} total={pages.length} guides={guides} />
          </div>
        </FitScale>
      ))}
    </>
  );
}

export function TableTab() {
  const doc = useMenu((s) => s.doc)!;
  const published = useMenu((s) => s.published);
  const { msg, busy, run } = useRun();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="studio-canvas rounded-2xl p-8">
        <FitScale wPx={111 * PX_PER_MM} hPx={154 * PX_PER_MM} maxH={620}>
          <div className="shadow-[0_18px_40px_-12px_rgba(0,0,0,.35)]"><TableCard doc={doc} url={published?.url} /></div>
        </FitScale>
      </div>
      <div className="space-y-4">
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-ember"><QrCode className="h-3.5 w-3.5" /> بطاقة الطاولة A6</div>
          <p className="mb-4 text-sm leading-relaxed text-muted">105×148 مم، تُطبع على ورق مقوّى وتوضع في حامل أكريليك على كل طاولة.</p>
          <Button className="w-full" disabled={busy} onClick={() => run(exportTableCard)}><Download className="h-4 w-4" /> PDF للمطبعة</Button>
          {msg && <div className="mt-3"><Note kind="warn">{msg}</Note></div>}
        </Card>
        {!published && <Note kind="warn">انشر المنيو الرقمي أولاً من تبويب «المنيو الرقمي» ليظهر رمز QR على البطاقة.</Note>}
      </div>
    </div>
  );
}

export function SocialTab() {
  const doc = useMenu((s) => s.doc)!;
  const published = useMenu((s) => s.published);
  const socialItemId = useMenu((s) => s.socialItemId);
  const setSocialItem = useMenu((s) => s.setSocialItem);
  const offerText = useMenu((s) => s.offerText);
  const setOfferText = useMenu((s) => s.setOfferText);
  const { msg, busy, run } = useRun();
  const items = allItems(doc);
  const item = items.find((x) => x.item.id === socialItemId)?.item ?? items[0]?.item;
  const newItem = items.find((x) => x.item.tags.includes("new"))?.item ?? item;
  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">الصنف المعروض في المنشورات</span>
          <select value={item?.id} onChange={(e) => setSocialItem(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm">
            {doc.categories.map((c) => (
              <optgroup key={c.id} label={c.name}>{c.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">نص العرض الخاص</span>
          <Textarea rows={2} value={offerText} onChange={(e) => setOfferText(e.target.value)} />
        </label>
      </Card>
      {msg && <Note kind="warn">{msg}</Note>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {POSTS.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="bg-canvas p-3">
              <FitScale wPx={p.w} hPx={p.h} maxH={p.h > p.w ? 420 : undefined}>
                <SocialPost doc={doc} kind={p.id} item={p.id === "new" ? newItem : item} offerText={offerText} url={published?.url} />
              </FitScale>
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <span className="text-sm font-medium">{p.label} <span className="font-latin text-xs text-muted">{p.w}×{p.h}</span></span>
              <button disabled={busy} onClick={() => run(() => exportPost(p.id))} className="rounded-md px-2 py-1 font-latin text-xs font-semibold text-muted hover:bg-ink/5 hover:text-ink">PNG</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ExportTab() {
  const published = useMenu((s) => s.published);
  const { msg, busy, run, setMsg } = useRun();
  return (
    <Card className="mx-auto max-w-2xl p-8">
      <div className="mb-1 text-xs font-medium text-ember">الحزمة الكاملة</div>
      <h3 className="mb-2 font-display text-2xl font-bold">كل ملفات مطعمك في ملف واحد</h3>
      <ul className="mb-6 space-y-1.5 text-sm text-muted">
        <li>• منيو A4 للمطبعة (قص وعلامات قص) ونسخة للطابعة المكتبية</li>
        <li>• بطاقة طاولة A6 برمز QR</li>
        <li>• 5 منشورات سوشيال بصيغة PNG</li>
        <li>• رمز QR ورابط المنيو الرقمي، وملفات الشعار، وبيانات المنيو JSON</li>
      </ul>
      {!published && <div className="mb-4"><Note kind="warn">المنيو غير منشور بعد، فستخرج البطاقة ومنشور أوقات العمل بدون رمز QR.</Note></div>}
      <Button variant="ember" size="lg" disabled={busy} onClick={() => run(async () => {
          if (!(await ensureAccount("لتحميل حزمة ملفات مطعمك."))) return;
          if (isCustomer()) await useMenu.getState().saveToAccount();
          const w = await exportAll(); setMsg(w.length ? w.join("، ") : null);
        })}>
        <FileArchive className="h-5 w-5" /> تنزيل الحزمة (ZIP)
      </Button>
      {msg && <div className="mt-4"><Note kind="warn">{msg}</Note></div>}
    </Card>
  );
}
