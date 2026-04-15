import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// Domains allowed to be proxied (prevent open-proxy abuse)
const ALLOWED_DOMAINS = [
  "static.wixstatic.com",
  "framerusercontent.com",
  "images.ctfassets.net",
  "github.githubassets.com",
  "githubusercontent.com",
  "githubassets.com",
  "media.licdn.com",
  "cdn.prod.website-files.com",
  "assets.website-files.com",
  "uploads.linear.app",
  "imagedelivery.net",
  "cloudinary.com",
  "res.cloudinary.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  "cdn.sanity.io",
  "a0.muscache.com",
  "user-images.githubusercontent.com",
  "raw.githubusercontent.com",
  "pbs.twimg.com",
  "abs.twimg.com",
  "cdn.discordapp.com",
  "i.imgur.com",
  "images.squarespace-cdn.com",
  "images.prismic.io",
  "cdn.shopify.com",
  "img.youtube.com",
  "lh3.googleusercontent.com",
]

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  // Security: check against allowlist
  const hostname = parsedUrl.hostname
  const isAllowed = ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  )

  if (!isAllowed) {
    // For unlisted domains, still try to proxy — cloned sites can use any CDN
    console.log(`[image-proxy] Unlisted domain: ${hostname} — proxying anyway`)
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Mimic a real browser so CDNs don't block us
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: parsedUrl.origin,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, {
        status: response.status,
      })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Required for WebContainer iframe to accept this cross-origin response
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cross-Origin-Embedder-Policy": "unsafe-none",
        // Cache for 24 hours
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    })
  } catch (err: any) {
    console.error(`[image-proxy] Failed to fetch ${url}:`, err.message)
    return new NextResponse("Failed to fetch image", { status: 502 })
  }
}
