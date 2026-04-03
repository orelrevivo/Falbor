import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { projects, userGithubConnections } from "@/config/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    try {
        // 1. Check if user has a GitHub connection
        const [githubConnection] = await db
            .select()
            .from(userGithubConnections)
            .where(and(eq(userGithubConnections.userId, userId), eq(userGithubConnections.isActive, true)))

        if (!githubConnection) {
            return NextResponse.json({ error: "No active GitHub connection found. Please connect your GitHub account first." }, { status: 400 })
        }

        // 2. Update project to mark as adopted
        const [updatedProject] = await db
            .update(projects)
            .set({ isGitAdopted: true })
            .where(and(eq(projects.id, id), eq(projects.userId, userId)))
            .returning()

        if (!updatedProject) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true, project: updatedProject })
    } catch (error) {
        console.error("[GIT_ADOPT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
