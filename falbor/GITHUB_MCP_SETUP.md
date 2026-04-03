# GitHub MCP Integration - Setup Guide

## Required Environment Variables

Add these to your `.env` file:

```env
# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

## GitHub OAuth App Configuration

### Step 1: Create a GitHub OAuth App
1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Fill in the details:

| Field | Value |
|-------|-------|
| **Application name** | Falbor AI MCP |
| **Homepage URL** | `https://your-domain.com` (or `http://localhost:3000` for local dev) |
| **Authorization callback URL** | `https://your-domain.com/api/mcp/callback` (or `http://localhost:3000/api/mcp/callback`) |

### Step 2: Get Client ID and Secret
- After creating the app, copy the **Client ID**
- Click **"Generate a new client secret"** and copy the secret
- Add both to your `.env` file as shown above

## API Endpoints Created/Used

### 1. MCP OAuth Initiation
**Endpoint:** `GET /api/mcp/auth/github`

**Description:** Redirects user to GitHub OAuth authorization page

**Usage:** Called automatically when user clicks "Confirm GitHub Account" in the MCP connect modal

**Flow:**
```
User clicks Connect → Modal opens → Clicks "Confirm GitHub Account" 
→ Redirects to /api/mcp/auth/github → GitHub OAuth page
```

### 2. MCP OAuth Callback
**Endpoint:** `GET /api/mcp/callback`

**Description:** Handles GitHub OAuth callback, exchanges code for token, saves connection

**Query Parameters:**
- `code` - Authorization code from GitHub
- `state` - Encoded state containing userId and provider
- `error` (optional) - Error message if user denied access

**Success Redirect:** `/settings/mcp?success=true&provider=github`

**Error Redirect:** `/settings/mcp?error=error_message`

### 3. MCP Connections API
**Endpoint:** `GET /api/mcp/connections`

**Description:** Returns all MCP connections for the authenticated user

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "name": "GitHub",
      "type": "github",
      "accessToken": "encrypted_token",
      "metadata": {
        "scope": "repo,read:user,user:email",
        "login": "username"
      }
    }
  ]
}
```

### 4. GitHub Connection API (Existing)
**Endpoint:** `GET /api/github/connection`

**Description:** Checks if user has GitHub connected (used by clone dialog and settings)

**Endpoint:** `POST /api/github/connection`

**Description:** Saves GitHub token (used for sync from MCP)

## Complete OAuth Flow

```
1. User visits /settings/mcp
2. Clicks "Connect" on GitHub row
3. McpConnectModal opens
4. User clicks "Confirm GitHub Account"
5. Browser → /api/mcp/auth/github
6. Redirects to → https://github.com/login/oauth/authorize
7. User authorizes on GitHub
8. GitHub redirects to → /api/mcp/callback?code=xxx&state=xxx
9. Backend exchanges code for access_token
10. Saves to MCP connections table
11. Syncs to GitHub connection system
12. Redirects to /settings/mcp?success=true
```

## Testing the Integration

### Local Development
1. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
2. Use `http://localhost:3000/api/mcp/callback` as callback URL in GitHub OAuth app
3. Run the app: `npm run dev`
4. Go to http://localhost:3000/settings/mcp
5. Click "Connect" on GitHub
6. Complete OAuth flow

### Production
1. Create separate GitHub OAuth app for production
2. Use `https://yourdomain.com/api/mcp/callback` as callback URL
3. Set environment variables in production
4. Deploy and test

## Troubleshooting

### "No account connected" shows even after OAuth
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set correctly
- Verify callback URL matches exactly (including http vs https)
- Check server logs for token exchange errors

### "Failed to sync GitHub connection" error
- The MCP connection was saved but sync to GitHub system failed
- User can still use MCP features but may need to reconnect in project settings
- Check network tab for `/api/github/connection` POST request

### OAuth redirect fails
- Ensure callback URL in GitHub OAuth app matches your domain exactly
- Check for trailing slashes or protocol mismatches (http vs https)
