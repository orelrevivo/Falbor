/**
 * Live Browser Streaming Server
 * 
 * Runs a persistent Playwright Chromium session and streams
 * screenshots continuously via WebSocket to connected clients.
 * 
 * This is a standalone server that runs alongside Next.js.
 * Start it with: node server/browser-stream.js
 */

const { chromium } = require("playwright");
const { WebSocketServer } = require("ws");
const http = require("http");

const PORT = 5111;
const VIEWPORT = { width: 1280, height: 800 };
const FRAME_INTERVAL_MS = 400; // ~2.5 fps streaming (adjust lower for faster)

let browserInstance = null;
let pageInstance = null;
let currentUrl = "https://www.google.com";
let isNavigating = false;
let streamingInterval = null;
const connectedClients = new Set();

/**
 * Launch a persistent Chromium browser session
 */
async function launchBrowser() {
  if (browserInstance) return;

  console.log("[browser-stream] Launching persistent Chromium session...");
  
  try {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browserInstance.newContext({
      viewport: VIEWPORT,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });

    pageInstance = await context.newPage();

    // Listen for navigation events to broadcast URL changes
    pageInstance.on("framenavigated", async (frame) => {
      if (frame === pageInstance.mainFrame()) {
        currentUrl = pageInstance.url();
        broadcastToAll({
          type: "URL_CHANGED",
          url: currentUrl,
          title: await pageInstance.title().catch(() => currentUrl),
        });
      }
    });

    await pageInstance.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("[browser-stream] Browser ready. Navigated to:", currentUrl);
  } catch (err) {
    console.error("[browser-stream] Failed to launch browser:", err.message);
    console.log("[browser-stream] Make sure Playwright Chromium is installed: npx playwright install chromium");
    process.exit(1);
  }
}

/**
 * Capture a screenshot and return it as base64
 */
async function captureScreenshot() {
  if (!pageInstance || isNavigating) return null;
  try {
    const buffer = await pageInstance.screenshot({ type: "jpeg", quality: 55 });
    return buffer.toString("base64");
  } catch (err) {
    // Page may be navigating, ignore transient errors
    return null;
  }
}

/**
 * Send a message to all connected WebSocket clients
 */
function broadcastToAll(msg) {
  const payload = JSON.stringify(msg);
  for (const ws of connectedClients) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}

/**
 * Start streaming frames to all connected clients
 */
function startStreaming() {
  if (streamingInterval) return;

  streamingInterval = setInterval(async () => {
    if (connectedClients.size === 0) return;
    
    const base64 = await captureScreenshot();
    if (base64) {
      broadcastToAll({
        type: "FRAME",
        data: base64,
        url: currentUrl,
        timestamp: Date.now(),
      });
    }
  }, FRAME_INTERVAL_MS);

  console.log(`[browser-stream] Streaming at ~${Math.round(1000 / FRAME_INTERVAL_MS)} fps`);
}

/**
 * Handle incoming commands from clients (click, type, navigate, etc.)
 */
async function handleCommand(ws, cmd) {
  if (!pageInstance) {
    ws.send(JSON.stringify({ type: "ERROR", message: "Browser not ready" }));
    return;
  }

  try {
    switch (cmd.action) {
      case "navigate": {
        isNavigating = true;
        broadcastToAll({ type: "STATUS", status: "navigating", url: cmd.url });
        await pageInstance.goto(cmd.url, { waitUntil: "domcontentloaded", timeout: 30000 });
        currentUrl = pageInstance.url();
        isNavigating = false;

        // Send immediate frame after navigation
        const snap = await captureScreenshot();
        if (snap) {
          broadcastToAll({
            type: "FRAME",
            data: snap,
            url: currentUrl,
            timestamp: Date.now(),
          });
        }
        broadcastToAll({
          type: "STATUS",
          status: "ready",
          url: currentUrl,
          title: await pageInstance.title().catch(() => ""),
        });
        break;
      }

      case "click": {
        const { x, y } = cmd;
        if (typeof x === "number" && typeof y === "number") {
          await pageInstance.mouse.click(x, y);
          // Wait briefly for any DOM updates, then send frame
          await pageInstance.waitForTimeout(600);
          const snap = await captureScreenshot();
          if (snap) {
            broadcastToAll({ type: "FRAME", data: snap, url: pageInstance.url(), timestamp: Date.now() });
          }
          // Check if URL changed after click
          const newUrl = pageInstance.url();
          if (newUrl !== currentUrl) {
            currentUrl = newUrl;
            broadcastToAll({
              type: "URL_CHANGED",
              url: currentUrl,
              title: await pageInstance.title().catch(() => ""),
            });
          }
        }
        break;
      }

      case "type": {
        const { x, y, text } = cmd;
        if (typeof x === "number" && typeof y === "number" && text) {
          await pageInstance.mouse.click(x, y);
          await pageInstance.waitForTimeout(200);
          await pageInstance.keyboard.type(text, { delay: 30 }); // Visible typing!
          await pageInstance.keyboard.press("Enter");
          await pageInstance.waitForTimeout(1500);
          currentUrl = pageInstance.url();
          const snap = await captureScreenshot();
          if (snap) {
            broadcastToAll({ type: "FRAME", data: snap, url: currentUrl, timestamp: Date.now() });
          }
          broadcastToAll({
            type: "URL_CHANGED",
            url: currentUrl,
            title: await pageInstance.title().catch(() => ""),
          });
        }
        break;
      }

      case "scroll": {
        const { deltaY } = cmd;
        await pageInstance.mouse.wheel(0, deltaY || 300);
        await pageInstance.waitForTimeout(300);
        break;
      }

      case "back": {
        await pageInstance.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        currentUrl = pageInstance.url();
        await pageInstance.waitForTimeout(500);
        broadcastToAll({
          type: "URL_CHANGED",
          url: currentUrl,
          title: await pageInstance.title().catch(() => ""),
        });
        break;
      }

      case "forward": {
        await pageInstance.goForward({ waitUntil: "domcontentloaded" }).catch(() => {});
        currentUrl = pageInstance.url();
        await pageInstance.waitForTimeout(500);
        broadcastToAll({
          type: "URL_CHANGED",
          url: currentUrl,
          title: await pageInstance.title().catch(() => ""),
        });
        break;
      }

      case "get_state": {
        const snap = await captureScreenshot();
        ws.send(JSON.stringify({
          type: "FRAME",
          data: snap,
          url: currentUrl,
          title: await pageInstance.title().catch(() => ""),
          timestamp: Date.now(),
        }));
        break;
      }

      default:
        ws.send(JSON.stringify({ type: "ERROR", message: `Unknown action: ${cmd.action}` }));
    }
  } catch (err) {
    console.error("[browser-stream] Command error:", err.message);
    ws.send(JSON.stringify({ type: "ERROR", message: err.message }));
    isNavigating = false;
  }
}

// --- Start the server ---

async function main() {
  await launchBrowser();

  const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, url: currentUrl, clients: connectedClients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws) => {
    connectedClients.add(ws);
    console.log(`[browser-stream] Client connected. Total: ${connectedClients.size}`);

    // Send initial frame immediately
    const snap = await captureScreenshot();
    if (snap) {
      ws.send(JSON.stringify({
        type: "FRAME",
        data: snap,
        url: currentUrl,
        title: await pageInstance?.title().catch(() => ""),
        timestamp: Date.now(),
      }));
    }

    ws.on("message", async (raw) => {
      try {
        const cmd = JSON.parse(raw.toString());
        await handleCommand(ws, cmd);
      } catch (err) {
        console.error("[browser-stream] Bad message:", err.message);
      }
    });

    ws.on("close", () => {
      connectedClients.delete(ws);
      console.log(`[browser-stream] Client disconnected. Total: ${connectedClients.size}`);
    });
  });

  startStreaming();

  server.listen(PORT, () => {
    console.log(`\n🌐 Live Browser Stream Server running on ws://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Streaming viewport: ${VIEWPORT.width}x${VIEWPORT.height} @ ~${Math.round(1000 / FRAME_INTERVAL_MS)} fps`);
    console.log(`   Currently viewing: ${currentUrl}\n`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
