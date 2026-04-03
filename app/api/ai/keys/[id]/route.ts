import { auth } from '@clerk/nextjs/server'
import { db } from '@/config/db'
import { eq, and } from 'drizzle-orm'
import { userApiKeys } from '@/config/schema'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { name } = await req.json()
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const [updatedKey] = await db
            .update(userApiKeys)
            .set({ name, updatedAt: new Date() })
            .where(and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId)))
            .returning()

        if (!updatedKey) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

        return NextResponse.json(updatedKey)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const deleted = await db
            .delete(userApiKeys)
            .where(and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId)))
            .returning()

        if (!deleted.length) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
