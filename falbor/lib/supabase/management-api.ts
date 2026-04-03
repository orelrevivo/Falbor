/**
 * Supabase Management API Client
 * Automatically provisions Supabase projects for AI-generated websites
 */

import crypto from "crypto"

const SUPABASE_API_URL = "https://api.supabase.com/v1"

interface CreateProjectParams {
  name: string
  organizationSlug: string
  region?: string
}

interface SupabaseProject {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  database: {
    host: string
    version: string
  }
}

interface ProjectApiKeys {
  anon_key: string
  service_role_key: string
}

interface SupabaseProjectCredentials {
  projectRef: string
  supabaseUrl: string
  anonKey: string
  serviceRoleKey: string
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
 * Create a new Supabase project via Management API
 * Returns basic info immediately after project is created in Supabase (before it's ready)
 */
export async function createSupabaseProject(params: CreateProjectParams): Promise<SupabaseProjectCredentials> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN is not configured. Generate a Personal Access Token at https://supabase.com/dashboard/account/tokens",
    )
  }

  const dbPassword = generateSecurePassword()

  // Create the project
  const createResponse = await fetch(`${SUPABASE_API_URL}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      organization_id: params.organizationSlug,
      db_pass: dbPassword,
      region: params.region || "us-east-1",
      plan: "free",
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create Supabase project: ${error}`)
  }

  const project: SupabaseProject = await createResponse.json()

  return {
    projectRef: project.id,
    supabaseUrl: `https://${project.id}.supabase.co`,
    anonKey: "pending",
    serviceRoleKey: "pending",
    dbPassword,
    region: project.region,
  }
}

/**
 * Poll project health until ready and return API keys
 */
export async function pollForProjectKeys(projectRef: string): Promise<{ anonKey: string; serviceRoleKey: string }> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  // Wait for project to be ready (poll health endpoint)
  await waitForProjectReady(projectRef, accessToken)

  // Get API keys
  const keysResponse = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/api-keys`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!keysResponse.ok) {
    throw new Error("Failed to retrieve API keys")
  }

  const keys: { name: string; api_key: string }[] = await keysResponse.json()
  const anonKey = keys.find((k) => k.name === "anon")?.api_key || ""
  const serviceRoleKey = keys.find((k) => k.name === "service_role")?.api_key || ""

  return { anonKey, serviceRoleKey }
}

/**
 * Poll project health until ready
 */
async function waitForProjectReady(projectRef: string, accessToken: string): Promise<void> {
  const maxAttempts = 60 // 5 minutes max
  const delayMs = 5000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const healthResponse = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/health`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (healthResponse.ok) {
        const health = await healthResponse.json()
        // Check if database and auth are healthy, others might be slower
        const essentialServices = ["pg-meta", "gotrue", "postgrest"]
        const essentialsHealthy = health.every((service: { name: string; status: string }) =>
          !essentialServices.includes(service.name) || service.status === "ACTIVE_HEALTHY"
        )

        if (essentialsHealthy || attempt > 10) { // After 50s, try anyway
          return
        }
      }
    } catch (e) {
      console.warn(`[Supabase Health] Attempt ${attempt} failed:`, e)
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

/**
 * Run SQL migrations on a Supabase project
 */
export async function runMigration(projectRef: string, sql: string): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const error = await response.text()
    return { success: false, error }
  }

  return { success: true }
}

/**
 * Get tables from a Supabase project
 */
export async function getProjectTables(projectRef: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const sql = `
    SELECT 
      table_name,
      table_schema
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get table columns from a Supabase project
 */
export async function getTableColumns(projectRef: string, tableName: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const sql = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get users from auth.users table with extra fields
 */
export async function getProjectUsers(projectRef: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const sql = `
    SELECT 
      id,
      email,
      created_at,
      updated_at,
      invited_at,
      confirmation_sent_at,
      confirmed_at,
      last_sign_in_at,
      raw_user_meta_data->>'name' as name,
      CASE WHEN banned_until IS NOT NULL AND banned_until > now() THEN true ELSE false END as banned,
      raw_app_meta_data->>'provider' as provider
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 100;
  `

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get storage buckets from storage.buckets table
 */
export async function getProjectBuckets(projectRef: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const sql = `SELECT * FROM storage.buckets ORDER BY created_at DESC;`

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}
/**
 * Force get API keys without waiting for full health
 */
export async function getSupabaseProjectKeys(projectRef: string): Promise<{ anonKey: string; serviceRoleKey: string } | null> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!accessToken) return null

  try {
    const keysResponse = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/api-keys`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!keysResponse.ok) return null

    const keys: { name: string; api_key: string }[] = await keysResponse.json()
    const anonKey = keys.find((k) => k.name === "anon")?.api_key || ""
    const serviceRoleKey = keys.find((k) => k.name === "service_role")?.api_key || ""

    if (!anonKey) return null

    return { anonKey, serviceRoleKey }
  } catch (e) {
    return null
  }
}

/**
 * Get rows from a specific table
 */
export async function getProjectTableRows(projectRef: string, tableName: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  // Safety: basic check for tableName to prevent SQL injection (though we control the input)
  if (!/^[a-zA-Z0-9_.-]+$/.test(tableName)) {
    throw new Error("Invalid table name")
  }

  const sql = `SELECT * FROM "${tableName}" LIMIT 100;`

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get Auth configuration (including email templates)
 */
export async function getProjectAuthConfig(projectRef: string): Promise<any> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/config/auth`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    const err: any = new Error(`Failed to fetch Auth config: ${errorText}`)
    err.status = response.status
    throw err
  }

  return response.json()
}

/**
 * Update Auth configuration (email templates)
 */
export async function updateProjectAuthConfig(projectRef: string, config: any): Promise<any> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const err: any = new Error(`Failed to update Auth config: ${errorText}`)
    err.status = response.status
    throw err
  }

  return response.json()
}

/**
 * Get files from a storage bucket
 */
export async function getBucketFiles(projectRef: string, bucketName: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  // Use SQL query to get files from storage.objects table
  const sql = `
    SELECT 
      name,
      id,
      bucket_id,
      owner,
      created_at,
      updated_at,
      last_accessed_at,
      metadata
    FROM storage.objects
    WHERE bucket_id = '${bucketName}'
    ORDER BY created_at DESC
    LIMIT 100;
  `

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get user signup statistics grouped by date
 */
export async function getUserSignupStats(projectRef: string, days: number = 30): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const sql = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM auth.users
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC;
  `

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data
}

/**
 * Get Edge Functions from a Supabase project
 */
export async function getProjectEdgeFunctions(projectRef: string): Promise<any[]> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not configured")
  }

  const response = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}/functions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    // Functions might not be available or empty
    return []
  }

  return response.json()
}
