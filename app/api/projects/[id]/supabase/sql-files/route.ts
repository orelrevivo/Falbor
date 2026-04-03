// app/api/projects/[id]/supabase/sql-files/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabaseSqlFiles } from "@/config/schema"
import { eq, desc } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params

        const files = await db
            .select()
            .from(projectSupabaseSqlFiles)
            .where(eq(projectSupabaseSqlFiles.projectId, projectId))
            .orderBy(desc(projectSupabaseSqlFiles.createdAt))

        return NextResponse.json(files)
    } catch (error: any) {
        console.error("Failed to fetch SQL files:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
