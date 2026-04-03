import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { deployments, projects } from "@/config/schema"
import { eq, and } from "drizzle-orm"

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params
        const body = await req.json()

        // Verify project ownership
        const [project] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
            .limit(1)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Get existing deployment
        const [existing] = await db
            .select()
            .from(deployments)
            .where(eq(deployments.projectId, projectId))
            .limit(1)

        if (!existing) {
            return NextResponse.json({ error: "No deployment found. Publish first." }, { status: 404 })
        }

        // Validate favicon size (max 64KB base64)
        if (body.favicon && body.favicon.length > 87382) {
            // ~64KB in base64
            return NextResponse.json({ error: "Favicon too large. Max 64KB." }, { status: 400 })
        }

        // Validate site title length
        if (body.siteTitle && body.siteTitle.length > 100) {
            return NextResponse.json({ error: "Site title too long. Max 100 characters." }, { status: 400 })
        }

        // Validate description length
        if (body.siteDescription && body.siteDescription.length > 500) {
            return NextResponse.json({ error: "Description too long. Max 500 characters." }, { status: 400 })
        }

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        }

        if (body.favicon !== undefined) updateData.favicon = body.favicon
        if (body.siteTitle !== undefined) updateData.siteTitle = body.siteTitle
        if (body.siteDescription !== undefined) updateData.siteDescription = body.siteDescription

        const [updated] = await db
            .update(deployments)
            .set(updateData)
            .where(eq(deployments.id, existing.id))
            .returning()

        return NextResponse.json({
            deployment: {
                id: updated.id,
                favicon: updated.favicon,
                siteTitle: updated.siteTitle,
                siteDescription: updated.siteDescription,
                updatedAt: updated.updatedAt,
            },
        })
    } catch (error) {
        console.error("[DEPLOYMENT META PUT]", error)
        return NextResponse.json({ error: "Failed to update site meta" }, { status: 500 })
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params

        const [project] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
            .limit(1)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        const [dep] = await db
            .select()
            .from(deployments)
            .where(eq(deployments.projectId, projectId))
            .limit(1)

        if (!dep) {
            return NextResponse.json({ deployment: null })
        }

        return NextResponse.json({
            deployment: {
                favicon: dep.favicon,
                siteTitle: dep.siteTitle,
                siteDescription: dep.siteDescription,
            },
        })
    } catch (error) {
        console.error("[DEPLOYMENT META GET]", error)
        return NextResponse.json({ error: "Failed to fetch site meta" }, { status: 500 })
    }
}
