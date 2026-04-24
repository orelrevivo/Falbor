import { auth } from "@clerk/nextjs/server"

import { db } from "@/config/db"
import { projects, messages as messagesTable, files, artifacts, userCustomKnowledge, projectSupabase, projectNeon, userCredits, projectSecrets, userMcpConnections, userApiUsage, projectCollaborators } from "@/config/schema"
import { eq, asc, and } from "drizzle-orm"
import { getSystemPrompt, FALMAX_PROMPTS } from "@/lib/common/prompts/prompt"
import { DISCUSS_SYSTEM_PROMPT } from "@/lib/common/prompts/discuss-prompt"
import { MOTIONSITES_DESIGN_PROMPT } from "@/lib/common/prompts/prompt-design"
import { pusherServer } from "@/lib/pusher"
import { SECURITY_SYSTEM_PROMPT } from "@/lib/common/prompts/security-prompt"
import { discordActions, gmailActions, githubActions, linkedinActions, twitterActions, slackActions, spotifyActions } from "@/lib/mcp/actions"
import { freepikActions } from "@/lib/freepik/actions"
import { getUserSkillsForAIContext } from "@/app/actions/skills"
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
  "install",
  "npm",
  "package",
  "dependency",
  "add",
  "update",
  "change",
  "fix",
  "modify",
  "edit",
  "style",
  "remove",
  "button",
  "navbar",
  "header",
  "footer",
  "section",
  "layout",
  "design",
  "feature",
]

const ZAI_MODELS = {
  "glm-4.6v": "glm-4.6v",
  "glm-5-turbo": "glm-5-turbo",
  "glm-4.5-flash": "glm-4.5-flash",
}

const OLLAMA_MODELS: Record<string, string> = {
  "ollama/glm-4.7-flash": "glm-4.7-flash:latest",
  "ollama/gemma4-31b": "gemma4:31b",
}

// Define Model Fallback Chains for "No-429" Architecture
const MODEL_FALLBACK_CHAIN: Record<string, string[]> = {
  "gemini": ["google/gemini-2.0-flash-lite-preview:free", "google/gemini-2.0-flash-001"],
  "google/gemini-2.0-pro-exp-02-05:free": ["google/gemini-2.0-flash-001", "openai/gpt-4o-mini"],
  "google/gemini-2.0-flash-thinking-exp-1219:free": ["google/gemini-2.0-flash-001"],
  "zai-pro": ["deepseek/deepseek-chat", "meta-llama/llama-3.1-405b-instruct"],
  "zai-mini": ["google/gemini-2.0-flash-lite-preview", "anthropic/claude-3-haiku"],
  "falmax": ["gemini", "google/gemini-2.0-flash-001"],
  "gpt-5": ["gpt-4o", "gemini"],
  "gpt-4o": ["gpt-4o-mini", "gemini"],
  "o1": ["gpt-4o", "gemini"],
  "o1-preview": ["gpt-4o", "gemini"],
  "gpt-4o-mini": ["gemini"],
  "ollama/glm-4.7-flash": ["gemini"],
  "ollama/gemma4-31b": ["gemini"],
};

const OPENROUTER_MODELS = {
  "claude-sonnet-4.6": "anthropic/claude-sonnet-4.6",
  "claude-opus-4.6-fast": "anthropic/claude-opus-4.6-fast",
  "claude-opus-4.6": "anthropic/claude-opus-4.6",
  "claude-haiku-4.5": "anthropic/claude-haiku-4.5",
  "claude-opus-4.5": "anthropic/claude-opus-4.5",
  "claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
  "claude-opus-4": "anthropic/claude-opus-4",
  "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "grok-4.1-fast": "x-ai/grok-4.1-fast",
  "grok-4-fast": "x-ai/grok-4-fast",
  "grok-code-fast-1": "x-ai/grok-code-fast-1",
  "grok-4": "x-ai/grok-4",
  "grok-3-mini": "x-ai/grok-3-mini",
  "gemini-2.0-flash": "google/gemini-2.0-flash-001",
  "gemini-3-flash": "google/gemini-3-flash-preview",
  "gemini": "google/gemini-2.0-flash-001",
  "nano-banana": "google/gemini-2.5-flash-image",
  "nano-banana-2": "google/gemini-3.1-flash-image-preview",
  "nano-banana-pro": "google/gemini-3-pro-image-preview",
  "qwen-3.5-35b": "qwen/qwen3.5-35b-a3b",
  "qwen-3.5-27b": "qwen/qwen3.5-27b",
  "nemotron-3-super-120b": "nvidia/nemotron-3-super-120b-a12b:free",
  "gemma-3-12b-it": "google/gemma-3-12b-it:free",
  "moonshotai/kimi-k2.5": "moonshotai/kimi-k2.5",
  "moonshotai/kimi-k2-thinking": "moonshotai/kimi-k2-thinking",
  "falmax": "falmax",
}

const OPENAI_MODELS = {
  "gpt-5.2": "gpt-5.2",
  "gpt-5.1-codex": "gpt-5.1-codex-max",
  "gpt-5.5": "gpt-5.5",
  "gpt-5.4": "gpt-5.4",
  "gpt-5": "gpt-5",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "o1": "o1",
  "o1-preview": "o1-preview",
  "o1-mini": "o1-mini",
}

const MINIMAX_MODELS = {
  "minimax/minimax-m2.7": "abab6.5g-chat",
  "minimax/minimax-m2.5": "abab6.5s-chat",
}

async function dispatchMcpTool(name: string, args: any, userId: string, projectId?: string, assistantMsgId?: string): Promise<any> {
  console.log(`[MCP] Dispatching tool: ${name}`, args)
  switch (name) {
    // Discord
    case "discord_send_message":
      return await discordActions.sendMessage(userId, args.channelId, args.content)
    case "discord_get_messages":
      return await discordActions.getMessages(userId, args.channelId, args.limit)
    case "discord_get_guilds":
      return await discordActions.getGuilds(userId)
    case "discord_get_channels":
      return await discordActions.getChannels(userId, args.guildId)
    case "discord_create_dm":
      return await discordActions.createDM(userId, args.recipientId)
    case "discord_delete_message":
      return await discordActions.deleteMessage(userId, args.channelId, args.messageId)

    // Gmail
    case "gmail_list_messages":
      return await gmailActions.listMessages(userId, args.q, args.maxResults)
    case "gmail_get_message":
      return await gmailActions.getMessage(userId, args.id)
    case "gmail_send_message":
      return await gmailActions.sendMessage(userId, args.to, args.subject, args.body)
    case "gmail_delete_message":
      return await gmailActions.deleteMessage(userId, args.id)

    // GitHub
    case "github_get_user":
      return await githubActions.getUser(userId)
    case "github_list_repos":
      return await githubActions.listRepos(userId, args.type, args.sort)
    case "github_get_repo":
      return await githubActions.getRepo(userId, args.owner, args.repo)
    case "github_create_repo":
      return await githubActions.createRepo(userId, args.name, args.description, args.isPrivate)
    case "github_get_repo_contents":
      return await githubActions.getRepoContents(userId, args.owner, args.repo, args.path)
    case "github_create_issue":
      return await githubActions.createIssue(userId, args.owner, args.repo, args.title, args.body)

    // LinkedIn
    case "linkedin_get_profile":
      return await linkedinActions.getProfile(userId)
    case "linkedin_share_post":
      return await linkedinActions.sharePost(userId, args.text, args.visibility)

    // Twitter/X
    case "twitter_get_me":
      return await twitterActions.getMe(userId)
    case "twitter_get_user_tweets":
      return await twitterActions.getUserTweets(userId, args.twitterUserId, args.maxResults)
    case "twitter_create_tweet":
      return await twitterActions.createTweet(userId, args.text)
    case "twitter_delete_tweet":
      return await twitterActions.deleteTweet(userId, args.tweetId)

    // Slack
    case "slack_get_user_info":
      return await slackActions.getUserInfo(userId)
    case "slack_list_channels":
      return await slackActions.listChannels(userId, args.types)
    case "slack_post_message":
      return await slackActions.postMessage(userId, args.channel, args.text, args.threadTs)
    case "slack_get_channel_history":
      return await slackActions.getChannelHistory(userId, args.channel, args.limit)

    // Spotify
    case "spotify_get_current_user":
      return await spotifyActions.getCurrentUser(userId)
    case "spotify_get_currently_playing":
      return await spotifyActions.getCurrentlyPlaying(userId)
    case "spotify_get_user_playlists":
      return await spotifyActions.getUserPlaylists(userId, args.limit)
    case "spotify_create_playlist":
      return await spotifyActions.createPlaylist(userId, args.name, args.description, args.isPublic)
    case "spotify_search_tracks":
      return await spotifyActions.searchTracks(userId, args.query, args.limit)
    case "spotify_add_tracks_to_playlist":
      return await spotifyActions.addTracksToPlaylist(userId, args.playlistId, args.trackUris)
    case "spotify_play_track":
      return await spotifyActions.playTrack(userId, args.trackUri, args.deviceId)

    // Freepik
    case "freepik_search_icons":
      return await freepikActions.searchIcons(args.query, args.limit)
    case "freepik_download_icon":
      if (!projectId || !assistantMsgId) return { success: false, error: "Missing project/message context for download" }
      return await freepikActions.downloadIcon(projectId, assistantMsgId, args.iconId, args.fileName)

    // Internet Search (SerpApi)
    case "internet_search":
      try {
        const apiKey = process.env.SERPAPI_API_KEY;
        if (!apiKey) return { error: "SerpApi key not configured" };
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(args.query)}&api_key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        return {
          results: data.organic_results?.slice(0, 5).map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
          })) || []
        };
      } catch (err) {
        console.error("internet_search error:", err);
        return { error: "Search service unavailable" };
      }

    default:
      console.error(`[MCP] Tool NOT found: ${name}`)
      return { success: false, error: `Tool ${name} not found.` }
  }
}

async function executeActionTags(content: string, userId: string, projectId?: string, assistantMsgId?: string) {
  const actionRegex = /<Action>(\w+)\(([\s\S]*?)\)<\/Action>/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    const toolName = match[1];
    try {
      const args = JSON.parse(match[2]);
      console.log(`[MCP/TagFallback] Auto-executing action: ${toolName}`, args);
      await dispatchMcpTool(toolName, args, userId, projectId, assistantMsgId);
    } catch (e) {
      console.error(`[MCP/TagFallback] Failed to execute ${toolName}:`, e);
    }
  }
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
    selectedModel: initialSelectedModel = "gemini",
    supabaseUrl,
    anonKey,
    selectedMcps = [],
    securityMode = false,
    targetProjectId = null,
    sessionId = "main",
    userMessageId: incomingUserMessageId = null,
    saveOnly = false,
    metadata: incomingMetadata = null,
  } = body

  if (!message) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 })
  }

  // Fetch User Credits and enforce model restrictions
  let credits: any = null
  try {
    credits = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).then(r => r[0])
    if (!credits) {
      const [newCredits] = await db.insert(userCredits).values({
        userId,
        subscriptionTier: 'none',
        balance: 150,
        lastRegenTime: new Date(),
      }).returning()
      credits = newCredits
    }
  } catch (err) {
    console.error("Failed to fetch user credits:", err)
  }

  let selectedModel = initialSelectedModel
  if (credits?.subscriptionTier === 'none' || credits?.subscriptionTier === 'standard') {
    selectedModel = "ollama/glm-4.7-flash"
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
        selectedModel: selectedModel,
        isAutomated,
      })
      .returning({ id: projects.id })
    projectId = newProject.id

    // Save credentials if provided
    if (supabaseUrl && anonKey) {
      await db.insert(projectSupabase).values({
        projectId,
        supabaseProjectRef: supabaseUrl.split("//")[1]?.split(".")[0] || "unknown",
        supabaseUrl,
        anonKey,
        serviceRoleKey: "",
        dbPassword: "",
        isActive: true,
      })

      // Also sync to projectSecrets
      const secretUpdates = [
        { name: "VITE_SUPABASE_URL", value: supabaseUrl },
        { name: "VITE_SUPABASE_ANON_KEY", value: anonKey },
      ]

      for (const secret of secretUpdates) {
        await db.insert(projectSecrets).values({
          projectId,
          userId,
          name: secret.name,
          value: secret.value,
        })
      }
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
    // Check if user is an authorized collaborator
    const [collaborator] = await db
      .select()
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId),
          eq(projectCollaborators.status, "accepted")
        )
      )

    if (!collaborator) {
      // If project is public, we still allow viewing, but NOT posting (POST requests are for sending messages)
      console.warn(`[API/Chat] Unauthorized access attempt by user ${userId} to project ${projectId}`)
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    // Role-based post restriction (POST handler is for sending messages)
    if (collaborator.role === "viewer") {
      console.warn(`[API/Chat] Viewer role attempt to send message by user ${userId} in project ${projectId}`)
      return new Response(JSON.stringify({ error: "Permission denied: Viewers cannot send messages" }), { status: 403 })
    }
  }

  let history: any[]
  try {
    history = (await db.select().from(messagesTable).where(
      and(
        eq(messagesTable.projectId, projectId),
        eq(messagesTable.sessionId, sessionId)
      )
    ).orderBy(asc(messagesTable.createdAt))) ?? []
  } catch (e) {
    console.error("[API/Chat] History fetch error:", e)
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 })
  }

  let userMessageId: string | undefined
  const lastMsg = history[history.length - 1]
  if (history.length === 0 || !(lastMsg?.role === "user" && lastMsg.content === message)) {
    try {
      const [inserted] = await db.insert(messagesTable).values({
        projectId,
        sessionId,
        role: "user",
        content: message,
        isAutomated,
        imageData: imageData?.data || null,
        metadata: {
          ...(incomingMetadata || {}),
          ...(uploadedFiles ? { uploadedFiles } : {}),
        },
      }).returning({ id: messagesTable.id })
      userMessageId = inserted.id
      history.push({ role: "user", content: message, id: userMessageId, sessionId })

      // Broadcast user message to Pusher so other collaborators see it (Background)
      pusherServer.trigger(`presence-project-${projectId}`, "server-chat-event", {
        type: 'MSG_USER',
        message: {
          id: userMessageId,
          role: "user",
          content: message,
          createdAt: new Date().toISOString()
        },
        projectId
      }).catch(err => console.warn("[Pusher] Failed to broadcast user message:", err))
    } catch (e) {
      console.error("[API/Chat] User insert error:", e)
      return new Response(JSON.stringify({ error: "Failed to save message" }), { status: 500 })
    }
  } else {
    userMessageId = lastMsg.id
    console.log("[API/Chat] Skipping duplicate user message insert")
  }

  if (saveOnly) {
    return new Response(JSON.stringify({
      success: true,
      messageId: userMessageId,
      sessionId
    }), { status: 200 })
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
    project,
    userMessageId,
    securityMode,
    targetProjectId,
    sessionId,
    request,
    body,
    incomingProjectId,
  )

  if (responseStream instanceof Response) {
    return responseStream
  }

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

  // 1. CODE_KEYWORDS always take priority — if ANY code keyword is present, it's a build request.
  // This prevents messages like "Hi, build me a website" from being classified as a greeting.
  const hasCodeKeyword = CODE_KEYWORDS.some((kw) => lowerMessage.includes(kw))
  if (hasCodeKeyword) {
    return "build"
  }

  // 2. Check if it's a simple greeting (short and matches greeting keywords, AND no code keywords)
  if (lowerMessage.length < 50 && GREETING_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return "greeting"
  }

  // 3. Check if it's a question
  if (QUESTION_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return "question"
  }

  // 4. Default to build request for unknown intents that aren't greetings or simple questions
  return "build"
}

function detectDesignContext(message: string): string {
  const lower = message.toLowerCase()

  let recommendedBenchmark = "Nexora (SaaS / Premium Dark)"
  if (lower.includes("agency") || lower.includes("portfolio") || lower.includes("creative")) {
    recommendedBenchmark = "Aethera (Agency / Creative Studio)"
  } else if (lower.includes("investment") || lower.includes("venture") || lower.includes("corporate")) {
    recommendedBenchmark = "VEX Ventures (High-End Corporate)"
  } else if (lower.includes("crypto") || lower.includes("web3") || lower.includes("ai") || lower.includes("nft")) {
    recommendedBenchmark = "Orbis NFT (Tech / Futuristic)"
  }

  return `\n\n### MANDATORY DESIGN CONTEXT ###
Project Intent: ${message}
Recommended MotionSites Benchmark: **${recommendedBenchmark}**
Protocol: You MUST use the DNA (palettes, fonts, layout architecture) from the ${recommendedBenchmark} benchmark in your context. DO NOT use generic AI palettes or basic Tailwind cards. Every component MUST feel professional and premium.
### END DESIGN CONTEXT ###`
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
  project?: any,
  userMessageId?: string,
  securityMode = false,
  targetProjectId?: string | null,
  sessionId = "main",
  request?: Request,
  body?: any,
  incomingProjectId?: string | null,
) {
  const urlObj = request ? new URL(request.url) : null
  const baseAppUrl = urlObj ? `${urlObj.protocol}//${urlObj.host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

  const messageType = detectMessageType(message)
  const isCodeRequest =
    messageType === "build" || CODE_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword))

  console.log(
    `[${selectedModel}] Message type: ${messageType}, Code request: ${isCodeRequest} for: "${message.substring(0, 50)}..."`,
  )

  let effectiveMessage = message

  // Skip heavy context fetching for local Ollama models (the handler strips all this context anyway)
  const isOllamaModel = selectedModel.startsWith("ollama/")

  // Parallelize all required data fetching to minimize latency
  const [supabaseResult, neonResult, secretsResult, customKnowledgePrompt, userSkills, creditsResult] = await Promise.all([
    // Supabase Credentials (Skip if greeting OR Ollama model)
    (messageType === "greeting" || isOllamaModel) ? Promise.resolve(null) : (async () => {
      try {
        const contextId = targetProjectId || projectId
        const [fetched] = await db.select().from(projectSupabase).where(eq(projectSupabase.projectId, contextId))
        return fetched
      } catch (err) {
        console.error("Failed to fetch database credentials:", err)
        return null
      }
    })(),
    // Neon Credentials (Skip if greeting OR Ollama model)
    (messageType === "greeting" || isOllamaModel) ? Promise.resolve(null) : (async () => {
      try {
        const contextId = targetProjectId || projectId
        const [fetched] = await db.select().from(projectNeon).where(eq(projectNeon.projectId, contextId))
        return fetched
      } catch (err) {
        console.error("Failed to fetch Neon database credentials:", err)
        return null
      }
    })(),
    // Project Secrets (Skip if greeting OR Ollama model)
    (messageType === "greeting" || isOllamaModel) ? Promise.resolve([]) : (async () => {
      try {
        const contextId = targetProjectId || projectId
        return await db.select().from(projectSecrets).where(eq(projectSecrets.projectId, contextId))
      } catch (err) {
        console.error("Failed to fetch project secrets:", err)
        return []
      }
    })(),
    // Custom Knowledge (Skip for Ollama — stripped anyway)
    isOllamaModel ? Promise.resolve("") : getCustomKnowledge(userId),
    // Enabled Skills (Skip if greeting OR Ollama model)
    (messageType === "greeting" || isOllamaModel) ? Promise.resolve("") : getUserSkillsForAIContext(userId),
    // User Credits (Essential for all requests — needed for subscription tier check)
    (async () => {
      try {
        let res = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).then(r => r[0])
        if (!res) {
          const [newCredits] = await db.insert(userCredits).values({
            userId,
            subscriptionTier: 'none',
            balance: 150,
            lastRegenTime: new Date(),
          }).returning()
          res = newCredits
        }
        return res
      } catch (err) {
        console.error("Failed to fetch user credits:", err)
        return null
      }
    })()
  ])

  let supabaseConfig: any = supabaseResult
  let neonConfig: any = neonResult
  let fetchedSecrets: any[] = secretsResult
  let credits: any = creditsResult

  if (supabaseConfig && supabaseConfig.anonKey && supabaseConfig.anonKey !== "pending") {
    const { supabaseUrl: url, anonKey: key, serviceRoleKey: role } = supabaseConfig
    console.log(`[Chat] Injecting Supabase credentials for project ${projectId}`)
    effectiveMessage += `\n\n## Supabase Credentials (Managed by Falbor)\nThis project uses a managed Supabase database. Use these credentials for ALL database operations in your code:\nVITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\nSUPABASE_SERVICE_ROLE_KEY=${role}\n\nIMPORTANT: Always use these exact values. NEVER use placeholder or example values.`
  }

  if (neonConfig) {
    const { databaseUrl: url } = neonConfig
    console.log(`[Chat] Injecting Neon credentials for project ${projectId}`)
    effectiveMessage += `\n\n## Neon Database Connection (Managed by Falbor Max)\nThis project uses a managed Neon database. Use this connection string for ALL database operations in your code:\nDATABASE_URL=${url}\nVITE_DATABASE_URL=${url}\n\nIMPORTANT: Always use this exact value. NEVER use placeholder or example values.`
  }

  if (fetchedSecrets.length > 0) {
    console.log(`[Chat] Injecting ${fetchedSecrets.length} secrets for project ${projectId}`)
    let secretsPrompt = "\n\n## Project Secrets (Environment Variables)\nThe following secrets are configured for this project. Use these names in your code and .env file. The values are provided here for your internal knowledge to ensure correct configuration."
    fetchedSecrets.forEach(secret => {
      secretsPrompt += `\n${secret.name}=${secret.value}`
    })
    effectiveMessage += secretsPrompt
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

  // Prepare Neon Context for System Prompt
  const neonContext = neonConfig ? {
    isConnected: true,
    databaseUrl: neonConfig.databaseUrl
  } : undefined

  // =========================================================
  // EARLY CLONE DETECTION
  // Must run BEFORE systemPrompt build so we can skip the
  // MOTIONSITES_DESIGN_PROMPT and detectDesignContext entirely.
  // =========================================================
  const earlyCloneMatch = message.match(/(?:Clone this website URL:|Build a site like this one:|Clone:)\s*(https?:\/\/[^\s\n]+)/i)
  const isCloneRequest = !!earlyCloneMatch
  let cloneTargetUrl = earlyCloneMatch ? earlyCloneMatch[1].trim() : ""

  if (isCloneRequest || message.includes("Build a site like this one")) {
    console.log(`[PIPELINE] Clone Detection: isCloneRequest=${isCloneRequest}, target=${cloneTargetUrl}, messageSnippet="${message.substring(0, 70).replace(/\n/g, "\\n")}"`);
  }

  let cloneScreenshotDataUrl: string | null = null // will be set after pipeline runs below

  let systemPrompt = securityMode
    ? SECURITY_SYSTEM_PROMPT
    : (discussMode
      ? DISCUSS_SYSTEM_PROMPT
      // Skip MOTIONSITES_DESIGN_PROMPT in clone mode — the target site defines the design
      : getSystemPrompt(supabaseContext, neonContext) + (isCloneRequest ? "" : "\n\n" + MOTIONSITES_DESIGN_PROMPT))

  // Inject Design Intelligence — skip in clone mode (target site colors/fonts override this)
  if (!discussMode && !securityMode && isCodeRequest && !isCloneRequest) {
    const designContext = detectDesignContext(message)
    systemPrompt += designContext
  }

  const contextId = targetProjectId || projectId

  // GitHub Project Awareness
  if (project.isGithubClone && project.githubUrl) {
    let gitContext = `\n\n## GitHub Integration Context
This project is connected to a GitHub repository: ${project.githubUrl}
- **Owner**: ${project.githubOwner}
- **Repo**: ${project.githubRepoName}
- **Branch**: ${project.githubBranch || "main"}
- **Status**: ${project.isGitAdopted ? "Adopted (User owned)" : "Cloned (Public/Read-Only)"}

### Git-Aware Workflow:
1. **SCAN BEFORE EDIT**: Use <FileSearch> to map out the structure before making changes.
2. **SMART EDITS**: Since this is a real GitHub project, protect the existing architecture. ONLY modify relevant files.
3. **COMMIT ACCESS**: ${project.isGitAdopted ? "You have permission to propose commits that the user can push back to GitHub." : "This repo is currently read-only. Suggest changes the user can manually apply or adopt."}`

    try {
      const projectFiles = await db.select().from(files).where(eq(files.projectId, contextId))
      if (projectFiles.length > 0) {
        const filePaths = projectFiles.map((f: any) => f.path)
        gitContext += `\n\n### Repository Structure:\n${filePaths.join("\n")}`

        const mentionedFiles = projectFiles.filter((f: any) => {
          const fileName = f.path.split("/").pop() || f.path
          return message.includes(f.path) || message.includes(fileName)
        })

        if (mentionedFiles.length > 0) {
          gitContext += `\n\n### Mentioned Files Content (for your reference):\n`
          mentionedFiles.forEach((f: any) => {
            const content = f.content.length > 15000 ? f.content.substring(0, 15000) + "\n...[TRUNCATED]" : f.content
            gitContext += `\n--- ${f.path} ---\n${content}\n`
          })
        } else {
          gitContext += `\n\n*(Note: No specific files were mentioned in the user's prompt. If you need file contents to make accurate edits, ask the user or guess the file names to get them in the next turn.)*`
        }
      }
    } catch (err) {
      console.error("[Chat] Failed to attach project files to Git context", err)
    }

    effectiveMessage += gitContext
  }

  // Super Security Agent Context Injection
  if (securityMode && contextId) {
    try {
      const projectFiles = await db.select().from(files).where(eq(files.projectId, contextId))
      const domain = project.deploymentConfig?.deploymentUrl || "Not deployed yet"

      // Basic framework detection from files
      let framework = "Unknown"
      if (projectFiles.some(f => f.path.includes("next.config"))) framework = "Next.js"
      else if (projectFiles.some(f => f.path.includes("vite.config"))) framework = "Vite/React"
      else if (projectFiles.some(f => f.path.includes("package.json"))) framework = "Node.js/NPM"

      let securityContext = `\n\n## SECURITY PROJECT CONTEXT
You are auditing the following project:
- **Project Name**: ${project.title}
- **Domain**: ${domain}
- **Framework**: ${framework}
- **File Structure**:
${projectFiles.map(f => `- ${f.path}`).slice(0, 100).join("\n")}${projectFiles.length > 100 ? "\n- ... (and more)" : ""}

### Security Directives:
1. **Analyze Files**: If the user asks for a scan, analyze the contents of the files above for common vulnerabilities (secrets, injection, missing headers).
2. **Context-Aware Fixes**: When proposing fixes, use the specific paths and framework context provided above.
3. **Badge Generation**: If you complete a comprehensive audit and the user is satisfied, include a "Security Score" (0-100) and list of "Findings" in your response. This will trigger the trust badge generation.`

      systemPrompt += securityContext
    } catch (err) {
      console.error("[Security] Failed to attach project context", err)
    }
  }



  // Append context if it's an iteration
  if (history.length > 1) {
    systemPrompt += `\n\n### ITERATION MODE (STRICTLY ENFORCED) ###
You are continuing work on an existing project. Follow these rules without exception:

1. **IDENTIFY FIRST**: Before writing any code, use <FileSearch> to identify which specific file(s) contain the error or need changes.
2. **ONLY output the file(s) that need to change** — do NOT rewrite files that are already working.
3. **If the user reports an error**, trace the error to its source file and ONLY output that file with the fix applied.
4. **NEVER rewrite all files from scratch** — doing so wastes the user's credits and is strictly forbidden.
5. **Preserve existing design, colors, and layout** unless the user explicitly requests changes.
6. **Error-fix workflow**: <FileSearch query="error location"> → identify the broken file → output ONLY that fixed file.

Violating these rules by outputting unrelated files is STRICTLY FORBIDDEN.
### END ITERATION MODE ###`
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
  systemPrompt += customKnowledgePrompt

  // Inject enabled skills context
  if (userSkills.length > 0) {
    let skillsPrompt = "\n\n## ENABLED SKILLS ###\nYou have access to the following skills that extend your capabilities. When a user mentions a skill or asks for something related to a skill's domain, automatically use that skill's instructions and capabilities:\n\n"
    userSkills.forEach(skill => {
      skillsPrompt += `\n--- ${skill.name} (@${skill.slug}) ---\n${skill.instructions}\n`
      if (skill.modelConfig) {
        skillsPrompt += `Configuration: ${JSON.stringify(skill.modelConfig)}\n`
      }
    })
    skillsPrompt += "\n### END ENABLED SKILLS ###\n"
    systemPrompt += skillsPrompt
  }

  // Inject selected MCP context
  if (selectedMcps.length > 0) {
    let mcpPrompt = "\n\n## Connected MCP Context"
    selectedMcps.forEach(mcp => {
      mcpPrompt += `\n- ${mcp.name} (${mcp.type}): Connected. Status: ACTIVE.`
      if (mcp.metadata && Object.keys(mcp.metadata).length > 0) {
        mcpPrompt += `\n  METADATA=${JSON.stringify(mcp.metadata)}`
      }
    })
    effectiveMessage += mcpPrompt
  }

  // Also inject ALL connected MCPs for awareness, even if not explicitly selected for the turn
  try {
    const allMcpConnections = await db
      .select()
      .from(userMcpConnections)
      .where(eq(userMcpConnections.userId, userId))

    const activeMcps = allMcpConnections.filter(c => c.isActive)
    if (activeMcps.length > 0) {
      let availableMcpsPrompt = "\n\n## Available User Account Integrations (MCP)"
      availableMcpsPrompt += "\nThe following accounts are connected to this user profile. Use the provided tokens only when necessary to perform requested tasks."
      activeMcps.forEach(mcp => {
        // Avoid duplicate injection if already in selectedMcps
        if (!selectedMcps.find(sm => sm.id === mcp.id)) {
          availableMcpsPrompt += `\n- ${mcp.name} (${mcp.type}): Connected. Status: ACTIVE.`
        }
      })
      effectiveMessage += availableMcpsPrompt
    }
  } catch (err) {
    console.error("Failed to fetch all MCP connections:", err)
  }

  // Inject current project files for context awareness (STRICTLY REQUIRED for multi-turn reliability)
  if (history.length > 1 && !project.isGithubClone) {
    try {
      const projectFiles = await db.select().from(files).where(eq(files.projectId, projectId));
      if (projectFiles.length > 0) {
        let fileContext = `\n\n## Current Project Files\nTo maintain consistency, here is the current file structure. Use <FileSearch> if you need the full content of any file.\n`;
        fileContext += projectFiles.map(f => `- ${f.path}`).join("\n");

        // Auto-inject content of files mentioned in the prompt to reduce 'silent' failures
        const mentionedFiles = projectFiles.filter(f => {
          const fileName = f.path.split("/").pop() || f.path;
          return message.includes(f.path) || message.includes(fileName);
        });

        if (mentionedFiles.length > 0) {
          fileContext += `\n\n### Relevant File Contents (for your reference):\n`;
          mentionedFiles.forEach(f => {
            const safeContent = f.content.length > 12000 ? f.content.substring(0, 12000) + "\n...[TRUNCATED]" : f.content;
            fileContext += `\n--- ${f.path} ---\n${safeContent}\n`;
          });
        }

        effectiveMessage += fileContext;
      }
    } catch (err) {
      console.error("[Context] Failed to inject project files:", err);
    }
  }


  // =========================================================
  // CLONE WEBSITE PIPELINE
  // Runs after systemPrompt is built (so we can prepend to it)
  // =========================================================
  if (isCloneRequest && cloneTargetUrl) {
    console.log(`[CloneMode] Calling clone-website API for: ${cloneTargetUrl} (baseAppUrl: ${baseAppUrl})`)
    try {
      const cloneRes = await fetch(`${baseAppUrl}/api/clone-website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-user-id": userId,
        },
        body: JSON.stringify({ url: cloneTargetUrl }),
        signal: AbortSignal.timeout(60000), // Increased to 60s for consistency
      })

      if (cloneRes.ok) {
        const cloneData = await cloneRes.json()

        // Save to body/shared context so it can be added to metadata later
        if (body) body.cloneData = cloneData;

        // Store screenshot as data URL for stream emission to user AND AI vision
        if (cloneData.screenshotBase64) {
          imageData = {
            data: cloneData.screenshotBase64,
            mimeType: cloneData.screenshotMimeType || "image/jpeg",
            sections: cloneData.sectionScreenshots || [],
          }
          cloneScreenshotDataUrl = `data:${cloneData.screenshotMimeType || "image/jpeg"};base64,${cloneData.screenshotBase64}`
          console.log(`[CloneMode] Screenshot injected (${cloneData.screenshotBase64.length} chars base64) + ${cloneData.sectionScreenshots?.length || 0} sections`)
        } else {
          console.warn("[CloneMode] No screenshot returned from clone API")
        }

        // ── Helper: absolute + decode HTML entities (&amp; → &) from Microlink ──
        const toAbsolute = (href: string): string => {
          if (!href) return ""
          const clean = href
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
          try { return new URL(clean, cloneTargetUrl).href } catch { return clean }
        }

        // Design tokens
        const colorList = cloneData.colors?.length > 0 ? cloneData.colors.slice(0, 25).join(", ") : "Analyze from screenshot"
        const fontList = cloneData.fonts?.length > 0 ? cloneData.fonts.slice(0, 8).join(", ") : "Analyze from screenshot"
        const sectionList = cloneData.sections?.length > 0 ? cloneData.sections.join(", ") : "Detect from screenshot"

        // Clean all asset URLs (absolute + entity-decoded)
        const a = cloneData.assets || {}
        const logoUrl = toAbsolute(a.logoUrl || "")
        const faviconUrl = toAbsolute(a.faviconUrl || "")
        const ogImageUrl = toAbsolute(a.ogImageUrl || "")
        const allImgs = (a.allImages || []).map(toAbsolute).filter(Boolean)
        const bgImgs = (a.backgroundImages || []).map(toAbsolute).filter(Boolean)
        const knownUrls = new Set([logoUrl, faviconUrl, ogImageUrl].filter(Boolean))
        const contentImgs = allImgs.filter((u: string) => !knownUrls.has(u))

        // Build TypeScript const block — AI pastes verbatim, no URL retyping
        const imgConstsLines = [
          "// Real images from the cloned site — paste at top of your component",
          `const SITE_LOGO     = "${logoUrl}";`,
          `const SITE_FAVICON  = "${faviconUrl}";`,
          `const SITE_HERO_IMG = "${ogImageUrl}";`,
          "",
          "// Content images — use in sections in this exact order:",
          ...contentImgs.slice(0, 20).map((u: string, i: number) => `const IMG_${i + 1} = "${u}";`),
          ...(bgImgs.length > 0 ? [
            "",
            "// CSS background images:",
            ...bgImgs.map((u: string, i: number) => `// backgroundImage: 'url("${u}")'  /* BG_${i + 1} */`),
          ] : []),
        ].join("\n")

        // Build exact JSX snippet examples
        const jsxSnippets = [
          ...(logoUrl ? [`<img src="${logoUrl}" alt="logo" className="h-8 w-auto" />`] : []),
          ...(faviconUrl ? [`<link rel="icon" href="${faviconUrl}" />`] : []),
          ...(ogImageUrl ? [`<img src="${ogImageUrl}" alt="hero" className="w-full" />`] : []),
          ...contentImgs.slice(0, 8).map((u: string, i: number) =>
            `<img src="${u}" alt="section image ${i + 1}" className="w-full rounded-xl" />`
          ),
        ].join("\n")

        effectiveMessage += `

## 🎯 CLONE MODE — ${cloneTargetUrl}
Title: ${cloneData.title || "see screenshot"} | Sections: ${sectionList}

### 🎨 Design:
Colors: ${colorList}
Fonts: ${fontList}
Button/Card styles: ${cloneData.buttonStyles || "analyze from screenshot"}

### 🖼️ REAL IMAGE CONSTANTS — PASTE THIS BLOCK AT THE TOP OF YOUR MAIN COMPONENT FILE:
\`\`\`typescript
${imgConstsLines}
\`\`\`

### 📋 EXACT JSX TAGS — COPY-PASTE INTO YOUR SECTIONS:
\`\`\`jsx
${jsxSnippets || "// No images — use screenshot to recreate visually"}
\`\`\`

### ❌ THESE ARE BANNED — NEVER DO THIS:
- src="/anything" (relative path — breaks on localhost, FORBIDDEN)
- src="placeholder.jpg" or src="" (fake images, FORBIDDEN)
- <img> tag without a real https:// URL from the list above (FORBIDDEN)

### 📝 Page text:
${(cloneData.pageText || "").substring(0, 2000) || "Reconstruct from screenshot"}

---
⚠️ Full-page screenshot attached. Study every section before writing any code.`

        // System prompt — strict pixel-perfect clone override
        const CLONE_SYSTEM_PROMPT = `## ⚡ WEBSITE CLONE MODE — PIXEL-PERFECT OUTPUT

You are cloning a REAL website. A full-page screenshot is attached as your visual reference.
The user message contains REAL image URLs as TypeScript constants (SITE_LOGO, SITE_HERO_IMG, IMG_1, etc.)
scraped live from the actual page.

### ‼️ ZERO-TOLERANCE RULES:
1. NO Falbor internal templates (Stellar, Nexora, VEX, Aethera) — COMPLETELY IGNORED
2. NO relative image paths (src="/img.png") — they BREAK on localhost
3. NO placeholder images — every <img> uses a real https:// URL from the constants above
4. NO skipped sections — every section in the screenshot must exist in your code
5. NO invented colors — only from the extracted palette

### 📸 ANALYSIS FIRST — inside <Thinking>:
Navbar: logo, links, bg color, button shape
Hero: headline, subline, CTA button border-radius + color, main image
Each section top-to-bottom: layout grid, cards, images visible
Footer: columns, copyright, social icons
Global: exact bg color, text color, accent color, button radius, card radius

### 🖼️ IMAGE IMPLEMENTATION — MANDATORY APPROACH:
1. Copy the const block from the user message VERBATIM to the top of your component
2. In the navbar: <img src={SITE_LOGO} alt="logo" />
3. In the hero: <img src={SITE_HERO_IMG} alt="hero" /> or style={{backgroundImage: \`url(\${SITE_HERO_IMG})\`}}
4. In each section with images: <img src={IMG_1} />, <img src={IMG_2} /> etc. in order
5. In index.html head: <link rel="icon" href={SITE_FAVICON} />

### 💻 CODE:
Stack: Vite + React + TypeScript + Tailwind CSS
CSS variables for every color: :root { --primary: #xxx; --bg: #xxx; }
Google Fonts import for exact font names in index.html
Responsive: mobile breakpoints on all layouts

### ✅ PASS STANDARD:
Every section from the screenshot must be visible and recognizable.
Every image that appears in the screenshot must appear in the code as a real URL.`

        systemPrompt = CLONE_SYSTEM_PROMPT + "\n\n" + systemPrompt
        console.log(`[CloneMode] Injected ${contentImgs.length} content image constants + LOGO/HERO/FAVICON`)

      } else {
        console.warn(`[CloneMode] Clone API returned ${cloneRes.status} — proceeding text-only`)
      }
    } catch (err) {
      console.error("[CloneMode] Clone pipeline error:", err)
    }
  }

  // --- RESILIENCE WRAPPER (FALLBACKS & RETRIES) ---
  const attemptRequest = async (model: string): Promise<ReadableStream | Response> => {
    if (model === "falmax") {
      // FalMax is strictly for Teams subscribers
      if (credits?.subscriptionTier !== "teams") {
        return new Response(JSON.stringify({
          error: "FalMax Multi-Agent Orchestration is a premium feature restricted to Teams subscribers. Upgrade to Teams to access this AI cluster."
        }), { status: 403, headers: { "Content-Type": "application/json" } })
      }
      return runFalMax(request!, body!, userId, credits, incomingProjectId || (body?.project?.id), systemPrompt)
    }

    // All models now flow through specialized providers (OpenRouter/OpenAI/Z.ai)

    if (model.startsWith("openrouter/")) {
      return handleOpenRouterRequest(
        history, effectiveMessage, imageData, projectId, userId, discussMode,
        isAutomated, isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, baseAppUrl, body?.cloneData
      )
    }

    if (OLLAMA_MODELS[model]) {
      return handleOllamaRequest(
        history, effectiveMessage, projectId, userId, discussMode, isAutomated,
        isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, body?.cloneData
      )
    }

    if (ZAI_MODELS[model as keyof typeof ZAI_MODELS]) {
      return handleZaiRequest(
        history, effectiveMessage, projectId, userId, discussMode, isAutomated,
        isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, body?.cloneData
      )
    }

    if (model.startsWith("openai/")) {
      return handleOpenAIRequest(
        history, effectiveMessage, imageData, projectId, userId, discussMode,
        isAutomated, isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, body?.cloneData
      )
    }

    // Direct OpenAI Platform Integration (Paid Only)
    if (OPENAI_MODELS[model as keyof typeof OPENAI_MODELS]) {
      if (model !== "gpt-5" && (!credits || credits.subscriptionTier === "none")) {
        return new Response(JSON.stringify({
          error: "This OpenAI GPT Model is a premium feature restricted to paid subscribers. Upgrade to a Pro or Teams plan to unlock direct platform access."
        }), { status: 403, headers: { "Content-Type": "application/json" } })
      }
      return handleOpenAIRequest(
        history, effectiveMessage, imageData, projectId, userId, discussMode,
        isAutomated, isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, body?.cloneData
      )
    }

    // Direct Minimax Platform Integration (Paid Only)
    if (MINIMAX_MODELS[model as keyof typeof MINIMAX_MODELS]) {
      if (!credits || credits.subscriptionTier === "none") {
        return new Response(JSON.stringify({
          error: "Minimax Models are premium features restricted to paid subscribers. Upgrade to a Pro or Teams plan to access these high-performance models."
        }), { status: 403, headers: { "Content-Type": "application/json" } })
      }
      return handleMinimaxRequest(
        history, effectiveMessage, projectId, userId, discussMode, isAutomated,
        isCodeRequest, model, messageType as any, systemPrompt,
        (text: string) => executeActionTags(text, userId, projectId, userMessageId),
        userMessageId, sessionId, body?.cloneData
      )
    }

    // Default to OpenRouter for all other models
    return handleOpenRouterRequest(
      history, effectiveMessage, imageData, projectId, userId, discussMode,
      isAutomated, isCodeRequest, model, messageType as any, systemPrompt,
      (text: string) => executeActionTags(text, userId, projectId, userMessageId),
      userMessageId, sessionId, baseAppUrl, body?.cloneData
    )
  }

  // Execute with Global Fallback & Error Suppression
  let activeModel = selectedModel
  const modelsToTry = [activeModel, ...(MODEL_FALLBACK_CHAIN[activeModel] || [])]

  for (let i = 0; i < modelsToTry.length; i++) {
    try {
      const model = modelsToTry[i]
      console.log(`[Resilience] Attempting request using model: ${model} (Trial ${i + 1}/${modelsToTry.length})`)
      const response = await attemptRequest(model)

      // If it's a Response object (error), check if we should fallback
      if (response instanceof Response && !response.ok) {
        if (response.status === 429 || response.status >= 500) {
          console.warn(`[Resilience] Model ${model} returned ${response.status}. Switching to next fallback...`)
          continue
        }
      }

      // If it's a clone request with a screenshot, prepend a screenshot event to the stream
      // so the user can see the captured image at the top of the AI response
      let finalResponse: ReadableStream | Response = response
      if (isCloneRequest && cloneScreenshotDataUrl && response instanceof ReadableStream) {
        const encoder = new TextEncoder()
        const screenshotEvent = encoder.encode(
          `data: ${JSON.stringify({ cloneScreenshot: cloneScreenshotDataUrl, cloneUrl: cloneTargetUrl })}\n\n`
        )
        const originalStream = response
        finalResponse = new ReadableStream({
          async start(controller) {
            // Emit screenshot event first
            controller.enqueue(screenshotEvent)
            // Then pipe the original model stream
            const reader = originalStream.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                controller.enqueue(value)
              }
            } finally {
              controller.close()
            }
          },
        })
      }

      return finalResponse

    } catch (error: any) {
      console.error(`[Resilience] Fatal attempt error for ${modelsToTry[i]}:`, error)
      if (i < modelsToTry.length - 1) {
        console.warn(`[Resilience] Failure triggered fallback to: ${modelsToTry[i + 1]}`)
        continue
      }
      // If we are at the end of the chain, provide a professional generic error stream
      return createErrorStream("System reached maximum capacity. We are working to restore normal service. Please try again in 30 seconds.")
    }
  }

  return createErrorStream("The AI models are currently unavailable due to high demand. Please wait a moment and try again.")
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
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId?: string,
  sessionId = "main",
  cloneData?: any,
) {
  const googleKey = process.env.GOOGLE_API_KEY

  if (!googleKey) {
    throw new Error("Gemini configuration missing")
  }

  let genAI: any
  try {
    genAI = new GoogleGenerativeAI(googleKey)
  } catch (e) {
    console.error("[Gemini] SDK init error:", e)
    return createErrorStream("Failed to initialize the AI engine. Please retry in a few seconds.")
  }

  const maxContinuations = 50 // Increased for longer tasks
  const continueMessage = "You reached the token limit. Please CONTINUE generating the code EXACTLY from where you stopped. DO NOT repeat anything previous. Focus on completing the full professional full-stack task as requested. Stay detailed."

  // --- MCP TOOL DEFINITIONS ---
  const geminiTools = [
    {
      functionDeclarations: [
        // Discord
        {
          name: "discord_send_message",
          description: "Sends a message to a Discord channel or user ID. Use this for REAL actions.",
          parameters: {
            type: "OBJECT",
            properties: {
              channelId: { type: "STRING", description: "The ID of the channel or user to send to." },
              content: { type: "STRING", description: "The message content." }
            },
            required: ["channelId", "content"]
          }
        },
        {
          name: "discord_get_messages",
          description: "Retrieves recent messages from a Discord channel. Use this for REAL data retrieval.",
          parameters: {
            type: "OBJECT",
            properties: {
              channelId: { type: "STRING", description: "The ID of the channel." },
              limit: { type: "NUMBER", description: "Number of messages (default 10)." }
            },
            required: ["channelId"]
          }
        },
        {
          name: "discord_create_dm",
          description: "Creates a Direct Message channel with a user. Returns a channelId. Use this BEFORE discord_send_message if you only have a user ID.",
          parameters: {
            type: "OBJECT",
            properties: {
              recipientId: { type: "STRING", description: "The ID of the user to open a DM with." }
            },
            required: ["recipientId"]
          }
        },
        {
          name: "discord_get_guilds",
          description: "Lists all Discord servers (guilds) the user is in.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "discord_get_channels",
          description: "Lists all channels in a specific Discord guild.",
          parameters: {
            type: "OBJECT",
            properties: {
              guildId: { type: "STRING", description: "The ID of the guild to list channels for." }
            },
            required: ["guildId"]
          }
        },
        {
          name: "discord_delete_message",
          description: "Deletes a specific message from a Discord channel.",
          parameters: {
            type: "OBJECT",
            properties: {
              channelId: { type: "STRING", description: "The ID of the channel." },
              messageId: { type: "STRING", description: "The ID of the message to delete." }
            },
            required: ["channelId", "messageId"]
          }
        },

        // Gmail
        {
          name: "gmail_send_message",
          description: "Sends an email from the user's account.",
          parameters: {
            type: "OBJECT",
            properties: {
              to: { type: "STRING", description: "Recipient address." },
              subject: { type: "STRING", description: "Email subject." },
              body: { type: "STRING", description: "Email body (HTML supported)." }
            },
            required: ["to", "subject", "body"]
          }
        },
        {
          name: "gmail_list_messages",
          description: "Lists emails matching a query.",
          parameters: {
            type: "OBJECT",
            properties: {
              q: { type: "STRING", description: "The search query." },
              maxResults: { type: "NUMBER", description: "Max results." }
            }
          }
        },
        {
          name: "gmail_get_message",
          description: "Gets full details of a specific email.",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING", description: "Message ID." }
            },
            required: ["id"]
          }
        },
        {
          name: "gmail_delete_message",
          description: "Deletes a specific email.",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING", description: "Message ID." }
            },
            required: ["id"]
          }
        },

        // GitHub
        {
          name: "github_get_user",
          description: "Gets the authenticated GitHub user's profile information.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "github_list_repos",
          description: "Lists repositories for the authenticated user.",
          parameters: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", description: "Type of repos: all, owner, member (default: owner)" },
              sort: { type: "STRING", description: "Sort by: created, updated, pushed, full_name (default: updated)" }
            }
          }
        },
        {
          name: "github_get_repo",
          description: "Gets detailed information about a specific repository.",
          parameters: {
            type: "OBJECT",
            properties: {
              owner: { type: "STRING", description: "Repository owner username." },
              repo: { type: "STRING", description: "Repository name." }
            },
            required: ["owner", "repo"]
          }
        },
        {
          name: "github_create_repo",
          description: "Creates a new repository for the authenticated user.",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Repository name." },
              description: { type: "STRING", description: "Repository description." },
              isPrivate: { type: "BOOLEAN", description: "Whether the repo should be private." }
            },
            required: ["name"]
          }
        },
        {
          name: "github_get_repo_contents",
          description: "Gets contents of a repository directory or file.",
          parameters: {
            type: "OBJECT",
            properties: {
              owner: { type: "STRING", description: "Repository owner." },
              repo: { type: "STRING", description: "Repository name." },
              path: { type: "STRING", description: "Path to directory or file (default: root)." }
            },
            required: ["owner", "repo"]
          }
        },
        {
          name: "github_create_issue",
          description: "Creates a new issue in a repository.",
          parameters: {
            type: "OBJECT",
            properties: {
              owner: { type: "STRING", description: "Repository owner." },
              repo: { type: "STRING", description: "Repository name." },
              title: { type: "STRING", description: "Issue title." },
              body: { type: "STRING", description: "Issue body/description." }
            },
            required: ["owner", "repo", "title"]
          }
        },

        // LinkedIn
        {
          name: "linkedin_get_profile",
          description: "Gets the authenticated LinkedIn user's profile.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "linkedin_share_post",
          description: "Shares a post on LinkedIn.",
          parameters: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: "Post content text." },
              visibility: { type: "STRING", description: "Visibility: PUBLIC or CONNECTIONS (default: PUBLIC)." }
            },
            required: ["text"]
          }
        },

        // Twitter/X
        {
          name: "twitter_get_me",
          description: "Gets the authenticated Twitter user's profile.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "twitter_get_user_tweets",
          description: "Gets tweets from a specific user.",
          parameters: {
            type: "OBJECT",
            properties: {
              twitterUserId: { type: "STRING", description: "Twitter user ID." },
              maxResults: { type: "NUMBER", description: "Max tweets to retrieve (default: 10)." }
            },
            required: ["twitterUserId"]
          }
        },
        {
          name: "twitter_create_tweet",
          description: "Creates a new tweet.",
          parameters: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: "Tweet content (max 280 chars)." }
            },
            required: ["text"]
          }
        },
        {
          name: "twitter_delete_tweet",
          description: "Deletes a tweet.",
          parameters: {
            type: "OBJECT",
            properties: {
              tweetId: { type: "STRING", description: "ID of the tweet to delete." }
            },
            required: ["tweetId"]
          }
        },

        // Slack
        {
          name: "slack_get_user_info",
          description: "Gets the authenticated Slack user's profile.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "slack_list_channels",
          description: "Lists channels in the Slack workspace.",
          parameters: {
            type: "OBJECT",
            properties: {
              types: { type: "STRING", description: "Channel types: public_channel, private_channel (default: both)." }
            }
          }
        },
        {
          name: "slack_post_message",
          description: "Posts a message to a Slack channel.",
          parameters: {
            type: "OBJECT",
            properties: {
              channel: { type: "STRING", description: "Channel ID or name." },
              text: { type: "STRING", description: "Message text." },
              threadTs: { type: "STRING", description: "Thread timestamp to reply in thread (optional)." }
            },
            required: ["channel", "text"]
          }
        },
        {
          name: "slack_get_channel_history",
          description: "Gets message history from a channel.",
          parameters: {
            type: "OBJECT",
            properties: {
              channel: { type: "STRING", description: "Channel ID." },
              limit: { type: "NUMBER", description: "Number of messages (default: 20)." }
            },
            required: ["channel"]
          }
        },

        // Spotify
        {
          name: "spotify_get_current_user",
          description: "Gets the authenticated Spotify user's profile.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "spotify_get_currently_playing",
          description: "Gets the currently playing track.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "spotify_get_user_playlists",
          description: "Gets the user's playlists.",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "NUMBER", description: "Max playlists to retrieve (default: 20)." }
            }
          }
        },
        {
          name: "spotify_create_playlist",
          description: "Creates a new playlist for the user.",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Playlist name." },
              description: { type: "STRING", description: "Playlist description." },
              isPublic: { type: "BOOLEAN", description: "Whether the playlist is public (default: false)." }
            },
            required: ["name"]
          }
        },
        {
          name: "spotify_search_tracks",
          description: "Searches for tracks on Spotify.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Search query." },
              limit: { type: "NUMBER", description: "Max results (default: 10)." }
            },
            required: ["query"]
          }
        },
        {
          name: "spotify_add_tracks_to_playlist",
          description: "Adds tracks to a playlist.",
          parameters: {
            type: "OBJECT",
            properties: {
              playlistId: { type: "STRING", description: "Playlist ID." },
              trackUris: {
                type: "ARRAY",
                description: "Array of Spotify track URIs to add.",
                items: { type: "STRING" }
              }
            },
            required: ["playlistId", "trackUris"]
          }
        },
        {
          name: "spotify_play_track",
          description: "Plays a track on the user's active device.",
          parameters: {
            type: "OBJECT",
            properties: {
              trackUri: { type: "STRING", description: "Spotify track URI." },
              deviceId: { type: "STRING", description: "Device ID to play on (optional)." }
            },
            required: ["trackUri"]
          }
        },
        {
          name: "internet_search",
          description: "Search the web for real-time information, API documentation, or technical guides.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "The search query (e.g., 'Supabase Auth documentation')." }
            },
            required: ["query"]
          }
        }
      ]
    }
  ]



  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    const geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 32768 },
      tools: geminiTools,
    })

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat and metadata to trigger UI thinking state and sync user message ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "", userMessageId })}\n\n`))

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

          const userParts: any[] = [{ text: userPrompt }]
          if (imageData?.data && imageData?.mimeType) {
            console.log(`[Gemini] Attaching vision context (main + ${imageData.sections?.length || 0} sections)`)
            // Add full page
            userParts.push({
              inlineData: { data: imageData.data, mimeType: imageData.mimeType },
            })
            // Add high-res sections
            if (Array.isArray(imageData.sections)) {
              for (const sectionBase64 of imageData.sections) {
                userParts.push({
                  inlineData: { data: sectionBase64, mimeType: imageData.mimeType },
                })
              }
            }
          }

          const contents = [...mapHistoryToGemini(truncateHistory(conversationHistory, 15)), { role: "user", parts: userParts }]

          // Immediate heartbeat and metadata to trigger UI thinking state and sync user message ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
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
            let toolCalls = []
            for await (const chunk of stream.stream) {
              const parts = chunk.candidates?.[0]?.content?.parts || []
              for (const part of parts) {
                if (part.text) {
                  // Hide Internal Action Tags from UI and fullResponse
                  if (part.text.includes("<Action>")) {
                    // We don't add this part to fullResponse or send to client
                    // But we keep it for executeActionTags at the end
                    fullResponseRaw += part.text;
                    continue;
                  }
                  fullResponseRaw += part.text;
                  fullResponse += part.text;
                  chunkCount++;

                  if (chunkCount % 50 === 0) {
                    db.update(messagesTable)
                      .set({ content: fullResponse })
                      .where(eq(messagesTable.id, assistantMsgId))
                      .then(() => console.log(`[Gemini] Partial progress saved for ${assistantMsgId}`))
                  }

                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: part.text })}\n\n`))
                }
                if (part.functionCall) {
                  toolCalls.push(part.functionCall)
                }
              }
              if (chunk.candidates?.[0]?.finishReason) {
                finishReason = chunk.candidates[0].finishReason
              }
            }

            // Handle Tool Calls
            if (toolCalls.length > 0) {
              console.log(`[Gemini] Executing ${toolCalls.length} tool calls...`)
              const toolParts = []
              const toolResponseParts = []

              for (const call of toolCalls) {
                const result = await dispatchMcpTool(call.name, call.args, userId, projectId, assistantMsgId)
                toolParts.push({ functionCall: call })
                toolResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: result
                  }
                })
              }

              contents.push({ role: "model", parts: toolParts as any[] } as any)
              contents.push({ role: "function", parts: toolResponseParts as any[] } as any)

              // Increment continuation but allow the loop to run again to produce text
              continuationCount++
              continue // Next iteration will call Gemini again with the tool results
            }

            if ((finishReason === "MAX_TOKENS" || finishReason === "SAFETY" || finishReason === "OTHER") && continuationCount < maxContinuations) {
              continuationCount++
              console.log(`[Gemini] Model truncated (reason: ${finishReason}). Continuing... (${continuationCount}/${maxContinuations})`)
              contents.push({ role: "model", parts: [{ text: fullResponse }] })
              contents.push({ role: "user", parts: [{ text: continueMessage }] })
            } else {
              break
            }
          } while (true)

          // Final check for action tags
          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId);
          }

          console.log(`[Gemini] Response length: ${fullResponse.length}`)

          // Estimate or get tokens (Gemini Flash usage is usually low cost, but we use a flat rate)
          const estimateTokens = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const tokensUsed = estimateTokens
          const cost = Math.max(5, Math.ceil(tokensUsed / 500)) // 5 cents minimum or 1 cent per 500 tokens

          // Extra deduction if cost > 5 (5 already deducted by UI)
          if (cost > 5) {
            const [userCredit] = await db.select().from(userCredits).where(eq(userCredits.userId, userId))
            if (userCredit) {
              await db.update(userCredits)
                .set({ balance: (userCredit.balance || 0) - (cost - 5) })
                .where(eq(userCredits.userId, userId))
            }
          }

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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
            )
          }
        } catch (error) {
          console.error("[Gemini] Stream error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "We encountered a temporary connection issue while generating your site. Please try again in a moment." })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Gemini] Handler error:", e)
    return createErrorStream("An unexpected error occurred in our AI cluster. Our engineers have been notified.")
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
  imageData: any,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  isCodeRequest: boolean,
  selectedModel: string,
  messageType: "greeting" | "question" | "build",
  systemPrompt: string,
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId: string | undefined,
  sessionId = "main",
  baseAppUrl?: string,
  cloneData?: any,
) {
  const openRouterKey = process.env.OPENROUTER_API_KEY

  if (!openRouterKey) {
    throw new Error("OpenRouter configuration missing")
  }

  const modelId = OPENROUTER_MODELS[selectedModel as keyof typeof OPENROUTER_MODELS]
  if (!modelId) {
    throw new Error("OpenRouter model invalid")
  }

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    let userPrompt = message
    if (messageType === "greeting") {
      userPrompt = `${message}\n\nRespond naturally and briefly like a friendly human. No thinking tags, no code, just a warm greeting back.`
    } else if (messageType === "question") {
      userPrompt = `${message}\n\nThink through this question step by step inside <Thinking> tags. Search for current information if needed inside <Search> tags. Then provide a clear, detailed answer in plain text. No code generation.`
    } else if (isCodeRequest) {
      console.log(`[OpenRouter/${modelId}] Using for code generation with dynamic flow`)
      userPrompt = buildCodePrompt(message)
    }

    const userMessageContent: any[] = [{ type: "text", text: userPrompt }]
    if (imageData?.data) {
      console.log(`[OpenRouter] Attaching vision context (main + ${imageData.sections?.length || 0} sections)`)
      // Add main full-page
      userMessageContent.push({
        type: "image_url",
        image_url: { url: `data:${imageData.mimeType || "image/jpeg"};base64,${imageData.data}` },
      })
      // Add high-res sections
      if (Array.isArray(imageData.sections)) {
        for (const sectionBase64 of imageData.sections) {
          userMessageContent.push({
            type: "image_url",
            image_url: { url: `data:${imageData.mimeType || "image/jpeg"};base64,${sectionBase64}` },
          })
        }
      }
    }

    const chatMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...truncateHistory(conversationHistory, 15),
      { role: "user", content: Array.isArray(userMessageContent) && userMessageContent.length === 1 && userMessageContent[0].type === "text" ? userMessageContent[0].text : userMessageContent },
    ]

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat and metadata to trigger UI thinking state and sync user message ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          const initialResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": baseAppUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
              "X-Title": "AI Website Builder",
            },
            body: JSON.stringify({
              model: modelId,
              messages: chatMessages,
              stream: true,
              ...(modelId.includes("gpt-5") || modelId.includes("-o1")
                ? { max_completion_tokens: 32768 }
                : { max_tokens: 8192 }),
            }),
          })

          if (!initialResponse.ok) {
            const errorText = await initialResponse.text()
            throw new Error(`OpenRouter API error: ${initialResponse.status} ${errorText}`)
          }

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id
          let continuationCount = 0
          let chunkCount = 0
          const maxContinuations = 30
          const continueMessage = "You reached the token limit. Please CONTINUE generating the code EXACTLY from where you stopped. DO NOT repeat anything previous. Focus on completing the full professional full-stack task as requested. Stay detailed."

          let currentResponse = initialResponse

          do {
            if (continuationCount > 0) {
              currentResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${openRouterKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": baseAppUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                  "X-Title": "AI Website Builder",
                },
                body: JSON.stringify({
                  model: modelId,
                  messages: chatMessages,
                  stream: true,
                  ...(modelId.includes("gpt-5") || modelId.includes("-o1")
                    ? { max_completion_tokens: 32768 }
                    : { max_tokens: 8192 }),
                }),
              })

              if (!currentResponse.ok) {
                const errorText = await currentResponse.text()
                throw new Error(`OpenRouter API error: ${currentResponse.status} ${errorText}`)
              }
            }

            const reader = currentResponse.body?.getReader()
            if (!reader) {
              throw new Error("No response body reader")
            }

            const decoder = new TextDecoder()
            let buffer = ""
            let finishReason = null

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
                      // Hide Action Tags
                      if (content.includes("<Action>")) {
                        fullResponseRaw += content;
                        continue;
                      }

                      fullResponseRaw += content;
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

                        const lastLine = lines[lines.length - 1]
                        const completeLines = lines.slice(0, -1)

                        for (const line of completeLines) {
                          if (line.match(/^```\w*\s*file=/)) {
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

                        if (lastLine.match(/^```\w*\s*file=/)) {
                          inCodeBlock = true
                          accumulatedBuffer = ""
                        } else {
                          accumulatedBuffer = lastLine
                        }

                        if (textToSend.trim()) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                        }
                      } else {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                      }
                    }

                    if (parsed.choices?.[0]?.finish_reason) {
                      finishReason = parsed.choices[0].finish_reason
                    }
                  } catch (e) {
                    console.error("[OpenRouter] Parse error:", e)
                  }
                }
              }
            }

            if ((finishReason === "length" || finishReason === "max_tokens" || finishReason === "content_filter") && continuationCount < maxContinuations) {
              continuationCount++
              console.log(`[OpenRouter] Truncated (reason: ${finishReason}). Continuing... (${continuationCount}/${maxContinuations})`)
              chatMessages.push({ role: "assistant", content: fullResponse })
              chatMessages.push({ role: "user", content: continueMessage })
            } else {
              break
            }
          } while (true)


          // Final check for action tags
          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId);
          }

          console.log(`[OpenRouter/${modelId}] Response length: ${fullResponse.length}`)

          // Estimate tokens for OpenRouter models
          const tokensUsed = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const cost = Math.max(5, Math.ceil(tokensUsed / 500))

          // Extra deduction if cost > 5
          if (cost > 5) {
            const [userCredit] = await db.select().from(userCredits).where(eq(userCredits.userId, userId))
            if (userCredit) {
              await db.update(userCredits)
                .set({ balance: (userCredit.balance || 0) - (cost - 5) })
                .where(eq(userCredits.userId, userId))
            }
          }

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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
            )
          }
        } catch (error: any) {
          console.error(`[OpenRouter/${modelId}] Stream error:`, error)
          const errorMessage = error?.message?.includes("404") || error?.message?.includes("model_not_found")
            ? `The selected model (${modelId}) was not found on OpenRouter. Please try a different model.`
            : "The AI service is experiencing high latency. Your progress has been saved; please refresh and continue.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[OpenRouter] Handler error:", e)
    // Throw error to trigger the resilience fallback chain in the parent caller
    throw e
  }
}


async function handleOllamaRequest(
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
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId?: string,
  sessionId = "main",
  cloneData?: any,
) {
  const ollamaModelId = OLLAMA_MODELS[selectedModel]
  if (!ollamaModelId) {
    throw new Error("Ollama model invalid")
  }

  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"

  try {
    // ──────────────────────────────────────────────────
    // Extract existing file list from conversation history
    // so the model knows what files already exist in the project
    // ──────────────────────────────────────────────────
    const existingFiles: string[] = []
    for (const msg of history) {
      if (msg.role === "assistant" && msg.content) {
        const fileMatches = msg.content.match(/```\w+\s+file="([^"]+)"/g)
        if (fileMatches) {
          for (const match of fileMatches) {
            const pathMatch = match.match(/file="([^"]+)"/)
            if (pathMatch?.[1] && !existingFiles.includes(pathMatch[1])) {
              existingFiles.push(pathMatch[1])
            }
          }
        }
      }
    }
    const hasExistingProject = existingFiles.length > 0

    // For Ollama: if there's an existing project, ALWAYS treat as code request
    // because "add me an about page" should generate code, not just describe it
    const ollamaForceCode = hasExistingProject || isCodeRequest

    // ──────────────────────────────────────────────────
    // OPTIMIZATION 1: Focused System Prompt for Local Models
    // Includes iteration support so follow-up requests generate actual code
    // ──────────────────────────────────────────────────
    const iterationContext = hasExistingProject
      ? `\n\n## EXISTING PROJECT FILES:\n${existingFiles.map(f => `- ${f}`).join("\n")}\n\n## ITERATION RULES (FOLLOW-UP REQUESTS):\nThe user already has a project with the files listed above. When they ask to add, change, fix, or modify something:\n1. Output ONLY the files that need to be created or modified — do NOT regenerate unchanged files.\n2. When modifying a file, output the COMPLETE updated file content (not a diff or partial update).\n3. If adding a new page/component, ALSO update App.tsx to add the route/import for it.\n4. ALWAYS output the actual code files using the \`\`\`language file="path"\`\`\` format.\n5. Never just describe what you would change — WRITE THE ACTUAL CODE.`
      : ""

    const ollamaSystemPrompt = discussMode
      ? `You are a helpful AI assistant. Be concise and helpful.`
      : `You are a full-stack web developer. Output code files using: \`\`\`language file="path"\n[code]\n\`\`\`

RULES:
- Write FULL, COMPLETE files. No placeholders like "// rest of code".
- Use Vite + React + TypeScript + Tailwind CSS.
- Start with brief <Thinking>, <Planning>, then write code files IMMEDIATELY.
- Use <Tasks> for progress. Use <VersionName>Name</VersionName>.
- Generate as many files as possible. System auto-continues for remaining files.
- For new projects include: index.html, package.json, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js, src/main.tsx, src/App.tsx, src/index.css, and all pages/components.
- NEVER describe code without writing it. Write code NOW.${iterationContext}`

    // ──────────────────────────────────────────────────
    // OPTIMIZATION 2: Minimal History (save context for output tokens)
    // With num_ctx: 4096, we need to keep input lean so model has
    // max space for generating code. File list from history provides project context.
    // ──────────────────────────────────────────────────
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content.length > 1500 ? msg.content.substring(0, 1500) + "\n...[truncated]" : msg.content,
    }))
    const trimmedHistory = truncateHistory(conversationHistory, 2)

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    // ──────────────────────────────────────────────────
    // OPTIMIZATION 5: Strip Injected Context from Message
    // ──────────────────────────────────────────────────
    const contextMarkers = [
      "\n\n## Supabase Credentials",
      "\n\n## Neon Database",
      "\n\n## Project Secrets",
      "\n\n## Connected MCP Context",
      "\n\n## Available User Account Integrations",
      "\n\n## Current Project Files",
      "\n\n## GitHub Integration Context",
      "\n\n## SECURITY PROJECT CONTEXT",
    ]
    let cleanMessage = message
    for (const marker of contextMarkers) {
      const idx = cleanMessage.indexOf(marker)
      if (idx !== -1) {
        cleanMessage = cleanMessage.substring(0, idx)
      }
    }
    if (cleanMessage.length > 3000) {
      cleanMessage = cleanMessage.substring(0, 3000) + "\n...[message trimmed for local model]"
    }
    console.log(`[Ollama/${ollamaModelId}] Message cleaned: ${message.length} → ${cleanMessage.length} chars | Existing files: ${existingFiles.length} | Force code: ${ollamaForceCode}`)

    let userPrompt = cleanMessage

    if (messageType === "greeting" && !hasExistingProject) {
      userPrompt = `${cleanMessage}\n\nRespond naturally and briefly.`
    } else if (messageType === "question" && !hasExistingProject) {
      userPrompt = `${cleanMessage}\n\nProvide a clear, concise answer.`
    } else if (ollamaForceCode) {
      console.log(`[Ollama/${ollamaModelId}] Code generation mode (existing files: ${existingFiles.length})`)
      userPrompt = `${cleanMessage}

${hasExistingProject ? `Existing project. Output ONLY new/changed files. Update App.tsx for new routes.` : `New project. Generate all files.`}
Keep <Thinking> and <Planning> to 1-2 lines. Write code files IMMEDIATELY. System auto-continues for remaining files.`
    }

    const chatMessages = [
      { role: "system" as const, content: ollamaSystemPrompt },
      ...trimmedHistory,
      { role: "user" as const, content: userPrompt },
    ]

    // --- PRE-FLIGHT CONNECTIVITY CHECK ---
    // If we can't reach Ollama, we throw here so the resilience chain can fallback to cloud models
    try {
      const pingRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { 
        headers: { "ngrok-skip-browser-warning": "true" },
        signal: AbortSignal.timeout(1500) 
      }).catch(() => null)
      if (!pingRes || !pingRes.ok) {
        console.warn(`[Ollama/${ollamaModelId}] Connectivity check failed. Triggering fallback chain...`)
        throw new Error("Ollama unreachable")
      }
    } catch (e) {
      throw new Error("Local Ollama model is not responding. If you are on the live domain, the system will now automatically attempt to fallback to a cloud model.")
    }

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat to trigger UI thinking state (non-blocking)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          // Create initial assistant message entry for persistence (fire in parallel with model request)
          const dbInsertPromise = db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
          }).returning({ id: messagesTable.id })

          // ──────────────────────────────────────────────────
          // OPTIMIZATION 3: Use Ollama native /api/chat endpoint
          // num_predict: -1 = unlimited output tokens (never stop mid-generation)
          // num_ctx: 4096 = small context to keep max model layers in GPU (12GB VRAM limit)
          // ──────────────────────────────────────────────────
          const ollamaRequestPromise = fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({
              model: ollamaModelId,
              messages: chatMessages,
              stream: true,
              keep_alive: "30m",
              think: false,
              options: {
                num_ctx: 4096,
                num_predict: -1,
              },
            }),
          })

          // Wait for both in parallel
          const [dbResult, response] = await Promise.all([dbInsertPromise, ollamaRequestPromise])

          const assistantMsgId = dbResult[0].id

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Ollama API error: ${response.status} ${errorText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error("No response body reader")
          }

          // ──────────────────────────────────────────────────
          // OPTIMIZATION 4: Watchdog Timer
          // If no tokens arrive in 10s (model loading VRAM), send "warming up" message
          // ──────────────────────────────────────────────────
          let firstTokenReceived = false
          const watchdogTimer = setTimeout(() => {
            if (!firstTokenReceived) {
              console.log(`[Ollama/${ollamaModelId}] Watchdog: No tokens in 10s — model likely loading into VRAM`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "⏳ Loading model into memory..." })}\n\n`))
            }
          }, 10000)

          const decoder = new TextDecoder()
          let buffer = ""
          let chunkCount = 0
          let continuationCount = 0
          const maxContinuations = 15

          const continueMessage = "Continue generating from where you stopped. Do NOT repeat previous code."

          do {
            // Ollama native /api/chat streams NDJSON (one JSON per line, no "data: " prefix)
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (!line.trim()) continue

                try {
                  const parsed = JSON.parse(line)
                  const content = parsed.message?.content

                  if (content) {
                    if (!firstTokenReceived) {
                      firstTokenReceived = true
                      clearTimeout(watchdogTimer)
                      console.log(`[Ollama/${ollamaModelId}] First token received`)
                    }

                    // Action Tag handling
                    if (content.includes("<Action>")) {
                      fullResponseRaw += content
                      continue
                    }
                    fullResponseRaw += content
                    fullResponse += content
                    chunkCount++

                    // Periodically persist progress
                    if (chunkCount % 80 === 0) {
                      db.update(messagesTable)
                        .set({ content: fullResponse })
                        .where(eq(messagesTable.id, assistantMsgId))
                        .catch(() => {}) // fire-and-forget
                    }

                    if (ollamaForceCode) {
                      accumulatedBuffer += content
                      const bufLines = accumulatedBuffer.split("\n")
                      let textToSend = ""

                      const lastLine = bufLines[bufLines.length - 1]
                      const completeLines = bufLines.slice(0, -1)

                      for (const bLine of completeLines) {
                        // More robust regex to catch varied code block formats from local models
                        if (bLine.match(/^```\w*\s*file=/)) {
                          inCodeBlock = true
                          continue
                        }
                        if (bLine.trim() === "```" && inCodeBlock) {
                          inCodeBlock = false
                          continue
                        }
                        if (!inCodeBlock) {
                          textToSend += bLine + "\n"
                        }
                      }

                      if (lastLine.match(/^```\w*\s*file=/)) {
                        inCodeBlock = true
                        accumulatedBuffer = ""
                      } else {
                        accumulatedBuffer = lastLine
                      }

                      if (textToSend.trim()) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                      }
                    } else {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                    }
                  }

                  // Check if response is done
                  if (parsed.done === true) {
                    break
                  }
                } catch (e) {
                  // Skip malformed lines
                }
              }
            }

            // ──────────────────────────────────────────────────
            // SMART AUTO-CONTINUATION
            // Detect missing files from the plan and auto-continue
            // ──────────────────────────────────────────────────
            if (fullResponse.length > 0 && continuationCount < maxContinuations) {
              // Extract planned files from <Planning> tags
              const planningMatch = fullResponse.match(/<Planning>([\s\S]*?)<\/Planning>/i)
              let plannedFiles: string[] = []
              if (planningMatch) {
                const planText = planningMatch[1]
                // Match file paths like src/App.tsx, package.json, etc.
                const pathMatches = planText.match(/(?:src\/|public\/)?[\w\-./]+\.\w+/g)
                if (pathMatches) {
                  plannedFiles = [...new Set(pathMatches.filter(p => p.includes('.') && !p.startsWith('//')))]
                }
              }

              // Extract actually generated files
              const generatedFiles: string[] = []
              const fileBlockMatches = fullResponse.match(/```\w+\s+file="([^"]+)"/g)
              if (fileBlockMatches) {
                for (const match of fileBlockMatches) {
                  const pathMatch = match.match(/file="([^"]+)"/)
                  if (pathMatch?.[1]) generatedFiles.push(pathMatch[1])
                }
              }

              // Check for unclosed code blocks
              const openBlocks = (fullResponse.match(/```\w+\s+file="/g) || []).length
              const closeBlocks = (fullResponse.match(/^```$/gm) || []).length
              const hasUnclosedBlock = openBlocks > closeBlocks

              // Find missing files
              const missingFiles = plannedFiles.filter(f => 
                !generatedFiles.some(g => g.endsWith(f) || f.endsWith(g) || g.includes(f) || f.includes(g))
              )

              const shouldContinue = hasUnclosedBlock || missingFiles.length > 0

              if (shouldContinue) {
                continuationCount++
                const missingList = missingFiles.length > 0 
                  ? `\n\nYou still need to generate these files:\n${missingFiles.map(f => `- ${f}`).join("\n")}`
                  : ""
                
                console.log(`[Ollama] Auto-continuing (${continuationCount}/${maxContinuations}): ${missingFiles.length} files missing, unclosed block: ${hasUnclosedBlock}`)
                console.log(`[Ollama] Generated: ${generatedFiles.join(", ")}`)
                console.log(`[Ollama] Missing: ${missingFiles.join(", ")}`)

                // Build continuation messages — only include the tail of the response for context
                const contMessages = [
                  { role: "system" as const, content: ollamaSystemPrompt },
                  { role: "assistant" as const, content: fullResponse.slice(-1500) },
                  { role: "user" as const, content: `Continue generating the remaining code files. Do NOT repeat files you already created (${generatedFiles.join(", ")}).${missingList}\n\nOutput each file using \`\`\`language file="path"\`\`\` format. Write COMPLETE file contents. Start writing code NOW.` },
                ]

                // Fire continuation request
                const contResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                  },
                  body: JSON.stringify({
                    model: ollamaModelId,
                    messages: contMessages,
                    stream: true,
                    keep_alive: "30m",
                    think: false,
                    options: { num_ctx: 4096, num_predict: -1 },
                  }),
                })

                if (contResponse.ok && contResponse.body) {
                  // Read the continuation stream
                  const contReader = contResponse.body.getReader()
                  let contBuffer = ""

                  while (true) {
                    const { done: contDone, value: contValue } = await contReader.read()
                    if (contDone) break

                    contBuffer += decoder.decode(contValue, { stream: true })
                    const contLines = contBuffer.split("\n")
                    contBuffer = contLines.pop() || ""

                    for (const contLine of contLines) {
                      if (!contLine.trim()) continue
                      try {
                        const contParsed = JSON.parse(contLine)
                        const contContent = contParsed.message?.content
                        if (contContent) {
                          if (contContent.includes("<Action>")) {
                            fullResponseRaw += contContent
                            continue
                          }
                          fullResponseRaw += contContent
                          fullResponse += contContent
                          chunkCount++

                          if (chunkCount % 80 === 0) {
                            db.update(messagesTable)
                              .set({ content: fullResponse })
                              .where(eq(messagesTable.id, assistantMsgId))
                              .catch(() => {})
                          }

                          if (ollamaForceCode) {
                            accumulatedBuffer += contContent
                            const bufLines2 = accumulatedBuffer.split("\n")
                            let textToSend2 = ""
                            const lastLine2 = bufLines2[bufLines2.length - 1]
                            const completeLines2 = bufLines2.slice(0, -1)

                            for (const bLine2 of completeLines2) {
                              if (bLine2.match(/^```\w+\s+file="/)) { inCodeBlock = true; continue }
                              if (bLine2.trim() === "```" && inCodeBlock) { inCodeBlock = false; continue }
                              if (!inCodeBlock) textToSend2 += bLine2 + "\n"
                            }

                            if (lastLine2.match(/^```\w+\s+file="/)) {
                              inCodeBlock = true; accumulatedBuffer = ""
                            } else {
                              accumulatedBuffer = lastLine2
                            }

                            if (textToSend2.trim()) {
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend2 })}\n\n`))
                            }
                          } else {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: contContent })}\n\n`))
                          }
                        }
                        if (contParsed.done === true) break
                      } catch (e) { /* skip */ }
                    }
                  }

                  // Check again if we need another continuation
                  continue
                }
              }
            }
            break
          } while (true)

          clearTimeout(watchdogTimer)

          // Final check for action tags
          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId)
          }

          console.log(`[Ollama/${ollamaModelId}] Response complete: ${fullResponse.length} chars`)

          // No credit deduction for local Ollama models
          const tokensUsed = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const cost = 0

          if (ollamaForceCode) {
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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
            )
          }
        } catch (error: any) {
          console.error(`[Ollama/${ollamaModelId}] Stream error:`, error)
          const isDomain = typeof window !== 'undefined' ? !window.location.hostname.includes('localhost') : true;
          const errorMessage = isDomain 
            ? "Ollama (Local AI) is unreachable from the Falbor domain. The system attempted to connect but failed. For local AI support, please run the app on your local machine or use a secure tunnel with OLLAMA_ORIGINS set."
            : "Local Ollama model is not responding. Make sure Ollama is running on your machine (ollama serve).";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Ollama] Handler error:", e)
    return createErrorStream("Failed to connect to local Ollama server. Make sure Ollama is running (ollama serve) and the model is pulled.")
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
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId?: string,
  sessionId = "main",
  cloneData?: any,
) {
  const zaiKey = process.env.ZAI_API_KEY

  if (!zaiKey) {
    throw new Error("Z.ai configuration missing")
  }

  const modelId = ZAI_MODELS[selectedModel as keyof typeof ZAI_MODELS]
  if (!modelId) {
    throw new Error("Z.ai model invalid")
  }

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
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
      ...truncateHistory(conversationHistory, 15),
      { role: "user", content: userPrompt },
    ]

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate heartbeat and metadata to trigger UI thinking state and sync user message ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          // Create initial assistant message entry for persistence
          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id
          let continuationCount = 0
          let chunkCount = 0
          const maxContinuations = 30
          const continueMessage = "You reached the token limit. Please CONTINUE generating the code EXACTLY from where you stopped. DO NOT repeat anything previous. Focus on completing the full professional full-stack task as requested. Stay detailed."

          do {
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
            let finishReason = null

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
                      // Action Tag handling
                      if (content.includes("<Action>")) {
                        fullResponseRaw += content;
                        continue;
                      }
                      fullResponseRaw += content;
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

                        const lastLine = lines[lines.length - 1]
                        const completeLines = lines.slice(0, -1)

                        for (const line of completeLines) {
                          if (line.match(/^```\w*\s*file=/)) {
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

                        if (lastLine.match(/^```\w*\s*file=/)) {
                          inCodeBlock = true
                          accumulatedBuffer = ""
                        } else {
                          accumulatedBuffer = lastLine
                        }

                        if (textToSend.trim()) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                        }
                      } else {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                      }
                    }

                    if (parsed.choices?.[0]?.finish_reason) {
                      finishReason = parsed.choices[0].finish_reason
                    }
                  } catch (e) {
                    console.error("[Z.ai] Parse error:", e)
                  }
                }
              }
            }

            if ((finishReason === "length" || finishReason === "max_tokens" || finishReason === "content_filter") && continuationCount < maxContinuations) {
              continuationCount++
              console.log(`[Z.ai] Truncated (reason: ${finishReason}). Continuing... (${continuationCount}/${maxContinuations})`)
              chatMessages.push({ role: "assistant", content: fullResponse })
              chatMessages.push({ role: "user", content: continueMessage })
            } else {
              break
            }
          } while (true)


          // Final check for action tags
          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId);
          }

          console.log(`[Z.ai/${modelId}] Response length: ${fullResponse.length}`)

          // Estimate tokens for Z.ai models
          const tokensUsed = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const cost = Math.max(5, Math.ceil(tokensUsed / 500))

          // Extra deduction if cost > 5
          if (cost > 5) {
            const [userCredit] = await db.select().from(userCredits).where(eq(userCredits.userId, userId))
            if (userCredit) {
              await db.update(userCredits)
                .set({ balance: (userCredit.balance || 0) - (cost - 5) })
                .where(eq(userCredits.userId, userId))
            }
          }

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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
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
              tokensUsed,
              cost,
              userMessageId,
              sessionId,
              userId
            )
          }
        } catch (error) {
          console.error(`[Z.ai/${modelId}] Stream error:`, error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "The AI node is currently congested. Your progress has been saved; please refresh or send a quick message to continue." })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Z.ai] Handler error:", e)
    return createErrorStream("The Z-Series AI nodes are currently busy. Falling back to primary cluster...")
  }
}

async function handleOpenAIRequest(
  history: any[],
  message: string,
  imageData: any,
  projectId: string,
  userId: string,
  discussMode: boolean,
  isAutomated: boolean,
  isCodeRequest: boolean,
  selectedModel: string,
  messageType: "greeting" | "question" | "build",
  systemPrompt: string,
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId: string | undefined,
  sessionId = "main",
  cloneData?: any,
) {
  const openAIKey = process.env.OPENAI_API_KEY

  if (!openAIKey) {
    throw new Error("OpenAI configuration missing")
  }

  const rawModelId = OPENAI_MODELS[selectedModel as keyof typeof OPENAI_MODELS] || selectedModel
  const modelId = rawModelId.replace("openai/", "").replace("openrouter/", "")

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    let userPrompt = message
    if (messageType === "greeting") {
      userPrompt = `${message}\n\nRespond naturally and briefly like a friendly human. No thinking tags, no code, just a warm greeting back.`
    } else if (messageType === "question") {
      userPrompt = `${message}\n\nThink through this question step by step inside <Thinking> tags. Search for current information if needed inside <Search> tags. Then provide a clear, detailed answer in plain text. No code generation.`
    } else if (isCodeRequest) {
      console.log(`[OpenAI/${modelId}] Using direct platform for code generation`)
      userPrompt = buildCodePrompt(message)
    }

    const userContent: any[] = [{ type: "text", text: userPrompt }]
    if (imageData?.data && imageData?.mimeType) {
      console.log(`[OpenAI/${modelId}] Attaching vision context (main + ${imageData.sections?.length || 0} sections)`)
      // Main full page
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` },
      })
      // High-res sections
      if (Array.isArray(imageData.sections)) {
        for (const sectionBase64 of imageData.sections) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${imageData.mimeType};base64,${sectionBase64}` },
          })
        }
      }
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...truncateHistory(conversationHistory, 10),
      { role: "user", content: userContent as any },
    ]

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    return new ReadableStream({
      async start(controller) {
        try {
          // Immediate Activity Signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          const initialResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAIKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelId,
              messages: chatMessages,
              stream: true,
              ...(modelId.startsWith("gpt-5") || modelId.startsWith("o1")
                ? { max_completion_tokens: 32768 }
                : { max_tokens: 32768 }),
            }),
          })

          if (!initialResponse.ok) {
            const errorText = await initialResponse.text()
            throw new Error(`OpenAI API error: ${initialResponse.status} ${errorText}`)
          }

          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id
          let continuationCount = 0
          let chunkCount = 0
          const maxContinuations = 50
          const continueMessage = "You reached the token limit. Please CONTINUE generating the code EXACTLY from where you stopped. DO NOT repeat anything previous. Focus on completing the full professional full-stack task as requested. Stay detailed."

          let currentResponse = initialResponse

          do {
            if (continuationCount > 0) {
              currentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${openAIKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: modelId,
                  messages: chatMessages,
                  stream: true,
                  ...(modelId.startsWith("gpt-5") || modelId.startsWith("o1")
                    ? { max_completion_tokens: 32768 }
                    : { max_tokens: 32768 }),
                }),
              })

              if (!currentResponse.ok) {
                const errorText = await currentResponse.text()
                throw new Error(`OpenAI API error: ${currentResponse.status} ${errorText}`)
              }
            }

            const reader = currentResponse.body?.getReader()
            if (!reader) throw new Error("No OpenAI response reader")

            const decoder = new TextDecoder()
            let buffer = ""
            let finishReason = null

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
                      if (content.includes("<Action>")) {
                        fullResponseRaw += content;
                        continue;
                      }
                      fullResponseRaw += content;
                      fullResponse += content
                      chunkCount++

                      if (chunkCount % 50 === 0) {
                        await db.update(messagesTable)
                          .set({ content: fullResponse })
                          .where(eq(messagesTable.id, assistantMsgId))
                      }

                      if (isCodeRequest && messageType === "build") {
                        accumulatedBuffer += content
                        const sublines = accumulatedBuffer.split("\n")
                        let textToSend = ""
                        const lastLine = sublines[sublines.length - 1]
                        const completeLines = sublines.slice(0, -1)

                        for (const sl of completeLines) {
                          if (sl.match(/^```\w*\s*file=/)) { inCodeBlock = true; continue; }
                          if (sl.trim() === "```" && inCodeBlock) { inCodeBlock = false; continue; }
                          if (!inCodeBlock) textToSend += sl + "\n"
                        }

                        if (lastLine.match(/^```\w*\s*file=/)) { inCodeBlock = true; accumulatedBuffer = ""; }
                        else accumulatedBuffer = lastLine;

                        if (textToSend.trim()) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                        }
                      } else {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                      }
                    }

                    if (parsed.choices?.[0]?.finish_reason) {
                      finishReason = parsed.choices[0].finish_reason
                    }
                  } catch (e) { }
                }
              }
            }

            if ((finishReason === "length" || finishReason === "max_tokens" || finishReason === "content_filter") && continuationCount < maxContinuations) {
              continuationCount++
              console.log(`[OpenAI] Truncated (reason: ${finishReason}). Continuing... (${continuationCount}/${maxContinuations})`)
              chatMessages.push({ role: "assistant", content: fullResponse })
              chatMessages.push({ role: "user", content: continueMessage })
            } else {
              break
            }
          } while (true)

          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId);
          }

          const tokensUsed = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const cost = Math.max(10, Math.ceil(tokensUsed / 400))

          if (messageType === "build" && isCodeRequest) {
            await saveAssistantMessageWithParallelGeneration(
              projectId, fullResponse, [], controller, encoder, assistantMsgId, [], false,
              discussMode, isAutomated, tokensUsed, cost, userMessageId, sessionId, userId
            )
          } else {
            await saveAssistantMessage(
              projectId, fullResponse, [], controller, encoder, assistantMsgId, [], false,
              discussMode, isAutomated, tokensUsed, cost, userMessageId, sessionId, userId
            )
          }
        } catch (error) {
          console.error("[OpenAI] Stream error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "OpenAI cluster is currently experiencing heavy load. Your data has been partially saved." })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[OpenAI] Handler error:", e)
    // Throw error to trigger the resilience fallback chain in the parent caller
    throw e
  }
}

async function handleMinimaxRequest(
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
  executeActionTags: ((content: string) => Promise<void>) | undefined,
  userMessageId?: string,
  sessionId = "main",
  cloneData?: any,
) {
  const minimaxKey = process.env.MINIMAX_API_KEY

  if (!minimaxKey) {
    throw new Error("Minimax configuration missing")
  }

  const modelId = MINIMAX_MODELS[selectedModel as keyof typeof MINIMAX_MODELS] || selectedModel

  try {
    const conversationHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }))

    const encoder = new TextEncoder()
    let fullResponse = ""
    let fullResponseRaw = ""
    let accumulatedBuffer = ""
    let inCodeBlock = false

    let userPrompt = message
    if (isCodeRequest) userPrompt = buildCodePrompt(message)

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...truncateHistory(conversationHistory, 8),
      { role: "user", content: userPrompt },
    ]

    return new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: cloneData ? { cloneData } : null })}\n\n`))

          const [assistantMsg] = await db.insert(messagesTable).values({
            projectId,
            sessionId,
            role: "assistant",
            content: "",
            isAutomated,
            metadata: cloneData ? { cloneData } : null,
          }).returning({ id: messagesTable.id })

          const assistantMsgId = assistantMsg.id
          let continuationCount = 0
          let chunkCount = 0
          const maxContinuations = 50
          const continueMessage = "You reached the token limit. Please CONTINUE generating the code EXACTLY from where you stopped. DO NOT repeat anything previous. Focus on completing the full professional full-stack task as requested. Stay detailed."

          do {
            const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${minimaxKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: modelId,
                messages: chatMessages,
                stream: true,
                max_tokens: 16384,
              }),
            })

            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`Minimax API error: ${response.status} ${errorText}`)
            }

            const reader = response.body?.getReader()
            if (!reader) throw new Error("No Minimax response reader")

            const decoder = new TextDecoder()
            let buffer = ""
            let finishReason = null

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
                      if (content.includes("<Action>")) {
                        fullResponseRaw += content;
                        continue;
                      }
                      fullResponseRaw += content;
                      fullResponse += content
                      chunkCount++

                      if (chunkCount % 50 === 0) {
                        await db.update(messagesTable)
                          .set({ content: fullResponse })
                          .where(eq(messagesTable.id, assistantMsgId))
                      }

                      if (isCodeRequest && messageType === "build") {
                        accumulatedBuffer += content
                        const sublines = accumulatedBuffer.split("\n")
                        let textToSend = ""
                        const lastLine = sublines[sublines.length - 1]
                        const completeLines = sublines.slice(0, -1)

                        for (const sl of completeLines) {
                          if (sl.match(/^```\w*\s*file=/)) { inCodeBlock = true; continue; }
                          if (sl.trim() === "```" && inCodeBlock) { inCodeBlock = false; continue; }
                          if (!inCodeBlock) textToSend += sl + "\n"
                        }

                        if (lastLine.match(/^```\w*\s*file=/)) { inCodeBlock = true; accumulatedBuffer = ""; }
                        else accumulatedBuffer = lastLine;

                        if (textToSend.trim()) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToSend })}\n\n`))
                        }
                      } else {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                      }
                    }

                    if (parsed.choices?.[0]?.finish_reason) {
                      finishReason = parsed.choices[0].finish_reason
                    }
                  } catch (e) { }
                }
              }
            }

            if ((finishReason === "length" || finishReason === "max_tokens" || finishReason === "content_filter") && continuationCount < maxContinuations) {
              continuationCount++
              console.log(`[Minimax] Truncated (reason: ${finishReason}). Continuing... (${continuationCount}/${maxContinuations})`)
              chatMessages.push({ role: "assistant", content: fullResponse })
              chatMessages.push({ role: "user", content: continueMessage })
            } else {
              break
            }
          } while (true)

          if (executeActionTags) {
            await (executeActionTags as any)(fullResponseRaw, userId, projectId, assistantMsgId);
          }

          const tokensUsed = Math.ceil((userPrompt.length + fullResponse.length) / 4)
          const cost = Math.max(8, Math.ceil(tokensUsed / 450))

          if (messageType === "build" && isCodeRequest) {
            await saveAssistantMessageWithParallelGeneration(
              projectId, fullResponse, [], controller, encoder, assistantMsgId, [], false,
              discussMode, isAutomated, tokensUsed, cost, userMessageId, sessionId, userId
            )
          } else {
            await saveAssistantMessage(
              projectId, fullResponse, [], controller, encoder, assistantMsgId, [], false,
              discussMode, isAutomated, tokensUsed, cost, userMessageId, sessionId, userId
            )
          }
        } catch (error) {
          console.error("[Minimax] Stream error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Minimax service is currently busy. Please retry your request in a moment." })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, projectId })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })
  } catch (e) {
    console.error("[Minimax] Handler error:", e)
    return createErrorStream("We were unable to connect to the Minimax platform. Switching to optimized fallback...")
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
  tokensUsed: number | null = null,
  cost: number | null = null,
  userMessageId?: string,
  sessionId = "main",
  userId?: string,
) {
  try {
    console.log("[Save] Extracting code blocks from response...")
    const codeBlocks = discussMode ? [] : extractCodeBlocks(fullResponse)
    console.log(`[Save] Found ${codeBlocks.length} code blocks`)

    const cleanContent = fullResponse.trim()
    const hasArtifact = codeBlocks.length > 0 && !discussMode

    let newMessage: any
    if (existingMessageId) {
      console.log("[Save] Updating existing message:", existingMessageId)
      const versionNameMatch = fullResponse.match(/<VersionName>([\s\S]*?)<\/VersionName>/i)
      const versionName = versionNameMatch ? versionNameMatch[1].trim() : null

      const [updatedMessage] = await db
        .update(messagesTable)
        .set({
          content: cleanContent,
          hasArtifact,
          versionName,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          tokensUsed,
          cost,
        })
        .where(eq(messagesTable.id, existingMessageId))
        .returning()
      newMessage = updatedMessage
    } else {
      console.log("[Save] Inserting message into database...")
      const versionNameMatch = fullResponse.match(/<VersionName>([\s\S]*?)<\/VersionName>/i)
      const versionName = versionNameMatch ? versionNameMatch[1].trim() : null

      const [insertedMessage] = await db
        .insert(messagesTable)
        .values({
          projectId,
          sessionId,
          role: "assistant",
          content: cleanContent,
          hasArtifact,
          versionName,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          isAutomated,
          tokensUsed,
          cost,
        })
        .returning()
      newMessage = insertedMessage

      // Update project with active message ID for versioning
      if (hasArtifact) {
        await db.update(projects).set({ activeMessageId: newMessage.id }).where(eq(projects.id, projectId))
      }
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
      encoder.encode(`data: ${JSON.stringify({
        done: true,
        messageId: newMessage.id,
        userMessageId,
        content: cleanContent,
        hasArtifact,
        projectId,
        tokensUsed,
        cost,
        versionName: newMessage.versionName
      })}\n\n`),
    )
    // Broadcast to Pusher
    try {
      await pusherServer.trigger(`presence-project-${projectId}`, "server-chat-event", {
        type: 'MSG_AI_COMPLETE',
        finalMessage: newMessage,
        projectId,
        senderId: userId
      })
    } catch (err) {
      console.warn("[Pusher] Failed to broadcast message in saveAssistantMessage:", err)
    }
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
  tokensUsed: number | null = null,
  cost: number | null = null,
  userMessageId?: string,
  sessionId = "main",
  userId?: string,
) {
  try {
    console.log("[ParallelGen] Extracting code blocks from response...")
    const codeBlocks = discussMode ? [] : extractCodeBlocks(fullResponse)
    console.log(
      `[ParallelGen] Found ${codeBlocks.length} code blocks - splitting into ${codeBlocks.length} parallel workers`,
    )

    const cleanContent = discussMode ? fullResponse.trim() : fullResponse.trim()
    const hasArtifact = codeBlocks.length > 0 && !discussMode

    let newMessage: any
    const versionNameMatch = fullResponse.match(/<VersionName>([\s\S]*?)<\/VersionName>/i)
    const versionName = versionNameMatch ? versionNameMatch[1].trim() : null

    if (existingMessageId) {
      console.log("[ParallelGen] Updating existing message:", existingMessageId)
      const [updatedMessage] = await db
        .update(messagesTable)
        .set({
          content: cleanContent,
          hasArtifact,
          versionName,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          tokensUsed,
          cost,
        })
        .where(eq(messagesTable.id, existingMessageId))
        .returning()
      newMessage = updatedMessage
    } else {
      const [insertedMessage] = await db
        .insert(messagesTable)
        .values({
          projectId,
          sessionId,
          role: "assistant",
          content: cleanContent,
          hasArtifact,
          versionName,
          searchQueries: searchQueries.length > 0 ? searchQueries : null,
          isAutomated,
          tokensUsed,
          cost,
        })
        .returning()
      newMessage = insertedMessage
    }

    // Update project with active message ID for versioning
    if (hasArtifact) {
      await db.update(projects).set({ activeMessageId: newMessage.id }).where(eq(projects.id, projectId))
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
      encoder.encode(`data: ${JSON.stringify({
        done: true,
        messageId: newMessage.id,
        userMessageId,
        content: cleanContent,
        hasArtifact,
        projectId,
        tokensUsed,
        cost,
        versionName: newMessage.versionName
      })}\n\n`),
    )

    // Broadcast to Pusher
    try {
      await pusherServer.trigger(`presence-project-${projectId}`, "server-chat-event", {
        type: 'MSG_AI_COMPLETE',
        finalMessage: newMessage,
        projectId,
        senderId: userId
      })
    } catch (err) {
      console.warn("[Pusher] Failed to broadcast message in parallel gen:", err)
    }
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

function truncateHistory(history: any[], limit: number = 10) {
  if (history.length <= limit) return history;

  // Always keep the first message (initial request)
  const first = history[0];
  // Keep the last N messages
  const lastN = history.slice(-(limit - 1));

  // Clean up older assistant messages by removing massive code blocks to save context space
  const cleanedLastN = lastN.map((msg, idx) => {
    if (msg.role === "assistant" && idx < lastN.length - 1) {
      return { ...msg, content: removeCodeBlocks(msg.content) };
    }
    return msg;
  });

  return [first, ...cleanedLastN];
}

/**
 * Shared code-prompt builder — all models use the same detailed instructions.
 */
function buildCodePrompt(message: string): string {
  return `${message}

## 🔥 CRITICAL SYSTEM CONSTRAINTS (MANDATORY):
1. **STRICT EXPORT/IMPORT VERIFICATION**: Before writing an import statement (e.g., \`import { Navbar } from './components/Navbar'\`), you **MUST** verify that the target file (\`Navbar.tsx\`) contains a matching export (e.g., \`export const Navbar = ...\`). NEVER assume an export exists.
2. **COMPLETE FILE GENERATION**: You MUST write the FULL content of every file mentioned in your <Planning> block. Never use placeholders like "// ... rest of code" or skip files.
3. **PROJECT INTEGRITY**: If you create new components or pages, you MUST also update \`App.tsx\`, \`main.tsx\`, or your routing configuration to integrate them. No orphaned files.
4. **VITE COMPATIBILITY**: Always use \`import.meta.env\` instead of \`process.env\` for environment variables.
5. **DEPENDENCY ALIGNMENT**: Ensure all used libraries (e.g., \`framer-motion\`, \`lucide-react\`) are compatible with the project setup.

## 🛠️ STEP-BY-STEP WORKFLOW:
1. **<UserMessage>**: State your deep understanding of the full-stack request.
2. **<Thinking>**: Perform a multi-step "Dry Run" of the architecture. **CRITICAL**: Mentally map every export name in every file to its corresponding import in other files. Note potential import/export naming conflicts here (e.g., mismatch between default and named exports).
3. **<Search>**: If using a new library, verify the latest API syntax.
4. **<Planning>**: List EVERY file you will create or modify. This is your contract.
5. **<Tasks>**: Output the initial task list with ⏳.
6. **CODE GENERATION**: Interleave explanation with complete code blocks.
7. **<Tasks> UPDATE**: Output an updated list after EACH code block completion.
8. **<FileChecks>**: Perform a final virtual scan of all generated files. **VERIFY**:
   - Every file mentioned in \`App.tsx\` handles exists and has the correct export type.
   - All relative paths (e.g., \`../components/...\`) are accurate based on the project root.
   - No missing semi-colons or unfinished brackets in code blocks.
9. **<ReviewedWork>**: A professional summary of the complete solution.

Generate production-ready, technically flawless, and completely interconnected code now.`
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
  maxRetries: number = 5,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      // Detect 429 or 503 or specific overloaded messages
      const status = error.status || (error.response?.status)
      const isRetryable =
        status === 503 ||
        status === 429 ||
        (error.message && (
          error.message.includes("503") ||
          error.message.includes("429") ||
          error.message.includes("overloaded") ||
          error.message.includes("rate limit") ||
          error.message.includes("not keep up")
        ))

      if (!isRetryable || i === maxRetries - 1) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, i)
      console.warn(`[Resilience] Request failed (status: ${status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

async function runFalMax(
  request: Request,
  body: any,
  userId: string,
  credits: any,
  projectId: string,
  systemPrompt: string
) {
  const { message, history = [], userMessageId, isAutomated, sessionId = "main" } = body
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: " ", userMessageId, metadata: body?.cloneData ? { cloneData: body.cloneData } : null })}\n\n`))

        const [assistantMsg] = await db.insert(messagesTable).values({
          projectId,
          sessionId,
          role: "assistant",
          content: "",
          isAutomated,
          metadata: { model: "falmax", cloneData: body?.cloneData }
        }).returning({ id: messagesTable.id })

        const assistantMsgId = assistantMsg.id
        let totalTokens = 0
        let fullChatResponse = ""
        let builderCode = ""

        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        // --- STEP 1: ARCHITECT ---
        sendEvent({ type: "agent", agent: "ARCHITECT", status: "Planning structure..." })

        const architectResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://falbor.xyz",
            "X-Title": "Falbor",
          },
          body: JSON.stringify({
            model: "openai/gpt-5-preview",
            messages: [
              { role: "system", content: systemPrompt + "\n\n" + FALMAX_PROMPTS.ARCHITECT },
              { role: "user", content: message }
            ],
          }),
        })

        if (!architectResponse.ok) throw new Error("Architect failed")
        const architectData = await architectResponse.json()
        const planStr = architectData.choices[0].message.content
        totalTokens += architectData.usage?.total_tokens || 0

        let plan: any = { files: [] }
        try {
          plan = JSON.parse(planStr)
        } catch (e) {
          console.error("Architect plan parse error:", e)
        }

        sendEvent({ type: "agent", agent: "ARCHITECT", status: `Planned ${plan.files?.length || 0} files.` })

        // const builderStatus = { type: "agent", agent: "BUILDER", status: "Starting..." }
        // const reviewerStatus = { type: "agent", agent: "REVIEWER", status: "Waiting for files..." }
        // const narratorStatus = { type: "agent", agent: "NARRATOR", status: "Narrating..." }

        const runAgent = async (agent: "BUILDER" | "REVIEWER" | "NARRATOR", prompt: string, model: string, onUpdate: (text: string) => void) => {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://falbor.xyz",
              "X-Title": "Falbor",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: prompt },
                { role: "user", content: `Context: ${planStr}\nUser Request: ${message}` }
              ],
              stream: true,
            }),
          })

          if (!response.ok) return
          const reader = response.body?.getReader()
          if (!reader) return
          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim()
                if (dataStr === "[DONE]") continue
                try {
                  const parsed = JSON.parse(dataStr)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    onUpdate(content)
                  }
                } catch (e) { }
              }
            }
          }
        }

        const agents = [
          runAgent("BUILDER", FALMAX_PROMPTS.BUILDER + "\n\nCRITICAL: Ensure package.json is VALID JSON with no trailing commas and double-quoted keys.", "openai/gpt-5.4", (text) => {
            sendEvent({ type: "code", text })
            builderCode += text
            if (text.includes('{"type": "agent"')) {
              try {
                const match = text.match(/\{"type": "agent", "agent": "BUILDER", "status": "(.+?)"\}/)
                if (match) sendEvent({ type: "agent", agent: "BUILDER", status: match[1] })
              } catch (e) { }
            }
          }),
          runAgent("REVIEWER", FALMAX_PROMPTS.REVIEWER, "x-ai/grok-3", (text) => {
            if (text.includes('{"type": "agent"')) {
              try {
                const match = text.match(/\{"type": "agent", "agent": "REVIEWER", "status": "(.+?)"\}/)
                if (match) sendEvent({ type: "agent", agent: "REVIEWER", status: match[1] })
              } catch (e) { }
            }
          }),
          runAgent("NARRATOR", systemPrompt + "\n\n" + FALMAX_PROMPTS.NARRATOR, "google/gemini-3-flash-preview", (text) => {
            fullChatResponse += text
            sendEvent({ type: "chat", text })
          })
        ]

        await Promise.allSettled(agents)

        // Save final response (Narrator text + Builder code for workbench persistence)
        // Strip out any raw status JSON and wrap Builder code in GeneratedCode tags to hide from Chat UI
        const cleanBuilderCode = builderCode.replace(/\{"type":\s*"agent",\s*"agent":\s*"[^"]*",\s*"status":\s*"[^"]*"\}\s*/g, "")
        const finalPersistContent = fullChatResponse + "\n\n<GeneratedCode>\n" + cleanBuilderCode + "\n</GeneratedCode>\n"

        await db.update(messagesTable)
          .set({ content: finalPersistContent })
          .where(eq(messagesTable.id, assistantMsgId))

        // token tracking (approximate)
        const cost = Math.max(10, Math.ceil(totalTokens / 200))
        const [userCredit] = await db.select().from(userCredits).where(eq(userCredits.userId, userId))
        if (userCredit) {
          await db.update(userCredits)
            .set({ balance: (userCredit.balance || 0) - cost })
            .where(eq(userCredits.userId, userId))
        }

        sendEvent({ done: true, messageId: assistantMsgId, hasArtifact: true })

        // Final check for action tags in all response parts
        const combinedRaw = fullChatResponse + builderCode;
        if (executeActionTags) {
          await (executeActionTags as any)(combinedRaw, userId, projectId, assistantMsgId);
        }

        controller.close()
      } catch (err) {
        console.error("FalMax Error:", err)
        controller.error(err)
      }
    }
  })
}