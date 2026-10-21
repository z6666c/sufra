import { NextResponse } from "next/server";
import { confirmCheckout } from "@/lib/payments";

export const runtime = "nodejs";

/** رجوع العميل من صفحة البوابة: نتأكد من الدفع عند البوابة ونفعّل، ثم نرجعه للتطبيق برسالة */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const cid = u.searchParams.get("cid") ?? "";
  let state = "unknown", design = "";
  try { const r = await confirmCheckout(cid); state = r.state; design = r.designId ?? ""; } catch (e) { console.error("[pay] return", (e as Error).message); state = "pending"; }
  const base = process.env.PUBLIC_BASE_URL || u.origin;
  return NextResponse.redirect(`${base}/?pay=${state}${design ? `&d=${encodeURIComponent(design)}` : ""}`, 303);
}
