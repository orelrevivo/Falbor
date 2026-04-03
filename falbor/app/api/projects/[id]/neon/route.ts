import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectNeon, projects, projectSecrets } from "@/config/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = {
  params: Promise<{ id: string }>
}

/* ----------------------------------------
   GET: Fetch Neon credentials
---------------------------------------- */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Fetch Neon credentials
    const credentials = await db
      .select({
        databaseUrl: projectNeon.databaseUrl,
        projectRef: projectNeon.neonProjectRef,
        region: projectNeon.region,
      })
      .from(projectNeon)
      .where(eq(projectNeon.projectId, projectId))
      .limit(1)

    if (credentials.length === 0) {
      return NextResponse.json({ databaseUrl: null, projectRef: null })
    }

    return NextResponse.json(credentials[0])
  } catch (error) {
    console.error("[Neon GET Error]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ----------------------------------------
   POST: Save Neon credentials
---------------------------------------- */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const { databaseUrl, projectRef } = await request.json()

    if (!databaseUrl) {
      return NextResponse.json(
        { error: "Missing databaseUrl" },
        { status: 400 }
      )
    }

    // Verify ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const existing = await db
      .select()
      .from(projectNeon)
      .where(eq(projectNeon.projectId, projectId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(projectNeon)
        .set({
          databaseUrl,
          neonProjectRef: projectRef || existing[0].neonProjectRef,
          updatedAt: new Date(),
        })
        .where(eq(projectNeon.projectId, projectId))
    } else {
      await db.insert(projectNeon).values({
        projectId,
        neonProjectRef: projectRef || "unknown",
        databaseUrl,
        dbPassword: "custom",
        region: "unknown",
        isActive: true,
      })
    }

    // Synchronize with projectSecrets
    const secretName = "DATABASE_URL"
    const secretValue = databaseUrl

    const [existingSecret] = await db
      .select()
      .from(projectSecrets)
      .where(
        and(
          eq(projectSecrets.projectId, projectId),
          eq(projectSecrets.userId, userId),
          eq(projectSecrets.name, secretName)
        )
      )

    if (existingSecret) {
      await db
        .update(projectSecrets)
        .set({ value: secretValue, updatedAt: new Date() })
        .where(eq(projectSecrets.id, existingSecret.id))
    } else {
      await db.insert(projectSecrets).values({
        projectId,
        userId,
        name: secretName,
        value: secretValue,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Neon POST Error]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
