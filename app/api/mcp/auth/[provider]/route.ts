import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const PROVIDER_CONFIGS: Record<string, { authUrl: string; client_env: string }> = {
    github: {
        authUrl: "https://github.com/login/oauth/authorize",
        client_env: "GITHUB_CLIENT_ID"
    },
    slack: {
        authUrl: "https://slack.com/oauth/v2/authorize",
        client_env: "SLACK_CLIENT_ID"
    },
    discord: {
        authUrl: "https://discord.com/api/oauth2/authorize",
        client_env: "DISCORD_CLIENT_ID"
    }
}

export async function GET(
    request: Request,
    { params }: { params: { provider: string } }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const provider = (await params).provider.toLowerCase()
    const config = PROVIDER_CONFIGS[provider]

    if (!config) {
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    const clientId = process.env[config.client_env]
    if (!clientId) {
        return NextResponse.json({
            error: `Client ID for ${provider} not configured on the server. Please add ${config.client_env} to your .env file.`
        }, { status: 500 })
    }

    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const currentBaseUrl = `${protocol}://${host}`

    const redirectUri = `${currentBaseUrl}/api/mcp/callback`
    const state = Buffer.from(JSON.stringify({ userId, provider })).toString("base64")

    let url = `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    // Add specific scopes
    if (provider === "github") {
        url += "&scope=repo,read:user,user:email"
    } else if (provider === "slack") {
        url += "&scope=chat:write,channels:read,groups:read"
    } else if (provider === "discord") {
        url += "&scope=identify,email,guilds"
    }

    return NextResponse.redirect(url)
}
