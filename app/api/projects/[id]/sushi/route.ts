import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSushi, projects } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { id: projectId } = await params

  try {
    const sushi = await db
      .select()
      .from(projectSushi)
      .where(and(eq(projectSushi.projectId, projectId), eq(projectSushi.userId, userId)))
      .then((rows) => rows[0])

    return NextResponse.json(sushi ? {
      ...sushi,
      questions: sushi.questions || [],
      posts: sushi.posts || [],
      platforms: sushi.platforms || ["Instagram", "LinkedIn", "TikTok"],
      status: sushi.status || "idle"
    } : { status: "idle", questions: [], posts: [], platforms: ["Instagram", "LinkedIn", "TikTok"] })
  } catch (error) {
    console.error("[SocialContent] GET error:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { id: projectId } = await params
  const body = await req.json()

  try {
    const { id, createdAt, updatedAt, userId: bodyUserId, projectId: bodyProjectId, ...updateData } = body

    const existing = await db
      .select()
      .from(projectSushi)
      .where(and(eq(projectSushi.projectId, projectId), eq(projectSushi.userId, userId)))
      .then((rows) => rows[0])

    if (existing) {
      const [updated] = await db
        .update(projectSushi)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(projectSushi.id, existing.id))
        .returning()
      return NextResponse.json(updated)
    } else {
      const [inserted] = await db
        .insert(projectSushi)
        .values({
          projectId,
          userId,
          ...updateData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      return NextResponse.json(inserted)
    }
  } catch (error) {
    console.error("[SocialContent] POST error:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
