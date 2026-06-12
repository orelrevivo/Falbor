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
import { PluginLoader } from "./workbench/plugin-loader"
import { ActivePluginContainer } from "./plugins/ActivePluginContainer"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Bot, Lock, ArrowRight, Loader2 } from "lucide-react"

interface StrictMessage extends Omit<SchemaMessage, "role"> {
  role: "user" | "assistant"
  sessionId: string
}
interface ChatInterfaceProps {
  project: Project & { role?: "viewer" | "editor" | "admin" }
  initialMessages: SchemaMessage[]
  initialUserMessage?: string
  userProfile?: UserProfile | null
  showBuildMode?: boolean
}
// Code preview panel is always open — no keyword detection needed

/** Extract file blocks from streaming AI content in real-time */
function extractFilesFromStreamingContent(content: string): { files: Array<{ path: string; content: string; language: string }>, activeFile: string | null } {
  const files: Array<{ path: string; content: string; language: string }> = []
  let activeFile: string | null = null

  // Match completed code blocks with file attributes
  const completedBlockRegex = /```(\w+)?\s*(?:file=["']?([^"'>\n]+)["']?)?\s*\r?\n([\s\S]*?)```/g
  let match
  while ((match = completedBlockRegex.exec(content)) !== null) {
    if (match[2]) {
      files.push({
        language: match[1] || "typescript",
        path: match[2].trim(),
        content: match[3].trim(),
      })
    }
  }
  // Also detect the currently-streaming (unclosed) code block
  const lastTickIndex = content.lastIndexOf("```")
  if (lastTickIndex !== -1) {
    const textAfterLastTick = content.slice(lastTickIndex)
    const unfinishedMatch = textAfterLastTick.match(/^```(\w+)?\s*(?:file=["']?([^"'>\n]+)["']?)?\s*\r?\n([\s\S]*)$/)
    if (unfinishedMatch && unfinishedMatch[2]) {
      const path = unfinishedMatch[2].trim()
      activeFile = path
      if (!files.some(f => f.path === path)) {
        files.push({
          language: unfinishedMatch[1] || "typescript",
          path,
          content: unfinishedMatch[3],
        })
      }
    }
  }
  return { files, activeFile }
}

export function ChatInterface({ project, initialMessages, initialUserMessage, userProfile, showBuildMode = true }: ChatInterfaceProps) {
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
    isTerminalOpen,
    setIsTerminalOpen,
  } = useWorkbench()

  const [hasProjectFiles, setHasProjectFiles] = useState(false)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(project.activeMessageId || null)
  const [isSplitScreen, setIsSplitScreen] = useState(false)
  const [isGameMakerMode, setIsGameMakerMode] = useState(false)

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

  const gameMakerKey = useMemo(
    () => (project?.id ? `chat-game-maker-${project.id}` : "chat-game-maker-global"),
    [project?.id],
  )

  const withGameMakerMetadata = useCallback(
    (metadata: any) => {
      const alreadyEnabled = !!metadata?.gameMakerMode || metadata?.mode === "game-maker"
      if (alreadyEnabled) return metadata
      if (!isGameMakerMode) return metadata
      return { ...(metadata || {}), gameMakerMode: true, mode: "game-maker" }
    },
    [isGameMakerMode],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(gameMakerKey)
      if (saved) setIsGameMakerMode(saved === "1")
    } catch { }
  }, [gameMakerKey])

  const isLocked = false;

  // Sync server notification settings to localStorage on mount
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem("falbor_bell_notification", userProfile.notificationSoundEnabled.toString())
      localStorage.setItem("falbor_bell_volume", userProfile.notificationVolume.toString())
    }
  }, [userProfile])

  // Listen for browser view triggers from chat messages
  useEffect(() => {
    const handleBrowserSwitch = () => {
      setWorkbenchTab("browser");
      setIsPreviewOpen(true);
    };
    window.addEventListener("workbench:switch-to-browser", handleBrowserSwitch);
    return () => window.removeEventListener("workbench:switch-to-browser", handleBrowserSwitch);
  }, [setWorkbenchTab]);

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


  // ─── Restore code from history on mount or message load ──────────────────
  useEffect(() => {
    if (messages.length === 0 || extractedFiles.length > 0) return

    // Priority: 1. activeMessageId (historical version), 2. latest assistant message with code
    let targetMsg = null
    if (activeMessageId) {
      targetMsg = messages.find(m => m.id === activeMessageId)
    }

    if (!targetMsg) {
      const assistantMsgs = [...messages].reverse().filter(m => m.role === "assistant" && m.content.includes("```"))
      targetMsg = assistantMsgs[0]
    }

    if (targetMsg) {
      console.log(`[ChatInterface] Restoring workbench from message: ${targetMsg.id}`)
      const { files: restoredFiles, activeFile } = extractFilesFromStreamingContent(targetMsg.content)
      if (restoredFiles.length > 0) {
        setExtractedFiles(restoredFiles)
        if (activeFile) setSelectedFilePath(activeFile)
        setHasProjectFiles(true)
        setIsPreviewOpen(true)
      }
    }
  }, [messages, extractedFiles.length, activeMessageId])

  // ─── Check project files on mount (once) ─────────────────────────────────
  const hasFetchedInitialRef = useRef(false)
  useEffect(() => {
    if (!project.id || hasFetchedInitialRef.current) return

    hasFetchedInitialRef.current = true
      ; (async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}/files`)
          const data = await res.json()
          if (data.files) {
            setExtractedFiles(data.files)
            setHasProjectFiles(data.files.length > 0)
            if (!isPreviewOpen && data.files.length > 0) setIsPreviewOpen(true)
          }
        } catch (err) {
          console.error("[ChatInterface] Mount fetch error:", err)
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
    lastMessagesRef.current = strictMessages
    hasInitialized.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // ← EMPTY dependency array — only fires on mount, never on re-render

  // Sync messages to ref for plugin bridge
  useEffect(() => {
    lastMessagesRef.current = messages
  }, [messages])

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
  const handleAutoGenerate = useCallback(async (userContent: string, metadata: any = null, modelOverride: string | null = null, isAutomated = true) => {
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
      isAutomated,
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
          selectedModel: modelOverride || project.selectedModel || "gpt-4o",
          sessionId: "main",
          isAutomated,
          metadata,
        }),
        signal: abortControllerRef.current.signal,
      })
      if (!res.ok) {
        let errorMsg = `API error: ${res.status}`
        try {
          const resClone = res.clone()
          const errorData = await resClone.json()
          if (errorData.error) errorMsg = errorData.error
        } catch (e) { }
        alert(errorMsg)
        setIsStreaming(false)
        isStreamingRef.current = false
        setMessages(prev => prev.filter(m => m.id !== tempId))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let overallAccumulated = ""
      let chatAccumulated = ""
      let codeAccumulated = ""
      let lineBuffer = ""
      let agentActivities: Record<string, string> = {}

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

            // Handle FalMax Multi-Agent Events
            if (data.type === "agent") {
              agentActivities[data.agent] = data.status
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, metadata: { ...m.metadata, agentActivities: { ...agentActivities } } } : m))
              )
              continue
            }

            if (data.type === "code") {
              // Code stream from Builder - don't show in chat history, but append for workbench extraction
              codeAccumulated += data.text
              overallAccumulated += data.text
            } else if (data.type === "chat") {
              // Chat stream from Narrator - show in chat history
              chatAccumulated += data.text
              overallAccumulated += data.text
            } else if (data.text) {
              // Legacy/Standard stream - show both
              chatAccumulated += data.text
              overallAccumulated += data.text
            }

            if (data.text || data.type === "code" || data.type === "chat") {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, content: chatAccumulated + (codeAccumulated ? "\n\n" + codeAccumulated : "") } : m))
              )

              // Broadcast AI chunk for live collaboration (Skip for FalMax to avoid Pusher spam/errors)
              if (project.selectedModel !== "falmax") {
                window.dispatchEvent(new CustomEvent(`broadcast:${project.id}`, {
                  detail: { type: 'MSG_AI_STREAM', tempId, chunk: chatAccumulated, senderId: user?.id }
                }))
              }

              // Live file extraction from the dedicated CODE BUFFER ONLY
              // This is CRITICAL to prevent <Thinking> tags from corrupting code files
              const { files: liveFiles, activeFile } = extractFilesFromStreamingContent(codeAccumulated || overallAccumulated)
              if (liveFiles.length > 0) {
                setExtractedFiles(liveFiles)
                if (activeFile) {
                  setSelectedFilePath(activeFile)
                  setWorkbenchTab("code")
                }
                setIsPreviewOpen(true)
                setIsCodeGenerating(true)
              }
            }

            if (data.done) {
              const finalId = data.messageId || `final-${Date.now()}`
              // For the final persist, we use the combined data so refresh works
              // Use <GeneratedCode> tags so MessageList knows to hide this part from the chat bubble
              const finalContent = chatAccumulated + "\n\n<GeneratedCode>\n" + codeAccumulated + "\n</GeneratedCode>\n"

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
                isAutomated,
                tokensUsed: data.tokensUsed || null,
                cost: data.cost || null,
                sessionId: targetSessionId,
                imageData: null,
                metadata: { ...metadata, agentActivities: { ...agentActivities } }
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

  // ─── Plugin System API Exposure ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const bridge = (window as any).falbor || {};
      (window as any).falbor = Object.assign(bridge, {
        getMessages: () => lastMessagesRef.current,
        getProject: () => project,
        sendPrompt: (msg: string, isAutomated = false) => {
          // Prefer ChatInput's handler to ensure credit deduction and correct UI ordering
          const internalSubmit = (window as any).falbor._internalSubmit;
          if (internalSubmit) {
            setTimeout(() => internalSubmit(msg, isAutomated), 200);
          } else {
            handleAutoGenerate(msg, withGameMakerMetadata(null), null, isAutomated);
          }
        },
        toggleCodePreview: () => setIsPreviewOpen(prev => !prev),
        toggleSplitScreen: () => setIsSplitScreen(prev => !prev),
        setTheme: (theme: 'dark' | 'light') => {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      });
    }
  }, [project, handleAutoGenerate, withGameMakerMetadata]);

  // ─── Auto-trigger: initial user message from URL prompt ──────────────────
  useEffect(() => {
    if (!initialUserMessage || hasAutoTriggered.current || !project.id || !hasInitialized.current) return

    const assistantMessages = messages.filter((m) => m.role === "assistant")
    if (assistantMessages.length > 0) return  // AI already responded — don't re-trigger

    hasAutoTriggered.current = true

    setIsPreviewOpen(true)

    // Call directly — hasInitialized is already true so messages are loaded and rendered.
    handleAutoGenerate(initialUserMessage, withGameMakerMetadata(null))
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
        isAutomated: true,
        tokensUsed: null,
        cost: null,
        sessionId: "main",
        imageData: null,
        metadata: taskMetadata,
      }
      setMessages((prev) => [...prev, newUserMsg])

      // Trigger AI generation in main chat
      handleAutoGenerate(message, withGameMakerMetadata(taskMetadata), model, true)
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



  const workspaceRef = useRef<HTMLDivElement>(null)
  const lastWidthRef = useRef(leftWidth)

  // ─── Smooth mouse/touch drag for resizer ──────────────────────────────────
  const handlePointerMove = useCallback((clientX: number) => {
    if (!isResizing.current) return

    const delta = clientX - startX.current
    const newWidth = startWidth.current + delta

    // Strict limits to protect buttons and maintain professionalism
    const minChat = 400
    const minWorkbench = 450
    const clamped = Math.max(minChat, Math.min(newWidth, window.innerWidth - minWorkbench))

    // Real-time DOM update (bypass React)
    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty('--chat-panel-width', `${clamped}px`)
    }
    lastWidthRef.current = clamped
  }, [])

  const handlePointerEnd = useCallback(() => {
    if (!isResizing.current) return
    isResizing.current = false

    // Sync React state ONCE resizing is finished
    setLeftWidth(lastWidthRef.current)

    setIsResizingState(false)
    document.body.classList.remove("is-resizing")
    document.body.style.userSelect = ""
    document.body.style.cursor = ""

    window.removeEventListener("mousemove", handleMouseMoveRef.current)
    window.removeEventListener("mouseup", handleMouseUpRef.current)
    window.removeEventListener("touchmove", handleTouchMoveRef.current)
    window.removeEventListener("touchend", handleTouchEndRef.current)
  }, [])

  const handleMouseMoveRef = useRef((e: MouseEvent) => handlePointerMove(e.clientX))
  const handleMouseUpRef = useRef(() => handlePointerEnd())
  const handleTouchMoveRef = useRef((e: TouchEvent) => {
    if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX)
  })
  const handleTouchEndRef = useRef(() => handlePointerEnd())

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      setIsResizingState(true)
      startX.current = e.clientX
      startWidth.current = leftWidth

      // Global state for absolute performance
      document.body.classList.add("is-resizing")
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"

      handleMouseMoveRef.current = (ev: MouseEvent) => handlePointerMove(ev.clientX)
      handleMouseUpRef.current = () => handlePointerEnd()

      window.addEventListener("mousemove", handleMouseMoveRef.current)
      window.addEventListener("mouseup", handleMouseUpRef.current)
    },
    [leftWidth, handlePointerMove, handlePointerEnd]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0) return
      isResizing.current = true
      setIsResizingState(true)
      startX.current = e.touches[0].clientX
      startWidth.current = leftWidth

      document.body.classList.add("is-resizing")
      document.body.style.userSelect = "none"

      handleTouchMoveRef.current = (ev: TouchEvent) => {
        if (ev.touches.length > 0) handlePointerMove(ev.touches[0].clientX)
      }
      handleTouchEndRef.current = () => handlePointerEnd()

      window.addEventListener("touchmove", handleTouchMoveRef.current, { passive: false })
      window.addEventListener("touchend", handleTouchEndRef.current)
      window.addEventListener("touchcancel", handleTouchEndRef.current)
    },
    [leftWidth, handlePointerMove, handlePointerEnd]
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
      files.forEach((file: any) => {
        const maybeImageData = file.imageData || ""
        const match = maybeImageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i)
        if (match) {
          zip.file(file.path, match[2], { base64: true })
          return
        }
        zip.file(file.path, file.content)
      })
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

  const handleSendMessage = useCallback((content: string, isAutomated = false) => {
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
      isAutomated,
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

    handleAutoGenerate(content, withGameMakerMetadata(null), null, isAutomated)
  }, [project.id, handleAutoGenerate, user?.id, withGameMakerMetadata])

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
        handleAutoGenerate(newContent, withGameMakerMetadata(originalMetadata))
      }, 0)

      return updated
    })
    // Ensure we don't trigger auto-reply multiple times
    hasAutoTriggered.current = true
  }, [handleAutoGenerate])

  // ─── Regenerate AI response handler ───────────────────────────────────────
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    hasAutoTriggered.current = true

    // Find the current state before updating
    const prev = lastMessagesRef.current || [];
    const idx = prev.findIndex((m) => m.id === messageId)
    if (idx === -1) return

    // Find the user message that preceded this AI message
    let userMsgIdx = idx - 1
    while (userMsgIdx >= 0 && prev[userMsgIdx].role !== "user") {
      userMsgIdx--
    }
    if (userMsgIdx < 0) return

    const userMsg = prev[userMsgIdx];

    // Persist truncation to database
    try {
      await truncateChatHistory(userMsg.id, userMsg.content)
    } catch (err) {
      console.error("[Regenerate] Failed to truncate history:", err)
    }

    // Update local state
    setMessages((prevMsgs) => {
      const currentIdx = prevMsgs.findIndex((m) => m.id === messageId)
      if (currentIdx === -1) return prevMsgs

      const updated = prevMsgs.slice(0, currentIdx)

      // Re-generate
      setTimeout(() => handleAutoGenerate(userMsg.content, withGameMakerMetadata(userMsg.metadata)), 0)
      return updated
    })
  }, [handleAutoGenerate, lastMessagesRef])

  const role = project.role || "admin";

  return (
    <>
      <PresenceLayer
        projectId={project.id}
        onMessageReceived={handleRealtimeMessage}
      />
      <div ref={workspaceRef} className="flex flex-col h-full overflow-hidden bg-card">
        {searchParams.get("plugin") && <PluginLoader pluginId={searchParams.get("plugin")!} />}

        {typeof document !== 'undefined' && document.getElementById('header-right-portal') ? (
          createPortal(
            <Navbar
              projectId={project.id}
              role={role}
              handleDownload={handleDownload}
              isTerminalOpen={isTerminalOpen}
              onToggleTerminal={() => {
                const nextOpen = !isTerminalOpen
                setIsTerminalOpen(nextOpen)
                if (nextOpen) {
                  // Switch to preview tab so the terminal panel is visible
                  setIsPreviewOpen(true)
                  setWorkbenchTab("preview")
                }
              }}
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
            onToggleTerminal={() => {
              const nextOpen = !isTerminalOpen
              setIsTerminalOpen(nextOpen)
              if (nextOpen) {
                setIsPreviewOpen(true)
                setWorkbenchTab("preview")
              }
            }}
            isSplitScreen={isSplitScreen}
            onEnterSplit={() => setIsSplitScreen(true)}
            projectName={project.title}
          />
        )}

        {/* Main Content Area with padding for alignment */}
        <div
          className="flex-1 flex overflow-hidden relative p-3 gap-3"
          style={{ '--chat-panel-width': `${leftWidth}px` } as any}
        >
          {/* Full-screen overlay during resize */}
          {isResizingState && (
            <div
              className="fixed inset-0 z-[1000]"
              style={{ cursor: 'col-resize' }}
              onMouseMove={(e) => handlePointerMove(e.clientX)}
              onMouseUp={handlePointerEnd}
            />
          )}

          {/* Chat Panel - Minimal (No island background/border) */}
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              isResizingState ? "transition-none select-none pointer-events-none" : "transition-[width] duration-300 ease-out",
              (isPreviewOpen || isSplitScreen || workbenchTab === "database" || workbenchTab === "settings") ? "" : "flex-1",
              isSplitScreen && "hidden",
              isNarrow && "min-w-[280px]"
            )}
            style={{
              width: (isPreviewOpen || workbenchTab === "database" || workbenchTab === "settings") && !isSplitScreen ? 'var(--chat-panel-width)' : "100%",
            }}
          >
            <div
              ref={messagesContainerRef}
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden space-y-4 no-scrollbar relative",
                isLocked && "pointer-events-none opacity-75"
              )}
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
                  onCodeExtracted={handleCodeExtracted}
                />
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Chat Input Area - Restored 'Square' design from screenshot */}
            <div
              className={cn(
                "sticky bottom-0 z-20 transition-all duration-300 relative",
                isPreviewOpen ? "bg-transparent" : "bg-[#FAF9F5]"
              )}
            >
              <div
                className={cn(
                  "w-full",
                  !isPreviewOpen && "max-w-3xl mx-auto relative"
                )}
              >
                <ChatInput
                  isAuthenticated={true}
                  projectId={project.id}
                  role={role}
                  initialModel={project.selectedModel || "gpt-4o"}
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
                  showBuildMode={showBuildMode}
                />
              </div>
            </div>
          </div>

          {/* Resize handle — minimal and centered in the gap */}
          {/* {isPreviewOpen && !isSplitScreen && (
            <div
              className="group relative z-[60] flex items-center justify-center -mx-1"
              style={{ width: 12, cursor: 'col-resize' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="absolute inset-y-0 -left-2 -right-2" />
              <div
                className={cn(
                  "w-[2px] h-10 rounded-full transition-all duration-300",
                  isResizingState
                    ? "bg-[#0099ff] h-24 scale-x-[2] shadow-[0_0_10px_rgba(0,153,255,0.3)]"
                    : "bg-gray-300 group-hover:bg-[#0099ff]/50"
                )}
              />
            </div>
          )} */}

          {/* Workbench Panel "Island" */}
          {(isPreviewOpen || workbenchTab === "database" || workbenchTab === "settings" || workbenchTab === "browser") && (
            <div
              className={cn(
                "flex-1 overflow-hidden bg-white dark:bg-[#111114] border border-[#dddcd8] dark:border-white/10 rounded-sm shadow-xs",
                isSplitScreen ? "p-0" : "",
                isResizingState ? "transition-none select-none pointer-events-none" : "transition-[width] duration-300 ease-out"
              )}
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
                messages={messages}
                activeMessageId={activeMessageId}
                onActivateVersion={handleActivateVersion}
                onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
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
        <ActivePluginContainer />
      </div>
    </>
  )
}






