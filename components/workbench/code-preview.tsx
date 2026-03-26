// File: components/CodePreview.tsx
// Tab buttons (Preview, Code, Settings, Database) have been moved to the Navbar component.
// This component now receives tabValue and onTabChange as props from the parent.
"use client"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import React from "react"
import { createPortal } from "react-dom"

import { Github, GitCommit, TerminalIcon, Plus, Loader2, X, Loader, RefreshCw, ArrowLeft, ArrowRight, Smartphone, Tablet, Monitor, ChevronDown, Globe, Code2, Settings, Database, Zap } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CodeTab } from "./code-tab"
import { SettingsTab } from "./settings-tab"
import { useAuth } from "@clerk/nextjs"
import { WebContainerPreview } from "./web-container-preview"
import {
  SandpackProvider,
  SandpackFileExplorer,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { DatabasePanel } from "./database-panel"
import FeatureShowcaseDark from "../auth/FeatureShowcaseDark"

// Removed redundant TSX and CSS auto-injection contents
interface CodePreviewProps {
  projectId: string
  isCodeGenerating?: boolean
  onError?: (error: { message: string; file?: string; line?: string }) => void
  isOpen?: boolean
  onClose?: () => void
  currentVersion?: string
  filesOverride?: Array<{ path: string; content: string; imageData?: string; language: string }>
  isGitHubImport?: boolean
  initialTab?: string
  onTabChange?: (tab: string) => void
  isSplitScreen?: boolean
  onEnterSplit?: () => void
  onExitSplit?: () => void
  isTerminalOpen?: boolean
  tabValue?: string
  isHistoryView?: boolean
  onSendMessage?: (message: string) => void
  role?: "admin" | "editor" | "viewer"
  selectedFilePath?: string | null
}
interface TerminalTab {
  id: number
  title: string
}
const AUTO_GENERATED_FILES = [
  "public/index.html",
  "src/App.tsx",
  "src/index.css",
  "src/main.tsx",
  "src/App.css",
  "README.md",
  "index.html",
  "index.tsx",
  "manifest.json",
  "postcss.config.js",
  "postcss.config.ts",
  "styles.css",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "package.json",
  "package-lock.json",
  "yarn.lock",
]
// Device size presets for responsive preview
const DEVICE_SIZES = [
  { name: "Phone", width: 375, height: 667, icon: Smartphone },
  { name: "Tablet", width: 768, height: 1024, icon: Tablet },
  { name: "Desktop", width: "100%", height: "100%", icon: Monitor },
] as const

type DeviceSize = typeof DEVICE_SIZES[number]

// Custom Preview Toolbar Component
function CustomPreviewToolbar({
  currentUrl,
  setCurrentUrl,
  onRefresh,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  selectedDevice,
  setSelectedDevice,
  availableRoutes,
  onRunTerminal,
  onCheckPackages,
}: {
  currentUrl: string
  setCurrentUrl: (url: string) => void
  onRefresh: () => void
  onBack: () => void
  onForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  selectedDevice: DeviceSize
  setSelectedDevice: (device: DeviceSize) => void
  availableRoutes: string[]
  onRunTerminal?: () => void
  onCheckPackages?: () => void
}) {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)
  const [inputValue, setInputValue] = useState(currentUrl)
  const deviceMenuRef = useRef<HTMLDivElement>(null)

  // Sync input value with currentUrl
  useEffect(() => {
    setInputValue(currentUrl)
  }, [currentUrl])

  // Close device menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(event.target as Node)) {
        setShowDeviceMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let url = inputValue.trim()
    if (!url.startsWith("/")) {
      url = "/" + url
    }
    setCurrentUrl(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUrlSubmit(e)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] border-b border-gray-200">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className={`p-1.5 rounded-md transition-colors ${canGoBack
            ? "hover:bg-gray-200 text-gray-700"
            : "text-gray-300 cursor-not-allowed"
            }`}
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className={`p-1.5 rounded-md transition-colors ${canGoForward
            ? "hover:bg-gray-200 text-gray-700"
            : "text-gray-300 cursor-not-allowed"
            }`}
          title="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onRunTerminal}
          className="p-1.5 rounded-md hover:bg-gray-200 text-blue-600 transition-colors"
          title="Run in Terminal"
        >
          <TerminalIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onCheckPackages}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-sm active:scale-95"
          title="Check & Install Missing Packages"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="text-[11px] font-bold uppercase tracking-tight">Check Packages</span>
        </button>
      </div>

      {/* URL Bar */}
      <form onSubmit={handleUrlSubmit} className="flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="/"
          className="w-full px-3 py-0.5 text-sm bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-0 focus:border-transparent"
        />
      </form>

      {/* Device Selector */}
      <div className="relative" ref={deviceMenuRef}>
        <button
          onClick={() => setShowDeviceMenu(!showDeviceMenu)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-200 text-gray-700 transition-colors"
          title="Device size"
        >
          <selectedDevice.icon className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">{selectedDevice.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {showDeviceMenu && (
          <div className="absolute right-0 top-0 mt-1 p-1 bg-white border rounded-lg z-50 min-w-[160px]">
            {DEVICE_SIZES.map((device) => (
              <button
                key={device.name}
                onClick={() => {
                  setSelectedDevice(device)
                  setShowDeviceMenu(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-1 mt-1 mb-1 text-sm rounded-md hover:bg-gray-100 transition-colors ${selectedDevice.name === device.name ? "bg-gray-50 text-blue-600" : "text-gray-700"
                  } first:rounded-t-lg last:rounded-b-lg`}
              >
                <device.icon className="w-4 h-4" />
                <span>{device.name}</span>
                {typeof device.width === "number" && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {device.width}x{device.height}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Sandpack Preview Wrapper with custom controls
function SandpackPreviewWrapper({
  previewContainerRef,
  selectedDevice,
  currentUrl,
  onUrlChange,
}: {
  previewContainerRef: React.RefObject<HTMLDivElement | null>
  selectedDevice: DeviceSize
  currentUrl: string
  onUrlChange: (url: string) => void
}) {
  const { sandpack } = useSandpack()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Listen for navigation changes from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "urlchange") {
        onUrlChange(event.data.url || "/")
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onUrlChange])

  // Navigate when URL changes
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const iframe = previewContainerRef.current.querySelector(".sp-preview-iframe") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "navigate", url: currentUrl }, "*")
    }
  }, [currentUrl, previewContainerRef])

  const isFullWidth = selectedDevice.width === "100%"
  const containerStyle: React.CSSProperties = isFullWidth
    ? { width: "100%", height: "100%" }
    : {
      width: selectedDevice.width as number,
      height: selectedDevice.height as number,
      maxWidth: "100%",
      maxHeight: "100%",
    }

  return (
    <div
      ref={previewContainerRef}
      className="relative h-full flex items-center justify-center bg-[#e5e5e5] overflow-auto"
    >
      <div
        style={containerStyle}
        className={`bg-white ${!isFullWidth ? "shadow-lg rounded-lg overflow-hidden border border-gray-300" : ""}`}
      >
        <SandpackPreview
          showNavigator={false}
          showRefreshButton={false}
          showOpenInCodeSandbox={false}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  )
}

function shouldHideFile(filePath: string, isGitHubImport: boolean): boolean {
  if (!isGitHubImport) return false // Show all files for AI-generated projects
  // Normalize path (remove leading slash/backslash)
  const normalizedPath = filePath.replace(/^[/\\]+/, "")
  return AUTO_GENERATED_FILES.some((autoGenFile) => {
    const normalizedAutoGen = autoGenFile.replace(/^[/\\]+/, "")
    return normalizedPath === normalizedAutoGen || normalizedPath.endsWith(`/${normalizedAutoGen}`)
  })
}
export function CodePreview({
  projectId,
  isCodeGenerating,
  onError,
  isOpen = true,
  onClose,
  currentVersion,
  filesOverride,
  isGitHubImport = false,
  initialTab,
  onTabChange,
  isSplitScreen = false,
  onEnterSplit,
  onExitSplit,
  isTerminalOpen = false,
  tabValue: tabValueProp,
  isHistoryView = false,
  onSendMessage,
  selectedFilePath,
}: CodePreviewProps) {
  const [files, setFiles] = useState<
    Array<{ path: string; content: string; imageData?: string; language: string; type?: string; isLocked?: boolean }>
  >([])
  const [projectType, setProjectType] = useState<"python" | "react" | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; imageData?: string; language: string } | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [editedImageData, setEditedImageData] = useState<string | undefined>(undefined)

  const handleSetEditedContent = (content: string, imageData?: string) => {
    setEditedContent(content)
    setEditedImageData(imageData)
  }
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [sidebarView, setSidebarView] = useState<"files" | "search" | "locks">("files")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [pyodideReady, setPyodideReady] = useState(false)
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [terminalError, setTerminalError] = useState<string | null>(null)
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([{ id: 1, title: "Python REPL" }])
  const [activeTerminalTab, setActiveTerminalTab] = useState(1)
  const [projectMetadata, setProjectMetadata] = useState<any>(null)
  const [isPushing, setIsPushing] = useState(false)
  const [gitError, setGitError] = useState<string | null>(null)
  const [gitSuccess, setGitSuccess] = useState<string | null>(null)


  // Use prop-controlled tab value if provided, otherwise use internal state
  const [internalTabValue, setInternalTabValue] = useState(initialTab || "code")
  const tabValue = tabValueProp !== undefined ? tabValueProp : internalTabValue

  useEffect(() => {
    if (initialTab && initialTab !== internalTabValue) {
      setInternalTabValue(initialTab)
    }
  }, [initialTab])
  const terminals = useRef<Map<number, any>>(new Map())
  const fitAddons = useRef<Map<number, any>>(new Map())
  const terminalRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)
  const pyodideRef = useRef<any>(null)
  const replBuffers = useRef<Map<number, { buffer: string; prompt: string }>>(new Map())
  const { getToken } = useAuth()
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Preview toolbar state
  const [previewUrl, setPreviewUrl] = useState("/")
  const [urlHistory, setUrlHistory] = useState<string[]>(["/"])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedDevice, setSelectedDevice] = useState<DeviceSize>(DEVICE_SIZES[2]) // Default to Desktop
  const [sandpackKey, setSandpackKey] = useState(0) // For forcing refresh

  const toggleInspectorMode = () => {
    setIsInspectorMode((prev) => !prev);
  }

  // Preview navigation handlers
  const handleNavigate = useCallback((url: string) => {
    setPreviewUrl(url)
    // Add to history if it's a new navigation (not back/forward)
    setUrlHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), url]
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPreviewUrl(urlHistory[newIndex])
    }
  }, [historyIndex, urlHistory])

  const handleForward = useCallback(() => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPreviewUrl(urlHistory[newIndex])
    }
  }, [historyIndex, urlHistory])

  const handleRefresh = useCallback(() => {
    setSandpackKey(prev => prev + 1)
  }, [])

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < urlHistory.length - 1

  // Extract available routes from files
  const availableRoutes = useMemo(() => {
    const routes: string[] = ["/"]
    const effectiveFiles = filesOverride || files;
    effectiveFiles.forEach(file => {
      // Look for page files in common patterns
      const pageMatch = file.path.match(/(?:pages|app)\/(.+?)(?:\/page|\/index)?\.(tsx?|jsx?)$/)
      if (pageMatch) {
        const route = "/" + pageMatch[1].replace(/\[(.+?)\]/g, ":$1").replace(/\/index$/, "")
        if (!routes.includes(route)) {
          routes.push(route)
        }
      }
    })
    return routes
  }, [filesOverride, files])

  useEffect(() => {
    if (projectType !== "react") return;
    const iframe = previewContainerRef.current?.querySelector('.sp-preview-iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'INSPECTOR_ACTIVATE',
        active: isInspectorMode,
      }, '*');
    }
  }, [isInspectorMode, projectType]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INSPECTOR_READY') {
        if (projectType !== "react") return;
        const iframe = previewContainerRef.current?.querySelector('.sp-preview-iframe') as HTMLIFrameElement | null;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'INSPECTOR_ACTIVATE',
            active: isInspectorMode,
          }, '*');
        }
      } else if (event.data.type === 'INSPECTOR_CLICK') {
        const element = event.data.elementInfo;
        if (element?.displayText) {
          navigator.clipboard.writeText(element.displayText).then(() => {
            console.log('Element text copied to clipboard');
          }).catch((err) => {
            console.error('Failed to copy: ', err);
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isInspectorMode, projectType]);

  const effectiveFiles = useMemo(() => {
    // Priority:
    // 1. If currently generating, use streaming files
    // 2. If viewing a fixed historical version, use overrides
    // 3. Otherwise use the database state for the latest version
    let sourceFiles = (isCodeGenerating || isHistoryView) && filesOverride && filesOverride.length > 0
      ? filesOverride
      : (files.length > 0 ? files : (filesOverride || []));

    if (!isGitHubImport) return sourceFiles;

    // Filter out auto-generated files for GitHub imports
    const filtered = sourceFiles.filter((file: any) => !shouldHideFile(file.path, isGitHubImport))
    console.log("[v0] GitHub Import detected: filtering auto-generated files")
    console.log("[v0] Original files:", sourceFiles.length, "Filtered files:", filtered.length)
    return filtered
  }, [filesOverride, files, isGitHubImport, projectType, isCodeGenerating, isHistoryView])

  // Auto-select file when selectedFilePath prop changes (live streaming)
  useEffect(() => {
    if (selectedFilePath) {
      const file = effectiveFiles.find(f => f.path === selectedFilePath);
      if (file && file.path !== selectedFile?.path) {
        setSelectedFile(file);
        setEditedContent(file.content);
        setEditedImageData(file.imageData);
      }
    }
  }, [selectedFilePath, effectiveFiles, selectedFile?.path]);
  const sandpackFiles = useMemo(() => {
    if (projectType !== "react" || effectiveFiles.length === 0) return {}
    const filesMap: Record<string, string> = {}
    effectiveFiles.forEach((file) => {
      const key = `/${file.path.startsWith("/") ? file.path.slice(1) : file.path}`
      let content = (selectedFile?.path === file.path) ? editedContent : (file.imageData || file.content)
      // Special handling for package.json: validate as JSON, skip if invalid to prevent parse errors
      if (file.path.endsWith("package.json")) {
        const trimmedContent = content.trim();
        if (!trimmedContent.startsWith('{') || !trimmedContent.endsWith('}')) {
          // Skip logging and use default dependencies if it doesn't look like JSON
          return; // Skip invalid package.json without error
        }
        try {
          JSON.parse(content)
        } catch (e) {
          console.error(`[Sandpack] Invalid package.json content for ${file.path}: ${e}. Skipping to use default dependencies.`)
          return // Skip invalid package.json
        }
      }
      filesMap[key] = content
    })
    return filesMap
  }, [effectiveFiles, selectedFile?.path, editedContent, projectType])
  const template = useMemo(() => {
    if (projectType !== "react") return "react"
    const hasTs = effectiveFiles.some((f) => f.path.endsWith(".ts") || f.path.endsWith(".tsx"))
    return hasTs ? "react-ts" : "react"
  }, [effectiveFiles, projectType])
  const defaultDependencies = useMemo(
    () => ({
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    }),
    [],
  )
  const filesKey = useMemo(() => effectiveFiles.map((f) => `${f.path}:${f.content.length} `).join("|"), [effectiveFiles])

  useEffect(() => {
    if (effectiveFiles.length === 0) {
      setProjectType(null)
      return
    }
    const hasPy = effectiveFiles.some((f) => f.language === "python" || f.path.endsWith(".py"))
    const hasJsTs = effectiveFiles.some(
      (f) =>
        f.language === "javascript" ||
        f.language === "typescript" ||
        f.path.match(/\.j(sx?)$/) ||
        f.path.match(/\.ts(x?)$/) ||
        f.path.match(/\.html$/) ||
        f.path.match(/\.css$/),
    )
    if (hasPy && !hasJsTs) {
      setProjectType("python")
    } else if (hasJsTs || effectiveFiles.length > 0) {
      // Default to react/web if there are any files
      setProjectType("react")
    } else {
      setProjectType(null)
    }
  }, [filesKey])

  const highlightMatch = useCallback((text: string, matches: { start: number; end: number }[]) => {
    let result = text
    matches.forEach(({ start, end }) => {
      const before = result.substring(0, start)
      const match = result.substring(start, end)
      const after = result.substring(end)
      result = `${before} <mark>${match}</mark>${after} `
    })
    return <div dangerouslySetInnerHTML={{ __html: result }} />
  }, [])

  useEffect(() => {
    if (projectType !== "python") {
      setPyodideReady(false)
      pyodideRef.current = null
      return
    }
    let scriptLoaded = false
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js"
    script.onload = async () => {
      scriptLoaded = true
      try {
        const pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
          stdin: () => "",
        })
        pyodideRef.current = pyodide
        setPyodideReady(true)
        console.log("[Python Preview] Pyodide loaded successfully")
        loadFilesIntoPyodide()
      } catch (error) {
        console.error("[Python Preview] Failed to load Pyodide:", error)
      }
    }
    document.head.appendChild(script)
    return () => {
      if (scriptLoaded && document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [projectType])
  const loadFilesIntoPyodide = useCallback(async () => {
    if (projectType !== "python" || !pyodideRef.current || effectiveFiles.length === 0) return
    try {
      console.log("[Python Preview] Loading", effectiveFiles.length, "files to Pyodide FS")
      for (const file of effectiveFiles) {
        if (!file.path || typeof file.content !== "string") continue
        const fullPath = "/" + file.path
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf("/"))
        if (dirPath && dirPath !== "/") {
          try {
            pyodideRef.current.FS.mkdirTree(dirPath)
          } catch (e) {
            // Ignore if exists
          }
        }
        pyodideRef.current.FS.writeFile(fullPath, new TextEncoder().encode(file.content))
      }
      setFilesLoaded(true)
      console.log("[Python Preview] Files loaded")
      terminalTabs.forEach((tab) => {
        const term = terminals.current.get(tab.id)
        if (term) {
          term.writeln("\n✓ Files loaded! Run 'exec(open(\"main.py\").read())' to test your code.")
        }
      })
    } catch (error) {
      console.error("[Python Preview] File load error:", error)
    }
  }, [effectiveFiles, filesKey, terminalTabs, projectType])
  useEffect(() => {
    loadFilesIntoPyodide()
  }, [loadFilesIntoPyodide])
  const initTerminalForTab = useCallback(
    async (tabId: number) => {
      if (projectType !== "python") return
      const dom = terminalRefs.current.get(tabId)
      if (!dom || terminals.current.has(tabId)) return
      try {
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: { background: "#000000", foreground: "#ffffff" },
          convertEol: true,
        })
        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(dom)
        fitAddon.fit()
        terminals.current.set(tabId, term)
        fitAddons.current.set(tabId, fitAddon)
        replBuffers.current.set(tabId, { buffer: "", prompt: ">>> " })
        if (pyodideReady) {
          setupPyodideREPL(tabId, term)
        }
        console.log(`[Python Preview] Terminal ${tabId} ready`)
      } catch (error) {
        console.error(`[Python Preview] Terminal init error for ${tabId}: `, error)
      }
    },
    [pyodideReady, projectType],
  )
  const setupPyodideREPL = useCallback(
    (tabId: number, term: any) => {
      const bufferInfo = replBuffers.current.get(tabId)
      if (!bufferInfo) return
      pyodideRef.current.runPython(`
    import sys
class StdoutRedirect:
    def __init__(self, write_func):
    self.write_func = write_func
    def write(self, text):
    self.write_func(text)
    def flush(self):
    pass
    sys.stdout = StdoutRedirect(lambda text: js.term_write(text))
      `)
      term.writeln("\nPython 3.12 REPL (Pyodide)")
      term.writeln("Files loaded. Ready to run code!")
      term.write(bufferInfo.prompt)
      const onData = (data: string) => {
        const char = data.charCodeAt(0)
        if (char === 13) {
          term.write("\r\n")
          const code = bufferInfo.buffer + "\n"
          bufferInfo.buffer = ""
          pyodideRef.current
            .runPythonAsync(code)
            .then((result: any) => {
              if (result !== undefined) term.write(result.toString() + "\r\n")
            })
            .catch((error: any) => {
              const errorMsg = error.message || String(error)
              term.write(errorMsg + "\r\n")
              const fileMatch = errorMsg.match(/File "(.+?)", line (\d+)/)
              onError?.({
                message: errorMsg,
                file: fileMatch?.[1],
                line: fileMatch?.[2],
              })
            })
          term.write(bufferInfo.prompt)
        } else if (char === 127 || char === 8) {
          if (bufferInfo.buffer.length > 0) {
            bufferInfo.buffer = bufferInfo.buffer.slice(0, -1)
            term.write("\b \b")
          }
        } else if (char >= 32 && char <= 126) {
          bufferInfo.buffer += data
          term.write(data)
        }
      }
      term.onData(onData)
        ; (term as any).disposeOnData = onData
    },
    [onError],
  )
  const addTab = useCallback(() => {
    if (projectType !== "python") return
    const newId = Date.now()
    setTerminalTabs((prev) => [...prev, { id: newId, title: `REPL ${prev.length + 1} ` }])
    setActiveTerminalTab(newId)
  }, [projectType])
  const fetchFiles = useCallback(async () => {
    if (!projectId) return
    try {
      const token = await getToken()
      let url = `/api/projects/${projectId}/files`
      if (currentVersion) {
        url += `?version=${currentVersion}`
      }
      console.log("[v0] Fetching files for project:", projectId, "isGitHubImport:", isGitHubImport)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { files: newFiles, isGitHubImport: fromServer } = await response.json()
      console.log("[v0] Received", newFiles.length, "files from server")
      setFiles(newFiles || [])
      if (newFiles.length > 0 && !selectedFile) {
        if (isGitHubImport || fromServer) {
          const entryFile = newFiles.find(
            (f: any) =>
              f.path.match(/^(src\/)?App\.(tsx?|jsx?)$/) ||
              f.path.match(/^(src\/)?index\.(tsx?|jsx?)$/) ||
              f.path.match(/^(src\/)?main\.(tsx?|jsx?)$/),
          )
          setSelectedFile(entryFile || newFiles[0])
        } else {
          setSelectedFile(newFiles[newFiles.length - 1])
        }
      }
    } catch (error) {
      console.error("[Code Preview] Fetch files error:", error)
    }
  }, [projectId, getToken, selectedFile, currentVersion, isGitHubImport])
  const handleSave = useCallback(async () => {
    if (!selectedFile) return
    if (editedContent === selectedFile.content && editedImageData === selectedFile.imageData) return

    try {
      const token = await getToken()
      await fetch(`/api/projects/${projectId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editedContent,
          imageData: editedImageData || null
        }),
      })
      // Update local files state optimistically
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.path === selectedFile.path ? { ...f, content: editedContent, imageData: editedImageData } : f
        )
      )
      setSelectedFile((prev) => prev ? { ...prev, content: editedContent, imageData: editedImageData } : prev)
      await fetchFiles() // Refresh from server
    } catch (error) {
      console.error("[Code Preview] Save error:", error)
    }
  }, [selectedFile, editedContent, editedImageData, projectId, getToken, fetchFiles])
  const handleDownload = useCallback(async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    effectiveFiles.forEach((file) => zip.file(file.path, file.content))
    const content = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectId}${currentVersion ? `-v${currentVersion}` : ""}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }, [effectiveFiles, projectId, currentVersion])
  useEffect(() => {
    fetchFiles()
    const interval = setInterval(fetchFiles, 5000)
    return () => clearInterval(interval)
  }, [fetchFiles])

  // ─── Post-Generation Sync & Auto-Download ──────────────────
  const wasGenerating = useRef(false)
  useEffect(() => {
    if (isCodeGenerating) {
      wasGenerating.current = true
    } else if (wasGenerating.current && !isCodeGenerating) {
      // Generation just finished!
      wasGenerating.current = false

      // 1. Sync files with server immediately
      fetchFiles()
    }
  }, [isCodeGenerating, fetchFiles])


  useEffect(() => {
    if (selectedFile) {
      setEditedContent(selectedFile.content)
      setEditedImageData(selectedFile.imageData)
    }
  }, [selectedFile])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isEditorFocused) {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isEditorFocused, handleSave])
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { results } = await response.json()
      setSearchResults(results || [])
    } catch (error) {
      console.error("[Code Preview] Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, projectId, getToken])
  useEffect(() => {
    const timeout = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeout)
  }, [handleSearch])
  const isDirty = selectedFile ? editedContent !== selectedFile.content : false

  const fetchProjectMetadata = useCallback(async () => {
    if (!projectId) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Metadata fetch failed")
      const data = await res.json()
      setProjectMetadata(data)
    } catch (err) {
      console.error(err)
    }
  }, [projectId, getToken])

  useEffect(() => {
    fetchProjectMetadata()
  }, [fetchProjectMetadata])

  const handleGitAdopt = async () => {
    try {
      setGitError(null)
      setGitSuccess(null)
      const token = await getToken()
      const res = await fetch(`/api/projects/${projectId}/git/adopt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to adopt repository")
      }
      setGitSuccess("Repository adopted! You can now commit and push changes.")
      fetchProjectMetadata()
    } catch (err: any) {
      setGitError(err.message || "Failed to adopt repository. Ensure your GitHub account is connected.")
    }
  }

  const handleGitPush = async () => {
    setIsPushing(true)
    setGitError(null)
    setGitSuccess(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/projects/${projectId}/git/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: "Update via Falbor AI" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Push failed")
      }
      setGitSuccess("Changes pushed to GitHub successfully!")
    } catch (err: any) {
      setGitError(err.message)
    } finally {
      setIsPushing(false)
    }
  }

  useEffect(() => {
    if (!isDirty) return
    const timeout = setTimeout(() => {
      handleSave()
    }, 2000)
    return () => clearTimeout(timeout)
  }, [editedContent, isDirty, handleSave])
  const editorOptions = useMemo(
    () => ({
      wordWrap: "on",
      fontSize: 13,
      fontFamily: 'Monaco, "Cascadia Code", monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    }),
    [],
  )
  // Updated handleFileSelect to auto-save if dirty
  const handleFileSelect = useCallback((file: any) => {
    if (isDirty) {
      handleSave()
    }
    setSelectedFile(file)
  }, [isDirty, handleSave])
  // Updated handleTabChange to auto-save if switching from code tab and dirty
  const handleTabChange = useCallback((newValue: string) => {
    if (tabValue === "code" && isDirty) {
      handleSave()
    }
    setInternalTabValue(newValue)
    if (onTabChange) onTabChange(newValue)
  }, [tabValue, isDirty, handleSave, onTabChange])
  if (!isOpen) return null

  // Shared CodeTab render for both normal and split screen
  const DATABASE_ENABLED = true;
  const [activeTab, setActiveTab] = useState("preview")

  const renderCodeTab = () => (
    <CodeTab
      sidebarView={sidebarView}
      setSidebarView={setSidebarView}
      files={effectiveFiles}
      selectedFile={selectedFile}
      setSelectedFile={handleFileSelect}
      editedContent={editedContent}
      setEditedContent={handleSetEditedContent}
      isEditorFocused={isEditorFocused}
      setIsEditorFocused={setIsEditorFocused}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      isSearching={isSearching}
      highlightMatch={highlightMatch}
      isDirty={isDirty}
      handleSave={handleSave}
      projectId={projectId}
      fetchFiles={fetchFiles}
      scrollRef={scrollRef}
      monacoRef={monacoRef}
      editorOptions={editorOptions}
      loading={!pyodideReady && projectType === "python"}
      isSplitScreen={isSplitScreen}
      onExitSplit={onExitSplit}
    />
  )

  return (
    <div className="h-full flex flex-col w-full">
      <Tabs value={tabValue} onValueChange={handleTabChange} className="h-full flex flex-col">
        {typeof document !== 'undefined' && document.getElementById('header-left-portal') ? (
          createPortal(
            <div className="flex items-center">
              {/* <TabsList className="bg-white shadow-xs flex items-center">
                <TabsTrigger
                  value="preview"
                  className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                </TabsTrigger>

                <TabsTrigger
                  value="code"
                  className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                </TabsTrigger>

                <div className="border-l border-gray-300 h-[90%] ml-1 mr-1" />

                <TabsTrigger
                  value="database"
                  className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              <button
                className={cn(
                  "ml-3 cursor-pointer",
                  tabValue === "settings"
                    ? "text-[#0099ff]"
                    : "text-gray-700 hover:text-gray-900"
                )}
                onClick={() => handleTabChange("settings")}
              >
                <Settings className="w-4 h-4" />
              </button> */}

              {isGitHubImport && (
                <div className="ml-4 flex items-center gap-2">
                  <div className="h-4 w-[1px] bg-gray-300 mx-1" />
                  {projectMetadata?.isGitAdopted ? (
                    <button
                      onClick={handleGitPush}
                      disabled={isPushing}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff]/20 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isPushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
                      Push to GitHub
                    </button>
                  ) : (
                    <button
                      onClick={handleGitAdopt}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white hover:bg-black/90 text-xs font-medium transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      Adopt project to Git
                    </button>
                  )}
                  {(gitError || gitSuccess) && (
                    <div className={cn(
                      "text-[10px] px-2 py-0.5 rounded-md",
                      gitError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                      {gitError || gitSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>,
            document.getElementById('header-left-portal')!
          )
        ) : (
          <div className="flex-none flex items-center h-0 mb-3 absolute top-7.5">
            <TabsList className="bg-white shadow-xs flex items-center">

              <TabsTrigger
                value="preview"
                className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
              >
                <Globe className="w-4 h-4" />
              </TabsTrigger>

              <TabsTrigger
                value="code"
                className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
              </TabsTrigger>

              <div className="border-l border-gray-300 h-[90%] ml-1 mr-1" />

              <TabsTrigger
                value="database"
                className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
              >
                <Database className="w-4 h-4" />
              </TabsTrigger>


            </TabsList>

            <button
              className={cn(
                "ml-3 cursor-pointer",
                activeTab === "settings"
                  ? "text-[#0099ff]"
                  : "text-gray-700 hover:text-gray-900"
              )}
              onClick={() => handleTabChange("settings")}
            >
              <Settings className="w-4 h-4" />
            </button>

            {isGitHubImport && (
              <div className="ml-4 flex items-center gap-2">
                <div className="h-4 w-[1px] bg-gray-300 mx-1" />
                {projectMetadata?.isGitAdopted ? (
                  <button
                    onClick={handleGitPush}
                    disabled={isPushing}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff]/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isPushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
                    Push to GitHub
                  </button>
                ) : (
                  <button
                    onClick={handleGitAdopt}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white hover:bg-black/90 text-xs font-medium transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Adopt project to Git
                  </button>
                )}
                {(gitError || gitSuccess) && (
                  <div className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md",
                    gitError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  )}>
                    {gitError || gitSuccess}
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        <div className={cn(
          "flex-1 flex flex-col relative overflow-hidden",
          isSplitScreen || (tabValue !== "preview" && tabValue !== "code") ? "" : "border-l border-[#d6d6d6] bg-[#ffffff] shadow-xs"
        )}>
          <div className="flex-1 flex flex-col overflow-hidden">
            {isSplitScreen ? (
              <div className="flex-1 flex w-full h-full overflow-hidden">
                <div className="w-1/2 border-r border-[#d6d6d6] flex flex-col h-full bg-white z-20">
                  {renderCodeTab()}
                </div>
                <div className="w-1/2 flex flex-col h-full z-10 bg-[#e5e5e5]">
                  {projectType === "python" ? (
                    <div className="flex-1 flex flex-col bg-[#202020]">
                      <div className="px-3 py-2 bg-white text-white text-sm flex items-center justify-between border-b border-gray-700">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <TerminalIcon className="w-4 h-4 flex-shrink-0 text-black" />
                          <div className="flex items-center gap-1 flex-1 overflow-hidden">
                            {terminalTabs.map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTerminalTab(tab.id)}
                                className={`px-2 py-1 text-xs rounded whitespace-nowrap overflow-hidden text-ellipsis ${activeTerminalTab === tab.id
                                  ? "bg-[#dad8d8] hover:bg-[#e7e7e7] text-black"
                                  : "bg-[#e4e4e4] hover:bg-[#e7e7e7] text-black"
                                  }`}
                                title={tab.title}
                              >
                                {tab.title}
                              </button>
                            ))}
                            <button
                              onClick={addTab}
                              className="p-1 bg-[#e4e4e4] hover:bg-[#e7e7e7] text-black rounded flex-shrink-0"
                              title="New REPL"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {!filesLoaded && <span className="text-xs text-gray-400">(Loading files...)</span>}
                      </div>
                      <div className="flex-1 relative">
                        {terminalTabs.map((tab) => (
                          <div
                            key={tab.id}
                            ref={(el) => {
                              if (el && !terminalRefs.current.has(tab.id)) {
                                terminalRefs.current.set(tab.id, el)
                                initTerminalForTab(tab.id)
                              }
                            }}
                            className={`absolute inset-0 px-4 text-black ${activeTerminalTab === tab.id ? "block" : "hidden"}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <WebContainerPreview
                      projectId={projectId}
                      files={effectiveFiles}
                      isTerminalOpen={isTerminalOpen}
                      isCodeGenerating={isCodeGenerating}
                    />
                  )}
                </div>
              </div>
            ) : projectType === null ? (
              <div className="flex-1 flex items-center justify-center bg-white">
                <FeatureShowcaseDark />
              </div>
            ) : projectType === "python" ? (
              <>
                <TabsContent
                  value="preview"
                  className="flex-1 m-0 flex flex-col overflow-hidden rounded-bl-lg"
                >
                  {!pyodideReady ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-500">Loading Pyodide Python runtime...</p>
                      </div>
                    </div>
                  ) : effectiveFiles.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center bg-black text-white">
                      <div className="text-center">
                        <p className="text-sm">Waiting for AI to generate Python files...</p>
                        <p className="text-xs text-gray-400 mt-1">Switch to Code tab to edit.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col bg-[#202020]">
                      <div className="px-3 py-2 bg-white text-white text-sm flex items-center justify-between border-b border-gray-700">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <TerminalIcon className="w-4 h-4 flex-shrink-0 text-black" />
                          <div className="flex items-center gap-1 flex-1 overflow-hidden">
                            {terminalTabs.map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTerminalTab(tab.id)}
                                className={`px-2 py-1 text-xs rounded whitespace-nowrap overflow-hidden text-ellipsis ${activeTerminalTab === tab.id
                                  ? "bg-[#dad8d8] hover:bg-[#e7e7e7] text-black"
                                  : "bg-[#e4e4e4] hover:bg-[#e7e7e7] text-black"
                                  }`}
                                title={tab.title}
                              >
                                {tab.title}
                              </button>
                            ))}
                            <button
                              onClick={addTab}
                              className="p-1 bg-[#e4e4e4] hover:bg-[#e7e7e7] text-black rounded flex-shrink-0"
                              title="New REPL"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {!filesLoaded && <span className="text-xs text-gray-400">(Loading files...)</span>}
                      </div>
                      <div className="flex-1 relative">
                        {terminalTabs.map((tab) => (
                          <div
                            key={tab.id}
                            ref={(el) => {
                              if (el && !terminalRefs.current.has(tab.id)) {
                                terminalRefs.current.set(tab.id, el)
                                initTerminalForTab(tab.id)
                              }
                            }}
                            className={`absolute inset-0 px-4 text-black ${activeTerminalTab === tab.id ? "block" : "hidden"}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent
                  value="code"
                  className="flex-1 m-0 flex overflow-hidden rounded-bl-lg"
                >
                  {renderCodeTab()}
                </TabsContent>
                <TabsContent
                  value="settings"
                  className="flex-1 m-0 flex overflow-hidden rounded-bl-lg"
                >
                  <SettingsTab projectId={projectId} />
                </TabsContent>
              </>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <TabsContent
                  value="preview"
                  forceMount={true}
                  className={tabValue === "preview" ? "flex-1 m-0 p-0 overflow-hidden flex flex-col" : "hidden"}
                >
                  <WebContainerPreview
                    projectId={projectId}
                    files={effectiveFiles}
                    isTerminalOpen={isTerminalOpen}
                    isCodeGenerating={isCodeGenerating}
                  />
                </TabsContent>
                <TabsContent
                  value="code"
                  className="flex-1 m-0 flex overflow-hidden rounded-bl-lg"
                >
                  {renderCodeTab()}
                </TabsContent>
                <TabsContent
                  value="settings"
                  className="flex-1 m-0 flex overflow-hidden rounded-bl-lg"
                >
                  <SettingsTab projectId={projectId} />
                </TabsContent>
                <TabsContent
                  value="database"
                  className="flex-1 m-0 flex overflow-hidden rounded-bl-lg"
                >
                  <DatabasePanel projectId={projectId} filesOverride={filesOverride} onSendMessage={onSendMessage} />
                </TabsContent>
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
