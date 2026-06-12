// app/api/chat/improve-prompt/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects } from "@/config/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { projectId, prompt } = await request.json()

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 })
  }

  // Verify project ownership only if projectId is provided
  if (projectId) {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

    if (!project || project.userId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }
  }

  const systemInstruction = `
You are an expert prompt engineer for an AI code-generation assistant focused on world-class UI/UX.
Take the user's original prompt and rewrite it to be:

- More professional, polished, and detailed.
- Explicitly mandate high-end "Visual Excellence": premium aesthetics, Glassmorphism, and Bento Grids.
- REQUIRE high-fidelity micro-animations using framer-motion (hover, entrance, state transitions).
- Reference 21st.dev/Shadcn style for all components to ensure top-tier design.
- Define specific tech stack (React, Vite, Tailwind, Framer Motion, Lucide).
- Completely free of any markdown, asterisks, parentheses, code fences, or extra formatting.

Return **only** the improved prompt – nothing else.
`.trim()

  // 1. Try Google Gemini first
  const googleKey = process.env.GOOGLE_API_KEY
  if (googleKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai")
      const genAI = new GoogleGenerativeAI(googleKey)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      const result = await model.generateContentStream({
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nOriginal prompt:\n"${prompt}"` }] }
        ],
      })

      const encoder = new TextEncoder()
      let accumulated = ""

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text()
              if (text) {
                accumulated += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, improvedPrompt: accumulated.trim() })}\n\n`))
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        }
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (err) {
      console.error("[ImprovePrompt] Gemini error:", err)
    }
  }

  // 2. Fallback to OpenAI GPT-4o-mini
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      console.log("[ImprovePrompt] Falling back to OpenAI GPT-4o-mini")

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Original prompt:\n"${prompt}"` },
          ],
          stream: true,
          max_tokens: 800,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[ImprovePrompt] OpenAI error:", response.status, errorText)
        throw new Error(`OpenAI error: ${response.status}`)
      }

      const encoder = new TextEncoder()
      let accumulated = ""

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) { controller.close(); return }

          const decoder = new TextDecoder()
          let buffer = ""

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue
                const data = line.slice(6)
                if (data === "[DONE]") continue
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
                  }
                } catch (e) { /* skip parse errors */ }
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, improvedPrompt: accumulated.trim() })}\n\n`))
            controller.close()
          } catch (err) {
            console.error("[ImprovePrompt] OpenAI stream error:", err)
            controller.error(err)
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (err) {
      console.error("[ImprovePrompt] OpenAI fallback failed:", err)
    }
  }

  // 3. Final fallback: return the original prompt as-is (silent pass-through)
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: prompt })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, improvedPrompt: prompt })}\n\n`))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}