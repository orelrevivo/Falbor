import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, files, projectCollaborators } from "@/config/schema"
import { eq, and, or } from "drizzle-orm"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Destructure and rename for consistency with your schema/variables
    const { id: projectId } = await params
    const { filesData } = await req.json()

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
    const isEditorOrAdmin = access.collaborator && (access.collaborator.role === 'editor' || access.collaborator.role === 'admin');

    if (!isOwner && !isEditorOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Edit access required" }, { status: 403 })
    }

    // Delete existing files and insert new ones
    await db.delete(files).where(eq(files.projectId, projectId))

    for (const file of filesData) {
      await db.insert(files).values({
        projectId,
        path: file.path,
        content: file.content,
        language: file.language || "plaintext",
      })
    }

    console.log(`[v0] Wrote ${filesData.length} files for project ${projectId}`)

    return NextResponse.json({ success: true, count: filesData.length })
  } catch (error) {
    console.error("[v0] Failed to write files:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write files" },
      { status: 500 },
    )
  }
}