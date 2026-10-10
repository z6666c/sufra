import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await sessionFromRequest(req);
  return NextResponse.json(s ? { username: s.u, role: s.r } : { role: null }, { headers: { "Cache-Control": "no-store" } });
}
