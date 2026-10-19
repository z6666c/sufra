import { NextResponse } from "next/server";
import { sessionFromRequest, GUEST } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await sessionFromRequest(req);
  return NextResponse.json(s ? { username: s.u, role: s.r, guest: s.u === GUEST, owner: s.r === "admin" && !s.m, level: s.m ? s.lv : undefined } : { role: null }, { headers: { "Cache-Control": "no-store" } });
}
