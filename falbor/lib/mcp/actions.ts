
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

/**
 * GitHub MCP Handlers
 */
export const githubActions = {
    async getUser(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { 
                login: data.login,
                name: data.name,
                email: data.email,
                avatar_url: data.avatar_url,
                bio: data.bio,
                public_repos: data.public_repos,
                followers: data.followers,
                following: data.following
            }}
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    },

    async listRepos(userId: string, type: string = 'owner', sort: string = 'updated'): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch(`https://api.github.com/user/repos?type=${type}&sort=${sort}&per_page=30`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { 
                repos: data.map((repo: any) => ({
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    private: repo.private,
                    html_url: repo.html_url,
                    language: repo.language,
                    stargazers_count: repo.stargazers_count,
                    forks_count: repo.forks_count,
                    updated_at: repo.updated_at
                }))
            }}
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    },

    async getRepo(userId: string, owner: string, repo: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                id: data.id,
                name: data.name,
                full_name: data.full_name,
                description: data.description,
                private: data.private,
                html_url: data.html_url,
                language: data.language,
                stargazers_count: data.stargazers_count,
                forks_count: data.forks_count,
                open_issues_count: data.open_issues_count,
                default_branch: data.default_branch,
                created_at: data.created_at,
                updated_at: data.updated_at
            }}
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    },

    async createRepo(userId: string, name: string, description: string = '', isPrivate: boolean = false): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description, private: isPrivate })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                id: data.id,
                name: data.name,
                full_name: data.full_name,
                html_url: data.html_url,
                clone_url: data.clone_url
            }}
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    },

    async getRepoContents(userId: string, owner: string, repo: string, path: string = ''): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: Array.isArray(data) ? { contents: data } : data }
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    },

    async createIssue(userId: string, owner: string, repo: string, title: string, body: string = ''): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'github')
        if (!token) return { success: false, error: "GitHub not connected" }

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, body })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                id: data.id,
                number: data.number,
                title: data.title,
                html_url: data.html_url,
                state: data.state
            }}
        } catch (err: any) {
            return { success: false, error: `GitHub API Error: ${err.message}` }
        }
    }
}

/**
 * LinkedIn MCP Handlers
 */
export const linkedinActions = {
    async getProfile(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'linkedin')
        if (!token) return { success: false, error: "LinkedIn not connected" }

        try {
            const res = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            
            // Get email separately
            const emailRes = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const emailData = emailRes.ok ? await emailRes.json() : null
            
            return { success: true, data: {
                id: data.id,
                firstName: data.firstName?.localized?.en_US,
                lastName: data.lastName?.localized?.en_US,
                email: emailData?.elements?.[0]?.['handle~']?.emailAddress,
                profilePicture: data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
            }}
        } catch (err: any) {
            return { success: false, error: `LinkedIn API Error: ${err.message}` }
        }
    },

    async sharePost(userId: string, text: string, visibility: string = 'PUBLIC'): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'linkedin')
        if (!token) return { success: false, error: "LinkedIn not connected" }

        try {
            const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                body: JSON.stringify({
                    author: `urn:li:person:me`,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: { text },
                            shareMediaCategory: 'NONE'
                        }
                    },
                    visibility: {
                        'com.linkedin.ugc.MemberNetworkVisibility': visibility
                    }
                })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { id: data.id, status: 'published' }}
        } catch (err: any) {
            return { success: false, error: `LinkedIn API Error: ${err.message}` }
        }
    }
}

/**
 * Twitter/X MCP Handlers
 */
export const twitterActions = {
    async getMe(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'twitter')
        if (!token) return { success: false, error: "Twitter not connected" }

        try {
            const res = await fetch('https://api.twitter.com/2/users/me?user.fields=description,public_metrics,profile_image_url,verified', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: data.data }
        } catch (err: any) {
            return { success: false, error: `Twitter API Error: ${err.message}` }
        }
    },

    async getUserTweets(userId: string, twitterUserId: string, maxResults: number = 10): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'twitter')
        if (!token) return { success: false, error: "Twitter not connected" }

        try {
            const res = await fetch(`https://api.twitter.com/2/users/${twitterUserId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: data.data }
        } catch (err: any) {
            return { success: false, error: `Twitter API Error: ${err.message}` }
        }
    },

    async createTweet(userId: string, text: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'twitter')
        if (!token) return { success: false, error: "Twitter not connected" }

        try {
            const res = await fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: data.data }
        } catch (err: any) {
            return { success: false, error: `Twitter API Error: ${err.message}` }
        }
    },

    async deleteTweet(userId: string, tweetId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'twitter')
        if (!token) return { success: false, error: "Twitter not connected" }

        try {
            const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok && res.status !== 204) throw new Error(await res.text())
            return { success: true, data: { deleted: true, id: tweetId }}
        } catch (err: any) {
            return { success: false, error: `Twitter API Error: ${err.message}` }
        }
    }
}

/**
 * Slack MCP Handlers
 */
export const slackActions = {
    async getUserInfo(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'slack')
        if (!token) return { success: false, error: "Slack not connected" }

        try {
            const res = await fetch('https://slack.com/api/users.profile.get', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            return { success: true, data: data.profile }
        } catch (err: any) {
            return { success: false, error: `Slack API Error: ${err.message}` }
        }
    },

    async listChannels(userId: string, types: string = 'public_channel,private_channel'): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'slack')
        if (!token) return { success: false, error: "Slack not connected" }

        try {
            const res = await fetch(`https://slack.com/api/conversations.list?types=${types}&limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            return { success: true, data: { 
                channels: data.channels.map((ch: any) => ({
                    id: ch.id,
                    name: ch.name,
                    is_private: ch.is_private,
                    num_members: ch.num_members,
                    topic: ch.topic?.value,
                    purpose: ch.purpose?.value
                }))
            }}
        } catch (err: any) {
            return { success: false, error: `Slack API Error: ${err.message}` }
        }
    },

    async postMessage(userId: string, channel: string, text: string, threadTs?: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'slack')
        if (!token) return { success: false, error: "Slack not connected" }

        try {
            const body: any = { channel, text }
            if (threadTs) body.thread_ts = threadTs
            
            const res = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            return { success: true, data: {
                ts: data.ts,
                channel: data.channel,
                text: data.message?.text
            }}
        } catch (err: any) {
            return { success: false, error: `Slack API Error: ${err.message}` }
        }
    },

    async getChannelHistory(userId: string, channel: string, limit: number = 20): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'slack')
        if (!token) return { success: false, error: "Slack not connected" }

        try {
            const res = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            return { success: true, data: {
                messages: data.messages.map((msg: any) => ({
                    ts: msg.ts,
                    user: msg.user,
                    text: msg.text,
                    type: msg.type,
                    thread_ts: msg.thread_ts
                }))
            }}
        } catch (err: any) {
            return { success: false, error: `Slack API Error: ${err.message}` }
        }
    }
}

/**
 * Spotify MCP Handlers
 */
export const spotifyActions = {
    async getCurrentUser(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const res = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                id: data.id,
                display_name: data.display_name,
                email: data.email,
                followers: data.followers?.total,
                images: data.images,
                product: data.product,
                country: data.country
            }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async getCurrentlyPlaying(userId: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.status === 204) return { success: true, data: { is_playing: false, message: "Nothing is currently playing" }}
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                is_playing: data.is_playing,
                progress_ms: data.progress_ms,
                item: data.item ? {
                    id: data.item.id,
                    name: data.item.name,
                    artists: data.item.artists.map((a: any) => a.name),
                    album: data.item.album.name,
                    duration_ms: data.item.duration_ms,
                    explicit: data.item.explicit,
                    preview_url: data.item.preview_url
                } : null
            }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async getUserPlaylists(userId: string, limit: number = 20): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                total: data.total,
                playlists: data.items.map((pl: any) => ({
                    id: pl.id,
                    name: pl.name,
                    description: pl.description,
                    public: pl.public,
                    tracks_count: pl.tracks.total,
                    owner: pl.owner.display_name,
                    images: pl.images
                }))
            }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async createPlaylist(userId: string, name: string, description: string = '', isPublic: boolean = false): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            // First get user ID
            const meRes = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const meData = await meRes.json()
            
            const res = await fetch(`https://api.spotify.com/v1/users/${meData.id}/playlists`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    public: isPublic
                })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                id: data.id,
                name: data.name,
                description: data.description,
                public: data.public,
                external_url: data.external_urls?.spotify
            }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async searchTracks(userId: string, query: string, limit: number = 10): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: {
                tracks: data.tracks.items.map((track: any) => ({
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map((a: any) => a.name),
                    album: track.album.name,
                    duration_ms: track.duration_ms,
                    explicit: track.explicit,
                    preview_url: track.preview_url,
                    popularity: track.popularity
                }))
            }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async addTracksToPlaylist(userId: string, playlistId: string, trackUris: string[]): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: trackUris })
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            return { success: true, data: { snapshot_id: data.snapshot_id }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    },

    async playTrack(userId: string, trackUri: string, deviceId?: string): Promise<ToolResult> {
        const token = await getMcpToken(userId, 'spotify')
        if (!token) return { success: false, error: "Spotify not connected" }

        try {
            const body: any = { uris: [trackUri] }
            const url = deviceId 
                ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
                : 'https://api.spotify.com/v1/me/player/play'
                
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            if (!res.ok && res.status !== 204) throw new Error(await res.text())
            return { success: true, data: { status: 'playing', track_uri: trackUri }}
        } catch (err: any) {
            return { success: false, error: `Spotify API Error: ${err.message}` }
        }
    }
}
