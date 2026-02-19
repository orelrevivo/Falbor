"use server"

import { auth } from "@clerk/nextjs/server"
import { neon } from "@neondatabase/serverless"
import { userMcpConnections } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"

/**
 * Verifies if an API key or token is valid for the given provider
 */
async function verifyMcpToken(name: string, data: { apiKey?: string; accessToken?: string }) {
    const cred = data.apiKey || data.accessToken
    if (!cred) return { valid: false, error: "Missing credentials" }

    try {
        if (name.toLowerCase() === "github") {
            const res = await fetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${cred}`, "Accept": "application/vnd.github+json" }
            })
            if (!res.ok) return { valid: false, error: "Invalid GitHub token" }
            const userData = await res.json()
            return { valid: true, metadata: { login: userData.login, id: userData.id } }
        }

        // For other providers, we can add specific verification logic here.
        // For now, we assume success if a key is provided and no specific check is defined.
        return { valid: true }
    } catch (err) {
        return { valid: false, error: "Connection handshake failed" }
    }
}

export async function getMcpConnections() {
    const { userId } = await auth()
    if (!userId) return []

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    try {
        const connections = await db.select()
            .from(userMcpConnections)
            .where(eq(userMcpConnections.userId, userId))

        return connections
    } catch (error) {
        console.error("Failed to fetch MCP connections:", error)
        return []
    }
}

export async function saveMcpConnection(data: {
    type: string,
    name: string,
    apiKey?: string,
    accessToken?: string,
    metadata?: Record<string, any>
}) {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Unauthorized" }

    // REAL VERIFICATION STEP
    const verification = await verifyMcpToken(data.name, data)
    if (!verification.valid) {
        return { success: false, error: verification.error }
    }

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    const finalMetadata = { ...(data.metadata || {}), ...(verification.metadata || {}) }

    try {
        // Check if connection already exists for this type/name
        const existing = await db.select()
            .from(userMcpConnections)
            .where(
                and(
                    eq(userMcpConnections.userId, userId),
                    eq(userMcpConnections.name, data.name)
                )
            )

        if (existing.length > 0) {
            await db.update(userMcpConnections)
                .set({
                    ...data,
                    metadata: finalMetadata,
                    updatedAt: new Date(),
                })
                .where(eq(userMcpConnections.id, existing[0].id))
        } else {
            await db.insert(userMcpConnections)
                .values({
                    ...data,
                    metadata: finalMetadata,
                    userId,
                })
        }

        return { success: true }
    } catch (error) {
        console.error("Failed to save MCP connection:", error)
        return { success: false, error: "Failed to save connection" }
    }
}

export async function deleteMcpConnection(id: string) {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Unauthorized" }

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    try {
        await db.delete(userMcpConnections)
            .where(
                and(
                    eq(userMcpConnections.id, id),
                    eq(userMcpConnections.userId, userId)
                )
            )

        return { success: true }
    } catch (error) {
        console.error("Failed to delete MCP connection:", error)
        return { success: false, error: "Failed to delete connection" }
    }
}
