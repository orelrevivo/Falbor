"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react"
import { MessageList } from "@/components/message/message-list"
import { ChatInput } from "@/components/layout/chat"
import { CodePreview } from "@/components/workbench/code-preview"
import type { Project, Message as SchemaMessage, UserProfile } from "@/config/schema"
import { Navbar } from "./chat/navbar"
import { useAuth, useUser } from "@clerk/nextjs"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { truncateChatHistory } from "@/app/actions/chat"
import { useWorkbench } from "@/lib/workbench-context"
import { TaskModal } from "./workbench/tasks/task-modal"
import { PresenceLayer } from "./chat/presence-layer"

interface StrictMessage extends Omit<SchemaMessage, "role"> {
  role: "user" | "assistant"
  sessionId: string
}
interface ChatInterfaceProps {
  project: Project & { role?: "viewer" | "editor" | "admin" }
  initialMessages: SchemaMessage[]
  initialUserMessage?: string
  userProfile?: UserProfile | null
}
// Code preview panel is always open — no keyword detection needed

/** Extract file blocks from streaming AI content in real-time */
function extractFilesFromStreamingContent(content: string): { files: Array<{ path: string; content: string; language: string }>, activeFile: string | null } {
  const files: Array<{ path: string; content: string; language: string }> = []
  let activeFile: string | null = null

  // Match completed code blocks with file attributes
  const completedBlockRegex = /```(\w+)?\s*file="([^"]+)"\s*\n([\s\S]*?)```/g
  let match
  while ((match = completedBlockRegex.exec(content)) !== null) {
    files.push({
      language: match[1] || "typescript",
      path: match[2],
      content: match[3].trim(),
    })
  }
  // Also detect the currently-streaming (unclosed) code block
  const unfinishedMatch = content.match(/```(\w+)?\s*file="([^"]+)"\s*\n([\s\S]*)$/)
  if (unfinishedMatch) {
    const path = unfinishedMatch[2]
    activeFile = path
    if (!files.some(f => f.path === path)) {
      files.push({
        language: unfinishedMatch[1] || "typescript",
        path,
        content: unfinishedMatch[3],
      })
    }
  }
  return { files, activeFile }
}

export function ChatInterface({ project, initialMessages, initialUserMessage, userProfile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<StrictMessage[]>([])
  const [windowWidth, setWindowWidth] = useState(0)
  const [isResizingState, setIsResizingState] = useState(false)
  const rafRef = useRef<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCodeGenerating, setIsCodeGenerating] = useState(false) // kept for post-generation sync only
  const [extractedFiles, setExtractedFiles] = useState<Array<{ path: string; content: string; language: string }>>([])
  const [previewError, setPreviewError] = useState<{ message: string; file?: string; line?: string } | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(true) // always open
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const {
    activeTab: workbenchTab,
    setActiveTab: setWorkbenchTab,
  } = useWorkbench()

  const [hasProjectFiles, setHasProjectFiles] = useState(false)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(project.activeMessageId || null)
  const [isSplitScreen, setIsSplitScreen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  // Guard refs — prevent duplicate triggers across re-renders
  const hasAutoTriggered = useRef(false)
  const hasInitialized = useRef(false)     // Prevents initialMessages effect from running more than once
  const lastMessagesRef = useRef<StrictMessage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(450)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isStreamingRef = useRef(false)  // Always-current ref for isStreaming, avoids stale closure
  const { getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Sync server notification settings to localStorage on mount
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem("falbor_bell_notification", userProfile.notificationSoundEnabled.toString())
      localStorage.setItem("falbor_bell_volume", userProfile.notificationVolume.toString())
    }
  }, [userProfile])

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--chat-width', `${leftWidth}px`);
    return () => {
      document.documentElement.style.removeProperty('--chat-width');
    };
  }, [leftWidth]);

  // ─── Stop auto-generate ───────────────────────────────────────────────────
  const handleStopAutoGenerate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      isStreamingRef.current = false
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
            setIsPreviewOpen(true)
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
    if (hasInitialized.current) return

    const validMessages = initialMessages.filter(
      (msg): msg is SchemaMessage & { role: "user" | "assistant" } => {
        if (!msg || typeof msg !== "object") return false
        if (msg.id === undefined || msg.id === null) return false
        return msg.role === "user" || msg.role === "assistant"
      }
    )
    const strictMessages = validMessages.map((msg) => ({
      ...msg,
      role: msg.role as "user" | "assistant",
      sessionId: "main",
    }))
    setMessages(strictMessages)
    hasInitialized.current = true
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
  const handleAutoGenerate = useCallback(async (userContent: string, metadata: any = null, modelOverride: string | null = null) => {
    if (isStreamingRef.current) {
      console.log("[Auto-Generate] Blocked: Stream already active")
      return
    }

    const targetSessionId = "main"

    setIsStreaming(true)
    isStreamingRef.current = true
    // Always open code preview and set code generating
    setIsCodeGenerating(true)
    setIsPreviewOpen(true)
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
      sessionId: targetSessionId,
      imageData: null,
      metadata: null,
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
          selectedModel: modelOverride || project.selectedModel || "gemini",
          sessionId: "main",
          metadata,
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

              // Broadcast AI chunk for live collaboration
              window.dispatchEvent(new CustomEvent(`broadcast:${project.id}`, {
                detail: { type: 'MSG_AI_STREAM', tempId, chunk: accumulated, senderId: user?.id }
              }))

              // Live file extraction: parse streaming content for file blocks
              const { files: liveFiles, activeFile } = extractFilesFromStreamingContent(accumulated)
              if (liveFiles.length > 0) {
                setExtractedFiles(liveFiles)
                if (activeFile) {
                    setSelectedFilePath(activeFile)
                    // Auto-switch to Code tab when generating code
                    setWorkbenchTab("code")
                }
                // Auto-open code preview when first file appears
                setIsPreviewOpen(true)
                setIsCodeGenerating(true)
              }
            }
            if (data.done) {
              const finalId = data.messageId || `final-${Date.now()}`
              const finalContent = accumulated.trim() ? accumulated : (data.content || accumulated)

              const finalAssistantMsg: StrictMessage = {
                  id: finalId,
                  projectId: project.id,
                  role: "assistant",
                  content: finalContent,
                  hasArtifact: data.hasArtifact ?? false,
                  createdAt: new Date(),
                  thinking: data.thinking || null,
                  versionName: data.versionName || null,
                  searchQueries: data.searchQueries || null,
                  isAutomated: true,
                  tokensUsed: data.tokensUsed || null,
                  cost: data.cost || null,
                  sessionId: targetSessionId,
                  imageData: null,
                  metadata: null
              }

              // Broadcast completion
              window.dispatchEvent(new CustomEvent(`broadcast:${project.id}`, {
                detail: { type: 'MSG_AI_COMPLETE', tempId, finalMessage: finalAssistantMsg }
              }))

              // Synchronize state with final result
              setMessages((prev) => {
                const updated = [...prev]
                const assistantIdx = updated.findIndex((m) => m.id === tempId)
                if (assistantIdx !== -1) {
                  // 1. Update assistant message
                  updated[assistantIdx] = finalAssistantMsg

                  // 2. Sync user message ID if server provided one (prevents duplication on edit/refresh)
                  if (data.userMessageId) {
                    // Look backwards from the assistant for the triggering user message
                    for (let j = assistantIdx - 1; j >= 0; j--) {
                      if (updated[j].role === "user") {
                        updated[j] = { ...updated[j], id: data.userMessageId }
                        break
                      }
                    }
                  }
                }
                return updated
              })

              // Broadcast final message
              window.dispatchEvent(new CustomEvent(`broadcast:${project.id}`, {
                detail: { type: 'MSG_AI_COMPLETE', tempId, finalMessage: finalAssistantMsg, senderId: user?.id }
              }))

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
      isStreamingRef.current = false
      abortControllerRef.current = null
      // Immediately stop code generating — preview will boot now
      setIsCodeGenerating(false)
      // Play notification sound if enabled
      try {
        const bellEnabled = localStorage.getItem("falbor_bell_notification")
        if (bellEnabled === "true") {
          const audio = new Audio('/bell.mp3')
          const savedVolume = localStorage.getItem("falbor_bell_volume")
          if (savedVolume !== null) {
            audio.volume = parseInt(savedVolume, 10) / 100
          }
          audio.play().catch(() => { })
        }
      } catch { }
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
  useEffect(() => {
    if (!initialUserMessage || hasAutoTriggered.current || !project.id || !hasInitialized.current) return

    const assistantMessages = messages.filter((m) => m.role === "assistant")
    if (assistantMessages.length > 0) return  // AI already responded — don't re-trigger

    hasAutoTriggered.current = true

    setIsPreviewOpen(true)

    // Call directly — hasInitialized is already true so messages are loaded and rendered.
    handleAutoGenerate(initialUserMessage)
  }, [initialUserMessage, project.id, handleAutoGenerate])

  const handleNewMessage = useCallback((message: SchemaMessage | null) => {
    if (!message || !message.id || (message.role !== "user" && message.role !== "assistant")) return

    const safeMessage: StrictMessage = {
      ...message,
      role: message.role as "user" | "assistant",
      sessionId: "main",
    }
    if (safeMessage.role === "user") {
      // Mark auto-trigger as done — ChatInput is handling its own streaming,
      // so the auto-trigger effect should NOT fire a second stream.
      hasAutoTriggered.current = true
      setIsPreviewOpen(true)
      setIsCodeGenerating(true)
    }
    // Also open preview when assistant message arrives with artifact
    if (safeMessage.role === "assistant" && safeMessage.hasArtifact) {
      setIsPreviewOpen(true)
      setHasProjectFiles(true)
    }
    setMessages((prev) => {
      const validPrev = prev.filter((m) => m && m.id)

      // 3. Smart Deduplication: If a message with same content/role arrives (e.g. from Pusher or SSE)
      const duplicateIdx = validPrev.findIndex(
        (m) => m.id === safeMessage.id || (
          m.role === safeMessage.role && 
          m.content === safeMessage.content && 
          m.id.startsWith("temp-")
        )
      )
      if (duplicateIdx !== -1) {
        const newMessages = [...validPrev]
        newMessages[duplicateIdx] = safeMessage
        return newMessages
      }

      // 4. Fallback: Append
      return [...validPrev, safeMessage]
    })
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0)
  }, [project.id])

  // Listen for new task sessions — always goes to main chat
  useEffect(() => {
    const handleNewTask = (e: any) => {
      const { message, taskGroupId, taskIndex, totalTasks, model } = e.detail

      // Build metadata for task grouping (will be read by message-list for sub-chat rendering)
      const taskMetadata = taskGroupId ? { taskGroupId, taskIndex, totalTasks } : null

      // Add the user message to the local state
      const newUserMsg: StrictMessage = {
        id: `user-task-${Date.now()}-${taskIndex || 0}`,
        projectId: project.id,
        role: "user",
        content: message,
        hasArtifact: false,
        createdAt: new Date(),
        thinking: null,
        versionName: null,
        searchQueries: null,
        isAutomated: false,
        tokensUsed: null,
        cost: null,
        sessionId: "main",
        imageData: null,
        metadata: taskMetadata,
      }
      setMessages((prev) => [...prev, newUserMsg])

      // Trigger AI generation in main chat
      handleAutoGenerate(message, taskMetadata, model)
    }
    window.addEventListener('chat:new-task-session' as any, handleNewTask)
    return () => window.removeEventListener('chat:new-task-session' as any, handleNewTask)
  }, [handleAutoGenerate])

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



  // ─── Smooth mouse/touch drag for resizer ──────────────────────────────────
  const handlePointerMove = useCallback((clientX: number) => {
    if (!isResizing.current) return
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const newWidth = startWidth.current + (clientX - startX.current)
      const clamped = Math.max(280, Math.min(newWidth, window.innerWidth - 280))
      setLeftWidth(clamped)
      rafRef.current = null
    })
  }, [])

  const handlePointerEnd = useCallback(() => {
    if (!isResizing.current) return
    isResizing.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setIsResizingState(false)
    document.body.style.userSelect = ""
    document.body.style.cursor = ""
    document.removeEventListener("mousemove", handleMouseMoveRef.current)
    document.removeEventListener("mouseup", handleMouseUpRef.current)
    document.removeEventListener("touchmove", handleTouchMoveRef.current)
    document.removeEventListener("touchend", handleTouchEndRef.current)
    document.removeEventListener("touchcancel", handleTouchEndRef.current)
  }, [])

  // Stable refs so event listeners always reference the latest callbacks
  const handleMouseMoveRef = useRef((e: MouseEvent) => handlePointerMove(e.clientX))
  const handleMouseUpRef = useRef(() => handlePointerEnd())
  const handleTouchMoveRef = useRef((e: TouchEvent) => {
    if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX)
  })
  const handleTouchEndRef = useRef(() => handlePointerEnd())

  // Keep refs up to date
  useEffect(() => {
    handleMouseMoveRef.current = (e: MouseEvent) => handlePointerMove(e.clientX)
    handleMouseUpRef.current = () => handlePointerEnd()
    handleTouchMoveRef.current = (e: TouchEvent) => {
      if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX)
    }
    handleTouchEndRef.current = () => handlePointerEnd()
  }, [handlePointerMove, handlePointerEnd])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      setIsResizingState(true)
      startX.current = e.clientX
      startWidth.current = leftWidth
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
      document.addEventListener("mousemove", handleMouseMoveRef.current)
      document.addEventListener("mouseup", handleMouseUpRef.current)
    },
    [leftWidth]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return
      isResizing.current = true
      setIsResizingState(true)
      startX.current = e.touches[0].clientX
      startWidth.current = leftWidth
      document.body.style.userSelect = "none"
      document.addEventListener("touchmove", handleTouchMoveRef.current, { passive: true })
      document.addEventListener("touchend", handleTouchEndRef.current)
      document.addEventListener("touchcancel", handleTouchEndRef.current)
    },
    [leftWidth]
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
    hasAutoTriggered.current = true
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
      sessionId: "main",
      imageData: null,
      metadata: null,
    }
    // Update local state first
    setMessages((prev) => {
      if (prev.some((m) => m.id === newUserMsg.id)) return prev
      return [...prev, newUserMsg]
    })
    
    // Broadcast user message to collaborators
    window.dispatchEvent(new CustomEvent(`broadcast:${project.id}`, {
      detail: { type: 'MSG_USER', message: newUserMsg, senderId: user?.id }
    }))

    handleAutoGenerate(content)
  }, [project.id, handleAutoGenerate, user?.id])

  // ─── Real-time Collaboration Listeners ────────────────────────────────────
  const handleRealtimeMessage = useCallback((data: any) => {
    const { type, message, chunk, tempId, finalMessage, senderId } = data

    // Ignore messages originating from this client to prevent duplication
    if (senderId === user?.id) {
      return
    }

    switch (type) {
      case 'MSG_USER':
        setMessages((prev) => {
          // If we already have this message (by ID or by content/role for temp/optimistic match)
          if (prev.some(m => m.id === message.id || (m.role === message.role && m.content === message.content))) return prev
          return [...prev, { ...message, createdAt: new Date(message.createdAt) }]
        })
        break

      case 'MSG_AI_STREAM':
        // Show streaming for a collaborator's AI
        setMessages((prev) => {
          // If we are the sender or already have this message by ID match
          const existing = prev.find(m => m.id === tempId)
          if (existing) {
            // Only update if content changed
            if (existing.content === chunk) return prev
            return prev.map(m => m.id === tempId ? { ...m, content: chunk } : m)
          } else {
            // Create a temp collaborator AI message
            const tempMsg: StrictMessage = {
              id: tempId,
              projectId: project.id,
              role: "assistant",
              content: chunk,
              hasArtifact: false,
              createdAt: new Date(),
              thinking: null,
              versionName: null,
              searchQueries: null,
              isAutomated: true,
              tokensUsed: null,
              cost: null,
              sessionId: "main",
              imageData: null,
              metadata: { isCollaboratorStream: true },
            }
            return [...prev, tempMsg]
          }
        })
        break

      case 'MSG_AI_COMPLETE':
        setMessages((prev) => {
          // If we already have this assistant message by ID or content/role match
          const existing = prev.find(m => 
            m.id === finalMessage.id || 
            (m.role === 'assistant' && m.content === finalMessage.content && (m.id.startsWith("temp-") || finalMessage.id.startsWith("temp-")))
          )
          
          if (existing) {
            return prev.map(m => m.id === existing.id ? { ...finalMessage, createdAt: new Date(finalMessage.createdAt) } : m)
          }

          const updated = prev.map(m => m.id === tempId ? { ...finalMessage, createdAt: new Date(finalMessage.createdAt) } : m)
          // If not found (maybe joined mid-stream), just append the final message
          if (!prev.some(m => m.id === tempId) && !prev.some(m => m.id === finalMessage.id)) {
             return [...prev, { ...finalMessage, createdAt: new Date(finalMessage.createdAt) }]
          }
          return updated
        })
        // Finalize state
        if (finalMessage.hasArtifact) {
           setHasProjectFiles(true)
        }
        break
    }
  }, [project.id, user?.id])

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

  // ─── Edit message handler ─────────────────────────────────────────────────
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    setEditingMessage(null)

    // Call server action to truncate DB history and update message
    const res = await truncateChatHistory(messageId, newContent)
    if (!res.success) {
      console.error("[handleEditMessage] Failed to truncate history:", res.error)
    }

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId)
      if (idx === -1) return prev

      const originalMetadata = prev[idx].metadata

      // Remove all messages after this one (including any AI responses)
      const updated = prev.slice(0, idx)
      updated.push({ ...prev[idx], content: newContent })

      // We can't call handleAutoGenerate inside setMessages safely, 
      // so we use a timeout or just do it after setMessages.
      setTimeout(() => {
        handleAutoGenerate(newContent, originalMetadata)
      }, 0)

      return updated
    })
    // Ensure we don't trigger auto-reply multiple times
    hasAutoTriggered.current = true
  }, [handleAutoGenerate])

  // ─── Regenerate AI response handler ───────────────────────────────────────
  const handleRegenerateMessage = useCallback((messageId: string) => {
    hasAutoTriggered.current = true
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId)
      if (idx === -1) return prev
      // Find the user message that preceded this AI message
      let userMsgIdx = idx - 1
      while (userMsgIdx >= 0 && prev[userMsgIdx].role !== "user") {
        userMsgIdx--
      }
      if (userMsgIdx < 0) return prev
      // Remove the AI message and any after it
      const updated = prev.slice(0, idx)
      // Re-generate
      setTimeout(() => handleAutoGenerate(prev[userMsgIdx].content, prev[userMsgIdx].metadata), 0)
      return updated
    })
  }, [handleAutoGenerate])

  const role = project.role || "admin";

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <PresenceLayer 
        projectId={project.id} 
        onMessageReceived={handleRealtimeMessage} 
      />

      {typeof document !== 'undefined' && document.getElementById('header-right-portal') ? (
        createPortal(
          <Navbar
            projectId={project.id}
            role={role}
            handleDownload={handleDownload}
            isTerminalOpen={isTerminalOpen}
            onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
            isSplitScreen={isSplitScreen}
            onEnterSplit={() => setIsSplitScreen(true)}
            projectName={project.title}
          />,
          document.getElementById('header-right-portal')!
        )
      ) : (
        <Navbar
          projectId={project.id}
          role={role}
          handleDownload={handleDownload}
          isTerminalOpen={isTerminalOpen}
          onToggleTerminal={() => setIsTerminalOpen(prev => !prev)}
          isSplitScreen={isSplitScreen}
          onEnterSplit={() => setIsSplitScreen(true)}
          projectName={project.title}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Full-screen overlay during resize — prevents iframes from stealing events */}
        {isResizingState && (
          <div
            className="fixed inset-0 z-[9999]"
            style={{ cursor: 'col-resize' }}
          />
        )}

        <div
          className={cn(
            "flex flex-col h-full bg-background border-r",
            !isResizingState && "transition-[width] duration-200 ease-out",
            (isPreviewOpen || isSplitScreen || workbenchTab === "database" || workbenchTab === "settings") ? "" : "flex-1",
            isSplitScreen && "hidden",
            isNarrow && "min-w-[280px]"
          )}
          style={{
            width: (isPreviewOpen || workbenchTab === "database" || workbenchTab === "settings") && !isSplitScreen ? leftWidth : "100%",
            willChange: isResizingState ? 'width' : 'auto',
          }}
        >
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          >
            <div
              className={cn(
                "w-full",
                !isPreviewOpen && "max-w-3xl mx-auto"
              )}
            >
              <MessageList
                messages={formattedMessages}
                projectId={project.id}
                activeMessageId={activeMessageId}
                onActivateVersion={handleActivateVersion}
                onRegenerate={handleRegenerateMessage}
                onEdit={(id, content) => setEditingMessage({ id, content })}
              />
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          <div
            className={cn(
                "p-4 border-t bg-background/50 backdrop-blur-md sticky bottom-0",
                !isPreviewOpen && "max-w-3xl mx-auto w-full border-x rounded-t-xl"
            )}
          >
            <ChatInput
              isAuthenticated={true}
              projectId={project.id}
              role={role}
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
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onSaveEdit={handleEditMessage}
              sessionId="main"
            />
          </div>
        </div>

        {/* Resize handle — smooth, professional, with touch support */}
        {isPreviewOpen && !isSplitScreen && (
          <div
            className="group relative z-[60] flex items-center justify-center"
            style={{ width: isResizingState ? 5 : 4, cursor: 'col-resize' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Invisible wider hit area for easier grabbing */}
            <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            {/* Visible bar */}
            <div
              className={cn(
                "w-[3px] h-full rounded-full transition-all duration-150",
                isResizingState
                  ? "bg-primary/70 shadow-[0_0_8px_rgba(var(--primary-rgb,99,102,241),0.4)]"
                  : "bg-border/40 group-hover:bg-primary/50"
              )}
            />
          </div>
        )}

        {(isPreviewOpen || workbenchTab === "database" || workbenchTab === "settings") && (
          <div
            className={cn(
              "flex-1 overflow-hidden",
              isSplitScreen ? "p-0" : "",
              !isResizingState && "transition-[width] duration-200 ease-out"
            )}
            style={{ willChange: isResizingState ? 'width' : 'auto' }}
          >
            <CodePreview
              projectId={project.id}
              role={role}
              onError={(error) => setPreviewError(error)}
              isOpen={isPreviewOpen}
              onClose={() => { if (!hasProjectFiles) setIsPreviewOpen(false) }}
              initialTab={workbenchTab}
              onTabChange={(tab) => setWorkbenchTab(tab as any)}
              filesOverride={extractedFiles.length > 0 ? extractedFiles : undefined}
              selectedFilePath={selectedFilePath}
              isSplitScreen={isSplitScreen}
              onEnterSplit={() => setIsSplitScreen(true)}
              onExitSplit={() => setIsSplitScreen(false)}
              isTerminalOpen={isTerminalOpen}
              onSendMessage={handleSendMessage}
              isCodeGenerating={isCodeGenerating || isStreaming}
              isHistoryView={activeMessageId !== null && messages.some(m => m.hasArtifact) && activeMessageId !== [...messages].reverse().find(m => m.hasArtifact)?.id}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] cursor-pointer flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingMessage(null)
            }}
          >
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-card border shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
            >
              {/* Reuse Edit UI from previous turn if available, or simplified here */}
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Edit Message</h3>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full h-64 p-4 bg-muted/30 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all resize-none font-mono text-sm"
                  defaultValue={editingMessage.content}
                  id="edit-message-textarea"
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                    onClick={() => setEditingMessage(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => {
                        const val = (document.getElementById("edit-message-textarea") as HTMLTextAreaElement).value
                        handleEditMessage(editingMessage.id, val)
                    }}
                  >
                    Save & Regenerate
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskModal projectId={project.id} />
    </div>
  )
}






