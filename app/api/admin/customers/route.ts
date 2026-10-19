import { listCustomers } from "@/lib/customers";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const all = await listCustomers(1000);
  const rows = q ? all.filter((c) => [c.email, c.phone, c.name, c.id, c.note].some((v) => v?.toLowerCase().includes(q))) : all;
  return json({ customers: rows });
}
