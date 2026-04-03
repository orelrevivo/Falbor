import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabase, projects, projectSecrets, projectCollaborators } from "@/config/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = {
  params: Promise<{ id: string }>
}

/* ----------------------------------------
   GET: Fetch Supabase credentials
---------------------------------------- */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify access (including collaborators)
    const [access] = await db
      .select({
        project: projects,
        collaborator: projectCollaborators
      })
      .from(projects)
      .leftJoin(
        projectCollaborators,
        and(
          eq(projectCollaborators.projectId, projects.id),
          eq(projectCollaborators.userId, userId),
          eq(projectCollaborators.status, 'accepted')
        )
      )
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!access) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const isOwner = access.project.userId === userId;
    const isCollaborator = !!access.collaborator;

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch Supabase credentials
    const credentials = await db
      .select({
        supabaseUrl: projectSupabase.supabaseUrl,
        anonKey: projectSupabase.anonKey,
        serviceRoleKey: projectSupabase.serviceRoleKey,
        projectRef: projectSupabase.supabaseProjectRef,
      })
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))
      .limit(1)

    if (credentials.length === 0) {
      return NextResponse.json({ supabaseUrl: null, anonKey: null, serviceRoleKey: null })
    }

    return NextResponse.json(credentials[0])
  } catch (error) {
    console.error("[Supabase GET Error]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ----------------------------------------
   POST: Save Supabase credentials
---------------------------------------- */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const { supabaseUrl, anonKey } = await request.json()

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Missing supabaseUrl or anonKey" },
        { status: 400 }
      )
    }

    // Verify admin access (Owner or Admin role)
    const [access] = await db
      .select({
        project: projects,
        collaborator: projectCollaborators
      })
      .from(projects)
      .leftJoin(
        projectCollaborators,
        and(
          eq(projectCollaborators.projectId, projects.id),
          eq(projectCollaborators.userId, userId),
          eq(projectCollaborators.status, 'accepted')
        )
      )
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!access) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const isOwner = access.project.userId === userId;
    const isAdmin = access.collaborator?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const existing = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(projectSupabase)
        .set({
          supabaseUrl,
          anonKey,
          updatedAt: new Date(),
        })
        .where(eq(projectSupabase.projectId, projectId))
    } else {
      await db.insert(projectSupabase).values({
        projectId,
        supabaseProjectRef:
          supabaseUrl.split("//")[1]?.split(".")[0] || "unknown",
        supabaseUrl,
        anonKey,
        serviceRoleKey: "",
        dbPassword: "",
        region: "unknown",
        isActive: true,
      })
    }

    // Synchronize with projectSecrets
    const secretUpdates = [
      { name: "VITE_SUPABASE_URL", value: supabaseUrl },
      { name: "VITE_SUPABASE_ANON_KEY", value: anonKey },
    ]

    for (const secret of secretUpdates) {
      const [existingSecret] = await db
        .select()
        .from(projectSecrets)
        .where(
          and(
            eq(projectSecrets.projectId, projectId),
            eq(projectSecrets.userId, userId),
            eq(projectSecrets.name, secret.name)
          )
        )

      if (existingSecret) {
        await db
          .update(projectSecrets)
          .set({ value: secret.value, updatedAt: new Date() })
          .where(eq(projectSecrets.id, existingSecret.id))
      } else {
        await db.insert(projectSecrets).values({
          projectId,
          userId,
          name: secret.name,
          value: secret.value,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Supabase POST Error]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
