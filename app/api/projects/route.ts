import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, messages, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { createSupabaseProject } from "@/lib/supabase/management-api"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(projects.createdAt)

    return NextResponse.json({ projects: userProjects })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const {
      message,
      selectedModel = "gemini",
      isAutomated = false,
      isFalborDb = false,
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      projectRef,
      dbPassword,
      selectedFramework = "vite",
    } = await request.json()

    const [project] = await db
      .insert(projects)
      .values({
        userId,
        title: message.slice(0, 50),
        selectedModel,
        isAutomated,
      })
      .returning()

    let finalMessage = message

    // If Falbor Database is requested, prepare placeholder message
    if (isFalborDb && !supabaseUrl) {
      finalMessage += `\n\n## Database Connection (Managed by Falbor)\nSetting up your database... Credentials will be available in a few seconds.`
    }

    if (selectedFramework && selectedFramework !== 'vite') {
      finalMessage += `\n\n## Project Configuration\nFramework: ${selectedFramework}`
    }

    const [userMessage] = await db.insert(messages).values({
      projectId: project.id,
      role: "user",
      content: finalMessage,
      isAutomated,
    }).returning()

    // If Falbor Database is requested, save the credentials provided by the frontend
    if (isFalborDb && supabaseUrl && anonKey) {
      try {
        await db.insert(projectSupabase).values({
          projectId: project.id,
          supabaseProjectRef: projectRef || supabaseUrl.split("//")[1].split(".")[0],
          supabaseUrl,
          anonKey,
          serviceRoleKey: serviceRoleKey || "",
          dbPassword: dbPassword || "managed-by-falbor",
          region: "us-east-1",
        })
      } catch (provisionError) {
        console.error("[Projects API] Supabase Record Creation Error:", provisionError)
      }
    }

    return NextResponse.json({ projectId: project.id })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}