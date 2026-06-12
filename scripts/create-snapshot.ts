import { Sandbox } from "@vercel/sandbox";

const CHROMIUM_SYSTEM_DEPS = [
  "nss", "nspr", "libxkbcommon", "atk", "at-spi2-atk", "at-spi2-core",
  "libXcomposite", "libXdamage", "libXrandr", "libXfixes", "libXcursor",
  "libXi", "libXtst", "libXScrnSaver", "libXext", "mesa-libgbm", "libdrm",
  "mesa-libGL", "mesa-libEGL", "cups-libs", "alsa-lib", "pango", "cairo",
  "gtk3", "dbus-libs",
];

async function main() {
  console.log("🚀 Starting a new Vercel Sandbox to create snapshot...");
  
  // Use either VERCEL_TOKEN or your VERCEL_ACCESS_TOKEN from .env file
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;

  const credentials = (token && teamId && projectId) ? { token, teamId, projectId } : {};

  console.log("📦 Creating sandbox instance (Node 24 environment)...");
  const sandbox = await Sandbox.create({
    ...credentials,
    runtime: "node24",
    timeout: 300_000, // 5 minute limit to download and install all binaries
  });

  try {
    console.log("📥 Installing Chromium system libraries inside sandboxed VM...");
    await sandbox.runCommand("sh", [
      "-c",
      `sudo dnf clean all 2>&1 && sudo dnf install -y --skip-broken ${CHROMIUM_SYSTEM_DEPS.join(" ")} 2>&1 && sudo ldconfig 2>&1`,
    ]);

    console.log("📥 Installing agent-browser globally inside VM...");
    await sandbox.runCommand("npm", ["install", "-g", "agent-browser"]);
    
    console.log("📥 Allocating headless Chromium browser binary...");
    await sandbox.runCommand("npx", ["agent-browser", "install"]);

    console.log("📸 Capturing VM image and creating sandbox snapshot...");
    const snapshot = await sandbox.createSnapshot();
    console.log("\n🎉 Sandbox Snapshot Created Successfully!");
    console.log("---------------------------------------");
    console.log("Snapshot ID:", snapshot.id);
    console.log("---------------------------------------\n");

    return snapshot.id;
  } catch (error) {
    console.error("❌ Snapshot creation failed:", error);
  } finally {
    console.log("🛑 Terminating sandbox session...");
    await sandbox.stop();
  }
}

main();
