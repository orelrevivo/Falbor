import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/api/supabase/provision"])

// Routes that need cross-origin isolation for WebContainer (SharedArrayBuffer)
const needsIsolation = (pathname: string) =>
  pathname.startsWith("/chat") || pathname.startsWith("/preview")

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl

  // 1. Skip auth & rewrites for special routes
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/deploy/")
  ) {
    return NextResponse.next()
  }

  // 2. Detect subdomain
  const hostname = req.headers.get("host") || ""
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"

  const isSubdomain =
    hostname.endsWith(`.${baseDomain}`) &&
    !hostname.startsWith("www.") &&
    hostname !== baseDomain

  if (process.env.NODE_ENV === "production" && isSubdomain) {
    const subdomain = hostname.replace(`.${baseDomain}`, "")

    let targetPath = `/deploy/${subdomain}${pathname}`
    if (targetPath.endsWith('/') && targetPath !== '/') {
      targetPath = targetPath.slice(0, -1)
    }

    const url = req.nextUrl.clone()
    url.pathname = targetPath

    console.log("Rewriting subdomain:", hostname, "->", url.pathname)

    return NextResponse.rewrite(url)
  }

  // 3. Protect private routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // 4. Add Cross-Origin Isolation headers ONLY for WebContainer routes
  // These headers enable SharedArrayBuffer (needed by WebContainer)
  // They are NOT applied to pricing or other pages so PayPal works normally
  const response = NextResponse.next()
  if (needsIsolation(pathname)) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.set("Cross-Origin-Embedder-Policy", "credentialless")
  }

  return response
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}