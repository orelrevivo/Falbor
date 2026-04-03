import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectSupabase, projectNeon } from "@/config/schema"
import { eq } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← params must be a Promise
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await context.params
    const { sql, fileName } = await req.json()

    if (!sql) {
      return NextResponse.json(
        { error: "Missing sql content" },
        { status: 400 }
      )
    }

    // 1. Try Supabase first
    const [projSupa] = await db
      .select()
      .from(projectSupabase)
      .where(eq(projectSupabase.projectId, projectId))

    let targetProjectRef = ""
    let targetAccessToken = ""

    if (projSupa && projSupa.supabaseProjectRef && process.env.SUPABASE_ACCESS_TOKEN) {
      targetProjectRef = projSupa.supabaseProjectRef
      targetAccessToken = process.env.SUPABASE_ACCESS_TOKEN
    } else {
      const { userSupabaseConnections } = await import("@/config/schema")
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

    if (targetProjectRef && targetAccessToken) {
      const res = await fetch(
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        return NextResponse.json(
          { error: errData.message || "Failed to execute query" },
          { status: res.status }
        )
      }

      // Save to SQL history
      const { projectSupabaseSqlFiles } = await import("@/config/schema")
      await db.insert(projectSupabaseSqlFiles).values({
        projectId,
        fileName: fileName || `migration_${Date.now()}.sql`,
        content: sql,
      })

      const result = await res.json()
      return NextResponse.json({ success: true, result })
    }

    // 2. Try Neon if Supabase not found
    const [neonProj] = await db
      .select()
      .from(projectNeon)
      .where(eq(projectNeon.projectId, projectId))

    if (neonProj && neonProj.databaseUrl) {
      try {
        const { executeNeonSql } = await import("@/lib/neon/management-api")
        const result = await executeNeonSql(neonProj.databaseUrl, sql)

        // Save to SQL history
        const { projectNeonSqlFiles } = await import("@/config/schema")
        await db.insert(projectNeonSqlFiles).values({
          projectId,
          fileName: fileName || `schema_${Date.now()}.sql`,
          content: sql,
        })

        return NextResponse.json({ success: true, result })
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to execute Neon SQL" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: "No database (Supabase or Neon) connected to this project" },
      { status: 404 }
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("Execute SQL error:", error)
    return NextResponse.json(
      { error: error.message || "Unexpected error occurred" },
      { status: 500 }
    )
  }
}
