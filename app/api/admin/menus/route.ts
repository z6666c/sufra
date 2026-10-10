import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { deleteMenu, listMenus } from "@/lib/storage";

export const runtime = "nodejs";

async function guard(req: Request) {
  const s = await sessionFromRequest(req);
  return s?.r === "admin" ? null : NextResponse.json({ error: "للإدارة فقط" }, { status: 403 });
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (g) return g;
  return NextResponse.json({ menus: await listMenus() }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g) return g;
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  return (await deleteMenu(slug)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "تعذر الحذف" }, { status: 400 });
}
