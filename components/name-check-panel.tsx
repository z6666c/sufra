"use client";
// لوحة «تحقق من توفر الاسم» — فحص أولي في الويب + روابط الجهات الرسمية
import * as React from "react";
import type { NameCheckResult } from "@/lib/name-check";

const VERDICT: Record<NameCheckResult["verdict"], { label: string; cls: string }> = {
  clear: { label: "لم نجد اسماً مطابقاً", cls: "bg-emerald-100 text-emerald-800" },
  similar: { label: "يوجد اسم مشابه", cls: "bg-amber-100 text-amber-800" },
  taken: { label: "مستخدم في نفس النشاط", cls: "bg-red-100 text-red-700" },
  unknown: { label: "تحقق يدوياً", cls: "bg-ink/5 text-ink" },
};

function Hits({ title, items }: { title: string; items: NameCheckResult["sameField"] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold">{title}</div>
      <ul className="space-y-1">
        {items.map((h, i) => (
          <li key={i} className="text-[13px] leading-relaxed">
            {h.url ? <a href={h.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline">{h.name}</a> : <b>{h.name}</b>}
            <span className="text-muted"> — {h.activity}{h.city ? ` · ${h.city}` : ""}{h.note ? ` · ${h.note}` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NameCheckPanel({ name, nameEn, activity, city, onPick, compact }: { name: string; nameEn?: string; activity: string; city?: string; onPick?: (n: string) => void; compact?: boolean }) {
  const [res, setRes] = React.useState<NameCheckResult | null>(null);
  const [state, setState] = React.useState<"idle" | "busy" | "error">("idle");
  const [err, setErr] = React.useState("");
  const key = `${name}|${nameEn}|${activity}|${city}`;
  React.useEffect(() => { setRes(null); setState("idle"); }, [key]);
  const run = async () => {
    setState("busy"); setErr("");
    try {
      const r = await fetch("/api/name-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, nameEn, activity, city }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "تعذر الفحص");
      setRes(d as NameCheckResult); setState("idle");
    } catch (e) {
      setErr(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "الفحص يحتاج تشغيل الموقع على الخادم (غير متاح في المعاينة)");
      setState("error");
    }
  };
  const v = res ? VERDICT[res.verdict] : null;
  return (
    <div className={`rounded-xl border border-line bg-white/70 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">هل الاسم مستخدم؟</div>
        <button type="button" onClick={run} disabled={state === "busy" || name.trim().length < 2} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40">
          {state === "busy" ? "جارٍ البحث…" : res ? "إعادة الفحص" : "تحقق من الاسم"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-red-700">{err}</p>}
      {res && v && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${v.cls}`}>{v.label}</span>
            {res.domain && (
              <span className="rounded-full bg-ink/5 px-2.5 py-1 font-latin text-xs" dir="ltr">
                {res.domain.name}: {res.domain.available === null ? "?" : res.domain.available ? "available" : "taken"}
              </span>
            )}
          </div>
          {res.summary && <p className="text-[13px] leading-relaxed text-muted">{res.summary}</p>}
          <Hits title="نفس النشاط" items={res.sameField} />
          <Hits title="نشاطات أخرى" items={res.otherFields} />
          {res.suggestions.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold">بدائل مقترحة</div>
              <div className="flex flex-wrap gap-1.5">
                {res.suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => onPick?.(s)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink/40">{s}</button>
                ))}
              </div>
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted">تحقق رسمي وروابط البحث</summary>
            <ul className="mt-2 space-y-1">
              {res.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{l.label}</a></li>)}
              {res.sources.map((s) => <li key={s.url} className="text-muted"><a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title || s.url}</a></li>)}
            </ul>
          </details>
          <p className="text-[11px] leading-relaxed text-muted">
            فحص أولي من نتائج الويب وليس استشارة قانونية. نظام الأسماء التجارية (2025) يمنع تشابه الاسم مع اسم مسجّل حتى لو كان النشاط مختلفاً؛ الحجز الرسمي عبر المركز السعودي للأعمال، وحماية العلامة عبر الهيئة السعودية للملكية الفكرية.
          </p>
        </div>
      )}
    </div>
  );
}
