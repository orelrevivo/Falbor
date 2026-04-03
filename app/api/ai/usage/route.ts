import { auth } from '@clerk/nextjs/server'
import { db } from '@/config/db'
import { eq, and } from 'drizzle-orm'
import { userApiUsage, userCredits, userApiKeys } from '@/config/schema'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(req.url)
        const projectId = url.searchParams.get('projectId')

        // 1. Get user credits (Balance in cents)
        const credits = await db
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .then(r => r[0])

        const balanceCents = credits?.balance || 0
        const balanceDollars = balanceCents / 100

        // 2. Get Global Usage
        const usage = await db
            .select()
            .from(userApiUsage)
            .where(eq(userApiUsage.userId, userId))
            .then(r => r[0])

        // 3. Get Specific Key for the project if one exists (for the chat)
        let projectKey = null
        if (projectId) {
            projectKey = await db
                .select()
                .from(userApiKeys)
                .where(and(
                    eq(userApiKeys.userId, userId),
                    eq(userApiKeys.projectId, projectId),
                    eq(userApiKeys.type, 'chat')
                ))
                .then(r => r[0])
            
            // If no project-specific chat key exists, create one (Legacy fallback)
            if (!projectKey) {
                const keyStr = `flb_chat_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
                const [newKey] = await db.insert(userApiKeys).values({
                    userId,
                    projectId,
                    name: 'Project Chat API',
                    key: keyStr,
                    type: 'chat'
                }).returning()
                projectKey = newKey
            }
        }

        return NextResponse.json({
            balance: balanceDollars,
            balanceCents,
            totalMessages: usage?.messageCount || 0,
            totalCost: (usage?.totalCost || 0) / 100,
            projectKey: projectKey?.key || null,
            tier: credits?.subscriptionTier || 'free'
        })
    } catch (error: any) {
        console.error("[API/AI/Usage] GET error:", error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
