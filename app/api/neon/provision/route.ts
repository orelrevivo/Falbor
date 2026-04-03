import { auth } from "@clerk/nextjs/server"
import { NextResponse, NextRequest } from "next/server"
import { createNeonProject } from "@/lib/neon/management-api"

export async function POST(request: NextRequest) {
    const authData = await auth()
    const { userId } = authData

    console.log(`[Neon Provision API] Received request. userId: ${userId}`)

    if (!userId) {
        console.warn("[Neon Provision API] No userId found in auth(). Returning Unauthorized.")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { name } = await request.json()
        
        console.log(`[Neon Provision API] Creating Neon project: ${name}`)
        const credentials = await createNeonProject({
            name,
            orgId: process.env.NEON_ORG_ID,
        })

        return NextResponse.json({
            databaseUrl: credentials.databaseUrl,
            projectRef: credentials.projectRef,
            dbPassword: credentials.dbPassword,
            region: credentials.region
        })
    } catch (error) {
        console.error("[Neon Provision API] Error:", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
