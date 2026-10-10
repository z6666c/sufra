// لوحة الإدارة (حساب الإدارة فقط — محمية أيضاً في proxy.ts)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readToken, accounts } from "@/lib/auth";
import { listMenus } from "@/lib/storage";
import { VENUE_TYPES } from "@/lib/templates";
import { Row } from "@/components/admin/row";
import { LogoutButton } from "@/components/admin/logout";
import { MenusTable } from "@/components/admin/menus-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const s = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (s?.r !== "admin") redirect("/login?next=/admin");
  const accs = accounts();
  const menus = await listMenus().catch(() => []);
  const labels = Object.fromEntries(VENUE_TYPES.map((v) => [v.id, v.label]));
  const items = menus.reduce((n, m) => n + m.items, 0);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted">سُفرة</div>
          <h1 className="font-display text-2xl font-bold">لوحة الإدارة</h1>
        </div>
        <div className="flex gap-2">
          <a href="/" className="rounded-xl border border-line bg-white px-4 py-2 text-sm">فتح المحرر</a>
          <LogoutButton />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[["منيوهات منشورة", menus.length], ["أصناف", items], ["أنواع المنشآت", new Set(menus.map((m) => m.type)).size]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-line bg-white p-4">
            <div className="text-xs text-muted">{l}</div>
            <div className="font-display text-2xl font-bold">{Number(v).toLocaleString("ar-SA")}</div>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-2 font-semibold">المنيوهات المنشورة</h2>
        <MenusTable initial={menus} labels={labels} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-2 font-semibold">الحسابات</h2>
          {accs.map((a) => <Row key={a.username} label={a.role === "admin" ? "إدارة — صلاحيات كاملة" : "ديمو — بدون نشر أو ذكاء مدفوع"} value={a.username} ok />)}
          <p className="mt-3 text-xs leading-relaxed text-muted">تُغيَّر من البيئة: ADMIN_USERNAME، ADMIN_PASSWORD، DEMO_USERNAME، DEMO_PASSWORD، DEMO_ENABLED.</p>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-2 font-semibold">الإعدادات</h2>
          <Row label="AUTH_SECRET" value={process.env.AUTH_SECRET ? "مضبوط" : "افتراضي للتطوير"} ok={!!process.env.AUTH_SECRET} />
          <Row label="التخزين" value={process.env.UPSTASH_REDIS_REST_URL ? "Upstash Redis" : "ملفات محلية"} ok />
          <Row label="Gemini (اقتراح المنيو)" value={process.env.GEMINI_API_KEY ? "مفعّل" : "غير مفعّل"} ok={!!process.env.GEMINI_API_KEY} />
          <Row label="Recraft (صور الأطباق)" value={process.env.RECRAFT_API_KEY ? "مفعّل" : "غير مفعّل"} ok={!!process.env.RECRAFT_API_KEY} />
          <Row label="شعارات تجريبية" value="Pollinations.ai" ok />
        </section>
      </div>
    </main>
  );
}
