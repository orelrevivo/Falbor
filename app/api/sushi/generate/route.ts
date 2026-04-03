import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, files as filesTable } from "@/config/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { projectId, questions, platforms = ["Instagram", "Facebook", "TikTok"] } = await req.json()

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return new Response("Project not found", { status: 404 })

    const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId))
    const fileStructure = files.map((f) => f.path).join("\n")

    // Step 1: Generate Post Content and Image Prompts using Gemini
    const strategyResponse = await openrouter.chat.completions.create({
      model: "google/gemini-3.1-flash-lite-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert social media storyteller. 
Based on the project and the user's answers, generate EXACTLY one social media post for EACH of these platforms: ${platforms.join(", ")}.
For each post, provide:
1. Catchy copywriting (post content).
2. A high-fidelity image prompt for "Nano Banana" image generation.

Output MUST be a JSON object with this EXACT structure:
{
  "posts": [
    {
      "platform": "LinkedIn",
      "content": "...",
      "imagePrompt": "..."
    },
    ...
  ]
}
Ensure there is one entry for each platform (LinkedIn, Instagram, TikTok).`,
        },
        {
          role: "user",
          content: `Project: ${project.title}\nAnswers:\n${JSON.stringify(questions)}\nPlatforms: ${platforms.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    })

    const strategyText = strategyResponse.choices[0].message.content || "{}"
    console.log("[SocialContent/Strategy] Raw Response:", strategyText)
    const strategy = JSON.parse(strategyText)
    const generatedPosts = strategy.posts || []

    if (generatedPosts.length === 0) {
       console.warn("[SocialContent/Strategy] AI returned no posts array")
    }

    // Step 2: Generate Images using Runware for each post
    const postsWithImages = await Promise.all(
      generatedPosts.map(async (post: any, index: number) => {
        try {
          const runwareResponse = await fetch("https://api.runware.ai/v1", {
            method: "POST",
            headers: { 
               "Content-Type": "application/json",
               "Authorization": `Bearer ${process.env.RUNWARE_API_KEY}`
            },
            body: JSON.stringify([
              {
                taskType: "imageInference",
                modelId: "runware:100@1", // Flux.1 Dev
                positivePrompt: post.imagePrompt,
                width: 1024,
                height: 1024,
                numberResults: 1
              }
            ])
          })

          const runwareData = await runwareResponse.json()
          // Check for errors explicitly
          if (runwareData.errors) {
             console.error(`[SocialContent/Runware] API Error for ${post.platform}:`, JSON.stringify(runwareData.errors, null, 2))
             throw new Error(runwareData.errors[0]?.message || "Runware API Error")
          }
          
          let imageUrl = runwareData.data?.[0]?.imageURL
          if (!imageUrl) {
             console.warn(`[SocialContent/Runware] Failed to get URL. Fallback used.`)
             imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
          } else {
             // Use proxy-image to ensure stable loading and CORS compliance
             imageUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
          }

          return {
            ...post,
            id: `${post.platform.toLowerCase()}-${Date.now()}-${index}`,
            imageUrl: imageUrl,
          }
        } catch (err) {
          console.error(`[Sushi/Image] Error for ${post.platform}:`, err)
          return {
            ...post,
            id: `${post.platform.toLowerCase()}-${Date.now()}-${index}`,
            imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
          }
        }
      })
    )

    return NextResponse.json(postsWithImages)
  } catch (error) {
    console.error("[SocialContent/Generate] Error:", error)
    return NextResponse.json({ error: "Failed to generate social content" }, { status: 500 })
  }
}
