"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { MessageList } from "@/components/message/message-list"
import { ChatInput } from "@/components/layout/chat"
import { CodePreview } from "@/components/workbench/code-preview"
import type { Project, Message as SchemaMessage } from "@/config/schema"
import { Navbar } from "./chat/navbar"
import { useAuth } from "@clerk/nextjs"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

interface StrictMessage extends Omit<SchemaMessage, "role"> {
  role: "user" | "assistant"
}
interface ChatInterfaceProps {
  project: Project
  initialMessages: SchemaMessage[]
  initialUserMessage?: string
}
function isCodeGenerationRequest(content: string): boolean {
  const lowerContent = content.toLowerCase()
  const codeKeywords = [
    "build", "create", "make", "develop", "generate", "code", "app",
    "website", "component", "page", "design", "implement", "add", "update",
    "fix", "change", "modify", "refactor", "style", "layout", "form",
    "button", "navbar", "footer", "capture", "duplicate"
  ]
  return codeKeywords.some((keyword) => lowerContent.includes(keyword))
}

export function ChatInterface({ project, initialMessages, initialUserMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<StrictMessage[]>([])
  const [windowWidth, setWindowWidth] = useState(0)
  const [isResizingState, setIsResizingState] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCodeGenerating, setIsCodeGenerating] = useState(false)
  const [extractedFiles, setExtractedFiles] = useState<Array<{ path: string; content: string; language: string }>>([])
  const [previewError, setPreviewError] = useState<{ message: string; file?: string; line?: string } | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [workbenchTab, setWorkbenchTab] = useState<string>("preview")
  const [hasProjectFiles, setHasProjectFiles] = useState(false)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(project.activeMessageId || null)
  const [isSplitScreen, setIsSplitScreen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  // Guard refs — prevent duplicate triggers across re-renders
  const hasAutoTriggered = useRef(false)
  const hasInitialized = useRef(false)     // Prevents initialMessages effect from running more than once

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(500)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { getToken } = useAuth()
  const router = useRouter()

  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ─── Stop auto-generate ───────────────────────────────────────────────────
  const handleStopAutoGenerate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setIsCodeGenerating(false)
      abortControllerRef.current = null
    }
  }, [])


  // ─── Check project files on mount (once) ─────────────────────────────────
  useEffect(() => {
    if (!project.id) return
      ; (async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}/files`)
          if (res.ok) {
            const data = await res.json()
            const hasFiles = data.files && data.files.length > 0
            setHasProjectFiles(hasFiles)
            if (hasFiles) setIsPreviewOpen(true)
          }
        } catch (err) {
          console.error("[ChatInterface] Failed to check project files:", err)
        }
      })()
  }, [project.id])

  // ─── Window resize ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // ─── Load initial messages ONCE ──────────────────────────────────────────
  // We use a ref guard so that if Next.js re-renders the server component
  // (e.g. due to router cache), we do NOT reset the live message list.
  useEffect(() => {
    if (hasInitialized.current) return   // ← Key fix: only run on very first mount
    hasInitialized.current = true

    const validMessages = initialMessages.filter(
      (msg): msg is SchemaMessage & { role: "user" | "assistant" } => {
        if (!msg || typeof msg !== "object") return false
        if (msg.id === undefined || msg.id === null) return false
        return msg.role === "user" || msg.role === "assistant"
      }
    )
    const strictMessages: StrictMessage[] = validMessages.map((msg) => ({
      ...msg,
      role: msg.role as "user" | "assistant",
    }))
    setMessages(strictMessages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // ← EMPTY dependency array — only fires on mount, never on re-render

  // ─── Preview error persistence ────────────────────────────────────────────
  useEffect(() => {
    if (!project.id) return
    const savedError = localStorage.getItem(`preview-error-${project.id}`)
    if (savedError) {
      try { setPreviewError(JSON.parse(savedError)) } catch { /* ignore */ }
    }
  }, [project.id])

  useEffect(() => {
    if (!project.id) return
    if (previewError) {
      localStorage.setItem(`preview-error-${project.id}`, JSON.stringify(previewError))
    } else {
      localStorage.removeItem(`preview-error-${project.id}`)
    }
  }, [previewError, project.id])

  // ─── Core auto-generate function ─────────────────────────────────────────
  // useCallback with stable deps — does NOT depend on `messages`
  const handleAutoGenerate = useCallback(async (userContent: string) => {
    setIsStreaming(true)
    const isCaptureUrl = userContent.toLowerCase().includes("capture from url:")
    if (isCaptureUrl || isCodeGenerationRequest(userContent)) {
      setIsCodeGenerating(true)
      setIsPreviewOpen(true)
    }
    const tempId = `temp-auto-${Date.now()}`
    const tempAssistant: StrictMessage = {
      id: tempId,
      projectId: project.id,
      role: "assistant",
      content: "",
      hasArtifact: false,
      createdAt: new Date(),
      thinking: null,
      versionName: null,
      searchQueries: null,
      isAutomated: true,
      tokensUsed: null,
      cost: null,
    }
    setMessages((prev) => [...prev, tempAssistant])
    abortControllerRef.current = new AbortController()
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          message: userContent,
          selectedModel: project.selectedModel || "gemini",
        }),
        signal: abortControllerRef.current.signal,
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let accumulated = ""
      let lineBuffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split("\n")
        lineBuffer = lines[lines.length - 1]
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i]
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              accumulated += data.text
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, content: accumulated } : m))
              )
            }
            if (data.done) {
              const finalId = data.messageId || `final-${Date.now()}`
              // Use server content as fallback if streaming didn't capture anything
              // (can happen for very fast greeting responses)
              const finalContent = accumulated.trim() ? accumulated : (data.content || accumulated)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempId
                    ? { ...m, id: finalId, content: finalContent, hasArtifact: data.hasArtifact ?? false }
                    : m
                )
              )
              if (data.hasArtifact) {
                setHasProjectFiles(true)
                setIsPreviewOpen(true)
              }
              router.refresh()
            }
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("[Auto-Generate] Error:", err)
      }
      // Remove the dead temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsStreaming(false)
      setIsCodeGenerating(false)
      abortControllerRef.current = null
      // Remove ?prompt param silently — no re-render, no page refresh
      if (searchParams.has("prompt")) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("prompt")
        const newUrl = `${pathname}${params.toString() ? "?" + params.toString() : ""}`
        window.history.replaceState(null, "", newUrl)
      }
    }
  }, [project.id, project.selectedModel, pathname, searchParams])

  // ─── Auto-trigger: initial user message from URL prompt ──────────────────
  // Runs only if initialUserMessage is present and we haven't triggered yet.
  // Depends on messages only to read current state once — does NOT cause re-runs
  // because we bail out immediately via hasAutoTriggered ref.
  useEffect(() => {
    if (!initialUserMessage || hasAutoTriggered.current || !project.id) return
    // Wait for the messages to be loaded from initialMessages first
    if (!hasInitialized.current) return

    const assistantMessages = messages.filter((m) => m.role === "assistant")
    if (assistantMessages.length > 0) return  // AI already responded — don't re-trigger

    hasAutoTriggered.current = true

    const existingUserMsg = messages.find(
      (m) => m.role === "user" && m.content === initialUserMessage
    )

    if (!existingUserMsg) {
      // Add the user message to the list if it's not already there
      const newUserMsg: StrictMessage = {
        id: `initial-user-${Date.now()}`,
        projectId: project.id,
        role: "user",
        content: initialUserMessage,
        hasArtifact: false,
        createdAt: new Date(),
        thinking: null,
        versionName: null,
        searchQueries: null,
        isAutomated: false,
        tokensUsed: null,
        cost: null,
      }
      setMessages((prev) => [...prev, newUserMsg])
    }

    if (isCodeGenerationRequest(initialUserMessage)) {
      setIsPreviewOpen(true)
    }
    handleAutoGenerate(initialUserMessage)
    // Only re-run when messages stabilizes after init — NOT on every message update
  }, [initialUserMessage, project.id, messages.length, handleAutoGenerate])

  // ─── Auto-trigger: last message is user with no assistant reply ───────────
  // This handles the case where the page loads with a user message but no response
  // stored in the DB yet (e.g. a brand new project loaded via hard refresh).
  useEffect(() => {
    if (hasAutoTriggered.current) return
    if (messages.length === 0) return
    if (isStreaming) return

    const lastMessage = messages[messages.length - 1]
    const assistantMessages = messages.filter((m) => m.role === "assistant")

    // Only auto-trigger if last message is from user AND there has never been an assistant reply
    if (lastMessage.role !== "user" || assistantMessages.length > 0) return

    hasAutoTriggered.current = true
    if (isCodeGenerationRequest(lastMessage.content)) {
      setIsPreviewOpen(true)
    }
    handleAutoGenerate(lastMessage.content)
    // Use messages.length not messages itself to avoid running on every content update
  }, [messages.length, isStreaming, handleAutoGenerate])

  // ─── Handle new messages from ChatInput ──────────────────────────────────
  const handleNewMessage = useCallback((message: SchemaMessage | null) => {
    if (!message || !message.id || (message.role !== "user" && message.role !== "assistant")) return
    
    const safeMessage: StrictMessage = {
      ...message,
      role: message.role as "user" | "assistant",
    }
    if (safeMessage.role === "user") {
      const isCaptureUrl = safeMessage.content.toLowerCase().includes("capture from url:")
      if (isCaptureUrl || isCodeGenerationRequest(safeMessage.content)) {
        setIsPreviewOpen(true)
        setIsCodeGenerating(true)
      }
    }
    // Also open preview when assistant message arrives with artifact
    if (safeMessage.role === "assistant" && safeMessage.hasArtifact) {
      setIsPreviewOpen(true)
      setHasProjectFiles(true)
    }
    setMessages((prev) => {
      const validPrev = prev.filter((m) => m && m.id)
      if (safeMessage.id.startsWith("temp-")) {
        const existingIndex = validPrev.findIndex((m) => m.id === safeMessage.id)
        if (existingIndex !== -1) {
          const newMessages = [...validPrev]
          newMessages[existingIndex] = safeMessage
          return newMessages
        }
        return [...validPrev, safeMessage]
      }
      const filteredPrev = validPrev.filter((m) => !m.id.startsWith("temp-assistant-"))
      const exists = filteredPrev.some((m) => m.id === safeMessage.id)
      if (exists) {
        return filteredPrev.map((m) => (m.id === safeMessage.id ? safeMessage : m))
      }
      return [...filteredPrev, safeMessage]
    })
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0)
  }, [project.id])

  // ─── Scroll to bottom when messages change ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ─── Code extraction ──────────────────────────────────────────────────────
  const handleCodeExtracted = useCallback(
    (files: Array<{ filename: string; code: string; language: string }>) => {
      setExtractedFiles(files.map((f) => ({ path: f.filename, content: f.code, language: f.language })))
    },
    []
  )

  const handleActivateVersion = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    // Extract code blocks from the message content
    const codeBlockRegex = /```(\w+)?\s*(?:file="([^"]+)")?\s*\n([\s\S]*?)```/g
    const blocks: Array<{ path: string; content: string; language: string }> = []
    let match
    codeBlockRegex.lastIndex = 0
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      blocks.push({
        language: match[1] || "typescript",
        path: match[2] || "unknown",
        content: match[3].trim(),
      })
    }

    if (blocks.length > 0) {
      console.log(`[VersionHistory] Activating version from message ${messageId}`)
      setExtractedFiles(blocks)
      setActiveMessageId(messageId)

      try {
        const token = await getToken()
        await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ activeMessageId: messageId }),
        })
      } catch (err) {
        console.error("[VersionHistory] Failed to persist active version:", err)
      }
    }
  }, [messages, project.id, getToken])



  // ─── Mouse drag for resizer ───────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = startWidth.current + (e.clientX - startX.current)
    setLeftWidth(Math.max(200, Math.min(newWidth, window.innerWidth - 200)))
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
    setIsResizingState(false)
    document.body.style.userSelect = "auto"
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isResizing.current = true
      setIsResizingState(true)
      startX.current = e.clientX
      startWidth.current = leftWidth
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [leftWidth, handleMouseMove, handleMouseUp]
  )

  const isNarrow = isPreviewOpen && leftWidth < windowWidth * 0.4

  // ─── Download ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    try {
      const token = await getToken()
      const res = await fetch(`/api/projects/${project.id}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const { files } = await res.json()
      files.forEach((file: any) => zip.file(file.path, file.content))
      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("[ChatInterface] Download error:", e)
    }
  }, [project.id, getToken])

  const handleSendMessage = useCallback((content: string) => {
    const newUserMsg: StrictMessage = {
      id: `user-${Date.now()}`,
      projectId: project.id,
      role: "user",
      content,
      hasArtifact: false,
      createdAt: new Date(),
      thinking: null,
      versionName: null,
      searchQueries: null,
      isAutomated: false,
      tokensUsed: null,
      cost: null,
    }
    setMessages((prev) => [...prev, newUserMsg])
    handleAutoGenerate(content)
  }, [project.id, handleAutoGenerate])

  useEffect(() => {
    const handleSendDirect = (e: any) => {
      if (e.detail?.message) {
        handleSendMessage(e.detail.message)
      }
    }
    window.addEventListener('chat:send-message', handleSendDirect)
    return () => window.removeEventListener('chat:send-message', handleSendDirect)
  }, [handleSendMessage])

  const formattedMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    }))
  }, [messages])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Link href="/" className="text-xl font-sans font-light text-white absolute top-[-20px] left-2">
        <img width={140} className="relative top-[-1px]" src="/logo_light.png" alt="Logo" />
      </Link>
      <Navbar
        projectId={project.id}
        handleDownload={handleDownload}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
        isSplitScreen={isSplitScreen}
        onEnterSplit={() => setIsSplitScreen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex flex-col overflow-hidden ${isPreviewOpen ? "" : "flex-1"} ${isSplitScreen ? "hidden" : ""}`}
          style={{ width: isPreviewOpen && !isSplitScreen ? leftWidth : "100%" }}
        >
          <div
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden y-4 mt-14 ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
          >
            <div
              className={`${isPreviewOpen ? (isNarrow ? "px-4" : "max-w-2xl mx-auto px-4") : "max-w-2xl mx-auto px-4"} ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
            >
              <MessageList
                messages={formattedMessages}
                projectId={project.id}
                activeMessageId={activeMessageId}
                onActivateVersion={handleActivateVersion}
                onCodeExtracted={handleCodeExtracted}
              />
            </div>
            <div ref={messagesEndRef} />
          </div>
          <div
            className={`flex-none pb-4 ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
          >
            <div
              className={`${isPreviewOpen ? (isNarrow ? "px-4" : "max-w-2xl mx-auto px-4") : "max-w-2xl mx-auto px-4"} ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
            >
              <ChatInput
                isAuthenticated={true}
                projectId={project.id}
                initialModel={project.selectedModel || "gemini"}
                onNewMessage={handleNewMessage}
                onDismissError={() => setPreviewError(null)}
                previewError={previewError}
                onOpenDatabase={() => {
                  setIsPreviewOpen(true)
                  setWorkbenchTab("database")
                }}
                externalIsLoading={isStreaming}
                onStop={handleStopAutoGenerate}
                messages={messages}
              />
            </div>
          </div>
        </div>
        {/* {isPreviewOpen && !isSplitScreen && (
          <div onMouseDown={handleMouseDown} className="w-1 cursor-col-resize hover:bg-[#e7e7e7] py-4 mt-14" />
        )} */}
        {isPreviewOpen && (
          <div className="flex-1 px-2 py-4 mt-10 overflow-hidden">
            <CodePreview
              projectId={project.id}
              isCodeGenerating={isCodeGenerating}
              onError={(error) => setPreviewError(error)}
              isOpen={isPreviewOpen}
              onClose={() => { if (!hasProjectFiles) setIsPreviewOpen(false) }}
              initialTab={workbenchTab}
              onTabChange={setWorkbenchTab}
              filesOverride={extractedFiles.length > 0 ? extractedFiles : undefined}
              isSplitScreen={isSplitScreen}
              onEnterSplit={() => setIsSplitScreen(true)}
              onExitSplit={() => setIsSplitScreen(false)}
              isTerminalOpen={isTerminalOpen}
              onSendMessage={handleSendMessage}
              isHistoryView={activeMessageId !== null && messages.some(m => m.hasArtifact) && activeMessageId !== [...messages].reverse().find(m => m.hasArtifact)?.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}







// Old please check this code
// "use client"
// import type React from "react"
// import { useState, useEffect, useRef, useCallback, useMemo } from "react"
// import { MessageList } from "@/components/message/message-list"
// import { ChatInput } from "@/components/layout/chat"
// import { CodePreview } from "@/components/workbench/code-preview"
// import type { Project, Message as SchemaMessage } from "@/config/schema"
// import { Navbar } from "./chat/navbar"
// import { useAuth } from "@clerk/nextjs"
// import { usePathname, useSearchParams, useRouter } from "next/navigation"
// import Link from "next/link"

// interface StrictMessage extends Omit<SchemaMessage, "role"> {
//   role: "user" | "assistant"
// }
// interface ChatInterfaceProps {
//   project: Project
//   initialMessages: SchemaMessage[]
//   initialUserMessage?: string
// }
// function isCodeGenerationRequest(content: string): boolean {
//   const lowerContent = content.toLowerCase()
//   const codeKeywords = [
//     "build", "create", "make", "develop", "generate", "code", "app",
//     "website", "component", "page", "design", "implement", "add", "update",
//     "fix", "change", "modify", "refactor", "style", "layout", "form",
//     "button", "navbar", "footer",
//   ]
//   return codeKeywords.some((keyword) => lowerContent.includes(keyword))
// }

// export function ChatInterface({ project, initialMessages, initialUserMessage }: ChatInterfaceProps) {
//   const [messages, setMessages] = useState<StrictMessage[]>([])
//   const [windowWidth, setWindowWidth] = useState(0)
//   const [isResizingState, setIsResizingState] = useState(false)
//   const [isStreaming, setIsStreaming] = useState(false)
//   const [isCodeGenerating, setIsCodeGenerating] = useState(false)
//   const [extractedFiles, setExtractedFiles] = useState<Array<{ path: string; content: string; language: string }>>([])
//   const [previewError, setPreviewError] = useState<{ message: string; file?: string; line?: string } | null>(null)
//   const [isPreviewOpen, setIsPreviewOpen] = useState(false)
//   const [workbenchTab, setWorkbenchTab] = useState<string>("preview")
//   const [hasProjectFiles, setHasProjectFiles] = useState(false)

//   // Guard refs — prevent duplicate triggers across re-renders
//   const hasAutoTriggered = useRef(false)
//   const hasInitialized = useRef(false)     // Prevents initialMessages effect from running more than once

//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const messagesContainerRef = useRef<HTMLDivElement>(null)
//   const [leftWidth, setLeftWidth] = useState(500)
//   const isResizing = useRef(false)
//   const startX = useRef(0)
//   const startWidth = useRef(0)
//   const abortControllerRef = useRef<AbortController | null>(null)
//   const { getToken } = useAuth()
//   const router = useRouter()

//   const pathname = usePathname()
//   const searchParams = useSearchParams()

//   // ─── Stop auto-generate ───────────────────────────────────────────────────
//   const handleStopAutoGenerate = useCallback(() => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort()
//       setIsStreaming(false)
//       setIsCodeGenerating(false)
//       abortControllerRef.current = null
//     }
//   }, [])

//   // ─── Check project files on mount (once) ─────────────────────────────────
//   useEffect(() => {
//     if (!project.id) return
//       ; (async () => {
//         try {
//           const res = await fetch(`/api/projects/${project.id}/files`)
//           if (res.ok) {
//             const data = await res.json()
//             const hasFiles = data.files && data.files.length > 0
//             setHasProjectFiles(hasFiles)
//             if (hasFiles) setIsPreviewOpen(true)
//           }
//         } catch (err) {
//           console.error("[ChatInterface] Failed to check project files:", err)
//         }
//       })()
//   }, [project.id])

//   // ─── Window resize ────────────────────────────────────────────────────────
//   useEffect(() => {
//     const handleResize = () => setWindowWidth(window.innerWidth)
//     handleResize()
//     window.addEventListener("resize", handleResize)
//     return () => window.removeEventListener("resize", handleResize)
//   }, [])

//   // ─── Load initial messages ONCE ──────────────────────────────────────────
//   // We use a ref guard so that if Next.js re-renders the server component
//   // (e.g. due to router cache), we do NOT reset the live message list.
//   useEffect(() => {
//     if (hasInitialized.current) return   // ← Key fix: only run on very first mount
//     hasInitialized.current = true

//     const validMessages = initialMessages.filter(
//       (msg): msg is SchemaMessage & { role: "user" | "assistant" } => {
//         if (!msg || typeof msg !== "object") return false
//         if (msg.id === undefined || msg.id === null) return false
//         return msg.role === "user" || msg.role === "assistant"
//       }
//     )
//     const strictMessages: StrictMessage[] = validMessages.map((msg) => ({
//       ...msg,
//       role: msg.role as "user" | "assistant",
//     }))
//     setMessages(strictMessages)
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])  // ← EMPTY dependency array — only fires on mount, never on re-render

//   // ─── Preview error persistence ────────────────────────────────────────────
//   useEffect(() => {
//     if (!project.id) return
//     const savedError = localStorage.getItem(`preview-error-${project.id}`)
//     if (savedError) {
//       try { setPreviewError(JSON.parse(savedError)) } catch { /* ignore */ }
//     }
//   }, [project.id])

//   useEffect(() => {
//     if (!project.id) return
//     if (previewError) {
//       localStorage.setItem(`preview-error-${project.id}`, JSON.stringify(previewError))
//     } else {
//       localStorage.removeItem(`preview-error-${project.id}`)
//     }
//   }, [previewError, project.id])

//   // ─── Core auto-generate function ─────────────────────────────────────────
//   // useCallback with stable deps — does NOT depend on `messages`
//   const handleAutoGenerate = useCallback(async (userContent: string) => {
//     setIsStreaming(true)
//     if (isCodeGenerationRequest(userContent)) {
//       setIsCodeGenerating(true)
//     }
//     const tempId = `temp-auto-${Date.now()}`
//     const tempAssistant: StrictMessage = {
//       id: tempId,
//       projectId: project.id,
//       role: "assistant",
//       content: "",
//       hasArtifact: false,
//       createdAt: new Date(),
//       thinking: null,
//       searchQueries: null,
//       isAutomated: true,
//     }
//     setMessages((prev) => [...prev, tempAssistant])
//     abortControllerRef.current = new AbortController()
//     try {
//       const res = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           projectId: project.id,
//           message: userContent,
//           selectedModel: project.selectedModel || "gemini",
//         }),
//         signal: abortControllerRef.current.signal,
//       })
//       if (!res.ok) throw new Error(`API error: ${res.status}`)

//       const reader = res.body?.getReader()
//       if (!reader) throw new Error("No stream")
//       const decoder = new TextDecoder()
//       let accumulated = ""
//       let lineBuffer = ""

//       while (true) {
//         const { done, value } = await reader.read()
//         if (done) break
//         lineBuffer += decoder.decode(value, { stream: true })
//         const lines = lineBuffer.split("\n")
//         lineBuffer = lines[lines.length - 1]
//         for (let i = 0; i < lines.length - 1; i++) {
//           const line = lines[i]
//           if (!line.startsWith("data: ")) continue
//           try {
//             const data = JSON.parse(line.slice(6))
//             if (data.text) {
//               accumulated += data.text
//               setMessages((prev) =>
//                 prev.map((m) => (m.id === tempId ? { ...m, content: accumulated } : m))
//               )
//             }
//             if (data.done) {
//               const finalId = data.messageId || `final-${Date.now()}`
//               setMessages((prev) =>
//                 prev.map((m) =>
//                   m.id === tempId
//                     ? { ...m, id: finalId, content: accumulated, hasArtifact: data.hasArtifact ?? false }
//                     : m
//                 )
//               )
//               if (data.hasArtifact) setHasProjectFiles(true)
//               router.refresh()
//             }
//           } catch { /* ignore malformed SSE */ }
//         }
//       }
//     } catch (err: any) {
//       if (err?.name !== "AbortError") {
//         console.error("[Auto-Generate] Error:", err)
//       }
//       // Remove the dead temp message on error
//       setMessages((prev) => prev.filter((m) => m.id !== tempId))
//     } finally {
//       setIsStreaming(false)
//       setIsCodeGenerating(false)
//       abortControllerRef.current = null
//       // Remove ?prompt param silently — no re-render, no page refresh
//       if (searchParams.has("prompt")) {
//         const params = new URLSearchParams(searchParams.toString())
//         params.delete("prompt")
//         const newUrl = `${pathname}${params.toString() ? "?" + params.toString() : ""}`
//         window.history.replaceState(null, "", newUrl)
//       }
//     }
//   }, [project.id, project.selectedModel, pathname, searchParams])

//   // ─── Auto-trigger: initial user message from URL prompt ──────────────────
//   // Runs only if initialUserMessage is present and we haven't triggered yet.
//   // Depends on messages only to read current state once — does NOT cause re-runs
//   // because we bail out immediately via hasAutoTriggered ref.
//   useEffect(() => {
//     if (!initialUserMessage || hasAutoTriggered.current || !project.id) return
//     // Wait for the messages to be loaded from initialMessages first
//     if (!hasInitialized.current) return

//     const assistantMessages = messages.filter((m) => m.role === "assistant")
//     if (assistantMessages.length > 0) return  // AI already responded — don't re-trigger

//     hasAutoTriggered.current = true

//     const existingUserMsg = messages.find(
//       (m) => m.role === "user" && m.content === initialUserMessage
//     )

//     if (!existingUserMsg) {
//       // Add the user message to the list if it's not already there
//       const newUserMsg: StrictMessage = {
//         id: `initial-user-${Date.now()}`,
//         projectId: project.id,
//         role: "user",
//         content: initialUserMessage,
//         hasArtifact: false,
//         createdAt: new Date(),
//         thinking: null,
//         searchQueries: null,
//         isAutomated: false,
//       }
//       setMessages((prev) => [...prev, newUserMsg])
//     }

//     if (isCodeGenerationRequest(initialUserMessage)) {
//       setIsPreviewOpen(true)
//     }
//     handleAutoGenerate(initialUserMessage)
//     // Only re-run when messages stabilizes after init — NOT on every message update
//   }, [initialUserMessage, project.id, messages.length, handleAutoGenerate])

//   // ─── Auto-trigger: last message is user with no assistant reply ───────────
//   // This handles the case where the page loads with a user message but no response
//   // stored in the DB yet (e.g. a brand new project loaded via hard refresh).
//   useEffect(() => {
//     if (hasAutoTriggered.current) return
//     if (messages.length === 0) return
//     if (isStreaming) return

//     const lastMessage = messages[messages.length - 1]
//     const assistantMessages = messages.filter((m) => m.role === "assistant")

//     // Only auto-trigger if last message is from user AND there has never been an assistant reply
//     if (lastMessage.role !== "user" || assistantMessages.length > 0) return

//     hasAutoTriggered.current = true
//     if (isCodeGenerationRequest(lastMessage.content)) {
//       setIsPreviewOpen(true)
//     }
//     handleAutoGenerate(lastMessage.content)
//     // Use messages.length not messages itself to avoid running on every content update
//   }, [messages.length, isStreaming, handleAutoGenerate])

//   // ─── Handle new messages from ChatInput ──────────────────────────────────
//   const handleNewMessage = useCallback((message: SchemaMessage | null) => {
//     if (!message || !message.id || (message.role !== "user" && message.role !== "assistant")) return
//     const safeMessage: StrictMessage = {
//       ...message,
//       role: message.role as "user" | "assistant",
//     }
//     if (safeMessage.role === "user" && isCodeGenerationRequest(safeMessage.content)) {
//       setIsPreviewOpen(true)
//       setIsCodeGenerating(true)
//     }
//     setMessages((prev) => {
//       const validPrev = prev.filter((m) => m && m.id)
//       if (safeMessage.id.startsWith("temp-")) {
//         const existingIndex = validPrev.findIndex((m) => m.id === safeMessage.id)
//         if (existingIndex !== -1) {
//           const newMessages = [...validPrev]
//           newMessages[existingIndex] = safeMessage
//           return newMessages
//         }
//         return [...validPrev, safeMessage]
//       }
//       const filteredPrev = validPrev.filter((m) => !m.id.startsWith("temp-assistant-"))
//       const exists = filteredPrev.some((m) => m.id === safeMessage.id)
//       if (exists) {
//         return filteredPrev.map((m) => (m.id === safeMessage.id ? safeMessage : m))
//       }
//       return [...filteredPrev, safeMessage]
//     })
//     setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0)
//   }, [])

//   // ─── Scroll to bottom when messages change ────────────────────────────────
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   // ─── Code extraction ──────────────────────────────────────────────────────
//   const handleCodeExtracted = useCallback(
//     (files: Array<{ filename: string; code: string; language: string }>) => {
//       setExtractedFiles(files.map((f) => ({ path: f.filename, content: f.code, language: f.language })))
//     },
//     []
//   )

//   // ─── Mouse drag for resizer ───────────────────────────────────────────────
//   const handleMouseMove = useCallback((e: MouseEvent) => {
//     if (!isResizing.current) return
//     const newWidth = startWidth.current + (e.clientX - startX.current)
//     setLeftWidth(Math.max(200, Math.min(newWidth, window.innerWidth - 200)))
//   }, [])

//   const handleMouseUp = useCallback(() => {
//     isResizing.current = false
//     setIsResizingState(false)
//     document.body.style.userSelect = "auto"
//     document.removeEventListener("mousemove", handleMouseMove)
//     document.removeEventListener("mouseup", handleMouseUp)
//   }, [handleMouseMove])

//   const handleMouseDown = useCallback(
//     (e: React.MouseEvent) => {
//       isResizing.current = true
//       setIsResizingState(true)
//       startX.current = e.clientX
//       startWidth.current = leftWidth
//       document.body.style.userSelect = "none"
//       document.addEventListener("mousemove", handleMouseMove)
//       document.addEventListener("mouseup", handleMouseUp)
//     },
//     [leftWidth, handleMouseMove, handleMouseUp]
//   )

//   const isNarrow = isPreviewOpen && leftWidth < windowWidth * 0.4

//   // ─── Download ─────────────────────────────────────────────────────────────
//   const handleDownload = useCallback(async () => {
//     const JSZip = (await import("jszip")).default
//     const zip = new JSZip()
//     try {
//       const token = await getToken()
//       const res = await fetch(`/api/projects/${project.id}/files`, {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       if (!res.ok) return
//       const { files } = await res.json()
//       files.forEach((file: any) => zip.file(file.path, file.content))
//       const content = await zip.generateAsync({ type: "blob" })
//       const url = URL.createObjectURL(content)
//       const a = document.createElement("a")
//       a.href = url
//       a.download = `${project.id}.zip`
//       a.click()
//       URL.revokeObjectURL(url)
//     } catch (e) {
//       console.error("[ChatInterface] Download error:", e)
//     }
//   }, [project.id, getToken])

//   const mappedMessages = useMemo(
//     () =>
//       messages.map((msg) => ({
//         ...msg,
//         createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
//       })),
//     [messages]
//   )

//   return (
//     <div className="h-screen flex flex-col overflow-hidden">
//       <Link href="/" className="text-xl font-sans font-light text-white absolute top-[-20px] left-2">
//         <img width={140} className="relative top-[-1px]" src="/logo_light.png" alt="Logo" />
//       </Link>
//       <Navbar projectId={project.id} handleDownload={handleDownload} />
//       <div className="flex-1 flex overflow-hidden">
//         <div
//           className={`flex flex-col overflow-hidden ${isPreviewOpen ? "" : "flex-1"}`}
//           style={{ width: isPreviewOpen ? leftWidth : "100%" }}
//         >
//           <div
//             ref={messagesContainerRef}
//             className={`flex-1 overflow-y-auto overflow-x-hidden chat-messages-scroll py-4 mt-14 ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
//           >
//             <div
//               className={`${isPreviewOpen ? (isNarrow ? "px-4" : "max-w-2xl mx-auto px-4") : "max-w-2xl mx-auto px-4"} ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
//             >
//               <MessageList
//                 messages={mappedMessages}
//                 projectId={project.id}
//                 onCodeExtracted={handleCodeExtracted}
//               />
//             </div>
//             <div ref={messagesEndRef} />
//           </div>
//           <div
//             className={`flex-none pb-4 ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
//           >
//             <div
//               className={`${isPreviewOpen ? (isNarrow ? "px-4" : "max-w-2xl mx-auto px-4") : "max-w-2xl mx-auto px-4"} ${isResizingState ? "transition-none" : "transition-all duration-300 ease-in-out"}`}
//             >
//               <ChatInput
//                 isAuthenticated={true}
//                 projectId={project.id}
//                 initialModel={project.selectedModel || "gemini"}
//                 onNewMessage={handleNewMessage}
//                 onDismissError={() => setPreviewError(null)}
//                 onOpenDatabase={() => {
//                   setIsPreviewOpen(true)
//                   setWorkbenchTab("database")
//                 }}
//                 externalIsLoading={isStreaming}
//                 onStop={handleStopAutoGenerate}
//                 messages={messages}
//               />
//             </div>
//           </div>
//         </div>
//         {isPreviewOpen && (
//           <div onMouseDown={handleMouseDown} className="w-1 cursor-col-resize hover:bg-[#e7e7e7] py-4 mt-14" />
//         )}
//         {isPreviewOpen && (
//           <div className="flex-1 px-2 py-4 mt-10 overflow-hidden">
//             <CodePreview
//               projectId={project.id}
//               isCodeGenerating={isCodeGenerating}
//               onError={(error) => setPreviewError(error)}
//               isOpen={isPreviewOpen}
//               onClose={() => { if (!hasProjectFiles) setIsPreviewOpen(false) }}
//               initialTab={workbenchTab}
//               onTabChange={setWorkbenchTab}
//               filesOverride={extractedFiles.length > 0 ? extractedFiles : undefined}
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }