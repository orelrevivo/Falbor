import { NextResponse } from "next/server"
import { saveMcpConnection } from "@/app/actions/mcp"

const TOKEN_ENDPOINTS: Record<string, string> = {
    github: "https://github.com/login/oauth/access_token",
    slack: "https://slack.com/api/oauth.v2.access",
    discord: "https://discord.com/api/oauth2/token"
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/mcp?error=${error}`)
    }

    if (!code || !state) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/mcp?error=missing_params`)
    }

    // Use the actual host from the request to stay on the correct environment (localhost vs prod)
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const currentBaseUrl = `${protocol}://${host}`

    try {
        // Sanitize state (strip trailing characters like ? or # that might be added by some redirects)
        const sanitizedState = state.split(/[?#]/)[0]

        let provider: string
        try {
            const decodedState = Buffer.from(sanitizedState, "base64").toString()
            const parsedState = JSON.parse(decodedState)
            provider = parsedState.provider
        } catch (e) {
            console.error("Failed to parse state:", state, "Sanitized:", sanitizedState, e)
            throw new Error("Invalid state parameter sequence")
        }

        const endpoint = TOKEN_ENDPOINTS[provider]
        if (!endpoint) throw new Error(`Unsupported provider: ${provider}`)

        const clientIdEnv = `${provider.toUpperCase()}_CLIENT_ID`
        const clientSecretEnv = `${provider.toUpperCase()}_CLIENT_SECRET`

        const clientId = process.env[clientIdEnv]
        const clientSecret = process.env[clientSecretEnv]

        if (!clientId || !clientSecret) {
            throw new Error(`Server configuration missing for ${provider} (${clientIdEnv}/${clientSecretEnv})`)
        }

        const redirectUri = `${currentBaseUrl}/api/mcp/callback`

        let body: any
        let headers: Record<string, string> = { "Accept": "application/json" }

        if (provider === "github") {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri
            })
        } else {
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            const params = new URLSearchParams()
            params.append("client_id", clientId)
            params.append("client_secret", clientSecret)
            params.append("code", code)
            params.append("grant_type", "authorization_code")
            params.append("redirect_uri", redirectUri)
            body = params
        }

        const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body
        })

        if (!res.ok) {
            const errorData = await res.text()
            console.error(`${provider} token exchange failed:`, errorData)
            throw new Error(`${provider} token exchange failed with status ${res.status}`)
        }

        const data = await res.json()

        if (data.error || data.ok === false) {
            throw new Error(data.error_description || data.error || "Token exchange failed")
        }

        const accessToken = data.access_token
        const refreshToken = data.refresh_token

        // Map to MCP types
        const typeMap: Record<string, string> = {
            github: "code",
            slack: "communication",
            discord: "communication",
            google: "search"
        }

        // Save the connection
        const result = await saveMcpConnection({
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            type: typeMap[provider] || "tool",
            accessToken,
            metadata: {
                refreshToken,
                scope: data.scope,
                token_type: data.token_type,
                ...(data.team ? { team_name: data.team.name, team_id: data.team.id } : {}),
                ...(data.user ? { user_name: data.user.name, user_id: data.user.id } : {})
            }
        })

        if (!result.success) {
            throw new Error(result.error || "Failed to save connection")
        }

        return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?success=true&provider=${provider}`)
    } catch (err: any) {
        console.error("MCP Callback Error:", err)
        return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=${encodeURIComponent(err.message)}`)
    }
}
