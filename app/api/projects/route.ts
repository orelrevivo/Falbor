import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, messages, projectSupabase, projectNeon, projectSecrets } from "@/config/schema"
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
      isNeonDb = false,
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      projectRef,
      dbPassword,
      neonUrl,
      neonPassword,
      neonProjectRef,
      selectedFramework = "vite",
      sessionId = "main",
      uploadedFiles = null,
      imageData = null,
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

    // If Falbor Database is requested, prepare placeholder message only if not already provided
    if (isFalborDb && !supabaseUrl && !finalMessage.includes("## Database Connection")) {
      finalMessage += `\n\n## Database Connection (Managed by Falbor)\nSetting up your database... Credentials will be available in a few seconds.`
    }

    if (isNeonDb && !neonUrl && !finalMessage.includes("## Database Connection")) {
      finalMessage += `\n\n## Database Connection (Managed by Falbor Max)\nSetting up your Neon database... Credentials will be available in a few seconds.`
    }

    if (selectedFramework && selectedFramework !== 'vite') {
      finalMessage += `\n\n## Project Configuration\nFramework: ${selectedFramework}`
    }

    const [userMessage] = await db.insert(messages).values({
      projectId: project.id,
      sessionId,
      role: "user",
      content: finalMessage,
      isAutomated,
      imageData: imageData?.data || null,
      metadata: uploadedFiles ? { uploadedFiles } : null,
    }).returning()

    // If Database is requested (Falbor or Custom), save the credentials and sync to secrets
    if (supabaseUrl && anonKey) {
      // Inject credentials directly into the project creation message if not already there
      if (!finalMessage.includes("VITE_SUPABASE_URL")) {
          finalMessage += `\n\n## Database Connection (Managed by Falbor)\nDatabase provisioned successfully.\nVITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey || ""}`
      }
      
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

    // Handle Neon credentials
    if (neonUrl) {
      // Inject credentials directly into the project creation message if not already there
      if (!finalMessage.includes("DATABASE_URL")) {
          finalMessage += `\n\n## Database Connection (Managed by Falbor Max)\nNeon project provisioned successfully.\nDATABASE_URL=${neonUrl}`
      }

      try {
        await db.insert(projectNeon).values({
          projectId: project.id,
          neonProjectRef: neonProjectRef || "unknown",
          databaseUrl: neonUrl,
          dbPassword: neonPassword || "custom",
          region: "aws-us-east-1",
        })

        // Sync to secrets
        await db.insert(projectSecrets).values({
          projectId: project.id,
          userId,
          name: "DATABASE_URL",
          value: neonUrl,
        })
      } catch (neonError) {
        console.error("[Projects API] Neon Secret Sync Error:", neonError)
      }
    }

    // Update the message content with the injected credentials
    await db.update(messages)
      .set({ content: finalMessage })
      .where(eq(messages.id, userMessage.id))

    return NextResponse.json({ projectId: project.id })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}