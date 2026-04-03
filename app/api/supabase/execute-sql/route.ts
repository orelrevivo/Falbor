// app/api/supabase/execute-sql/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { userSupabaseConnections } from "@/config/schema"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  context: { params?: {} }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sql, projectId, fileName } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "SQL content is required" }, { status: 400 })
    }

    let targetProjectRef = ""
    let targetAccessToken = ""

    // 1. Try to get project-specific credentials (managed database)
    if (projectId) {
      const { projectSupabase } = await import("@/config/schema")
      const [supabaseConfig] = await db
        .select()
        .from(projectSupabase)
        .where(eq(projectSupabase.projectId, projectId))

      if (supabaseConfig?.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
        targetProjectRef = supabaseConfig.supabaseProjectRef
        targetAccessToken = process.env.SUPABASE_ACCESS_TOKEN
      }
    }

    // 2. Fallback to global user connection
    if (!targetProjectRef || !targetAccessToken) {
      const [connection] = await db
        .select()
        .from(userSupabaseConnections)
        .where(eq(userSupabaseConnections.userId, userId))
        .limit(1)

      if (connection && connection.isActive && connection.accessToken && connection.selectedProjectRef) {
        targetProjectRef = connection.selectedProjectRef
        targetAccessToken = connection.accessToken
      }
    }

    if (!targetProjectRef || !targetAccessToken) {
      return NextResponse.json(
        { error: "No active Supabase connection or project found. Please connect your project or sign in to Supabase." },
        { status: 401 },
      )
    }

    // Execute SQL using Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${targetProjectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${targetAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Supabase API error:", errorData)
      return NextResponse.json(
        { error: errorData.message || errorData.error || "Failed to execute SQL on Supabase" },
        { status: response.status },
      )
    }

    const result = await response.json()

    // 4. Save the SQL file to the database for the SQL Editor view
    if (projectId && fileName) {
      const { projectSupabaseSqlFiles } = await import("@/config/schema")
      try {
        await db.insert(projectSupabaseSqlFiles).values({
          projectId,
          fileName,
          content: sql,
        })
      } catch (dbError) {
        console.error("Failed to save SQL migration to database:", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "SQL executed successfully",
      result,
    })
  } catch (error: any) {
    console.error("Execute SQL error:", error)
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
