import { auth } from "@clerk/nextjs/server"
import { NextResponse, NextRequest } from "next/server"
import { createSupabaseProject, getSupabaseProjectKeys } from "@/lib/supabase/management-api"

export async function POST(request: NextRequest) {
    const authData = await auth()
    const { userId } = authData

    console.log(`[Provision API] Received request. userId: ${userId}`)

    if (!userId) {
        console.warn("[Provision API] No userId found in auth(). Returning Unauthorized.")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { name } = await request.json()
        const orgSlug = process.env.SUPABASE_ORG_SLUG

        if (!orgSlug) {
            return NextResponse.json({ error: "Supabase Organization Slug not configured" }, { status: 500 })
        }

        // 1. Create project (returns projectRef and URL immediately)
        console.log(`[Provision API] Creating Supabase project: ${name}`)
        const credentials = await createSupabaseProject({
            name,
            organizationSlug: orgSlug,
        })

        // 2. Poll for keys (this is what the user wants to wait for)
        console.log(`[Provision API] Polling for keys for project: ${credentials.projectRef}`)
        let keys = null
        const maxAttempts = 30 // ~2.5 minutes total (5s * 30)
        for (let i = 0; i < maxAttempts; i++) {
            keys = await getSupabaseProjectKeys(credentials.projectRef)
            if (keys) break
            await new Promise(resolve => setTimeout(resolve, 5000))
        }

        if (!keys) {
            return NextResponse.json({ error: "Timed out waiting for API keys" }, { status: 504 })
        }

        return NextResponse.json({
            supabaseUrl: credentials.supabaseUrl,
            anonKey: keys.anonKey,
            serviceRoleKey: keys.serviceRoleKey,
            projectRef: credentials.projectRef,
            dbPassword: credentials.dbPassword
        })
    } catch (error) {
        console.error("[Provision API] Error:", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
