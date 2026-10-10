"use client";
import type { MenuDoc } from "./types";

export async function publishMenu(doc: MenuDoc, prev?: { slug: string; editKey: string } | null) {
  if (process.env.NEXT_PUBLIC_SUFRA_DEMO === "1") throw new Error("النشر متاح عند تشغيل مشروع Next.js على خادمك؛ هذه نسخة معاينة.");
  const res = await fetch("/api/menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc, slug: prev?.slug, editKey: prev?.editKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `تعذر النشر (${res.status})`);
  return data as { slug: string; editKey: string; url: string };
}

export async function aiDescriptions(doc: MenuDoc) {
  if (process.env.NEXT_PUBLIC_SUFRA_DEMO === "1") throw new Error("تحسين الأوصاف يتطلب GEMINI_API_KEY على الخادم.");
  const items = doc.categories.flatMap((c) => c.items.map((i) => ({ id: i.id, name: i.name, desc: i.desc })));
  const res = await fetch("/api/menu-suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venueName: doc.venue.name, venueType: doc.venue.type, items }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 501) throw new Error("أضف GEMINI_API_KEY في إعدادات الخادم لتفعيل هذه الميزة.");
  if (!res.ok) throw new Error(data.error || "تعذر الاتصال بالذكاء الاصطناعي");
  return data.items as { id: string; desc: string; nameEn: string; descEn: string }[];
}

export async function aiDishPhoto(name: string, nameEn: string | undefined, desc: string | undefined, venueType: string) {
  if (process.env.NEXT_PUBLIC_SUFRA_DEMO === "1") throw new Error("توليد الصور يتطلب RECRAFT_API_KEY على الخادم.");
  const res = await fetch("/api/dish-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, nameEn, desc, venueType }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 501) throw new Error("أضف RECRAFT_API_KEY في إعدادات الخادم لتفعيل توليد الصور.");
  if (!res.ok) throw new Error(data.error || "تعذر توليد الصورة");
  return data.dataUrl as string;
}
