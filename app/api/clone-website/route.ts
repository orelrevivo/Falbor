import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import sharp from "sharp"

export const maxDuration = 30

// ─── URL resolution helpers ───────────────────────────────────────────────────

/**
 * Resolve any image URL to a real, working absolute https:// URL.
 * Handles all the tricky cases that break cloned sites:
 *
 *  1. Next.js image proxy:  /_next/image?url=%2Fimg.png&w=96&q=75
 *     → decode the `url` param → https://site.com/img.png
 *
 *  2. Protocol-relative:    //cdn.example.com/img.png
 *     → https://cdn.example.com/img.png
 *
 *  3. Relative path:        /images/logo.png
 *     → https://site.com/images/logo.png
 *
 *  4. Data URI / empty:     skip entirely
 */
/** Decode HTML entities that corrupt URLs (e.g. &amp; → &, &#39; → ') */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x3D;/g, "=")
}

function resolveImageUrl(src: string, baseUrl: string): string {
  if (!src || src.startsWith("data:")) return ""

  // Decode HTML entities FIRST — Microlink can return &amp; instead of &
  // which causes URLs like ?w=100&amp;h=200 to break in browsers
  src = decodeHtmlEntities(src)

  // 1. Next.js /_next/image proxy — extract the real URL from the `url=` param
  if (src.includes("/_next/image")) {
    try {
      const parsed = new URL(src, baseUrl)
      const realPath = parsed.searchParams.get("url")
      if (realPath) {
        const decoded = decodeHtmlEntities(realPath)
        try { return new URL(decoded, baseUrl).href } catch { return decoded }
      }
    } catch { /* fall through */ }
  }

  // 2. Protocol-relative URL (//cdn.example.com/img.png)
  if (src.startsWith("//")) {
    return "https:" + src
  }

  // 3. Relative or absolute — resolve against site base
  try { return new URL(src, baseUrl).href } catch { return "" }
}

// Alias for non-image URLs (stylesheets etc.)
function resolveUrl(href: string, base: string): string {
  return resolveImageUrl(href, base)
}

function extractColors(css: string): string[] {
  const matches = css.match(/#([0-9A-Fa-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []
  return [...new Set(matches)].slice(0, 40)
}

function extractFonts(html: string, css: string): string[] {
  const fonts: string[] = []
  const gfMatches = (html + css).match(/fonts\.googleapis\.com\/css[^"'\s]*/g) || []
  fonts.push(...gfMatches)
  const fontFamilyRe = /font-family:\s*([^;}{]+)/gi
  let m: RegExpExecArray | null
  while ((m = fontFamilyRe.exec(css)) !== null) {
    const fam = m[1].trim().replace(/['"]/g, "").split(",")[0].trim()
    if (fam && !["inherit", "initial", "unset", "revert", "sans-serif", "serif", "monospace", "system-ui"].some(k => fam.toLowerCase().includes(k))) {
      fonts.push(fam)
    }
  }
  return [...new Set(fonts)].slice(0, 10)
}

function extractStylesheets(html: string, baseUrl: string): string[] {
  const urls: string[] = []
  const re = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    if (tag.includes("stylesheet") || m[1].endsWith(".css")) {
      const r = resolveUrl(m[1], baseUrl)
      if (r) urls.push(r)
    }
  }
  return [...new Set(urls)]
}

function extractButtonStyles(css: string): string {
  const results: string[] = []
  const radRes = [...new Set((css.match(/border-radius:\s*([^;}{]+)/gi) || []).map(m => m.replace(/border-radius:\s*/i, "").trim()))].slice(0, 5)
  if (radRes.length) results.push(`border-radius: ${radRes.join(", ")}`)
  const shadowRes = [...new Set((css.match(/box-shadow:\s*([^;}{]+)/gi) || []).map(m => m.replace(/box-shadow:\s*/i, "").trim()))].slice(0, 3)
  if (shadowRes.length) results.push(`box-shadow: ${shadowRes.join(" | ")}`)
  return results.join(" | ")
}

function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 3000)
}

/** Extract image/logo/bg URLs from static HTML + CSS */
function extractStaticAssets(html: string, css: string, baseUrl: string) {
  // OG image
  const ogImageUrl = resolveUrl(
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] || "", baseUrl)

  // Favicon / apple touch
  const faviconUrl = resolveUrl(
    html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1] || "", baseUrl)

  // Logo heuristic
  let logoUrl = ""
  for (const re of [
    /<img[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']*logo[^"']*)["']/gi,
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/gi,
  ]) {
    const m = re.exec(html)
    if (m?.[1]) { logoUrl = resolveUrl(m[1], baseUrl); break }
  }
  if (!logoUrl) logoUrl = ogImageUrl

  // All <img> srcs
  const imgUrls: string[] = []
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let m2: RegExpExecArray | null
  while ((m2 = imgRe.exec(html)) !== null) {
    const r = resolveUrl(m2[1], baseUrl); if (r) imgUrls.push(r)
  }
  // srcset
  const srcRe = /srcset=["']([^"']+)["']/gi
  while ((m2 = srcRe.exec(html)) !== null) {
    for (const part of m2[1].split(",")) {
      const u = part.trim().split(/\s+/)[0]
      const r = resolveUrl(u, baseUrl); if (r) imgUrls.push(r)
    }
  }

  // CSS background-image URLs
  const bgUrls: string[] = []
  const bgRe = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi
  while ((m2 = bgRe.exec(css)) !== null) {
    const r = resolveUrl(m2[1], baseUrl); if (r) bgUrls.push(r)
  }

  return {
    logoUrl,
    faviconUrl,
    ogImageUrl,
    staticImages: [...new Set(imgUrls)],
    backgroundImages: [...new Set(bgUrls)],
  }
}

/** Slice a full-page screenshot into high-res sections for better AI vision */
async function sliceScreenshot(base64: string): Promise<string[]> {
  if (!base64) return []
  try {
    const buffer = Buffer.from(base64, "base64")
    const image = sharp(buffer)
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) return []

    const sectionHeight = 1000
    const overlap = 100
    const sections: string[] = []

    // Slice vertical chunks
    for (let y = 0; y < metadata.height; y += (sectionHeight - overlap)) {
      const h = Math.min(sectionHeight, metadata.height - y)
      if (h < 50) break // Ignore tiny slivers at the bottom

      const chunk = await image
        .clone()
        .extract({ left: 0, top: y, width: metadata.width, height: h })
        .jpeg({ quality: 85 })
        .toBuffer()
      
      sections.push(chunk.toString("base64"))
      if (sections.length >= 10) break // Limit to 10 sections to avoid token bloat
    }

    return sections
  } catch (err) {
    console.error("[CloneWebsite] Slicing error:", err)
    return []
  }
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const internalUserId = req.headers.get("x-internal-user-id")
  if (!internalUserId) {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let url: string
  try {
    const body = await req.json()
    url = body.url
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }

  console.log(`[CloneWebsite] Starting extraction for: ${url}`)

  try {
    const [screenshotResult, htmlResult] = await Promise.allSettled([

      // ── Microlink: real-browser screenshot + metadata + rendered image extraction ──
      (async (): Promise<{
        base64: string
        mimeType: string
        microlinkMeta?: any
        renderedImages: string[]  // images extracted from fully-JS-rendered DOM
        microlinkLogo?: string
      } | null> => {
        try {
          // Ask Microlink to:
          // 1. Take a full-page screenshot (real Chromium, JS executed)
          // 2. Extract ALL <img> src from the rendered DOM → data.images
          // 3. Extract logo img → data.logo
          // 4. Return general meta (title, description, og:image)
          const params = new URLSearchParams({
            url,
            screenshot: "true",
            "screenshot.fullPage": "true",
            meta: "true",
            // Custom data extraction from fully-rendered DOM
            "data.images.selector": "img",
            "data.images.attr": "src",
            "data.images.type": "array",
            "data.logo.selector": ".logo img, nav img, header img",
            "data.logo.attr": "src",
            "data.bgimages.selector": "[style*='background-image']",
            "data.bgimages.attr": "style",
            "data.bgimages.type": "array",
          })
          const mlUrl = `https://api.microlink.io/?${params.toString()}`
          console.log(`[CloneWebsite] Microlink URL: ${mlUrl.substring(0, 120)}...`)

          const mlRes = await fetch(mlUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; FalborBot/1.0)" },
            signal: AbortSignal.timeout(20000),
          })
          const ct = mlRes.headers.get("content-type") || ""
          console.log(`[CloneWebsite] Microlink response: ${mlRes.status} ${ct}`)

          if (!mlRes.ok) {
            console.warn(`[CloneWebsite] Microlink ${mlRes.status}`)
          } else if (ct.includes("json")) {
            const mlData = await mlRes.json()
            console.log(`[CloneWebsite] Microlink status: ${mlData.status}`)

            // Extract the rendered images list
            const renderedImages: string[] = []
            const rawImages = mlData?.data?.images
            if (Array.isArray(rawImages)) {
              for (const item of rawImages) {
                const src = typeof item === "string" ? item
                  : item?.url || item?.src || item?.value || ""
                const resolved = resolveUrl(src, url)
                if (resolved) renderedImages.push(resolved)
              }
            }
            // Also extract CSS background-image styles and parse the URLs
            const rawBg = mlData?.data?.bgimages
            if (Array.isArray(rawBg)) {
              for (const item of rawBg) {
                const styleStr = typeof item === "string" ? item : item?.value || ""
                const bgMatch = styleStr.match(/url\(['"]?([^'")\s]+)['"]?\)/)
                if (bgMatch?.[1]) {
                  const resolved = resolveUrl(bgMatch[1], url)
                  if (resolved) renderedImages.push(resolved)
                }
              }
            }

            console.log(`[CloneWebsite] Microlink rendered images found: ${renderedImages.length}`)

            const microlinkLogo = typeof mlData?.data?.logo === "string" ? mlData.data.logo
              : mlData?.data?.logo?.url || ""

            // Fetch the screenshot image
            const shotUrl = mlData?.data?.screenshot?.url
            if (shotUrl) {
              const imgRes = await fetch(shotUrl, { signal: AbortSignal.timeout(10000) })
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer()
                const base64 = Buffer.from(buf).toString("base64")
                console.log(`[CloneWebsite] Microlink full-page screenshot: ${(buf.byteLength / 1024).toFixed(0)} KB`)
                const sectionScreenshots = await sliceScreenshot(base64)
                return {
                  base64,
                  mimeType: imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg",
                  microlinkMeta: mlData?.data,
                  renderedImages: [...new Set(renderedImages)],
                  microlinkLogo: resolveUrl(microlinkLogo, url),
                  sectionScreenshots,
                }
              }
            }
            // No screenshot URL but we have the meta + images — log it
            console.warn("[CloneWebsite] Microlink: no screenshot URL in response")
            return { base64: "", mimeType: "image/jpeg", microlinkMeta: mlData?.data, renderedImages: [...new Set(renderedImages)], microlinkLogo: "", sectionScreenshots: [] }
          }
        } catch (e) {
          console.warn("[CloneWebsite] Microlink failed:", (e as Error).message)
        }

        // Fallback: thum.io full-page
        try {
          const thumUrl = `https://image.thum.io/get/width/1440/fullpage/${url}`
          const thumRes = await fetch(thumUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            signal: AbortSignal.timeout(25000),
          })
          if (thumRes.ok) {
            const buf = await thumRes.arrayBuffer()
            const base64 = Buffer.from(buf).toString("base64")
            console.log(`[CloneWebsite] thum.io fallback: ${(buf.byteLength / 1024).toFixed(0)} KB`)
            const sectionScreenshots = await sliceScreenshot(base64)
            return {
              base64,
              mimeType: thumRes.headers.get("content-type")?.split(";")[0] || "image/png",
              renderedImages: [],
              sectionScreenshots,
            }
          }
        } catch (e) {
          console.warn("[CloneWebsite] thum.io failed:", (e as Error).message)
        }

        console.error("[CloneWebsite] All screenshot services failed")
        return null
      })(),

      // ── Static HTML+CSS scrape (runs in parallel) ────────────────────────────
      (async () => {
        const empty = { colors: [], fonts: [], title: "", metaDescription: "", pageText: "", staticAssets: null as any, buttonStyles: "", sections: [] as string[] }
        try {
          const htmlRes = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
              "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(7000),
          })
          if (!htmlRes.ok) { console.warn(`[CloneWebsite] HTML fetch: ${htmlRes.status}`); return empty }

          const rawHtml = await htmlRes.text()
          console.log(`[CloneWebsite] HTML: ${(rawHtml.length / 1024).toFixed(1)} KB`)

          const stylesheetUrls = extractStylesheets(rawHtml, url)
          let combinedCss = ""
          const inlineRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
          let sm: RegExpExecArray | null
          while ((sm = inlineRe.exec(rawHtml)) !== null) combinedCss += sm[1] + "\n"

          if (stylesheetUrls.length > 0) {
            const fetched = await Promise.all(
              stylesheetUrls.slice(0, 4).map(async (cssUrl) => {
                try {
                  const r = await fetch(cssUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3000) })
                  if (r.ok) { const t = await r.text(); console.log(`[CloneWebsite] CSS: ${(t.length / 1024).toFixed(0)}KB — ${cssUrl.split("/").pop()}`); return t }
                } catch { /* skip */ }
                return ""
              })
            )
            combinedCss += fetched.join("\n")
          }
          combinedCss = combinedCss.substring(0, 40000)

          const sectionRe = /(hero|header|nav(?:bar)?|features?|pricing|testimonials?|about|footer|cta|banner|showcase|services?|product|team|faq|blog|contact)/gi
          const sections = [...new Set((rawHtml.match(sectionRe) || []).map((s: string) => s.toLowerCase()))].slice(0, 15)

          return {
            colors: extractColors(combinedCss),
            fonts: extractFonts(rawHtml, combinedCss),
            title: rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "",
            metaDescription: rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() || "",
            pageText: extractPageText(rawHtml),
            staticAssets: extractStaticAssets(rawHtml, combinedCss, url),
            buttonStyles: extractButtonStyles(combinedCss),
            sections,
          }
        } catch (err) {
          console.error("[CloneWebsite] HTML scrape error:", (err as Error).message)
          return empty
        }
      })(),
    ])

    // ── Merge all results ──────────────────────────────────────────────────────
    const screenshot = screenshotResult.status === "fulfilled" ? screenshotResult.value : null
    const html = htmlResult.status === "fulfilled" ? htmlResult.value : null
    const mlMeta = screenshot?.microlinkMeta
    const s = html?.staticAssets

    // Image merging: rendered (JS) images from Microlink take priority over static HTML
    const renderedImages = screenshot?.renderedImages || []
    const staticImages = s?.staticImages || []
    const bgImages = s?.backgroundImages || []

    // Merge all image sources, deduplicate, filter noise (tracking pixels, icons < 10px, etc.)
    const ignoredPatterns = [
      /\.(svg)$/i,                     // SVG icons (often decorative)
      /data:image\//,                  // inline data URIs
      /\/(pixel|track|beacon|1x1)\//i, // tracking pixels
      /googletagmanager/i,
      /analytics/i,
      /\/favicon/i,
    ]
    const allImages = [...new Set([...renderedImages, ...staticImages, ...bgImages])]
      .filter(u => u && !ignoredPatterns.some(p => p.test(u)))
      .slice(0, 40)

    // Determine logo URL: Microlink logo > static logo heuristic > OG image
    const logoUrl = resolveUrl(screenshot?.microlinkLogo || s?.logoUrl || mlMeta?.logo?.url || mlMeta?.image?.url || "", url)
    const faviconUrl = resolveUrl(s?.faviconUrl || "", url)
    const ogImageUrl = resolveUrl(mlMeta?.image?.url || s?.ogImageUrl || "", url)

    // Section images = all images minus logo/favicon/og (those have defined roles)
    const knownRoleUrls = new Set([logoUrl, faviconUrl, ogImageUrl].filter(Boolean))
    const sectionImages = allImages.filter(u => !knownRoleUrls.has(u))
    const heroImages = sectionImages.filter(u =>
      /hero|banner|cover|header|og|social|preview/i.test(u)
    ).slice(0, 3)

    console.log(`[CloneWebsite] Final image count: ${allImages.length} total (${renderedImages.length} rendered + ${staticImages.length} static + ${bgImages.length} bg)`)
    console.log(`[CloneWebsite] Logo: ${logoUrl || "(none)"}`)
    console.log(`[CloneWebsite] OG: ${ogImageUrl || "(none)"}`)

    return Response.json({
      success: true,
      url,
      title: html?.title || mlMeta?.title || "",
      metaDescription: html?.metaDescription || mlMeta?.description || "",
      screenshotBase64: screenshot?.base64 || null,
      screenshotMimeType: screenshot?.mimeType || "image/jpeg",
      // Design tokens
      colors: html?.colors || [],
      fonts: html?.fonts || [],
      buttonStyles: html?.buttonStyles || "",
      sections: html?.sections || [],
      // Asset map — ALL fully resolved absolute https:// URLs
      assets: {
        logoUrl,
        faviconUrl,
        ogImageUrl,
        heroImages,
        sectionImages,
        backgroundImages: (s?.backgroundImages || []).filter(Boolean),
        allImages,
      },
      pageText: html?.pageText || "",
      sectionScreenshots: screenshot?.sectionScreenshots || [],
    })

  } catch (err: any) {
    console.error("[CloneWebsite] Fatal error:", err)
    return Response.json({ error: err?.message || "Failed to clone website data" }, { status: 500 })
  }
}