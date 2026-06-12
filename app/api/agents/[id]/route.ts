import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { agents, messages as messagesTable, projects as projectsTable } from "@/config/schema"
import { eq, and, sql, inArray, desc } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Dynamic stats query starting from 0 (real data)
    let messageCount = 0
    let uniqueUserCount = 0

    try {
      // 1. Fetch all projects for this user
      const userProjects = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.userId, userId))

      const projectIds = userProjects.map(p => p.id)

      if (projectIds.length > 0) {
        // 2. Fetch all messages in these projects
        const allMsgs = await db
          .select({
            id: messagesTable.id,
            role: messagesTable.role,
            metadata: messagesTable.metadata
          })
          .from(messagesTable)
          .where(inArray(messagesTable.projectId, projectIds))

        // 3. Find the most recently active completed agent for fallback attribution of historical messages
        const [activeAgent] = await db
          .select({ id: agents.id })
          .from(agents)
          .where(and(eq(agents.userId, userId), eq(agents.status, "completed")))
          .orderBy(desc(agents.updatedAt))

        for (const msg of allMsgs) {
          // Count only user messages to match the "person who wrote a message" standard
          if (msg.role !== "user") continue

          const meta = msg.metadata as Record<string, any> | null
          const msgAgentId = meta?.agentId

          if (msgAgentId === id) {
            messageCount++
          } else if (!msgAgentId && activeAgent?.id === id) {
            // Attribute historical chat messages to the active agent fallback
            messageCount++
          }
        }
      }

      if (messageCount > 0) {
        uniqueUserCount = 1 // Active logged-in user who wrote the messages
      }
    } catch (e) {
      console.warn("[Agent ID API] Failed to fetch message counts, defaulting to 0:", e)
    }

    return NextResponse.json({ 
      agent,
      stats: {
        totalMessages: messageCount,
        uniqueUsers: uniqueUserCount
      }
    })
  } catch (error) {
    console.error("[Agent ID API] GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, description, status, currentStep, config } = body

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (currentStep !== undefined) updateData.currentStep = currentStep
    if (config !== undefined) updateData.config = config
    updateData.updatedAt = new Date()

    const [updatedAgent] = await db
      .update(agents)
      .set(updateData)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning()

    if (!updatedAgent) {
      return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ agent: updatedAgent })
  } catch (error) {
    console.error("[Agent ID API] PATCH Error:", error)
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const [deletedAgent] = await db
      .delete(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning()

    if (!deletedAgent) {
      return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, agent: deletedAgent })
  } catch (error) {
    console.error("[Agent ID API] DELETE Error:", error)
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
  }
}
