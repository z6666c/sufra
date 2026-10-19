import { listAllDesigns, listCustomers } from "@/lib/customers";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireAdmin(req);
  if (g instanceof Response) return g;
  const [designs, customers] = await Promise.all([listAllDesigns(1000), listCustomers(1000)]);
  const who = Object.fromEntries(customers.map((c) => [c.id, c.email ?? c.phone ?? c.id]));
  return json({ designs: designs.map((d) => ({ ...d, owner: who[d.customerId] ?? d.customerId })) });
}
