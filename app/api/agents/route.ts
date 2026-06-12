import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { agents } from "@/config/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId))
      .orderBy(desc(agents.updatedAt))

    return NextResponse.json({ agents: userAgents })
  } catch (error) {
    console.error("[Agents API] GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const name = body.name || `Agent #${Math.floor(1000 + Math.random() * 9000)}`
    const description = body.description || "Website building assistant agent"

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId,
        name,
        description,
        status: "in_progress",
        currentStep: "setup",
        config: {},
      })
      .returning()

    return NextResponse.json({ agent: newAgent })
  } catch (error) {
    console.error("[Agents API] POST Error:", error)
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }
}
