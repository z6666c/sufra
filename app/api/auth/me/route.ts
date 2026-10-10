import { NextResponse } from "next/server";
import { sessionFromRequest, GUEST } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await sessionFromRequest(req);
  return NextResponse.json(s ? { username: s.u, role: s.r, guest: s.u === GUEST } : { role: null }, { headers: { "Cache-Control": "no-store" } });
}
