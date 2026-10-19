// لوحة التحكم (حساب الإدارة فقط — محمية أيضاً في proxy.ts)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readToken } from "@/lib/auth";
import { kvAvailable } from "@/lib/kv";
import { settingsRows } from "@/lib/admin-settings";
import { listMenus } from "@/lib/storage";
import { VENUE_TYPES } from "@/lib/templates";
import { AdminDashboard } from "@/components/admin/dashboard";
import { MenusTable } from "@/components/admin/menus-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const s = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (s?.r !== "admin") redirect("/login?next=/admin");
  const menus = await listMenus().catch(() => []);
  const labels = Object.fromEntries(VENUE_TYPES.map((v) => [v.id, v.label]));
  const storeRow = { label: "تخزين المنيوهات المنشورة", value: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? "Upstash Redis" : "ملفات محلية (لا تبقى على Vercel)", ok: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) };
  return (
    <AdminDashboard
      brand="سُفرة — منيو وهوية المطاعم"
      settings={[...settingsRows(), storeRow]}
      kvReady={kvAvailable()}
      extraTabs={[{ id: "menus", label: `المنيوهات المنشورة (${menus.length.toLocaleString("ar-SA")})`, node: <div className="rounded-2xl border border-line bg-white p-5"><MenusTable initial={menus} labels={labels} /></div> }]}
    />
  );
}
