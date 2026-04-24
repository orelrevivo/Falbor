"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { WebContainer } from "@webcontainer/api"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/workbench-context"
import { useAuth } from "@clerk/nextjs"

// Import types only for SSR safety
import type { Terminal } from "@xterm/xterm"
import type { FitAddon } from "@xterm/addon-fit"

import { DEVICE_PRESETS, DevicePreset } from "./device-presets"
import { TextShimmer } from "../ui/text-shimmer"

const isBrowser = typeof window !== "undefined"

interface WebContainerPreviewProps {
    projectId: string
    files: Array<{ path: string; content: string }>
    isTerminalOpen: boolean
    isCodeGenerating?: boolean
    autoFixEnabled?: boolean
    onSendMessage?: (message: string, isAutomated?: boolean) => void
    onToggleTerminal?: () => void
}

// Singleton to ensure WebContainer only boots once per page load
let webcontainerPromise: Promise<WebContainer> | null = null;

export function WebContainerPreview({
    projectId,
    files,
    isTerminalOpen,
    isCodeGenerating = false,
    onSendMessage,
    onToggleTerminal,
}: WebContainerPreviewProps) {
    const { getToken } = useAuth()
    const {
        sendPrompt,
        autoFixEnabled,
        isAiStreaming,
        isPreviewFullScreen,
        setIsPreviewFullScreen,
        previewUrl: currentUrl,
        setPreviewUrl: setCurrentUrl,
        previewPages: availablePagesLocal,
        setPreviewPages: setAvailablePages,
        selectedDevice,
        setSelectedDevice,
        zoom,
        setZoom,
        refreshCounter
    } = useWorkbench()
    const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null)
    const [iframeUrl, setIframeUrl] = useState<string | null>(null)
    const [status, setStatus] = useState<"waiting" | "booting" | "installing" | "ready" | "error">("waiting")
    const [errorLine, setErrorLine] = useState<string | null>(null)
    const [isAutoFixing, setIsAutoFixing] = useState(false)
    const lastErrorRef = useRef<string | null>(null)
    const errorDebounceRef = useRef<NodeJS.Timeout | null>(null)

    const [autoScale, setAutoScale] = useState(1)

    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const hasBooted = useRef(false)
    const lastRenderedFiles = useRef<string>("")
    const isGeneratingRef = useRef(isCodeGenerating)

    // Handle "preview-navigate" events from Toolbar
    useEffect(() => {
        const handleNavigate = (e: any) => {
            if (e.detail?.path && iframeRef.current && iframeUrl) {
                try {
                    const url = new URL(iframeUrl);
                    url.pathname = e.detail.path;
                    iframeRef.current.src = url.toString();
                    setCurrentUrl(url.toString());
                } catch (err) {
                    console.error("Navigation error:", err);
                }
            }
        };

        window.addEventListener('preview-navigate', handleNavigate);
        return () => window.removeEventListener('preview-navigate', handleNavigate);
    }, [iframeUrl]);

    // Update ref to track generator state without re-triggering effects
    useEffect(() => {
        isGeneratingRef.current = isCodeGenerating
    }, [isCodeGenerating])

    // Update currentUrl when iframeUrl changes initially
    useEffect(() => {
        if (iframeUrl && !currentUrl) setCurrentUrl(iframeUrl)
    }, [iframeUrl, currentUrl])

    // Handle Auto-Scaling for Mobile Devices
    useEffect(() => {
        if (!containerRef.current || selectedDevice.type === "desktop") {
            setAutoScale(1)
            return
        }

        const updateScale = () => {
            if (!containerRef.current) return
            const containerWidth = containerRef.current.clientWidth - 40 // padding
            const containerHeight = containerRef.current.clientHeight - 40
            const scaleX = containerWidth / selectedDevice.width
            const scaleY = containerHeight / selectedDevice.height
            const newScale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 1
            setAutoScale(newScale)
        }

        updateScale()
        const resizeObserver = new ResizeObserver(updateScale)
        resizeObserver.observe(containerRef.current)
        return () => resizeObserver.disconnect()
    }, [selectedDevice])

    const initTerminal = useCallback(async (instance: WebContainer) => {
        if (!terminalRef.current || xtermRef.current || !isBrowser) return

        // Dynamic imports for browser-only packages
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")
        await import("@xterm/xterm/css/xterm.css")

        const terminal = new Terminal({
            cursorBlink: true,
            theme: {
                background: "#000000",
                foreground: "#ffffff",
            },
            fontSize: 12,
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = terminal
        fitAddonRef.current = fitAddon

        // Start shell
        const shellProcess = await instance.spawn("jsh", {
            terminal: {
                cols: terminal.cols,
                rows: terminal.rows,
            },
        })

        shellProcess.output.pipeTo(
            new WritableStream({
                write(data) {
                    terminal.write(data)
                },
            })
        )

        const input = shellProcess.input.getWriter()
        terminal.onData((data) => {
            input.write(data)
        })

        // Error detection logic
        const handleTerminalOutput = (data: string) => {
            if (!autoFixEnabled || isAutoFixing) return

            // Patterns indicating errors that need fixing
            const errorPatterns = [
                /Error:\s*(.*)/i,
                /ReferenceError:\s*(.*)/i,
                /SyntaxError:\s*(.*)/i,
                /TypeError:\s*(.*)/i,
                /Failed to compile/i,
                /Module not found/i,
                /Cannot find module ['"](.*)['"]/i,
                /error\s+while\s+loading\s+loader/i
            ]

            const hasError = errorPatterns.some(p => p.test(data))
            if (hasError) {
                // Strip ANSI codes for the AI
                const cleanData = data.replace(/\x1b\[[0-9;]*m/g, '').trim()

                if (cleanData === lastErrorRef.current) return
                lastErrorRef.current = cleanData

                if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)

                errorDebounceRef.current = setTimeout(() => {
                    terminal.writeln("\r\n\x1b[35m[AI Autopilot] Error detected. Triggering automatic fix...\x1b[0m")
                    setIsAutoFixing(true)
                    sendPrompt(`AUTOMATIC ERROR FIX: I detected the following error in the terminal while running the project. Please fix it immediately:\n\n${cleanData}`, true)

                    // Reset auto-fixing state after a delay or when code starts generating again
                    setTimeout(() => setIsAutoFixing(false), 10000)
                }, 1000)
            }
        }

        return { shellProcess, handleTerminalOutput }
    }, [autoFixEnabled, isAutoFixing, sendPrompt])

    useEffect(() => {
        const handleRunCommand = async (e: any) => {
            if (!webcontainerInstance || !e.detail?.command) return;
            const command = e.detail.command;

            const terminal = xtermRef.current;
            terminal?.writeln(`\r\n\x1b[34m[Terminal] Running: ${command}\x1b[0m`);

            const [cmd, ...args] = command.split(' ');
            try {
                const proc = await webcontainerInstance.spawn(cmd, args);
                proc.output.pipeTo(new WritableStream({
                    write(data) { terminal?.write(data); }
                }));
                await proc.exit;
                terminal?.writeln(`\r\n\x1b[32m[Terminal] Command finished successfully.\x1b[0m`);
            } catch (err) {
                terminal?.writeln(`\r\n\x1b[31m[Terminal] Error: ${err}\x1b[0m`);
            }
        };

        window.addEventListener('terminal-run-command', handleRunCommand);
        return () => window.removeEventListener('terminal-run-command', handleRunCommand);
    }, [webcontainerInstance]);

    useEffect(() => {
        if (hasBooted.current || files.length === 0) return

        hasBooted.current = true

        async function boot() {
            try {
                setStatus("booting")

                // Verify the page has cross-origin isolation (required for SharedArrayBuffer)
                if (!window.crossOriginIsolated) {
                    const RELOAD_KEY = "wc_isolation_reload_attempted"
                    const alreadyTriedReload = sessionStorage.getItem(RELOAD_KEY) === "1"

                    if (!alreadyTriedReload) {
                        // First time: silently reload so the browser picks up the isolation headers
                        console.log("[WebContainer] crossOriginIsolated is false. Reloading to apply isolation headers...")
                        sessionStorage.setItem(RELOAD_KEY, "1")
                        window.location.reload()
                        return
                    } else {
                        // Already reloaded once and still not isolated — show error
                        sessionStorage.removeItem(RELOAD_KEY)
                        console.error("[WebContainer] Still not cross-origin isolated after reload.")
                        setStatus("error")
                        setErrorLine("Your browser or network may be blocking the required security headers. Try opening this page in a new tab.")
                        return
                    }
                }

                // Isolation confirmed — clear any previous reload flag
                sessionStorage.removeItem("wc_isolation_reload_attempted")

                if (!webcontainerPromise) {
                    webcontainerPromise = WebContainer.boot();
                }

                const instance = await webcontainerPromise;
                setWebcontainerInstance(instance)

                const terminal = xtermRef.current || await (async () => {
                    await initTerminal(instance)
                    return xtermRef.current
                })()

                // Mount files
                const fileSystem: any = {}

                // Inject Environment Variables into .env for Vite
                try {
                    let envContent = '';

                    // 1. Fetch Supabase Config
                    const supabaseRes = await fetch(`/api/projects/${projectId}/supabase`);
                    if (supabaseRes.ok) {
                        const supabaseData = await supabaseRes.json();
                        if (supabaseData.supabaseUrl) envContent += `VITE_SUPABASE_URL=${supabaseData.supabaseUrl}\n`;
                        if (supabaseData.anonKey) envContent += `VITE_SUPABASE_ANON_KEY=${supabaseData.anonKey}\n`;
                    }

                    // 2. Fetch Project Secrets
                    const secretsRes = await fetch(`/api/projects/${projectId}/secrets`);
                    if (secretsRes.ok) {
                        const secretsData = await secretsRes.json();
                        secretsData.forEach((s: any) => {
                            // Ensure VITE_ prefix for Vite to pick it up, or use the original name if already prefixed
                            const key = s.key.startsWith('VITE_') ? s.key : `VITE_${s.key}`;
                            envContent += `${key}=${s.value}\n`;
                        });
                    }

                    if (envContent) {
                        fileSystem[".env"] = {
                            file: { contents: envContent }
                        };
                        console.log("[WebContainer] Injected environment variables into .env");
                    }
                } catch (envErr) {
                    console.warn("[WebContainer] Failed to fetch environment variables for preview:", envErr);
                }

                // Helper to ensure directory exists in fileSystem object
                const ensureDir = (obj: any, path: string) => {
                    if (!path) return obj;
                    const parts = path.split("/").filter(Boolean);
                    let current = obj;
                    for (const part of parts) {
                        if (!current[part]) {
                            current[part] = { directory: {} };
                        }
                        current = current[part].directory;
                    }
                    return current;
                };

                // 1. Analyze existing files to provide smart fallbacks
                const hasPackageJson = files.some(f => f?.path === "package.json")
                const hasIndexHtml = files.some(f => f?.path === "index.html")
                const hasViteConfig = files.some(f => f?.path === "vite.config.js" || f?.path === "vite.config.ts")
                const hasTsConfig = files.some(f => f?.path === "tsconfig.json")
                const hasTailwindConfig = files.some(f => f?.path === "tailwind.config.js" || f?.path === "tailwind.config.ts")
                const hasPostcssConfig = files.some(f => f?.path === "postcss.config.js" || f?.path === "postcss.config.ts")

                // 2. Default Boilerplate Fallbacks with Enhanced Stack
                if (!hasPackageJson) {
                    // Smart Dependency Detection: Scan user files for additional imports
                    const detectedDeps: Record<string, string> = {};
                    const importRegex = /(?:from|import\(?)\s*['"]([^'"].*?)['"]/g;

                    files.forEach(f => {
                        if (!f?.content) return;
                        let match;
                        while ((match = importRegex.exec(f.content)) !== null) {
                            const pkg = match[1];
                            // Filter out relative imports and built-ins
                            if (!pkg.startsWith('.') && !pkg.startsWith('/') && !pkg.startsWith('@/')) {
                                // Handle scoped packages or sub-paths
                                const parts = pkg.split('/');
                                const name = pkg.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
                                if (!["react", "react-dom", "vite", "tailwindcss", "autoprefixer", "postcss"].includes(name)) {
                                    detectedDeps[name] = "latest";
                                }
                            }
                        }
                    });

                    fileSystem["package.json"] = {
                        file: {
                            contents: JSON.stringify({
                                name: "webcontainer-project",
                                type: "module",
                                dependencies: {
                                    "react": "^18.3.1",
                                    "react-dom": "^18.3.1",
                                    "vite": "^5.4.8",
                                    "@vitejs/plugin-react": "^4.3.2",
                                    "tailwindcss": "^3.4.13",
                                    "autoprefixer": "^10.4.20",
                                    "postcss": "^8.4.47",
                                    "lucide-react": "^0.453.0",
                                    "react-router-dom": "^6.26.2",
                                    "framer-motion": "^11.11.11",
                                    "clsx": "^2.1.1",
                                    "tailwind-merge": "^2.5.4",
                                    "@supabase/supabase-js": "^2.45.4",
                                    "three": "^0.169.0",
                                    "@types/three": "^0.169.0",
                                    "@react-three/fiber": "^8.17.10",
                                    "@react-three/drei": "^9.114.0",
                                    "gsap": "^3.12.5",
                                    "date-fns": "^4.1.0",
                                    "recharts": "^2.12.7",
                                    "canvas-confetti": "^1.9.3",
                                    "@types/canvas-confetti": "^1.6.4",
                                    ...detectedDeps
                                },
                                scripts: {
                                    "dev": "vite --host",
                                    "build": "vite build",
                                    "preview": "vite preview"
                                }
                            }, null, 2)
                        }
                    }
                }

                if (!hasViteConfig) {
                    fileSystem["vite.config.ts"] = {
                        file: {
                            contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    hmr: {
        overlay: false
    }
  },
  define: {
    // Shim process.env for projects that use it (AI often uses process.env instead of import.meta.env)
    'process.env': {}
  }
})`
                        }
                    }
                }

                if (!hasTsConfig) {
                    fileSystem["tsconfig.json"] = {
                        file: {
                            contents: `{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}`
                        }
                    }
                }

                if (!hasIndexHtml) {
                    fileSystem["index.html"] = {
                        file: {
                            contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Falbor Preview</title>
    <script>
        // Additional shim for process.env in case vite define is bypassed or for browser-side scripts
        window.process = { env: {} };
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
                        }
                    }
                }

                if (!hasTailwindConfig) {
                    fileSystem["tailwind.config.ts"] = {
                        file: {
                            contents: `import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config`
                        }
                    }
                }

                if (!hasPostcssConfig) {
                    fileSystem["postcss.config.js"] = {
                        file: {
                            contents: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
                        }
                    }
                }

                const hasTailwindCss = files.some(f => f?.content?.includes("@tailwind base") || f?.path === "src/index.css")
                if (!hasTailwindCss && !files.some(f => f?.path?.endsWith(".css"))) {
                    ensureDir(fileSystem, "src");
                    fileSystem["src"]["directory"]["index.css"] = {
                        file: {
                            contents: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`
                        }
                    }
                }

                // 3. Mount user files with path normalization and aggressive shimming
                files.forEach(file => {
                    if (!file || !file.path) return;
                    // Normalize backslashes and split
                    const normalizedPath = file.path.replace(/\\/g, "/");
                    const pathParts = normalizedPath.split("/").filter(Boolean);

                    if (pathParts.length === 0) return;

                    let current = fileSystem;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const part = pathParts[i];
                        if (!current[part]) {
                            current[part] = { directory: {} };
                        } else if (current[part].file) {
                            continue;
                        }
                        current = current[part].directory;
                    }

                    const fileName = pathParts[pathParts.length - 1];
                    let fileContent = file.content || "";

                    // Legacy compatibility: shim window.process.env to use Vite's import.meta.env
                    if (fileName === "index.html") {
                        const shim = `<script>window.process = { env: new Proxy({}, { get: (target, prop) => import.meta.env[prop] }) };</script>`;
                        if (fileContent.includes("<head>")) {
                            fileContent = fileContent.replace("<head>", `<head>\n    ${shim}`);
                        } else {
                            fileContent = shim + fileContent;
                        }
                    }

                    if (fileName === "vite.config.ts" || fileName === "vite.config.js") {
                        if (!fileContent.includes("define:") && fileContent.includes("defineConfig({")) {
                            fileContent = fileContent.replace("defineConfig({", `defineConfig({\n  define: { "process.env": {} },`);
                        }
                    }

                    current[fileName] = {
                        file: { contents: fileContent }
                    };
                })

                await instance.mount(fileSystem)
                lastRenderedFiles.current = JSON.stringify(files)

                setStatus("installing")
                terminal?.writeln("\x1b[34mInstalling dependencies...\x1b[0m")

                const installProcess = await instance.spawn("npm", ["install"])
                installProcess.output.pipeTo(new WritableStream({
                    write(data) { terminal?.write(data) }
                }))

                const exitCode = await installProcess.exit
                if (exitCode !== 0) {
                    terminal?.writeln("\r\n\x1b[31mInstallation failed with exit code " + exitCode + "\x1b[0m")
                    throw new Error("Installation failed")
                }

                setStatus("ready")
                terminal?.writeln("\x1b[32mInstallation complete. Starting dev server...\x1b[0m")

                // Terminal output buffer for multi-line error detection
                const outputBuffer = { current: "" };

                const startProcess = await instance.spawn("npm", ["run", "dev"])
                startProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        terminal?.write(data)

                        // Error Monitoring via Buffer
                        if (autoFixEnabled && !isAutoFixing && !isAiStreaming) {
                            outputBuffer.current = (outputBuffer.current + data).slice(-1500)
                            const cleanOutput = outputBuffer.current.replace(/\x1b\[[0-9;]*m/g, '').trim()

                            // Check for common crash patterns in the current buffer
                            const hasCrash =
                                cleanOutput.includes("ReferenceError") ||
                                cleanOutput.includes("SyntaxError") ||
                                cleanOutput.includes("Failed to compile") ||
                                cleanOutput.includes("Module not found") ||
                                cleanOutput.includes("Error:") ||
                                cleanOutput.includes("ERR_");

                            if (hasCrash && cleanOutput.length > 20) {
                                if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
                                errorDebounceRef.current = setTimeout(() => {
                                    // Check once more if the error is still present and valid
                                    const finalClean = outputBuffer.current.replace(/\x1b\[[0-9;]*m/g, '').trim()

                                    terminal?.writeln("\r\n\x1b[31;1m[SPARK FIX]\x1b[0m AI is analyzing the crash and applying a patch...")
                                    setIsAutoFixing(true)

                                    // Construct the strict fixing prompt
                                    const autoFixPrompt = `⚠️ **Terminal Error Detected**\n\n\`\`\`bash\n${finalClean.slice(-1000)}\n\`\`\`\n\n[SYSTEM]: Your dev server crashed. I need a fix immediately. Update the project files so this error is resolved.`;

                                    if (onSendMessage) {
                                        onSendMessage(autoFixPrompt, true)
                                    } else {
                                        sendPrompt(autoFixPrompt, true)
                                    }

                                    outputBuffer.current = "" // Clear buffer after sending

                                    // Re-enable autopilot after 25s (allows for build cycle + AI response)
                                    setTimeout(() => setIsAutoFixing(false), 25000)
                                }, 3000)
                            }
                        }
                    }
                }))

                instance.on("server-ready", (port, url) => {
                    terminal?.writeln("\x1b[32mServer ready at " + url + "\x1b[0m")
                    setIframeUrl(prev => prev === url ? prev : url)
                })

            } catch (err: any) {
                console.error("WebContainer error:", err)
                setStatus("error")
                setErrorLine(err.message)
                xtermRef.current?.writeln("\r\n\x1b[31mError: " + err.message + "\x1b[0m")
            }
        }

        boot()
    }, [files.length])



    // Resize terminal
    useEffect(() => {
        if (isTerminalOpen && fitAddonRef.current) {
            const timeout = setTimeout(() => {
                fitAddonRef.current?.fit()
            }, 100)
            return () => clearTimeout(timeout)
        }
    }, [isTerminalOpen])

    // Sync files and auto-install new dependencies
    useEffect(() => {
        if (!webcontainerInstance || status !== "ready") return

        const currentFilesString = JSON.stringify(files)
        if (currentFilesString === lastRenderedFiles.current) return

        setIsAutoFixing(false) // Reset flag when new code arrives
        const timeout = setTimeout(async () => {
            try {
                // Check if package.json needs updating due to new imports
                const importRegex = /(?:from|import\(?)\s*['"]([^'"].*?)['"]/g;
                const newlyDetectedPackages: string[] = [];

                for (const file of files) {
                    const pathParts = file.path.split("/").filter(Boolean)
                    if (pathParts.length > 1) {
                        const dirPath = pathParts.slice(0, -1).join("/")
                        await webcontainerInstance.fs.mkdir(dirPath, { recursive: true })
                    }
                    await webcontainerInstance.fs.writeFile(file.path, file.content)

                    // Scan for new imports
                    if (file.content) {
                        let match;
                        while ((match = importRegex.exec(file.content)) !== null) {
                            const pkg = match[1];
                            if (!pkg.startsWith('.') && !pkg.startsWith('/') && !pkg.startsWith('@/')) {
                                const parts = pkg.split('/');
                                const name = pkg.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
                                newlyDetectedPackages.push(name);
                            }
                        }
                    }
                }

                // If new packages are found, trigger Background Install
                if (newlyDetectedPackages.length > 0) {
                    const pkgJsonPath = "package.json";
                    const pkgJsonRaw = await webcontainerInstance.fs.readFile(pkgJsonPath, 'utf-8').catch(() => null);
                    if (pkgJsonRaw) {
                        const pkgJson = JSON.parse(pkgJsonRaw);
                        let changed = false;
                        newlyDetectedPackages.forEach(p => {
                            if (!pkgJson.dependencies[p]) {
                                pkgJson.dependencies[p] = "latest";
                                changed = true;
                            }
                        });

                        if (changed) {
                            console.log("[WebContainer] Dynamic dependency update detected. installing...");
                            await webcontainerInstance.fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
                            const terminal = xtermRef.current;
                            terminal?.writeln("\r\n\x1b[34m[Autopilot] New imports detected. Updating environment...\x1b[0m");

                            const installProc = await webcontainerInstance.spawn("npm", ["install"]);
                            installProc.output.pipeTo(new WritableStream({ write(data) { terminal?.write(data) } }));
                            await installProc.exit;
                            terminal?.writeln("\x1b[32m[Autopilot] Environment synchronized.\x1b[0m");
                        }
                    }
                }

                lastRenderedFiles.current = currentFilesString
            } catch (err) {
                console.error("Sync error:", err)
            }
        }, 800)

        return () => clearTimeout(timeout)
    }, [files, webcontainerInstance, status, isCodeGenerating])

    // Listen for build requests from Navbar
    useEffect(() => {
        const handleBuildAndDeploy = async (e: any) => {
            if (!webcontainerInstance) {
                window.dispatchEvent(new CustomEvent('build-deploy-error', { detail: { message: 'Preview environment not running. Please open the Preview tab FIRST before publishing.' } }));
                return;
            }

            const { projectId, subdomain, republish } = e.detail;

            try {
                // Always get a fresh token here — the token passed via the event may be
                // stale/expired by the time this handler runs (Clerk JWTs are short-lived).
                const token = await getToken();

                const terminal = xtermRef.current;
                terminal?.writeln('\r\n\x1b[34m[Deploy] Preparing production build...\x1b[0m');

                // 1. Install vite-plugin-singlefile
                const installProc = await webcontainerInstance.spawn("npm", ["install", "vite-plugin-singlefile", "--save-dev"]);
                installProc.output.pipeTo(new WritableStream({ write(data) { terminal?.write(data) } }));
                if (await installProc.exit !== 0) throw new Error("Failed to install vite-plugin-singlefile");

                // 2. Modify vite config
                const configContent = await webcontainerInstance.fs.readFile('vite.config.ts', 'utf8').catch(() => null)
                    || await webcontainerInstance.fs.readFile('vite.config.js', 'utf8').catch(() => null);

                if (configContent) {
                    let newConfig = configContent;

                    if (!newConfig.includes('viteSingleFile')) {
                        newConfig = `import { viteSingleFile } from "vite-plugin-singlefile";\n` +
                            newConfig.replace('plugins: [', 'plugins: [viteSingleFile(), ');
                    }

                    // Force relative base path for assets
                    if (!newConfig.includes('base:')) {
                        newConfig = newConfig.replace('defineConfig({', 'defineConfig({\n  base: "",');
                    } else {
                        newConfig = newConfig.replace(/base:\s*['"][^'"]*['"]/, 'base: ""');
                    }

                    // Scrub legacy 'process.env': 'import.meta.env' hack from config
                    if (newConfig.includes('process.env')) {
                        newConfig = newConfig.replace(/'process\.env'\s*:\s*'import\.meta\.env'\,?/g, '');
                    }

                    await webcontainerInstance.fs.writeFile('vite.config.ts', newConfig);
                }

                // 3. Scrub legacy process.env syntax globally in src
                terminal?.writeln('\x1b[34m[Deploy] Optimizing source code for production...\x1b[0m');
                const srcFiles = await webcontainerInstance.spawn("find", ["src", "-type", "f", "-name", "*.ts", "-o", "-name", "*.tsx"]);
                let output = '';
                srcFiles.output.pipeTo(new WritableStream({ write(data) { output += data } }));
                await srcFiles.exit;

                const fileList = output.split('\n').filter(Boolean);
                for (const file of fileList) {
                    const content = await webcontainerInstance.fs.readFile(file.trim(), 'utf8').catch(() => null);
                    if (content && content.includes('process.env')) {
                        const fixedContent = content.replace(/process\.env\.VITE_SUPABASE_URL/g, 'import.meta.env.VITE_SUPABASE_URL')
                            .replace(/process\.env\.VITE_SUPABASE_ANON_KEY/g, 'import.meta.env.VITE_SUPABASE_ANON_KEY')
                            .replace(/process\.env\./g, 'import.meta.env.'); // General replacement
                        await webcontainerInstance.fs.writeFile(file.trim(), fixedContent);
                    }
                }

                // 3. Inject Environment Variables from Secrets (REQUIRED for build)
                terminal?.writeln('\x1b[34m[Deploy] Injecting environment variables...\x1b[0m');

                let envContent = '';

                // Fetch secrets
                const secretsRes = await fetch(`/api/projects/${projectId}/secrets`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (secretsRes.ok) {
                    const secrets = await secretsRes.json();
                    secrets.forEach((s: any) => {
                        if (!s || !s.key) return; // Skip invalid entries
                        const key = s.key.startsWith('VITE_') ? s.key : `VITE_${s.key}`;
                        envContent += `${key}=${s.value}\n`;
                    });
                    terminal?.writeln(`\x1b[32m[Deploy] Loaded ${secrets.length} secrets\x1b[0m`);
                } else {
                    terminal?.writeln('\x1b[33m[Deploy] No secrets found or failed to fetch\x1b[0m');
                }

                // Fetch Supabase config
                const supabaseRes = await fetch(`/api/projects/${projectId}/supabase`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (supabaseRes.ok) {
                    const supabaseData = await supabaseRes.json();
                    if (supabaseData.supabaseUrl) {
                        envContent += `VITE_SUPABASE_URL=${supabaseData.supabaseUrl}\n`;
                        terminal?.writeln('\x1b[32m[Deploy] Added VITE_SUPABASE_URL\x1b[0m');
                    }
                    if (supabaseData.anonKey) {
                        envContent += `VITE_SUPABASE_ANON_KEY=${supabaseData.anonKey}\n`;
                        terminal?.writeln('\x1b[32m[Deploy] Added VITE_SUPABASE_ANON_KEY\x1b[0m');
                    }
                } else {
                    terminal?.writeln('\x1b[33m[Deploy] No Supabase config found\x1b[0m');
                }

                // Write .env file if we have env vars (optional for static sites, required for server sites)
                if (envContent) {
                    await webcontainerInstance.fs.writeFile('.env', envContent);
                    terminal?.writeln('\x1b[32m[Deploy] .env file created with ' + envContent.split('\n').filter(Boolean).length + ' variables\x1b[0m');

                    // Verify .env was written
                    const envVerify = await webcontainerInstance.fs.readFile('.env', 'utf-8').catch(() => null);
                    if (!envVerify) {
                        throw new Error("Failed to verify .env file was written");
                    }
                } else {
                    terminal?.writeln('\x1b[33m[Deploy] No env vars found - building as static site\x1b[0m');
                }

                // 4. Run build
                terminal?.writeln('\x1b[34m[Deploy] Creating dist bundle...\x1b[0m');
                const buildProc = await webcontainerInstance.spawn("npm", ["run", "build"]);
                buildProc.output.pipeTo(new WritableStream({ write(data) { terminal?.write(data) } }));
                if (await buildProc.exit !== 0) throw new Error("Build failed");

                // 4. Gather dist files
                terminal?.writeln('\x1b[34m[Deploy] Gathering build artifacts...\x1b[0m');
                const distFiles: Array<{ path: string, content: string }> = [];

                async function collectFiles(dir: string) {
                    const entries = await webcontainerInstance.fs.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const path = `${dir}/${entry.name}`;
                        if (entry.isDirectory()) {
                            await collectFiles(path);
                        } else {
                            let content = await webcontainerInstance.fs.readFile(path, 'utf-8');

                            // Hot-Patch JS bundles: swap import.meta.env to process.env 
                            // so our runtime shim can inject the keys.
                            if (path.endsWith('.js') || path.endsWith('.mjs')) {
                                content = content.replace(/import\.meta\.env/g, 'process.env');
                            }

                            distFiles.push({ path, content });
                        }
                    }
                }

                try {
                    await collectFiles('dist');
                } catch (err) {
                    console.error("Failed to read dist directory:", err);
                    throw new Error("Could not find build output in 'dist' folder.");
                }

                // 5. Send to deploy API
                terminal?.writeln('\x1b[34m[Deploy] Uploading to production...\x1b[0m');
                if (!webcontainerInstance) throw new Error("WebContainer not initialized");

                // Refresh the token right before the deploy request — the build can take
                // several minutes and the earlier token may have expired by now.
                const deployToken = await getToken();

                const res = await fetch(`/api/projects/${projectId}/deploy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deployToken}` },
                    body: JSON.stringify({ subdomain, republish, distFiles })
                });

                if (!res.ok) throw new Error("Upload failed");

                const data = await res.json();
                terminal?.writeln(`\r\n\x1b[32m[Deploy] Deployed to ${data.deploymentUrl}\x1b[0m`);

                window.dispatchEvent(new CustomEvent('build-deploy-complete', { detail: data }));

            } catch (err: any) {
                xtermRef.current?.writeln(`\r\n\x1b[31m[Deploy] Error: ${err.message}\x1b[0m`);
                window.dispatchEvent(new CustomEvent('build-deploy-error', { detail: { message: err.message } }));
            }
        };

        window.addEventListener('initiate-build-and-deploy', handleBuildAndDeploy);
        return () => window.removeEventListener('initiate-build-and-deploy', handleBuildAndDeploy);
    }, [webcontainerInstance, getToken])

    // Sync URL from iframe
    useEffect(() => {
        const interval = setInterval(() => {
            if (iframeRef.current?.contentWindow) {
                try {
                    const url = iframeRef.current.contentWindow.location.href
                    if (url !== currentUrl) {
                        setCurrentUrl(url)
                    }
                } catch (e) {
                    // Ignore cross-origin errors
                }
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [currentUrl])

    const handleRefresh = useCallback(() => {
        if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
        }
    }, []);

    useEffect(() => {
        if (refreshCounter > 0) handleRefresh();
    }, [refreshCounter, handleRefresh]);

    const availablePages = useMemo(() => {
        const pages = ["/"];
        files.forEach(file => {
            const path = file.path || "";
            if (path.includes('app/') || path.includes('pages/')) {
                const match = path.match(/(?:app|pages)\/(.+?)(?:\/page|\/index)?\.(tsx?|jsx?)$/);
                if (match) {
                    const route = "/" + match[1].replace(/\[(.+?)\]/g, ":$1").replace(/\/index$/, "");
                    if (!pages.includes(route)) pages.push(route);
                }
            }
        });
        return pages;
    }, [files]);

    useEffect(() => {
        setAvailablePages(availablePages);
    }, [availablePages, setAvailablePages]);

    const finalScale = (zoom / 100) * autoScale;

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#111114]">
            <div className="flex-1 relative flex flex-col min-h-0">
                <div
                    ref={containerRef}
                    className={cn(
                        "flex-1 flex items-center justify-center overflow-auto bg-[#f9f9f9] dark:bg-[#000000]",
                        isTerminalOpen ? 'h-[60%]' : 'h-full',
                        selectedDevice.type === "desktop" && "items-stretch p-0"
                    )}
                >
                    {status === "waiting" ? (
                        <div className="text-center w-full h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                            <TextShimmer className="text-sm text-gray-600 font-medium italic">
                                Waiting for AI to finish generating files...
                            </TextShimmer>
                        </div>
                    ) : status === "booting" || status === "installing" ? (
                        <div className="text-center w-full h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                            <TextShimmer className="text-sm text-gray-600 uppercase tracking-widest font-medium">
                                {status === "booting" ? "Booting WebContainer..." : "Installing Dependencies..."}
                            </TextShimmer>
                        </div>
                    ) : status === "error" ? (
                        <div className="text-center p-4 w-full h-full flex flex-col items-center justify-center gap-3">
                            <TextShimmer className="text-red-600 font-bold text-base">Preview Not Ready</TextShimmer>
                            <TextShimmer className="text-xs text-gray-500 font-mono max-w-xs">{errorLine}</TextShimmer>
                            {!window.crossOriginIsolated && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    🔄 Hard Refresh Page
                                </button>
                            )}
                        </div>
                    ) : iframeUrl ? (
                        <div
                            className="bg-white origin-center flex-shrink-0 shadow-2xl"
                            style={{
                                width: selectedDevice.type === "desktop" ? "100%" : `${selectedDevice.width}px`,
                                height: selectedDevice.type === "desktop" ? "100%" : `${selectedDevice.height}px`,
                                transform: selectedDevice.type === "desktop" && zoom === 100 ? "none" : `scale(${finalScale})`,
                            }}
                        >
                            <iframe
                                ref={iframeRef}
                                src={iframeUrl}
                                className="w-full h-full border-none pointer-events-auto"
                                title="WebContainer Preview"
                            />
                        </div>
                    ) : (
                        <div className="text-center w-full h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                            <TextShimmer className="text-sm text-gray-600 uppercase tracking-widest font-medium">Starting Dev Server...</TextShimmer>
                        </div>
                    )}
                </div>

                {/* Terminal Area */}
                <div
                    ref={terminalRef}
                    className={cn(
                        "transition-all duration-300 bg-black",
                        isTerminalOpen ? 'h-[40%] opacity-100 visible p-2 border-t border-gray-700' : 'h-0 opacity-0 invisible overflow-hidden'
                    )}
                />
            </div>
        </div>
    );
}
