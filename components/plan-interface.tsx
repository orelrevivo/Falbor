"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { MessageList } from "@/components/message/message-list"
import { ChatInput } from "@/components/layout/chat"
import type { Project, Message as SchemaMessage } from "@/config/schema"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StrictMessage extends Omit<SchemaMessage, "role"> {
  role: "user" | "assistant"
}

interface PlanInterfaceProps {
  project: Project
  initialMessages: SchemaMessage[]
  initialUserMessage?: string
}

type PlanChoice = {
  id: number
  question: string
}

export function PlanInterface({ project, initialMessages, initialUserMessage }: PlanInterfaceProps) {
  const [messages, setMessages] = useState<StrictMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [planSelectionDone, setPlanSelectionDone] = useState(false)
  const [customPlanAnswer, setCustomPlanAnswer] = useState("")
  const [selectedChoiceLabel, setSelectedChoiceLabel] = useState<string | null>(null)
  const [showPlanBlock, setShowPlanBlock] = useState(true)
  const [aiPlanChoices, setAiPlanChoices] = useState<PlanChoice[]>([])
  const [isGeneratingChoices, setIsGeneratingChoices] = useState(false)
  const [selectedQuestionText, setSelectedQuestionText] = useState<string | null>(null)

  const hasInitialized = useRef(false)
  const hasAutoTriggered = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (hasInitialized.current) return
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
  }, [initialMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showPlanBlock])

  const sendStreamingMessage = useCallback(
    async (content: string, shouldRedirectAfterDone = false) => {
      const userTempId = `temp-user-${Date.now()}`
      const assistantTempId = `temp-assistant-${Date.now()}`

      const tempUser: StrictMessage = {
        id: userTempId,
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

      const tempAssistant: StrictMessage = {
        id: assistantTempId,
        projectId: project.id,
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

      setMessages((prev) => [...prev, tempUser, tempAssistant])
      setIsStreaming(true)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            message: content,
            selectedModel: project.selectedModel || "gemini",
          }),
        })

        if (!res.ok) throw new Error(`API ${res.status}`)

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No stream reader")
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
                  prev.map((m) => (m.id === assistantTempId ? { ...m, content: accumulated } : m))
                )
              }

              if (data.done) {
                const finalContent = accumulated.trim() ? accumulated : data.content || accumulated
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId
                      ? {
                          ...m,
                          id: data.messageId || `final-${Date.now()}`,
                          content: finalContent,
                          hasArtifact: data.hasArtifact ?? false,
                        }
                      : m
                  )
                )

                if (shouldRedirectAfterDone) {
                  setTimeout(() => {
                    router.push(`/chat/${project.id}`)
                  }, 350)
                }
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      } catch (err) {
        console.error("[PlanInterface] Stream error:", err)
      } finally {
        setIsStreaming(false)
      }
    },
    [project.id, project.selectedModel, router]
  )

  const generatePlanQuestions = useCallback(async (idea: string) => {
    setIsGeneratingChoices(true)
    try {
      const prompt = `You are a planning assistant.
User project idea: "${idea}"

Generate exactly 3 short multiple-choice planning questions tailored to this specific idea.
Return ONLY valid JSON in this exact format:
[
  {"id":1,"question":"..."},
  {"id":2,"question":"..."},
  {"id":3,"question":"..."}
]`

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          message: prompt,
          selectedModel: project.selectedModel || "gemini",
        }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream reader")
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
            if (data.text) accumulated += data.text
          } catch {}
        }
      }

      const jsonMatch = accumulated.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as PlanChoice[]
        if (Array.isArray(parsed) && parsed.length >= 3) {
          setAiPlanChoices(parsed.slice(0, 3).map((p, idx) => ({ id: idx + 1, question: p.question })))
          return
        }
      }

      throw new Error("Invalid AI JSON")
    } catch {
      setAiPlanChoices([
        { id: 1, question: "What should be included in the first version (v1)?" },
        { id: 2, question: "Who is the target audience and core use case?" },
        { id: 3, question: "What timeline and scope constraints should we follow?" },
      ])
    } finally {
      setIsGeneratingChoices(false)
    }
  }, [project.id, project.selectedModel])

  useEffect(() => {
    if (!initialUserMessage || hasAutoTriggered.current) return
    if (!hasInitialized.current) return

    hasAutoTriggered.current = true
    sendStreamingMessage(initialUserMessage, false)
    generatePlanQuestions(initialUserMessage)
  }, [initialUserMessage, sendStreamingMessage, generatePlanQuestions])

  const handlePlanChoice = async (choiceText: string) => {
    if (planSelectionDone || isStreaming) return
    setPlanSelectionDone(true)
    setSelectedChoiceLabel(choiceText)
    setShowPlanBlock(false)

    const userAnswer = choiceText === "__custom__"
      ? customPlanAnswer
      : "Use this planning direction and propose concrete implementation steps."

    const normalizedLabel =
      choiceText === "__custom__" ? `Custom: ${customPlanAnswer}` : choiceText

    setSelectedQuestionText(normalizedLabel)

    const prompt = `Create a project planning summary from this context:

Original idea:
"${initialUserMessage || messages.find((m) => m.role === "user")?.content || ""}"

Selected direction: ${normalizedLabel}

Please provide a concise implementation plan.`

    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        questions: [{ id: 1, question: normalizedLabel, answer: normalizedLabel }],
        summary: `Plan selection: ${normalizedLabel}`,
      }),
    }).catch(() => null)

    await sendStreamingMessage(prompt, true)
  }

  const handleNewMessage = useCallback(
    (message: SchemaMessage | null) => {
      if (!message || !message.id || (message.role !== "user" && message.role !== "assistant")) return
      const safeMessage: StrictMessage = {
        ...message,
        role: message.role as "user" | "assistant",
      }

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === safeMessage.id)
        if (exists) return prev.map((m) => (m.id === safeMessage.id ? safeMessage : m))
        return [...prev, safeMessage]
      })
    },
    []
  )

  const formattedMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    }))
  }, [messages])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 mt-4">
        <div className="max-w-2xl mx-auto px-4">
          <MessageList messages={formattedMessages} projectId={project.id} />

          {showPlanBlock && !planSelectionDone && (
            <div className="mt-4 border rounded-xl p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-black" />
                <p className="text-sm font-medium">Pick one planning direction</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {isGeneratingChoices && (
                  <div className="sm:col-span-2 text-sm text-muted-foreground">
                    AI is generating tailored planning questions...
                  </div>
                )}

                {!isGeneratingChoices && aiPlanChoices.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant="outline"
                    className="justify-start text-left h-auto py-3 whitespace-normal"
                    onClick={() => handlePlanChoice(choice.question)}
                    disabled={isStreaming}
                  >
                    {choice.question}
                  </Button>
                ))}

                <div className="sm:col-span-2 border rounded-lg p-2">
                  <textarea
                    value={customPlanAnswer}
                    onChange={(e) => setCustomPlanAnswer(e.target.value)}
                    placeholder="Write your custom planning question..."
                    className="w-full min-h-[70px] resize-none text-sm outline-none"
                    disabled={isStreaming}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!customPlanAnswer.trim() || isStreaming}
                      onClick={() => handlePlanChoice("__custom__")}
                    >
                      Use custom question
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {planSelectionDone && selectedChoiceLabel && (
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Plan choice selected: {selectedChoiceLabel}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-none pb-4">
        <div className="max-w-2xl mx-auto px-4">
          <ChatInput
            isAuthenticated={true}
            projectId={project.id}
            initialModel={project.selectedModel || "gemini"}
            onNewMessage={handleNewMessage}
            externalIsLoading={isStreaming}
          />
        </div>
      </div>
    </div>
  )
}
