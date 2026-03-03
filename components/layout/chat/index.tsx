"use client"
import type React from "react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertCircle, Palette, StarsIcon, Crown, Lock, Database, ArrowUp, AudioWaveform, AudioLinesIcon, Globe, Rocket } from "lucide-react"
import {
  Loader,
  X,
  Plus,
  Circle,
  MoreHorizontal,
  ArrowLeft,
  ChevronDown,
  FileText,
  Loader2,
  Download,
  Copy,
  Edit,
  Check,
  Shield,
  List,
  Square,
  CheckCircle2,
  StopCircle,
  Mail,
  Bug,
  Scan,
  Terminal
} from "lucide-react"
import { Link1Icon } from "@radix-ui/react-icons"
import type { Message } from "@/config/schema"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Editor } from "@monaco-editor/react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SupabaseConnectModal } from "@/components/models/supabase-connect-modal"
import { getMcpConnections } from "@/app/actions/mcp"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
interface ChatInputProps {
  isAuthenticated: boolean
  projectId?: string
  onNewMessage?: (message: Message) => void
  placeholder?: string
  initialModel?: string
  connected?: boolean
  onCloseIdeas?: () => void
  isAutomated?: boolean
  previewError?: {
    message: string
    file?: string
    line?: string
  } | null
  onDismissError?: () => void
  onOpenDatabase?: () => void
  externalIsLoading?: boolean
  onStop?: () => void
  messages?: Message[]
}
interface BalanceData {
  subscriptionTier: string
  balance?: number
  secondsUntilNextRegen?: number
}
export interface ChatInputRef {
  insertPrompt: (prompt: string) => void
}
interface ModelOption {
  id: string
  label: string
  isPremium: boolean
  iconUrl: string
}
type DesignConfig = {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  buttonStyle: "rounded" | "square" | "pill"
  borderStyle: "solid" | "dashed" | "none"
}
const designSystems = [
  { name: "Base", previewColor: "bg-black" },
  { name: "Mono", previewColor: "bg-gray-500" },
  { name: "Cosmic Night", previewColor: "bg-purple-900" },
  { name: "Soft Pop", previewColor: "bg-green-500" },
  { name: "Neo Brutalism", previewColor: "bg-yellow-500" },
  { name: "Vintage Paper", previewColor: "bg-amber-300" },
  { name: "Modern Minimal", previewColor: "bg-blue-200" },
  { name: "Bubblegum", previewColor: "bg-pink-400" },
]
const designPresets: Record<string, DesignConfig> = {
  Base: {
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonStyle: "rounded",
    borderStyle: "solid",
  },
  Mono: {
    primaryColor: "#333333",
    secondaryColor: "#666666",
    backgroundColor: "#f0f0f0",
    textColor: "#000000",
    buttonStyle: "square",
    borderStyle: "none",
  },
  "Cosmic Night": {
    primaryColor: "#4b0082",
    secondaryColor: "#ffffff",
    backgroundColor: "#000000",
    textColor: "#ffffff",
    buttonStyle: "rounded",
    borderStyle: "dashed",
  },
  "Soft Pop": {
    primaryColor: "#00ff00",
    secondaryColor: "#ff4500",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonStyle: "pill",
    borderStyle: "solid",
  },
  "Neo Brutalism": {
    primaryColor: "#ffff00",
    secondaryColor: "#ff0000",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    buttonStyle: "square",
    borderStyle: "solid",
  },
  "Vintage Paper": {
    primaryColor: "#8b4513",
    secondaryColor: "#f4e8d4",
    backgroundColor: "#f4e8d4",
    textColor: "#4b2e0b",
    buttonStyle: "rounded",
    borderStyle: "dashed",
  },
  "Modern Minimal": {
    primaryColor: "#007bff",
    secondaryColor: "#6c757d",
    backgroundColor: "#ffffff",
    textColor: "#212529",
    buttonStyle: "square",
    borderStyle: "none",
  },
  Bubblegum: {
    primaryColor: "#ff69b4",
    secondaryColor: "#ffb6c1",
    backgroundColor: "#fff0f5",
    textColor: "#c71585",
    buttonStyle: "pill",
    borderStyle: "solid",
  },
}

const EMAIL_TEMPLATES = [
  { id: "confirmation", label: "Confirm Sign Up" },
  { id: "invite", label: "Invite User" },
  { id: "magic_link", label: "Magic Link" },
  { id: "email_change", label: "Change Email" },
  { id: "recovery", label: "Reset Password" },
  { id: "reauthentication", label: "Reauthentication" },
]

const MODEL_OPTIONS: ModelOption[] = [
  { id: "gemini", label: "Gemini 3.1 Pro", isPremium: false, iconUrl: "/icons/gemini.png" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", isPremium: false, iconUrl: "/icons/claude.png" },
  { id: "claude-opus-4.6", label: "Claude Opus 4.6", isPremium: true, iconUrl: "/icons/claude.png" },
  { id: "claude-haiku-4.5", label: "Claude Haiku 4.5", isPremium: true, iconUrl: "/icons/claude.png" },
  // { id: "claude-opus-4.5", label: "Claude Opus 4.5", isPremium: true, iconUrl: "/icons/claude.png" },
  // { id: "claude-sonnet-4.5", label: "Claude Sonnet 4.5", isPremium: true, iconUrl: "/icons/claude.png" },
  // { id: "claude-opus-4", label: "Claude Opus 4", isPremium: false, iconUrl: "/icons/claude.png" },
  // { id: "gpt-5.2", label: "GPT-5.2", isPremium: false, iconUrl: "/icons/openai.png" },
  // { id: "llama3:8b", label: "Llama 3 8B (Ollama)", isPremium: true, iconUrl: "/icons/ollama.png" },
  // { id: "gpt-5.1-codex", label: "GPT-5.1 Codex Max", isPremium: false, iconUrl: "/icons/openai.png" },

  // { id: "glm-4.7-flash", label: "GLM 4.7 Flash", isPremium: false, iconUrl: "/icons/zAI.png" },
  // { id: "glm-4.5-flash", label: "GLM 4.5 Flash", isPremium: false, iconUrl: "/icons/zAI.png" },
]

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
interface AttachedFile {
  id: string
  name: string
  type: string
  size: number
  content: string
  preview?: string | null
  uploadStatus: "uploading" | "complete"
  displayName?: string
}
interface PastedContent {
  id: string
  content: string
}
interface FilePreviewButtonProps {
  file: AttachedFile
  onClick: () => void
  onRemove: () => void
}
const FilePreviewButton: React.FC<FilePreviewButtonProps> = ({ file, onClick, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview
  return (
    <div className="relative group flex items-center justify-between w-[150px] px-2 rounded-sm border border-[#e4e4e4a8] bg-white hover:bg-white transition-all cursor-pointer">
      <div className="flex items-center gap-3 flex-1" onClick={onClick}>
        {isImage ? (
          <img src={file.preview! || "/placeholder.svg"} alt={file.name} className="w-5 h-5 object-cover rounded" />
        ) : (
          <div className="p-2 bg-gray-200 rounded">
            <FileText className="w-3 h-3 text-gray-600" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)} • {file.type.split("/")[1] || "text"}
          </p>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="
          p-1
          ml-[-12px]
          bg-gray-100h-10
          rounded text-black
          cursor-pointer
          transition-all
          opacity-0
          group-hover:opacity-50
        "
      >
        <X className="w-4 h-4" />
      </button>
      {file.uploadStatus === "uploading" && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
          <Loader className="w-4 h-4 text-gray-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
interface PastedContentButtonProps {
  content: PastedContent
  onClick: () => void
  onRemove: () => void
}
const PastedContentButton: React.FC<PastedContentButtonProps> = ({ content, onClick, onRemove }) => {
  return (
    <div className="relative group flex items-center justify-between w-[132px] px-2 rounded-sm border border-[#e4e4e4a8] bg-white hover:bg-white transition-all cursor-pointer">
      <div className="flex items-center gap-3 flex-1" onClick={onClick}>
        <div className="">
          <FileText className="w-3 h-3 text-gray-600" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs text-gray-500 truncate">{content.content.substring(0, 13)}...</p>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="
          p-1
          ml-[-7px]
          bg-gray-100h-10
          rounded text-black
          cursor-pointer
          transition-all
          opacity-0
          group-hover:opacity-50
        "
      >
        <X className="w-4 h-4" />
      </button>
      {content.content === "uploading" && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}
    </div>
  )
}
interface DatabaseCredentials {
  supabaseUrl: string
  anonKey: string
}
interface SupabaseProject {
  ref: string
  name: string
  organization_name?: string | null
  region?: string | null
}
const ChatInputImpl = forwardRef<ChatInputRef, ChatInputProps>(function ChatInputImpl(
  {
    isAuthenticated,
    projectId,
    onNewMessage,
    placeholder = "Ask anything... to get started",
    initialModel = "gemini",
    connected = false,
    onCloseIdeas,
    isAutomated = false,
    previewError,
    onDismissError,
    onOpenDatabase,
    externalIsLoading = false,
    onStop,
    messages = [],
  },
  ref,
) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const effectiveIsLoading = isLoading || externalIsLoading

  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistant = [...messages].reverse().find(m => m.role === "assistant")
      if (lastAssistant) {
        parseTasksFromContent(lastAssistant.content)
      }
    }
  }, [messages])
  const [isImproving, setIsImproving] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>("")
  const [imageSize, setImageSize] = useState<number>(0)
  const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([])
  const [pastedContents, setPastedContents] = useState<PastedContent[]>([])
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isDiscussMode, setIsDiscussMode] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{
    id: string
    name: string
    content: string
    type: string
    isPasted: boolean
  } | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(initialModel)
  const [selectedFramework, setSelectedFramework] = useState<string>("vite")
  const [showFrameworkHover, setShowFrameworkHover] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuMode, setMenuMode] = useState<"main" | "design">("main")
  const [showDatabaseHover, setShowDatabaseHover] = useState(false)
  const [showModelHover, setShowModelHover] = useState(false)
  const [isFalborDb, setIsFalborDb] = useState(true)
  const [showDesignModal, setShowDesignModal] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null)
  const [designConfig, setDesignConfig] = useState<DesignConfig | null>(null)
  const [tempConfig, setTempConfig] = useState<DesignConfig>(designPresets["Base"])
  const [showPremiumAlert, setShowPremiumAlert] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showDatabaseModal, setShowDatabaseModal] = useState(false)
  const [databaseCredentials, setDatabaseCredentials] = useState<DatabaseCredentials>({ supabaseUrl: "", anonKey: "" })
  const [isSavingCredentials, setIsSavingCredentials] = useState(false)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState<{
    userMessage: string
    selectedImage: { data: string; mimeType: string } | null
    isDiscussMode: boolean
    selectedModel: string
    isAutomated: boolean
    isFalborDb: boolean
    selectedFramework?: string
  } | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [accessToken, setAccessToken] = useState<string>("")
  const [isFetchingProjects, setIsFetchingProjects] = useState(false)
  const [projects, setProjects] = useState<SupabaseProject[]>([])
  const [selectedProjectRef, setSelectedProjectRef] = useState<string>("")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastAssistantContent, setLastAssistantContent] = useState<string>("")
  const [pendingMigrations, setPendingMigrations] = useState<string[]>([])
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [tempAccessToken, setTempAccessToken] = useState<string>("")
  const [isFetchingApiKeys, setIsFetchingApiKeys] = useState(false)
  const [mcpConnections, setMcpConnections] = useState<any[]>([])
  const [mentionMenu, setMentionMenu] = useState<{ isOpen: boolean; filter: string; position: { top: number; left: number }; startIndex: number }>({
    isOpen: false,
    filter: "",
    position: { top: 0, left: 0 },
    startIndex: -1
  })
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([])
  const [mentionTab, setMentionTab] = useState<"mcps" | "emails">("mcps")
  const [isLoadingConnection, setIsLoadingConnection] = useState(true)
  const [showTaskPanel, setShowTaskPanel] = useState(true)
  const [tasks, setTasks] = useState<{ text: string; status: "success" | "loading" | "pending" }[]>([])
  const tasksKey = projectId ? `chat-tasks-${projectId}` : "chat-tasks-global"
  const [showUrlHover, setShowUrlHover] = useState(false)
  const [captureUrlInput, setCaptureUrlInput] = useState("")
  const [showErrorPanel, setShowErrorPanel] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerLogs, setScannerLogs] = useState<{ text: string; status: "success" | "loading" | "pending" }[]>([])

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      abortControllerRef.current = null
    }
    if (onStop) {
      onStop()
    }
  }

  // Auto-open and auto-close logic for Tasks panel
  useEffect(() => {
    // If we're loading and tasks have appeared, ensure panel is open
    if (effectiveIsLoading && tasks.length > 0) {
      setShowTaskPanel(true)
    }

    // Auto-close when everything is done
    if (!effectiveIsLoading && tasks.length > 0 && tasks.every((t) => t.status === "success")) {
      const timer = setTimeout(() => {
        setShowTaskPanel(false)
      }, 2500) // 2.5s delay after completion
      return () => clearTimeout(timer)
    }
  }, [effectiveIsLoading, tasks])

  const parseScannerLogsFromContent = (content: string) => {
    const logs: { text: string; status: "success" | "loading" | "pending" }[] = []

    const scanMatch = content.match(/<Scan>([\s\S]*?)<\/Scan>/i)
    if (scanMatch) {
      logs.push({ text: `Scan analysis complete: ${scanMatch[1].trim().slice(0, 80)}${scanMatch[1].length > 80 ? "..." : ""}`, status: "success" })
    } else if (content.toLowerCase().includes("<scan>")) {
      logs.push({ text: "Scanning files for issues...", status: "loading" })
    }

    const searchMatch = content.match(/<InternetSearch>([\s\S]*?)<\/InternetSearch>/i)
    if (searchMatch) {
      logs.push({ text: `Search match found: ${searchMatch[1].trim().slice(0, 80)}`, status: "success" })
    } else if (content.toLowerCase().includes("<internetsearch>")) {
      logs.push({ text: "Searching internet for solutions...", status: "loading" })
    }

    const verifyMatch = content.match(/<VerifyingSolution>([\s\S]*?)<\/VerifyingSolution>/i)
    if (verifyMatch) {
      logs.push({ text: `Solution verified: ${verifyMatch[1].trim().slice(0, 80)}`, status: "success" })
    } else if (content.toLowerCase().includes("<verifyingsolution>")) {
      logs.push({ text: "Verifying fix accuracy...", status: "loading" })
    }

    const termMatch = content.match(/<Terminal>([\s\S]*?)<\/Terminal>/i)
    if (termMatch) {
      logs.push({ text: `Executing command: ${termMatch[1].trim()}`, status: "success" })
    } else if (content.toLowerCase().includes("<terminal>")) {
      logs.push({ text: "Preparing terminal command...", status: "loading" })
    }

    if (logs.length > 0) {
      setScannerLogs(logs)
    }
  }

  const handleFixError = async (online = false) => {
    if (!previewError) return
    const errorMsg = previewError.message
    const errorFile = previewError.file || "unknown"

    if (online) {
      setScannerLogs([{ text: "Initializing online deep scan...", status: "loading" }])
      setIsScanning(true)
      const scanPrompt = `[CRITICAL_ERROR_FIX]
ERROR: "${errorMsg}"
FILE: ${errorFile}

Please perform a deep ONLINE SCAN to resolve this issue:
1. <Scan> pinpoint the error source.
2. <InternetSearch> find the most relevant, modern fix online.
3. <VerifyingSolution> verify the fix matches our React/Vite stack.
4. <Terminal> install any missing libraries if needed.
5. Apply the fix to ONLY the affected file.
6. Verify the result.`
      handleSubmit(undefined, scanPrompt)
    } else {
      const fixPrompt = `I'm getting this error in ${errorFile}: "${errorMsg}". Please fix it by updating ONLY the relevant file.`
      handleSubmit(undefined, fixPrompt)
    }
    setShowErrorPanel(false)
  }

  const parseTasksFromContent = (content: string) => {
    const tasksRegex = /<Tasks>([\s\S]*?)(?:<\/Tasks>|$)/gi
    let match
    let lastMatch = null
    while ((match = tasksRegex.exec(content)) !== null) {
      lastMatch = match
    }
    if (lastMatch && lastMatch[1]) {
      const lines = lastMatch[1].trim().split("\n")
      const tasksList = lines.map(line => {
        if (!line.trim()) return null
        const successMatch = line.match(/^(.+?)\s*[✓✔]\s*$/)
        const loadingMatch = line.match(/^(.+?)\s*[⏳⌛]\s*$/)
        if (successMatch) return { text: successMatch[1].trim(), status: "success" as const }
        if (loadingMatch) return { text: loadingMatch[1].trim(), status: "loading" as const }
        return { text: line.trim(), status: "pending" as const }
      }).filter(Boolean) as { text: string; status: "success" | "loading" | "pending" }[]

      if (tasksList.length > 0) {
        setTasks(tasksList)
      }
    }
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<any>(null)
  const lastTranscriptRef = useRef("")
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const draftKey = projectId ? `chat-draft-${projectId}` : "chat-draft-global"
  const filesKey = projectId ? `chat-files-${projectId}` : "chat-files-global"
  const pastedKey = projectId ? `chat-pasted-${projectId}` : "chat-pasted-global"
  const designKey = "chat-design-config"
  const modelKey = projectId ? `chat-selected-model-${projectId}` : "chat-selected-model-global"
  const frameworkKey = "chat-selected-framework-global"
  // Load saved connection from server on mount
  useEffect(() => {
    const loadUserConnection = async () => {
      if (!isAuthenticated) {
        setIsLoadingConnection(false)
        return
      }
      try {
        const res = await fetch("/api/user/supabase-connection")
        if (res.ok) {
          const data = await res.json()
          if (data.connected) {
            setCredentialsSaved(true)
            setSelectedProjectRef(data.selectedProjectRef || "")
            if (data.supabaseUrl && data.anonKey) {
              setDatabaseCredentials({
                supabaseUrl: data.supabaseUrl,
                anonKey: data.anonKey,
              })
            }
            // If we have a project ref but need to show project name
            if (data.selectedProjectName) {
              setProjects([{ ref: data.selectedProjectRef, name: data.selectedProjectName }])
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user connection:", err)
      } finally {
        setIsLoadingConnection(false)
      }
    }
    loadUserConnection()

    const loadMcpConnections = async () => {
      if (!isAuthenticated) return
      const data = await getMcpConnections()
      setMcpConnections(data)
    }
    loadMcpConnections()
  }, [isAuthenticated])
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft && savedDraft.trim()) {
      setMessage(savedDraft)
    }
    const savedFiles = localStorage.getItem(filesKey)
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles))
    }
    const savedPasted = localStorage.getItem(pastedKey)
    if (savedPasted) {
      setPastedContents(JSON.parse(savedPasted))
    }
  }, [draftKey, filesKey, pastedKey])
  useEffect(() => {
    const savedDesign = localStorage.getItem(designKey)
    if (savedDesign) {
      const parsed = JSON.parse(savedDesign)
      setSelectedDesign(parsed.name)
      setDesignConfig(parsed.config)
    }
  }, [])
  useEffect(() => {
    if (selectedDesign && designConfig) {
      localStorage.setItem(designKey, JSON.stringify({ name: selectedDesign, config: designConfig }))
    }
  }, [selectedDesign, designConfig])
  useEffect(() => {
    const savedModel = localStorage.getItem(modelKey)
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem(modelKey, selectedModel)
  }, [selectedModel])
  useEffect(() => {
    const savedFramework = localStorage.getItem(frameworkKey)
    if (savedFramework && ["vite", "nextjs", "vue"].includes(savedFramework)) {
      setSelectedFramework(savedFramework)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem(frameworkKey, selectedFramework)
  }, [selectedFramework])
  useEffect(() => {
    localStorage.setItem(filesKey, JSON.stringify(uploadedFiles))
  }, [uploadedFiles, filesKey])
  useEffect(() => {
    localStorage.setItem(pastedKey, JSON.stringify(pastedContents))
  }, [pastedContents, pastedKey])
  useEffect(() => {
    const savedTasks = localStorage.getItem(tasksKey)
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }, [tasksKey])
  useEffect(() => {
    localStorage.setItem(tasksKey, JSON.stringify(tasks))
  }, [tasks, tasksKey])
  const createProject = async (withCredentials: boolean) => {
    if (!pendingSubmitData) return
    setIsLoading(true)

    let supabaseUrl = ""
    let anonKey = ""
    let serviceRoleKey = ""
    let projectRef = ""
    let dbPassword = ""

    try {
      // Handle Falbor Database Provisioning (Synchronous wait for Keys)
      if (pendingSubmitData.isFalborDb) {
        setIsProvisioning(true)
        try {
          const provRes = await fetch("/api/supabase/provision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: `project-${Math.random().toString(36).slice(2, 10)}` })
          })

          if (!provRes.ok) {
            const err = await provRes.json().catch(() => ({}))
            throw new Error(err.error || "Failed to provision database")
          }

          const creds = await provRes.json()
          supabaseUrl = creds.supabaseUrl
          anonKey = creds.anonKey
          serviceRoleKey = creds.serviceRoleKey
          projectRef = creds.projectRef
          dbPassword = creds.dbPassword
        } finally {
          setIsProvisioning(false)
        }
      }

      if (!pendingSubmitData.isAutomated) {
        const deductRes = await fetch("/api/user/credits", {
          method: "POST",
        })
        if (!deductRes.ok) {
          const errData = await deductRes.json().catch(() => ({}))
          if (deductRes.status === 401) {
            alert("Please sign in to continue.")
            return
          }
          if (deductRes.status === 402) {
            alert("Insufficient balance. Please wait for monthly refill or upgrade.")
            return
          }
          alert(errData.error || "Failed to process your request. Please try again.")
          return
        }
        await fetchBalance()
      }
      localStorage.removeItem(draftKey)
      localStorage.removeItem(filesKey)
      localStorage.removeItem(pastedKey)
      setMessage("")
      setSelectedImage(null)
      setImagePreview(null)
      setImageName("")
      setImageSize(0)
      setUploadedFiles([])
      setPastedContents([])

      const body: any = {
        message: pendingSubmitData.userMessage,
        imageData: pendingSubmitData.selectedImage,
        uploadedFiles: null,
        discussMode: pendingSubmitData.isDiscussMode,
        isAutomated: pendingSubmitData.isAutomated,
        selectedModel: pendingSubmitData.selectedModel,
        isFalborDb: pendingSubmitData.isFalborDb,
        selectedFramework: pendingSubmitData.selectedFramework,
      }

      // Inject credentials directly into the project creation (so they are saved immediately)
      if (pendingSubmitData.isFalborDb) {
        body.supabaseUrl = supabaseUrl
        body.anonKey = anonKey
        body.serviceRoleKey = serviceRoleKey
        body.projectRef = projectRef
        body.dbPassword = dbPassword

        // Also inject into the first message content so it's visible in history
        body.message += `\n\n## Database Connection (Managed by Falbor)\nDatabase provisioned successfully.\nVITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`
      } else if (withCredentials || credentialsSaved) {
        body.supabaseUrl = databaseCredentials.supabaseUrl
        body.anonKey = databaseCredentials.anonKey
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`)
      }
      const { projectId: newId } = await res.json()

      // Transfer tasks to the new project key
      const globalTasks = localStorage.getItem("chat-tasks-global")
      if (globalTasks) {
        localStorage.setItem(`chat-tasks-${newId}`, globalTasks)
      }

      setPendingSubmitData(null)
      if (typeof window !== "undefined" && !window.crossOriginIsolated) {
        window.location.href = `/chat/${newId}`
      } else {
        router.push(`/chat/${newId}`)
      }
    } catch (err) {
      console.error("Project creation failed:", err)
      alert(err instanceof Error ? err.message : "Failed to create project. Please try again.")
    } finally {
      setIsLoading(false)
      setIsProvisioning(false)
    }
  }
  const handleSupabaseOAuthConnect = (
    credentials: DatabaseCredentials,
    projectRef: string,
    projectName: string,
    token: string,
  ) => {
    setDatabaseCredentials(credentials)
    setSelectedProjectRef(projectRef)
    setAccessToken(token)
    setCredentialsSaved(true)
    if (projectName) {
      setProjects([{ ref: projectRef, name: projectName }])
    }
  }

  const handleDisconnectDatabase = async () => {
    try {
      await fetch("/api/user/supabase-connection", {
        method: "DELETE",
      })
      setCredentialsSaved(false)
      setAccessToken("")
      setProjects([])
      setSelectedProjectRef("")
      setDatabaseCredentials({ supabaseUrl: "", anonKey: "" })
    } catch (err) {
      console.error("Failed to disconnect:", err)
    }
  }
  const drawVisualizer = () => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) {
      if (animationRef.current) {
        animationRef.current = requestAnimationFrame(drawVisualizer)
      }
      return
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const barWidth = (canvas.width / bufferLength) * 2.5
    let barHeight
    let x = 0
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height
      ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2)
      x += barWidth + 1
    }
    animationRef.current = requestAnimationFrame(drawVisualizer)
  }
  useEffect(() => {
    if (isListening && canvasRef.current) {
      const canvas = canvasRef.current
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      drawVisualizer()
    } else if (!isListening && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [isListening])
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  const fetchBalance = async () => {
    if (!user?.id || !isLoaded) return
    try {
      const res = await fetch("/api/user/credits")
      if (res.ok) {
        const data: BalanceData = await res.json()
        setBalanceData(data)
        if (data.secondsUntilNextRegen) {
          setTimeLeft(data.secondsUntilNextRegen)
        }
      } else {
        console.error(`Failed to fetch balance: ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err)
    }
  }
  useEffect(() => {
    fetchBalance()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchBalance()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user?.id, isLoaded])
  const refetchBalance = async () => {
    if (!user?.id) return
    await fetchBalance()
  }
  const handleAttachedFiles = (files: File[], isPasted = false) => {
    const totalAttachments = uploadedFiles.length + pastedContents.length + files.length
    if (totalAttachments > 10) {
      alert("Maximum of 10 attachments allowed.")
      return
    }
    files.forEach((file) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2)
      const tempFile: AttachedFile = {
        id,
        name: file.name,
        type: file.type || "text/plain",
        size: file.size,
        content: "",
        uploadStatus: "uploading",
        displayName: file.name,
      }
      setUploadedFiles((prev) => [...prev, tempFile])
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setTimeout(() => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, content, preview: file.type.startsWith("image/") ? content : null, uploadStatus: "complete" }
                : f,
            ),
          )
        }, 1000)
      }
      reader.readAsDataURL(file)
    })
  }
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleAttachedFiles(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const pastedFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile()
        if (file) pastedFiles.push(file)
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault()
      handleAttachedFiles(pastedFiles, true)
      return
    }
    const text = e.clipboardData.getData("text")
    if (text.length > 500) {
      e.preventDefault()
      const totalAttachments = uploadedFiles.length + pastedContents.length + 1
      if (totalAttachments > 10) {
        alert("Maximum of 10 attachments allowed.")
        return
      }
      const id = Date.now().toString()
      setPastedContents((prev) => [...prev, { id, content: text }])
    }
  }
  const handleImprovePrompt = async () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true)
      return
    }
    if (!message.trim() || isImproving) return
    setIsImproving(true)
    let liveText = ""
    try {
      const body = projectId ? { projectId, prompt: message } : { prompt: message }
      const res = await fetch("/api/chat/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error")
        throw new Error(`Failed to improve prompt: ${res.status} ${errorText}`)
      }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No stream")
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(Boolean)
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                liveText += data.text
                setMessage(liveText)
              }
              if (data.done) {
                setMessage(data.improvedPrompt)
              }
            } catch { }
          }
        }
      }
    } catch (err) {
      console.error("Prompt improvement failed:", err)
      alert(err instanceof Error ? err.message : "Failed to improve prompt. Please try again.")
    } finally {
      setIsImproving(false)
    }
  }
  const stopVoiceInput = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
    recognitionRef.current = null
    lastTranscriptRef.current = ""
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }
  const handleVoiceToggle = async () => {
    if (isListening) {
      stopVoiceInput()
      return
    }
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256
      source.connect(analyser)
      const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognitionConstructor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"
      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript
        }
        const added = transcript.substring(lastTranscriptRef.current.length)
        if (added) {
          setMessage((prev) => {
            const newMessage = prev + added
            localStorage.setItem(draftKey, newMessage)
            return newMessage
          })
          setTimeout(() => {
            textareaRef.current?.focus()
            if (textareaRef.current) {
              textareaRef.current.scrollTop = textareaRef.current.scrollHeight
            }
          }, 0)
        }
        lastTranscriptRef.current = transcript
      }
      recognition.onerror = (event: any) => {
        console.error("Voice recognition error:", event.error)
        stopVoiceInput()
      }
      recognition.onend = () => {
        stopVoiceInput()
      }
      recognition.start()
      recognitionRef.current = recognition
      lastTranscriptRef.current = ""
      setIsListening(true)
    } catch (err) {
      console.error("Failed to start voice recognition:", err)
      alert("Could not access microphone. Please check permissions and try again.")
    }
  }
  useEffect(() => {
    if (showDesignModal) {
      setTempConfig(designConfig ?? designPresets["Base"])
    }
  }, [showDesignModal, designConfig])
  const handleModelSelect = async (modelId: string) => {
    const model = MODEL_OPTIONS.find((m) => m.id === modelId)
    if (!model) return
    const hasSubscription = balanceData?.subscriptionTier !== "none"
    if (model.isPremium && !hasSubscription) {
      setShowPremiumAlert(true)
      return
    }

    setSelectedModel(modelId)
    setShowModelDropdown(false)

    // Persist to DB if we are in a project
    if (projectId) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedModel: modelId })
        })
        if (!res.ok) {
          console.error("Failed to update project model in DB")
        }
      } catch (err) {
        console.error("Error updating project model:", err)
      }
    }
  }
  const parseAndSetPendingMigrations = (content: string) => {
    const migrations: string[] = []
    const regex = /```sql\s*file="supabase\/migrations\/[^"]+"\s*([\s\S]*?)```/g
    let match
    while ((match = regex.exec(content)) !== null) {
      migrations.push(match[1].trim())
    }
    setPendingMigrations(migrations)
  }
  const handleExecuteMigrations = async () => {
    if (!tempAccessToken) return
    setIsSavingCredentials(true)
    try {
      for (const sql of pendingMigrations) {
        const res = await fetch(`/api/projects/${projectId}/execute-sql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql, accessToken: tempAccessToken }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to execute migration")
        }
      }
      alert("Migrations applied successfully!")
      setPendingMigrations([])
      setShowTokenModal(false)
      setTempAccessToken("")
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsSavingCredentials(false)
    }
  }
  const handleSubmit = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault()
    if (isLoading) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      return
    }
    if (isListening) {
      stopVoiceInput()
      return
    }
    const submitText = textOverride || message
    if (!submitText.trim() && uploadedFiles.length === 0 && pastedContents.length === 0 && !designConfig && !selectedImage)
      return
    if (!isAuthenticated) {
      setShowLoginDialog(true)
      return
    }
    const selectedModelOption = MODEL_OPTIONS.find((m) => m.id === selectedModel)
    const hasSubscription = balanceData?.subscriptionTier !== "none"
    if (selectedModelOption?.isPremium && !hasSubscription) {
      setShowPremiumAlert(true)
      return
    }
    let userMessage = submitText.trim()
    if (uploadedFiles.length > 0) {
      const fileSections = uploadedFiles
        .map(
          (file) =>
            `\n\n## File: ${file.name}\n\`\`\`${file.type.split("/")[1] || "text/plain"}\n${file.content}\n\`\`\``,
        )
        .join("")
      userMessage = userMessage ? `${userMessage}${fileSections}` : fileSections.slice(1)
    }
    if (pastedContents.length > 0) {
      const pastedSections = pastedContents.map((p) => `\n\n## Pasted Text\n\`\`\`text\n${p.content}\n\`\`\``).join("")
      userMessage += pastedSections
    }
    // Append database before design to ensure design is the last section
    if (credentialsSaved && databaseCredentials.supabaseUrl && databaseCredentials.anonKey) {
      userMessage += `\n\n## Database Connection\nVITE_SUPABASE_URL=${databaseCredentials.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${databaseCredentials.anonKey}`
    }
    if (designConfig && !message.includes("Capture from URL:")) {
      userMessage += `\n\n## Design System: ${selectedDesign || "Custom"}\n${JSON.stringify(designConfig, null, 2)}`
    }
    if (!projectId) {
      setPendingSubmitData({
        userMessage,
        selectedImage: selectedImage ? { ...selectedImage } : null,
        isDiscussMode,
        selectedModel,
        isAutomated,
        isFalborDb,
        selectedFramework,
      })

      // Skip confirmation if database is already connected or using Falbor DB
      if (credentialsSaved || isFalborDb) {
        await createProject(isFalborDb)
      } else {
        setShowConfirmation(true)
      }
      return
    }
    setIsLoading(true)
    try {
      if (!isAutomated) {
        const deductRes = await fetch("/api/user/credits", {
          method: "POST",
        })
        if (!deductRes.ok) {
          const errData = await deductRes.json().catch(() => ({}))
          if (deductRes.status === 401) {
            alert("Please sign in to continue.")
            return
          }
          if (deductRes.status === 402) {
            alert("Insufficient balance. Please wait for regeneration or upgrade.")
            return
          }
          alert(errData.error || "Failed to process your request. Please try again.")
          return
        }
        await refetchBalance()
      }
      localStorage.removeItem(draftKey)
      localStorage.removeItem(filesKey)
      localStorage.removeItem(pastedKey)
      setMessage("")
      setSelectedImage(null)
      setImagePreview(null)
      setImageName("")
      setImageSize(0)
      setUploadedFiles([])
      setPastedContents([])
      setTasks([])
      setShowTaskPanel(true)
      if (projectId && onNewMessage) {
        const tempUser: Message = {
          id: `temp-${Date.now()}`,
          projectId,
          role: "user",
          content: userMessage,
          hasArtifact: false,
          createdAt: new Date(),
          thinking: null,
          versionName: null,
          searchQueries: null,
          isAutomated: false,
          tokensUsed: null,
          cost: null,
        }
        onNewMessage(tempUser)
        const tempAssistantId = `temp-assistant-${Date.now()}`
        const tempAssistant: Message = {
          id: tempAssistantId,
          projectId,
          role: "assistant",
          content: "",
          hasArtifact: false,
          createdAt: new Date(),
          thinking: null,
          versionName: null,
          searchQueries: null,
          isAutomated: false,
          tokensUsed: null,
          cost: null,
        }
        onNewMessage(tempAssistant)
        console.log(`[ChatInput] Sending message with model: ${selectedModel}`)
        abortControllerRef.current = new AbortController()
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              message: userMessage,
              imageData: selectedImage,
              uploadedFiles: null,
              discussMode: isDiscussMode,
              isAutomated,
              selectedModel,
              selectedMcps: selectedMcpIds.map(id => mcpConnections.find(c => c.id === id)).filter(Boolean),
            }),
            signal: abortControllerRef.current.signal,
          })
          if (!res.ok) {
            throw new Error(`API returned ${res.status}: ${res.statusText}`)
          }
          const reader = res.body?.getReader()
          if (!reader) {
            throw new Error("No response body reader available")
          }
          const decoder = new TextDecoder()
          let accumulated = ""
          let lineBuffer = ""
          let streamError = false
          while (true) {
            try {
              const { done, value } = await reader.read()
              if (done) {
                console.log("[ChatInput] Stream completed")
                break
              }
              const chunk = decoder.decode(value, { stream: true })
              lineBuffer += chunk
              const lines = lineBuffer.split("\n")
              lineBuffer = lines[lines.length - 1]
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i]
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.error) {
                      console.error("[ChatInput] Stream error:", data.error)
                      streamError = true
                      alert(`Error: ${data.error}`)
                      break
                    }
                    if (data.text) {
                      accumulated += data.text
                      parseTasksFromContent(accumulated)
                      parseScannerLogsFromContent(accumulated)
                      onNewMessage({
                        ...tempAssistant,
                        content: accumulated,
                        id: tempAssistantId,
                        isAutomated: false,
                      })
                    }
                    if (data.done) {
                      console.log("[ChatInput] Received done signal, message ID:", data.messageId)
                      // Use server content as fallback if streaming didn't capture anything
                      const finalContent = accumulated.trim() ? accumulated : (data.content || accumulated)
                      onNewMessage({
                        id: data.messageId || `final-${Date.now()}`,
                        projectId,
                        role: "assistant",
                        content: finalContent,
                        hasArtifact: data.hasArtifact ?? false,
                        createdAt: new Date(),
                        thinking: null,
                        versionName: data.versionName || null,
                        searchQueries: null,
                        isAutomated: false,
                        tokensUsed: data.tokensUsed || null,
                        cost: data.cost || null,
                      })
                      router.refresh()
                    }
                  } catch (parseError) {
                    console.error("[ChatInput] JSON parse error:", parseError, "Line:", line)
                  }
                }
              }
              if (streamError) break
            } catch (readError) {
              console.error("[ChatInput] Stream read error:", readError)
              break
            }
          }
          if (!streamError) {
            parseAndSetPendingMigrations(accumulated)
          }
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            console.log("[ChatInput] Request aborted by user")
          } else {
            console.error("[ChatInput] Fetch error:", fetchError)
            alert(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
          }
        } finally {
          abortControllerRef.current = null
        }
      } else if (projectId) {
        abortControllerRef.current = new AbortController()
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            message: userMessage,
            imageData: selectedImage,
            uploadedFiles: null,
            discussMode: isDiscussMode,
            isAutomated,
            selectedModel,
            selectedMcps: selectedMcpIds.map(id => mcpConnections.find(c => c.id === id)).filter(Boolean),
          }),
          signal: abortControllerRef.current.signal,
        })
        abortControllerRef.current = null
      }
    } catch (err) {
      console.error("[ChatInput] Submit error:", err)
      alert("An error occurred while sending your message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  const handleDismissError = () => {
    onDismissError?.()
  }
  useImperativeHandle(
    ref,
    () => ({
      insertPrompt: (prompt: string) => {
        setMessage((prev) => {
          const newMessage = prev + (prev.trim() ? "\n\n" : "") + prompt
          localStorage.setItem(draftKey, newMessage)
          return newMessage
        })
        setTimeout(() => {
          textareaRef.current?.focus()
          if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight
          }
        }, 0)
      },
    }),
    [draftKey],
  )
  const openFileModal = (file: AttachedFile | PastedContent, isPasted: boolean) => {
    setSelectedFile({
      id: file.id,
      name: isPasted ? "Pasted Text" : (file as AttachedFile).name,
      content: isPasted ? (file as PastedContent).content : (file as AttachedFile).content,
      type: isPasted ? "text/plain" : (file as AttachedFile).type,
      isPasted,
    })
    setEditedContent(isPasted ? (file as PastedContent).content : (file as AttachedFile).content)
    setIsEditing(false)
  }
  const handleSaveEdit = () => {
    if (!selectedFile) return
    if (selectedFile.isPasted) {
      setPastedContents((prev) => prev.map((p) => (p.id === selectedFile.id ? { ...p, content: editedContent } : p)))
    } else {
      setUploadedFiles((prev) => prev.map((f) => (f.id === selectedFile.id ? { ...f, content: editedContent } : f)))
    }
    setIsEditing(false)
  }
  const handleDownload = () => {
    if (!selectedFile) return
    const blob = new Blob([selectedFile.content], { type: selectedFile.type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = selectedFile.name
    a.click()
    URL.revokeObjectURL(url)
  }
  const handleCopy = () => {
    if (!selectedFile) return
    navigator.clipboard.writeText(selectedFile.content)
    alert("Content copied to clipboard.")
  }
  const getLanguageFromType = (type: string, name: string, content?: string): string => {
    const ext = name.split(".").pop()?.toLowerCase()
    if (ext) {
      switch (ext) {
        case "js":
        case "jsx":
          return "javascript"
        case "ts":
        case "tsx":
          return "typescript"
        case "py":
          return "python"
        case "css":
          return "css"
        case "html":
          return "html"
        case "json":
          return "json"
        case "md":
          return "markdown"
      }
    }
    if (content && content.trimStart().startsWith("<") && (content.includes("{") || content.includes("}"))) {
      return "typescript"
    }
    return type.startsWith("text/") ? "text" : "plaintext"
  }
  const formRoundedClass = connected ? "rounded-t-[11px]" : "rounded-sm"
  const formBorderClass = connected ? "border-b-0" : "border-3"
  const currentModel = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0]
  const hasSubscription = balanceData?.subscriptionTier !== "none"
  return (
    <div className="">
      {pendingMigrations.length > 0 && credentialsSaved && projectId && (
        <div className="w-full bg-blue-50 rounded-lg p-3 flex items-center justify-between mb-3">
          <p className="text-sm text-blue-900">
            Detected {pendingMigrations.length} database migrations. Would you like to apply them to your Supabase
            project?
          </p>
          <Button
            size="sm"
            onClick={() => setShowTokenModal(true)}
            className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply
          </Button>
        </div>
      )}
      <div className={`bg-[#dbd9d9b2] p-[5px] rounded-[12px]`}>
        <form
          onSubmit={handleSubmit}
          className={`relative p-1 shadow-sm rounded-lg`}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #8373732c",
            transition: "background-image 200ms ease",
            backgroundImage: `
      linear-gradient(#ffffff, #ffffff),
      /* TOP border (colored section only) */
      linear-gradient(
        to right,
        ${isActive ? "#888888ff" : "rgba(158, 158, 158, 1)"} 0%,
        rgba(0, 153, 255, ${isActive ? "1" : "0.45"}) 18%,
        rgba(0, 153, 255, ${isActive ? "0.85" : "0.25"}) 35%,
        rgba(219, 219, 217, 0.7) 50%,
        #dbd9d9b2 60%
      ),
      /* LEFT border (colored section only) */
      linear-gradient(
        to bottom,
        ${isActive ? "#888888ff" : "rgba(158, 158, 158, 1)"} 0%,
        rgba(158, 158, 158, ${isActive ? "1" : "0.45"}) 22%,
        rgba(158, 158, 158, ${isActive ? "0.85" : "0.25"}) 40%,
        rgba(219, 219, 217, 0.7) 55%,
        #dbd9d9b2 65%
      )
    `,
            backgroundOrigin: "padding-box, border-box, border-box",
            backgroundClip: "padding-box, border-box, border-box",
          }}
        >
          {mentionMenu.isOpen && (
            <div
              className="absolute z-50 bg-white border rounded-lg shadow-xl w-64 overflow-hidden"
              style={{
                bottom: "100%",
                left: mentionMenu.position.left,
                marginBottom: "10px"
              }}
            >
              <Command className="border-none">
                <div className="flex bg-gray-50 border-b p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setMentionTab("mcps")}
                    className={cn(
                      "flex-1 text-[10px] font-bold p-1.5 rounded transition-all flex items-center justify-center gap-1.5",
                      mentionTab === "mcps" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    <Database className="w-3 h-3" />
                    MCPs
                  </button>
                  <button
                    type="button"
                    onClick={() => setMentionTab("emails")}
                    className={cn(
                      "flex-1 text-[10px] font-bold p-1.5 rounded transition-all flex items-center justify-center gap-1.5",
                      mentionTab === "emails" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    <Mail className="w-3 h-3" />
                    Emails
                  </button>
                </div>

                {mentionTab === "mcps" ? (
                  <>
                    <CommandInput placeholder="Search MCPs..." className="h-9" autoFocus />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No MCPs found.</CommandEmpty>
                      <CommandGroup heading="Connected MCPs">
                        {mcpConnections.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No connected MCPs. <Link href="/settings/mcp" className="text-indigo-600 underline">Connect one now.</Link>
                          </div>
                        ) : (
                          mcpConnections
                            .filter(c => c.name.toLowerCase().includes(mentionMenu.filter.toLowerCase()))
                            .map((mcp) => (
                              <CommandItem
                                key={mcp.id}
                                onSelect={() => {
                                  const before = message.slice(0, mentionMenu.startIndex)
                                  const after = message.slice(textareaRef.current?.selectionStart || 0)
                                  const newMessage = `${before}@${mcp.name}${after}`
                                  setMessage(newMessage)
                                  setSelectedMcpIds(prev => [...new Set([...prev, mcp.id])])
                                  setMentionMenu(prev => ({ ...prev, isOpen: false }))
                                  textareaRef.current?.focus()
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Database className="w-4 h-4 text-indigo-500" />
                                <span>{mcp.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{mcp.type}</span>
                              </CommandItem>
                            ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </>
                ) : (
                  <>
                    <CommandInput placeholder="Search Email Templates..." className="h-9" autoFocus />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No templates found.</CommandEmpty>
                      <CommandGroup heading="Email Templates">
                        {EMAIL_TEMPLATES
                          .filter(t => t.label.toLowerCase().includes(mentionMenu.filter.toLowerCase()))
                          .map((t) => (
                            <CommandItem
                              key={t.id}
                              onSelect={() => {
                                const before = message.slice(0, mentionMenu.startIndex)
                                const after = message.slice(textareaRef.current?.selectionStart || 0)
                                // Descriptive tag for the AI to pick up
                                const newMessage = `${before}@Email/${t.id}${after}`
                                setMessage(newMessage)
                                setMentionMenu(prev => ({ ...prev, isOpen: false }))
                                textareaRef.current?.focus()
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Mail className="w-4 h-4 text-blue-500" />
                              <span>{t.label}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </>
                )}
              </Command>
            </div>
          )}
          {/* SCANNER PROGRESS PANEL */}
          {isScanning && scannerLogs.length > 0 && (
            <div className="w-full mb-3 px-1">
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 overflow-hidden shadow-sm">
                <div className="px-3 py-2 flex items-center justify-between border-b border-blue-100 bg-blue-50/80">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Deep Analytics Mode</span>
                  </div>
                  {scannerLogs.every(l => l.status === 'success') && !effectiveIsLoading ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px] h-4">Complete</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-blue-500 animate-pulse font-medium">Scanning...</span>
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto chat-messages-scroll">
                  {scannerLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] animate-in fade-in slide-in-from-left-1 duration-300">
                      {log.status === 'loading' ? (
                        <div className="mt-0.5"><Loader2 className="w-3 h-3 animate-spin text-blue-500" /></div>
                      ) : log.status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500" />
                      ) : (
                        <Circle className="w-3 h-3 mt-0.5 text-blue-200" />
                      )}
                      <span className={cn(
                        "flex-1 leading-relaxed",
                        log.status === 'loading' ? "text-blue-700 font-semibold" : "text-gray-600"
                      )}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ERROR BUTTON & PANEL */}
          {previewError && (
            <div className="w-full mb-3 px-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowErrorPanel(!showErrorPanel)}
                className={cn(
                  "w-full flex items-center justify-between h-10 bg-white hover:bg-white hover:text-red-700 text-red-600 border-red-100 transition-all duration-300 shadow-sm",
                  showErrorPanel ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bgColor-red-50 rounded-lg">
                    <Bug size={18} className="text-red-500" />
                  </div>
                  <span className="text-xs font-bold tracking-tight">Runtime Error Identified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-red-100 text-red-400 px-1.5 py-0 h-4 uppercase">Fix Available</Badge>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-500", showErrorPanel && "rotate-180")} />
                </div>
              </Button>

              <div className={cn(
                "grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                showErrorPanel ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden border border-red-100 border-t-0 rounded-b-xl bg-white shadow-inner">
                  <div className="p-4 space-y-4">
                    <div className="bg-red-50/50 p-3 rounded-lg border border-red-100/50 text-[11px] font-mono text-red-700 leading-relaxed shadow-sm">
                      {previewError.file && (
                        <div className="flex items-center gap-1.5 font-bold underline mb-1.5 text-red-800">
                          <FileText size={12} />
                          {previewError.file}{previewError.line ? `:${previewError.line}` : ''}
                        </div>
                      )}
                      {previewError.message}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-9 gap-2 shadow-[0_2px_10px_-3px_rgba(220,38,38,0.5)] transition-all hover:-translate-y-0.5"
                        onClick={() => handleFixError(false)}
                      >
                        <StarsIcon className="w-4 h-4" />
                        Quick Fix with AI
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs h-9 gap-2 shadow-sm transition-all hover:-translate-y-0.5"
                        onClick={() => handleFixError(true)}
                      >
                        <Globe className="w-4 h-4 text-blue-500" />
                        Deep Online Scan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator line between Error and Task buttons if both are visible */}
              {(effectiveIsLoading || tasks.length > 0) && (
                <div className="flex items-center justify-center my-4 px-8">
                  <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-200/60 to-transparent w-full" />
                </div>
              )}
            </div>
          )}

          {(effectiveIsLoading || tasks.length > 0) && (
            <div className="w-full">

              {/* TOGGLE BUTTON */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTaskPanel(!showTaskPanel)}
                className={cn(
                  "w-full flex items-center justify-between h-9 bg-white hover:bg-white hover:text-black text-black transition-all duration-300",
                  showTaskPanel
                    ? "rounded-t-md rounded-b-none border-b-0"
                    : "rounded-md"
                )}
              >
                <div className="flex items-center gap-2">
                  <List size={20} />
                  <span className="text-xs font-medium">
                    Task {tasks.filter(t => t.status === "success").length} of {tasks.length} complete
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {tasks.length > 0 && (
                    <Badge>
                      {tasks.filter(t => t.status === "success").length}/{tasks.length}
                      {tasks.every(t => t.status === "success")
                        ? " Complete"
                        : " In Progress"}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-300",
                          showTaskPanel && "rotate-180"
                        )}
                      />
                    </Badge>
                  )}

                  {effectiveIsLoading && tasks.length === 0 && (
                    <Badge>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Generating...
                    </Badge>
                  )}

                </div>
              </Button>

              {/* TASK PANEL (SMOOTH GRID ANIMATION) */}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  showTaskPanel
                    ? "grid-rows-[1fr] opacity-100 translate-y-0"
                    : "grid-rows-[0fr] opacity-0 -translate-y-1"
                )}
              >
                <div className="overflow-hidden">
                  <div className="rounded-b-md bg-white p-2 space-y-1 max-h-32 overflow-y-auto">

                    {/* Loading state */}
                    {tasks.length === 0 && effectiveIsLoading && (
                      <div className="flex items-center gap-3 p-2 rounded-md border bg-gray-50 border-gray-100">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-gray-500">
                          Analyzing your request and planning tasks...
                        </span>
                      </div>
                    )}

                    {/* Tasks */}
                    {tasks.map((task, idx) => (
                      <div
                        key={`task-${idx}-${task.text}`}
                        className="flex items-center gap-3 px-2 py-2 rounded-md border transition-all duration-300"
                      >
                        <div className="flex-shrink-0 self-center">
                          {task.status === "loading" ? (
                            <Loader className="w-4 h-4 animate-spin text-gray-900" />
                          ) : task.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-gray-900" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-900" />
                          )}
                        </div>

                        <span
                          className={cn(
                            "text-[11px] leading-relaxed",
                            task.status === "success"
                              ? "text-gray-900"
                              : task.status === "loading"
                                ? "text-blue-700 font-medium"
                                : "text-gray-700 font-medium"
                          )}
                        >
                          {task.text}
                        </span>
                      </div>
                    ))}

                  </div>
                </div>
              </div>

            </div>
          )}
          {(uploadedFiles.length > 0 || pastedContents.length > 0 || selectedMcpIds.length > 0) && (
            <div className="flex flex-wrap gap-2 justify-start px-2 pt-2 pb-1 bg-white/50 backdrop-blur-sm">
              {selectedMcpIds.map(id => {
                const mcp = mcpConnections.find(c => c.id === id)
                if (!mcp) return null
                return (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 py-1"
                  >
                    <Database className="w-3 h-3" />
                    @{mcp.name}
                    <button
                      onClick={() => setSelectedMcpIds(prev => prev.filter(i => i !== id))}
                      className="ml-1 hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )
              })}
              {pastedContents.map((content) => (
                <PastedContentButton
                  key={content.id}
                  content={content}
                  onClick={() => openFileModal(content, true)}
                  onRemove={() => setPastedContents((prev) => prev.filter((c) => c.id !== content.id))}
                />
              ))}
              {uploadedFiles.map((file) => (
                <FilePreviewButton
                  key={file.id}
                  file={file}
                  onClick={() => openFileModal(file, false)}
                  onRemove={() => setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                />
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              const newMessage = e.target.value
              const cursorPosition = e.target.selectionStart
              setMessage(newMessage)
              localStorage.setItem(draftKey, newMessage)

              // @ Mention Logic
              const lastChar = newMessage[cursorPosition - 1]
              const textBeforeCursor = newMessage.slice(0, cursorPosition)
              const atIndex = textBeforeCursor.lastIndexOf("@")

              if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " " || textBeforeCursor[atIndex - 1] === "\n")) {
                const filter = textBeforeCursor.slice(atIndex + 1)
                if (!filter.includes(" ")) {
                  // Calculate position for menu (simplified - usually needs a hidden div measurement)
                  const rect = textareaRef.current?.getBoundingClientRect()
                  if (rect) {
                    setMentionMenu({
                      isOpen: true,
                      filter,
                      position: { top: -160, left: 10 }, // Relative to absolute container
                      startIndex: atIndex
                    })
                  }
                } else {
                  setMentionMenu(prev => ({ ...prev, isOpen: false }))
                }
              } else {
                setMentionMenu(prev => ({ ...prev, isOpen: false }))
              }

              if (newMessage.trim().length > 0) {
                setIsActive(true)
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => {
              setIsFocused(true)
              if (message.trim().length > 0) {
                setIsActive(true)
              }
            }}
            onBlur={() => {
              setIsFocused(false)
              if (message.trim().length === 0) {
                setIsActive(false)
              }
            }}
            placeholder={isDiscussMode ? "Discuss anything..." : placeholder}
            className="w-full min-h-[120px] max-h-[150px] resize-none bg-transparent text-black placeholder:text-muted-foreground
             px-2 pt-2 pb-10 text-base outline-none overflow-y-auto field-sizing-content chat-messages-scroll font-light
             disabled:cursor-not-allowed disabled:opacity-50"
            style={{ scrollbarWidth: "thin" }}
            disabled={isLoading}
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-1 bg-[#e7e7e700] rounded-[19px]">
            {isListening ? (
              <div className="flex-1 relative h-10 mr-2 p-[-14px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-gray-100 rounded" />
              </div>
            ) : (
              <div className="flex items-center">
                <div className="relative flex items-center" ref={menuRef}>
                  <Button
                    type="button"
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="h-7 w-7 p-1.5 cursor-pointer text-sm rounded-md BackgroundStyle text-black ml-1"
                    title="More options"
                    disabled={isLoading}
                    variant="ghost"
                    size="sm"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {showMenu && (
                    <div
                      className="absolute z-50 w-56 overflow-visible bg-white shadow-xs border border-[#dbd9d965]
                    animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
                    focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive 
                    data-[variant=destructive]:focus:bg-destructive/10
                    dark:data-[variant=destructive]:focus:bg-destructive/20 
                    data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive
                    [&_svg:not([class*='text-'])]:text-muted-foreground 
                    items-center gap-2 rounded-md px-0.5 py-0.5 text-sm
                    outline-hidden select-none data-[disabled]:pointer-events-none 
                    data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 
                    [&_svg:not([class*='size-'])]:size-4"
                      style={{ bottom: "100%", left: "0", marginBottom: "10px" }}
                    >
                      {menuMode === "main" ? (
                        <>
                          <div
                            onClick={() => {
                              fileInputRef.current?.click()
                              setShowMenu(false)
                            }}
                            className={cn("flex items-center px-2 py-1.5 text-sm rounded-sm", isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#e7e7e7] cursor-pointer")}
                          >
                            <Link1Icon className="h-4 w-4 mr-2" />
                            Attach images & files
                          </div>
                          <div
                            onClick={() => {
                              if (!message.includes("Capture from URL:")) {
                                setMenuMode("design")
                              }
                            }}
                            className={cn("flex items-center px-2 py-1.5 text-sm rounded-sm w-full", message.includes("Capture from URL:") ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-[#e7e7e7] cursor-pointer")}
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            System Design
                          </div>
                          <div
                            className="relative flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-[#e7e7e7] cursor-pointer w-full"
                            onMouseEnter={() => setShowDatabaseHover(true)}
                            onMouseLeave={() => setShowDatabaseHover(false)}
                            onClick={(e) => {
                              if (projectId && onOpenDatabase) {
                                onOpenDatabase()
                              }
                            }}
                          >
                            <Database className="h-4 w-4 mr-2" />
                            Database
                            {isFalborDb && <Badge className="ml-auto">Falbor</Badge>}
                            {credentialsSaved && !isFalborDb && <Badge className="ml-auto">Connected</Badge>}

                            {showDatabaseHover && (!projectId || !onOpenDatabase) && (
                              <div
                                className="absolute z-50 w-56
                              BackgroundStyleButton
                              focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive 
                              data-[variant=destructive]:focus:bg-destructive/10
                              dark:data-[variant=destructive]:focus:bg-destructive/20 
                              data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive
                              [&_svg:not([class*='text-'])]:text-muted-foreground 
                              items-center gap-2 rounded-md px-0.5 py-0.5 text-sm
                              outline-hidden select-none data-[disabled]:pointer-events-none 
                              data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 
                              [&_svg:not([class*='size-'])]:size-4"
                                style={{ left: "100%", top: 0, marginLeft: "-7px" }}
                                onMouseEnter={() => setShowDatabaseHover(true)}
                                onMouseLeave={() => setShowDatabaseHover(false)}
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-white cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFalborDb(true); setShowMenu(false); setShowDatabaseHover(false); }}
                                      >
                                        <img src="/icons/falbor.png" className="w-4 h-4 mr-2" alt="" />
                                        <span className="flex-1 text-left">Falbor Database</span>
                                        {isFalborDb && <Check className="h-4 w-4 text-black" />}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Use the Falbor built-in database</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-white cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFalborDb(false); setShowDatabaseModal(true); setShowMenu(false); setShowDatabaseHover(false); }}
                                      >
                                        <img src="/icons/supabase.png" className="w-4 h-4 mr-2" alt="" />
                                        <span className="flex-1 text-left">Connect Supabase</span>
                                        {!isFalborDb && credentialsSaved && <Check className="h-4 w-4 text-green-600" />}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Connect your own Supabase database</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-white cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); setIsFalborDb(false); setCredentialsSaved(false); setShowMenu(false); setShowDatabaseHover(false); }}
                                      >
                                        <img src="/icons/database-off.png" className="w-4 h-4 mr-2" alt="" />
                                        <span className="flex-1 text-left">Create without DB</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Proceed without connecting any database</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                          <div
                            className="relative flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-[#e7e7e7] cursor-pointer w-full"
                            onMouseEnter={() => setShowModelHover(true)}
                            onMouseLeave={() => setShowModelHover(false)}
                          >
                            <img src={currentModel.iconUrl || "/placeholder.svg"} className="h-4 w-4 mr-2" alt="" />
                            <span className="flex-1 text-left">AI Model</span>
                            <span className="ml-auto text-muted-foreground text-[10px]">{currentModel.label}</span>

                            {showModelHover && (
                              <div
                                className="absolute z-50 w-[260px]
                              bg-white
                              focus:bg-accent focus:text-accent-foreground
                              items-center gap-2 rounded-md px-0.5 py-0.5 text-sm
                              outline-hidden select-none border shadow-xs"
                                style={{ left: "100%", top: "-100px", marginLeft: "-7px" }}
                                onMouseEnter={() => setShowModelHover(true)}
                                onMouseLeave={() => setShowModelHover(false)}
                              >
                                <div className="px-2.5 py-1 text-xs font-semibold text-muted-foreground">Claude Agent</div>
                                <div className="space-y-0.5">
                                  {MODEL_OPTIONS.slice(0, 6).map((model) => (
                                    <div
                                      key={model.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (model.isPremium && !hasSubscription) {
                                          setShowPremiumAlert(true)
                                          return
                                        }
                                        handleModelSelect(model.id)
                                        setShowModelHover(false)
                                        setShowMenu(false)
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 px-3 py-1.5 rounded-md cursor-pointer relative",
                                        model.isPremium && !hasSubscription ? "opacity-40 cursor-not-allowed grayscale-[0.8]" : "hover:bg-[#f3f3f3]"
                                      )}
                                    >
                                      <img src={model.iconUrl} alt={model.label} className="w-4 h-4 rounded" />
                                      <span className={cn("flex-1", model.isPremium && !hasSubscription ? "blur-[0.5px]" : "")}>{model.label}</span>
                                      {model.isPremium && !hasSubscription && (
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-500 backdrop-blur-md text-white border border-white/20 shadow-xl text-[10px] uppercase font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1 opacity-100 grayscale-0">
                                          <Lock className="w-2.5 h-2.5" /> Pro Plus
                                        </span>
                                      )}
                                      {selectedModel === model.id && (
                                        <span className="text-[10px] bg-gray-200 text-gray-900 px-2 py-0.5 rounded-2xl font-bold">ACTIVE</span>
                                      )}
                                      {model.isPremium && hasSubscription && (
                                        <Lock className="w-3 h-3 text-gray-600" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* <div className="h-px bg-gray-100 w-full m-0 p-0 my-1" />
                              <div className="p-0.5 space-y-0.5">
                                {MODEL_OPTIONS.slice(6).map((model) => (
                                  <div
                                    key={model.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (model.isPremium && !hasSubscription) {
                                        setShowPremiumAlert(true)
                                        return
                                      }
                                      handleModelSelect(model.id)
                                      setShowModelHover(false)
                                      setShowMenu(false)
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-1.5 rounded-md cursor-pointer relative",
                                      model.isPremium && !hasSubscription ? "opacity-40 cursor-not-allowed grayscale-[0.8]" : "hover:bg-[#f3f3f3]"
                                    )}
                                  >
                                    <img src={model.iconUrl} alt={model.label} className="w-4 h-4 rounded" />
                                    <span className={cn("flex-1", model.isPremium && !hasSubscription ? "blur-[0.5px]" : "")}>{model.label}</span>
                                    {model.isPremium && !hasSubscription && (
                                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-500 backdrop-blur-md text-white border border-white/20 shadow-xl text-[10px] uppercase font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1 opacity-100 grayscale-0">
                                        <Lock className="w-2.5 h-2.5" /> Pro Plus
                                      </span>
                                    )}
                                    {selectedModel === model.id && (
                                      <span className="text-[10px] bg-gray-200 text-gray-900 px-2 py-0.5 rounded-2xl font-bold">ACTIVE</span>
                                    )}
                                    {model.isPremium && hasSubscription && (
                                      <Lock className="w-3 h-3 text-gray-600" />
                                    )}
                                  </div>
                                ))}
                              </div> */}
                              </div>
                            )}
                          </div>

                          {/* {!projectId && (
                          <div
                            className="relative flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-[#e7e7e7] cursor-pointer w-full"
                            onMouseEnter={() => setShowFrameworkHover(true)}
                            onMouseLeave={() => setShowFrameworkHover(false)}
                          >
                            <Square className="h-4 w-4 mr-2 text-muted-foreground stroke-1" />
                            <span className="flex-1 text-left">Choose framework</span>
                            <span className="ml-auto text-muted-foreground text-[10px] uppercase font-bold">{selectedFramework}</span>

                            {showFrameworkHover && (
                              <div
                                className="absolute z-50 w-64
                              BackgroundStyleButton
                              focus:bg-accent focus:text-accent-foreground
                              items-center gap-2 rounded-md  text-sm
                              outline-hidden select-none border"
                                style={{ left: "100%", top: 0, marginLeft: "-7px" }}
                                onMouseEnter={() => setShowFrameworkHover(true)}
                                onMouseLeave={() => setShowFrameworkHover(false)}
                              >
                                <div className="p-0.5 space-y-0.5">
                                  {["vite", "nextjs", "vue"].map((fw) => {
                                    const icon =
                                      fw === "nextjs" ? <img src="/icons/nextjs.png" className="w-5 h-5 mr-2" alt="" /> :
                                        fw === "vue" ? <img src="/icons/vue.png" className="w-7 h-7 ml-[-3px]" alt="" /> :
                                          <img src="/icons/Vite.png" className="w-5 h-5 mr-2" alt="" />

                                    return (
                                      <div
                                        key={fw}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedFramework(fw)
                                          setShowFrameworkHover(false)
                                          setShowMenu(false)
                                        }}
                                        className="flex items-center gap-3 px-3 py-1.5 rounded-sm cursor-pointer relative hover:bg-white"
                                      >
                                        {icon}

                                        <span className="flex-1 capitalize text-sm">
                                          {fw === "nextjs"
                                            ? "Next.js (React + TypeScript)"
                                            : fw === "vue"
                                              ? "Vue + TypeScript"
                                              : "Vite + TypeScript"}
                                        </span>

                                        {selectedFramework === fw && (
                                          <span className="text-[10px] bg-gray-200 text-gray-900 px-2 py-0.5 rounded-2xl font-bold">
                                            ACTIVE
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )} */}

                          {/* <div
                            className="relative flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-[#e7e7e7] cursor-pointer w-full"
                            onMouseEnter={() => setShowUrlHover(true)}
                            onMouseLeave={() => setShowUrlHover(false)}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            <span className="flex-1 text-left">Capture from URL</span>
                            <Badge>Beta</Badge>
                            {showUrlHover && (
                              <div
                                className="absolute z-50 w-64
                              bg-white
                              focus:bg-accent focus:text-accent-foreground
                              items-center gap-2 rounded-md px-3 py-3 text-sm
                              outline-hidden select-none border shadow-sm"
                                style={{ left: "100%", top: "-50px", marginLeft: "-7px" }}
                                onMouseEnter={() => setShowUrlHover(true)}
                                onMouseLeave={() => setShowUrlHover(false)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="mb-2 text-xs font-semibold text-muted-foreground">Website URL</div>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="https://example.com"
                                    value={captureUrlInput}
                                    onChange={(e) => setCaptureUrlInput(e.target.value)}
                                    className="h-8 text-xs font-normal"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (captureUrlInput.trim()) {
                                          const promptText = `Capture from URL: ${captureUrlInput.trim()}`;
                                          setMessage(prev => prev + (prev.trim() ? "\\n\\n" : "") + promptText);
                                          setCaptureUrlInput("");
                                          setShowUrlHover(false);
                                          setShowMenu(false);
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      if (captureUrlInput.trim()) {
                                        const promptText = `Capture from URL: ${captureUrlInput.trim()}`;
                                        setMessage(prev => prev + (prev.trim() ? "\\n\\n" : "") + promptText);
                                        setCaptureUrlInput("");
                                        setShowUrlHover(false);
                                        setShowMenu(false);
                                      }
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div> */}
                          <div
                            onClick={() => {
                              if (!isImproving && message.trim() && !isLoading) {
                                handleImprovePrompt()
                                setShowMenu(false)
                              }
                            }}
                            className={cn("flex items-center px-2 py-1.5 text-sm rounded-sm w-full", isImproving || !message.trim() || isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#e7e7e7] cursor-pointer")}
                          >
                            {!isImproving ? (
                              <StarsIcon className="h-4 w-4 mr-2" />
                            ) : (
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Enhance Prompt
                          </div>
                        </>
                      ) : (
                        <>
                          <div onClick={() => setMenuMode("main")} className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer transition-colors w-full">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                          </div>
                          {designSystems.map((system) => (
                            <div
                              key={system.name}
                              onClick={() => {
                                setSelectedDesign(system.name)
                                setDesignConfig(designPresets[system.name])
                                setShowMenu(false)
                              }}
                              className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer transition-colors w-full"
                            >
                              <div className={`h-4 w-4 rounded mr-2 ${system.previewColor}`} />
                              {system.name}
                            </div>
                          ))}
                          <div
                            onClick={() => {
                              setSelectedDesign("Custom")
                              setShowDesignModal(true)
                              setShowMenu(false)
                            }}
                            className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer transition-colors w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New Design System
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center relative" ref={dropdownRef}>
                  {connected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onCloseIdeas}
                      className="px-2 py-1 text-sm text-black/75 hover:text-black hover:bg-[#e4e4e48c] h-auto ml-1"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".ts,.tsx,.js,.jsx,.py,.css,.html,.json,.md,.txt,image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-px">
              {!isListening && (
                <Button
                  type="button"
                  onClick={handleVoiceToggle}
                  className="h-7 w-7 p-1.5 cursor-pointer text-sm rounded-md hover:bg-[#e7e7e7] text-black"
                  title="Voice input"
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                >
                  <AudioLinesIcon className="w-4 h-4" />
                </Button>
              )}
              <Button
                type={isListening ? "button" : effectiveIsLoading ? "button" : "submit"}
                onClick={isListening ? stopVoiceInput : effectiveIsLoading ? handleStop : undefined}
                size={isProvisioning ? "default" : "icon"}
                className={cn(
                  "h-7 p-1.5 rounded-md mr-1",
                  isListening ? "bg-red-500 hover:bg-red-600" : (effectiveIsLoading ? "bg-red-500 hover:bg-red-600" : "bg-black"),
                  isProvisioning ? "w-auto px-4 gap-2" : "w-7"
                )}
                disabled={
                  (!effectiveIsLoading && !isListening &&
                    ((!message.trim() && uploadedFiles.length === 0 && pastedContents.length === 0 && !selectedImage) ||
                      !isAuthenticated))
                }
              >
                {isProvisioning ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Provisioning DB...</span>
                  </>
                ) : effectiveIsLoading ? (
                  <StopCircle className="w-5 h-5 text-white" />
                ) : isListening ? (
                  <Circle className="w-4 h-4 text-white" />
                ) : (
                  <ArrowUp className="w-5 h-5 text-white" />
                )}
              </Button>
            </div>
          </div>
        </form >
      </div>
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogTitle>Confirm Build</DialogTitle>
          <p>Are you sure you want to build this project without a database connection?</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirmation(false)
                setShowDatabaseModal(true)
              }}
            >
              No, connect a database
            </Button>
            <Button
              onClick={() => {
                setShowConfirmation(false)
                createProject(false)
              }}
            >
              Yes, continue without database
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto p-0 z-[9999]">
          <div className="flex justify-between items-center mb-4 px-4 py-2">
            <DialogTitle>{selectedFile?.name}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {selectedFile?.type.startsWith("image/") ? (
              <img
                src={selectedFile.content || "/placeholder.svg"}
                alt={selectedFile.name}
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            ) : (
              <Editor
                height="60vh"
                language={getLanguageFromType(
                  selectedFile?.type || "",
                  selectedFile?.name || "",
                  selectedFile?.content,
                )}
                value={isEditing ? editedContent : selectedFile?.content}
                theme="vs-light"
                options={{
                  readOnly: !isEditing,
                  minimap: { enabled: false },
                  scrollbar: { vertical: "auto" },
                  wordWrap: "on",
                }}
                onChange={(value) => {
                  if (isEditing) setEditedContent(value || "")
                }}
              />
            )}
          </motion.div>
          {isEditing && !selectedFile?.type.startsWith("image/") && (
            <Button onClick={handleSaveEdit} className="mt-4">
              Save Changes
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <SupabaseConnectModal
        open={showDatabaseModal}
        onOpenChange={setShowDatabaseModal}
        credentialsSaved={credentialsSaved}
        databaseCredentials={databaseCredentials}
        selectedProjectRef={selectedProjectRef}
        projects={projects}
        onDisconnect={handleDisconnectDatabase}
        onConnect={handleSupabaseOAuthConnect}
        isAuthenticated={isAuthenticated}
      />
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Apply Migrations</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter your Supabase personal access token to apply the migrations.
          </p>
          <Input
            type="password"
            placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxx"
            value={tempAccessToken}
            onChange={(e) => setTempAccessToken(e.target.value)}
          />
          <Button onClick={handleExecuteMigrations} disabled={!tempAccessToken || isSavingCredentials}>
            {isSavingCredentials ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Migrations"
            )}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={showDesignModal} onOpenChange={setShowDesignModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Custom Design System</DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={tempConfig.primaryColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={tempConfig.primaryColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={tempConfig.secondaryColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={tempConfig.secondaryColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={tempConfig.backgroundColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={tempConfig.backgroundColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, backgroundColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={tempConfig.textColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, textColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={tempConfig.textColor}
                    onChange={(e) => setTempConfig({ ...tempConfig, textColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDesignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDesignConfig(tempConfig)
                  setShowDesignModal(false)
                }}
              >
                Apply Design
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showPremiumAlert} onOpenChange={setShowPremiumAlert}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Premium Model
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            This model requires a premium subscription. Please upgrade your plan to access premium models.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setShowPremiumAlert(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogTitle>Sign In Required</DialogTitle>
          <p className="text-sm text-muted-foreground">Please sign in to use this feature.</p>
          <div className="flex justify-end">
            <Button onClick={() => setShowLoginDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
})
export function ChatInput(props: ChatInputProps) {
  return <ChatInputImpl {...props} />
}