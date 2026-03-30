// components/workbench/editor-pane.tsx
"use client"

import { cn } from "@/lib/utils"
import { Save, Play, Loader2, ChevronRight, Database, X, AppWindow, Crop, Check, RotateCcw } from "lucide-react"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileSidebar } from "./file-sidebar"
import { useUser } from "@clerk/nextjs"
import { SupabaseConnectModal } from "@/components/models/supabase-connect-modal"
import dynamic from "next/dynamic"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  { ssr: false }
)

interface EditorPaneProps {
  selectedFile: { path: string; content: string; imageData?: string } | null
  editedContent: string
  setEditedContent: (content: string, imageData?: string) => void
  isEditorFocused: boolean
  setIsEditorFocused: (focused: boolean) => void
  isDirty: boolean
  handleSave: () => void
  scrollRef: React.RefObject<HTMLDivElement | null>
  monacoRef: React.RefObject<any>
  editorOptions: any
  files: Array<{ path: string; content: string; imageData?: string; language: string; type?: string; isLocked?: boolean }>
  setSelectedFile: (file: { path: string; content: string; imageData?: string; language: string } | null) => void
  projectId: string
  fetchFiles: () => void
  isSplitScreen?: boolean
  onExitSplit?: () => void
  role?: "viewer" | "editor" | "admin"
}

interface DatabaseCredentials {
  supabaseUrl: string
  anonKey: string
}

const getLanguage = (filePath: string): string => {
  if (!filePath) return "plaintext"
  const ext = filePath.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "json":
      return "json"
    case "css":
      return "css"
    case "html":
      return "html"
    case "md":
      return "markdown"
    case "py":
      return "python"
    case "yml":
    case "yaml":
      return "yaml"
    case "sql":
      return "sql"
    case "env":
      return "properties"
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return "image"
    default:
      return "html"
  }
}

const maskEnv = (content: string): string => {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (trimmed === "" || trimmed.startsWith("#")) return line
      const eqIdx = line.indexOf("=")
      if (eqIdx === -1) return line
      const key = line.substring(0, eqIdx + 1)
      const value = line.substring(eqIdx + 1)
      const maskedValue = "*".repeat(value.length)
      return key + maskedValue
    })
    .join("\n")
}

function ImageEditor({
  src,
  onSave,
  fileName,
}: {
  src: string
  onSave: (newContent: string, newImageData?: string) => void
  fileName: string
}) {
  const [isCropping, setIsCropping] = React.useState(false)
  const [crop, setCrop] = React.useState({ x: 10, y: 10, width: 80, height: 80 }) // in percentage
  const containerRef = React.useRef<HTMLDivElement>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)

  const handleCrop = () => {
    if (!imageRef.current) return

    const canvas = document.createElement("canvas")
    const img = imageRef.current
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    canvas.width = (crop.width / 100) * img.width * scaleX
    canvas.height = (crop.height / 100) * img.height * scaleY

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      img,
      (crop.x / 100) * img.width * scaleX,
      (crop.y / 100) * img.height * scaleY,
      (crop.width / 100) * img.width * scaleX,
      (crop.height / 100) * img.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.8)
    onSave("", croppedBase64)
    setIsCropping(false)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#fafafa] overflow-hidden">
      {/* Tool Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-black">{fileName}</span>
          <span className="text-xs text-gray-400 font-mono">Image Preview</span>
        </div>
        <div className="flex items-center gap-3">
          {isCropping ? (
            <>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setIsCropping(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
              >
                Cancel
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCrop}
                className="flex items-center gap-2 px-6 py-2 text-xs font-medium text-white bg-black rounded-full shadow-lg shadow-black/10 transition-all hover:bg-zinc-800"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Crop
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCropping(true)}
              className="flex items-center gap-2 px-6 py-2 text-xs font-medium text-white bg-[#0070f3] rounded-full shadow-lg shadow-[#0070f3]/20 transition-all hover:bg-[#0061d5]"
            >
              <Crop className="w-3.5 h-3.5" />
              Enter Crop Mode
            </motion.button>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 relative flex items-center justify-center p-12 overflow-auto">
        <div className="relative group max-w-full max-h-full transition-all duration-500 hover:shadow-2xl rounded-xl overflow-hidden border border-black/5 bg-white p-2">
          {/* Main Image */}
          <img
            ref={imageRef}
            src={src}
            alt={fileName}
            className={cn("max-w-full max-h-full object-contain pointer-events-none rounded-lg", isCropping && "opacity-40")}
          />

          {/* Crop Overlay */}
          <AnimatePresence>
            {isCropping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 cursor-crosshair z-10 p-2"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const startX = ((e.clientX - rect.left) / rect.width) * 100
                  const startY = ((e.clientY - rect.top) / rect.height) * 100

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const currentX = ((moveEvent.clientX - rect.left) / rect.width) * 100
                    const currentY = ((moveEvent.clientY - rect.top) / rect.height) * 100

                    setCrop({
                      x: Math.min(startX, currentX),
                      y: Math.min(startY, currentY),
                      width: Math.abs(currentX - startX),
                      height: Math.abs(currentY - startY),
                    })
                  }

                  const onMouseUp = () => {
                    window.removeEventListener("mousemove", onMouseMove)
                    window.removeEventListener("mouseup", onMouseUp)
                  }

                  window.addEventListener("mousemove", onMouseMove)
                  window.addEventListener("mouseup", onMouseUp)
                }}
              >
                {/* Crop Box Area */}
                <motion.div
                  className="absolute border-2 border-[#0070f3] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20 overflow-hidden"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                    borderRadius: "4px",
                  }}
                >
                  {/* The visible part of the image */}
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={src}
                      alt="Crop selection"
                      className="absolute max-w-none rounded-lg"
                      style={{
                        width: `${10000 / crop.width}%`,
                        height: `${10000 / crop.height}%`,
                        left: `${-crop.x * (100 / crop.width)}%`,
                        top: `${-crop.y * (100 / crop.height)}%`,
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  
                  {/* Resizable handles could be added here for even better UI */}
                  <div className="absolute inset-0 border border-white/20 pointer-events-none" />
                </motion.div>

                {/* Grid Lines for crop box */}
                <div 
                  className="absolute pointer-events-none z-30 flex flex-col justify-between"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                  }}
                >
                  <div className="h-full w-full grid grid-cols-3 grid-rows-3 opacity-30">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="border border-white/40 border-dashed" />
                    ))}
                  </div>
                </div>

                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md shadow-lg pointer-events-none">
                  Drag to select area to crop
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export function EditorPane({
  selectedFile,
  editedContent,
  setEditedContent,
  isEditorFocused,
  setIsEditorFocused,
  isDirty,
  handleSave,
  scrollRef,
  monacoRef,
  editorOptions,
  files,
  setSelectedFile,
  projectId,
  fetchFiles,
  isSplitScreen,
  onExitSplit,
  role = "admin",
}: EditorPaneProps) {
  const { isSignedIn } = useUser()

  const language = React.useMemo(
    () => (selectedFile ? getLanguage(selectedFile.path) : "plaintext"),
    [selectedFile]
  )

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const [currentRoot, setCurrentRoot] = React.useState<string>("")
  const [isApplying, setIsApplying] = React.useState(false)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const sidebarRef = React.useRef<HTMLDivElement>(null)

  const [connectionStatus, setConnectionStatus] = React.useState<{
    connected: boolean
    connection: any
    type?: 'supabase' | 'neon'
  } | null>(null)
  const isReadOnly = role === "viewer"

  const [databaseCredentials, setDatabaseCredentials] =
    React.useState<DatabaseCredentials>({
      supabaseUrl: "",
      anonKey: "",
    })

  const [monacoInstance, setMonacoInstance] =
    React.useState<typeof import("monaco-editor") | null>(null)

  // 🔔 ShadCN Alert State
  const [alert, setAlert] = React.useState<{
    type: "success" | "error"
    title: string
    message: string
  } | null>(null)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      import("monaco-editor").then((monaco) => {
        setMonacoInstance(monaco)
      })
    }
  }, [])

  const isSqlFile = selectedFile?.path?.toLowerCase().endsWith(".sql")
  const isEnvFile = React.useMemo(
    () => selectedFile?.path.toLowerCase().endsWith(".env") ?? false,
    [selectedFile]
  )

  const displayContent = React.useMemo(() => {
    if (!isEnvFile || isEditorFocused) return editedContent
    return maskEnv(editedContent)
  }, [isEnvFile, isEditorFocused, editedContent])

  // Fetch connection status
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // 1. Try project-specific credentials (managed database)
        const projectRes = await fetch(`/api/projects/${projectId}/supabase`)
        const projectData = await projectRes.json()

        if (projectData && projectData.supabaseUrl && projectData.anonKey) {
          setConnectionStatus({
            connected: true,
            type: 'supabase',
            connection: {
              supabaseUrl: projectData.supabaseUrl,
              anonKey: projectData.anonKey,
              projectName: "Managed Database",
              projectRef: projectData.projectRef || projectData.supabaseUrl.split("//")[1]?.split(".")[0],
            }
          })
          setDatabaseCredentials({
            supabaseUrl: projectData.supabaseUrl,
            anonKey: projectData.anonKey,
          })
          return
        }

        const neonRes = await fetch(`/api/projects/${projectId}/neon`)
        if (neonRes.ok) {
          const neonData = await neonRes.json()
          if (neonData && neonData.databaseUrl) {
            setConnectionStatus({
              connected: true,
              type: 'neon',
              connection: {
                neonUrl: neonData.databaseUrl,
                projectName: "Managed Database (Neon)",
                projectRef: neonData.projectRef,
              }
            })
            return
          }
        }

        // 2. Fallback to global user connection
        const response = await fetch("/api/user/supabase-connection")
        const data = await response.json()
        setConnectionStatus(data)

        if (data.connected) {
          setDatabaseCredentials({
            supabaseUrl: data.connection.supabaseUrl,
            anonKey: data.connection.anonKey,
          })
        }
      } catch (error) {
        console.error("Failed to check connection:", error)
      }
    }
    if (projectId) checkConnection()
  }, [projectId])

  const handleBreadcrumbClick = (partialPath: string) => {
    if (isSidebarOpen && currentRoot === partialPath) {
      setIsSidebarOpen(false)
    } else {
      setCurrentRoot(partialPath)
      setIsSidebarOpen(true)
    }
  }

  const handleFileSelect = (file: any) => {
    setSelectedFile(file)
    setIsSidebarOpen(false)
  }

  // 🚀 Push to server (with UI Alert)
  const handleApplySql = async () => {
    if (!selectedFile || !isSqlFile) return

    setIsApplying(true)
    setAlert(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/execute-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: editedContent,
          fileName: selectedFile.path
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute SQL")
      }

      setAlert({
        type: "success",
        title: "Pushed Successfully",
        message: data.message || "Your SQL was pushed to the server.",
      })
    } catch (error: any) {
      setAlert({
        type: "error",
        title: "Push Failed",
        message: error.message || "Something went wrong.",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handleDisconnectSupabase = async () => {
    try {
      const response = await fetch("/api/user/supabase-connection", {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect")
      }

      setConnectionStatus({ connected: false, connection: null })
      setDatabaseCredentials({ supabaseUrl: "", anonKey: "" })

      setAlert({
        type: "success",
        title: "Disconnected",
        message: "Supabase connection removed.",
      })
    } catch (error: any) {
      setAlert({
        type: "error",
        title: "Error",
        message: error.message,
      })
    }
  }

  const handleConnect = (
    credentials: DatabaseCredentials,
    projectRef: string,
    projectName: string,
    accessToken: string
  ) => {
    setDatabaseCredentials(credentials)

    setConnectionStatus({
      connected: true,
      connection: {
        projectRef,
        projectName,
        supabaseUrl: credentials.supabaseUrl,
        anonKey: credentials.anonKey,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    })

    setAlert({
      type: "success",
      title: "Connected",
      message: "Supabase connected successfully.",
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {selectedFile ? (
        <>
          {/* Header */}
          <div className="px-3 py-2 bg-white border-b border-black/10 flex items-center justify-between">
            <div className="flex items-center text-xs text-black font-mono truncate">
              {selectedFile.path
                .split("/")
                .filter(Boolean)
                .map((part, index, arr) => {
                  const partialPath = arr.slice(0, index + 1).join("/")
                  return (
                    <React.Fragment key={partialPath}>
                      {index > 0 && (
                        <ChevronRight className="w-4 h-4 mx-0.5 text-gray-400" />
                      )}
                      <button
                        onClick={() => handleBreadcrumbClick(partialPath)}
                        className="focus:outline-none cursor-pointer hover:underline"
                      >
                        {part}
                      </button>
                    </React.Fragment>
                  )
                })}
            </div>

            <div className="flex items-center gap-2">
              {isSplitScreen && onExitSplit && (
                <button
                  onClick={onExitSplit}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-black rounded-lg cursor-pointer transition-colors"
                >
                  <AppWindow className="w-3.5 h-3.5" />
                  Exit split
                </button>
              )}
              {isDirty && !isReadOnly && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#2b2525] hover:bg-black text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              )}
              {isSqlFile && !isReadOnly && (
                <button
                  onClick={handleApplySql}
                  disabled={isApplying || !connectionStatus?.connected}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors",
                    (isApplying || !connectionStatus?.connected)
                      ? "opacity-70 cursor-not-allowed bg-gray-100"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  {isApplying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {isApplying ? "Pushing..." : "Push to server"}
                </button>
              )}
            </div>
          </div>

          {/* Editor */}
          <div ref={scrollRef} className="flex-1 overflow-hidden">
            {language === "image" ? (
              <ImageEditor
                src={selectedFile.imageData || selectedFile.content}
                fileName={selectedFile.path.split("/").pop() || "Image"}
                onSave={(newContent, newImageData) => {
                  setEditedContent(newContent, newImageData)
                  // Trigger save with new data
                  handleSave()
                }}
              />
            ) : (
              <Editor
                key={selectedFile.path}
                height="100%"
                theme="light"
                language={language}
                value={displayContent}
                onMount={(editor, monaco) => {
                  monacoRef.current = editor
                  // Disable TypeScript/JavaScript validation to remove red squiggly lines
                  if (monaco.languages.typescript) {
                    const diagnosticOptions = {
                      noSemanticValidation: true,
                      noSyntaxValidation: true,
                    }
                    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagnosticOptions)
                    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagnosticOptions)

                    // Configure JSX/TSX support
                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                      target: monaco.languages.typescript.ScriptTarget.Latest,
                      allowNonTsExtensions: true,
                      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                      module: monaco.languages.typescript.ModuleKind.CommonJS,
                      noEmit: true,
                      esModuleInterop: true,
                      jsx: monaco.languages.typescript.JsxEmit.React,
                      reactNamespace: "React",
                      allowJs: true,
                      typeRoots: ["node_modules/@types"],
                    })
                  }

                  editor.onDidFocusEditorWidget(() => setIsEditorFocused(true))
                  editor.onDidBlurEditorWidget(() => setIsEditorFocused(false))
                }}
                onChange={(value) => setEditedContent(value || "")}
                options={{
                  ...editorOptions,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  readOnly: isReadOnly,
                  showUnused: false, // Disable the "transparent" fading for unused variables
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          Select a file to view
        </div>
      )}

      {/* 🔔 ShadCN Alert (Bottom Right, 3px from bottom) */}
      {alert && (
        <div className="fixed bottom-2 right-0 w-[10%] z-50 px-4 pb-[3px]">
          <Alert className="w-full flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <AlertTitle className="font-semibold leading-tight">
                {alert.title}
              </AlertTitle>
              <AlertDescription className="leading-snug break-words">
                {alert.message}
              </AlertDescription>
            </div>

            <button
              onClick={() => setAlert(null)}
              className="ml-3 mt-1 hover:opacity-70 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </Alert>
        </div>
      )}
      {isSidebarOpen && (
        <div ref={sidebarRef} className="bg-white shadow-xl absolute ml-3 mt-5 rounded-lg border z-10 w-64 overflow-y-scroll max-h-56">
          <FileSidebar
            files={files}
            onFileSelect={handleFileSelect}
            selectedPath={selectedFile?.path ?? null}
            projectId={projectId}
            onFilesChange={fetchFiles}
            currentRoot={currentRoot}
          />
        </div>
      )}

      <SupabaseConnectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        credentialsSaved={!!connectionStatus?.connected}
        databaseCredentials={databaseCredentials}
        selectedProjectRef={connectionStatus?.connection?.projectRef || ""}
        projects={[
          {
            ref: connectionStatus?.connection?.projectRef || "",
            name: connectionStatus?.connection?.projectName || "",
          },
        ]}
        onDisconnect={handleDisconnectSupabase}
        onConnect={handleConnect}
        isAuthenticated={!!isSignedIn}
      />
    </div>
  )
}