
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { userMcpConnections } from "@/config/schema"
import { eq, and } from "drizzle-orm"

/**
 * Interface for tool execution results
 */
export interface ToolResult {
    success: boolean
    data?: any
    error?: string
}

/**
 * Fetches the access token for a specific MCP provider
 */
async function getMcpToken(userId: string, providerName: string, forceBotToken: boolean = false) {
    const [conn] = await db.select()
        .from(userMcpConnections)
        .where(
            and(
                eq(userMcpConnections.userId, userId),
                eq(userMcpConnections.isActive, true)
            )
        )
        // Filter in memory for provider name (case insensitive) to be safe
        .then(results => results.filter(c =>
            c.name.toLowerCase() === providerName.toLowerCase() ||
            c.type.toLowerCase() === providerName.toLowerCase()
        ))

    if (!conn) return null

    // For Discord, prioritize botToken for specific actions if provided in metadata
    if (providerName.toLowerCase() === 'discord' && forceBotToken) {
        const metadata = conn.metadata as any
        if (metadata?.botToken) return metadata.botToken
    }

    return conn?.accessToken || conn?.apiKey || null
}

/**
 * Discord MCP Handlers
 */
export const discordActions = {
    async getMessages(userId: string, channelId: string, limit: number = 10): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'discord')
        if (!token) return { success: false, error: "Discord not connected" }

        try {
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { messages: data } }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    },

    async sendMessage(userId: string, channelId: string, content: string): Promise<ToolResult> {
        // MUST use Bot Token for sending messages
        const token = await getMcpToken(userId, 'discord', true)
        if (!token) return { success: false, error: "Discord Bot Token not found. Please connect a bot token in MCP settings to send messages." }

        try {
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    },

    async deleteMessage(userId: string, channelId: string, messageId: string): Promise<ToolResult> {
        // MUST use Bot Token for deleting messages
        const token = await getMcpToken(userId, 'discord', true)
        if (!token) return { success: false, error: "Discord Bot Token not found." }

        try {
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok && res.status !== 204) throw new Error(await res.text())
            return { success: true, data: { status: "Deleted" } }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    },

    async createDM(userId: string, recipientId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'discord')
        if (!token) return { success: false, error: "Discord not connected" }

        try {
            const res = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipient_id: recipientId })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { channel_id: data.id, recipient_id: recipientId } }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    },

    async getGuilds(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'discord')
        if (!token) return { success: false, error: "Discord not connected" }

        try {
            const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { guilds: data } }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    },

    async getChannels(userId: string, guildId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'discord')
        if (!token) return { success: false, error: "Discord not connected" }

        try {
            const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { channels: data } }
        } catch (err: any) {
            return { success: false, error: `Discord API Error: ${err.message}` }
        }
    }
}

/**
 * Gmail MCP Handlers
 */
export const gmailActions = {
    async listMessages(userId: string, q: string = '', maxResults: number = 10): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'gmail')
        if (!token) return { success: false, error: "Gmail not connected" }

        try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data }
        } catch (err: any) {
            return { success: false, error: `Gmail API Error: ${err.message}` }
        }
    },

    async getMessage(userId: string, id: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'gmail')
        if (!token) return { success: false, error: "Gmail not connected" }

        try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data }
        } catch (err: any) {
            return { success: false, error: `Gmail API Error: ${err.message}` }
        }
    },

    async deleteMessage(userId: string, id: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'gmail')
        if (!token) return { success: false, error: "Gmail not connected" }

        try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok && res.status !== 204) throw new Error(await res.text())
            return { success: true, data: { status: "Deleted" } }
        } catch (err: any) {
            return { success: false, error: `Gmail API Error: ${err.message}` }
        }
    },

    async sendMessage(userId: string, to: string, subject: string, body: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'gmail')
        if (!token) return { success: false, error: "Gmail not connected" }

        try {
            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                body,
            ];
            const message = messageParts.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encodedMessage })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data }
        } catch (err: any) {
            return { success: false, error: `Gmail API Error: ${err.message}` }
        }
    }
}
