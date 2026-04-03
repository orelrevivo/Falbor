import { auth } from '@clerk/nextjs/server'
import { db } from '@/config/db'
import { eq, and } from 'drizzle-orm'
import { userApiKeys } from '@/config/schema'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// List Keys
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const keys = await db
            .select()
            .from(userApiKeys)
            .where(eq(userApiKeys.userId, userId))
            .orderBy(userApiKeys.createdAt)

        return NextResponse.json(keys)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Create Key
export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, projectId, type = 'custom' } = await req.json()
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const newKeyString = `flb_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`

        const [newKey] = await db
            .insert(userApiKeys)
            .values({
                userId,
                projectId,
                name,
                key: newKeyString,
                type,
            })
            .returning()

        return NextResponse.json(newKey)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
