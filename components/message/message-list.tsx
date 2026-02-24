"use client"

import type React from "react"

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
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState, useEffect, useCallback } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import remarkGfm from "remark-gfm"
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react"
import { useUser } from "@clerk/nextjs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { Smartphone } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  hasArtifact?: boolean
  createdAt?: string
  imageData?: Array<{ url: string; mimeType: string }> | null
  uploadedFiles?: Array<{ name: string; content: string; type: string }> | null
}

interface MessageListProps {
  messages: Message[]
  projectId: string
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
  }

  // Tags that should NEVER bleed into the visible text content
  const hiddenTagNames = [
    "InternalFinishCheck", "AIOnly", "Thinking", "Commentary", "UserMessage",
    "Planning", "Search", "FileChecks", "Files", "Testing", "FileSearch",
    "ReviewedWork", "FinalReasoning", "FinalResponsive", "MobileReview",
    "DeepConclusion", "InternalThought", "Tasks",
  ]

  let processedContent = content
    .replace(/<\/InternalFinishCheck>/gi, "")
    .replace(/<InternalFinishCheck>/gi, "")
    .replace(/<\/AIOnly>([\s\S]*?)<AIOnly>/gi, "")
    .replace(/<AIOnly>([\s\S]*?)<\/AIOnly>/gi, "")

  const matches: Array<{ type: string; start: number; fullMatch: string; content: any }> = []

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
      } else if (type === "customAction") {
        parsedContent = { name: match[1], content: match[2].trim() }
      } else {
        parsedContent = match[1].trim()
      }
      matches.push({ type, start: match.index!, fullMatch: match[0], content: parsedContent })
    }
  }

  const codeRegex = /```(\w+)?\s*(?:file="([^"]+)")?\s*\n([\s\S]*?)```/g
  const codeBlocks: Array<{ filename: string; code: string; language: string; isOpen?: boolean }> = []
  for (const match of processedContent.matchAll(codeRegex)) {
    const language = match[1] || "typescript"
    const filename = match[2] || `file.${language}`
    const code = match[3].trim()
    const content = { filename, code, language, isOpen: false }
    codeBlocks.push(content)
    matches.push({
      type: "codeBlock",
      start: match.index!,
      fullMatch: match[0],
      content
    })
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

  // Live Code Block Tracking at the end
  const openCodeRegex = /```(\w+)?\s*(?:file="([^"]+)")?\s*\n([\s\S]*?)$/g
  const openMatch = openCodeRegex.exec(finalText)
  if (openMatch) {
    const textBefore = finalText.substring(0, openMatch.index).trim()
    if (textBefore) parts.push({ type: "text", content: textBefore })

    const lang = openMatch[1] || "typescript"
    const file = openMatch[2] || `file.${lang}`
    const content = { filename: file, code: openMatch[3].trim(), language: lang, isOpen: true }
    parts.push({ type: "codeBlock", content })
    codeBlocks.push(content)
    finalText = "" // consumed
  }

  if (finalText) {
    const simpleTypes = [
      "thinking", "commentary", "userMessage", "planning", "search",
      "fileChecks", "files", "testing", "fileSearch", "reviewedWork",
      "finalReasoning", "finalResponsive", "mobileReview", "deepConclusion",
      "internalThought", "customAction", "tasks"
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
        .replace(/<\/?(?:Thinking|Commentary|UserMessage|Planning|Search|FileChecks|Files|Testing|FileSearch|ReviewedWork|FinalReasoning|FinalResponsive|MobileReview|DeepConclusion|InternalThought|CustomAction|Tasks|PreviewButton|ImportCard|AIOnly|InternalFinishCheck)[^>]*>/gi, "")
        .replace(/([_\-*=~`#]){3,}\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
      if (safeText) {
        parts.push({ type: "text", content: safeText })
      }
    }
  }

  return { parts, codeBlocks, files: [] }
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

export function MessageList({
  messages,
  projectId,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>("")
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
  const [contextModal, setContextModal] = useState<{
    type: "file" | "pasted" | "database" | "design"
    name: string
    content: string
  } | null>(null)
  const [thinkingTimer, setThinkingTimer] = useState(0)
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
      const hist = fileHistory[block.filename] || []
      if (hist.length > 1) {
        const oldCode = hist[hist.length - 2].code
        setSelectedOldCode(oldCode)
      } else {
        setSelectedOldCode(null)
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
      setThinkingTimer(0)
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
    <div className="space-y-3" role="log" aria-live="polite">
      {messages.map((message, index) => {
        const isStreaming = message.id.startsWith("temp-") && index === messages.length - 1
        const isEditing = editingId === message.id

        const isTerminalErrorResponse =
          message.role === "assistant" &&
          index > 0 &&
          messages[index - 1].role === "user" &&
          messages[index - 1].content.startsWith("[TERMINAL_ERROR_FIX]")

        const messageWrapperClass = cn(
          "relative max-w-[100%] rounded-lg px-1 py-3",
          message.role === "user" ? "BackgroundStyleButton text-[15px] text-black w-full" : "text-[15px] text-black",
        )

        const renderedMessage = (
          <div
            className={messageWrapperClass}
            role={message.role === "user" ? "user-message" : "assistant-message"}
            aria-label={`${message.role} message`}
          >
            {message.role === "user" ? (
              <div className="flex items-start gap-2 w-full px-3">
                <div className="flex-1 space-y-2">
                  {message.imageData?.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img.url)}
                      className="block rounded border border-black/10 hover:border-black/20 transition-colors overflow-hidden"
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={img.url || "/placeholder.svg?height=200&width=300"}
                        alt={`Uploaded image ${idx + 1}`}
                        className="max-w-xs max-h-48 object-cover hover:opacity-80 transition-opacity"
                      />
                    </button>
                  ))}

                  {message.uploadedFiles?.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFile(file)}
                      className="flex items-center gap-2 px-3 py-2 bg-black/5 hover:bg-black/10 rounded transition-colors text-sm w-full text-left"
                      aria-label={`View file ${file.name}`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}

                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          onEdit?.(message.id, editContent)
                          setEditingId(null)
                        } else if (e.key === "Escape") {
                          setEditingId(null)
                        }
                      }}
                      className="w-full p-2 border rounded resize-none text-sm bg-white text-black/75"
                      placeholder="Edit your message..."
                      autoFocus
                      rows={3}
                    />
                  ) : (
                    <>
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
                                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white bg-white/90 hover:bg-[#e4e4e4c4] transition-all cursor-pointer text-xs"
                                              aria-label={`View file ${part.content.name}`}
                                            >
                                              <FileText className="w-3 h-3 text-gray-600" />
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
                                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white bg-white/90 hover:bg-[#e4e4e4c4] transition-all cursor-pointer text-xs"
                                              aria-label="View pasted text"
                                            >
                                              <FileText className="w-3 h-3 text-gray-600" />
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
                                              className="flex items-center gap-2 px-2 py-1 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-all cursor-pointer text-xs text-green-700"
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
                                              className="flex items-center gap-2 px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all cursor-pointer text-xs text-purple-700"
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
                                  "max-h-32 overflow-hidden relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-8 after:bg-gradient-to-t after:to-transparent"
                                )}
                              >
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    strong: ({ children }: { children?: React.ReactNode }) => (
                                      <strong className="font-bold text-black">{children}</strong>
                                    ),
                                    em: ({ children }: { children?: React.ReactNode }) => (
                                      <em className="italic text-black/80">{children}</em>
                                    ),
                                    p: ({ children }: { children?: React.ReactNode }) => (
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed mb-1 last:mb-0">
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
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full">
                <AIMessageContent
                  message={message}
                  isStreaming={isStreaming}
                  thinkingTimer={thinkingTimer}
                  expandedSections={expandedSections[message.id] || {}}
                  onToggleSection={(section) => toggleSection(message.id, section)}
                  onArtifactClick={onArtifactClick}
                  onCodeSelect={handleCodeSelect}
                  onOpenFullModal={() => openFullMessageModal(message)}
                  onOpenPreview={onOpenPreview}
                />
              </div>
            )}

            {message.role === "user" ? (
              <div className="absolute top-2 right-1 flex items-center gap-1">
                {message.content.length > 200 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => toggleMessageExpand(message.id)}
                    className="p-0 h-auto text-black/70 flex items-center gap-1 cursor-pointer"
                  >
                    {expandedMessages[message.id] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {!isStreaming && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const sections = parseAIResponse(message.content)
                        const textToCopy =
                          sections.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.content)
                            .join("\n") || message.content
                        handleCopy(textToCopy)
                      }}
                      className="h-6 w-6 p-0 hover:bg-[#e4e4e4]"
                      aria-label="Copy response"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </>
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
      })}

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
                message={fullMessageModal}
                isStreaming={false}
                thinkingTimer={0}
                expandedSections={modalExpandedSections}
                onToggleSection={toggleModalSection}
                onArtifactClick={onArtifactClick}
                onCodeSelect={handleCodeSelect}
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
    </div>
  )
}

function AIMessageContent({
  message,
  isStreaming,
  thinkingTimer = 0,
  expandedSections,
  onToggleSection,
  onArtifactClick,
  onCodeSelect,
  onOpenFullModal,
  onOpenPreview,
}: {
  message: Message
  isStreaming: boolean
  thinkingTimer?: number
  expandedSections: Record<string, boolean>
  onToggleSection: (section: string) => void
  onArtifactClick?: (artifactId: string) => void
  onCodeSelect: (block: { filename: string; code: string; language: string }) => void
  onOpenFullModal: () => void
  onOpenPreview?: (
    version: string,
    project: string,
    codeBlocks: Array<{ filename: string; code: string; language: string }>,
  ) => void
}) {
  const { parts, codeBlocks, files } = parseAIResponse(message.content)

  const markdownComponents = {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold text-black bg-[#e4e4e4] px-1.5 py-1 rounded text-sm">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-black/80">{children}</em>,
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-1 last:mb-0">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 mb-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 mb-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm leading-relaxed">{children}</li>,
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <code className={cn("bg-gray-100 px-1 py-0.5 rounded text-xs font-mono", className)}>{children}</code>
    ),
  }

  const getTitle = (type: string, content: any) => {
    switch (type) {
      case "thinking":
        return "Thinking"
      case "commentary":
        return "Commentary"
      case "userMessage":
        return "Read"
      case "planning":
        return "Planning"
      case "search":
        return "Search Results"
      case "fileChecks":
        return `File Checks ${content.length}`
      case "files":
        return `Files ${content.length}`
      case "importCard":
        return "Importing GitHub Repository"
      case "testing":
        return "Live Testing"
      case "reviewedWork":
        return "Work Summary"
      case "finalReasoning":
        return "Design Analysis"
      case "finalResponsive":
        return "Responsive Review"
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
      case "fileSearch":
        return ScanSearch
      case "reviewedWork":
        return ClipboardCheck
      case "finalReasoning":
        return Brain
      case "finalResponsive":
        return Smartphone
      case "customAction":
        return Zap
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
        return (
          <div className="p-1">
            <span className="text-[14px] text-[#2e2e2e]">{content}</span>
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
          <div className="space-y-2 p-3 bg-blue-50/30 border border-blue-100 rounded-md mb-4 shadow-sm">
            <h1 className="font-semibold flex items-center gap-2 text-blue-700 text-sm">
              <List className="h-4 w-4" />
              Progress Tasks
            </h1>
            <div className="space-y-1.5 mt-2">
              {content.map((task: { text: string; status: string }, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {task.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                  {task.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {task.status === "pending" && <Circle className="w-3.5 h-3.5 text-gray-300" />}
                  <span className={cn(
                    "text-black/70",
                    task.status === "success" && "line-through text-black/40"
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
            <div className="w-64 h-64 bg-white border overflow-hidden">
              <SandpackProvider
                files={codeBlocks.reduce((acc: Record<string, string>, block) => {
                  acc[`/${block.filename}`] = block.code
                  return acc
                }, {})}
                template="react-ts"
                theme="light"
              >
                <SandpackPreview style={{ height: "100%" }} />
              </SandpackProvider>
            </div>
            <p className="mt-2 text-sm text-gray-600">{content}</p>
          </div>
        )
      case "fileSearch":
        return (
          <div className="p-3 bg-[#e4e4e433] border rounded-sm space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Search className="w-4 h-4" />
              <span>Query: "{content.query}"</span>
            </div>
            <div className="text-[13px] text-gray-700 whitespace-pre-wrap">{content.results}</div>
          </div>
        )
      case "reviewedWork":
      case "finalReasoning":
      case "finalResponsive":
        return (
          <div className="">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <span>{getTitle(type, content)}</span>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          </div>
        )
      case "mobileReview":
      case "deepConclusion":
      case "internalThought":
        return null
      case "codeBlock": {
        // Show only a file button - clicking opens the code in a modal
        // Never show raw code inline in the chat message
        return (
          <div className="mt-2 mb-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 bg-[#f8f9fa] border-[#e9ecef] hover:bg-[#e9ecef] text-[#495057] font-medium shadow-sm"
                onClick={() => onCodeSelect(content)}
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs font-mono">{content.filename}</span>
              </Button>
              <AnimatePresence mode="wait">
                {content.isOpen ? (
                  <motion.div
                    key="writing"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <TextShimmer className="text-xs text-blue-600 font-medium">Writing...</TextShimmer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">Done</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="space-y-3 w-full">
      {isStreaming && (!parts || parts.length === 0 || (parts.length === 1 && parts[0].type === "text" && !parts[0].content)) && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-sm font-medium text-black/75 bg-transparent border-none p-0 h-auto cursor-default"
            disabled
          >
            <Brain className="w-4 h-4" />
            <TextShimmer duration={1.5}>Thinking...</TextShimmer>
          </Button>
        </div>
      )}

      {parts.map((p, idx) => (
        <div
          key={`${message.id}-part-${idx}`}
          className="w-full"
        >
          {(() => {
            // Only text and previewButton and codeBlock render directly
            const nonCollapsible = ["text", "previewButton", "codeBlock"];
            if (!isStreaming) {
              nonCollapsible.push("reviewedWork");
            }

            if (p.type === "text") {
              // Strip any raw XML tags that leaked through before displaying
              const cleanedText = p.content
                .replace(/<\/?(?:Thinking|Commentary|UserMessage|Planning|Search|FileChecks|Files|Testing|FileSearch|ReviewedWork|FinalReasoning|FinalResponsive|MobileReview|DeepConclusion|InternalThought|CustomAction|Tasks|PreviewButton|ImportCard|AIOnly|InternalFinishCheck)[^>]*>/gi, "")
                .replace(/([_\-*=~`#]){3,}\s*$/gm, "")
                .replace(/\n{3,}/g, "\n\n")
                .trim()

              if (!cleanedText) return null

              return (
                <div className="prose prose-sm max-w-none text-black/75">
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
                    className="relative cursor-pointer flex items-center gap-2 justify-start w-full text-left text-sm font-medium text-black/75 hover:text-black bg-transparent hover:bg-transparent border-none p-0 h-auto group"
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
              // Don't render codeBlock buttons while the message is still streaming
              // to prevent partial/ghost file buttons appearing mid-generation
              if (p.type === "codeBlock" && isStreaming) return null
              return renderPartContent(p.type, p.content);
            }

            // ALL other tags (thinking, planning, testing, reviewedWork, finalReasoning, etc.) go into collapsibles
            const collapsibleTypes = [
              "thinking", "commentary", "userMessage", "planning", "search",
              "fileChecks", "importCard", "testing", "fileSearch", "customAction",
              "finalReasoning", "finalResponsive", "tasks"
            ];

            if (isStreaming) {
              collapsibleTypes.push("reviewedWork");
            }

            if (!collapsibleTypes.includes(p.type)) return null;

            const collapsibleIndex = parts.slice(0, idx).filter((pt) => collapsibleTypes.includes(pt.type)).length;
            const sectionKey = `section-${collapsibleIndex}`;
            const isLastPart = idx === parts.length - 1;
            const isActive = isStreaming && isLastPart;
            const isOpen = expandedSections[sectionKey] ?? (isActive ? true : false);
            const title = p.type === "customAction" ? p.content.name : getTitle(p.type, p.content);
            const Icon = getIcon(p.type);

            return (
              <Collapsible open={isOpen} onOpenChange={() => onToggleSection(sectionKey)} id={`section-${sectionKey}-${message.id}`}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative cursor-pointer flex items-center gap-2 justify-start w-full text-left text-sm font-medium text-black/75 hover:text-black bg-transparent hover:bg-transparent border-none p-0 h-auto group"
                  >
                    <div className="relative w-4 h-4">
                      <Icon className={cn("absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-100 translate-y-0", isOpen && "opacity-0 -translate-y-1", "group-hover:opacity-0 group-hover:-translate-y-1")} />
                      <ChevronDown className={cn("absolute inset-0 w-4 h-4 transition-all duration-200 ease-in-out opacity-0 translate-y-1", isOpen && "opacity-100 translate-y-0 rotate-180", "group-hover:opacity-100 group-hover:translate-y-0")} />
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