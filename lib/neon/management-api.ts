import crypto from "crypto"
import { neon } from "@neondatabase/serverless"

const NEON_API_URL = "https://console.neon.tech/api/v2"

interface CreateProjectParams {
  name: string
  regionId?: string
  pgVersion?: number
  orgId?: string
}

interface NeonProjectResponse {
  project: {
    id: string
    name: string
    region_id: string
    pg_version: number
    created_at: string
    default_branch_id?: string
  }
  branch?: {
    id: string
  }
  connection_uris?: Array<{
    connection_uri: string
    role_name: string
    database_name: string
  }>
}

interface NeonProjectCredentials {
  projectRef: string
  databaseUrl: string
  dbPassword: string
  region: string
}

/**
 * Generate a secure database password
 */
function generateSecurePassword(): string {
  const length = 32
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  const randomBytes = crypto.randomBytes(length)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }
  return password
}

/**
 * Sleep helper
 */
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Create a new Neon project via Management API
 */
export async function createNeonProject(params: CreateProjectParams): Promise<NeonProjectCredentials> {
  const apiKey = process.env.NEON_API_KEY

  if (!apiKey) {
    throw new Error("NEON_API_KEY is not configured. Generate an API Key in the Neon Console.")
  }

  // Step 1: Create the project
  const createResponse = await fetch(`${NEON_API_URL}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      project: {
        name: params.name,
        region_id: params.regionId || "aws-us-east-1",
        pg_version: params.pgVersion || 16,
        ...(params.orgId ? { org_id: params.orgId } : {}),
      },
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create Neon project: ${error}`)
  }

  const data: NeonProjectResponse = await createResponse.json()
  const projectRef = data.project.id

  console.log(`[Neon Management API] Project created: ${projectRef}`)
  console.log(`[Neon Management API] Full create response:`, JSON.stringify(data, null, 2))

  // Step 2: Check if connection_uri came back directly in the create response
  // Neon's project create response includes connection_uris array
  const immediateUri = data.connection_uris?.[0]?.connection_uri
  if (immediateUri) {
    console.log(`[Neon Management API] Got connection_uri directly from project creation.`)
    const dbPassword = extractPassword(immediateUri)
    return {
      projectRef,
      databaseUrl: immediateUri,
      dbPassword: dbPassword || generateSecurePassword(),
      region: data.project.region_id,
    }
  }

  // Step 3: Get the branch ID — prefer from create response, else poll
  let branchId: string | null = data.project.default_branch_id || data.branch?.id || null

  console.log(`[Neon Management API] Branch ID from create response: ${branchId}`)

  // Step 4: Poll for branch ID if not available yet
  if (!branchId) {
    console.log(`[Neon Management API] Branch ID not in response, polling...`)
    for (let attempt = 1; attempt <= 10; attempt++) {
      await sleep(2000)
      branchId = await getNeonDefaultBranchId(projectRef, apiKey)
      if (branchId) {
        console.log(`[Neon Management API] Got branch ID on poll attempt ${attempt}: ${branchId}`)
        break
      }
      console.log(`[Neon Management API] Poll attempt ${attempt}: branch not ready yet.`)
    }
  }

  if (!branchId) {
    throw new Error(`Failed to get branch ID for project ${projectRef}. Please check the Neon console.`)
  }

  // Step 5: Poll for connection URI using the correct /connection_uri endpoint
  let connectionUri: string | null = null

  const MAX_ATTEMPTS = 20
  const DELAY_MS = 3000

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await sleep(DELAY_MS)
    console.log(`[Neon Management API] Attempt ${attempt}/${MAX_ATTEMPTS} to fetch connection_uri...`)

    connectionUri = await fetchConnectionUri(projectRef, branchId, apiKey)

    if (connectionUri) {
      console.log(`[Neon Management API] Got connection_uri on attempt ${attempt}.`)
      break
    }

    console.log(`[Neon Management API] Attempt ${attempt}: connection_uri not ready yet.`)
  }

  // Step 6: Deep recovery — reset role password to get URI
  if (!connectionUri) {
    console.log(`[Neon Management API] Polling exhausted. Attempting deep recovery via password reset...`)
    connectionUri = await deepRecoveryUri(projectRef, branchId, apiKey)
  }

  if (!connectionUri) {
    throw new Error(
      `Failed to retrieve connection URI for project ${projectRef}. ` +
      `Branch ${branchId} exists but endpoint is not ready. ` +
      `Please check the Neon console at https://console.neon.tech/app/projects/${projectRef}`
    )
  }

  const dbPassword = extractPassword(connectionUri)

  return {
    projectRef,
    databaseUrl: connectionUri,
    dbPassword: dbPassword || generateSecurePassword(),
    region: data.project.region_id,
  }
}

/**
 * Extract password from a PostgreSQL connection URI
 * Format: postgresql://user:PASSWORD@host/db
 */
function extractPassword(uri: string): string {
  const match = uri.match(/:\/\/[^:]+:([^@]+)@/)
  return match?.[1] ? decodeURIComponent(match[1]) : ""
}

/**
 * Fetch the default branch ID for a project
 */
async function getNeonDefaultBranchId(projectRef: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${NEON_API_URL}/projects/${projectRef}/branches`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.warn(`[Neon Management API] Failed to fetch branches: ${response.status}`)
      return null
    }

    const data = await response.json()
    const branches: any[] = data.branches || []

    // Prefer the primary/default branch
    const primary = branches.find(b => b.primary || b.default) || branches[0]
    return primary?.id || null
  } catch (e) {
    console.warn(`[Neon Management API] Error fetching branches:`, e)
    return null
  }
}

/**
 * Fetch connection URI using the correct Neon API endpoint
 * GET /projects/{projectId}/connection_uri
 */
async function fetchConnectionUri(projectRef: string, branchId: string, apiKey: string): Promise<string | null> {
  try {
    // First get the role name for this branch
    const rolesResponse = await fetch(
      `${NEON_API_URL}/projects/${projectRef}/branches/${branchId}/roles`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    )

    if (!rolesResponse.ok) {
      console.warn(`[Neon Management API] Failed to fetch roles: ${rolesResponse.status}`)
      return null
    }

    const rolesData = await rolesResponse.json()
    const roleName = rolesData.roles?.[0]?.name

    if (!roleName) {
      console.warn(`[Neon Management API] No roles found for branch ${branchId}`)
      return null
    }

    // Get databases for this branch
    const dbResponse = await fetch(
      `${NEON_API_URL}/projects/${projectRef}/branches/${branchId}/databases`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    )

    const dbData = dbResponse.ok ? await dbResponse.json() : null
    const dbName = dbData?.databases?.[0]?.name || "neondb"

    // Use the /connection_uri endpoint (the correct one)
    const uriResponse = await fetch(
      `${NEON_API_URL}/projects/${projectRef}/connection_uri?branch_id=${branchId}&role_name=${roleName}&database_name=${dbName}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    )

    if (!uriResponse.ok) {
      const errText = await uriResponse.text()
      console.warn(`[Neon Management API] connection_uri fetch failed: ${uriResponse.status} - ${errText}`)
      return null
    }

    const uriData = await uriResponse.json()
    console.log(`[Neon Management API] connection_uri response:`, JSON.stringify(uriData, null, 2))

    return uriData.uri || uriData.connection_uri || null
  } catch (e) {
    console.warn(`[Neon Management API] Error fetching connection URI:`, e)
    return null
  }
}

/**
 * Deep recovery: reset the role password to get a fresh connection URI
 */
async function deepRecoveryUri(projectRef: string, branchId: string, apiKey: string): Promise<string | null> {
  try {
    const rolesResponse = await fetch(
      `${NEON_API_URL}/projects/${projectRef}/branches/${branchId}/roles`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      }
    )

    if (!rolesResponse.ok) return null

    const rolesData = await rolesResponse.json()
    const roleName = rolesData.roles?.[0]?.name

    if (!roleName) return null

    console.log(`[Neon Management API] Deep recovery: resetting password for role "${roleName}"`)

    const resetResponse = await fetch(
      `${NEON_API_URL}/projects/${projectRef}/branches/${branchId}/roles/${roleName}/reset_password`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      }
    )

    if (!resetResponse.ok) {
      console.warn(`[Neon Management API] Password reset failed: ${resetResponse.status}`)
      return null
    }

    const resetData = await resetResponse.json()
    console.log(`[Neon Management API] Password reset response:`, JSON.stringify(resetData, null, 2))

    return resetData.role?.connection_uri || resetData.connection_uri || null
  } catch (e) {
    console.error(`[Neon Management API] Deep recovery error:`, e)
    return null
  }
}

/**
 * Public wrapper for getNeonDefaultBranch (used externally)
 */
export async function getNeonDefaultBranch(projectRef: string): Promise<string | null> {
  const apiKey = process.env.NEON_API_KEY
  if (!apiKey) throw new Error("NEON_API_KEY not configured")
  return getNeonDefaultBranchId(projectRef, apiKey)
}

/**
 * Get projects for the authenticated user
 */
export async function getNeonProjects() {
  const apiKey = process.env.NEON_API_KEY
  if (!apiKey) throw new Error("NEON_API_KEY not configured")

  const response = await fetch(`${NEON_API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) throw new Error("Failed to fetch Neon projects")
  return response.json()
}

/**
 * Get connection URI for a specific project branch (public, for external use)
 */
export async function getNeonConnectionUri(projectRef: string, branchId: string): Promise<string> {
  const apiKey = process.env.NEON_API_KEY
  if (!apiKey) throw new Error("NEON_API_KEY not configured")

  if (!branchId) {
    throw new Error("branchId is required — do not use 'main' or 'primary' as branch name")
  }

  const uri = await fetchConnectionUri(projectRef, branchId, apiKey)
  if (!uri) {
    throw new Error(`Could not fetch connection URI for project ${projectRef}, branch ${branchId}`)
  }
  return uri
}

/**
 * Execute SQL on a Neon database
 */
export async function executeNeonSql(databaseUrl: string, sql: string, params: any[] = []) {
  const sqlQuery = neon(databaseUrl)
  // @ts-ignore
  const res = await sqlQuery(sql, params)
  return res as any[]
}