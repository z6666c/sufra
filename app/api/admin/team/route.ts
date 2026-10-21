import { addMember, listMembers, LEVEL_PERMS, PERMS } from "@/lib/team";
import { accounts } from "@/lib/auth";
import { json, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

/** فريق الإدارة — للمالك فقط */
export async function GET(req: Request) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  const owner = accounts().find((a) => a.role === "admin")?.username ?? g.u;
  return json({ owner, members: await listMembers(), perms: PERMS, presets: LEVEL_PERMS });
}

export async function POST(req: Request) {
  const g = await requireAdmin(req, "owner");
  if (g instanceof Response) return g;
  const body = await req.json().catch(() => ({}));
  try {
    return json({ member: await addMember({ username: body.username, name: body.name, password: body.password, level: body.level, perms: body.perms }, g.u) });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
