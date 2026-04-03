import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectNeon } from "@/config/schema"
import { eq } from "drizzle-orm"
import { executeNeonSql } from "@/lib/neon/management-api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; tableName: string }> }
) {
  const { id: projectId, tableName } = await params
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

    if (!project || project.userId !== userId) {
      return Response.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const [neonConfig] = await db
      .select()
      .from(projectNeon)
      .where(eq(projectNeon.projectId, projectId))

    if (!neonConfig) {
      return Response.json({ success: false, error: "Neon not connected" }, { status: 400 })
    }

    // Safety check: only allow base table names (already filtered in the tables route)
    // and avoid any injection by checking against the actual table list
    const tableCheck = await executeNeonSql(
      neonConfig.databaseUrl,
      "SELECT table_name FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'",
      [tableName]
    )

    if (tableCheck.length === 0) {
      return Response.json({ success: false, error: "Table not found" }, { status: 404 })
    }

    // Fetch the data
    const rows = await executeNeonSql(
      neonConfig.databaseUrl,
      `SELECT * FROM "${tableName}" LIMIT 100` // Using double quotes for safety
    )

    return Response.json({
      success: true,
      rows,
    })
  } catch (error: any) {
    console.error(`[Neon Data] Error fetching data for ${tableName}:`, error)
    return Response.json(
      { success: false, error: "Failed to fetch table data" },
      { status: 500 }
    )
  }
}
