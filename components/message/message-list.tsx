"use client"

import type React from "react"
import { TaskChatGroup } from "./task-chat-group"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  ChevronDown,
  Brain,
  FileText,
  CheckCircle2,
  XCircle,
  List,
  AlertCircle,
  Bug,
  Copy,
  Globe,
  ChevronRight,
  Folder,
  Search,
  ChevronUp,
  Lightbulb,
  ScanSearch,
  ClipboardCheck,
  Zap,
  Circle,
  Database,
  MoreHorizontal,
  File,
  History as HistoryIcon,
  Terminal as TerminalIcon,
  Mail,
  ShieldAlert,
  RefreshCw,
  Edit,
  Clock,
  FileCode,
  Cpu,
  Shield,
  AudioLinesIcon,
  Check,
  Code2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState, useEffect, useCallback, useRef } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import remarkGfm from "remark-gfm"
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react"
import { useUser } from "@clerk/nextjs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Smartphone, MoreVertical } from "lucide-react"

function formatTimeAgo(date: string | Date | undefined): string {
  if (!date) return ""
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return then.toLocaleDateString()
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  hasArtifact?: boolean
  createdAt?: string | Date
  versionName?: string | null
  thinking?: string | null
  searchQueries?: any[] | null
  isAutomated?: boolean
  imageData?: (string | { url: string; mimeType: string }[]) | null
  uploadedFiles?: Array<{ name: string; content: string; type: string }> | null
  tokensUsed?: number | null
  cost?: number | null
  metadata?: Record<string, any> | null
}

interface MessageListProps {
  messages: Message[]
  projectId: string
  activeMessageId?: string | null
  onActivateVersion?: (messageId: string) => void
  onArtifactClick?: (artifactId: string) => void
  onCodeExtracted?: (files: Array<{ filename: string; code: string; language: string }>) => void
  onCopy?: (content: string) => void
  onEdit?: (id: string, content: string) => void
  onRegenerate?: (id: string) => void
  onOpenPreview?: (
    version: string,
    project: string,
    codeBlocks: Array<{ filename: string; code: string; language: string }>,
  ) => void
}

interface TextPart {
  type: "text"
  content: string
}

interface DesignPart {
  type: "design"
  content: { name: string; config: any; json: string }
}

interface FilePart {
  type: "file"
  content: { name: string; fileContent: string; fileType: string }
}

interface PastedPart {
  type: "pasted"
  content: string
}

interface DatabasePart {
  type: "database"
  content: { supabaseUrl: string; anonKey: string }
}

type UserPart = TextPart | DesignPart | FilePart | PastedPart | DatabasePart

function parseAIResponse(content: string) {
  const tagRegexes: Record<string, RegExp> = {
    thinking: /<Thinking>([\s\S]*?)<\/Thinking>/gi,
    commentary: /<commentary>([\s\S]*?)<\/commentary>/gi,
    userMessage: /<UserMessage>([\s\S]*?)<\/UserMessage>/gi,
    planning: /<Planning>([\s\S]*?)<\/Planning>/gi,
    search: /<Search>([\s\S]*?)<\/Search>/gi,
    fileChecks: /<FileChecks>([\s\S]*?)<\/FileChecks>/gi,
    files: /<Files>([\s\S]*?)<\/Files>/gi,
    previewButton: /<PreviewButton version="([^"]+)" project="([^"]+)">([\s\S]*?)<\/PreviewButton>/gi,
    importCard: /<ImportCard repo="([^"]+)" \/>/gi,
    testing: /<Testing>([\s\S]*?)<\/Testing>/gi,
    fileSearch: /<FileSearch query="([^"]+)">([\s\S]*?)<\/FileSearch>/gi,
    reviewedWork: /<ReviewedWork>([\s\S]*?)<\/ReviewedWork>/gi,
    finalReasoning: /<FinalReasoning>([\s\S]*?)<\/FinalReasoning>/gi,
    finalResponsive: /<FinalResponsive>([\s\S]*?)<\/FinalResponsive>/gi,
    mobileReview: /<MobileReview>([\s\S]*?)<\/MobileReview>/gi,
    deepConclusion: /<DeepConclusion>([\s\S]*?)<\/DeepConclusion>/gi,
    internalThought: /<InternalThought>([\s\S]*?)<\/InternalThought>/gi,
    customAction: /<CustomAction name="([^"]+)">([\s\S]*?)<\/CustomAction>/gi,
    tasks: /<Tasks>([\s\S]*?)<\/Tasks>/gi,
    discoverGmailTools: /<DiscoverGmailTools>([\s\S]*?)<\/DiscoverGmailTools>/gi,
    testGmailTools: /<TestGmailTools>([\s\S]*?)<\/TestGmailTools>/gi,
    compileGmailFindings: /<CompileGmailFindings>([\s\S]*?)<\/CompileGmailFindings>/gi,
    discoverDiscordTools: /<DiscoverDiscordTools>([\s\S]*?)<\/DiscoverDiscordTools>/gi,
    testDiscordTools: /<TestDiscordTools>([\s\S]*?)<\/TestDiscordTools>/gi,
    compileDiscordFindings: /<CompileDiscordFindings>([\s\S]*?)<\/CompileDiscordFindings>/gi,
    discoverMessengerTools: /<DiscoverMessengerTools>([\s\S]*?)<\/DiscoverMessengerTools>/gi,
    testMessengerTools: /<TestMessengerTools>([\s\S]*?)<\/TestMessengerTools>/gi,
    compileMessengerFindings: /<CompileMessengerFindings>([\s\S]*?)<\/CompileMessengerFindings>/gi,
    scan: /<Scan>([\s\S]*?)<\/Scan>/gi,
    workSummary: /<WorkSummary>([\s\S]*?)<\/WorkSummary>/gi,
    checkPackages: /<CheckPackages\s*\/?>/gi,
    apiSearch: /<APISearch name="([^"]+)">([\s\S]*?)<\/APISearch>/gi,
    verifyingSolution: /<VerifyingSolution name="([^"]+)">([\s\S]*?)<\/VerifyingSolution>/gi,
    terminal: /<Terminal>([\s\S]*?)<\/Terminal>/gi,
    internetSearch: /<InternetSearch>([\s\S]*?)<\/InternetSearch>/gi,
    data: /<Data>([\s\S]*?)<\/Data>/gi,
  }

  // Tags that should NEVER bleed into the visible text content
  const hiddenTagNames = [
    "InternalFinishCheck", "AIOnly", "Thinking", "Commentary", "UserMessage",
    "Planning", "Search", "FileChecks", "Files", "Testing", "FileSearch",
    "ReviewedWork", "FinalReasoning", "FinalResponsive", "MobileReview",
    "InternalThought", "Tasks",
    "DiscoverGmailTools", "TestGmailTools", "CompileGmailFindings",
    "DiscoverDiscordTools", "TestDiscordTools", "CompileDiscordFindings",
    "DiscoverMessengerTools", "TestMessengerTools", "CompileMessengerFindings",
    "Scan", "WorkSummary", "CheckPackages", "APISearch",
    "Terminal", "InternetSearch", "VerifyingSolution", "Data"
  ]

  let processedContent = content
    .replace(/<\/InternalFinishCheck>/gi, "")
    .replace(/<InternalFinishCheck>/gi, "")
    .replace(/<\/AIOnly>([\s\S]*?)<AIOnly>/gi, "")
    .replace(/<AIOnly>([\s\S]*?)<\/AIOnly>/gi, "")

  const matches: Array<{ type: string; start: number; fullMatch: string; content: any }> = []
  let versionName: string | null = null

  // Extract versionName if present
  const vnMatch = processedContent.match(/<VersionName>([\s\S]*?)<\/VersionName>/i)
  if (vnMatch) {
    versionName = vnMatch[1].trim()
    processedContent = processedContent.replace(vnMatch[0], "")
  }

  for (const [type, regex] of Object.entries(tagRegexes)) {
    for (const match of processedContent.matchAll(regex)) {
      let parsedContent: any
      if (type === "previewButton") {
        parsedContent = { version: match[1], project: match[2], text: match[3].trim() }
      } else if (type === "importCard") {
        parsedContent = { repo: match[1] }
      } else if (type === "tasks") {
        const tasksContent = match[1].trim()
        const tasksList: { text: string; status: "success" | "loading" | "pending" }[] = []
        tasksContent.split("\n").forEach((line: string) => {
          if (line.trim()) {
            const successMatch = line.match(/(.+?)\s*[✓✔]/i)
            const loadingMatch = line.match(/(.+?)\s*[⏳⌛…]/i)
            if (successMatch) {
              tasksList.push({ text: successMatch[1].trim(), status: "success" })
            } else if (loadingMatch) {
              tasksList.push({ text: loadingMatch[1].trim(), status: "loading" })
            } else {
              tasksList.push({ text: line.trim(), status: "pending" })
            }
          }
        })
        parsedContent = tasksList
      } else if (type === "working") {
        parsedContent = { path: match[1] }
      } else if (type === "fileChecks") {
        const checksContent = match[1].trim()
        const checks: Array<{ file: string; error: string; fix: string; status: string }> = []
        const checkLines = checksContent.split("\n").filter((line: string) => line.includes("File:") || line.includes("- Error:"))
        let currentFile = ""
        checkLines.forEach((line: string) => {
          if (line.includes("File:")) {
            currentFile = line.match(/File:\s*(.+?)(?:\s*-|$)/)?.[1]?.trim() || ""
          } else if (line.includes("- Error:")) {
            const errorMatch = line.match(/-\s*Error:\s*(.+?)(?:\s*-|$)/)
            const fixMatch = line.match(/-\s*Fix Applied:\s*(.+?)(?:\s*-|$)/)
            const statusMatch = line.match(/-\s*Status:\s*(.+)/)
            if (currentFile && errorMatch) {
              checks.push({
                file: currentFile,
                error: errorMatch[1].trim(),
                fix: fixMatch ? fixMatch[1].trim() : "",
                status: statusMatch ? statusMatch[1].trim() : "PENDING",
              })
            }
          }
        })
        parsedContent = checks
      } else if (type === "workSummary") {
        try {
          parsedContent = JSON.parse(match[1].trim())
        } catch (e) {
          parsedContent = { summary: match[1].trim(), files: [] }
        }
      } else if (type === "files") {
        const filesContent = match[1].trim()
        const filesList: { name: string; path: string; status: "success" | "error" | "loading"; isSql?: boolean }[] = []
        const fileLines = filesContent.split("\n").filter((line: string) => line.trim() !== "")
        fileLines.forEach((line: string) => {
          const successMatch = line.match(/(.+?)\s*[✓✔]/i)
          const loadingMatch = line.match(/(.+?)\s*[⏳⌛…]/i)
          if (successMatch) {
            filesList.push({ name: successMatch[1].trim(), path: successMatch[1].trim(), status: "success" })
          } else {
            filesList.push({ name: line.trim(), path: line.trim(), status: "loading" })
          }
        })
        parsedContent = filesList
      } else if (type === "fileSearch") {
        parsedContent = { query: match[1], results: match[2].trim() }
      } else if (type === "apiSearch") {
        parsedContent = { name: match[1], results: match[2].trim() }
      } else if (type === "customAction") {
        parsedContent = { name: match[1], content: match[2].trim() }
      } else if (type === "checkPackages") {
        parsedContent = true
      } else {
        parsedContent = match[1]?.trim() ?? ""
      }
      matches.push({ type, start: match.index!, fullMatch: match[0], content: parsedContent })
    }
  }

  // 2. Extract Code Blocks (Prioritizing files)
  // This regex matches fully closed blocks AND partially open ones during streaming
  const codeRegex = /```(\w+)?\s*(?:file=["']?([^"'>\n]*?)["']?)?\s*\r?\n([\s\S]*?)(?:```|$)/g
  const codeBlocks: Array<{ filename: string; code: string; language: string; isOpen?: boolean }> = []

  for (const match of processedContent.matchAll(codeRegex)) {
    const language = match[1] || "typescript"
    const filename = match[2]
    const isClosed = match[0].endsWith("```")

    // ONLY extract as workbench codeBlock if an explicit filename was provided
    if (filename) {
      const content = {
        filename: filename.trim(),
        code: match[3].trim(),
        language,
        isOpen: !isClosed
      }

      // Don't add to matches if it's already covered by a tag (unlikely but safe)
      if (!matches.find(m => m.start <= match.index! && m.start + m.fullMatch.length >= match.index! + match[0].length)) {
        codeBlocks.push(content)
        matches.push({
          type: "codeBlock",
          start: match.index!,
          fullMatch: match[0],
          content
        })
      }
    }
  }

  matches.sort((a, b) => a.start - b.start)

  const parts: Array<{ type: string; content: any }> = []
  let lastEnd = 0
  for (const m of matches) {
    const textBefore = processedContent.substring(lastEnd, m.start).trim()
    if (textBefore) {
      parts.push({ type: "text", content: textBefore })
    }
    parts.push({ type: m.type, content: m.content })
    lastEnd = m.start + m.fullMatch.length
  }
  let finalText = processedContent.substring(lastEnd).trim()

  // consummed as code blocks in the unified loop above

  if (finalText) {
    const simpleTypes = [
      "thinking", "commentary", "userMessage", "planning", "search",
      "fileChecks", "files", "testing", "fileSearch", "reviewedWork",
      "finalReasoning", "finalResponsive", "mobileReview", "deepConclusion",
      "internalThought", "customAction", "tasks", "checkPackages"
    ]

    let firstOpenTagMatch: { type: string; start: number; content: string } | null = null
    for (const type of simpleTypes) {
      const tagName = type.charAt(0).toUpperCase() + type.slice(1)
      const openTagStr = `<${tagName}>`
      const index = finalText.indexOf(openTagStr)
      if (index !== -1 && (!firstOpenTagMatch || index < firstOpenTagMatch.start)) {
        firstOpenTagMatch = { type, start: index, content: finalText.substring(index + openTagStr.length).trim() }
      }
    }

    if (firstOpenTagMatch) {
      const textBefore = finalText.substring(0, firstOpenTagMatch.start).trim()
      if (textBefore) parts.push({ type: "text", content: textBefore })

      let parsedContent: any = firstOpenTagMatch.content
      const type = firstOpenTagMatch.type

      if (type === "fileChecks") {
        const checks: Array<{ file: string; error: string; fix: string; status: string }> = []
        const checkLines = parsedContent.split("\n").filter((line: string) => line.includes("File:") || line.includes("- Error:"))
        let currentFile = ""
        checkLines.forEach((line: string) => {
          if (line.includes("File:")) {
            currentFile = line.match(/File:\s*(.+?)(?:\s*-|$)/)?.[1]?.trim() || ""
          } else if (line.includes("- Error:")) {
            const errorMatch = line.match(/-\s*Error:\s*(.+?)(?:\s*-|$)/)
            if (currentFile && errorMatch) {
              checks.push({
                file: currentFile,
                error: errorMatch[1].trim(),
                fix: "",
                status: "PENDING",
              })
            }
          }
        })
        parsedContent = checks
      } else if (type === "tasks") {
        const tasksList: { text: string; status: "success" | "loading" | "pending" }[] = []
        parsedContent.split("\n").forEach((line: string) => {
          if (line.trim()) {
            const successMatch = line.match(/(.+?)\s*[✓✔]/i)
            const loadingMatch = line.match(/(.+?)\s*[⏳⌛…]/i)
            if (successMatch) {
              tasksList.push({ text: successMatch[1].trim(), status: "success" })
            } else if (loadingMatch) {
              tasksList.push({ text: loadingMatch[1].trim(), status: "loading" })
            } else {
              tasksList.push({ text: line.trim(), status: "pending" })
            }
          }
        })
        parsedContent = tasksList
      }

      parts.push({ type, content: parsedContent })
    } else {
      // Strip any remaining orphaned tag content and trailing garbage before showing as text
      const safeText = finalText
        .replace(/<\/?(?:Thinking|Commentary|UserMessage|Planning|Search|FileChecks|Files|Testing|FileSearch|ReviewedWork|FinalReasoning|FinalResponsive|MobileReview|DeepConclusion|InternalThought|CustomAction|Tasks|PreviewButton|codeBlock|ImportCard|AIOnly|InternalFinishCheck)[^>]*>/gi, "")
        .replace(/([_\-*=~`#]){3,}\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
      if (safeText) {
        parts.push({ type: "text", content: safeText })
      }
    }
  }

  return { parts, codeBlocks, files: [], versionName }
}

function parseUserContent(content: string): { parts: UserPart[]; mainText: string } {
  const parts: UserPart[] = []
  let remainingContent = content

  // Parse files: ## File: filename\n```type\ncontent\n```
  const fileRegex = /## File: ([^\n]+)\n```([^\n]*)\n([\s\S]*?)```/g
  let fileMatch: RegExpExecArray | null = null
  const fileMatches: Array<{ index: number; length: number; name: string; type: string; content: string }> = []

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((fileMatch = fileRegex.exec(content)) !== null) {
    fileMatches.push({
      index: fileMatch.index,
      length: fileMatch[0].length,
      name: fileMatch[1].trim(),
      type: fileMatch[2].trim() || "text/plain",
      content: fileMatch[3].trim(),
    })
  }

  // Parse pasted text: ## Pasted Text\n```text\ncontent\n```
  const pastedRegex = /## Pasted Text\n```text\n([\s\S]*?)```/g
  let pastedMatch: RegExpExecArray | null = null
  const pastedMatches: Array<{ index: number; length: number; content: string }> = []

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((pastedMatch = pastedRegex.exec(content)) !== null) {
    pastedMatches.push({
      index: pastedMatch.index,
      length: pastedMatch[0].length,
      content: pastedMatch[1].trim(),
    })
  }

  // Parse database connection
  const databaseRegex = /## Database Connection\nVITE_SUPABASE_URL=([^\n]+)\nVITE_SUPABASE_ANON_KEY=([^\n]+)/
  const databaseMatch = content.match(databaseRegex)
  let databaseInfo: { index: number; length: number; url: string; key: string } | null = null
  if (databaseMatch && databaseMatch.index !== undefined) {
    databaseInfo = {
      index: databaseMatch.index,
      length: databaseMatch[0].length,
      url: databaseMatch[1].trim(),
      key: databaseMatch[2].trim(),
    }
  }

  // Parse design system
  const designRegex = /## Design System: ([\w\s]+)\n([\s\S]*)$/
  const designMatch = content.match(designRegex)
  let designInfo: { index: number; length: number; name: string; json: string; config: unknown } | null = null
  if (designMatch && designMatch.index !== undefined) {
    let designConfig
    try {
      designConfig = JSON.parse(designMatch[2].trim())
    } catch {
      designConfig = null
    }
    designInfo = {
      index: designMatch.index,
      length: designMatch[0].length,
      name: designMatch[1].trim(),
      json: designMatch[2].trim(),
      config: designConfig,
    }
  }

  // Collect all matches with their positions
  const allMatches: Array<{ index: number; length: number }> = [
    ...fileMatches,
    ...pastedMatches,
    ...(databaseInfo ? [databaseInfo] : []),
    ...(designInfo ? [designInfo] : []),
  ].sort((a, b) => a.index - b.index)

  // Extract main text (everything before the first match)
  let mainText = content
  if (allMatches.length > 0) {
    mainText = content.slice(0, allMatches[0].index).trim()
  }

  // Add main text as first part if not empty
  if (mainText) {
    parts.push({ type: "text", content: mainText })
  }

  // Add file parts
  for (const file of fileMatches) {
    parts.push({
      type: "file",
      content: { name: file.name, fileContent: file.content, fileType: file.type },
    })
  }

  // Add pasted parts
  for (const pasted of pastedMatches) {
    parts.push({ type: "pasted", content: pasted.content })
  }

  // Add database part
  if (databaseInfo) {
    parts.push({
      type: "database",
      content: { supabaseUrl: databaseInfo.url, anonKey: databaseInfo.key },
    })
  }

  // Add design part
  if (designInfo) {
    parts.push({
      type: "design",
      content: { name: designInfo.name, config: designInfo.config, json: designInfo.json },
    })
  }

  // If no parts were found, just return the whole content as text
  if (parts.length === 0) {
    parts.push({ type: "text", content: content.trim() })
    return { parts, mainText: content.trim() }
  }

  return { parts, mainText }
}

const renderToolContent = (type: string, content: any) => {
  if (typeof content !== "string") return content

  let safeContent = content
  // Remove large code blocks from tool outputs to avoid cluttering the chat
  if (type !== "text" && safeContent.includes("```")) {
    safeContent = safeContent.replace(/```[\s\S]*?```/g, (match) => {
      if (match.length > 50) return "\n[Code implementation hidden - view in code preview]\n"
      return match
    })
  }

  // Detect if content is JSON (common for tool outputs)
  if (safeContent.trim().startsWith("{") || safeContent.trim().startsWith("[")) {
    try {
      const data = JSON.parse(safeContent.trim())

      // Custom rendering for Discord/Messenger messages
      if (data.messages && Array.isArray(data.messages)) {
        return (
          <div className="space-y-3 my-2">
            {data.messages.map((msg: any, idx: number) => (
              <div
                key={idx}
                className="flex flex-col gap-1 bg-white p-3 rounded-xl border border-black/5 shadow-sm transform transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2 mb-1 pb-1 border-b border-black/5">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <HistoryIcon className="w-3 h-3 text-indigo-600" />
                  </div>
                  <span className="font-bold text-xs text-indigo-950">{msg.author?.username || "Unknown User"}</span>
                  <span className="text-[10px] text-black/40 ml-auto">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ""}
                  </span>
                </div>
                <div className="text-[13px] text-black/80 font-medium leading-relaxed">{msg.content}</div>
                {msg.channel_id && (
                  <div className="mt-2 pt-1 border-t border-black/5 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] py-0 px-1.5 h-4 bg-gray-50 text-gray-500 font-normal"
                    >
                      Channel: {msg.channel_id}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }

      // General JSON formatting for scans/other tool outputs
      return (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {Object.entries(data).map(([key, value], i) => (
            <div key={i} className="flex flex-col gap-1 b bg-white/50 p-2 rounded border border-black/5">
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-tight">{key}</span>
              <div className="text-xs text-black/80 break-words">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </div>
            </div>
          ))}
        </div>
      )
    } catch (e) {
      // Not valid JSON, continue to raw content
    }
  }

  return safeContent
}

export function MessageList({
  messages,
  projectId,
  activeMessageId,
  onActivateVersion,
  onArtifactClick,
  onCodeExtracted,
  onCopy,
  onEdit,
  onRegenerate,
  onOpenPreview,
}: MessageListProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null)
  const [selectedCode, setSelectedCode] = useState<{ filename: string; code: string; language: string } | null>(null)
  const [selectedOldCode, setSelectedOldCode] = useState<string | null>(null)
  const [fileHistory, setFileHistory] = useState<Record<string, Array<{ code: string; version: number }>>>({})
  const [fullMessageModal, setFullMessageModal] = useState<Message | null>(null)
  const [modalExpandedSections, setModalExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
  const [contextModal, setContextModal] = useState<{
    type: "file" | "pasted" | "database" | "design"
    name: string
    content: string
  } | null>(null)
  const [thinkingTimer, setThinkingTimer] = useState(0)
  const [editOverlay, setEditOverlay] = useState<{ id: string; content: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { user, isLoaded } = useUser()

  const toggleSection = (messageId: string, section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [section]: !prev[messageId]?.[section],
      },
    }))

    // Auto-scroll logic when opening a section
    setTimeout(() => {
      const el = document.getElementById(`section-${section}-${messageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }

  const openFullMessageModal = useCallback((message: Message) => {
    const { parts } = parseAIResponse(message.content)
    const collapsibleTypes = [
      "thinking",
      "commentary",
      "userMessage",
      "planning",
      "search",
      "fileChecks",
      "files",
      "importCard",
      "testing",
    ]
    let collapsibleIndex = 0
    const initialExpanded: Record<string, boolean> = {}
    parts.forEach((part) => {
      if (collapsibleTypes.includes(part.type)) {
        initialExpanded[`section-${collapsibleIndex}`] = true
        collapsibleIndex++
      }
    })
    setModalExpandedSections(initialExpanded)
    setFullMessageModal(message)
  }, [])

  const toggleModalSection = useCallback((section: string) => {
    setModalExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        onCopy?.(text)
      } catch (err) {
        console.error("Failed to copy text: ", err)
      }
    },
    [onCopy],
  )

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        const { codeBlocks } = parseAIResponse(lastMessage.content)
        if (codeBlocks && codeBlocks.length > 0) {
          onCodeExtracted?.(codeBlocks)
          setFileHistory((prev) => {
            const newHist = { ...prev }
            codeBlocks.forEach((block) => {
              if (!newHist[block.filename]) {
                newHist[block.filename] = []
              }
              const last = newHist[block.filename].length
              const lastCode = newHist[block.filename][last - 1]?.code
              if (lastCode !== block.code) {
                newHist[block.filename].push({ code: block.code, version: last + 1 })
              }
            })
            return newHist
          })
        }
      }
    }
  }, [messages, onCodeExtracted])

  const handleCodeSelect = useCallback(
    (block: { filename: string; code: string; language: string }) => {
      // Main button click now strictly opens "Code View" (no diff)
      setSelectedOldCode(null)
      setSelectedCode(block)
    },
    [],
  )

  // Forces diff view — new files show same code on both sides
  const handleViewChanges = useCallback(
    (block: { filename: string; code: string; language: string }) => {
      const hist = fileHistory[block.filename] || []
      if (hist.length > 1) {
        setSelectedOldCode(hist[hist.length - 2].code)
      } else {
        // New file: show same code on both sides so user still sees "diff" view
        setSelectedOldCode(block.code)
      }
      setSelectedCode(block)
    },
    [fileHistory],
  )

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    const lastMsg = messages[messages.length - 1]
    const isAssistantStreaming = lastMsg?.role === "assistant" && lastMsg.id.startsWith("temp-")

    if (isAssistantStreaming && !lastMsg.content) {
      interval = setInterval(() => {
        setThinkingTimer(prev => prev + 1)
      }, 1000)
    } else {
      setThinkingTimer(prev => (prev !== 0 ? 0 : prev))
    }

    return () => clearInterval(interval)
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground" role="status" aria-live="polite">
        <p>No messages yet. Start the conversation!</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1" role="log" aria-live="polite">
        {(() => {
          // Group messages: detect task groups and wrap them
          const elements: React.ReactNode[] = []
          let i = 0
          while (i < messages.length) {
            const message = messages[i]
            const taskMeta = message.metadata as any

            // Check if this message starts a task group
            if (taskMeta?.taskGroupId && taskMeta?.taskIndex && taskMeta?.totalTasks) {
              const groupId = taskMeta.taskGroupId
              const taskIndex = taskMeta.taskIndex
              const totalTasks = taskMeta.totalTasks

              // Collect this user message and its AI response (next message)
              const groupMessages: Message[] = [message]
              if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
                groupMessages.push(messages[i + 1])
                i++ // skip the assistant message in the outer loop
              }

              const isLastAssistantStreaming = groupMessages.length > 1 &&
                groupMessages[groupMessages.length - 1].id.startsWith("temp-") &&
                (i === messages.length - 1 || i + 1 === messages.length)

              elements.push(
                <TaskChatGroup
                  key={`task-${groupId}-${taskIndex}`}
                  taskIndex={taskIndex}
                  totalTasks={totalTasks}
                  isLoading={isLastAssistantStreaming}
                  defaultExpanded={true}
                >
                  {groupMessages.map((gMsg, gIdx) => {
                    const gIndex = i - groupMessages.length + 1 + gIdx
                    const gIsStreaming = gMsg.id.startsWith("temp-") && gIndex === messages.length - 1
                    return renderMessage(gMsg, gIndex, gIsStreaming)
                  })}
                </TaskChatGroup>
              )
            } else {
              // Regular message — render normally
              const isStreaming = message.id.startsWith("temp-") && i === messages.length - 1
              elements.push(renderMessage(message, i, isStreaming))
            }
            i++
          }
          return elements
        })()}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-label="Image viewer"
          >
            <div
              className="relative max-w-4xl max-h-full bg-black rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 p-2 rounded transition-colors"
                aria-label="Close image"
              >
                <XCircle className="w-4 h-4 text-white" />
              </button>
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="Full view"
                className="w-full h-auto max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* File Modal */}
        {selectedFile && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedFile(null)}
            role="dialog"
            aria-label={`File viewer: ${selectedFile.name}`}
          >
            <div
              className="relative max-w-4xl max-h-full bg-[#1E1E21] border border-[#3A3A3E] rounded-lg overflow-hidden flex flex-col w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-[#3A3A3E]">
                <p className="text-sm font-mono text-white truncate">{selectedFile.name}</p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-[#2A2A2E] rounded transition-colors"
                  aria-label="Close file"
                >
                  <XCircle className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-xs text-white/75 whitespace-pre-wrap break-words font-mono">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Code Modal */}
        {selectedCode && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedCode(null)
              setSelectedOldCode(null)
            }}
            role="dialog"
            aria-label={`Code viewer: ${selectedCode.filename}`}
          >
            <div
              className="relative max-w-6xl max-h-full bg-[#1E1E21] border border-[#3A3A3E] rounded-lg overflow-hidden flex flex-col w-full h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedOldCode ? (
                <>
                  <div className="flex items-center justify-between p-3 border-b border-[#3A3A3E]">
                    <h3 className="text-sm font-mono text-white">Diff View: {selectedCode.filename}</h3>
                    <button
                      onClick={() => {
                        setSelectedCode(null)
                        setSelectedOldCode(null)
                      }}
                      className="p-2 hover:bg-[#2A2A2E] rounded transition-colors"
                      aria-label="Close diff"
                    >
                      <XCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/2 flex flex-col border-r border-[#3A3A3E]">
                      <div className="p-2 bg-red-900/20 text-red-300 font-semibold border-b border-red-500/30">
                        Original
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        {(() => {
                          const oldLines = selectedOldCode.split("\n")
                          const newLines = selectedCode.code.split("\n")
                          const newSet = new Set(newLines)
                          return oldLines.map((line, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start text-sm leading-relaxed font-mono text-white/80 mb-0.5",
                                !newSet.has(line) && "bg-red-900/30 border-l-2 border-red-500 pl-2",
                              )}
                            >
                              <span className="w-8 text-right pr-2 text-xs text-gray-500 select-none flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="flex-1 whitespace-pre">{line}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                    <div className="w-1/2 flex flex-col">
                      <div className="p-2 bg-green-900/20 text-green-300 font-semibold border-b border-green-500/30">
                        Updated
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        {(() => {
                          const oldLines = selectedOldCode.split("\n")
                          const newLines = selectedCode.code.split("\n")
                          const oldSet = new Set(oldLines)
                          return newLines.map((line, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start text-sm leading-relaxed font-mono text-white/80 mb-0.5",
                                !oldSet.has(line) && "bg-green-900/30 border-l-2 border-green-500 pl-2",
                              )}
                            >
                              <span className="w-8 text-right pr-2 text-xs text-gray-500 select-none flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="flex-1 whitespace-pre">{line}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 border-b border-[#3A3A3E]">
                    <p className="text-sm font-mono text-white truncate">{selectedCode.filename}</p>
                    <button
                      onClick={() => {
                        setSelectedCode(null)
                        setSelectedOldCode(null)
                      }}
                      className="p-2 hover:bg-[#2A2A2E] rounded transition-colors"
                      aria-label="Close code"
                    >
                      <XCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <SyntaxHighlighter language={selectedCode.language} style={oneDark} customStyle={{ margin: 0 }}>
                      {selectedCode.code}
                    </SyntaxHighlighter>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Full AI Message Modal */}
        {fullMessageModal && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setFullMessageModal(null)}
            role="dialog"
            aria-label="Full AI message viewer"
          >
            <div
              className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden flex flex-col w-full h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-black">Full AI Response</h3>
                <button
                  onClick={() => setFullMessageModal(null)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Close full message"
                >
                  <XCircle className="w-4 h-4 text-black" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AIMessageContent
                  message={fullMessageModal as Message}
                  isStreaming={false}
                  thinkingTimer={0}
                  expandedSections={modalExpandedSections}
                  onToggleSection={toggleModalSection}
                  onArtifactClick={onArtifactClick}
                  onCodeSelect={handleCodeSelect}
                  onViewChanges={handleViewChanges}
                  onOpenFullModal={() => { }}
                  onOpenPreview={onOpenPreview}
                />
              </div>
            </div>
          </div>
        )}

        {/* Context Modal for User Messages */}
        {contextModal && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setContextModal(null)}
            role="dialog"
            aria-label={`Context viewer: ${contextModal.name}`}
          >
            <div
              className="relative max-w-4xl max-h-full bg-[#1E1E21] border border-[#3A3A3E] rounded-lg overflow-hidden flex flex-col w-full max-w-2xl h-[70vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-[#3A3A3E]">
                <div className="flex items-center gap-2">
                  {contextModal.type === "file" && <FileText className="w-4 h-4 text-gray-400" />}
                  {contextModal.type === "pasted" && <FileText className="w-4 h-4 text-gray-400" />}
                  {contextModal.type === "database" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {contextModal.type === "design" && (
                    <div className="w-4 h-4 rounded bg-purple-500" />
                  )}
                  <p className="text-sm font-mono text-white truncate">{contextModal.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contextModal.content)
                    }}
                    className="p-2 hover:bg-[#2A2A2E] rounded transition-colors"
                    aria-label="Copy content"
                  >
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setContextModal(null)}
                    className="p-2 hover:bg-[#2A2A2E] rounded transition-colors"
                    aria-label="Close context"
                  >
                    <XCircle className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-xs text-white/75 whitespace-pre-wrap break-words font-mono">
                  {contextModal.content}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Edit Message Overlay */}
        {editOverlay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center pb-8"
            onClick={() => setEditOverlay(null)}
          >
            <div
              className="w-full max-w-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl border border-[#e4e4e4] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-black/40" />
                  <span className="text-xs font-medium text-black/50">Editing message</span>
                  <button
                    onClick={() => setEditOverlay(null)}
                    className="ml-auto text-black/40 hover:text-black/70 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={editOverlay.content}
                  onChange={(e) => setEditOverlay({ ...editOverlay, content: e.target.value })}
                  className="w-full p-3 border border-[#e4e4e4] rounded-lg resize-none text-sm bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#0099ff]/30 focus:border-[#0099ff]/50 transition-all"
                  placeholder="Edit your message..."
                  autoFocus
                  rows={4}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      onEdit?.(editOverlay.id, editOverlay.content)
                      setEditOverlay(null)
                    } else if (e.key === "Escape") {
                      setEditOverlay(null)
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-black/30">Press Enter to save, Esc to cancel</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditOverlay(null)}
                      className="h-7 px-3 text-xs text-black/50 hover:text-black/70"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        onEdit?.(editOverlay.id, editOverlay.content)
                        setEditOverlay(null)
                      }}
                      className="h-7 px-3 text-xs bg-black text-white hover:bg-black/80"
                    >
                      Save & Resend
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  function renderMessage(message: Message, index: number, isStreaming: boolean) {
    const isTerminalErrorResponse =
      message.role === "assistant" &&
      index > 0 &&
      messages[index - 1].role === "user" &&
      messages[index - 1].content.startsWith("[TERMINAL_ERROR_FIX]")

    const messageWrapperClass = cn(
      "relative w-full rounded-lg px-1 py-1",
      message.role === "user" ? "bg-[#e7e5df] dark:bg-[#2C2C30] text-[13px] text-foreground" : "text-[13px] text-foreground/90",
    )

    const renderedMessage = (
      <div
        className={messageWrapperClass}
        role={message.role === "user" ? "user-message" : "assistant-message"}
        aria-label={`${message.role} message`}
      >
        {message.role === "user" ? (
          <div className={cn("w-full transition-all", message.isAutomated && "")}>
            <div className="flex items-center justify-between mb-2 px-3 absolute top-3 right-0">
              {message.isAutomated && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white shadow-lg shadow-red-500/20 rounded-full text-[10px] font-bold mr-4 animate-pulse">
                  <Zap className="w-2.5 h-2.5" />
                  SPARK FIX TRIGGERED
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] mr-3 text-muted-foreground/50">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(message.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    const { mainText } = parseUserContent(message.content)
                    onEdit?.(message.id, mainText || message.content)
                  }}
                  className="p-0 h-auto text-foreground/70 flex items-center gap-1 cursor-pointer"
                  aria-label="User message options"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                {message.content.length > 200 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => toggleMessageExpand(message.id)}
                    className="p-0 h-auto text-foreground/70 flex items-center gap-1 cursor-pointer"
                  >
                    {expandedMessages[message.id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 px-1.5">
              {message.imageData && (
                typeof message.imageData === "string" ? (
                  <button
                    onClick={() => setSelectedImage(message.imageData as string)}
                    className="block rounded border border-border/40 hover:border-border/60 transition-colors overflow-hidden"
                    aria-label="View uploaded image"
                  >
                    <img
                      src={message.imageData || "/placeholder.svg?height=200&width=300"}
                      alt="Uploaded image"
                      className="max-w-xs max-h-48 object-cover hover:opacity-80 transition-opacity"
                    />
                  </button>
                ) : (
                  (message.imageData as { url: string; mimeType: string }[]).map((img: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img.url)}
                      className="block rounded border border-border/40 hover:border-border/60 transition-colors overflow-hidden"
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={img.url || "/placeholder.svg?height=200&width=300"}
                        alt={`Uploaded image ${idx + 1}`}
                        className="max-w-xs max-h-48 object-cover hover:opacity-80 transition-opacity"
                      />
                    </button>
                  ))
                )
              )}

              {message.uploadedFiles?.map((file: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFile(file)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 border border-border/20 rounded transition-colors text-sm w-full text-left"
                  aria-label={`View file ${file.name}`}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}

              {(() => {
                const { parts, mainText } = parseUserContent(message.content)
                const contextParts = parts.filter(
                  (p) => p.type === "file" || p.type === "pasted" || p.type === "database" || p.type === "design"
                )
                const hasContext = contextParts.length > 0

                return (
                  <div className="space-y-2">
                    {hasContext && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {contextParts.map((part, partIdx) => {
                          if (part.type === "file") {
                            return (
                              <TooltipProvider key={`file-${partIdx}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setContextModal({
                                          type: "file",
                                          name: part.content.name,
                                          content: part.content.fileContent,
                                        })
                                      }
                                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card dark:bg-white/5 border border-border/40 dark:border-white/10 hover:bg-muted/40 dark:hover:bg-white/10 transition-all cursor-pointer text-xs dark:text-white/80"
                                      aria-label={`View file ${part.content.name}`}
                                    >
                                      <FileText className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      <span className="truncate max-w-[100px]">{part.content.name}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Click to view full content</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }
                          if (part.type === "pasted") {
                            return (
                              <TooltipProvider key={`pasted-${partIdx}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setContextModal({
                                          type: "pasted",
                                          name: "Pasted Text",
                                          content: part.content,
                                        })
                                      }
                                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card dark:bg-white/5 border border-border/40 dark:border-white/10 hover:bg-muted/40 dark:hover:bg-white/10 transition-all cursor-pointer text-xs dark:text-white/80"
                                      aria-label="View pasted text"
                                    >
                                      <FileText className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      <span className="truncate max-w-[100px]">
                                        {part.content.substring(0, 15)}...
                                      </span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Click to view full content</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }
                          if (part.type === "database") {
                            return (
                              <TooltipProvider key={`db-${partIdx}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setContextModal({
                                          type: "database",
                                          name: "Database Connection",
                                          content: `Supabase URL: ${part.content.supabaseUrl}\nAnon Key: ${part.content.anonKey}`,
                                        })
                                      }
                                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card dark:bg-white/5 border border-border/40 dark:border-white/10 hover:bg-muted/40 dark:hover:bg-white/10 transition-all cursor-pointer text-xs dark:text-white/80"
                                      aria-label="View database connection"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Database Connected</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Click to view full content</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }
                          if (part.type === "design") {
                            return (
                              <TooltipProvider key={`design-${partIdx}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setContextModal({
                                          type: "design",
                                          name: `Design: ${part.content.name}`,
                                          content: part.content.json,
                                        })
                                      }
                                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card dark:bg-white/5 border border-border/40 dark:border-white/10 hover:bg-muted/40 dark:hover:bg-white/10 transition-all cursor-pointer text-xs dark:text-white/80"
                                      aria-label={`View design system ${part.content.name}`}
                                    >
                                      <div
                                        className="w-3 h-3 rounded"
                                        style={{
                                          backgroundColor: part.content.config?.primaryColor || "#000",
                                        }}
                                      />
                                      <span>{part.content.name}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Click to view full content</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }
                          return null
                        })}
                      </div>
                    )}

                    {mainText && (
                      <div
                        className={cn(
                          mainText.length > 200 &&
                          !(expandedMessages[message.id] ?? false) &&
                          "overflow-hidden relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-8 after:bg-gradient-to-t after:to-transparent",
                          message.isAutomated && message.content.includes("Terminal Error Detected") && "bg-white dark:bg-[#000000ff] px-4 py-3 rounded-lg font-mono text-black dark:text-white/70 border border-white/40"
                        )}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ node, inline, className, children, ...props }: any) => {
                              if (message.isAutomated && message.content.includes("Terminal Error Detected") && !inline) {
                                return (
                                  <div className="relative group text-[11px] text-black dark:text-white/70">
                                    <code className={cn("", className)} {...props}>
                                      {children}
                                    </code>
                                  </div>
                                )
                              }
                              return <code className={className} {...props}>{children}</code>
                            },
                            h1: ({ children }: any) => <h1 className={cn("text-xl font-bold mb-3", message.isAutomated ? "text-[11px] text-black dark:text-text-white/70" : "")}>{children}</h1>,
                            h2: ({ children }: any) => <h2 className={cn("text-lg font-bold mb-2", message.isAutomated ? "text-[11px] text-black dark:text-text-white/70" : "")}>{children}</h2>,
                            h3: ({ children }: any) => <h3 className={cn("text-base font-bold mb-1", message.isAutomated ? "text-[11px] text-black dark:text-text-white/70" : "")}>{children}</h3>,
                            strong: ({ children }: { children?: React.ReactNode }) => (
                              <strong className={cn("font-bold", message.isAutomated ? "text-[11px] text-black dark:text-white/70" : "text-black dark:text-white/90")}>{children}</strong>
                            ),
                            em: ({ children }: { children?: React.ReactNode }) => (
                              <em className={cn("italic", message.isAutomated ? "text-[11px] text-black dark:text-white/70" : "text-black/80 dark:text-white/70")}>{children}</em>
                            ),
                            p: ({ children }: { children?: React.ReactNode }) => (
                              <p className={cn("text-sm whitespace-pre-wrap leading-relaxed mb-1 last:mb-0", message.isAutomated ? "text-[11px] text-black dark:text-white/70" : "text-black/90 dark:text-white/80")}>
                                {children}
                              </p>
                            ),
                            ul: ({ children }: { children?: React.ReactNode }) => (
                              <ul className="list-disc pl-5 space-y-1 mb-1 last:mb-0">{children}</ul>
                            ),
                            ol: ({ children }: { children?: React.ReactNode }) => (
                              <ol className="list-decimal pl-5 space-y-1 mb-1 last:mb-0">{children}</ol>
                            ),
                            li: ({ children }: { children?: React.ReactNode }) => (
                              <li className="text-sm leading-relaxed">{children}</li>
                            ),
                          }}
                        >
                          {mainText}
                        </ReactMarkdown>
                        {message.content.includes("Terminal Error Detected") && (
                          <div className="mt-4 pt-2 border-t border-text-white/70 flex items-center justify-between">
                            <div className="text-[9px] text-black dark:text-white/70">Falbor AI Autopilot Active</div>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white/70 animate-ping" />
                              <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white/70" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 ml-8 mt-3 mb-4">
                <img src="/logo_light.png" alt="AI" className="w-24 absolute left-0 object-contain dark:hidden" />
                <img src="/logo.png" alt="AI" className="w-24 absolute left-0 object-contain hidden dark:block" />
                <div className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/40" />
              </div>
              {!(index === messages.length - 1 && isStreaming) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-[#e4e4e4] cursor-pointer"
                      aria-label="AI message options"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:border-white/40 w-[200px] p-1.5 bg-white border border-[#e4e4e4] shadow-xs rounded-lg dark:bg-[#000000ff] dark:text-white/40">
                    <DropdownMenuItem
                      className="cursor-pointer text-xs flex items-center dark:hover:bg-[#2C2C30] gap-2 hover:bg-gray-50 p-2 rounded-md text-gray-700 dark:text-white/40"
                      onClick={() => onRegenerate?.(message.id)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Recreate Response
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-xs flex items-center dark:hover:bg-[#2C2C30] gap-2 hover:bg-gray-50 p-2 rounded-md text-gray-700 dark:text-white/40"
                      onClick={() => {
                        const sections = parseAIResponse(message.content)
                        const textToCopy =
                          sections.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.content)
                            .join("\n") || message.content
                        handleCopy(textToCopy)
                        setCopiedId(message.id)
                        setTimeout(() => setCopiedId(null), 2000)
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedId === message.id ? "Copied!" : "Copy Message"}
                    </DropdownMenuItem>
                    {(message.tokensUsed || message.cost) && (
                      <div className="border-t border-white/40 mt-1 pt-1 px-2 py-1.5">
                        <div className="text-[10px] text-black/30 dark:text-white/80 mb-1">Usage</div>
                        {message.tokensUsed && (
                          <div className="flex items-center gap-1.5 text-[11px] text-black/50 dark:text-white/80">
                            <Zap className="w-3 h-3" />
                            <span className="dark:text-white/80">{message.tokensUsed.toLocaleString()} tokens</span>
                          </div>
                        )}
                        {message.cost && (
                          <div className="flex items-center gap-1.5 text-[11px] text-black/50 mt-0.5 dark:text-white/80">
                            <Database className="w-3 h-3" />
                            <span>${(message.cost / 100).toFixed(2)} credits</span>
                          </div>
                        )}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <AIMessageContent
              message={message}
              index={index}
              isStreaming={index === messages.length - 1 && isStreaming}
              thinkingTimer={thinkingTimer}
              expandedSections={expandedSections[message.id] || {}}
              activeMessageId={activeMessageId}
              onActivateVersion={onActivateVersion}
              onToggleSection={(section) => toggleSection(message.id, section)}
              onArtifactClick={onArtifactClick}
              onCodeSelect={handleCodeSelect}
              onViewChanges={handleViewChanges}
              onOpenFullModal={() => openFullMessageModal(message)}
              onOpenPreview={onOpenPreview}
            />
          </div>
        )}
      </div>
    )

    return (
      <div
        key={`${message.id}-${index}`}
        className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
      >
        {isTerminalErrorResponse ? (
          <div className="w-full bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
            <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Terminal Error Explanation & Fix
            </h3>
            {renderedMessage}
          </div>
        ) : (
          renderedMessage
        )}
      </div>
    )
  }
}

function GetFileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "tsx" || ext === "jsx") return <div className="w-3.5 h-3.5 flex items-center justify-center text-[#00D8FF]"><Zap className="w-full h-full fill-current" /></div>
  if (ext === "ts" || ext === "js") return <FileCode className="w-3.5 h-3.5 text-blue-500" />
  if (ext === "css") return <div className="w-3.5 h-3.5 text-pink-500"><FileText className="w-full h-full" /></div>
  if (ext === "json") return <Database className="w-3.5 h-3.5 text-yellow-600" />
  return <File className="w-3.5 h-3.5 text-gray-500" />
}

function WorkSummaryView({
  content,
  message,
  versionName,
  onActivateVersion,
  activeMessageId,
}: {
  content: any
  message: Message
  versionName: string | null
  onActivateVersion?: (id: string) => void
  activeMessageId?: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const summaryData = content || { summary: "", files: [] }
  const files = summaryData.files || []
  const summaryText = summaryData.summary || ""
  const fileCount = files.length

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-8 px-3 gap-2 bg-white dark:bg-white/5 border border-[#e4e4e4] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white/90 text-xs w-fit rounded-md transition-all shadow-xs",
          isExpanded && "border-blue-500 ring-1 ring-blue-500/10 dark:ring-blue-500/20"
        )}
      >
        <Edit className="w-3.5 h-3.5 text-blue-500" />
        <span className="font-medium">{fileCount} {fileCount === 1 ? 'edited file' : 'edited files'}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 space-y-3">
              {/* Files List */}
              <div className="bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10 p-2 space-y-1.5">
                {files.map((file: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] px-1.5 py-1">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <GetFileIcon name={file.name} />
                      <span className="truncate font-mono text-gray-700 dark:text-gray-300">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      {file.added > 0 && (
                        <span className="text-green-600">+{file.added}</span>
                      )}
                      {file.deleted > 0 && (
                        <span className="text-red-500">-{file.deleted}</span>
                      )}
                      {file.added === 0 && file.deleted === 0 && (
                        <span className="text-gray-400">0</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Version Button */}
              {versionName && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActivateVersion?.(message.id)}
                    className={cn(
                      "h-7 px-2.5 gap-2 bg-white dark:bg-white/5 border border-[#e4e4e4] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white/80 text-[10px] rounded-sm transition-all",
                      activeMessageId === message.id ? "border-blue-500 dark:border-blue-400 shadow-sm" : ""
                    )}
                  >
                    <HistoryIcon className="w-3 h-3 text-gray-500" />
                    <span className="font-semibold uppercase tracking-tight">{versionName}</span>
                  </Button>
                </div>
              )}

              {/* Brief Summary Text */}
              {summaryText && (
                <div className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed pl-1 italic border-l-2 border-gray-200 dark:border-white/10">
                  {summaryText}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AIMessageContent({
  message,
  index,
  isStreaming,
  thinkingTimer = 0,
  expandedSections,
  activeMessageId,
  onActivateVersion,
  onToggleSection,
  onArtifactClick,
  onCodeSelect,
  onViewChanges,
  onOpenFullModal,
  onOpenPreview,
}: {
  message: Message
  isStreaming: boolean
  thinkingTimer?: number
  expandedSections: Record<string, boolean>
  activeMessageId?: string | null
  onActivateVersion?: (id: string) => void
  onToggleSection: (section: string) => void
  onArtifactClick?: (artifactId: string) => void
  onCodeSelect: (block: { filename: string; code: string; language: string }) => void
  onViewChanges?: (block: { filename: string; code: string; language: string }) => void
  onOpenFullModal: () => void
  onOpenPreview?: (
    version: string,
    project: string,
    codeBlocks: Array<{ filename: string; code: string; language: string }>,
  ) => void
  index?: number
}) {
  const { parts, codeBlocks, files, versionName: parsedVersionName } = parseAIResponse(message.content)
  const versionName = message.versionName || parsedVersionName || (index ? `Version ${Math.floor(index / 2) + 1}` : null)

  // Auto-trigger terminal commands from <CustomAction>
  const triggeredActions = useRef<Set<string>>(new Set());

  useEffect(() => {
    parts.forEach((p, idx) => {
      if (p.type === 'customAction') {
        const action = p.content;
        const actionId = `action-${message.id}-${idx}-${action.name}-${action.content}`;

        if (!triggeredActions.current.has(actionId)) {
          const isGmail = action.name === "Open in Gmail";
          const isScanProvider = action.name === "Scan Provider";

          if (!isGmail && !isScanProvider) {
            console.log(`[Auto-Trigger] Running terminal command: ${action.content}`);
            window.dispatchEvent(new CustomEvent('terminal-run-command', {
              detail: { command: action.content }
            }));
            triggeredActions.current.add(actionId);
          } else if (isScanProvider) {
            // We don't auto-trigger scan provider as it's a message send, 
            // but user could want it. For now, let's keep it manual or user requested.
          }
        }
      }
    });
  }, [parts, message.id]);

  const markdownComponents = {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold text-black dark:text-white/90 bg-[#e4e4e4] dark:bg-white/10 px-1.5 py-1 rounded text-sm">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-black/80 dark:text-white/70">{children}</em>,
    p: ({ children }: { children?: React.ReactNode }) => (
      <div className="text-sm leading-relaxed whitespace-pre-wrap mb-1 last:mb-0 dark:text-white/80">{children}</div>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 mb-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 mb-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm leading-relaxed">{children}</li>,
    pre: ({ children }: { children?: React.ReactNode }) => (
      <div className="relative group/code my-4 rounded-md overflow-hidden">
        <pre className="m-0 p-0 whitespace-pre-wrap break-words">
          {children}
        </pre>
      </div>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "")
      const code = String(children).replace(/\n$/, "")

      if (inline) {
        return <code className="px-1.5 py-0.5 rounded text-sm text-black dark:text-white/90 font-mono bg-black/5 dark:bg-white/10" {...props}>{children}</code>
      }
      const [copied, setCopied] = useState(false);

      const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);

        // reset after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      };
      const isDark = document.documentElement.classList.contains("dark"); // or your state

      return (
        <div className="relative group">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 bg-white hover:bg-white cursor-pointer text-black/50 hover:text-black/50 rounded-md"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <SyntaxHighlighter
            language={match ? match[1] : "typescript"}
            style={oneLight}
            wrapLongLines={true}
            customStyle={{
              margin: 0,
              padding: "1rem",
              paddingRight: "1.25rem", // Extra padding to ensure 5px clearance before the edge if needed
              fontSize: "11px",
              lineHeight: "1.5",
              color: isDark ? "#f0f0f0" : "#2C2C30",
              background: isDark ? "#2C2C30" : "#f0f0f0",

            }}
            codeTagProps={{
              style: {
                background: "transparent",
                backgroundColor: "transparent",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxShadow: "none",
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )
    },
  }

  const getTitle = (type: string, content: any) => {
    switch (type) {
      case "thinking":
        return "Thinking Process"
      case "commentary":
        return "AI Commentary"
      case "userMessage":
        return "Understanding Requirements"
      case "planning":
        return "Implementation Plan"
      case "search":
        return "Knowledge Discovery"
      case "fileChecks":
        return `Code Validation ${content.length}`
      case "files":
        return `Generated Assets ${content.length}`
      case "importCard":
        return "GitHub Repo Integration"
      case "testing":
        return "Runtime Validation"
      case "discoverGmailTools":
        return "MCP: Discover Gmail Capabilities"
      case "testGmailTools":
        return "MCP: Executing Gmail Integration"
      case "compileGmailFindings":
        return "MCP: Gmail Security Intelligence"
      case "discoverDiscordTools":
        return "MCP: Discover Discord Capabilities"
      case "testDiscordTools":
        return "MCP: Executing Discord Integration"
      case "compileDiscordFindings":
        return "MCP: Discord Intelligence"
      case "discoverMessengerTools":
        return "MCP: Discover Messenger Capabilities"
      case "testMessengerTools":
        return "MCP: Executing Messenger Integration"
      case "compileMessengerFindings":
        return "MCP: Messenger Intelligence"
      case "reviewedWork":
        return "Mission Summary"
      case "scan":
        return "Context Scan"
      case "finalReasoning":
        return "Architectural Decisions"
      case "finalResponsive":
        return "Multi-Device Optimization"
      case "checkPackages":
        return "Dependency Sync"
      case "apiSearch":
        return content.name ? `Searching ${content.name} Docs` : "API Documentation Research"
      case "verifyingSolution":
        return content.name ? `Verifying ${content.name} Solution` : "Integrity Verification"
      case "terminal":
        return "Terminal Operations"
      case "internetSearch":
        return "Broad Internet Search"
      case "data":
        return "Data Analysis"
      case "codeBlock":
        return content?.filename ? `Code Generation ${content.filename}` : "Architecting System Files"
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "thinking":
      case "commentary":
        return Brain
      case "userMessage":
        return FileText
      case "search":
        return Search
      case "planning":
        return Lightbulb
      case "fileChecks":
        return Bug
      case "files":
        return Folder
      case "importCard":
        return Globe
      case "testing":
        return Globe
      case "discoverGmailTools":
        return List
      case "testGmailTools":
        return TerminalIcon
      case "compileGmailFindings":
        return CheckCircle2
      case "discoverDiscordTools":
      case "discoverMessengerTools":
        return List
      case "testDiscordTools":
      case "testMessengerTools":
        return TerminalIcon
      case "compileDiscordFindings":
      case "compileMessengerFindings":
        return ShieldAlert
      case "fileSearch":
        return ScanSearch
      case "reviewedWork":
        return ClipboardCheck
      case "testDiscordTools":
      case "testMessengerTools":
        return TerminalIcon
      case "compileDiscordFindings":
      case "compileMessengerFindings":
        return ShieldAlert
      case "scan":
        return ScanSearch
      case "fileSearch":
        return ScanSearch
      case "reviewedWork":
        return ClipboardCheck
      case "codeBlock":
        return Code2
      case "finalReasoning":
        return Brain
      case "finalResponsive":
        return Smartphone
      case "customAction":
        return Zap
      case "checkPackages":
        return ClipboardCheck
      case "workSummary":
        return Edit
      case "apiSearch":
        return Globe
      case "verifyingSolution":
        return ClipboardCheck
      case "terminal":
        return TerminalIcon
      case "internetSearch":
        return Globe
      case "data":
        return Database
      default:
        return FileText
    }
  }

  const renderPartContent = (type: string, content: any) => {
    switch (type) {
      case "thinking":
      case "commentary":
      case "userMessage":
      case "planning":
      case "search":
      case "discoverGmailTools":
      case "testGmailTools":
      case "compileGmailFindings":
      case "discoverDiscordTools":
      case "testDiscordTools":
      case "compileDiscordFindings":
      case "discoverMessengerTools":
      case "testMessengerTools":
      case "compileMessengerFindings":
      case "reviewedWork":
      case "finalReasoning":
      case "finalResponsive":
      case "workSummary":
      case "terminal":
      case "internetSearch":
      case "verifyingSolution":
      case "data":
        return (
          <div className="p-3">
            {type === "workSummary" ? (
              <WorkSummaryView
                content={content}
                message={message}
                versionName={versionName}
                onActivateVersion={onActivateVersion}
                activeMessageId={activeMessageId}
              />
            ) : type === "terminal" ? (
              <div className="space-y-3">
                <div className="text-xs text-black/50 dark:text-white/40 font-mono italic mb-1">Proposed Terminal Command:</div>
                <Button
                  size="sm"
                  className="bg-black dark:bg-white/10 text-white rounded-lg flex items-center gap-2 px-4 shadow-md transition-all hover:scale-[1.02] border-none"
                  onClick={() => {
                    const cmd = typeof content === 'object' ? content.content : content;
                    window.dispatchEvent(new CustomEvent('terminal-run-command', { detail: { command: cmd } }));
                  }}
                >
                  <TerminalIcon className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-xs tracking-wide uppercase">Execute in Terminal</span>
                  <div className="h-3 w-[1px] bg-white/20 mx-1" />
                  <code className="text-[10px] text-gray-400 font-mono">
                    {typeof content === 'object' ? content.content : content}
                  </code>
                </Button>
                {typeof content === 'string' && content.length > 50 && (
                  <div className="mt-2 text-[11px] text-black/40 dark:text-white/30 font-mono bg-black/5 dark:bg-white/5 p-2 rounded">
                    {content}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-black/70 dark:text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {renderToolContent(type, content)}
              </div>
            )}
            {/* Historical Version Button - show at end of summary */}
            {type === "reviewedWork" && message.versionName && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onActivateVersion?.(message.id)}
                  className={cn(
                    "h-8 px-3 gap-2 bg-white dark:bg-black dark:text-white/90 border hover:bg-gray-50 text-gray-900 text-xs",
                    activeMessageId === message.id ? "border-blue-500 shadow-sm" : ""
                  )}
                >
                  <HistoryIcon className="w-3.5 h-3.5" />
                  <span>{message.versionName}</span>
                </Button>
              </div>
            )}
          </div>
        )
      case "scan":
        return (
          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <ScanSearch className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Context Scan</span>
            </div>
            <div className="text-[13px] text-blue-800 leading-relaxed font-mono whitespace-pre-wrap">
              {renderToolContent(type, content)}
            </div>
          </div>
        )
      case "fileChecks":
        if (!Array.isArray(content)) return null
        return (
          <div className="space-y-2 p-2 border rounded-sm bg-red-50/50">
            {content.map((check: { file: string; error: string; fix: string; status: string }, idx: number) => (
              <div key={idx} className="bg-white p-3 rounded border-l-4 border-red-400 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="font-mono text-sm text-red-800">{check.file}</span>
                </div>
                <p className="text-xs text-red-700">
                  <strong>Error:</strong> {check.error}
                </p>
                {check.fix && (
                  <p className="text-xs text-green-700">
                    <strong>Fix:</strong> {check.fix}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  <strong>Status:</strong>{" "}
                  <span
                    className={cn("font-semibold", check.status === "FIXED" ? "text-green-600" : "text-yellow-600")}
                  >
                    {check.status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )
      case "tasks":
        if (!Array.isArray(content)) return null
        return (
          <div className="space-y-2 p rounded-md mb-4 p-3 dark:bg-[#2C2C30]">
            <div className="space-y-1.5">
              <h1 className="text-[16px]">Plan</h1>
              {content.map((task: { text: string; status: string }, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {task.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                  {task.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {task.status === "pending" && <Circle className="w-3.5 h-3.5 text-gray-300" />}
                  <span className={cn(
                    "text-black/70",
                    task.status === "success" && "dark:text-white"
                  )}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      case "importCard":
        return (
          <div className="mt-1 bg-[#e4e4e4] rounded-b-md px-3 py-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span>Import {content.repo}</span>
            </div>
          </div>
        )
      case "testing":
        return (
          <div className="mt-2 p-2">
            <div className="w-64 h-64 bg-white dark:bg-[#1E1E21] border dark:border-white/10 overflow-hidden">
              <SandpackProvider
                files={codeBlocks.reduce((acc: Record<string, string>, block) => {
                  acc[`/${block.filename}`] = block.code
                  return acc
                }, {})}
                template="react-ts"
                theme={document.documentElement.classList.contains('dark') ? "dark" : "light"}
              >
                <SandpackPreview style={{ height: "100%" }} />
              </SandpackProvider>
            </div>
            <p className="mt-2 text-sm text-gray-600">{content}</p>
          </div>
        )
      case "apiSearch": {
        const lines = content.results.split('\n');
        const links = lines.filter((l: string) => l.includes('http'));
        const info = lines.filter((l: string) => !l.includes('http')).join('\n');

        return (
          <div className="p-3 space-y-3">
            {content.results.includes("encountered an api error") || content.results.includes("encountered an error") ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">I encountered an API error during the search</span>
              </div>
            ) : (
              <>
                <div className="text-[13px] text-black/70 dark:text-white/80 leading-relaxed whitespace-pre-wrap italic">
                  {info || "Found documentation and integration details for " + content.name}
                </div>

                {links.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-black/30 dark:text-white/40 uppercase tracking-wider px-1">Sources & Links</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {links.map((link: string, i: number) => {
                        const match = link.match(/\[(.*?)\]\((.*?)\)/) || link.match(/(https?:\/\/[^\s]+)/);
                        const title = match ? (match[1] || match[0]) : "Documentation Link";
                        const url = match ? (match[2] || match[1]) : link;

                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-black/[0.03] dark:bg-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 rounded-lg transition-all group/link"
                          >
                            <Globe className="w-3 h-3 text-black/40 dark:text-white/30 group-hover/link:text-blue-500" />
                            <span className="text-xs text-black/60 dark:text-white/70 truncate group-hover/link:text-black dark:group-hover/link:text-white font-medium">{title}</span>
                            <ChevronRight className="w-3 h-3 text-black/20 dark:text-white/10 ml-auto group-hover/link:text-black/40 dark:group-hover/link:text-white/30" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8 mt-1 bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/10 text-[11px] font-bold uppercase tracking-tight text-black/40 dark:text-white/40 transition-colors">
                      <span>View Technical Details</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-black/90 rounded-lg font-mono text-[11px] leading-relaxed text-blue-300 border border-blue-500/20 overflow-x-auto">
                      <div className="text-blue-500/50 mb-2 uppercase text-[9px] font-bold tracking-widest">Metadata / Raw Docs</div>
                      {content.results}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )
      }
      case "fileSearch":
        return (
          <div className="px-2 py-1 border rounded-sm space-y-2">
            <div className="text-[13px] text-gray-700 whitespace-pre-wrap">{content.results}</div>
          </div>
        )
      case "mobileReview":
      case "deepConclusion":
      case "internalThought":
        return null
      case "customAction": {
        const isGmail = content.name === "Open in Gmail";
        const isScanProvider = content.name === "Scan Provider";
        const actionText = isGmail ? "Open in Gmail" : isScanProvider ? "Scan Provider" : "Run in Terminal";
        const Icon = isGmail ? Mail : isScanProvider ? Search : TerminalIcon;
        const buttonColor = isGmail ? "bg-red-600 hover:bg-red-700" : isScanProvider ? "bg-blue-600 hover:bg-blue-700" : "bg-black dark:bg-white/10 hover:bg-black/90 dark:hover:bg-white/20";

        return (
          <div className="mt-2 mb-4">
            <Button
              size="sm"
              className={cn(
                "text-white rounded-lg flex items-center gap-2 px-4 shadow-md transition-all hover:scale-[1.02]",
                buttonColor
              )}
              onClick={() => {
                const val = typeof content === 'object' ? content.content : content;
                if (isGmail) {
                  window.open(val, '_blank');
                } else if (isScanProvider) {
                  window.dispatchEvent(new CustomEvent('chat:send-message', { detail: { message: val } }));
                } else {
                  window.dispatchEvent(new CustomEvent('terminal-run-command', { detail: { command: val } }));
                }
              }}
            >
              <Icon className={cn("w-4 h-4", isGmail ? "text-white" : isScanProvider ? "text-white" : "text-blue-400")} />
              <span className="font-semibold text-xs tracking-wide uppercase">{actionText}</span>
              {!isGmail && !isScanProvider && (
                <>
                  <div className="h-3 w-[1px] bg-white/20 mx-1" />
                  <code className="text-[10px] text-gray-400 font-mono">
                    {typeof content === 'object' ? content.content : content}
                  </code>
                </>
              )}
            </Button>
          </div>
        )
      }
      case "codeBlock": {
        return (
          <div className="p-2 rounded-lg">
            <div className="rounded-md border border-black/10 dark:border-white/10 max-h-[200px] overflow-y-auto bg-white dark:bg-[#1E1E21] custom-scrollbar">
              <SyntaxHighlighter
                language={content.language || "typescript"}
                style={document.documentElement.classList.contains('dark') ? oneDark : oneLight}
                wrapLongLines={true}
                customStyle={{
                  margin: 0,
                  padding: "12px",
                  fontSize: "11px",
                  lineHeight: "1.5",
                  background: "transparent",
                }}
                codeTagProps={{
                  style: {
                    background: "transparent",
                    backgroundColor: "transparent",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: "none",
                  }
                }}
              >
                {content.code}
              </SyntaxHighlighter>
            </div>
          </div>
        )
      }
      case "checkPackages":
        return (
          <div className="mt-4 mb-6">
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Missing Packages Detector</h4>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Scan all generated code for required external dependencies (libraries, SDKs, UI kits) and install them automatically.
              </p>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 px-4 shadow-sm"
                onClick={() => {
                  const importsFound = new Set<string>();
                  codeBlocks.forEach(block => {
                    const importRegex = /(?:import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"])|(?:import\(['"]([^'"]+)['"]\))/g;
                    let m;
                    while ((m = importRegex.exec(block.code)) !== null) {
                      const pkg = m[1] || m[2];
                      if (!pkg.startsWith(".") && !pkg.startsWith("/") && !pkg.startsWith("@/") && !["path", "fs", "os", "http", "https"].includes(pkg)) {
                        // Extract base package name (e.g., @supabase/supabase-js -> @supabase/supabase-js or lodash/chunk -> lodash)
                        let basePkg = pkg;
                        if (pkg.startsWith("@")) {
                          const parts = pkg.split("/");
                          if (parts.length >= 2) basePkg = `${parts[0]}/${parts[1]}`;
                        } else {
                          basePkg = pkg.split("/")[0];
                        }

                        // Ignore common base packages that are likely already present
                        const commonPks = ["react", "react-dom", "lucide-react", "framer-motion", "clsx", "tailwind-merge", "react-router-dom", "next"];
                        if (!commonPks.includes(basePkg)) {
                          importsFound.add(basePkg);
                        }
                      }
                    }
                  });

                  if (importsFound.size > 0) {
                    const command = `npm i ${Array.from(importsFound).join(" ")}`;
                    window.dispatchEvent(new CustomEvent('terminal-run-command', { detail: { command } }));
                  } else {
                    // Alert or toast that no missing packages were found
                    console.log("No missing packages detected.");
                  }
                }}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="font-bold text-xs">CHECK PACKAGES</span>
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-3 w-full">
      {/* FalMax Multi-Agent Pipeline Visualization
      {message.metadata?.agentActivities && (
        <div className="mb-4 bg-black/[0.02] border border-black/[0.05] rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Cpu className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black/50">FalMax Orchestration Pipeline</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { id: 'ARCHITECT', label: 'Architect', icon: Lightbulb, color: 'blue' },
              { id: 'BUILDER', label: 'Builder', icon: Zap, color: 'amber' },
              { id: 'REVIEWER', label: 'Reviewer', icon: Shield, color: 'emerald' },
              { id: 'NARRATOR', label: 'Narrator', icon: AudioLinesIcon, color: 'indigo' },
            ].map((agent) => {
              const status = (message.metadata?.agentActivities as any)?.[agent.id]
              const Icon = agent.icon
              const isActive = status && !status.toLowerCase().includes('done') && !status.toLowerCase().includes('planned') && !status.toLowerCase().includes('completed')
              
              return (
                <div key={agent.id} className={cn(
                  "flex flex-col gap-1.5 p-2 rounded-lg border transition-all duration-300",
                  status ? `bg-${agent.color}-50/50 border-${agent.color}-100/50` : "bg-white/50 border-black/[0.03] opacity-50"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1 rounded-md",
                      status ? `bg-${agent.color}-100 text-${agent.color}-600` : "bg-gray-100 text-gray-400"
                    )}>
                      <Icon className={cn("w-3 h-3", isActive && "animate-pulse")} />
                    </div>
                    <span className="text-[10px] font-bold text-black/70 leading-none">{agent.label}</span>
                  </div>
                  <div className="min-h-[14px]">
                    {status ? (
                      <TextShimmer className={cn(
                        "text-[9px] font-medium leading-none",
                        `text-${agent.color}-700/80`
                      )}>
                        {status}
                      </TextShimmer>
                    ) : (
                      <span className="text-[9px] text-black/20 font-medium leading-none italic">Waiting...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )} */}

      {isStreaming && (!parts || parts.length === 0 || (parts.length === 1 && parts[0].type === "text" && !parts[0].content)) && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-sm font-medium text-black/75 bg-transparent border-none p-0 h-auto cursor-default"
            disabled
          >
            <TerminalIcon className="w-4 h-4" />
            <TextShimmer duration={1.5}>Thinking...</TextShimmer>
          </Button>
        </div>
      )}

      {/* Clone Screenshot Preview — shown at top of AI response when clone mode was used */}
      {(() => {
        const screenshotMatch = message.content.match(/<clone-screenshot\s+src="([^"]+)"\s*\/>/)
        if (!screenshotMatch) return null
        const screenshotSrc = screenshotMatch[1]
        // Extract the URL from surrounding markdown if present
        const urlMatch = message.content.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/)
        const capturedUrl = urlMatch?.[2] || ""
        const capturedLabel = urlMatch?.[1] || capturedUrl
        return (
          <div className="mb-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-black dark:bg-[#1E1E21] text-white text-xs font-medium border-b dark:border-white/5">
              <svg className="w-3.5 h-3.5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="opacity-60">Captured screenshot:</span>
              {capturedUrl ? (
                <a href={capturedUrl} target="_blank" rel="noopener noreferrer" className="truncate text-blue-300 hover:text-blue-200 transition-colors">
                  {capturedLabel}
                </a>
              ) : (
                <span className="truncate opacity-80">target site</span>
              )}
            </div>
            <img
              src={screenshotSrc}
              alt="Captured website screenshot"
              className="w-full block"
              style={{ maxHeight: 400, objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        )
      })()}

      {parts.map((p, idx) => (
        <div
          key={`${message.id}-part-${idx}`}
          className="w-full"
        >
          {(() => {
            // Only text and previewButton render directly
            const nonCollapsible = ["text", "previewButton"];
            if (!isStreaming) {
              nonCollapsible.push("reviewedWork");
            }

            if (p.type === "text") {
              // Strip any raw XML tags and agent status JSON that leaked through
              const cleanedText = p.content
                .replace(/<\/?(?:Thinking|Commentary|UserMessage|Planning|Search|FileChecks|Files|Testing|FileSearch|ReviewedWork|FinalReasoning|FinalResponsive|MobileReview|DeepConclusion|InternalThought|CustomAction|Tasks|PreviewButton|ImportCard|AIOnly|InternalFinishCheck|GeneratedCode|HiddenCode)[^>]*>/gi, "")
                .replace(/\{"type":\s*"agent",\s*"agent":\s*"[^"]*",\s*"status":\s*"[^"]*"\}\s*/g, "")
                .replace(/([_\-*=~`#]){3,}\s*$/gm, "")
                .replace(/\n{3,}/g, "\n\n")
                .trim()

              if (!cleanedText) return null

              return (
                <div className="prose prose-sm max-w-none text-black/75 dark:text-white/90">
                  {isStreaming && parts.filter((pt) => pt.type === "text").every((pt) => !pt.content) ? (
                    <div className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating response...</span>
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {cleanedText}
                    </ReactMarkdown>
                  )}
                </div>
              );
            }

            if (p.type === "previewButton") {
              return (
                <div className="mt-4">
                  <Button
                    onClick={() => onOpenPreview?.(p.content.version, p.content.project, codeBlocks)}
                    className="relative cursor-pointer flex items-center gap-2 justify-start w-full text-left text-sm font-medium text-black/75 dark:text-white/80 hover:text-black dark:hover:text-white bg-transparent hover:bg-transparent border-none p-0 h-auto group transition-colors"
                  >
                    <div className="relative w-4 h-4">
                      <Globe className="absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-100 translate-y-0 group-hover:opacity-0 group-hover:-translate-y-1" />
                      <ChevronRight className="absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0" />
                    </div>
                    {p.content.text}
                  </Button>
                </div>
              );
            }

            if (nonCollapsible.includes(p.type)) {
              return renderPartContent(p.type, p.content);
            }

            // ALL other tags (thinking, planning, testing, reviewedWork, finalReasoning, etc.) go into collapsibles
            const collapsibleTypes = [
              "thinking", "commentary", "userMessage", "planning", "search",
              "fileChecks", "importCard", "testing", "fileSearch", "customAction",
              "finalReasoning", "finalResponsive", "tasks", "apiSearch",
              "discoverGmailTools", "testGmailTools", "compileGmailFindings",
              "codeBlock" // Added codeBlock here
            ];

            if (isStreaming) {
              collapsibleTypes.push("reviewedWork");
            }

            if (!collapsibleTypes.includes(p.type)) return null;

            const collapsibleIndex = parts.slice(0, idx).filter((pt) => collapsibleTypes.includes(pt.type)).length;
            const sectionKey = `section-${collapsibleIndex}`;
            const isLastPart = idx === parts.length - 1;
            const isActive = isStreaming && isLastPart;
            // AUTO-OPEN: Automatically expand the section if it is currently streaming/active, 
            // OR if it's an unfinished code block (content.isOpen was set in the parser)
            const isOpen = (isActive && p.type === "codeBlock") || (p.type === "codeBlock" && p.content.isOpen) || (expandedSections[sectionKey] ?? false);
            const title = p.type === "customAction" ? p.content.name : getTitle(p.type, p.content);
            const Icon = getIcon(p.type);

            return (
              <Collapsible open={isOpen} onOpenChange={() => onToggleSection(sectionKey)} id={`section-${sectionKey}-${message.id}`}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative cursor-pointer flex items-center gap-2 justify-start w-full text-left text-sm font-medium text-black/75 dark:text-white/80 hover:text-black dark:hover:text-white bg-transparent hover:bg-transparent border-none p-0 h-auto group transition-colors"
                  >
                    <div className="relative w-4 h-4">
                      <Icon className={cn("absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-100 translate-y-0 text-muted-foreground dark:text-white/60", isOpen && "opacity-0 -translate-y-1", "group-hover:opacity-0 group-hover:-translate-y-1")} />
                      <ChevronDown className={cn("absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-0 translate-y-1 dark:text-white/60", isOpen && "opacity-100 translate-y-0 rotate-180", "group-hover:opacity-100 group-hover:translate-y-0")} />
                    </div>
                    {isActive ? (
                      <TextShimmer duration={1.5} className="text-sm font-medium">{title}</TextShimmer>
                    ) : (
                      <span>{title}</span>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {renderPartContent(p.type, p.content)}
                </CollapsibleContent>
              </Collapsible>
            );
          })()}
        </div>
      ))}
      {isStreaming && parts.some((p) => p.type === "text" && p.content) && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
      )}
    </div>
  )
}