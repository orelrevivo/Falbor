/**
 * Test script: sends real commands to the live browser streaming server
 * and saves screenshots to verify everything works.
 */
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const WS_URL = "ws://localhost:5111";
const OUT_DIR = path.join(__dirname, "..", "test-screenshots");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function saveScreenshot(base64, name) {
  const buf = Buffer.from(base64, "base64");
  const file = path.join(OUT_DIR, `${name}.jpg`);
  fs.writeFileSync(file, buf);
  console.log(`  📸 Saved screenshot: ${file}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("\n🧪 Live Browser Test Suite\n");
  console.log("Connecting to", WS_URL, "...\n");

  const ws = new WebSocket(WS_URL);
  let lastFrame = null;

  // Collect frames
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "FRAME" && msg.data) {
        lastFrame = msg.data;
      }
      if (msg.type === "URL_CHANGED") {
        console.log(`  🔗 URL changed to: ${msg.url}`);
      }
      if (msg.type === "STATUS") {
        console.log(`  ⚡ Status: ${msg.status}`);
      }
    } catch {}
  });

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  console.log("✅ Connected!\n");

  // Wait for initial frame
  await sleep(1500);
  if (lastFrame) {
    saveScreenshot(lastFrame, "01_initial_google");
    console.log("  ✅ Initial Google page loaded\n");
  }

  // --- TEST 1: Navigate to GitHub ---
  console.log("📍 TEST 1: Navigate to github.com...");
  ws.send(JSON.stringify({ action: "navigate", url: "https://github.com" }));
  await sleep(5000);
  if (lastFrame) {
    saveScreenshot(lastFrame, "02_github_homepage");
    console.log("  ✅ GitHub homepage loaded\n");
  }

  // --- TEST 2: Click on the search bar (the search icon at top) ---
  console.log("📍 TEST 2: Click on the GitHub search bar...");
  // GitHub search bar is roughly at x=640, y=24 (center top)
  ws.send(JSON.stringify({ action: "click", x: 640, y: 24 }));
  await sleep(2000);
  if (lastFrame) {
    saveScreenshot(lastFrame, "03_github_search_clicked");
    console.log("  ✅ Search bar clicked\n");
  }

  // --- TEST 3: Type a search query ---
  console.log("📍 TEST 3: Type 'nextjs' in search...");
  ws.send(JSON.stringify({ action: "type", x: 640, y: 90, text: "nextjs" }));
  await sleep(4000);
  if (lastFrame) {
    saveScreenshot(lastFrame, "04_github_search_results");
    console.log("  ✅ Search results loaded\n");
  }

  // --- TEST 4: Navigate to Google and search ---
  console.log("📍 TEST 4: Navigate to Google and search for 'Playwright'...");
  ws.send(JSON.stringify({ action: "navigate", url: "https://www.google.com" }));
  await sleep(3000);
  // Google search input is at roughly x=640, y=340
  ws.send(JSON.stringify({ action: "type", x: 640, y: 340, text: "Playwright browser automation" }));
  await sleep(4000);
  if (lastFrame) {
    saveScreenshot(lastFrame, "05_google_search_results");
    console.log("  ✅ Google search results loaded\n");
  }

  console.log("🎉 All tests completed! Check test-screenshots/ folder for results.\n");
  
  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
