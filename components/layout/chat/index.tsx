"use client"
import type React from "react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertCircle, Palette, StarsIcon, Crown, Lock, Database, ArrowUp, AudioWaveform, AudioLinesIcon } from "lucide-react"
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
  Mail
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
interface CreditsData {
  subscriptionTier: string
  credits?: number
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
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", isPremium: true, iconUrl: "/icons/claude.png" },
  { id: "claude-opus-4.6", label: "Claude Opus 4.6", isPremium: true, iconUrl: "/icons/claude.png" },
  { id: "claude-haiku-4.5", label: "Claude Haiku 4.5", isPremium: true, iconUrl: "/icons/claude.png" },
  { id: "claude-opus-4.5", label: "Claude Opus 4.5", isPremium: true, iconUrl: "/icons/claude.png" },
  { id: "claude-sonnet-4.5", label: "Claude Sonnet 4.5", isPremium: false, iconUrl: "/icons/claude.png" },
  { id: "claude-opus-4", label: "Claude Opus 4", isPremium: true, iconUrl: "/icons/claude.png" },
  // { id: "claude-3.5-haiku", label: "Claude 3.5 Haiku", isPremium: false, iconUrl: "/icons/claude.png" },
  // { id: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", isPremium: false, iconUrl: "/icons/claude.png" },
  { id: "gemini", label: "Gemini 3 Flash", isPremium: false, iconUrl: "/icons/gemini.png" },
  { id: "gpt-5.2", label: "GPT-5.2", isPremium: false, iconUrl: "/icons/openai.png" },
  { id: "gpt-5.1-codex", label: "GPT-5.1 Codex Max", isPremium: true, iconUrl: "/icons/openai.png" },
  // { id: "gpt-5.1-codex", label: "GPT-5.1 Codex Max", isPremium: false, iconUrl: "/icons/openai.png" },
  // { id: "grok-4.1", label: "Grok 4.1 Fast", isPremium: true, iconUrl: "https://x.ai/favicon.ico" },
  // { id: "grok-3-mini", label: "Grok 3 Mini", isPremium: false, iconUrl: "https://x.ai/favicon.ico" },
  { id: "glm-4.7-flash", label: "GLM 4.7 Flash", isPremium: true, iconUrl: "/icons/zAI.png" },
  { id: "glm-4.5-flash", label: "GLM 4.5 Flash", isPremium: true, iconUrl: "/icons/zAI.png" },
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
    <div className="relative group flex items-center justify-between w-[150px] px-2 rounded-lg border border-[#e4e4e4a8] bg-[#e4e4e457] hover:bg-[#e4e4e4c4] transition-all cursor-pointer">
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
          group-hover:opacity-100
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
    <div className="relative group flex items-center justify-between w-[132px] px-2 rounded-lg border border-[#e4e4e4a8] bg-[#e4e4e457] hover:bg-[#e4e4e4c4] transition-all cursor-pointer">
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
          group-hover:opacity-100
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
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
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
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuMode, setMenuMode] = useState<"main" | "design" | "database">("main")
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
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [tasks, setTasks] = useState<{ text: string; status: "success" | "loading" | "pending" }[]>([])
  const tasksKey = projectId ? `chat-tasks-${projectId}` : "chat-tasks-global"

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

  const parseTasksFromContent = (content: string) => {
    const tasksRegex = /<Tasks>([\s\S]*?)<\/Tasks>/i
    const match = content.match(tasksRegex)
    if (match) {
      const lines = match[1].trim().split("\n")
      const tasksList = lines.map(line => {
        if (!line.trim()) return null
        const successMatch = line.match(/(.+?)\s*[✓✔]/i)
        const loadingMatch = line.match(/(.+?)\s*[⏳⌛…]/i)
        if (successMatch) return { text: successMatch[1].trim(), status: "success" as const }
        if (loadingMatch) return { text: loadingMatch[1].trim(), status: "loading" as const }
        return { text: line.trim(), status: "pending" as const }
      }).filter(Boolean) as { text: string; status: "success" | "loading" | "pending" }[]
      setTasks(tasksList)
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
            alert("Insufficient credits. Please wait for regeneration or upgrade.")
            return
          }
          alert(errData.error || "Failed to process your request. Please try again.")
          return
        }
        await refetchCredits()
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
  const fetchCredits = async () => {
    if (!user?.id || !isLoaded) return
    try {
      const res = await fetch("/api/user/credits")
      if (res.ok) {
        const data: CreditsData = await res.json()
        setCreditsData(data)
        if (data.secondsUntilNextRegen) {
          setTimeLeft(data.secondsUntilNextRegen)
        }
      } else {
        console.error(`Failed to fetch credits: ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err)
    }
  }
  useEffect(() => {
    fetchCredits()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchCredits()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user?.id, isLoaded])
  const refetchCredits = async () => {
    if (!user?.id) return
    await fetchCredits()
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
    const hasSubscription = creditsData?.subscriptionTier !== "none"
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    if (!message.trim() && uploadedFiles.length === 0 && pastedContents.length === 0 && !designConfig && !selectedImage)
      return
    if (!isAuthenticated) {
      setShowLoginDialog(true)
      return
    }
    const selectedModelOption = MODEL_OPTIONS.find((m) => m.id === selectedModel)
    const hasSubscription = creditsData?.subscriptionTier !== "none"
    if (selectedModelOption?.isPremium && !hasSubscription) {
      setShowPremiumAlert(true)
      return
    }
    let userMessage = message.trim()
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
    if (designConfig) {
      userMessage += `\n\n## Design System: ${selectedDesign || "Custom"}\n${JSON.stringify(designConfig, null, 2)}`
    }
    if (!projectId) {
      setPendingSubmitData({
        userMessage,
        selectedImage,
        isDiscussMode,
        selectedModel,
        isAutomated,
        isFalborDb,
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
            alert("Insufficient credits. Please wait for regeneration or upgrade.")
            return
          }
          alert(errData.error || "Failed to process your request. Please try again.")
          return
        }
        await refetchCredits()
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
      if (projectId && onNewMessage) {
        const tempUser: Message = {
          id: `temp-${Date.now()}`,
          projectId,
          role: "user",
          content: userMessage,
          hasArtifact: false,
          createdAt: new Date(),
          thinking: null,
          searchQueries: null,
          isAutomated: false,
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
          searchQueries: null,
          isAutomated: false,
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
                      onNewMessage({
                        ...tempAssistant,
                        content: accumulated,
                        id: tempAssistantId,
                        isAutomated: false,
                      })
                    }
                    if (data.done) {
                      console.log("[ChatInput] Received done signal, message ID:", data.messageId)
                      onNewMessage({
                        id: data.messageId || `final-${Date.now()}`,
                        projectId,
                        role: "assistant",
                        content: accumulated,
                        hasArtifact: data.hasArtifact ?? false,
                        createdAt: new Date(),
                        thinking: null,
                        searchQueries: null,
                        isAutomated: false,
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
  const handleFixError = () => {
    if (!previewError || !projectId) return
    const fixPrompt = `There's an error in the preview that needs to be fixed:
Error: ${previewError.message}
${previewError.file ? `File: ${previewError.file}` : ""}
${previewError.line ? `Line ${previewError.line}` : ""}
Please analyze this error and fix it in the code. Make sure to:
1. Identify the root cause of the error
2. Fix the issue without breaking existing functionality
3. Ensure proper error handling is in place`
    setMessage(fixPrompt)
    localStorage.setItem(draftKey, fixPrompt)
    onDismissError?.()
    setTimeout(() => {
      textareaRef.current?.focus()
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.value.length
        textareaRef.current.selectionEnd = textareaRef.current.value.length
      }
    }, 0)
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
  const hasSubscription = creditsData?.subscriptionTier !== "none"
  return (
    <div className="">
      {previewError && (
        <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between mb-3 shadow-sm">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 mb-1">Preview Error</p>
              <p className="text-sm text-red-700 break-words">{previewError.message}</p>
              {previewError.file && (
                <p className="text-xs text-red-600 mt-1">
                  {previewError.file}
                  {previewError.line && ` (Line ${previewError.line})`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixError}
              className="h-8 px-3 text-xs bg-white hover:bg-red-50 text-red-700 border-red-300"
            >
              Fix Problem
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismissError}
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
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
      <form
        onSubmit={handleSubmit}
        className={`relative p-1 shadow-sm ${formRoundedClass}`}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "6px",
          border: "1px solid #dbd9d9b2",
          transition: "background-image 200ms ease",
          backgroundImage: `
      linear-gradient(#ffffff, #ffffff),
      /* TOP border (colored section only) */
      linear-gradient(
        to right,
        ${isActive ? "#0099ff" : "rgba(0, 153, 255, 1)"} 0%,
        rgba(0, 153, 255, ${isActive ? "1" : "0.45"}) 18%,
        rgba(0, 153, 255, ${isActive ? "0.85" : "0.25"}) 35%,
        rgba(219, 219, 217, 0.7) 50%,
        #dbd9d9b2 60%
      ),
      /* LEFT border (colored section only) */
      linear-gradient(
        to bottom,
        ${isActive ? "#0099ff" : "rgba(0, 153, 255, 1)"} 0%,
        rgba(0, 153, 255, ${isActive ? "1" : "0.45"}) 22%,
        rgba(0, 153, 255, ${isActive ? "0.85" : "0.25"}) 40%,
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
        <AnimatePresence>
          {tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-2 pb-2"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTaskPanel(!showTaskPanel)}
                className="w-full flex items-center justify-between h-9 bg-blue-50/50 border-blue-100 hover:bg-blue-100/50 text-blue-700 rounded-lg group"
              >
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">View AI Tasks Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] py-0.5 px-2 bg-blue-100 rounded-full font-bold">
                    {tasks.filter(t => t.status === "success").length}/{tasks.length} Complete
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showTaskPanel && "rotate-180")} />
                </div>
              </Button>
            </motion.div>
          )}

          {showTaskPanel && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-2 pb-4 overflow-hidden"
            >
              <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-black/70">
                    <Square className="w-4 h-4 fill-blue-500 text-blue-500" />
                    Task Execution Plan
                  </h3>
                  {effectiveIsLoading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      AI Generating...
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {tasks.map((task, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                        task.status === "loading" ? "bg-blue-50 border-blue-200" :
                          task.status === "success" ? "bg-green-50/50 border-green-100" : "bg-gray-50/30 border-gray-100"
                      )}
                    >
                      {task.status === "loading" ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      ) : task.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={cn(
                        "text-sm",
                        task.status === "success" ? "text-gray-500 line-through" : "text-gray-700 font-medium"
                      )}>
                        {task.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {(uploadedFiles.length > 0 || pastedContents.length > 0 || selectedMcpIds.length > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 justify-start px-2 pt-2 pb-1 bg-white/50 backdrop-blur-sm">
                {selectedMcpIds.map(id => {
                  const mcp = mcpConnections.find(c => c.id === id)
                  if (!mcp) return null
                  return (
                    <motion.div
                      key={id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
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
                    </motion.div>
                  )
                })}
                {pastedContents.map((content) => (
                  <motion.div
                    key={content.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <PastedContentButton
                      content={content}
                      onClick={() => openFileModal(content, true)}
                      onRemove={() => setPastedContents((prev) => prev.filter((c) => c.id !== content.id))}
                    />
                  </motion.div>
                ))}
                {uploadedFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <FilePreviewButton
                      file={file}
                      onClick={() => openFileModal(file, false)}
                      onRemove={() => setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <div className="relative" ref={dropdownRef}>
                <DropdownMenu
                  open={showMenu}
                  onOpenChange={(open) => {
                    setShowMenu(open)
                    if (!open) setMenuMode("main")
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="h-7 w-7 p-1.5 cursor-pointer text-sm rounded-md BackgroundStyle text-black ml-1"
                      title="More options"
                      disabled={isLoading}
                      variant="ghost"
                      size="sm"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="top"
                    className="w-56"
                  >
                    {menuMode === "main" ? (
                      <>
                        <DropdownMenuItem
                          onSelect={() => {
                            fileInputRef.current?.click()
                            setShowMenu(false)
                          }}
                          disabled={isLoading}
                          className="w-full"
                        >
                          <Link1Icon className="h-4 w-4" />
                          Attach images & files
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMenuMode("design")} className="w-full">
                          <Palette className="h-4 w-4" />
                          System Design
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            if (projectId && onOpenDatabase) {
                              onOpenDatabase()
                            } else {
                              setMenuMode("database")
                            }
                          }}
                          className="w-full"
                        >
                          <Database className="h-4 w-4" />
                          Database
                          {isFalborDb && <span className="ml-auto text-blue-600 text-[10px] font-bold">Falbor</span>}
                          {credentialsSaved && !isFalborDb && <span className="ml-auto text-green-600 text-[10px] font-bold">Connected</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            handleImprovePrompt()
                            setShowMenu(false)
                          }}
                          disabled={isImproving || !message.trim() || isLoading}
                          className="w-full"
                        >
                          {!isImproving ? (
                            <StarsIcon className="h-4 w-4" />
                          ) : (
                            <Loader className="h-4 w-4 animate-spin" />
                          )}
                          Enhance Prompt
                        </DropdownMenuItem>
                      </>
                    ) : menuMode === "design" ? (
                      <>
                        <DropdownMenuItem onSelect={() => setMenuMode("main")} className="w-full">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </DropdownMenuItem>
                        {designSystems.map((system) => (
                          <DropdownMenuItem
                            key={system.name}
                            onSelect={() => {
                              setSelectedDesign(system.name)
                              setDesignConfig(designPresets[system.name])
                              setShowMenu(false)
                            }}
                            className="w-full"
                          >
                            <div className={`h-4 w-4 rounded mr-2 ${system.previewColor}`} />
                            {system.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedDesign("Custom")
                            setShowDesignModal(true)
                            setShowMenu(false)
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4" />
                          New Design System
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onSelect={() => setMenuMode("main")} className="w-full">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </DropdownMenuItem>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setIsFalborDb(true)
                                  setShowMenu(false)
                                }}
                                className="w-full"
                              >
                                <img src="/icons/falbor.png" className="w-5 h-5" alt="" />
                                Falbor Database
                                {isFalborDb && <Check className="ml-auto h-4 w-4" />}
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Use the Falbor built-in database</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setIsFalborDb(false)
                                  setShowDatabaseModal(true)
                                  setShowMenu(false)
                                }}
                                className="w-full"
                              >
                                <img src="/icons/supabase.png" className="w-5 h-5" alt="" />
                                Connect Supabase
                                {!isFalborDb && credentialsSaved && <Check className="ml-auto h-4 w-4 text-green-600" />}
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Connect your own Supabase database</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setIsFalborDb(false)
                                  setCredentialsSaved(false)
                                  setShowMenu(false)
                                }}
                                className="w-full"
                              >
                                <img src="/icons/database-off.png" className="w-5 h-5" alt="" />
                                Create without Database
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Proceed without connecting any database</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="h-5 w-px bg-gray-300 mx-2" />
              <div className="flex items-center relative" ref={menuRef}>
                <DropdownMenu open={showModelDropdown} onOpenChange={setShowModelDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center cursor-pointer gap-2 px-3 py-1.5 h-7 rounded-md text-sm font-medium BackgroundStyle text-black"
                      disabled={isLoading}
                    >
                      <img src={currentModel.iconUrl || "/placeholder.svg"} alt="" className="w-4 h-4" />
                      <span>{currentModel.label}</span>
                      {currentModel.isPremium && !hasSubscription && (
                        <Crown className="w-4 h-4 text-amber-500 ml-1" />
                      )}
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    side="top"
                    className="w-64 p-0 shadow-xs border"
                  >
                    {/* Claude Agent Title */}
                    <div className="px-2.5 py-1 mt-1 text-xs font-semibold text-muted-foreground">
                      Claude Agent
                    </div>

                    {/* Claude Models */}
                    <div className="p-0.5">
                      {MODEL_OPTIONS.slice(0, 6).map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onSelect={() => handleModelSelect(model.id)}
                          className="flex items-center gap-3 cursor-pointer px-3"
                        >
                          <img src={model.iconUrl} alt={model.label} className="w-4 h-4 rounded" />
                          <span className="flex-1">{model.label}</span>

                          {model.isPremium && !hasSubscription && (
                            <Lock className="w-3 h-3 text-gray-600" />
                          )}

                          {selectedModel === model.id && (
                            <span className="text-xs bg-gray-200 text-gray-900 px-2 py-0.5 rounded-2xl">active</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                    {/* Full-width divider */}
                    <div className="h-px bg-gray-100 w-full m-0 p-0" />

                    {/* Other Models */}
                    <div className="p-0.5">
                      {MODEL_OPTIONS.slice(6).map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onSelect={() => handleModelSelect(model.id)}
                          className="flex items-center gap-3 cursor-pointer px-3"
                        >
                          <img src={model.iconUrl} alt={model.label} className="w-4 h-4 rounded" />
                          <span className="flex-1">{model.label}</span>

                          {selectedModel === model.id && (
                            <span className="text-xs bg-gray-200 text-gray-900 px-2 py-0.5 rounded-2xl">active</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

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
      </form>
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
    </div>
  )
})
export function ChatInput(props: ChatInputProps) {
  return <ChatInputImpl {...props} />
}
