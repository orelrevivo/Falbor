import { auth } from "@clerk/nextjs/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { db } from "@/config/db"
import { projects, messages as messagesTable, files, artifacts, userCustomKnowledge, projectSupabase } from "@/config/schema"
import { eq, asc } from "drizzle-orm"
import { getSystemPrompt } from "@/lib/common/prompts/prompt"
import { DISCUSS_SYSTEM_PROMPT } from "@/lib/common/prompts/discuss-prompt"
import { runMigration } from "@/lib/supabase/management-api"

const GREETING_KEYWORDS = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"]
const QUESTION_KEYWORDS = ["what is", "who is", "where is", "when is", "why is", "how does", "explain", "tell me about"]

const CODE_KEYWORDS = [
  "build",
  "create",
  "make",
  "website",
  "app",
  "component",
  "function",
  "page",
  "form",
  "dashboard",
  "api",
  "code",
  "implement",
  "develop",
  "generate code",
  "write code",
]

const ZAI_MODELS = {
  "glm-4.7-flash": "glm-4.7-flash",
  "glm-4.5-flash": "glm-4.5-flash",
}

const OPENROUTER_MODELS = {
  "gpt-5.2": "openai/gpt-5.2",
  "gpt-5.1-codex": "openai/gpt-5.1-codex-max",
  "claude-sonnet-4.6": "anthropic/claude-sonnet-4.6",
  "claude-opus-4.6": "anthropic/claude-opus-4.6",
  "claude-haiku-4.5": "anthropic/claude-haiku-4.5",
  "claude-opus-4.5": "anthropic/claude-opus-4.5",
  "claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
  "claude-opus-4": "anthropic/claude-opus-4",
  "grok-4.1": "x-ai/grok-4.1-fast",
  "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "grok-3-mini": "x-ai/grok-3-mini",
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const {
    projectId: incomingProjectId,
    message,
    imageData,
    uploadedFiles,
    discussMode = false,
    isAutomated = false,
    selectedModel = "gemini",
    supabaseUrl,
    anonKey,
    selectedMcps = [],
  } = body

  if (!message) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 })
  }

  let projectId = incomingProjectId
  let isNewProject = false

  if (!projectId) {
    isNewProject = true
    const [newProject] = await db
      .insert(projects)
      .values({
        userId,
        title: message.length > 50 ? `${message.substring(0, 47)}...` : message,
        selectedModel: selectedModel || "gemini",
        isAutomated,
      })
      .returning({ id: projects.id })
    projectId = newProject.id

    // Save credentials if provided
    if (supabaseUrl && anonKey) {
      await fetch(`/api/projects/${projectId}/supabase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          anonKey,
        }),
      })
    }
  }

  let project: any
  try {
    ;[project] = await db.select().from(projects).where(eq(projects.id, projectId))
  } catch (e) {
    console.error("[API/Chat] DB select error:", e)
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 })
  }

  if (!project || project.userId !== userId) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  let history: any[]
  try {
    history =
      (await db.select().from(messagesTable).where(eq(messagesTable.projectId, projectId)).orderBy(asc(messagesTable.createdAt))) ?? []
  } catch (e) {
    console.error("[API/Chat] History fetch error:", e)
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 })
  }

  const lastMsg = history[history.length - 1]
  if (history.length === 0 || !(lastMsg?.role === "user" && lastMsg.content === message)) {
    try {
      await db.insert(messagesTable).values({
        projectId,
        role: "user",
        content: message,
        isAutomated,
      })
      history.push({ role: "user", content: message })
    } catch (e) {
      console.error("[API/Chat] User insert error:", e)
      return new Response(JSON.stringify({ error: "Failed to save message" }), { status: 500 })
    }
  } else {
    console.log("[API/Chat] Skipping duplicate user message insert")
  }

  const responseStream = await handleModelRequest(
    history,
    message,
    imageData,
    projectId,
    userId,
    discussMode,
    isAutomated,
    selectedModel,
    supabaseUrl,
    anonKey,
    selectedMcps,
  )

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function detectMessageType(message: string): "greeting" | "question" | "build" {
  const lowerMessage = message.toLowerCase().trim()

  // Check if it's a simple greeting (short and matches greeting keywords)
  if (lowerMessage.length < 50 && GREETING_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return "greeting"
  }

  // Check if it's a question
  if (
    QUESTION_KEYWORDS.some((kw) => lowerMessage.includes(kw)) &&
    !CODE_KEYWORDS.some((kw) => lowerMessage.includes(kw))
  ) {
    return "question"
  }

  // Default to build request
  return "build"
}

async function handleModelRequest(
  history: any[],
  message: string,
  imageData: any,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  selectedModel: string,
  supabaseUrl?: string,
  anonKey?: string,
  selectedMcps: any[] = [],
) {
  const messageType = detectMessageType(message)
  const isCodeRequest =
    messageType === "build" || CODE_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword))

  console.log(
    `[${selectedModel}] Message type: ${messageType}, Code request: ${isCodeRequest} for: "${message.substring(0, 50)}..."`,
  )

  let effectiveMessage = message
  let supabaseConfig: any = undefined

  // Always fetch Supabase credentials so the AI always knows the DB is connected
  try {
    const [fetchedSupabaseConfig] = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))

    if (fetchedSupabaseConfig && fetchedSupabaseConfig.anonKey && fetchedSupabaseConfig.anonKey !== "pending") {
      supabaseConfig = fetchedSupabaseConfig
      const { supabaseUrl: url, anonKey: key, serviceRoleKey: role } = supabaseConfig
      console.log(`[Chat] Injecting Supabase credentials for project ${projectId}`)
      effectiveMessage += `\n\n## Supabase Credentials (Managed by Falbor)\nThis project uses a managed Supabase database. Use these credentials for ALL database operations in your code:\nVITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\nSUPABASE_SERVICE_ROLE_KEY=${role}\n\nIMPORTANT: Always use these exact values. Never use placeholder or example values.`
    }
  } catch (err) {
    console.error("Failed to fetch database credentials:", err)
  }

  // Prepare Supabase Context for System Prompt
  const supabaseContext = supabaseConfig ? {
    isConnected: true,
    hasSelectedProject: true,
    credentials: {
      anonKey: supabaseConfig.anonKey,
      supabaseUrl: supabaseConfig.supabaseUrl
    }
  } : undefined

  let systemPrompt = discussMode ? DISCUSS_SYSTEM_PROMPT : getSystemPrompt(supabaseContext)

  // Append context if it's an iteration
  if (history.length > 1) {
    systemPrompt += `\n\n### ITERATION MODE ###\nYou are working on an existing project. DO NOT rewrite all files. Only generate or modify the exact file(s) requested by the user or where the error originated. Maintain the existing design unless explicitly asked to change it. Outputting existing untouched files will cause the user to lose credits and is strictly forbidden.\n### END ITERATION MODE ###`
  }

  // Optimization for Email Template Edits
  if (message.includes("@Email/")) {
    systemPrompt += `\n\n### EMAIL EDIT MODE ###
When editing an email template, focus ONLY on the template content. 
1. Use the "email_template/template_id" file path.
2. DO NOT create redundant React components for the email unless explicitly asked.
3. Be CONCISE in your thinking.
### END EMAIL EDIT MODE ###`
  }

  // Add custom knowledge at the end
  const customKnowledgePrompt = await getCustomKnowledge(userId)
  systemPrompt += customKnowledgePrompt

  // Inject selected MCP context
  if (selectedMcps.length > 0) {
    let mcpPrompt = "\n\n## Connected MCP Context"
    selectedMcps.forEach(mcp => {
      mcpPrompt += `\n### ${mcp.name} (${mcp.type})`
      if (mcp.apiKey) mcpPrompt += `\nAPI_KEY=${mcp.apiKey}`
      if (mcp.accessToken) mcpPrompt += `\nACCESS_TOKEN=${mcp.accessToken}`
      if (mcp.metadata && Object.keys(mcp.metadata).length > 0) {
        mcpPrompt += `\nMETADATA=${JSON.stringify(mcp.metadata)}`
      }
    })
    effectiveMessage += mcpPrompt
  }

  if (selectedModel === "gemini") {
    return handleGeminiRequest(
      history,
      effectiveMessage,
      imageData,
      projectId,
      userId,
      discussMode,
      isAutomated,
      isCodeRequest,
      messageType,
      systemPrompt
    )
  } else if (ZAI_MODELS[selectedModel as keyof typeof ZAI_MODELS]) {
    return handleZaiRequest(
      history,
      effectiveMessage,
      projectId,
      userId,
      discussMode,
      isAutomated,
      isCodeRequest,
      selectedModel,
      messageType,
      systemPrompt
    )
  } else {
    return handleOpenRouterRequest(
      history,
      effectiveMessage,
      projectId,
      userId,
      discussMode,
      isAutomated,
      isCodeRequest,
      selectedModel,
      messageType,
      systemPrompt
    )
  }
}

async function handleGeminiRequest(
  history: any[],
  message: string,
  imageData: any,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  isCodeRequest: boolean,
  messageType: "greeting" | "question" | "build",
  systemPrompt: string,
) {
  const googleKey = process.env.GOOGLE_API_KEY

  if (!googleKey) {
    return createErrorStream("Google API key not configured.")
  }

  let genAI: any
  try {
    genAI = new GoogleGenerativeAI(googleKey)
  } catch (e) {
    console.error("[Gemini] SDK init error:", e)
    return createErrorStream(`Failed to initialize Gemini: ${e}`)
  }

  const maxContinuations = 5
  const continueMessage = "Continue exactly from where you left off without repeating any previous content."

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    const geminiModel = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 32768 },
    })

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat to trigger UI thinking state
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "" })}\n\n`))

          let userPrompt = message

          if (messageType === "greeting") {
            console.log("[Gemini] Simple greeting response")
            userPrompt = `${message}\n\nRespond naturally and briefly like a friendly human. No thinking tags, no code, just a warm greeting back.`
          } else if (messageType === "question") {
            console.log("[Gemini] Question with thinking and search")
            userPrompt = `${message}\n\nThink through this question step by step inside <Thinking> tags. Search for current information if needed inside <Search> tags. Then provide a clear, detailed answer in plain text. No code generation.`
          } else if (isCodeRequest) {
            console.log("[Gemini] Responding to build request with dynamic flow")
            userPrompt = buildCodePrompt(message)
          } else {
            console.log("[Gemini] Using Gemini for conversational response")
          }

          const contents = [...mapHistoryToGemini(conversationHistory), { role: "user", parts: [{ text: userPrompt }] }]

          // Immediate heartbeat to trigger UI thinking state transition
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " " })}\n\n`))

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            role: "assistant",
            content: "",
            isAutomated,
          }).returning({ id: messagesTable.id })

          let assistantMsgId = assistantMsg.id

          let continuationCount = 0
          do {
            const stream = await retryWithBackoff(async () => {
              return await geminiModel.generateContentStream({
                contents,
              })
            })

            let finishReason = null
            let chunkCount = 0
            for await (const chunk of stream.stream) {
              const part = chunk.candidates?.[0]?.content?.parts?.[0]
              if (part?.text) {
                fullResponse += part.text
                chunkCount++

                if (chunkCount % 50 === 0) {
                  db.update(messagesTable)
                    .set({ content: fullResponse })
                    .where(eq(messagesTable.id, assistantMsgId))
                    .then(() => console.log(`[Gemini] Partial progress saved for ${assistantMsgId}`))
                }

                if (isCodeRequest && messageType === "build") {
                  accumulatedBuffer += part.text
                  const lines = accumulatedBuffer.split("\n")
                  let textToSend = ""

                  for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i]

                    if (line.match(/^```\w+\s+file="/)) {
                      inCodeBlock = true
                      continue
                    }

                    if (line.trim() === "```" && inCodeBlock) {
                      inCodeBlock = false
                      continue
                    }

                    if (!inCodeBlock) {
                      textToSend += line + "\n"
                    }
                  }

                  accumulatedBuffer = lines[lines.length - 1]

                  if (textToSend) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                  }
                } else {
                  // For greetings and questions, stream everything
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: part.text })}\n\n`))
                }
              }
              if (chunk.candidates?.[0]?.finishReason) {
                finishReason = chunk.candidates[0].finishReason
              }
            }

            if (finishReason === "MAX_TOKENS" && continuationCount < maxContinuations) {
              continuationCount++
              contents.push({ role: "model", parts: [{ text: fullResponse }] })
              contents.push({ role: "user", parts: [{ text: continueMessage }] })
            } else {
              break
            }
          } while (true)

          console.log(`[Gemini] Response length: ${fullResponse.length}`)

          if (messageType === "build" && isCodeRequest) {
            await saveAssistantMessageWithParallelGeneration(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          } else {
            await saveAssistantMessage(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          }
        } catch (error) {
          console.error("[Gemini] Stream error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Gemini] Handler error:", e)
    return createErrorStream(`Gemini handler failed: ${e}`)
  }
}

function mapHistoryToGemini(history: any[]) {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }))
}

async function handleOpenRouterRequest(
  history: any[],
  message: string,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  isCodeRequest: boolean,
  selectedModel: string,
  messageType: "greeting" | "question" | "build",
  systemPrompt: string,
) {
  const openRouterKey = process.env.OPENROUTER_API_KEY

  if (!openRouterKey) {
    return createErrorStream("OpenRouter API key not configured.")
  }

  const modelId = OPENROUTER_MODELS[selectedModel as keyof typeof OPENROUTER_MODELS]
  if (!modelId) {
    return createErrorStream(`Invalid model: ${selectedModel}`)
  }

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    let userPrompt = message

    if (messageType === "greeting") {
      userPrompt = `${message}\n\nRespond naturally and briefly like a friendly human. No thinking tags, no code, just a warm greeting back.`
    } else if (messageType === "question") {
      userPrompt = `${message}\n\nThink through this question step by step inside <Thinking> tags. Search for current information if needed inside <Search> tags. Then provide a clear, detailed answer in plain text. No code generation.`
    } else if (isCodeRequest) {
      console.log(`[OpenRouter/${modelId}] Using for code generation with dynamic flow`)
      userPrompt = buildCodePrompt(message)
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userPrompt },
    ]

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat to trigger UI thinking state
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " " })}\n\n`))

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            role: "assistant",
            content: "",
            isAutomated,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
              "X-Title": "AI Website Builder",
            },
            body: JSON.stringify({
              model: modelId,
              messages: chatMessages,
              stream: true,
              max_tokens: 32768,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error("No response body reader")
          }

          const decoder = new TextDecoder()
          let buffer = ""
          let chunkCount = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullResponse += content
                    chunkCount++

                    // Periodically persist progress to database for continuity
                    if (chunkCount % 50 === 0) {
                      db.update(messagesTable)
                        .set({ content: fullResponse })
                        .where(eq(messagesTable.id, assistantMsgId))
                        .then(() => console.log(`[OpenRouter] Partial progress saved for ${assistantMsgId}`))
                    }

                    if (isCodeRequest && messageType === "build") {
                      accumulatedBuffer += content
                      const lines = accumulatedBuffer.split("\n")
                      let textToSend = ""

                      for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i]

                        if (line.match(/^```\w+\s+file="/)) {
                          inCodeBlock = true
                          continue
                        }

                        if (line.trim() === "```" && inCodeBlock) {
                          inCodeBlock = false
                          continue
                        }

                        if (!inCodeBlock) {
                          textToSend += line + "\n"
                        }
                      }

                      accumulatedBuffer = lines[lines.length - 1]

                      if (textToSend) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                      }
                    } else {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                    }
                  }
                } catch (e) {
                  console.error("[OpenRouter] Parse error:", e)
                }
              }
            }
          }

          console.log(`[OpenRouter/${modelId}] Response length: ${fullResponse.length}`)

          if (messageType === "build" && isCodeRequest) {
            await saveAssistantMessageWithParallelGeneration(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          } else {
            await saveAssistantMessage(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          }
        } catch (error) {
          console.error(`[OpenRouter/${modelId}] Stream error:`, error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[OpenRouter] Handler error:", e)
    return createErrorStream(`OpenRouter handler failed: ${e}`)
  }
}

async function handleZaiRequest(
  history: any[],
  message: string,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  isCodeRequest: boolean,
  selectedModel: string,
  messageType: "greeting" | "question" | "build",
  systemPrompt: string,
) {
  const zaiKey = process.env.ZAI_API_KEY

  if (!zaiKey) {
    return createErrorStream("Z.ai API key not configured.")
  }

  const modelId = ZAI_MODELS[selectedModel as keyof typeof ZAI_MODELS]
  if (!modelId) {
    return createErrorStream(`Invalid Z.ai model: ${selectedModel}`)
  }

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    let userPrompt = message

    if (messageType === "greeting") {
      userPrompt = `${message}\n\nRespond naturally and briefly like a friendly human. No thinking tags, no code, just a warm greeting back.`
    } else if (messageType === "question") {
      userPrompt = `${message}\n\nThink through this question step by step inside <Thinking> tags. Search for current information if needed inside <Search> tags. Then provide a clear, detailed answer in plain text. No code generation.`
    } else if (isCodeRequest) {
      console.log(`[Z.ai/${modelId}] Using for code generation with dynamic flow`)
      userPrompt = buildCodePrompt(message)
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userPrompt },
    ]

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat to trigger UI thinking state
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " " })}\n\n`))

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            role: "assistant",
            content: "",
            isAutomated,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id

          const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${zaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelId,
              messages: chatMessages,
              stream: true,
              max_tokens: 32768,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Z.ai API error: ${response.status} ${errorText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error("No response body reader")
          }

          const decoder = new TextDecoder()
          let buffer = ""
          let chunkCount = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullResponse += content
                    chunkCount++

                    // Periodically persist progress to database for continuity
                    if (chunkCount % 50 === 0) {
                      db.update(messagesTable)
                        .set({ content: fullResponse })
                        .where(eq(messagesTable.id, assistantMsgId))
                        .then(() => console.log(`[Z.ai] Partial progress saved for ${assistantMsgId}`))
                    }

                    if (isCodeRequest && messageType === "build") {
                      accumulatedBuffer += content
                      const lines = accumulatedBuffer.split("\n")
                      let textToSend = ""

                      for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i]

                        if (line.match(/^```\w+\s+file="/)) {
                          inCodeBlock = true
                          continue
                        }

                        if (line.trim() === "```" && inCodeBlock) {
                          inCodeBlock = false
                          continue
                        }

                        if (!inCodeBlock) {
                          textToSend += line + "\n"
                        }
                      }

                      accumulatedBuffer = lines[lines.length - 1]

                      if (textToSend) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                      }
                    } else {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                    }
                  }
                } catch (e) {
                  console.error("[Z.ai] Parse error:", e)
                }
              }
            }
          }

          console.log(`[Z.ai/${modelId}] Response length: ${fullResponse.length}`)

          if (messageType === "build" && isCodeRequest) {
            await saveAssistantMessageWithParallelGeneration(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          } else {
            await saveAssistantMessage(
              projectId,
              fullResponse,
              [],
              controller,
              encoder,
              assistantMsgId,
              [],
              false,
              discussMode,
              isAutomated,
            )
          }
        } catch (error) {
          console.error(`[Z.ai/${modelId}] Stream error:`, error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Z.ai] Handler error:", e)
    return createErrorStream(`Z.ai handler failed: ${e}`)
  }
}


async function handleSqlAutomation(projectId: string, codeBlocks: Array<{ language: string; path: string; content: string }>, controller: any, encoder: any) {
  const sqlBlocks = codeBlocks.filter(block => block.path.toLowerCase().endsWith(".sql") || block.language === "sql");

  if (sqlBlocks.length === 0) return;

  console.log(`[SQL Automation] Detected ${sqlBlocks.length} SQL blocks. Checking project for Supabase connection...`);

  try {
    const [supabaseConfig] = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId));

    if (supabaseConfig && supabaseConfig.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
      console.log(`[SQL Automation] Project ${projectId} has a Supabase connection. Executing migrations...`);

      for (const block of sqlBlocks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `\n\n> ⚡ **SQL Automation**: Executing ${block.path} on Supabase...\n` })}\n\n`));

        const result = await runMigration(supabaseConfig.supabaseProjectRef, block.content);

        if (result.success) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `> ✅ Successfully pushed ${block.path} to your server!\n` })}\n\n`));
          console.log(`[SQL Automation] ✅ Successfully executed ${block.path}`);
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `> ❌ Failed to push ${block.path}: ${result.error}\n` })}\n\n`));
          console.error(`[SQL Automation] ❌ Failed to execute ${block.path}:`, result.error);
        }
      }
    }
  } catch (err) {
    console.error("[SQL Automation] Error during automation:", err);
  }
}

function createErrorStream(errorMsg: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errorMsg })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })
}

async function saveAssistantMessage(
  projectId: string,
  fullResponse: string,
  searchQueries: any[],
  controller: any,
  encoder: any,
  existingMessageId?: string,
  uploadedFiles?: any[],
  generateImages?: boolean,
  discussMode = false,
  isAutomated = false,
) {
  try {
    console.log("[Save] Extracting code blocks from response...")
    const codeBlocks = discussMode ? [] : extractCodeBlocks(fullResponse)
    console.log(`[Save] Found ${codeBlocks.length} code blocks`)

    const cleanContent = discussMode ? fullResponse.trim() : removeCodeBlocks(fullResponse)
    const hasArtifact = codeBlocks.length > 0 && !discussMode

    let newMessage: any
    if (existingMessageId) {
      console.log("[Save] Updating existing message:", existingMessageId)
      const [updatedMessage] = await db
        .update(messagesTable)
        .set({
          content: cleanContent,
          hasArtifact,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
        })
        .where(eq(messagesTable.id, existingMessageId))
        .returning()
      newMessage = updatedMessage
    } else {
      console.log("[Save] Inserting message into database...")
      const [insertedMessage] = await db
        .insert(messagesTable)
        .values({
          projectId,
          role: "assistant",
          content: cleanContent,
          hasArtifact,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          isAutomated,
        })
        .returning()
      newMessage = insertedMessage
    }

    if (hasArtifact && codeBlocks.length > 0) {
      const existingFiles = await db.select().from(files).where(eq(files.projectId, projectId))
      const fileIds: string[] = []

      console.log("[Save] Processing code blocks...")
      for (const block of codeBlocks) {
        console.log(`[Save] Inserting file: ${block.path}`)

        const previousFile = existingFiles.find((f) => f.path === block.path)
        const previousContent = previousFile?.content ?? ""
        const previousLines = previousContent.split("\n").length
        const newLines = block.content.split("\n").length
        const additions = Math.max(0, newLines - previousLines)
        const deletions = Math.max(0, previousLines - newLines)

        const [file] = await db
          .insert(files)
          .values({
            projectId,
            messageId: newMessage.id,
            path: block.path,
            content: block.content,
            language: block.language,
            additions,
            deletions,
          })
          .returning()

        fileIds.push(file.id)
        console.log(`[Save] File inserted: ${file.id}`)
      }

      console.log("[Save] Creating artifact...")
      await db.insert(artifacts).values({
        projectId,
        messageId: newMessage.id,
        title: `Code from ${new Date().toLocaleString()}`,
        fileIds,
      })
      console.log("[Save] Artifact created")

      // SQL Automation
      await handleSqlAutomation(projectId, codeBlocks, controller, encoder)
    }

    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId))

    console.log("[Save] Sending done signal to client")
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ done: true, messageId: newMessage.id, hasArtifact, projectId })}\n\n`),
    )
  } catch (e) {
    console.error("[Save] Assistant error:", e)
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to save response" })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
    } catch (sendError) {
      console.error("[Save] Error sending error message:", sendError)
    }
  }
}

async function saveAssistantMessageWithParallelGeneration(
  projectId: string,
  fullResponse: string,
  searchQueries: any[],
  controller: any,
  encoder: any,
  existingMessageId?: string,
  uploadedFiles?: any[],
  generateImages?: boolean,
  discussMode = false,
  isAutomated = false,
) {
  try {
    console.log("[ParallelGen] Extracting code blocks from response...")
    const codeBlocks = discussMode ? [] : extractCodeBlocks(fullResponse)
    console.log(
      `[ParallelGen] Found ${codeBlocks.length} code blocks - splitting into ${codeBlocks.length} parallel workers`,
    )

    const cleanContent = discussMode ? fullResponse.trim() : removeCodeBlocks(fullResponse)
    const hasArtifact = codeBlocks.length > 0 && !discussMode

    let newMessage: any
    if (existingMessageId) {
      console.log("[ParallelGen] Updating existing message:", existingMessageId)
      const [updatedMessage] = await db
        .update(messagesTable)
        .set({
          content: cleanContent,
          hasArtifact,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
        })
        .where(eq(messagesTable.id, existingMessageId))
        .returning()
      newMessage = updatedMessage
    } else {
      console.log("[ParallelGen] Inserting message into database...")
      const [insertedMessage] = await db
        .insert(messagesTable)
        .values({
          projectId,
          role: "assistant",
          content: cleanContent,
          hasArtifact,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          isAutomated,
        })
        .returning()
      newMessage = insertedMessage
    }

    if (hasArtifact && codeBlocks.length > 0) {
      const existingFiles = await db.select().from(files).where(eq(files.projectId, projectId))

      console.log(`[ParallelGen] 🚀 Launching ${codeBlocks.length} parallel workers...`)
      const startTime = Date.now()

      const filePromises = codeBlocks.map(async (block, index) => {
        console.log(`[Worker ${index + 1}] Starting work on: ${block.path}`)

        const previousFile = existingFiles.find((f) => f.path === block.path)
        const previousContent = previousFile?.content ?? ""
        const previousLines = previousContent.split("\n").length
        const newLines = block.content.split("\n").length
        const additions = Math.max(0, newLines - previousLines)
        const deletions = Math.max(0, previousLines - newLines)

        const [file] = await db
          .insert(files)
          .values({
            projectId,
            messageId: newMessage.id,
            path: block.path,
            content: block.content,
            language: block.language,
            additions,
            deletions,
          })
          .returning()

        console.log(`[Worker ${index + 1}] ✅ Completed: ${block.path} (${file.id})`)
        return file.id
      })

      // Execute all file insertions in parallel
      const fileIds = await Promise.all(filePromises)

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)
      console.log(`[ParallelGen] 🎉 All ${codeBlocks.length} workers completed in ${duration}s (parallel execution!)`)

      console.log("[ParallelGen] Creating artifact...")
      await db.insert(artifacts).values({
        projectId,
        messageId: newMessage.id,
        title: `Code from ${new Date().toLocaleString()} (Generated in ${duration}s)`,
        fileIds,
      })
      console.log("[ParallelGen] Artifact created")

      // SQL Automation
      await handleSqlAutomation(projectId, codeBlocks, controller, encoder)
    }

    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId))

    console.log("[ParallelGen] Sending done signal to client")
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ done: true, messageId: newMessage.id, hasArtifact, projectId })}\n\n`),
    )
  } catch (e) {
    console.error("[ParallelGen] Error:", e)
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to save response" })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
    } catch (sendError) {
      console.error("[ParallelGen] Error sending error message:", sendError)
    }
  }
}

function extractCodeBlocks(content: string) {
  const codeBlockRegex = /```(\w+)\s+file="([^"]+)"\n([\s\S]*?)```/g
  const blocks: Array<{ language: string; path: string; content: string }> = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1],
      path: match[2],
      content: match[3].trim(),
    })
  }

  return blocks
}

/**
 * Shared code-prompt builder — all models use the same detailed instructions.
 */
function buildCodePrompt(message: string): string {
  return `${message}

IMPORTANT: Follow these steps ORGANICALLY and DYNAMICALLY throughout your response:

1. Think multiple times as you work — not just once at the start.
2. Search for information as you need it.
3. Plan files before writing them.
4. Interleave tags with your plain-text explanation naturally.
5. NEVER stop code mid-way — always finish every file completely.
6. Do NOT write raw code blocks inside your plain-text response. Code goes ONLY inside fenced blocks with a file path.
7. Do NOT repeat content from previous messages — continue from where you left off.

Use these tags throughout:
- <Thinking>your reasoning</Thinking> — multiple times
- <Search>search query and results</Search> — when you need info
- <UserMessage>your understanding of the request</UserMessage> — once at the start
- <Planning>list of files to create/update</Planning> — once when ready
- <FileChecks>validation notes</FileChecks> — if needed
- <Testing>test steps and results</Testing> — after generating code
- <ReviewedWork>deep professional summary of what was built</ReviewedWork> — at the very end

After ALL code is generated, write a detailed <ReviewedWork> summary. Do NOT output any raw code or file contents inside <ReviewedWork> — only prose.

Generate production-ready, complete code files now.`
}

function removeCodeBlocks(content: string) {
  // Remove fenced code blocks that have a file path (those become file buttons)
  let cleaned = content.replace(/```(\w+)\s+file="([^"]+)"\n[\s\S]*?```/g, "")

  // Remove trailing garbage: sequences of 3+ repeated identical non-word chars (_, -, *, etc.)
  cleaned = cleaned.replace(/([_\-*=~`#]){3,}\s*$/gm, "")

  // Remove lines that are ONLY whitespace at end
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  return cleaned.trim()
}

async function getCustomKnowledge(userId: string): Promise<string> {
  try {
    const [customKnowledge] = await db.select().from(userCustomKnowledge).where(eq(userCustomKnowledge.userId, userId))

    if (customKnowledge && customKnowledge.promptContent) {
      return `\n\n### USER CUSTOM KNOWLEDGE ###\nThe user has provided the following custom instructions that you MUST follow in all generations:\n\n**${customKnowledge.promptName}**\n${customKnowledge.promptContent}\n\n### END CUSTOM KNOWLEDGE ###\n`
    }
  } catch (error) {
    console.error("[API/Chat] Failed to fetch custom knowledge:", error)
  }
  return ""
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000,
): Promise<T> {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Check for 503 Service Unavailable or 429 Too Many Requests
      const isRetryable =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes("503") || error.message.includes("overloaded")))

      if (!isRetryable) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, i)
      console.log(
        `[Gemini] Request failed with ${error.status || "error"}. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}