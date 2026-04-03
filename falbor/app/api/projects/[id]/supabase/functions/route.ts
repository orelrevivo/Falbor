import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"

const SUPABASE_API_URL = "https://api.supabase.com/v1"

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
        const accessToken = process.env.SUPABASE_ACCESS_TOKEN
        if (!accessToken) {
            return Response.json({ success: true, functions: [] })
        }

        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project || project.userId !== userId) {
            return Response.json({ success: false, error: "Project not found" }, { status: 404 })
        }

        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            return Response.json({ success: true, functions: [] })
        }

        const response = await fetch(`${SUPABASE_API_URL}/projects/${supabaseConfig.supabaseProjectRef}/functions`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            // If functions API is not available (e.g. not pro plan), return empty
            return Response.json({ success: true, functions: [] })
        }

        const functions = await response.json()

        return Response.json({
            success: true,
            functions: Array.isArray(functions) ? functions.map((f: any) => ({
                id: f.id,
                name: f.name,
                status: f.status,
                version: f.version,
                createdAt: f.created_at,
                updatedAt: f.updated_at
            })) : []
        })

    } catch (error: any) {
        console.error("[Supabase Functions] Error:", error)
        return Response.json(
            { success: false, error: error.message || "Failed to fetch functions" },
            { status: 500 }
        )
    }
}
