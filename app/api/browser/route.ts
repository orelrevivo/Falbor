import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"

export const maxDuration = 60 // Allow longer timeouts for browser VMs
export const dynamic = "force-dynamic"

// Simple in-memory states to display the latest active browser context screenshots and state
let lastScreenshot: string | null = null
let currentUrl: string = "https://www.google.com"
let currentTitle: string = "Google"

export async function POST(req: NextRequest) {
  try {
    const { action, url, selector, text, x, y } = await req.json()

    // Only return cached state if we actually have a screenshot saved.
    // If not, we fall through to fetch/generate the first screenshot!
    if (action === "get_state" && lastScreenshot !== null) {
      return NextResponse.json({
        ok: true,
        screenshot: lastScreenshot,
        url: currentUrl,
        title: currentTitle,
      })
    }

    const targetUrl = url || currentUrl

    const vercelToken = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN
    const vercelTeamId = process.env.VERCEL_TEAM_ID
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    // 1. Try Vercel Sandbox if credentials are fully configured in the environment
    if (
      vercelToken &&
      vercelTeamId &&
      vercelProjectId
    ) {
      try {
        // Dynamically import @vercel/sandbox so there are no bundle issues if the package is not installed yet
        const { Sandbox } = await import("@vercel/sandbox")
        const snapshotId = process.env.AGENT_BROWSER_SNAPSHOT_ID

        const credentials = {
          token: vercelToken,
          teamId: vercelTeamId,
          projectId: vercelProjectId,
        }

        const sandbox = snapshotId
          ? await Sandbox.create({
              ...credentials,
              source: { type: "snapshot", snapshotId },
              timeout: 120_000,
            })
          : await Sandbox.create({ ...credentials, runtime: "node24", timeout: 120_000 })

        if (!snapshotId) {
          const CHROMIUM_SYSTEM_DEPS = [
            "nss", "nspr", "libxkbcommon", "atk", "at-spi2-atk", "at-spi2-core",
            "libXcomposite", "libXdamage", "libXrandr", "libXfixes", "libXcursor",
            "libXi", "libXtst", "libXScrnSaver", "libXext", "mesa-libgbm", "libdrm",
            "mesa-libGL", "mesa-libEGL", "cups-libs", "alsa-lib", "pango", "cairo",
            "gtk3", "dbus-libs",
          ]
          await sandbox.runCommand("sh", [
            "-c",
            `sudo dnf clean all 2>&1 && sudo dnf install -y --skip-broken ${CHROMIUM_SYSTEM_DEPS.join(" ")} 2>&1 && sudo ldconfig 2>&1`,
          ])
          await sandbox.runCommand("npm", ["install", "-g", "agent-browser"])
          await sandbox.runCommand("npx", ["agent-browser", "install"])
        }

        // Navigate using agent-browser inside the sandboxed Vercel MicroVM
        await sandbox.runCommand("agent-browser", ["open", targetUrl])
        
        if (action === "click_coords" && typeof x === "number" && typeof y === "number") {
          await sandbox.runCommand("agent-browser", ["click", `${x},${y}`])
        } else if (action === "type_coords" && typeof x === "number" && typeof y === "number" && text) {
          await sandbox.runCommand("agent-browser", ["type", `${x},${y}`, text])
        } else if (action === "click" && selector) {
          await sandbox.runCommand("agent-browser", ["click", selector])
        } else if (action === "type" && selector && text) {
          await sandbox.runCommand("agent-browser", ["type", selector, text])
        }

        const ssResult = await sandbox.runCommand("agent-browser", ["screenshot", "--json"])
        const ssPath = JSON.parse(await ssResult.stdout())?.data?.path
        const b64Result = await sandbox.runCommand("base64", ["-w", "0", ssPath])
        const screenshot = (await b64Result.stdout()).trim()

        await sandbox.runCommand("agent-browser", ["close"])
        await sandbox.stop()

        lastScreenshot = `data:image/jpeg;base64,${screenshot}`
        currentUrl = targetUrl
        currentTitle = targetUrl.replace(/^https?:\/\/(www\.)?/, "")

        return NextResponse.json({
          ok: true,
          screenshot: lastScreenshot,
          url: currentUrl,
          title: currentTitle,
          engine: "vercel-sandbox"
        })
      } catch (err: any) {
        console.error("Vercel Sandbox execution failed, falling back to local playwright:", err)
      }
    }

    // 2. Local Fallback: Playwright Headless Chromium with Self-Healing Browser Binary Installation
    try {
      const { chromium } = await import("playwright")
      let browser
      try {
        browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        })
      } catch (launchErr: any) {
        const errorMsg = launchErr?.message || ""
        if (errorMsg.includes("Executable doesn't exist") || errorMsg.includes("playwright install")) {
          console.log("Playwright browser executables not found. Running self-healing install in the background...")
          execSync("npx playwright install chromium", { stdio: "inherit" })
          browser = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
          })
        } else {
          throw launchErr
        }
      }

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      })
      
      const page = await context.newPage()
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 })

      if (action === "click_coords" && typeof x === "number" && typeof y === "number") {
        await page.mouse.click(x, y)
        await page.waitForTimeout(1500)
      } else if (action === "type_coords" && typeof x === "number" && typeof y === "number" && text) {
        await page.mouse.click(x, y)
        await page.keyboard.type(text)
        await page.keyboard.press("Enter")
        await page.waitForTimeout(2000)
      } else if (action === "click" && selector) {
        await page.click(selector)
        await page.waitForTimeout(1000)
      } else if (action === "type" && selector && text) {
        await page.fill(selector, text)
        await page.waitForTimeout(1000)
      }

      const title = await page.title()
      const currentRealUrl = page.url()
      const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 70 })
      await browser.close()

      const base64Screenshot = screenshotBuffer.toString("base64")
      lastScreenshot = `data:image/jpeg;base64,${base64Screenshot}`
      currentUrl = currentRealUrl
      currentTitle = title || currentRealUrl.replace(/^https?:\/\/(www\.)?/, "")

      return NextResponse.json({
        ok: true,
        screenshot: lastScreenshot,
        url: currentUrl,
        title: currentTitle,
        engine: "local-playwright"
      })
    } catch (playwrightErr: any) {
      console.error("Local Playwright failed, falling back to cloud API screenshot system:", playwrightErr)
    }

    // 3. Fallback 3: Free Cloud Screenshot APIs (Microlink & Thum.io)
    // Ensures a gorgeous rendering is ALWAYS displayed even without browser binaries or Vercel keys!
    try {
      console.log(`Fetching Microlink screenshot for target: ${targetUrl}`)
      const mlUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&embed=screenshot.url`
      const imgRes = await fetch(mlUrl, { signal: AbortSignal.timeout(15000) })
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer()
        const base64Screenshot = Buffer.from(buf).toString("base64")
        lastScreenshot = `data:image/jpeg;base64,${base64Screenshot}`
        currentUrl = targetUrl
        currentTitle = targetUrl.replace(/^https?:\/\/(www\.)?/, "")

        return NextResponse.json({
          ok: true,
          screenshot: lastScreenshot,
          url: currentUrl,
          title: currentTitle,
          engine: "microlink-cloud"
        })
      }
    } catch (apiErr) {
      console.error("Microlink API screenshot fetch failed, trying Thum.io fallback:", apiErr)
    }

    try {
      console.log(`Fetching Thum.io fallback screenshot for target: ${targetUrl}`)
      const thumUrl = `https://image.thum.io/get/width/1280/crop/800/maxAge/1/${targetUrl}`
      const imgRes = await fetch(thumUrl, { signal: AbortSignal.timeout(15000) })
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer()
        const base64Screenshot = Buffer.from(buf).toString("base64")
        lastScreenshot = `data:image/jpeg;base64,${base64Screenshot}`
        currentUrl = targetUrl
        currentTitle = targetUrl.replace(/^https?:\/\/(www\.)?/, "")

        return NextResponse.json({
          ok: true,
          screenshot: lastScreenshot,
          url: currentUrl,
          title: currentTitle,
          engine: "thum-io-cloud"
        })
      }
    } catch (thumErr) {
      console.error("Thum.io fallback screenshot fetch failed:", thumErr)
    }

    throw new Error("All browser automation engines failed to navigate and capture the screenshot.")

  } catch (error: any) {
    console.error("API Browser action failure:", error)
    return NextResponse.json({
      error: error.message || "Failed to execute browser action",
      ok: false
    }, { status: 500 })
  }
}
