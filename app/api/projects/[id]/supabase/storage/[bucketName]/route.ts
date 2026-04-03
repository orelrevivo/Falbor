// app/api/projects/[id]/supabase/storage/[bucketName]/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getBucketFiles } from "@/lib/supabase/management-api"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; bucketName: string }> }
) {
    try {
        const { id: projectId, bucketName } = await params
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get project reference
        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            return NextResponse.json({ error: "Supabase project not found" }, { status: 404 })
        }

        // Fetch files from bucket
        const files = await getBucketFiles(supabaseConfig.supabaseProjectRef, bucketName)

        return NextResponse.json({ files })
    } catch (error: any) {
        console.error("[Storage Files] Failed to fetch files:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
