import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/api/supabase/provision", "/api/pusher/trigger"])

// Routes that need cross-origin isolation for WebContainer (SharedArrayBuffer)
const needsIsolation = (pathname: string) =>
  pathname.startsWith("/chat") || pathname.startsWith("/preview")

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl

  // 1. Skip auth & rewrites for special routes
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/stripe/webhook")
  ) {
    return NextResponse.next()
  }

  // 2. Handle /deploy/ routes — serve HTML directly (no iframe)
  if (pathname.startsWith("/deploy/")) {
    const rootMatch = pathname.match(/^\/deploy\/([^/]+)\/?$/)
    if (rootMatch) {
      const url = req.nextUrl.clone()
      url.pathname = `/deploy/${rootMatch[1]}/__html`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // 3. Detect subdomain
  const hostname = req.headers.get("host") || ""
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"

  const isSubdomain =
    hostname.endsWith(`.${baseDomain}`) &&
    !hostname.startsWith("www.") &&
    hostname !== baseDomain

  if (process.env.NODE_ENV === "production" && isSubdomain) {
    const subdomain = hostname.replace(`.${baseDomain}`, "")

    let targetPath: string
    if (pathname === "/" || pathname === "") {
      // Root → serve HTML directly (no iframe)
      targetPath = `/deploy/${subdomain}/__html`
    } else {
      // Sub-paths → static files or SPA fallback
      targetPath = `/deploy/${subdomain}${pathname}`
      if (targetPath.endsWith('/') && targetPath !== '/') {
        targetPath = targetPath.slice(0, -1)
      }
    }

    const url = req.nextUrl.clone()
    url.pathname = targetPath

    return NextResponse.rewrite(url)
  }

  // 4. Protect private routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // 5. Add Cross-Origin Isolation headers for WebContainer routes
  const response = NextResponse.next()
  if (needsIsolation(pathname)) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.set("Cross-Origin-Embedder-Policy", "credentialless")
  }

  return response
})

export const config = {
  matcher: [
    // Broad matcher so subdomain static assets (JS, CSS, images) also get rewritten
    "/((?!_next).*)",
  ],
}
