/**
 * test-clone-api.mjs
 * Direct test for the clone-website pipeline components.
 * Run with: node scripts/test-clone-api.mjs [URL]
 * Example:  node scripts/test-clone-api.mjs https://falbor.xyz
 */

const TARGET_URL = process.argv[2] || "https://falbor.xyz"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
}

function log(color, prefix, msg) {
  console.log(`${color}${prefix}${COLORS.reset} ${msg}`)
}
function ok(msg)   { log(COLORS.green,  "  ✓", msg) }
function fail(msg) { log(COLORS.red,    "  ✗", msg) }
function info(msg) { log(COLORS.cyan,   "  →", msg) }
function warn(msg) { log(COLORS.yellow, "  !", msg) }
function head(msg) { console.log(`\n${COLORS.bright}${COLORS.cyan}══ ${msg} ══${COLORS.reset}`) }
function dim(msg)  { console.log(`${COLORS.gray}    ${msg}${COLORS.reset}`) }

// ─── inline helpers (mirrors the real route) ──────────────────────────────────

function extractColors(css) {
  const colorRegex = /#([0-9A-Fa-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g
  const matches = css.match(colorRegex) || []
  return [...new Set(matches)].slice(0, 30)
}

function extractFonts(html, css) {
  const fonts = []
  const googleFontRegex = /fonts\.googleapis\.com\/css[^"']*/g
  const gfMatches = (html + css).match(googleFontRegex) || []
  fonts.push(...gfMatches)
  const fontFamilyRegex = /font-family:\s*([^;}{]+)/gi
  let m
  while ((m = fontFamilyRegex.exec(css)) !== null) {
    const fam = m[1].trim().replace(/['"]/g, "").split(",")[0].trim()
    if (fam && !fam.includes("inherit") && !fam.includes("initial")) fonts.push(fam)
  }
  return [...new Set(fonts)].slice(0, 10)
}

function extractStylesheets(html, baseUrl) {
  const urls = []
  const patterns = [
    /href=["']([^"']+\.css[^"']*?)["']/gi,
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi,
  ]
  for (const regex of patterns) {
    let m
    while ((m = regex.exec(html)) !== null) {
      try { urls.push(new URL(m[1], baseUrl).href) } catch {}
    }
  }
  return [...new Set(urls)]
}

function extractPageText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 800)
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

async function testHTMLFetch(url) {
  head("STEP 1: HTML Fetch & Design Token Extraction")
  info(`Fetching HTML from: ${url}`)
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
    })
    const elapsed = Date.now() - t0
    if (!res.ok) {
      fail(`HTML fetch returned ${res.status} ${res.statusText} (${elapsed}ms)`)
      return { ok: false }
    }
    const rawHtml = await res.text()
    ok(`HTML fetched: ${(rawHtml.length / 1024).toFixed(1)} KB in ${elapsed}ms`)

    // Title
    const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || "(no title)"
    dim(`Title: "${title}"`)

    // Meta description
    const metaMatch = rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const meta = metaMatch?.[1]?.trim() || "(no meta description)"
    dim(`Meta: "${meta.substring(0, 80)}..."`)

    // Stylesheets
    const stylesheets = extractStylesheets(rawHtml, url)
    ok(`Found ${stylesheets.length} external stylesheets`)
    stylesheets.slice(0, 5).forEach(s => dim(s))
    if (stylesheets.length > 5) dim(`... and ${stylesheets.length - 5} more`)

    // Inline CSS
    let combinedCss = ""
    const inlineStyleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let sm, inlineCount = 0
    while ((sm = inlineStyleRegex.exec(rawHtml)) !== null) {
      combinedCss += sm[1] + "\n"
      inlineCount++
    }
    ok(`Found ${inlineCount} inline <style> blocks (${(combinedCss.length / 1024).toFixed(1)} KB)`)

    // Fetch external CSS
    info(`Fetching up to 3 external stylesheets...`)
    const cssPromises = stylesheets.slice(0, 3).map(async (cssUrl) => {
      try {
        const t = Date.now()
        const r = await fetch(cssUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000),
        })
        if (r.ok) {
          const text = await r.text()
          ok(`  CSS loaded: ${cssUrl.split("/").pop()} (${(text.length / 1024).toFixed(1)} KB, ${Date.now()-t}ms)`)
          return text
        } else {
          warn(`  CSS failed ${r.status}: ${cssUrl.split("/").pop()}`)
        }
      } catch (e) {
        warn(`  CSS timeout/error: ${cssUrl.split("/").pop()} — ${e.message}`)
      }
      return ""
    })
    const cssResults = await Promise.all(cssPromises)
    combinedCss += cssResults.join("\n")
    combinedCss = combinedCss.substring(0, 25000)
    ok(`Total CSS content: ${(combinedCss.length / 1024).toFixed(1)} KB`)

    // Colors
    const colors = extractColors(combinedCss)
    ok(`Extracted ${colors.length} colors`)
    if (colors.length > 0) dim(`Sample: ${colors.slice(0, 10).join(", ")}`)
    else fail("NO colors extracted — CSS may not be loading")

    // Fonts
    const fonts = extractFonts(rawHtml, combinedCss)
    ok(`Extracted ${fonts.length} fonts`)
    if (fonts.length > 0) dim(`Sample: ${fonts.slice(0, 5).join(", ")}`)
    else warn("No fonts extracted (site may use system fonts)")

    // Page text
    const pageText = extractPageText(rawHtml)
    ok(`Page text: ${pageText.length} chars`)
    dim(`Preview: "${pageText.substring(0, 120)}..."`)

    return { ok: true, title, meta, colors, fonts, pageText, stylesheets }
  } catch (e) {
    fail(`HTML fetch ERROR: ${e.message}`)
    return { ok: false }
  }
}

async function testMicrolink(url) {
  head("STEP 2: Screenshot — Microlink.io")
  const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
  info(`GET ${microlinkUrl}`)
  const t0 = Date.now()
  try {
    const res = await fetch(microlinkUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FalborBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    })
    const elapsed = Date.now() - t0
    const contentType = res.headers.get("content-type") || ""
    info(`Status: ${res.status}, Content-Type: ${contentType}, Time: ${elapsed}ms`)

    if (!res.ok) {
      fail(`Microlink returned ${res.status}`)
      // Try to read the error body
      try {
        const body = await res.text()
        dim(`Body: ${body.substring(0, 200)}`)
      } catch {}
      return { ok: false }
    }

    if (contentType.includes("image")) {
      const buf = await res.arrayBuffer()
      ok(`Screenshot via embed: ${(buf.byteLength / 1024).toFixed(1)} KB`)
      return { ok: true, bytes: buf.byteLength }
    }

    if (contentType.includes("json")) {
      const data = await res.json()
      const screenshotUrl = data?.data?.screenshot?.url
      if (screenshotUrl) {
        ok(`Got screenshot URL from JSON: ${screenshotUrl}`)
        const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(10000) })
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer()
          ok(`Screenshot image fetched: ${(buf.byteLength / 1024).toFixed(1)} KB`)
          return { ok: true, bytes: buf.byteLength }
        } else {
          fail(`Screenshot image fetch failed: ${imgRes.status}`)
        }
      } else {
        fail("No screenshot URL in Microlink JSON response")
        dim(JSON.stringify(data).substring(0, 200))
      }
    }

    // Try without embed param
    warn("embed param may not have worked, trying JSON API directly...")
    const jsonUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`
    const res2 = await fetch(jsonUrl, { signal: AbortSignal.timeout(15000) })
    if (res2.ok) {
      const data = await res2.json()
      dim(`Microlink JSON: status=${data.status}`)
      const shotUrl = data?.data?.screenshot?.url
      if (shotUrl) {
        ok(`Screenshot URL (JSON fallback): ${shotUrl}`)
        return { ok: true, screenshotUrl: shotUrl }
      }
    }
    return { ok: false }
  } catch (e) {
    fail(`Microlink ERROR: ${e.message}`)
    return { ok: false }
  }
}

async function testThumio(url) {
  head("STEP 3: Screenshot — thum.io (fallback)")
  const thumUrl = `https://image.thum.io/get/width/1440/crop/900/png/${url}`
  info(`GET ${thumUrl}`)
  const t0 = Date.now()
  try {
    const res = await fetch(thumUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(25000),
    })
    const elapsed = Date.now() - t0
    const contentType = res.headers.get("content-type") || ""
    if (!res.ok) {
      fail(`thum.io returned ${res.status} (${elapsed}ms)`)
      return { ok: false }
    }
    const buf = await res.arrayBuffer()
    ok(`Screenshot via thum.io: ${(buf.byteLength / 1024).toFixed(1)} KB in ${elapsed}ms`)
    ok(`Content-Type: ${contentType}`)
    return { ok: true, bytes: buf.byteLength }
  } catch (e) {
    fail(`thum.io ERROR: ${e.message}`)
    return { ok: false }
  }
}

async function testCloneAPI(url) {
  head("STEP 4: End-to-End — POST /api/clone-website")
  info(`POST ${APP_URL}/api/clone-website   body: { url: "${url}" }`)
  const t0 = Date.now()
  try {
    const res = await fetch(`${APP_URL}/api/clone-website`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-user-id": "test-script",
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(35000),
    })
    const elapsed = Date.now() - t0
    info(`Status: ${res.status}, Time: ${elapsed}ms`)

    if (!res.ok) {
      fail(`API returned ${res.status}`)
      try { dim(await res.text()) } catch {}
      return
    }

    const data = await res.json()

    // Screenshot
    if (data.screenshotBase64) {
      ok(`screenshotBase64: ${data.screenshotBase64.length} chars base64 (~${(data.screenshotBase64.length * 0.75 / 1024).toFixed(0)} KB)`)
      ok(`screenshotMimeType: ${data.screenshotMimeType}`)
    } else {
      fail("screenshotBase64: NULL — screenshot did not capture")
    }

    // Title
    if (data.title) ok(`title: "${data.title}"`)
    else warn("title: empty")

    // Meta
    if (data.metaDescription) ok(`metaDescription: "${data.metaDescription.substring(0, 80)}..."`)
    else warn("metaDescription: empty")

    // Colors
    if (data.colors?.length > 0) {
      ok(`colors: ${data.colors.length} extracted`)
      dim(`Sample: ${data.colors.slice(0, 8).join(", ")}`)
    } else {
      fail("colors: EMPTY — CSS extraction failed or site uses no CSS colors")
    }

    // Fonts
    if (data.fonts?.length > 0) {
      ok(`fonts: ${data.fonts.length} extracted`)
      dim(`List: ${data.fonts.join(", ")}`)
    } else {
      warn("fonts: empty (common for system-font-only sites)")
    }

    // Page text
    if (data.pageText?.length > 50) {
      ok(`pageText: ${data.pageText.length} chars`)
      dim(`Preview: "${data.pageText.substring(0, 100)}..."`)
    } else {
      fail("pageText: too short or empty")
    }

    console.log(`\n${COLORS.bright}${COLORS.green}✓ Full API response looks OK${COLORS.reset}`)
  } catch (e) {
    fail(`API call ERROR: ${e.message}`)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log(`\n${COLORS.bright}╔═══════════════════════════════════════════╗`)
console.log(`║   Clone Website API — Diagnostic Test     ║`)
console.log(`╚═══════════════════════════════════════════╝${COLORS.reset}`)
console.log(`  Target: ${COLORS.cyan}${TARGET_URL}${COLORS.reset}`)
console.log(`  App:    ${COLORS.cyan}${APP_URL}${COLORS.reset}`)

await testHTMLFetch(TARGET_URL)
await testMicrolink(TARGET_URL)
await testThumio(TARGET_URL)
await testCloneAPI(TARGET_URL)

console.log(`\n${COLORS.bright}${COLORS.green}═══ Test complete ═══${COLORS.reset}\n`)
