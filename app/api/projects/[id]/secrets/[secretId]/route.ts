import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSecrets } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; secretId: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId, secretId } = await params

    try {
        await db
            .delete(projectSecrets)
            .where(
                and(
                    eq(projectSecrets.id, secretId),
                    eq(projectSecrets.projectId, projectId),
                    eq(projectSecrets.userId, userId)
                )
            )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[SECRETS_DELETE]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
