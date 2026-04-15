import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, deployments, projectCollaborators } from "@/config/schema"
import { eq, and, or } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    const [result] = await db
      .select({
        project: projects,
        deployment: deployments,
        collaborator: projectCollaborators
      })
      .from(projects)
      .leftJoin(deployments, eq(deployments.projectId, projects.id))
      .leftJoin(
        projectCollaborators, 
        and(
          eq(projectCollaborators.projectId, projects.id),
          eq(projectCollaborators.userId, userId),
          eq(projectCollaborators.status, 'accepted')
        )
      )
      .where(eq(projects.id, id))
      .limit(1)

    if (!result) {
      return new NextResponse("Project not found", { status: 404 })
    }

    // Check if owner or accepted collaborator
    const isOwner = result.project.userId === userId;
    const isCollaborator = !!result.collaborator;

    if (!isOwner && !isCollaborator) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const role = isOwner ? "admin" : (result.collaborator?.role || "viewer");

    return NextResponse.json({
      ...result.project,
      role, // Return the role to the client
      subdomain: result.deployment?.subdomain || id.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      deploymentUrl: result.deployment?.deploymentUrl || null
    })
  } catch (error) {
    console.error("[PROJECT_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

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
      .where(eq(projects.id, id))
      .limit(1)

    if (!access) {
      return new NextResponse("Project not found", { status: 404 })
    }

    const isOwner = access.project.userId === userId;
    const isAdmin = access.collaborator?.role === "admin";

    if (!isOwner && !isAdmin) {
      return new NextResponse("Forbidden: Admin access required", { status: 403 })
    }

    await db
      .update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))

    return new NextResponse("Success", { status: 200 })
  } catch (error) {
    console.error("[PROJECT_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    // Only owners can delete projects
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      return new NextResponse("Project not found or unauthorized", { status: 404 })
    }

    await db.delete(projects).where(eq(projects.id, id))

    return new NextResponse("Success", { status: 200 })
  } catch (error) {
    console.error("[PROJECT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
