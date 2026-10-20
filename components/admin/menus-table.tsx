"use client";
import * as React from "react";
import type { MenuSummary } from "@/lib/storage";

export function MenusTable({ initial, labels }: { initial: MenuSummary[]; labels: Record<string, string> }) {
  const [rows, setRows] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const del = async (slug: string) => {
    setPending(slug);
    const r = await fetch(`/api/admin/menus?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (r.ok) setRows((x) => x.filter((m) => m.slug !== slug));
    setPending(null); setConfirm(null);
  };
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">لا توجد منيوهات منشورة بعد.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line text-right">
            <th className="py-2 font-medium">المنشأة</th><th className="font-medium">النوع</th><th className="font-medium">الأصناف</th><th className="font-medium">آخر تحديث</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.slug} className="border-b border-line last:border-0">
              <td className="py-2.5"><a href={`/m/${m.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{m.name}</a><div className="font-latin text-[11px] text-muted" dir="ltr">/m/{m.slug}</div></td>
              <td>{labels[m.type] ?? m.type}{m.city ? ` · ${m.city}` : ""}</td>
              <td className="font-latin">{m.items}</td>
              <td className="text-xs text-muted">{new Date(m.updatedAt).toLocaleDateString("ar-SA-u-nu-latn")}</td>
              <td className="text-left">
                {confirm === m.slug ? (
                  <span className="flex justify-end gap-1">
                    <button onClick={() => del(m.slug)} disabled={pending === m.slug} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs text-white">{pending === m.slug ? "..." : "تأكيد الحذف"}</button>
                    <button onClick={() => setConfirm(null)} className="rounded-lg px-2 py-1 text-xs text-muted">إلغاء</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirm(m.slug)} className="rounded-lg px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
