/**
 * Diagnostic test — no ANSI colors, plain output.
 * Run: node scripts/test-clone-plain.mjs [URL]
 */
const TARGET_URL = process.argv[2] || "https://falbor.xyz"
const APP_URL    = "http://localhost:3000"

console.log(">>> Clone API Diagnostic Test")
console.log("Target:", TARGET_URL)
console.log("App:   ", APP_URL)

// ── STEP 1: HTML fetch + token extraction ─────────────────────────────────────
console.log("\n=== STEP 1: HTML Fetch & Design Token Extraction ===")
try {
  const t0 = Date.now()
  const htmlRes = await fetch(TARGET_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html" },
    signal: AbortSignal.timeout(10000),
  })
  const elapsed = Date.now() - t0
  const html = await htmlRes.text()
  console.log("HTTP Status:", htmlRes.status, " Time:", elapsed + "ms")
  console.log("HTML size: ", (html.length / 1024).toFixed(1), "KB")

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  console.log("Title:     ", title || "(none)")

  // Find stylesheet links
  const cssUrls = []
  const cssRe = /href=["']([^"']+\.css[^"']*?)["']/gi
  let m
  while ((m = cssRe.exec(html)) !== null) {
    try { cssUrls.push(new URL(m[1], TARGET_URL).href) } catch {}
  }
  console.log("CSS links found:", cssUrls.length)
  cssUrls.slice(0, 5).forEach(u => console.log("  ", u))

  // Inline styles
  const inlineMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  const inlineCss = inlineMatches.map(m => m[1]).join("\n")
  console.log("Inline <style> blocks:", inlineMatches.length, "  chars:", inlineCss.length)

  // Colors from inline CSS
  const colorsInline = [...new Set((inlineCss.match(/#([0-9A-Fa-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || [])].slice(0, 20)
  console.log("Colors from inline CSS:", colorsInline.length, " sample:", colorsInline.slice(0, 8).join(", "))

  // Fonts from inline CSS
  const fontRe = /font-family:\s*([^;}{]+)/gi
  const fonts = []
  let fm
  while ((fm = fontRe.exec(inlineCss)) !== null) {
    const f = fm[1].trim().replace(/['"]/g, "").split(",")[0].trim()
    if (f && !f.includes("inherit") && !f.includes("initial")) fonts.push(f)
  }
  console.log("Fonts from inline CSS:", [...new Set(fonts)].slice(0, 10).join(", ") || "(none)")

  // Fetch external CSS files (max 3)
  if (cssUrls.length > 0) {
    console.log("\n--- Fetching external CSS (up to 3) ---")
    let allExtCss = ""
    for (const cssUrl of cssUrls.slice(0, 3)) {
      try {
        const tCSS = Date.now()
        const r = await fetch(cssUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) })
        if (r.ok) {
          const text = await r.text()
          allExtCss += text + "\n"
          console.log("  OK  ", (text.length / 1024).toFixed(1), "KB  ", Date.now() - tCSS + "ms  ", cssUrl.split("/").slice(-2).join("/"))
        } else {
          console.log("  FAIL", r.status, cssUrl.split("/").slice(-2).join("/"))
        }
      } catch (e) {
        console.log("  ERR ", e.message, cssUrl.split("/").slice(-2).join("/"))
      }
    }
    const colorsExt = [...new Set((allExtCss.match(/#([0-9A-Fa-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || [])].slice(0, 20)
    console.log("Colors from external CSS:", colorsExt.length, " sample:", colorsExt.slice(0, 8).join(", "))
    const allCss = (inlineCss + allExtCss).substring(0, 25000)
    const fontRe2 = /font-family:\s*([^;}{]+)/gi
    const fonts2 = []
    let fm2
    while ((fm2 = fontRe2.exec(allCss)) !== null) {
      const f = fm2[1].trim().replace(/['"]/g, "").split(",")[0].trim()
      if (f && !f.includes("inherit") && !f.includes("initial")) fonts2.push(f)
    }
    console.log("Fonts from all CSS:", [...new Set(fonts2)].slice(0, 10).join(", ") || "(none)")
  }

  // Page text preview
  const pageText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 500)
  console.log("\nPage text preview:", JSON.stringify(pageText.substring(0, 200)))
} catch (e) {
  console.log("STEP 1 FAILED:", e.message)
}

// ── STEP 2: Microlink ─────────────────────────────────────────────────────────
console.log("\n=== STEP 2: Microlink Screenshot ===")
try {
  // Try JSON mode first (no embed)
  const t0 = Date.now()
  const mlUrl = `https://api.microlink.io/?url=${encodeURIComponent(TARGET_URL)}&screenshot=true&meta=false`
  const mlRes = await fetch(mlUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) })
  const ct = mlRes.headers.get("content-type") || ""
  console.log("Status:", mlRes.status, " CT:", ct, " Time:", Date.now() - t0 + "ms")
  if (mlRes.ok && ct.includes("json")) {
    const data = await mlRes.json()
    console.log("Microlink response status:", data.status)
    const shotUrl = data?.data?.screenshot?.url
    console.log("Screenshot URL:", shotUrl || "NONE")
    if (shotUrl) {
      const imgRes = await fetch(shotUrl, { signal: AbortSignal.timeout(10000) })
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer()
        console.log("Screenshot image: OK ", (buf.byteLength / 1024).toFixed(1), "KB")
      } else {
        console.log("Screenshot image fetch FAILED:", imgRes.status)
      }
    }
  } else if (!mlRes.ok) {
    const body = await mlRes.text().catch(() => "(unreadable)")
    console.log("Microlink failed. Body:", body.substring(0, 300))
  }
} catch (e) {
  console.log("Microlink ERROR:", e.message)
}

// ── STEP 3: thum.io ───────────────────────────────────────────────────────────
console.log("\n=== STEP 3: thum.io Screenshot ===")
try {
  const thumUrl = `https://image.thum.io/get/width/1440/crop/900/png/${TARGET_URL}`
  console.log("URL:", thumUrl)
  const t0 = Date.now()
  const thumRes = await fetch(thumUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    signal: AbortSignal.timeout(25000),
  })
  const elapsed = Date.now() - t0
  const ct = thumRes.headers.get("content-type") || ""
  console.log("Status:", thumRes.status, " CT:", ct, " Time:", elapsed + "ms")
  if (thumRes.ok) {
    const buf = await thumRes.arrayBuffer()
    console.log("Screenshot: OK ", (buf.byteLength / 1024).toFixed(1), "KB")
  } else {
    console.log("thum.io FAILED")
  }
} catch (e) {
  console.log("thum.io ERROR:", e.message)
}

// ── STEP 4: Full API ──────────────────────────────────────────────────────────
console.log("\n=== STEP 4: POST /api/clone-website (end-to-end) ===")
try {
  const t0 = Date.now()
  const apiRes = await fetch(`${APP_URL}/api/clone-website`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-user-id": "test-diag" },
    body: JSON.stringify({ url: TARGET_URL }),
    signal: AbortSignal.timeout(35000),
  })
  const elapsed = Date.now() - t0
  console.log("Status:", apiRes.status, " Time:", elapsed + "ms")
  const data = await apiRes.json()
  if (data.error) {
    console.log("API ERROR:", data.error)
  } else {
    console.log("success:         ", data.success)
    console.log("title:           ", data.title || "(empty)")
    console.log("metaDescription: ", (data.metaDescription || "(empty)").substring(0, 80))
    console.log("screenshotBase64:", data.screenshotBase64 ? data.screenshotBase64.length + " chars base64" : "NULL -- screenshot MISSING")
    console.log("screenshotMime:  ", data.screenshotMimeType || "(none)")
    console.log("colors count:    ", data.colors?.length || 0)
    console.log("colors sample:   ", (data.colors || []).slice(0, 8).join(", ") || "(none)")
    console.log("fonts count:     ", data.fonts?.length || 0)
    console.log("fonts list:      ", (data.fonts || []).join(", ") || "(none)")
    console.log("pageText length: ", data.pageText?.length || 0)
    console.log("pageText preview:", JSON.stringify((data.pageText || "").substring(0, 150)))
  }
} catch (e) {
  console.log("API CALL ERROR:", e.message)
}

console.log("\n=== Done ===")
