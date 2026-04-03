import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projects, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"

interface UserInfo {
  id: string
  email?: string | null
  createdAt: string | null
  updatedAt: string | null
  invitedAt: string | null
  confirmationSentAt: string | null
  confirmedAt: string | null
  lastSignIn: string | null
  confirmed: boolean
  banned: boolean
  provider?: string | null
}

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

    const [supabaseConfig] = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))

    if (!supabaseConfig) {
      return Response.json({ success: true, users: [] })
    }

    let users: UserInfo[] = []

    if (supabaseConfig.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
      // Use Management API for managed projects (more reliable)
      const { getProjectUsers } = await import("@/lib/supabase/management-api")
      const rawUsers = await getProjectUsers(supabaseConfig.supabaseProjectRef)
      users = rawUsers.map((user: any) => ({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        updatedAt: user.updated_at ?? null,
        invitedAt: user.invited_at ?? null,
        confirmationSentAt: user.confirmation_sent_at ?? null,
        confirmedAt: user.confirmed_at ?? null,
        lastSignIn: user.last_sign_in_at ?? null,
        confirmed: !!user.confirmed_at,
        banned: !!user.banned,
        provider: user.provider ?? null,
      }))
    } else if (supabaseConfig.serviceRoleKey && supabaseConfig.supabaseUrl) {
      // Fallback to supabase-js for custom projects
      const supabaseAdmin = createClient(supabaseConfig.supabaseUrl, supabaseConfig.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { data, error } = await supabaseAdmin.auth.admin.listUsers()
      if (error) throw error

      users = data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        updatedAt: user.updated_at ?? null,
        invitedAt: user.invited_at ?? null,
        confirmationSentAt: user.confirmation_sent_at ?? null,
        confirmedAt: user.confirmed_at ?? null,
        lastSignIn: user.last_sign_in_at ?? null,
        confirmed: !!user.confirmed_at,
        banned: !!(user as any).banned_until,
        provider: user.app_metadata?.provider ?? null,
      }))
    }

    return Response.json(
      {
        success: true,
        users,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[Supabase Users] Error:", error)
    return Response.json(
      { success: false, error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

/**
 * Handle user mutations (actions like ban, delete, reset)
 * Using POST for actions to handle wider compatibility
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { userId: authUserId } = await auth()

  if (!authUserId) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, email, password, userId } = body

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== authUserId) {
      return Response.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const [supabaseConfig] = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))

    if (!supabaseConfig?.serviceRoleKey || !supabaseConfig?.supabaseUrl) {
      throw new Error("Supabase credentials not found for this project")
    }

    const supabaseAdmin = createClient(supabaseConfig.supabaseUrl, supabaseConfig.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    let result
    if (action === "create") {
      if (!email || !password) throw new Error("Missing email or password")
      result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
    } else if (action === "delete") {
      if (!userId) throw new Error("Missing userId")
      result = await supabaseAdmin.auth.admin.deleteUser(userId)
    } else if (action === "ban") {
      if (!userId) throw new Error("Missing userId")
      result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "87600h", // 10 years
      })
    } else if (action === "unban") {
      if (!userId) throw new Error("Missing userId")
      result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      })
    } else if (action === "reset_password") {
      if (!email) throw new Error("Missing email")
      // Generate recovery link (Supabase will handle sending if configured, or we just provide the info)
      result = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      })
    } else {
      return Response.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    if (result.error) throw result.error

    return Response.json({ success: true, message: `User action ${action} executed successfully` })

  } catch (error: any) {
    console.error("[Supabase User Mutation] Error:", error)
    return Response.json(
      { success: false, error: error.message || "Action failed" },
      { status: 500 }
    )
  }
}
