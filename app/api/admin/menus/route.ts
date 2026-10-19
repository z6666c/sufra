import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { checkStaff } from "@/lib/api-guard";
import { deleteMenu, listMenus } from "@/lib/storage";

export const runtime = "nodejs";

async function guard(req: Request) {
  const err = await checkStaff(await sessionFromRequest(req), req.method === "GET" ? "read" : "write");
  return err ? NextResponse.json({ error: err }, { status: 403 }) : null;
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
