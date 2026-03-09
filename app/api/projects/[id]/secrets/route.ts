import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSecrets } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    try {
        const secrets = await db
            .select()
            .from(projectSecrets)
            .where(
                and(
                    eq(projectSecrets.projectId, projectId),
                    eq(projectSecrets.userId, userId)
                )
            )

        return NextResponse.json(secrets)
    } catch (error) {
        console.error("[SECRETS_GET]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const { name, value } = await req.json()

    if (!name || !value) {
        return NextResponse.json({ error: "Name and value are required" }, { status: 400 })
    }

    try {
        const [secret] = await db
            .insert(projectSecrets)
            .values({
                projectId,
                userId,
                name,
                value,
            })
            .returning()

        return NextResponse.json(secret)
    } catch (error) {
        console.error("[SECRETS_POST]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
