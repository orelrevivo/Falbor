import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabaseSqlFiles, projectNeonSqlFiles, projects } from "@/config/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Fetch from both sources
    const supabaseSql = await db
      .select()
      .from(projectSupabaseSqlFiles)
      .where(eq(projectSupabaseSqlFiles.projectId, projectId))
      .orderBy(desc(projectSupabaseSqlFiles.createdAt))

    const neonSql = await db
      .select()
      .from(projectNeonSqlFiles)
      .where(eq(projectNeonSqlFiles.projectId, projectId))
      .orderBy(desc(projectNeonSqlFiles.createdAt))

    // Merge and sort
    const allSql = [
      ...supabaseSql.map(s => ({ ...s, source: 'supabase' })),
      ...neonSql.map(n => ({ ...n, source: 'neon' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      history: allSql
    })
  } catch (error: any) {
    console.error("[SQL History API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch SQL history" }, { status: 500 })
  }
}
