// app/api/projects/[id]/supabase/auth/config/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getProjectAuthConfig, updateProjectAuthConfig } from "@/lib/supabase/management-api"

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

        console.log(`[AUTH_CONFIG] Fetching for project: ${projectId}`)

        // 1. Get project reference
        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            console.warn(`[AUTH_CONFIG] No Supabase config for project: ${projectId}`)
            return NextResponse.json({ error: "Supabase project not found" }, { status: 404 })
        }

        // 2. Fetch config from Management API
        console.log(`[AUTH_CONFIG] Using projectRef: ${supabaseConfig.supabaseProjectRef}`)
        const config = await getProjectAuthConfig(supabaseConfig.supabaseProjectRef)

        // Log keys to verify structure
        console.log(`[AUTH_CONFIG] Success. Response keys:`, Object.keys(config || {}).slice(0, 10))

        return NextResponse.json(config)
    } catch (error: any) {
        console.error("[AUTH_CONFIG] Failed to fetch Auth config:", error)

        // Supabase Management API returns 404 with "Project not found" when the
        // project ref in our DB no longer maps to a live Supabase project.
        const isNotFound =
            error.status === 404 ||
            error.message?.toLowerCase().includes("project not found")

        if (isNotFound) {
            return NextResponse.json(
                { error: "Supabase project not found or inaccessible. It may have been deleted or the access token may have changed." },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()

        // 1. Get project reference
        const [supabaseConfig] = await db
            .select()
            .from(projectSupabase)
            .where(eq(projectSupabase.projectId, projectId))

        if (!supabaseConfig?.supabaseProjectRef) {
            return NextResponse.json({ error: "Supabase project not found" }, { status: 404 })
        }

        // 2. Update config via Management API
        const result = await updateProjectAuthConfig(supabaseConfig.supabaseProjectRef, body)

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to update Auth config:", error)

        const isNotFound =
            error.status === 404 ||
            error.message?.toLowerCase().includes("project not found")

        if (isNotFound) {
            return NextResponse.json(
                { error: "Supabase project not found or inaccessible." },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
