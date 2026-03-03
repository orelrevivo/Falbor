import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { messages } from "@/config/schema"
import { eq, asc } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    try {
        const projectMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.projectId, id))
            .orderBy(asc(messages.createdAt))

        return NextResponse.json(projectMessages)
    } catch (error) {
        console.error("Failed to fetch messages:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
