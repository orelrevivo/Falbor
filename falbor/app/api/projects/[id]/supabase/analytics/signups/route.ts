// app/api/projects/[id]/supabase/analytics/signups/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getUserSignupStats } from "@/lib/supabase/management-api"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get days parameter from query string (default: 30)
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get("days") || "30")

        // Validate days parameter
        if (![7, 30, 90].includes(days)) {
            return NextResponse.json({ error: "Invalid days parameter. Must be 7, 30, or 90" }, { status: 400 })
        }

        // Get project reference
        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            return NextResponse.json({ error: "Supabase project not found" }, { status: 404 })
        }

        // Fetch signup statistics
        const stats = await getUserSignupStats(supabaseConfig.supabaseProjectRef, days)

        return NextResponse.json({ stats, days })
    } catch (error: any) {
        console.error("[Analytics] Failed to fetch signup stats:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
