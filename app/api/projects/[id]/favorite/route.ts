import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/config/db"
import { favorites } from "@/config/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params
        if (!projectId) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 })
        }

        // Check if already favorited
        const existingFavorite = await db.query.favorites.findFirst({
            where: and(
                eq(favorites.projectId, projectId),
                eq(favorites.userId, userId)
            ),
        })

        if (existingFavorite) {
            // Remove from favorites
            await db
                .delete(favorites)
                .where(
                    and(
                        eq(favorites.projectId, projectId),
                        eq(favorites.userId, userId)
                    )
                )
            return NextResponse.json({ isFavorite: false })
        } else {
            // Add to favorites
            await db.insert(favorites).values({
                userId,
                projectId,
            })
            return NextResponse.json({ isFavorite: true })
        }
    } catch (error) {
        console.error("[Favorite API] Error:", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
