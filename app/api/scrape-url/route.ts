import { NextRequest } from "next/server"

export const maxDuration = 30

// Extract all unique absolute URLs from relative/absolute src/href attributes
function resolveUrl(base: string, relative: string): string {
    try {
        return new URL(relative, base).href
    } catch {
        return relative
    }
}

function extractColors(css: string): string[] {
    const colorRegex = /#([0-9A-Fa-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g
    const matches = css.match(colorRegex) || []
    return [...new Set(matches)].slice(0, 50)
}

function extractFonts(html: string, css: string): string[] {
    const fonts: string[] = []
    // Google Fonts from link tags
    const googleFontRegex = /fonts\.googleapis\.com\/css[^"']*/g
    const gfMatches = html.match(googleFontRegex) || []
    fonts.push(...gfMatches)
    // font-family from CSS
    const fontFamilyRegex = /font-family:\s*([^;}{]+)/gi
    let m
    while ((m = fontFamilyRegex.exec(css)) !== null) {
        fonts.push(m[1].trim())
    }
    return [...new Set(fonts)].slice(0, 20)
}

function extractImages(html: string, baseUrl: string): string[] {
    const imgs: string[] = []
    const srcRegex = /<img[^>]+src=["']([^"']+)["']/gi
    const bgRegex = /url\(["']?([^"')]+)["']?\)/gi
    let m
    while ((m = srcRegex.exec(html)) !== null) {
        imgs.push(resolveUrl(baseUrl, m[1]))
    }
    while ((m = bgRegex.exec(html)) !== null) {
        if (!m[1].startsWith("data:")) {
            imgs.push(resolveUrl(baseUrl, m[1]))
        }
    }
    return [...new Set(imgs)].filter(u => /\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(u)).slice(0, 30)
}

function extractStylesheets(html: string, baseUrl: string): string[] {
    const urls: string[] = []
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
    const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi
    let m
    while ((m = linkRegex.exec(html)) !== null) urls.push(resolveUrl(baseUrl, m[1]))
    while ((m = linkRegex2.exec(html)) !== null) urls.push(resolveUrl(baseUrl, m[1]))
    return [...new Set(urls)]
}

function cleanHtml(html: string): string {
    // Remove scripts, noscripts, comments, and excessive whitespace to reduce token count
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .substring(0, 15000) // limit to 15k chars to keep tokens manageable
}

export async function POST(req: NextRequest) {
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

    try {
        // Fetch the main HTML page
        const htmlRes = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(10000),
        })

        if (!htmlRes.ok) {
            return Response.json({ error: `Failed to fetch URL: ${htmlRes.status}` }, { status: 502 })
        }

        const rawHtml = await htmlRes.text()
        const baseUrl = new URL(url).origin

        // Extract CSS stylesheet URLs from html
        const stylesheetUrls = extractStylesheets(rawHtml, url)

        // Fetch up to 3 external stylesheets
        let combinedCss = ""
        // Also grab inline styles
        const inlineStyleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
        let sm
        while ((sm = inlineStyleRegex.exec(rawHtml)) !== null) {
            combinedCss += sm[1] + "\n"
        }

        const cssPromises = stylesheetUrls.slice(0, 4).map(async (cssUrl) => {
            try {
                const r = await fetch(cssUrl, {
                    headers: { "User-Agent": "Mozilla/5.0" },
                    signal: AbortSignal.timeout(5000),
                })
                if (r.ok) return await r.text()
            } catch { /* ignore */ }
            return ""
        })
        const cssResults = await Promise.all(cssPromises)
        combinedCss += cssResults.join("\n")
        // Trim CSS down
        combinedCss = combinedCss.substring(0, 20000)

        const colors = extractColors(combinedCss)
        const fonts = extractFonts(rawHtml, combinedCss)
        const images = extractImages(rawHtml, url)
        const cleanedHtml = cleanHtml(rawHtml)

        // Extract page title and meta description
        const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
        const metaDescMatch = rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        const title = titleMatch?.[1]?.trim() || ""
        const metaDescription = metaDescMatch?.[1]?.trim() || ""

        return Response.json({
            url,
            title,
            metaDescription,
            html: cleanedHtml,
            css: combinedCss.substring(0, 10000), // give the AI a meaningful chunk of CSS
            colors,
            fonts,
            images,
            baseUrl,
        })
    } catch (err: any) {
        console.error("[scrape-url] Error:", err)
        return Response.json({ error: err?.message || "Failed to scrape URL" }, { status: 500 })
    }
}
