"use client";
// رسم شعارات المنشأة مباشرة بالذكاء الاصطناعي (Recraft متجهي أو Gemini)
import * as React from "react";
import { WandSparkles } from "lucide-react";
import { useMenu } from "@/store/menu-store";
import { asIntake } from "@/lib/brand";
import { Button } from "../ui/primitives";

export function AiLogoButton() {
  const doc = useMenu((s) => s.doc)!;
  const add = useMenu((s) => s.addConcepts);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const aiCount = doc.brand.concepts.filter((c) => c.ai).length;
  const run = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/ai-logos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: asIntake(doc.venue), palette: doc.brand.palette, count: 4 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 501 ? "يحتاج الخادم RECRAFT_API_KEY أو GEMINI_API_KEY" : d.error ?? "تعذر الرسم");
      add(d.concepts);
      setMsg(d.note ?? `رسم الذكاء الاصطناعي ${d.concepts.length} شعارات واخترنا الأول.`);
    } catch (e) {
      setMsg(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "الرسم بالذكاء الاصطناعي يعمل في الموقع المنشور فقط");
    } finally { setBusy(false); }
  };
  return (
    <div className="mt-2">
      <Button size="sm" variant="ember" className="w-full" onClick={run} disabled={busy}>
        <WandSparkles className="h-3.5 w-3.5" /> {busy ? "يرسم الذكاء الاصطناعي… (حتى دقيقة)" : "ارسم شعارات بالذكاء الاصطناعي"}
      </Button>
      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{msg || `من اسم منشأتك ومعناه ونوعها وألوانك${aiCount ? ` — لديك ${aiCount} شعارات منه` : ""}.`}</p>
    </div>
  );
}
