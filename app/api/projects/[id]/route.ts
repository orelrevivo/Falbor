import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, deployments } from "@/config/schema"
import { eq, and } from "drizzle-orm"

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
        deployment: deployments
      })
      .from(projects)
      .leftJoin(deployments, eq(deployments.projectId, projects.id))
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId)
        )
      )
      .limit(1)

    if (!result) {
      return new NextResponse("Project not found", { status: 404 })
    }

    return NextResponse.json({
      ...result.project,
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

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId)
        )
      )
      .limit(1)

    if (!project) {
      return new NextResponse("Project not found", { status: 404 })
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
