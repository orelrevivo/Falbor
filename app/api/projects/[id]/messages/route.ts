import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { messages, projects, projectCollaborators } from "@/config/schema"
import { eq, asc, and } from "drizzle-orm"
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
        // Verify access (including collaborators)
        const [access] = await db
            .select({
                project: projects,
                collaborator: projectCollaborators
            })
            .from(projects)
            .leftJoin(
                projectCollaborators,
                and(
                    eq(projectCollaborators.projectId, projects.id),
                    eq(projectCollaborators.userId, userId),
                    eq(projectCollaborators.status, 'accepted')
                )
            )
            .where(eq(projects.id, id))
            .limit(1)

        if (!access) {
            return new NextResponse("Project not found", { status: 404 })
        }

        const isOwner = access.project.userId === userId;
        const isCollaborator = !!access.collaborator;

        if (!isOwner && !isCollaborator) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

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
