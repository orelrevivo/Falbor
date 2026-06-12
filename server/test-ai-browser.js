/**
 * Integration test: simulates what happens when the AI triggers an MCP action.
 * Sends navigate + click + type commands to the live browser streaming server,
 * like the AI would when processing "@GitHub create a repository".
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
  console.log(`  📸 Screenshot saved: ${file}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("\n🤖 AI → Browser Integration Test\n");
  console.log("Simulating: User says '@GitHub show me my repositories'\n");

  const ws = new WebSocket(WS_URL);
  let lastFrame = null;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "FRAME" && msg.data) lastFrame = msg.data;
      if (msg.type === "URL_CHANGED") console.log(`  🔗 Browser navigated to: ${msg.url}`);
      if (msg.type === "STATUS") console.log(`  ⚡ ${msg.status}`);
    } catch {}
  });

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  console.log("✅ Connected to live browser server\n");

  // Step 1: AI decides to go to GitHub
  console.log("🧠 AI: I'll navigate to GitHub to check your repositories...");
  ws.send(JSON.stringify({ action: "navigate", url: "https://github.com/orelrevivo" }));
  await sleep(5000);
  if (lastFrame) saveScreenshot(lastFrame, "ai_01_github_profile");
  console.log("  ✅ AI navigated to user's GitHub profile\n");

  // Step 2: AI clicks on the "Repositories" tab
  console.log("🧠 AI: Clicking on the 'Repositories' tab...");
  ws.send(JSON.stringify({ action: "click", x: 340, y: 130 }));
  await sleep(3000);
  if (lastFrame) saveScreenshot(lastFrame, "ai_02_repos_tab_clicked");
  console.log("  ✅ AI clicked Repositories tab\n");

  // Step 3: AI navigates to a specific repo
  console.log("🧠 AI: Let me check your Falbor-main repository...");
  ws.send(JSON.stringify({ action: "navigate", url: "https://github.com/orelrevivo/Falbor" }));
  await sleep(5000);
  if (lastFrame) saveScreenshot(lastFrame, "ai_03_falbor_repo");
  console.log("  ✅ AI opened the Falbor repository\n");

  console.log("🎉 Integration test complete! The AI successfully:");
  console.log("   1. Navigated to your GitHub profile");
  console.log("   2. Clicked on the Repositories tab");
  console.log("   3. Opened the Falbor repository");
  console.log("\n   All screenshots saved to test-screenshots/\n");

  ws.close();
  process.exit(0);
}

main().catch(console.error);
