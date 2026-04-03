import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { plugins } from "@/config/schema"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        
        const newPlugin = await db.insert(plugins).values({
            userId: body.userId,
            creatorName: body.creatorName,
            name: body.name,
            tagline: body.tagline,
            summary: body.summary,
            description: body.description,
            reviewInstructions: body.reviewInstructions,
            isPaid: body.isPaid,
            categories: body.categories,
            visuals: body.visuals,
            zipFileUrl: body.zipFileUrl || null,
            files: body.files || [],
            code: body.code || null,
        }).returning()

        return NextResponse.json(newPlugin[0], { status: 201 })
    } catch (error) {
        console.error("Failed to create plugin", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
