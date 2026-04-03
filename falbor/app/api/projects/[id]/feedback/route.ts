import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectFeedback, projects, projectSupabase, projectNeon } from "@/config/schema"
import { eq, desc, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: projectId } = await params

  // Verify project ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Determine if Supabase or Neon is connected for this project
  const [supabaseConfig] = await db
    .select()
    .from(projectSupabase)
    .where(eq(projectSupabase.projectId, projectId))

  const [neonConfig] = await db
    .select()
    .from(projectNeon)
    .where(eq(projectNeon.projectId, projectId))

  let feedbackList: any[] = []

  // Try Neon
  if (neonConfig && neonConfig.databaseUrl) {
    try {
      const { executeNeonSql } = await import("@/lib/neon/management-api")
      const rows = await executeNeonSql(neonConfig.databaseUrl, "SELECT * FROM user_feedback ORDER BY created_at DESC")
      if (Array.isArray(rows)) {
        feedbackList = rows.map((row: any) => ({
          id: row.id,
          projectId: projectId,
          userId: row.user_id,
          email: row.email,
          message: row.message,
          status: row.status,
          reply: row.reply,
          createdAt: row.created_at,
          updatedAt: row.created_at || new Date().toISOString()
        }))
      }
    } catch (err) {
      console.warn("Could not fetch feedback from Neon instance", err)
    }
  }

  // Try to fetch from user's managed Supabase instance if connected
  if (supabaseConfig && supabaseConfig.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
    try {
      const { getProjectTableRows } = await import("@/lib/supabase/management-api")
      const rows = await getProjectTableRows(supabaseConfig.supabaseProjectRef, "user_feedback")
      if (Array.isArray(rows)) {
        feedbackList = rows.map((row) => ({
          id: row.id,
          projectId: projectId,
          userId: row.user_id,
          email: row.email,
          message: row.message,
          status: row.status,
          reply: row.reply,
          createdAt: row.created_at,
          updatedAt: row.created_at || new Date().toISOString()
        }))
      }
    } catch (err) {
      console.warn("Could not fetch feedback from managed Supabase instance", err)
    }
  } else if (supabaseConfig && supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
      try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseAdmin = createClient(supabaseConfig.supabaseUrl, supabaseConfig.serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data, error } = await supabaseAdmin.from("user_feedback").select("*").order("created_at", { ascending: false });
          if (data && !error) {
              feedbackList = data.map(row => ({
                  id: row.id,
                  projectId: projectId,
                  userId: row.user_id,
                  email: row.email,
                  message: row.message,
                  status: row.status,
                  reply: row.reply,
                  createdAt: row.created_at,
                  updatedAt: row.created_at || new Date().toISOString()
              }));
          }
      } catch (err) {
          console.warn("Could not fetch feedback from custom Supabase instance", err);
      }
  }

  // Fallback to Falbor central Drizzle DB for legacy/host feedback
  if (feedbackList.length === 0) {
    const drizzleFeedback = await db
      .select()
      .from(projectFeedback)
      .where(eq(projectFeedback.projectId, projectId))
      .orderBy(desc(projectFeedback.createdAt))
    feedbackList = drizzleFeedback
  }

  return NextResponse.json(feedbackList)
}
