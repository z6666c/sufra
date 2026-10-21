// حماية التطبيق: كل الصفحات تتطلب تسجيل الدخول (حساب إدارة أو ديمو)
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readToken, publicDemo } from "@/lib/auth";

// المنيو المنشور للزبائن عام (/m/...) ويُقرأ بدون دخول
const PUBLIC = [/^\/login$/, /^\/api\/auth\//, /^\/api\/account\//, /^\/m\//, /^\/api\/pay\//, /^\/(privacy|terms|delete-account)$/];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const s = await readToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s && pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/login?next=/admin", req.url));
  // الوضع العام: الزائر يتصفح التطبيق كحساب ديمو بدون تسجيل دخول
  if (!s && publicDemo()) return NextResponse.next();
  if (!s) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (s && pathname.startsWith("/admin") && s.r !== "admin") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico|woff2?)$).*)"] };
