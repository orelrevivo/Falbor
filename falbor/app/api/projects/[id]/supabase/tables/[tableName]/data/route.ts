import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { getProjectTableRows } from "@/lib/supabase/management-api"

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

        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            return Response.json({ success: true, rows: [] })
        }

        const rows = await getProjectTableRows(supabaseConfig.supabaseProjectRef, tableName)

        return Response.json({
            success: true,
            rows,
        })
    } catch (error: any) {
        console.error(`[Supabase Table Data] Error for ${tableName}:`, error)
        return Response.json(
            { success: false, error: "Failed to fetch table data" },
            { status: 500 }
        )
    }
}
