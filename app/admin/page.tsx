// لوحة التحكم (حساب الإدارة فقط — محمية أيضاً في proxy.ts)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readToken } from "@/lib/auth";
import { kvAvailable, kvMemory } from "@/lib/kv";
import { checkStaff } from "@/lib/api-guard";
import { settingsRows } from "@/lib/admin-settings";
import { listMenus } from "@/lib/storage";
import { VENUE_TYPES } from "@/lib/templates";
import { AdminDashboard } from "@/components/admin/dashboard";
import { MenusTable } from "@/components/admin/menus-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const s = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (await checkStaff(s, "read")) redirect("/login?next=/admin");
  const me = { username: s!.u, owner: !s!.m, level: s!.m ? (s!.lv ?? "viewer") : ("owner" as const) };
  const real = await listMenus().catch(() => []);
  // وضع العرض: منيوهات تجريبية منشورة لعملاء الأمثلة
  const menus = real.length || !kvMemory() ? real : demoMenus();
  const labels = Object.fromEntries(VENUE_TYPES.map((v) => [v.id, v.label]));
  const storeRow = { label: "تخزين المنيوهات المنشورة", value: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? "Upstash Redis" : "ملفات محلية (لا تبقى على Vercel)", ok: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) };
  return (
    <AdminDashboard me={me}
      brand="سُفرة — منيو وهوية المطاعم"
      settings={[...settingsRows(), storeRow]}
      kvReady={kvAvailable() || kvMemory()} demoStore={kvMemory()}
      extraTabs={[{ id: "menus", label: `المنيوهات المنشورة (${menus.length.toLocaleString("ar-SA-u-nu-latn")})`, node: <div className="rounded-2xl border border-line bg-white p-5"><MenusTable initial={menus} labels={labels} /></div> }]}
    />
  );
}

function demoMenus() {
  const names = ["مقهى الواحة", "مطعم نخلة", "مخبز التاج", "محمصة الهيل", "مطبخ السدرة", "بيت الزعفران", "مقهى الفنار", "مطعم المرجان", "مخبز الديرة", "محمصة الأصيل", "مطبخ الريف", "مقهى الندى"];
  const types = ["cafe", "restaurant", "bakery", "cafe", "restaurant", "restaurant", "cafe", "restaurant", "bakery", "cafe", "restaurant", "cafe"];
  const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر"];
  const now = Date.now();
  return Array.from({ length: 36 }, (_, i) => ({
    slug: `demo-${i + 1}`, name: `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""}`, type: types[i % types.length], city: cities[i % cities.length],
    items: 12 + ((i * 7) % 30), createdAt: new Date(now - (i + 2) * 86_400_000).toISOString(), updatedAt: new Date(now - (i % 9) * 43_200_000).toISOString(),
  }));
}
