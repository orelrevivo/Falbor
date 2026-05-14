"use client"
import type React from "react"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Languages, Mic, AlertCircle, Palette, StarsIcon, Crown, Lock, Database, ArrowUp, AudioWaveform, AudioLinesIcon, Globe, Rocket, Zap, Cpu, Link2, Wrench, Copy as CopyIcon, ExternalLink } from "lucide-react"
import ReactCountryFlag from "react-country-flag"


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
  Bug,
  Scan,
  Terminal
} from "lucide-react"
import { Link1Icon } from "@radix-ui/react-icons"
import { Switch } from "@/components/ui/switch"
import type { Message } from "@/config/schema"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Editor } from "@monaco-editor/react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SupabaseConnectModal } from "@/components/models/supabase-connect-modal"
import { GoogleDriveModal } from "@/components/models/google-drive-modal"
import { GoogleMapsModal } from "@/components/models/google-maps-modal"
import { getMcpConnections } from "@/app/actions/mcp"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SkillSelector } from "@/components/chat/SkillSelector"
import { useWorkbench } from "@/lib/workbench-context"
import * as LucideIcons from "lucide-react"

const LANGUAGES = [
  { name: "Hebrew", code: "IL" },
  { name: "English", code: "US" },
  { name: "Mandarin Chinese", code: "CN" },
  { name: "Hindi", code: "IN" },
  { name: "Spanish", code: "ES" },
  { name: "French", code: "FR" },
  { name: "Modern Standard Arabic", code: "SA" },
  { name: "Bengali", code: "BD" },
  { name: "Portuguese", code: "PT" },
  { name: "Russian", code: "RU" },
  { name: "Urdu", code: "PK" },
  { name: "Indonesian", code: "ID" },
  { name: "German", code: "DE" },
  { name: "Japanese", code: "JP" },
  { name: "Nigerian Pidgin", code: "NG" },
  { name: "Marathi", code: "IN" },
  { name: "Telugu", code: "IN" },
  { name: "Turkish", code: "TR" },
  { name: "Tamil", code: "IN" },
  { name: "Yue Chinese (Cantonese)", code: "CN" },
  { name: "Vietnamese", code: "VN" },
  { name: "Tagalog", code: "PH" },
  { name: "Wu Chinese", code: "CN" },
  { name: "Korean", code: "KR" },
  { name: "Iranian Persian", code: "IR" },
  { name: "Hausa", code: "NG" },
  { name: "Swahili", code: "TZ" },
  { name: "Javanese", code: "ID" },
  { name: "Italian", code: "IT" },
  { name: "Punjabi (Western)", code: "PK" },
  { name: "Kannada", code: "IN" },
  { name: "Gujarati", code: "IN" },
  { name: "Thai", code: "TH" },
  { name: "Amharic", code: "ET" },
  { name: "Bhojpuri", code: "IN" },
  { name: "Southern Min (Hokkien)", code: "CN" },
  { name: "Jin Chinese", code: "CN" },
  { name: "Yoruba", code: "NG" },
  { name: "Hakka Chinese", code: "CN" },
  { name: "Burmese", code: "MM" },
  { name: "Oromo", code: "ET" },
  { name: "Pashto", code: "AF" },
  { name: "Maithili", code: "IN" },
  { name: "Ukrainian", code: "UA" },
  { name: "Sundanese", code: "ID" },
  { name: "Polish", code: "PL" },
  { name: "Malayalam", code: "IN" },
  { name: "Xiang Chinese", code: "CN" },
  { name: "Malay", code: "MY" },
  { name: "Igbo", code: "NG" },
  { name: "Northern Uzbek", code: "UZ" },
  { name: "Sindhi", code: "PK" },
  { name: "Azerbaijani", code: "AZ" },
  { name: "Romanian", code: "RO" },
  { name: "Dutch", code: "NL" },
  { name: "Nepali", code: "NP" },
  { name: "Zhuang", code: "CN" },
  { name: "Saraiki", code: "PK" },
  { name: "Sinhala", code: "LK" },
  { name: "Chittagonian", code: "BD" },
  { name: "Greek", code: "GR" },
  { name: "Hungarian", code: "HU" },
  { name: "Czech", code: "CZ" },
  { name: "Zulu", code: "ZA" },
  { name: "Sylheti", code: "BD" },
  { name: "Madurese", code: "ID" },
  { name: "Somali", code: "SO" },
  { name: "Hmong", code: "CN" },
  { name: "Rwandan", code: "RW" },
  { name: "Bemba", code: "ZM" },
  { name: "Swedish", code: "SE" },
  { name: "Ilocano", code: "PH" },
  { name: "Quechua", code: "PE" },
  { name: "Shona", code: "ZW" },
  { name: "Uyghur", code: "CN" },
  { name: "Hiligaynon", code: "PH" },
  { name: "Mossi", code: "BF" },
  { name: "Xhosa", code: "ZA" },
  { name: "Belarusian", code: "BY" },
  { name: "Balochi", code: "PK" },
  { name: "Konkani", code: "IN" },
  { name: "Kikuyu", code: "KE" },
  { name: "Kapampangan", code: "PH" },
  { name: "Batak", code: "ID" },
  { name: "Wolof", code: "SN" },
  { name: "Nama", code: "NA" },
  { name: "Tigrinya", code: "ER" },
  { name: "Bulgarian", code: "BG" },
  { name: "Danish", code: "DK" },
  { name: "Finnish", code: "FI" },
  { name: "Slovak", code: "SK" },
  { name: "Norwegian", code: "NO" },
  { name: "Turkmen", code: "TM" },
  { name: "Armenian", code: "AM" },
  { name: "Georgian", code: "GE" },
  { name: "Estonian", code: "EE" },
  { name: "Lithuanian", code: "LT" },
  { name: "Latvian", code: "LV" },
  { name: "Slovenian", code: "SI" },
  { name: "Albanian", code: "AL" }
]

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle
  return <IconComponent className={className} />
}
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
  disabled?: boolean
  initialMessage?: string
  editingMessage?: { id: string; content: string } | null
  sessionId?: string
  onCancelEdit?: () => void
  onSaveEdit?: (id: string, content: string) => void
  role?: "viewer" | "editor" | "admin"
}
interface BalanceData {
  subscriptionTier: string
  balance?: number
  secondsUntilNextRegen?: number
  dailyMessageCount?: number
  secondsUntilDailyReset?: number
}
export interface ChatInputRef {
  insertPrompt: (prompt: string) => void
}
interface ModelOption {
  id: string
  label: string
  isPremium: boolean
  iconUrl: string
  description?: string
  shortDescription?: string
  soon?: boolean
  subModels?: { id: string; label: string; iconUrl: string; color: string }[]
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
  {
    id: "claude-opus-4.6-fast",
    label: "Falbor 2.0 Max",
    shortDescription: "Teams engines",
    isPremium: true,
    iconUrl: "/icons/FalmodelsMAX.png",
    description: "Fast mode consumes tokens significantly faster than other models. Monitor your usage closely."
  },
  {
    id: "gpt-5",
    label: "Falbor 1.0 Pro",
    shortDescription: "Pro subscribers",
    isPremium: true,
    iconUrl: "/icons/FalmodelsMed.png",
    description: "OpenAI's state-of-the-art flagship model with unmatched reasoning and coding intelligence."
  },
  {
    id: "gpt-4o-mini",
    label: "Falbor 1.0",
    shortDescription: "Free engines",
    isPremium: false,
    iconUrl: "/icons/Falmodels.png",
    description: "A fast, simple, and affordable model—expandable for complex tasks."
  },
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
  neonUrl?: string
  neonApiKey?: string
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
    initialModel = "gpt-5",
    connected = false,
    onCloseIdeas,
    isAutomated = false,
    previewError,
    onDismissError,
    onOpenDatabase,
    externalIsLoading = false,
    onStop,
    messages = [],
    initialMessage,
    editingMessage,
    onCancelEdit,
    onSaveEdit,
    sessionId = "main",
    role = "admin"
  },
  ref,
) {
  const { pluginRegistry } = useWorkbench()
  const isViewer = role === "viewer"
  const [message, setMessage] = useState(initialMessage || "")
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

  // Only enforce tier restrictions when balance data loads or on mount
  useEffect(() => {
    if (!balanceData) return

    const tier = balanceData?.subscriptionTier || "none"
    const model = MODEL_OPTIONS.find(m => m.id === selectedModel)

    // Only force reset if the CURRENTLY selected model is strictly forbidden by the tier
    if (tier === "none" || tier === "standard") {
      if (model?.isPremium && selectedModel !== "ollama/glm-4.7-flash") {
        // We don't force reset here anymore to allow the user to see the premium model UI 
        // and upgrade alert. The submission logic already blocks actual use.
        // But we initialize to the free model if nothing is selected or if it's a cold start.
      }
    }
  }, [balanceData?.subscriptionTier])

  const [isAutoSelected, setIsAutoSelected] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<string>("vite")
  const [showFrameworkHover, setShowFrameworkHover] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuMode, setMenuMode] = useState<"main" | "design">("main")
  const [showDatabaseHover, setShowDatabaseHover] = useState(false)
  const [showModelHover, setShowModelHover] = useState(false)
  const [isFalborDb, setIsFalborDb] = useState(false)
  const [isNeonDb, setIsNeonDb] = useState(false)
  const [showDesignModal, setShowDesignModal] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null)
  const [designConfig, setDesignConfig] = useState<DesignConfig | null>(null)
  const [isDesignActive, setIsDesignActive] = useState(false)
  const [tempConfig, setTempConfig] = useState<DesignConfig>(designPresets["Base"])
  const [showPremiumAlert, setShowPremiumAlert] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showDatabaseModal, setShowDatabaseModal] = useState(false)
  const [databaseCredentials, setDatabaseCredentials] = useState<DatabaseCredentials>({ supabaseUrl: "", anonKey: "" })
  const [isSavingCredentials, setIsSavingCredentials] = useState(false)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])


  const [pendingSubmitData, setPendingSubmitData] = useState<{
    userMessage: string
    selectedImage: { data: string; mimeType: string } | null
    isDiscussMode: boolean
    selectedModel: string
    isAutomated: boolean
    isFalborDb: boolean
    isNeonDb: boolean
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

  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([])

  const [isLoadingConnection, setIsLoadingConnection] = useState(true)
  const [showTaskPanel, setShowTaskPanel] = useState(true)
  const [tasks, setTasks] = useState<{ text: string; status: "success" | "loading" | "pending" }[]>([])
  const tasksKey = projectId ? `chat-tasks-${projectId}` : "chat-tasks-global"
  const [showUrlHover, setShowUrlHover] = useState(false)
  const [captureUrlInput, setCaptureUrlInput] = useState("")
  const [showErrorPanel, setShowErrorPanel] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerLogs, setScannerLogs] = useState<{ text: string; status: "success" | "loading" | "pending" }[]>([])
  const [planMode, setPlanMode] = useState(false)
  const [showSkillSelector, setShowSkillSelector] = useState(false)
  const [dailyResetTimer, setDailyResetTimer] = useState<number>(0)
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1)
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false)
  const [showMapsModal, setShowMapsModal] = useState(false)
  const [showCloneDropdown, setShowCloneDropdown] = useState(false)
  const [showClonePanel, setShowClonePanel] = useState(false)
  const [cloneUrl, setCloneUrl] = useState("")
  const [isCloning, setIsCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [clonedUrl, setClonedUrl] = useState("")
  const [showTranslateModal, setShowTranslateModal] = useState(false)
  const [translateStep, setTranslateStep] = useState<'record' | 'language' | 'processing'>('record')
  const [recordedTranscript, setRecordedTranscript] = useState("")
  const [translateSourceLang, setTranslateSourceLang] = useState("Hebrew")
  const [isTranslatingText, setIsTranslatingText] = useState(false)
  const translationRecognitionRef = useRef<any>(null)
  const translationLastTranscriptRef = useRef("")

  const cloneDropdownRef = useRef<HTMLDivElement>(null)

  // Translation auto-record logic
  useEffect(() => {
    if (showTranslateModal && translateStep === 'record') {
      startTranslationRecording()
    } else {
      stopTranslationRecording()
    }

    return () => {
      stopTranslationRecording()
    }
  }, [showTranslateModal, translateStep])

  // Close clone dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cloneDropdownRef.current && !cloneDropdownRef.current.contains(event.target as Node)) {
        setShowCloneDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Simple clone text insert — backend does all the heavy lifting
  const handleInsertCloneText = () => {
    if (isLoading || isViewer) return
    setShowCloneModal(true)
    setShowCloneDropdown(false)
  }

  const handleSelectMapsBusiness = (businessInfo: string) => {
    setMessage(prev => (prev ? `${prev}\n\n${businessInfo}` : businessInfo))
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }, 0)
    setIsActive(true)
  }

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

    // MCP Scan
    if (content.match(/<Scan>([\s\S]*?)<\/Scan>/i)) {
      logs.push({ text: "Account connection context analyzed.", status: "success" })
    } else if (content.toLowerCase().includes("<scan>")) {
      logs.push({ text: "Scanning connection context...", status: "loading" })
    }

    // Capability Discovery
    if (content.match(/<Discover(Gmail|Discord|Messenger)Tools>([\s\S]*?)<\/Discover(Gmail|Discord|Messenger)Tools>/i)) {
      logs.push({ text: "Discovered platform capabilities.", status: "success" })
    } else if (content.match(/<Discover(Gmail|Discord|Messenger)Tools>/i)) {
      logs.push({ text: "Fetching available tools...", status: "loading" })
    }

    // Execution / Retrieval
    if (content.match(/<Test(Gmail|Discord|Messenger)Tools>([\s\S]*?)<\/Test(Gmail|Discord|Messenger)Tools>/i)) {
      logs.push({ text: "Operation executed successfully.", status: "success" })
    } else if (content.match(/<Test(Gmail|Discord|Messenger)Tools>/i)) {
      logs.push({ text: "Executing tool call...", status: "loading" })
    }

    // Internet Search
    if (content.match(/<InternetSearch>([\s\S]*?)<\/InternetSearch>/i)) {
      logs.push({ text: "External information retrieved.", status: "success" })
    } else if (content.toLowerCase().includes("<internetsearch>")) {
      logs.push({ text: "Searching knowledge base...", status: "loading" })
    }

    // Terminal Commands
    if (content.match(/<Terminal>([\s\S]*?)<\/Terminal>/i)) {
      logs.push({ text: "Command execution complete.", status: "success" })
    } else if (content.toLowerCase().includes("<terminal>")) {
      logs.push({ text: "Running system command...", status: "loading" })
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
      handleSubmit(undefined, scanPrompt, true)
    } else {
      const fixPrompt = `I'm getting this error in ${errorFile}: "${errorMsg}". Please fix it by updating ONLY the relevant file.`
      handleSubmit(undefined, fixPrompt, true)
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
        // Broadcast tasks to FeatureShowcaseDark in the code preview panel
        window.dispatchEvent(new CustomEvent('falbor-tasks-update', { detail: { tasks: tasksList } }))
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

  // Hook up internal submit to global falbor object
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).falbor) {
      (window as any).falbor._internalSubmit = (prompt: string, isAutomated = false) => {
        handleSubmit(undefined, prompt, isAutomated)
      }
      (window as any).falbor._currentMessages = messages
    }
  }, [messages])
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft && savedDraft.trim()) {
      setMessage(savedDraft)
    }

    // Check for auto-prompt from MCP page
    const autoPrompt = localStorage.getItem("falbor_auto_prompt")
    if (autoPrompt) {
      localStorage.removeItem("falbor_auto_prompt")
      // Short delay to ensure component is fully ready
      setTimeout(() => {
        handleSubmit(undefined, autoPrompt)
      }, 500)
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
    if (editingMessage) {
      setMessage(editingMessage.content)
      textareaRef.current?.focus()
    }
  }, [editingMessage])

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
  const createProject = async (withCredentials: boolean, data?: any) => {
    const submitData = data || pendingSubmitData
    if (!submitData) return
    setIsLoading(true)

    let supabaseUrl = ""
    let anonKey = ""
    let serviceRoleKey = ""
    let projectRef = ""
    let dbPassword = ""

    try {
      if (submitData.isFalborDb) {
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

      let neonUrl = ""
      let neonPassword = ""
      let neonProjectRef = ""

      if (submitData.isNeonDb) {
        setIsProvisioning(true)
        try {
          const provRes = await fetch("/api/neon/provision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: `project-${Math.random().toString(36).slice(2, 10)}` })
          })

          if (!provRes.ok) {
            const err = await provRes.json().catch(() => ({}))
            throw new Error(err.error || "Failed to provision Neon database")
          }

          const creds = await provRes.json()

          if (!creds.databaseUrl) {
            throw new Error("Neon connection URL was not returned. Please try again or check your Neon console.")
          }

          neonUrl = creds.databaseUrl
          neonPassword = creds.dbPassword
          neonProjectRef = creds.projectRef

          setDatabaseCredentials(prev => ({
            ...prev,
            neonUrl: creds.databaseUrl,
            neonApiKey: creds.dbPassword
          }))

          console.log("[ChatInput] Neon provisioned successfully. Proceeding to project creation.")
        } catch (error) {
          console.error("[ChatInput] Neon provision failed:", error)
          alert(error instanceof Error ? error.message : "Database setup failed. Please check your Neon configuration.")
          setIsLoading(false)
          setIsProvisioning(false)
          return // STOP everything here
        } finally {
          setIsProvisioning(false)
        }
      }

      if (!submitData.isAutomated) {
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
        await refetchBalance()
      }
      localStorage.removeItem(draftKey)
      localStorage.removeItem(filesKey)
      localStorage.removeItem(pastedKey)
      setMessage("")
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
      setClonedUrl("")
      setIsDesignActive(false)


      const body: any = {
        message: submitData.userMessage,
        imageData: submitData.selectedImage,
        uploadedFiles: null,
        discussMode: submitData.isDiscussMode,
        isAutomated: submitData.isAutomated,
        selectedModel: submitData.selectedModel,
        isFalborDb: submitData.isFalborDb,
        isNeonDb: submitData.isNeonDb,
        selectedFramework: submitData.selectedFramework,
      }

      // Inject credentials directly into the project creation (so they are saved immediately)
      if (submitData.isFalborDb) {
        body.supabaseUrl = supabaseUrl
        body.anonKey = anonKey
        body.serviceRoleKey = serviceRoleKey
        body.projectRef = projectRef
        body.dbPassword = dbPassword

        // Also inject into the first message content so it's visible in history
        body.message += `\n\n## Database Connection (Managed by Falbor)\nDatabase provisioned successfully.\nVITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`
      } else if (submitData.isNeonDb) {
        body.neonUrl = neonUrl
        body.neonPassword = neonPassword
        body.neonProjectRef = neonProjectRef

        // Also inject into the first message content so it's visible in history
        body.message += `\n\n## Database Connection (Managed by Falbor Max)\nNeon project provisioned successfully.\nDATABASE_URL=${neonUrl}`
      } else if (withCredentials || credentialsSaved) {
        if (databaseCredentials.supabaseUrl) {
          body.supabaseUrl = databaseCredentials.supabaseUrl
          body.anonKey = databaseCredentials.anonKey
        }
        if (databaseCredentials.neonUrl) {
          body.neonUrl = databaseCredentials.neonUrl
        }
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
      const redirectPath = planMode ? `/chat/${newId}/plan` : `/chat/${newId}`
      if (typeof window !== "undefined" && !window.crossOriginIsolated) {
        window.location.href = redirectPath
      } else {
        router.push(redirectPath)
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
      setDailyResetTimer((prev) => {
        if (prev > 0) return prev - 1
        return 0
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user?.id, isLoaded])

  useEffect(() => {
    if (balanceData?.secondsUntilDailyReset) {
      setDailyResetTimer(balanceData.secondsUntilDailyReset)
    }
  }, [balanceData])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isDailyLimitReached = balanceData?.subscriptionTier === 'none' && (balanceData?.dailyMessageCount || 0) >= 5 && dailyResetTimer > 0
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
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

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

  const startTranslationRecording = async () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.")
      return
    }
    try {
      const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognitionConstructor()
      recognition.continuous = true
      recognition.interimResults = true
      // We set a generic lang, or the user can choose. Standard behavior is to use browser default.
      recognition.lang = navigator.language || "en-US"

      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript
        }
        setRecordedTranscript(transcript)
      }
      recognition.onerror = (event: any) => {
        console.error("Translation record error:", event.error)
        stopTranslationRecording()
      }
      recognition.start()
      translationRecognitionRef.current = recognition
    } catch (err) {
      console.error("Failed to start translation recording:", err)
    }
  }

  const stopTranslationRecording = () => {
    translationRecognitionRef.current?.stop()
    translationRecognitionRef.current = null
  }

  const handleTranslate = async () => {
    if (!recordedTranscript.trim()) return
    setIsTranslatingText(true)
    setTranslateStep('processing')
    try {
      const res = await fetch("/api/chat/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: recordedTranscript,
          targetLanguage: "English"
        }),
      })
      const data = await res.json()
      if (data.translatedText) {
        setMessage(data.translatedText)
        localStorage.setItem(draftKey, data.translatedText)
        setShowTranslateModal(false)
        setTranslateStep('record')
        setRecordedTranscript("")
      }
    } catch (err) {
      console.error("Translation failed:", err)
      alert("Translation failed. Please try again.")
      setTranslateStep('language')
    } finally {
      setIsTranslatingText(false)
    }
  }
  useEffect(() => {
    if (showDesignModal) {
      setTempConfig(designConfig ?? designPresets["Base"])
    }
  }, [showDesignModal, designConfig])
  // Map of Ollama frontend IDs to actual Ollama model tags (must mirror OLLAMA_MODELS in route.ts)
  const OLLAMA_MODEL_MAP: Record<string, string> = {
    "ollama/glm-4.7-flash": "glm-4.7-flash:latest",
    "ollama/gemma4-31b": "gemma4:31b",
  }

  const handleModelSelect = async (modelId: string) => {
    const model = MODEL_OPTIONS.find((m) => m.id === modelId)
    if (!model) return

    const tier = balanceData?.subscriptionTier || "none"

    if (model.id === "claude-opus-4.6-fast" && tier !== "teams") {
      alert("Falbor 2.0 Max is exclusive to Teams subscribers.")
      return
    }

    if (model.id === "gpt-5" && tier !== "pro" && tier !== "teams") {
      alert("Falbor 1.0 Pro is exclusive to Pro subscribers.")
      return
    }

    if (model.isPremium && !hasSubscription) {
      setShowPremiumAlert(true)
      return
    }

    setSelectedModel(modelId)
    setIsAutoSelected(false) // Reset auto-selected when manually selecting a model
    setShowModelDropdown(false)

    // If selecting an Ollama model, fire a background warmup to pre-load into VRAM
    if (OLLAMA_MODEL_MAP[modelId]) {
      console.log(`[ChatInput] Warming up Ollama model: ${OLLAMA_MODEL_MAP[modelId]}`)

      const triggerWarmup = async () => {
        try {
          // 1. Try server-side warmup first (works on localhost)
          const res = await fetch("/api/ollama-warmup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: OLLAMA_MODEL_MAP[modelId] }),
          })

          if (res.ok) {
            console.log("[ChatInput] Ollama model warmed up via server")
            return
          }

          // 2. If server-side fails (common on production domains), try client-side direct ping
          // This only works if the user has OLLAMA_ORIGINS set up, but it's better than a 502 error.
          console.log("[ChatInput] Server-side warmup failed or unavailable, trying client-side ping...")
          const clientRes = await fetch("https://wad-animosity-pellet.ngrok-free.dev/api/tags", { headers: { "ngrok-skip-browser-warning": "true" } }).catch(() => null)
          if (clientRes?.ok) {
            console.log("[ChatInput] Ollama detected locally via client-side ping")
          }
        } catch (err) {
          console.warn("[ChatInput] Ollama warmup/detection failed:", err)
        }
      }

      triggerWarmup()
    }

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

  // Auto Model: intelligently pick best model based on the current prompt content
  const handleAutoModelSelect = async () => {
    const prompt = message.trim().toLowerCase()
    let pickedModel = "gemini" // default fallback

    // Complexity indicators
    const complexIndicators = [
      "complex", "architecture", "advanced", "optimize", "refactor",
      "typescript", "professional", "enterprise", "scalable", "microservices",
      "database", "authentication", "payment", "integration", "api",
      "dashboard", "analytics", "real-time", "websocket", "collaborative",
      "e-commerce", "marketplace", "social network", "saas", "platform",
      "machine learning", "ai", "algorithm", "data processing", "etl",
      "high-performance", "concurrent", "distributed", "cloud", "serverless"
    ]

    const simpleIndicators = [
      "simple", "basic", "landing page", "portfolio", "blog", "static",
      "minimal", "quick", "prototype", "mvp", "demo", "personal", "resume",
      "brochure", "showcase", "gallery", "single page", "spa simple",
      "todo", "calculator", "converter", "timer", "notes", "diary"
    ]

    const dataAnalysisIndicators = [
      "data", "analysis", "research", "report", "compare", "visualization",
      "chart", "graph", "statistics", "metrics", "insights", "trends",
      "survey", "poll", "dataset", "csv", "excel", "processing"
    ]

    const creativeIndicators = [
      "creative", "design", "beautiful", "stunning", "modern", "elegant",
      "animated", "interactive", "3d", "visual", "aesthetic", "polished",
      "premium", "luxury", "artistic", "unique", "custom", "branded"
    ]

    const codeHeavyIndicators = [
      "full-stack", "backend", "frontend", "react", "vue", "angular", "svelte",
      "nextjs", "nuxt", "express", "fastapi", "django", "rails", "laravel",
      "graphql", "rest api", "oauth", "jwt", "stripe", "paypal",
      "aws", "gcp", "azure", "docker", "kubernetes", "ci/cd"
    ]

    // Count matches for each category
    const complexScore = complexIndicators.filter(word => prompt.includes(word)).length
    const simpleScore = simpleIndicators.filter(word => prompt.includes(word)).length
    const dataScore = dataAnalysisIndicators.filter(word => prompt.includes(word)).length
    const creativeScore = creativeIndicators.filter(word => prompt.includes(word)).length
    const codeScore = codeHeavyIndicators.filter(word => prompt.includes(word)).length

    // Determine the best model based on scores and prompt characteristics
    const hasSubscription = balanceData?.subscriptionTier !== "none"

    if (simpleScore > 0 && complexScore === 0 && codeScore === 0) {
      // Simple projects - use fast, efficient models
      pickedModel = "gemini"
    } else if (dataScore > 0 || prompt.includes("analysis") || prompt.includes("report")) {
      // Data analysis tasks
      pickedModel = hasSubscription ? "claude-haiku-4.5" : "glm-4.5-flash"
    } else if (creativeScore > 0 && complexScore === 0) {
      // Creative but simple projects
      pickedModel = "claude-sonnet-4.6"
    } else if (complexScore >= 2 || codeScore >= 2) {
      // Complex projects - use best available models
      if (hasSubscription) {
        // Premium users get the best models for complex tasks
        if (complexScore >= 4 || codeScore >= 3) {
          pickedModel = "claude-opus-4.6" // Most capable for very complex tasks
        } else {
          pickedModel = "claude-sonnet-4.6" // Great balance for complex tasks
        }
      } else {
        // Free users get capable but lighter models
        pickedModel = "claude-sonnet-4.6"
      }
    } else if (complexScore === 1 || codeScore === 1) {
      // Moderately complex
      pickedModel = hasSubscription ? "claude-sonnet-4.6" : "gpt-5.2"
    } else if (prompt.length > 500) {
      // Long, detailed prompts suggest complexity
      pickedModel = hasSubscription ? "claude-sonnet-4.6" : "gemini"
    } else {
      // Default for unclear cases
      pickedModel = "gemini"
    }

    // Special cases for specific project types
    if (prompt.includes("game") || prompt.includes("three.js") || prompt.includes("webgl")) {
      pickedModel = hasSubscription ? "claude-opus-4.6" : "claude-sonnet-4.6"
    } else if (prompt.includes("mobile app") || prompt.includes("react native") || prompt.includes("flutter")) {
      pickedModel = hasSubscription ? "claude-sonnet-4.6" : "gpt-5.2"
    } else if (prompt.includes("chatbot") || prompt.includes("ai assistant") || prompt.includes("llm")) {
      pickedModel = hasSubscription ? "claude-opus-4.6" : "claude-sonnet-4.6"
    }

    await handleModelSelect(pickedModel)
    setIsAutoSelected(true) // Mark as auto-selected
    setShowModelHover(false)
    setShowMenu(false)
  }
  const parseAndSetPendingMigrations = (content: string) => {
    const migrations: string[] = []
    // Match both Supabase migrations and Neon schema files
    const regex = /```sql\s*file="(?:supabase\/migrations\/|lib\/db\/)[^"]+"\s*([\s\S]*?)```/g
    let match
    while ((match = regex.exec(content)) !== null) {
      migrations.push(match[1].trim())
    }
    setPendingMigrations(migrations)
  }
  const handleExecuteMigrations = async () => {
    const isNeon = !!databaseCredentials.neonUrl
    if (!isNeon && !tempAccessToken) return

    setIsSavingCredentials(true)
    try {
      for (const sql of pendingMigrations) {
        const res = await fetch(`/api/projects/${projectId}/execute-sql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sql,
            accessToken: isNeon ? "neon-handled" : tempAccessToken
          }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to execute migration")
        }
      }
      alert("Database schema updated successfully!")
      setPendingMigrations([])
      setShowTokenModal(false)
      setTempAccessToken("")
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsSavingCredentials(false)
    }
  }
  const handleSubmit = async (e?: React.FormEvent, textOverride?: string, isAutomatedOverride = false) => {
    e?.preventDefault()
    if (isLoading || isListening) return

    if (editingMessage && onSaveEdit) {
      onSaveEdit(editingMessage.id, message)
      return
    }

    const submitText = (typeof textOverride === "string" ? textOverride : message) || ""
    const hasAttachments = uploadedFiles.length > 0 || pastedContents.length > 0 || !!selectedImage || (isDesignActive && designConfig) || !!clonedUrl
    if (!submitText.toString().trim() && !hasAttachments)
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

    // Special handling for Auto-Fix prompts to ensure the AI applies the fix directly
    const isAutoFixMessage = userMessage.includes("Terminal Error Detected") || userMessage.includes("AUTOMATIC ERROR FIX");
    if (isAutoFixMessage) {
      userMessage += `\n\n[CRITICAL SYSTEM INSTRUCTION]: You are in AUTO-FIX mode. You must fix the terminal error by providing the full updated content for the problematic file(s). Use a markdown code block with the 'file="path/to/file"' attribute. Do NOT provide an explanation or commentary. ONLY provide the fixed code blocks. This is necessary to apply the fix automatically to the workbench.`;
    }

    // Build context prefix: images, files, pastes, DB, design, clone
    let contextPrefix = "";

    if (pastedContents.length > 0) {
      contextPrefix += pastedContents.map((p) => `\n[PASTED_CONTENT_START]\n${p.content}\n[PASTED_CONTENT_END]`).join("\n")
    }

    if (clonedUrl) {
      const clonePrefix = "Build a site like this one: ";
      if (!userMessage.startsWith(clonePrefix)) {
        userMessage = `${clonePrefix}${clonedUrl}\n${userMessage}`;
      }
      contextPrefix += `\n[CLONE_URL:${clonedUrl}]\nInstruction: You are tasked with recreating the design and structure of this website. Please perform a comprehensive analysis of the target URL as previous data may have changed. Replicate the UI faithfully based on the current state of the site.`;
    }

    if (uploadedFiles.length > 0) {
      const fileSections = uploadedFiles
        .map(
          (file) =>
            `\n\n## File: ${file.name}\n\`\`\`${file.type.split("/")[1] || "text/plain"}\n${file.content}\n\`\`\``,
        )
        .join("")
      contextPrefix += fileSections
    }

    userMessage = userMessage + contextPrefix;

    // Append database before design to ensure design is the last section
    if (credentialsSaved && databaseCredentials.supabaseUrl && databaseCredentials.anonKey) {
      userMessage += `\n\n## Database Connection\nVITE_SUPABASE_URL=${databaseCredentials.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${databaseCredentials.anonKey}`
    }
    if (credentialsSaved && databaseCredentials.neonUrl) {
      userMessage += `\n\n## Database Connection (Neon)\nDATABASE_URL=${databaseCredentials.neonUrl}`
    }
    if (isDesignActive && designConfig && !message.includes("Capture from URL:")) {
      userMessage += `\n\n## Design System: ${selectedDesign || "Custom"}\n${JSON.stringify(designConfig, null, 2)}`
    }
    if (!projectId) {
      const submitData = {
        userMessage,
        selectedImage: selectedImage ? { ...selectedImage } : null,
        isDiscussMode,
        selectedModel,
        isAutomated,
        isFalborDb,
        isNeonDb,
        selectedFramework,
      }
      setPendingSubmitData(submitData)

      // Automatically send message without asking about database
      await createProject(isFalborDb || isNeonDb, submitData)
      return
    }

    // If plan mode is enabled on landing flow, create project first then redirect in createProject()
    setIsLoading(true)
    try {
      if (!isAutomatedOverride || isAutoFixMessage) {
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
      setIsDesignActive(false)
      setClonedUrl("")
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
          isAutomated: isAutomatedOverride,
          tokensUsed: null,
          cost: null,
          sessionId,
          imageData: null,
          metadata: null,
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
          sessionId,
          imageData: null,
          metadata: null,
        }
        onNewMessage(tempAssistant)
        if ((window as any).falbor?.setIsAiStreaming) (window as any).falbor.setIsAiStreaming(true);
        console.log(`[ChatInput] Sending message with model: ${selectedModel}`)
        abortControllerRef.current = new AbortController()
        try {
          const tier = balanceData?.subscriptionTier || "none"
          const effectiveModel = (tier === "none" || tier === "standard") ? "ollama/glm-4.7-flash" : selectedModel
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
              selectedModel: effectiveModel,
              selectedMcps: selectedMcpIds.map(id => mcpConnections.find(c => c.id === id)).filter(Boolean),
              sessionId,
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
          let currentMetadata: any = null
          let syncedUserMessageId: string | null = null

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

                    // Sync user message ID if received (heartbeat or done)
                    if (data.userMessageId && !syncedUserMessageId) {
                      syncedUserMessageId = data.userMessageId
                      onNewMessage({
                        ...tempUser,
                        id: data.userMessageId,
                        sessionId
                      })
                    }

                    // Capture metadata (heartbeat or done)
                    if (data.metadata) {
                      currentMetadata = data.metadata
                    }

                    if (data.cloneScreenshot) {
                      const screenshotMd = `🖼️ **Captured Screenshot of [${data.cloneUrl || "target site"}](${data.cloneUrl || ""})**\n\n<clone-screenshot src="${data.cloneScreenshot}" />\n\n---\n\n`
                      accumulated = screenshotMd
                      onNewMessage({
                        ...tempAssistant,
                        content: accumulated,
                        id: tempAssistantId,
                        isAutomated: false,
                        metadata: currentMetadata,
                      })
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
                        metadata: currentMetadata,
                      })
                    }

                    if (data.done) {
                      console.log("[ChatInput] Received done signal, message ID:", data.messageId)

                      // Final assistant message
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
                        sessionId,
                        imageData: data.imageData || null,
                        metadata: data.metadata || currentMetadata,
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
        const tier = balanceData?.subscriptionTier || "none"
        const effectiveModel = (tier === "none" || tier === "standard") ? "ollama/glm-4.7-flash" : selectedModel
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
            selectedModel: effectiveModel,
            selectedMcps: selectedMcpIds.map(id => mcpConnections.find(c => c.id === id)).filter(Boolean),
            sessionId,
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
      if ((window as any).falbor?.setIsAiStreaming) (window as any).falbor.setIsAiStreaming(false)
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === "Escape" && showSkillSelector) {
      setShowSkillSelector(false)
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
      {/* bg-[#dbd9d9b2] p-[5px] rounded-[12px] */}
      <div className={hasSubscription ? "" : ""}>
        <form
          onSubmit={handleSubmit}
          className={cn(
            "relative p-1 rounded-lg border border-border/50 shadow-sm transition-all",
            "bg-card dark:bg-[#2C2C30] text-foreground"
          )}
          style={{
            transition: "background-image 200ms ease",
            backgroundImage: `
              linear-gradient(var(--chat-background, var(--card)), var(--chat-background, var(--card))),
              /* TOP border (colored section only) */
              linear-gradient(
                to right,
                ${isActive ? "#0099ff" : "var(--border)"} 0%,
                rgba(0, 153, 255, ${isActive ? "1" : "0.45"}) 18%,
                rgba(0, 153, 255, ${isActive ? "0.85" : "0.25"}) 35%,
                rgba(219, 219, 217, 0.7) 50%,
                var(--border) 60%
              ),
              /* LEFT border (colored section only) */
              linear-gradient(
                to bottom,
                ${isActive ? "#0099ff" : "var(--border)"} 0%,
                rgba(0, 153, 255, ${isActive ? "1" : "0.45"}) 22%,
                rgba(0, 153, 255, ${isActive ? "0.85" : "0.25"}) 40%,
                rgba(219, 219, 217, 0.7) 55%,
                var(--border) 65%
              )
            `,
            backgroundOrigin: "padding-box, border-box, border-box",
            backgroundClip: "padding-box, border-box, border-box",
          }}
        >
          {showSkillSelector && (
            <SkillSelector
              isOpen={showSkillSelector}
              onClose={() => setShowSkillSelector(false)}
              showMcp={true}
              onSelect={(type, value, fullData) => {
                const before = message.slice(0, mentionStartIndex)
                const after = message.slice(textareaRef.current?.selectionStart || 0)
                let newValue = ""
                if (type === 'skill') {
                  newValue = value
                } else if (type === 'mcp') {
                  newValue = `@${value}`
                } else if (type === 'template') {
                  newValue = `@${value}`
                }
                setMessage(before + newValue + after)
                setShowSkillSelector(false)
                textareaRef.current?.focus()
              }}
            />
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
              {/* <Button
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
                      <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Generating...
                    </Badge>
                  )}

                </div>
              </Button> */}

              {/* TASK PANEL (SMOOTH GRID ANIMATION) */}
              {/* <div
                className={cn(
                  "grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  showTaskPanel
                    ? "grid-rows-[1fr] opacity-100 translate-y-0"
                    : "grid-rows-[0fr] opacity-0 -translate-y-1"
                )}
              >
                <div className="overflow-hidden">
                  <div className="rounded-b-md bg-white p-2 space-y-1 max-h-32 overflow-y-auto">

                    {tasks.length === 0 && effectiveIsLoading && (
                      <div className="flex items-center gap-3 p-2 rounded-md border bg-gray-50 border-gray-100">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-gray-500">
                          Analyzing your request and planning tasks...
                        </span>
                      </div>
                    )}

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
              </div> */}

            </div>
          )}
          {(uploadedFiles.length > 0 || pastedContents.length > 0 || selectedMcpIds.length > 0 || isDesignActive || clonedUrl) && (
            <div className="flex flex-wrap gap-2 justify-start px-2 pt-2 pb-1 bg-white/50 backdrop-blur-sm">
              {clonedUrl && (
                <Badge
                  variant="secondary"
                  className="gap-2 bg-[#e7e5df] dark:bg-[#2C2C30] text-gray-700 py-1 px-2 pr-1"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${clonedUrl.replace(/https?:\/\//, "")}&sz=32`}
                    className="w-3.5 h-3.5 rounded-sm"
                    alt=""
                  />
                  <span className="truncate max-w-[150px]">{clonedUrl}</span>
                  <button
                    onClick={() => setClonedUrl("")}
                    className="p-0.5 bg-[#e7e5df] dark:bg-[#2C2C30] rounded transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {isDesignActive && designConfig && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 py-1"
                >
                  <Palette className="w-3 h-3" />
                  Design: {selectedDesign || "Custom"}
                  <button
                    onClick={() => setIsDesignActive(false)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}

              {selectedMcpIds.map(id => {
                const mcp = mcpConnections.find(c => c.id === id)
                if (!mcp) return null
                return (
                  <Badge
                    key={id}
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
              if (isViewer) return
              const newMessage = e.target.value
              const cursorPosition = e.target.selectionStart
              setMessage(newMessage)
              localStorage.setItem(draftKey, newMessage)

              // @ Mention Logic
              const textBeforeCursor = newMessage.slice(0, cursorPosition)
              const atIndex = textBeforeCursor.lastIndexOf("@")

              if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " " || textBeforeCursor[atIndex - 1] === "\n")) {
                const afterAt = textBeforeCursor.slice(atIndex + 1)
                if (!afterAt.includes(" ")) {
                  setMentionStartIndex(atIndex)
                  setShowSkillSelector(true)
                } else {
                  setShowSkillSelector(false)
                }
              } else {
                setShowSkillSelector(false)
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
            placeholder={
              isViewer
                ? "Viewing mode - messaging is disabled"
                : isDailyLimitReached
                  ? `Daily message quota reached. Resets in ${formatTime(dailyResetTimer)}`
                  : isDiscussMode ? "Discuss anything..." : placeholder
            }
            className="w-full min-h-[120px] max-h-[120px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground px-2 pt-2 pb-10 text-base outline-none overflow-y-auto field-sizing-content chat-messages-scroll font-light disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || isDailyLimitReached || isViewer}
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-1 bg-[#e7e7e700] rounded-[19px]">
            {editingMessage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="absolute top-1/2 left-7.5 transform -translate-y-1/2 h-7 px-3 text-xs text-foreground BackgroundStyleButton ml-2"
              >
                Cancel
              </Button>
            )}
            {isListening ? (
              <div className="flex-1 relative h-10 mr-2 p-[-14px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-gray-100 rounded" />
              </div>
            ) : (
              <div className="flex items-center">
                <div className="relative flex items-center" ref={menuRef}>
                  <DropdownMenu>
                    {!mounted ? (
                      <div className="h-7 w-7 p-1.5 text-sm cursor-pointer rounded-md BackgroundStyle text-foreground ml-1 transition-all">
                        <Plus className="w-4 h-4" />
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <div
                              className={cn(
                                "h-7 w-7 p-1.5 text-sm cursor-pointer rounded-md BackgroundStyle text-foreground ml-1 transition-all hover:scale-105 active:scale-95",
                                (isLoading || isViewer) && "cursor-not-allowed opacity-50 relative"
                              )}
                            >
                              <Plus className="w-4 h-4" />
                            </div>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isViewer ? "Viewing mode" : "Tools & Attachments"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <DropdownMenuContent
                      side="top"
                      align="start"
                      className="w-48 p-0.5 bg-white dark:bg-[#1E1E21] border border-gray-200 dark:border-white/10 rounded-md shadow-xs z-[100]"
                    >
                      {/* File Upload Button */}
                      <DropdownMenuItem
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-1.5 mb-0.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]"
                      >
                        <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-50 dark:bg-black/20">
                          <img src="/icons/attachment.png" className="w-3 h-3 dark:invert" alt="" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-white/90">Upload File</span>
                      </DropdownMenuItem>

                      {/* Database Button / Submenu */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                          onClick={() => {
                            if (projectId && onOpenDatabase) {
                              onOpenDatabase()
                            }
                          }}
                          className="flex items-center gap-2 px-1.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]"
                        >
                          <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-50 dark:bg-black/20">
                            <img src="/icons/database.png" className="w-3 h-3 dark:hidden" alt="" />
                            <img src="/icons/database-dark.png" className="w-3 h-3 hidden dark:block" alt="" />
                          </div>
                          <span className="font-medium text-gray-700 dark:text-white/90">Data Connections</span>
                        </DropdownMenuSubTrigger>

                        {(!projectId || !onOpenDatabase) && (
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent
                              sideOffset={8}
                              className="w-52 p-1 bg-white dark:bg-[#1E1E21] border border-gray-200 dark:border-white/10 rounded-md shadow-xs"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!hasSubscription) {
                                    setShowPremiumAlert(true);
                                    return;
                                  }
                                  setIsFalborDb(true);
                                  setIsNeonDb(false);
                                }}
                                className="flex items-center gap-2 px-1.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]"
                              >
                                <img src="/icons/falbor.png" className="w-5 h-5" alt="" />
                                <span className={cn(!hasSubscription && "opacity-70")}>Falbor Database</span>
                                <Badge className={cn("text-[10px] h-4 px-1.5", !hasSubscription && "opacity-50")}>Pro</Badge>
                                {!hasSubscription ? (
                                  <Lock className="h-3 w-3 ml-auto text-gray-500" />
                                ) : (
                                  isFalborDb && <Check className="h-3 w-3 ml-auto" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setIsFalborDb(false); setIsNeonDb(false); setShowDatabaseModal(true); }}
                                className="flex items-center gap-2 px-1.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]"
                              >
                                <img src="/icons/supabase.png" className="w-5 h-5" alt="" />
                                <span>Connect Supabase</span>
                                {!isFalborDb && !isNeonDb && credentialsSaved && <Check className="h-3 w-3 ml-auto text-green-600" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setIsFalborDb(false); setIsNeonDb(false); setCredentialsSaved(false); }}
                                className="flex items-center gap-2 px-1.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]"
                              >
                                <img src="/icons/database-off.png" className="w-5 h-5" alt="" />
                                <span>Create without DB</span>
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        )}
                      </DropdownMenuSub>

                      {/* Business Button */}
                      <DropdownMenuItem
                        onClick={() => !message.trim() && setShowMapsModal(true)}
                        disabled={isLoading || message.trim().length > 0}
                        className={cn(
                          "flex items-center gap-2 px-1.5 mb-0.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]",
                          (isLoading || message.trim()) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-50 dark:bg-black/20">
                          <img src="/icons/business-report.png" className="w-3.5 h-3.5 dark:hidden" alt="" />
                          <img src="/icons/business-report-dark.png" className="w-3.5 h-3.5 hidden dark:block" alt="" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-white/90">Business</span>
                      </DropdownMenuItem>
                      {!isImproving && message.trim() && !isLoading && (
                        <DropdownMenuItem
                          onClick={handleImprovePrompt}
                          className={cn(
                            "flex items-center gap-2 px-1.5 mb-0.5 py-1 text-[12px] rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C30]",
                          )}
                        >
                          <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-50 dark:bg-black/20">
                            <img src="/icons/Improving.png" className="w-3.5 h-3.5 dark:hidden" alt="" />
                            <img src="/icons/Improving-dark.png" className="w-3.5 h-3.5 hidden dark:block" alt="" />
                          </div>
                          <span className="font-medium text-gray-700 dark:text-white/90">Enhance prompt</span>
                        </DropdownMenuItem>
                      )}
                      {/* Move Business button here too? The user said "the two buttons", 
                          but typically Business and Clone are part of the toolkit. 
                          Keeping Clone standalone as per current setup unless asked otherwise.
                      */}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Clone Button */}
                  <div className="relative" ref={cloneDropdownRef}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          id="clone-tool-button"
                          onClick={handleInsertCloneText}
                          className={cn(
                            "h-7 w-7 p-1.5 text-sm cursor-pointer rounded-md BackgroundStyle text-foreground ml-1 transition-all hover:scale-105 active:scale-95",
                            isViewer && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <Wrench className="w-4 h-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Build a site like this one</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Business button removed from here, now in Plus menu */}
                  {menuMode === "main" ? (
                    <div className="space-y-0.5">
                      {/* <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => {
                              if (!message.includes("Capture from URL:")) {
                                setMenuMode("design")
                              }
                            }}
                            className={cn("h-7 w-7 p-1.5 text-sm cursor-pointer rounded-md BackgroundStyle text-foreground ml-1", isLoading && "cursor-not-allowed opacity-50 relative")}
                          >
                            <Palette className="h-4 w-4 text-black/90" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isViewer ? "Viewing mode" : "System Design"}</p>
                        </TooltipContent>
                      </Tooltip> */}
                    </div>
                  ) : (
                    <div className="space-y-0.5 bg-card border border-border rounded-md p-0.5 w-[200px]">
                      <div onClick={() => setMenuMode("main")} className="flex items-center px-2 py-1.5 text-xs rounded-sm BackgroundStyle cursor-default w-full">
                        <ArrowLeft className="h-3 w-3 mr-2" />
                        Back
                      </div>
                      {designSystems.map((system) => (
                        <div
                          key={system.name}
                          onClick={() => {
                            setSelectedDesign(system.name)
                            setDesignConfig(designPresets[system.name])
                            setIsDesignActive(true)
                            setShowMenu(false)
                          }}
                          className="flex items-center px-2 py-1.5 text-xs rounded-sm BackgroundStyle cursor-default w-full"
                        >
                          <div className={`h-3 w-3 rounded mr-2 ${system.previewColor}`} />
                          {system.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Plugin Injected Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              {pluginRegistry.chatInputButtons.map((btn, idx) => (
                <Tooltip key={`${btn.pluginId}-${idx}`}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => btn.onClick({
                        sendPrompt: (p: string, isAuto = true) => (window as any).falbor.sendPrompt(p, isAuto),
                        setActivePlugin: (id: string | null) => (window as any).falbor.setActivePlugin(id),
                        getMessages: () => (window as any).falbor.getMessages(),
                        // If we had a way to set preview URL in ChatInput, we'd add it here.
                        // Mostly used in CodePreview but added for consistency.
                        setPreviewUrl: (url: string) => window.dispatchEvent(new CustomEvent('falbor-set-preview-url', { detail: { url } }))
                      })}
                      className={cn(
                        "h-7 w-7 p-1.5 text-sm cursor-pointer rounded-md BackgroundStyle text-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                        isLoading && "cursor-not-allowed opacity-50 relative"
                      )}
                    >
                      {btn.icon ? (
                        <DynamicIcon name={btn.icon} className="w-4 h-4 text-primary" />
                      ) : (
                        <Zap className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  {btn.tooltip && (
                    <TooltipContent>
                      <p>{btn.tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".ts,.tsx,.js,.jsx,.py,.css,.html,.json,.md,.txt,image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center gap-px">
              {/* Standalone Enhance Prompt Button */}
              {mounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="h-7 px-2.5 border-none text-[12px] bg-white dark:bg-[#2C2C30] shadow-none rounded-md text-foreground ml-2 hover:bg-muted transition-colors cursor-pointer border"
                      disabled={isLoading || isViewer}
                      variant="ghost"
                      size="sm"
                    >
                      <div className="flex items-center w-full">
                        <Cpu className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span className="truncate max-w-[120px] font-bold">
                          {currentModel.label}
                        </span>
                        {currentModel.id === 'claude-opus-4.6-fast' && (
                          <span className="ml-auto text-[9px] font-bold text-blue-600 bg-blue-500/10 px-1 rounded uppercase tracking-tighter shadow-sm border border-blue-500/20">teams+</span>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 max-h-[400px] overflow-y-auto bg-card border border-border shadow-md z-[100]">
                    <TooltipProvider>
                      {MODEL_OPTIONS.map((model) => {
                        const tier = balanceData?.subscriptionTier || "none";
                        const isLocked = (model.id === "claude-opus-4.6-fast" && tier !== "teams") ||
                          (model.id === "gpt-5" && !["pro", "teams"].includes(tier));

                        return (
                          <Tooltip key={model.id}>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (model.soon) return;
                                  if (model.id === "claude-opus-4.6-fast" && tier !== "teams") {
                                    alert("Falbor 2.0 Max is exclusive to Teams subscribers.");
                                    return;
                                  }
                                  if (model.id === "gpt-5" && tier !== "pro" && tier !== "teams") {
                                    alert("Falbor 1.0 Pro is exclusive to Pro subscribers.");
                                    return;
                                  }
                                  handleModelSelect(model.id);
                                }}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer hover:bg-[#e7e7e7] dark:hover:bg-[#2C2C30] p-2",
                                  selectedModel === model.id && "bg-[#e7e7e7] dark:bg-[#2C2C30]",
                                  (model.soon || isLocked) && "opacity-60 grayscale-[0.5] cursor-not-allowed"
                                )}
                              >
                                <div className="w-8 h-8 rounded-sm overflow-hidden flex-shrink-0 border border-border/50 bg-muted/30 p-1 flex items-center justify-center">
                                  <img src={model.iconUrl || "/placeholder.svg"} alt="" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5 flex-1 overflow-hidden ml-1">
                                  <div className="flex items-center gap-1.5 w-full">
                                    <span className="text-[13px] font-bold truncate">
                                      {model.label}
                                    </span>
                                    {isLocked && <Lock className="w-3 h-3 text-gray-700 flex-shrink-0" />}
                                  </div>
                                  {model.description && (
                                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                                      {model.description}
                                    </span>
                                  )}
                                </div>
                                {model.isPremium && !hasSubscription && !isLocked && (
                                  <Lock className="w-3 h-3 ml-auto text-gray-700" />
                                )}
                                {model.soon && (
                                  <span className="ml-1 text-[10px] font-bold text-gray-700 bg-gray-50 px-1 border border-gray-200 rounded uppercase tracking-tighter shadow-sm">Soon</span>
                                )}
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            {model.description && (
                              <TooltipContent side="right" className="max-w-[220px] text-xs p-3">
                                <p className="mb-2 text-white/90">{model.description}</p>
                                {model.subModels && model.subModels.length > 0 && (
                                  <div className="flex flex-col gap-1.5">
                                    {model.subModels.map((sub) => (
                                      <div key={sub.id} className="flex items-center gap-1.5">
                                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
                                          <img src={sub.iconUrl} alt={sub.label} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-[11px] text-white/90">
                                          {sub.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex items-center gap-1.5 ml-1">
                {/* Database Toggle and Hover panel removed from here, now in Plus menu */}
              </div>
              {/* Voice & Translate Split Button */}
              {!isListening && (
                <div className="flex items-center h-7 border border-dashed border-border rounded-md overflow-hidden bg-white dark:bg-[#2C2C30] transition-colors ml-1 mr-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleVoiceToggle}
                          className="flex items-center gap-1.5 px-2.5 h-full border-r border-dashed hover:bg-muted/70 text-[10px] uppercase tracking-wider font-bold transition-all text-foreground min-w-[70px] justify-center"
                          disabled={isLoading}
                        >
                          <AudioLinesIcon className="w-4 h-4" />
                          <span>Voice</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Voice input</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-1.5 h-full hover:bg-muted/70 transition-all text-foreground cursor-pointer flex items-center justify-center flex-1">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 z-[100] bg-card border-border">
                      <DropdownMenuItem
                        onClick={() => {
                          setShowTranslateModal(true)
                          setTranslateStep('record')
                          setRecordedTranscript("")
                        }}
                        className="cursor-pointer"
                      >
                        <Languages className="w-4 h-4 mr-2" />
                        Translate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {isImproving && (
                <div className="h-7 w-7 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-[#0099ff]/20 border-t-[#0099ff] rounded-full animate-spin" />
                </div>
              )}
              {/* Send/Submit Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type={isListening || effectiveIsLoading ? "button" : "submit"}
                      onClick={isListening ? stopVoiceInput : undefined}
                      size={isProvisioning || editingMessage ? "default" : "icon"}
                      className={cn(
                        "h-7 p-1.5 rounded-md mr-1 transition-colors w-7",
                        (isListening ? "bg-red-500 hover:bg-red-600" : (effectiveIsLoading ? "bg-[#0099ff]/30" : "bg-card hover:bg-muted border border-border")),
                        (!effectiveIsLoading && !isListening &&
                          ((!message.trim() && uploadedFiles.length === 0 && pastedContents.length === 0 && !selectedImage) ||
                            !isAuthenticated || isViewer)) ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      )}
                      disabled={isLoading || isDailyLimitReached || isViewer}
                    >
                      {effectiveIsLoading || isProvisioning ? (
                        <div className="w-3 h-3 border-2 border-[#0099ff] border-t-[#0099ff]/30 rounded-full animate-spin" />
                      ) : isListening ? (
                        <Circle className="w-4 h-4 text-white" />
                      ) : isViewer ? (
                        <Lock className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <ArrowUp className="w-6 h-6 text-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  {isViewer && (
                    <TooltipContent side="top" align="center" className="bg-card text-foreground border border-border shadow-md font-medium">
                      <p className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-red-500" />
                        You cannot send messages.
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </form>

        {/* Upgrade Banner & Daily Limit Indicator */}
        {!hasSubscription && (
          <div className="relative mt-[-9px] pt-4 pb-2 px-1 rounded-b-[12px] z-[-10] bg-muted backdrop-blur-sm flex items-center justify-between">            <div className="flex flex-col gap-0.5 ml-2">
            <p className="text-[13px] text-zinc-600 font-medium">
              {isDailyLimitReached
                ? `Credits renew in ${formatTime(dailyResetTimer)}`
                : `You have`} {5 - (balanceData?.dailyMessageCount || 0)} messages left for today.
            </p>
            {!isDailyLimitReached && (
              <div className="flex items-center gap-1.5">
                {/* <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-3 h-1 rounded-full",
                          i <= (balanceData?.dailyMessageCount || 0) ? "bg-zinc-400" : "bg-zinc-200"
                        )}
                      />
                    ))}
                  </div> */}
              </div>
            )}
          </div>
            <Link href="/pricing">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[12px] bg-[#0099ff]/20 text-[#0099ff] mr-1 flex items-center gap-1.5"
              >
                Upgrade Plan
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Translation Modal */}
      <Dialog open={showTranslateModal} onOpenChange={(open) => {
        if (!open) {
          stopTranslationRecording()
        }
        setShowTranslateModal(open)
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#1E1E21] border-border shadow-2xl z-[10000]">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Languages className="w-5 h-5 text-[#0099ff]" />
                Voice Translation
              </DialogTitle>
              <button
                onClick={() => setShowTranslateModal(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                {translateStep === 'record' && (
                  <motion.div
                    key="record"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center gap-5 w-full"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                      <div className="relative w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <Mic className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">Speak now...</p>
                      <p className="text-xs text-muted-foreground italic px-4 min-h-[30px] line-clamp-2">
                        {recordedTranscript || "Waiting for your voice..."}
                      </p>
                    </div>

                    <Button
                      className="w-full bg-[#0099ff] hover:bg-[#0088ee] text-white font-bold h-10 rounded-lg text-sm"
                      onClick={() => {
                        stopTranslationRecording()
                        setTranslateStep('language')
                      }}
                    >
                      Next Step
                    </Button>
                  </motion.div>
                )}

                {translateStep === 'language' && (
                  <motion.div
                    key="language"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    <p className="text-sm font-semibold text-foreground">Select your language</p>

                    <div className="w-full h-[240px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-muted">
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.name}
                            onClick={() => setTranslateSourceLang(lang.name)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all hover:bg-muted/50",
                              translateSourceLang === lang.name
                                ? "border-[#0099ff] bg-[#0099ff]/5 text-[#0099ff] ring-1 ring-[#0099ff]"
                                : "border-border bg-muted/20 text-foreground"
                            )}
                          >
                            <ReactCountryFlag
                              countryCode={lang.code}
                              svg
                              style={{ width: '18px', height: '12px', borderRadius: '1px' }}
                            />
                            <span className="text-[10px] font-bold uppercase truncate w-full">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full bg-[#0099ff] hover:bg-[#0088ee] text-white font-bold h-10 rounded-lg gap-2 text-sm mt-1"
                      onClick={handleTranslate}
                      disabled={isTranslatingText}
                    >
                      {isTranslatingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                      Translate to English
                    </Button>

                    <button
                      onClick={() => setTranslateStep('record')}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      Back to recording
                    </button>
                  </motion.div>
                )}

                {translateStep === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="w-16 h-16 border-4 border-[#0099ff]/20 border-t-[#0099ff] rounded-full animate-spin" />
                    <p className="text-lg font-medium text-foreground">Translating your message...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
      <GoogleDriveModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        onSelect={(files: any[]) => {
          const newFiles = files.map((f: any) => ({
            id: f.id,
            name: f.name,
            type: f.mimeType,
            size: f.sizeBytes || 0,
            content: `[File imported from Google Drive: ${f.name}]`,
            uploadStatus: "complete" as const,
            preview: f.iconUrl || f.thumbnailUrl
          }))
          setUploadedFiles(prev => [...prev, ...newFiles])
        }}
      />
      <GoogleMapsModal
        isOpen={showMapsModal}
        onClose={() => setShowMapsModal(false)}
        onSelect={handleSelectMapsBusiness}
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

      <Dialog open={showCloneModal} onOpenChange={setShowCloneModal}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl rounded-xl">
          <DialogTitle className="text-lg font-bold text-gray-800">Build a site like this one</DialogTitle>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-medium text-gray-700">Enter website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cloneUrl.trim()) {
                    const url = cloneUrl.trim();
                    setClonedUrl(url)
                    setCloneUrl("")
                    setShowCloneModal(false)
                    setIsActive(true)

                    // Auto-fill chat input
                    const prefix = "Build a site like this one: ";
                    setMessage(prev => {
                      const trimmedPrev = prev.trim();
                      if (trimmedPrev === url) return `${prefix}${url}`; // Replace if only URL was there
                      if (!prev.includes(prefix)) {
                        return `${prefix}${url}\n${prev}`.trim()
                      }
                      return prev
                    })
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCloneModal(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (cloneUrl.trim()) {
                    const url = cloneUrl.trim();
                    setClonedUrl(url)
                    setCloneUrl("")
                    setShowCloneModal(false)
                    setIsActive(true)

                    // Auto-fill chat input
                    const prefix = "Build a site like this one: ";
                    setMessage(prev => {
                      const trimmedPrev = prev.trim();
                      if (trimmedPrev === url) return `${prefix}${url}`; // Replace if only URL was there
                      if (!prev.includes(prefix)) {
                        return `${prefix}${url}\n${prev}`.trim()
                      }
                      return prev
                    })
                  }
                }}
              >
                Start Building
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
export function ChatInput(props: ChatInputProps) {
  return <ChatInputImpl {...props} />
}