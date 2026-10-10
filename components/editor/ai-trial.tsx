"use client";
// تجربة الذكاء الاصطناعي (تجريبي): أفكار شعار كصور للاستلهام — يمكن تجربتها كشعار مؤقت
import * as React from "react";
import { FlaskConical, RefreshCw } from "lucide-react";
import { useMenu } from "@/store/menu-store";
import { aiTrialUrls, AI_TRIAL_NOTE, nameIdeas } from "@/lib/ai-trial";
import { compressImage } from "@/lib/image";
import { Button } from "../ui/primitives";

async function urlToDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  const blob = await r.blob();
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
}

function Thumb({ url, prompt, turn, onDone }: { url: string; prompt: string; turn: boolean; onDone: () => void }) {
  const setLogoImage = useMenu((s) => s.setLogoImage);
  const [state, setState] = React.useState<"waiting" | "loading" | "ok" | "error">("waiting");
  const [tries, setTries] = React.useState(0);
  React.useEffect(() => { if (turn && state === "waiting") setState("loading"); }, [turn, state]);
  const fail = () => {
    // الخدمة المجانية ترفض الطلبات المتزامنة أحياناً: إعادة محاولة واحدة بعد ثوانٍ
    if (tries < 1) { setTries(1); setState("waiting"); setTimeout(() => setState("loading"), 4000); return; }
    setState("error"); onDone();
  };
  const [busy, setBusy] = React.useState(false);
  const use = async () => {
    setBusy(true);
    try { setLogoImage(await compressImage(await urlToDataUrl(url), 800, "image/png")); } catch { setState("error"); } finally { setBusy(false); }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-square bg-ink/[0.03]">
        {(state === "loading" || state === "waiting") && <div className="absolute inset-0 animate-pulse bg-ink/5" />}
        {state === "waiting" ? null : state === "error" ? (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted">تعذر الوصول للخدمة</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tries ? `${url}&retry=1` : url} alt={prompt} crossOrigin="anonymous" loading="lazy" onLoad={() => { setState("ok"); onDone(); }} onError={fail} className="h-full w-full object-cover" />
        )}
        <span className="absolute top-1 right-1 rounded-full bg-amber-400 px-1.5 text-[9px] font-bold text-black">تجريبي</span>
      </div>
      {state === "ok" && (
        <button onClick={use} disabled={busy} className="w-full border-t border-line py-1.5 text-[11px] font-medium hover:bg-ink/5">{busy ? "..." : "جرّبه كشعار"}</button>
      )}
    </div>
  );
}

export function AiLogoTrial() {
  const doc = useMenu((s) => s.doc)!;
  const [seed, setSeed] = React.useState<number | null>(null);
  const [done, setDone] = React.useState(0);
  const p = doc.brand.palette;
  const items = seed === null ? [] : aiTrialUrls({
    name: doc.venue.name, nameEn: doc.venue.nameEn, industry: "food", sub: doc.venue.type, style: "minimal",
    colors: [p.primary.hex, p.secondary.hex, p.accent.hex],
    ideas: nameIdeas(doc.venue.name, doc.venue.nameEn),
  }, seed, 4, 384);
  return (
    <div className="rounded-xl border border-dashed border-amber-400/80 bg-amber-50/50 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">تجربة الذكاء الاصطناعي <span className="text-amber-700">(تجريبي)</span></span>
        <Button size="sm" variant="outline" onClick={() => { setDone(0); setSeed(Math.floor(Math.random() * 900000)); }}>
          {seed === null ? <FlaskConical className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} {seed === null ? "ولّد" : "غيرها"}
        </Button>
      </div>
      <p className="mb-2 text-[10.5px] leading-relaxed text-muted">{AI_TRIAL_NOTE}</p>
      {items.length > 0 && <div className="grid grid-cols-2 gap-2">{items.map((it, i) => <Thumb key={it.url} {...it} turn={i <= done} onDone={() => setDone((d) => Math.max(d, i + 1))} />)}</div>}
    </div>
  );
}
