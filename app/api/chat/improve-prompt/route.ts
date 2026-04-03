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

  const zaiKey = process.env.ZAI_API_KEY

  if (!zaiKey) {
    console.error("[ImprovePrompt] ZAI_API_KEY matches not found")
    return new Response(JSON.stringify({ error: "Z.ai API key not configured." }), { status: 500 })
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

  const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${zaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-4.6",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Original prompt:\n"${prompt}"` },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[ImprovePrompt] Z.ai API error:", response.status, errorText)
    return new Response(JSON.stringify({ error: `Z.ai API error: ${response.status}` }), { status: 500 })
  }

  const encoder = new TextEncoder()
  let accumulated = ""

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

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
            if (line.trim().startsWith("data: ")) {
              const data = line.trim().slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                const text = parsed.choices?.[0]?.delta?.content
                if (text) {
                  accumulated += text
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                }
              } catch (e) {
                console.error("[ImprovePrompt] Parse error:", e)
              }
            }
          }
        }

        // Final event with the complete clean prompt
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, improvedPrompt: accumulated.trim() })}\n\n`
          )
        )
        controller.close()
      } catch (err) {
        console.error("[ImprovePrompt] Stream error:", err)
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
}