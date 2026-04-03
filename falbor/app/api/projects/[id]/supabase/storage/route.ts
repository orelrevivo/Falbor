import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"

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

        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig) {
            return Response.json({ success: true, buckets: [] })
        }

        let buckets: any[] = []

        if (supabaseConfig.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
            // Use Management API for managed projects (more reliable)
            const { getProjectBuckets } = await import("@/lib/supabase/management-api")
            const rawBuckets = await getProjectBuckets(supabaseConfig.supabaseProjectRef)
            buckets = rawBuckets.map((b: any) => ({
                id: b.id,
                name: b.name,
                public: b.public,
                createdAt: b.created_at,
                updatedAt: b.updated_at
            }))
        } else if (supabaseConfig.serviceRoleKey && supabaseConfig.supabaseUrl) {
            // Fallback to supabase-js for custom projects
            const supabaseAdmin = createClient(supabaseConfig.supabaseUrl, supabaseConfig.serviceRoleKey)
            const { data: bucketsData, error } = await supabaseAdmin.storage.listBuckets()
            if (error) throw error

            buckets = bucketsData.map(b => ({
                id: b.id,
                name: b.name,
                public: b.public,
                createdAt: b.created_at,
                updatedAt: b.updated_at
            }))
        }

        return Response.json({
            success: true,
            buckets
        })

    } catch (error: any) {
        console.error("[Supabase Storage] Error:", error)
        return Response.json(
            { success: false, error: error.message || "Failed to fetch storage" },
            { status: 500 }
        )
    }
}
