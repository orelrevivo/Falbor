import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectNeon } from "@/config/schema"
import { eq } from "drizzle-orm"
import { executeNeonSql } from "@/lib/neon/management-api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

    if (!project || project.userId !== userId) {
      return Response.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const [neonConfig] = await db
      .select()
      .from(projectNeon)
      .where(eq(projectNeon.projectId, projectId))

    if (!neonConfig) {
      return Response.json({ success: true, users: [] })
    }

    // Check if a 'users' table exists
    const tableCheck = await executeNeonSql(
      neonConfig.databaseUrl,
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'"
    )

    if (tableCheck.length === 0) {
      return Response.json({ success: true, users: [], message: "No users table found" })
    }

    // Fetch users (assuming common columns like id, email, name, created_at)
    const usersRaw = await executeNeonSql(
      neonConfig.databaseUrl,
      "SELECT * FROM users LIMIT 100"
    )

    const users = usersRaw.map((u: any) => ({
      id: u.id || u.user_id || "",
      email: u.email || "",
      name: u.name || u.full_name || u.username || null,
      role: u.role || "user",
      createdAt: u.created_at || u.createdAt || new Date().toISOString(),
      lastSignIn: u.last_login || u.last_sign_in || null,
      provider: "neon-db",
    }))

    return Response.json({
      success: true,
      users,
    })
  } catch (error: any) {
    console.error("[Neon Users] Error:", error)
    return Response.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
