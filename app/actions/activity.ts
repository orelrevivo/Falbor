"use server"

import { auth } from "@clerk/nextjs/server"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { messages, projects } from "@/config/schema"
import { eq, and, sql } from "drizzle-orm"

export async function getUserActivity(userId: string, year: number) {
    if (!userId) {
        return []
    }

    const sqlConn = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sqlConn)

    try {
        const startDate = new Date(year, 0, 1).toISOString()
        const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString()

        // Query to get count of messages per day for the user
        // Join messages -> projects to get userId
        const result = await db
            .select({
                date: sql<string>`to_char(${messages.createdAt}, 'YYYY-MM-DD')`,
                count: sql<number>`count(*)::int`,
            })
            .from(messages)
            .innerJoin(projects, eq(messages.projectId, projects.id))
            .where(
                and(
                    eq(projects.userId, userId),
                    eq(messages.role, 'user'),
                    sql`${messages.createdAt} >= ${startDate}::timestamp`,
                    sql`${messages.createdAt} <= ${endDate}::timestamp`
                )
            )
            .groupBy(sql`to_char(${messages.createdAt}, 'YYYY-MM-DD')`)

        return result
    } catch (error) {
        console.error("Failed to fetch user activity:", error)
        return []
    }
}
