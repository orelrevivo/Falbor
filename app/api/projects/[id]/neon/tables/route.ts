import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectNeon } from "@/config/schema"
import { eq } from "drizzle-orm"
import { executeNeonSql } from "@/lib/neon/management-api"

interface Column {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

interface Table {
  name: string
  schema: string
  columns: Column[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
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
      return Response.json(
        {
          success: true,
          tables: [] as Table[],
          message: "Neon not provisioned",
        },
        { status: 200 }
      )
    }

    const databaseUrl = neonConfig.databaseUrl

    // 1. Get all tables in public schema
    const rawTables = await executeNeonSql(
      databaseUrl,
      "SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    )

    // 2. Get all columns for these tables in a single query for efficiency, or one by one
    // For now, let's do one by one as it's simpler
    const tables: Table[] = await Promise.all(
      rawTables.map(async (table: any) => {
        try {
          const columnsRaw = await executeNeonSql(
            databaseUrl,
            "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'",
            [table.table_name]
          )

          return {
            name: table.table_name,
            schema: table.table_schema,
            columns: columnsRaw.map((col: any) => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === "YES",
              default: col.column_default,
            })),
          }
        } catch (err) {
          console.warn(`Failed to load columns for table ${table.table_name}:`, err)
          return {
            name: table.table_name,
            schema: table.table_schema,
            columns: [] as Column[],
          }
        }
      })
    )

    return Response.json(
      {
        success: true,
        tables,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[Neon Tables] Error:", error)
    return Response.json(
      { success: false, error: "Failed to fetch database schema" },
      { status: 500 }
    )
  }
}
