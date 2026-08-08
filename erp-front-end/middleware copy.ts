import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { i18n } from './i18n-config'


import {getLocale} from "./middlewares/getLocale"

// export default auth((request) => {
   
// })
export function middleware(request: NextRequest) {
 
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams

  // const foo = searchParams.get('foo');
  // console.log(foo)
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)
    // const locale =(localStorage.getItem('language'))?localStorage.getItem('language'):""
    // e.g. incoming request is /products
    // The new URL is now /en-US/products

    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}?` +searchParams.toString(),
        request.url
      )
    )

}
  //return chain([withAuthMiddleware,withMiddlewareLocale ])
}


// export default chain([withAuthMiddleware,withMiddlewareLocale ])



export const config = {
  // Matcher ignoring `/_next/` and `/axios/`
  //  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
   matcher: ['/((?!api|blog|_next/static|_next/image|favicon.ico|images|static|images|sitemap.xml).*)'],
  //matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
