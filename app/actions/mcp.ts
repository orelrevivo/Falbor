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

        if (name.toLowerCase() === "gmail" || name.toLowerCase() === "google") {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${cred}` }
            })
            if (!res.ok) return { valid: false, error: "Invalid Google token" }
            const userData = await res.json()
            return { valid: true, metadata: { email: userData.email, name: userData.name, sub: userData.sub } }
        }

        if (name.toLowerCase() === "discord") {
            const res = await fetch("https://discord.com/api/users/@me", {
                headers: { Authorization: `Bearer ${cred}` }
            })
            if (!res.ok) return { valid: false, error: "Invalid Discord token" }
            const userData = await res.json()
            return { valid: true, metadata: { username: userData.username, id: userData.id, discriminator: userData.discriminator } }
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
    icon?: string,
    isCustom?: boolean,
    config?: any,
    metadata?: Record<string, any>
}) {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Unauthorized" }

    // REAL VERIFICATION STEP - Skip for custom API keys for now or handle appropriately
    let verification: { valid: boolean; metadata?: any; error?: string } = { valid: true, metadata: {} }
    if (!data.isCustom && (data.name.toLowerCase() === 'github' || data.name.toLowerCase() === 'gmail' || data.name.toLowerCase() === 'discord')) {
        const result = await verifyMcpToken(data.name, data)
        verification = result
        if (!verification.valid) {
            return { success: false, error: verification.error || "Verification failed" }
        }
    }

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    const finalMetadata = { ...(data.metadata || {}), ...(verification.metadata || {}) }

    try {
        // Check if connection already exists for this name (if not custom) or unique custom name
        const existing = await db.select()
            .from(userMcpConnections)
            .where(
                and(
                    eq(userMcpConnections.userId, userId),
                    eq(userMcpConnections.name, data.name)
                )
            )

        if (existing.length > 0) {
            // Merge metadata to prevent losing tokens
            const mergedMetadata = {
                ...(existing[0].metadata as any || {}),
                ...finalMetadata
            }
            await db.update(userMcpConnections)
                .set({
                    ...data,
                    metadata: mergedMetadata,
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

/**
 * Save or update a Discord Bot Token inside an existing MCP connection's metadata.
 * OAuth tokens can only read account info; a Bot Token is required to SEND messages.
 */
export async function saveBotToken(connectionId: string, botToken: string) {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Unauthorized" }

    const sql = neon(process.env.NEON_NEON_DATABASE_URL!)
    const db = drizzle(sql)

    try {
        const [existing] = await db.select()
            .from(userMcpConnections)
            .where(
                and(
                    eq(userMcpConnections.id, connectionId),
                    eq(userMcpConnections.userId, userId)
                )
            )

        if (!existing) return { success: false, error: "Connection not found" }

        const mergedMetadata = {
            ...(existing.metadata as any || {}),
            botToken,
        }

        await db.update(userMcpConnections)
            .set({ metadata: mergedMetadata, updatedAt: new Date() })
            .where(eq(userMcpConnections.id, connectionId))

        return { success: true }
    } catch (error) {
        console.error("Failed to save bot token:", error)
        return { success: false, error: "Failed to save bot token" }
    }
}
