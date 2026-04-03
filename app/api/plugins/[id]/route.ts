import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { plugins } from "@/config/schema"
import { eq } from "drizzle-orm"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const pluginData = await db.select().from(plugins).where(eq(plugins.id, resolvedParams.id))
        
        if (!pluginData.length) {
            return NextResponse.json({ error: "Plugin not found" }, { status: 404 })
        }

        return NextResponse.json(pluginData[0])
    } catch (error) {
        console.error("Failed to fetch plugin", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await import("@clerk/nextjs/server").then(m => m.auth())
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const resolvedParams = await params;
        const body = await req.json()

        const [existing] = await db.select().from(plugins).where(eq(plugins.id, resolvedParams.id))
        if (!existing) return NextResponse.json({ error: "Plugin not found" }, { status: 404 })
        if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        const updated = await db.update(plugins)
            .set({
                name: body.name,
                tagline: body.tagline,
                summary: body.summary,
                description: body.description,
                reviewInstructions: body.reviewInstructions,
                isPaid: body.isPaid,
                categories: body.categories,
                visuals: body.visuals,
                files: body.files,
                code: body.code,
                updatedAt: new Date()
            })
            .where(eq(plugins.id, resolvedParams.id))
            .returning()

        return NextResponse.json(updated[0])
    } catch (error) {
        console.error("Failed to update plugin", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await import("@clerk/nextjs/server").then(m => m.auth())
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const resolvedParams = await params;
        const [existing] = await db.select().from(plugins).where(eq(plugins.id, resolvedParams.id))
        
        if (!existing) return NextResponse.json({ error: "Plugin not found" }, { status: 404 })
        if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        await db.delete(plugins).where(eq(plugins.id, resolvedParams.id))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete plugin", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
