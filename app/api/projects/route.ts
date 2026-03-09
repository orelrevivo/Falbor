import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, messages, projectSupabase, projectSecrets } from "@/config/schema"
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

    // If Database is requested (Falbor or Custom), save the credentials and sync to secrets
    if (supabaseUrl && anonKey) {
      try {
        await db.insert(projectSupabase).values({
          projectId: project.id,
          supabaseProjectRef: projectRef || supabaseUrl.split("//")[1]?.split(".")[0] || "unknown",
          supabaseUrl,
          anonKey,
          serviceRoleKey: serviceRoleKey || "",
          dbPassword: dbPassword || (isFalborDb ? "managed-by-falbor" : "custom"),
          region: "us-east-1",
        })

        // Sync to secrets
        const secretUpdates = [
          { name: "VITE_SUPABASE_URL", value: supabaseUrl },
          { name: "VITE_SUPABASE_ANON_KEY", value: anonKey },
        ]

        for (const secret of secretUpdates) {
          await db.insert(projectSecrets).values({
            projectId: project.id,
            userId,
            name: secret.name,
            value: secret.value,
          })
        }
      } catch (provisionError) {
        console.error("[Projects API] Database Secret Sync Error:", provisionError)
      }
    }

    return NextResponse.json({ projectId: project.id })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}