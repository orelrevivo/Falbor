import { NextResponse } from "next/server"
import { saveMcpConnection } from "@/app/actions/mcp"

const TOKEN_ENDPOINTS: Record<string, string> = {
  github: "https://github.com/login/oauth/access_token",
  slack: "https://slack.com/api/oauth.v2.access",
  discord: "https://discord.com/api/oauth2/token",
  gmail: "https://oauth2.googleapis.com/token",
  linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
  twitter: "https://api.twitter.com/2/oauth2/token",
  spotify: "https://accounts.spotify.com/api/token"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const host = request.headers.get("host") || "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"
  const currentBaseUrl = `${protocol}://${host}`

  try {
    // Handle user-denied or missing params
    if (error) {
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=${error}`)
    }
    if (!code || !state) {
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=missing_code_or_state`)
    }

    // Decode state
    let provider: string
    try {
      const sanitizedState = state.split(/[?#]/)[0]
      const decodedState = Buffer.from(sanitizedState, "base64").toString()
      const parsedState = JSON.parse(decodedState)
      provider = parsedState.provider
    } catch (e) {
      console.error("Failed to parse state:", state, e)
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=invalid_state`)
    }

    const endpoint = TOKEN_ENDPOINTS[provider]
    if (!endpoint) {
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=unsupported_provider`)
    }

    const clientIdEnv = provider === "gmail" ? "GOOGLE_CLIENT_ID" : `${provider.toUpperCase()}_CLIENT_ID`
    const clientSecretEnv = provider === "gmail" ? "GOOGLE_CLIENT_SECRET" : `${provider.toUpperCase()}_CLIENT_SECRET`
    const clientId = process.env[clientIdEnv]
    const clientSecret = process.env[clientSecretEnv]

    if (!clientId || !clientSecret) {
      console.error(`Missing env for ${provider}:`, clientIdEnv, clientSecretEnv)
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=server_config_missing`)
    }

    const redirectUri = `${currentBaseUrl}/api/mcp/callback`

    // Prepare token request
    let fetchOptions: any = {
      method: "POST",
      headers: {},
    }

    if (provider === "github") {
      fetchOptions.headers = { "Content-Type": "application/json", "Accept": "application/json" }
      fetchOptions.body = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    } else {
      // Google, Slack, Discord
      fetchOptions.headers = { "Content-Type": "application/x-www-form-urlencoded" }
      const params = new URLSearchParams()
      params.append("client_id", clientId)
      params.append("client_secret", clientSecret)
      params.append("code", code)
      params.append("grant_type", "authorization_code")
      params.append("redirect_uri", redirectUri)
      fetchOptions.body = params.toString()
    }

    const res = await fetch(endpoint, fetchOptions)
    const data = await res.json().catch(async () => ({ error: await res.text() }))

    if (!res.ok || data.error) {
      console.error(`${provider} token exchange failed:`, data)
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=${encodeURIComponent(data.error_description || data.error || "token_exchange_failed")}`)
    }

    const accessToken = data.access_token
    const refreshToken = data.refresh_token

    if (!accessToken) {
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=no_access_token_received`)
    }

    // Save the connection
    const typeMap: Record<string, string> = { github: "github", slack: "communication", discord: "communication", gmail: "email" }
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
      return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=${encodeURIComponent(result.error || "save_connection_failed")}`)
    }

    // For GitHub, also sync with the GitHub connection system for clone/settings features
    if (provider === "github" && accessToken) {
      try {
        // Fetch GitHub user info
        const userRes = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.github.v3+json"
          }
        })
        
        if (userRes.ok) {
          const userData = await userRes.json()
          
          // Store GitHub connection for clone/settings features
          await fetch(`${currentBaseUrl}/api/github/connection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              token: accessToken,
              username: userData.login,
              fromMcp: true 
            })
          })
          
          // Also save as Git Clone MCP if not already exists
          const gitCloneResult = await saveMcpConnection({
            name: "Git Clone",
            type: "git",
            accessToken,
            metadata: {
              username: userData.login,
              fromGitHubOAuth: true,
              scope: data.scope,
              token_type: data.token_type
            }
          })
          
          if (!gitCloneResult.success) {
            console.error("Failed to save Git Clone MCP connection:", gitCloneResult.error)
          }
        }
      } catch (err) {
        console.error("Failed to sync GitHub connection:", err)
        // Don't fail the MCP connection if this sync fails
      }
    }

    return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?success=true&provider=${provider}`)
  } catch (err: any) {
    console.error("MCP Callback Error:", err)
    return NextResponse.redirect(`${currentBaseUrl}/settings/mcp?error=${encodeURIComponent(err.message || "unknown_error")}`)
  }
}