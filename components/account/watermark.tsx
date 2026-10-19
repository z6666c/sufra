"use client";
// علامة مائية للمعاينة قبل الدفع (تغطي منطقة العرض فقط، ولا تظهر في الملفات المدفوعة)
import * as React from "react";

export function Watermark({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="170"><text x="130" y="95" text-anchor="middle" transform="rotate(-28 130 85)" font-family="Tahoma,Arial,sans-serif" font-size="20" font-weight="700" fill="#16181d" fill-opacity="0.11">${text}</text></svg>`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundRepeat: "repeat" }} />
  );
}

export function PreviewBadge({ show, onUnlock, label }: { show: boolean; onUnlock: () => void; label: string }) {
  if (!show) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-ember/50 bg-ember/5 px-4 py-2.5 text-sm">
      <span>نسخة معاينة بعلامة مائية — {label}</span>
      <button onClick={onUnlock} className="rounded-lg bg-ember px-3 py-1.5 text-xs font-semibold text-white">افتح التحميل</button>
    </div>
  );
}
