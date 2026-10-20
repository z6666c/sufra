// صفحة اختبار للوحة التحكم (ليست جزءاً من مشروع Next.js)
import { createRoot } from "react-dom/client";
import { AdminDashboard, type AdminMe } from "@/components/admin/dashboard";
import { MenusTable } from "@/components/admin/menus-table";
import { VENUE_TYPES } from "@/lib/templates";
const settings = [
  { label: "مفتاح الجلسات AUTH_SECRET", value: "مضبوط", ok: true },
  { label: "حسابات الإدارة والديمو", value: "admin (إدارة)، demo (ديمو)" },
  { label: "الديمو العام بدون تسجيل", value: "مفعّل", ok: true, hint: "PUBLIC_DEMO" },
  { label: "قاعدة البيانات (العملاء والتصاميم)", value: "غير مربوطة — وضع العرض", ok: false, hint: "اربط Upstash من Vercel ← Storage" },
  { label: "الباقات", value: "مرة واحدة 132 ر.س · شهري 29 ر.س", hint: "NEXT_PUBLIC_PRICE_ONCE و NEXT_PUBLIC_PRICE_MONTHLY" },
  { label: "حفظ المسودة غير المدفوعة", value: "7 أيام لإكمال الشراء (لا توجد فترة مجانية)", hint: "DRAFT_DAYS" },
  { label: "طريقة الدفع", value: "يدوي — يطلب العميل التفعيل وتفعّله من «الطلبات والمدفوعات»", ok: false, hint: "NEXT_PUBLIC_PAYMENT_NOTE و NEXT_PUBLIC_WHATSAPP" },
  { label: "التسجيل بالبريد", value: "غير مفعّل", ok: false, hint: "RESEND_API_KEY و MAIL_FROM" },
  { label: "التسجيل بالجوال", value: "غير مفعّل", ok: false, hint: "TWILIO_* أو UNIFONIC_APP_SID" },
];
const labels = Object.fromEntries(VENUE_TYPES.map((v) => [v.id, v.label]));
const names = ["مقهى الواحة", "مطعم نخلة", "مخبز التاج", "محمصة الهيل", "مطبخ السدرة", "بيت الزعفران", "مقهى الفنار", "مطعم المرجان", "مخبز الديرة", "محمصة الأصيل", "مطبخ الريف", "مقهى الندى"];
const types = ["cafe", "restaurant", "bakery", "cafe", "restaurant", "restaurant", "cafe", "restaurant", "bakery", "cafe", "restaurant", "cafe"];
const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر"];
const now = Date.now();
const menus = Array.from({ length: 36 }, (_, i) => ({ slug: "demo-" + (i + 1), name: names[i % 12] + (i >= 12 ? " " + (Math.floor(i / 12) + 1) : ""), type: types[i % 12], city: cities[i % 6], items: 12 + ((i * 7) % 30), createdAt: new Date(now - (i + 2) * 86400000).toISOString(), updatedAt: new Date(now - (i % 9) * 43200000).toISOString() }));
const demo = new URLSearchParams(location.search).has("demo");
fetch("/api/auth/me").then((r) => r.json()).then((m) => {
  const me: AdminMe = { username: m.username ?? "", owner: !!m.owner, level: m.owner ? "owner" : m.level ?? "viewer" };
  createRoot(document.getElementById("root")!).render(<AdminDashboard me={me} brand="سُفرة — منيو وهوية المطاعم" settings={settings} kvReady demoStore={demo}
    extraTabs={[{ id: "menus", label: "المنيوهات المنشورة (" + menus.length + ")", node: <div className="rounded-2xl border border-line bg-white p-5"><MenusTable initial={menus} labels={labels} /></div> }]} />);
});
