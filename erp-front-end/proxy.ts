import { NextResponse, type NextRequest } from "next/server";
import { i18n } from "./i18n-config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = i18n.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (hasLocale) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${i18n.defaultLocale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
