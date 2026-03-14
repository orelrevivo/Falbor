# MCP API Setup Guide - All Providers

## Environment Variables Required

Add these to your `.env` file:

```env
# GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Twitter/X
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Slack
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Discord (already exists)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Gmail/Google (already exists)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 1. LinkedIn API Setup

### Where to Register:
**URL:** https://www.linkedin.com/developers/apps

### Steps:
1. Go to LinkedIn Developers → My Apps → Create App
2. Fill in app details:
   - App Name: "Falbor AI MCP"
   - LinkedIn Page: (your company page or personal)
   - Privacy Policy URL: `https://yourdomain.com/privacy`
   - App Logo: Upload your logo

3. Go to **Auth** tab
4. Add OAuth 2.0 redirect URL:
   ```
   https://yourdomain.com/api/mcp/callback
   ```

5. Copy **Client ID** and **Client Secret**

### Required API Products:
- Sign In with LinkedIn
- Share on LinkedIn (for posting)

### Scopes Used:
- `r_liteprofile` - Basic profile info
- `r_emailaddress` - Email address
- `w_member_social` - Post updates (optional)

---

## 2. Twitter/X API Setup

### Where to Register:
**URL:** https://developer.twitter.com/en/portal/dashboard

### Steps:
1. Go to Twitter Developer Portal
2. Create a new Project → App
3. Enable **OAuth 2.0** in Authentication settings
4. Set callback URL:
   ```
   https://yourdomain.com/api/mcp/callback
   ```

5. Copy **Client ID** and **Client Secret**

### Required Access Level:
- **Elevated** access required for posting tweets
- Apply for Elevated access in the Developer Portal

### Scopes Used:
- `tweet.read` - Read tweets
- `tweet.write` - Post tweets
- `users.read` - Read user info
- `offline.access` - Refresh token

---

## 3. Slack API Setup

### Where to Register:
**URL:** https://api.slack.com/apps

### Steps:
1. Go to Slack API → Create New App → From scratch
2. Name: "Falbor AI MCP"
3. Select your workspace (for testing)

4. Go to **OAuth & Permissions**
5. Add Redirect URL:
   ```
   https://yourdomain.com/api/mcp/callback
   ```

6. Add Bot Token Scopes:
   - `chat:write` - Send messages
   - `channels:read` - Read channel info
   - `groups:read` - Read private channels
   - `im:read` - Read direct messages
   - `users:read` - Read user info

7. Install to Workspace
8. Copy **Client ID** and **Client Secret** from Basic Information

### Scopes Used:
- `chat:write` - Send messages
- `channels:read` - List channels
- `groups:read` - Read private channels

---

## 4. Spotify API Setup

### Where to Register:
**URL:** https://developer.spotify.com/dashboard

### Steps:
1. Go to Spotify Developer Dashboard
2. Create App
3. Fill details:
   - App Name: "Falbor AI MCP"
   - App Description: "AI-powered music management"
   - Redirect URIs: `https://yourdomain.com/api/mcp/callback`

4. Copy **Client ID** and **Client Secret**

### Scopes Used:
- `user-read-private` - Read private info
- `user-read-email` - Read email
- `playlist-read-private` - Read private playlists
- `playlist-modify-private` - Modify playlists
- `user-modify-playback-state` - Control playback

---

## 5. GitHub API Setup (Already Implemented)

### Where to Register:
**URL:** https://github.com/settings/developers

### Steps:
1. Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: "Falbor AI MCP"
3. Homepage URL: `https://yourdomain.com`
4. Authorization callback URL: `https://yourdomain.com/api/mcp/callback`
5. Copy **Client ID** and generate **Client Secret**

### Scopes Used:
- `repo` - Repository access
- `read:user` - Read user info
- `user:email` - Read email

---

## 6. Discord API Setup (Already Exists)

### Where to Register:
**URL:** https://discord.com/developers/applications

### Steps:
1. New Application → Name: "Falbor AI MCP"
2. OAuth2 → Redirects → Add `https://yourdomain.com/api/mcp/callback`
3. Copy **Client ID** and **Client Secret**

### Scopes Used:
- `identify` - User identity
- `email` - Email address
- `guilds` - Server info

---

## 7. Gmail/Google API Setup (Already Exists)

### Where to Register:
**URL:** https://console.cloud.google.com/apis/credentials

### Steps:
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `https://yourdomain.com/api/mcp/callback`
5. Copy **Client ID** and **Client Secret**

### Required APIs:
- Gmail API
- Google People API

### Scopes Used:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.modify`
- `email`
- `profile`

---

## OAuth Flow for All Providers

```
1. User clicks "Connect" in MCP table
2. McpConnectModal opens
3. User clicks "Confirm [Provider] Account"
4. Browser → /api/mcp/auth/[provider]
5. Redirects to Provider OAuth page
6. User authorizes the app
7. Provider redirects to /api/mcp/callback?code=xxx&state=xxx
8. Backend exchanges code for access_token
9. Saves to MCP connections table
10. Redirects to /settings/mcp?success=true
```

## Testing Locally

For local development, use `http://localhost:3000/api/mcp/callback` as the redirect URL in all provider apps.

## Troubleshooting

### "Client ID not configured" error
- Check that the environment variable is set correctly
- Restart your Next.js server after adding env variables

### "Invalid redirect URI" error
- Ensure the callback URL in the provider app matches exactly (including http/https)
- No trailing slashes, exact match required

### "Access denied" or "User denied" error
- User clicked cancel on the OAuth screen
- Normal behavior, user can retry

### Token exchange fails
- Check Client Secret is correct
- Verify app is published/verified (some providers require this for production)
