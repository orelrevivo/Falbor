// config/schema.ts (updated with new table for GitHub connections)
import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { check } from "drizzle-orm/pg-core"

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  isPublic: boolean("is_public").default(false).notNull(),
  isGithubClone: boolean("is_github_clone").default(false).notNull(),
  githubUrl: text("github_url"),
  githubRepoId: text("github_repo_id"),
  githubOwner: text("github_owner"),
  githubRepoName: text("github_repo_name"),
  githubBranch: text("github_branch").default("main"),
  githubLastSyncAt: timestamp("github_last_sync_at"),
  isGitAdopted: boolean("is_git_adopted").default(false).notNull(),
  deploymentConfig: jsonb("deployment_config")
    .$type<{
      platform?: "vercel" | "netlify"
      apiKey?: string
      vercelProjectId?: string
      deploymentUrl?: string
      lastDeployedAt?: string
    } | null>()
    .default(null),
  sandboxId: text("sandbox_id"),
  selectedModel: text("selected_model").default("gemini").notNull(),
  activeMessageId: uuid("active_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isAutomated: boolean("is_automated").default(false).notNull(),
  publishedUrl: text("published_url"),
})

export const projectTasks = pgTable("project_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  orderIndex: integer("order_index").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const taskAutomation = pgTable("task_automation", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  intervalMinutes: integer("interval_minutes").default(10).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextTaskId: uuid("next_task_id").references(() => projectTasks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const bot_deployments = pgTable("bot_deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  apiToken: text("api_token").notNull(),
  webhookUrl: text("webhook_url"),
  botName: text("bot_name"),
  isActive: boolean("is_active").default(true).notNull(),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: text("status").default("active").notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata")
    .$type<{
      deployedAt?: string
      projectTitle?: string
    } | null>()
    .default(null),
})

export const favorites = pgTable("favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  hasArtifact: boolean("has_artifact").default(false).notNull(),
  thinking: text("thinking"),
  versionName: text("version_name"),
  searchQueries: jsonb("search_queries").$type<{ query: string; results: string }[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isAutomated: boolean("is_automated").default(false).notNull(),
  tokensUsed: integer("tokens_used"),
  cost: integer("cost"), // in cents
  sessionId: text("session_id").default("main").notNull(),
  imageData: text("image_data"),
  metadata: jsonb("metadata").$type<Record<string, any> | null>(),
})

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull(),
  type: text("type").notNull().default("file"),
  isLocked: boolean("is_locked").default(false).notNull(),
  parentPath: text("parent_path"),
  additions: integer("additions").default(0).notNull(),
  deletions: integer("deletions").default(0).notNull(),
  imageData: text("image_data"),
  metadata: jsonb("metadata").$type<{
    size?: number
    lastModifiedBy?: string
    isCollapsed?: boolean
    order?: number
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileIds: jsonb("file_ids").$type<string[]>().notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const giftEvents = pgTable("gift_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const userCredits = pgTable("user_credits", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(150), // in cents ($1.50)
  lastRegenTime: timestamp("last_regen_time").defaultNow().notNull(),
  lastClaimedGiftId: uuid("last_claimed_gift_id").references(() => giftEvents.id),
  lastMonthlyClaim: timestamp("last_monthly_claim"),
  lastDispense: timestamp("last_dispense"),
  subscriptionTier: text("subscription_tier").default("none").notNull(),
  balancePerMonth: integer("balance_per_month").default(0).notNull(), // in cents
  paypalSubscriptionId: text("paypal_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  dailyMessageCount: integer("daily_message_count").default(0).notNull(),
  lastDailyMessageReset: timestamp("last_daily_message_reset"),
})

export const userModelConfigs = pgTable("user_model_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  enabledModels: jsonb("enabled_models")
    .$type<string[]>()
    .notNull()
    .default(["gemini", "claude", "gpt", "deepseek", "gptoss", "runware"]),
  modelApiKeys: jsonb("model_api_keys")
    .$type<{
      gemini?: string
      claude?: string
      gpt?: string
      deepseek?: string
      gptoss?: string
      runware?: string
    } | null>()
    .default(null),
  customCreditsAdded: integer("custom_credits_added").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  deploymentUrl: text("deployment_url").notNull(),
  subdomain: text("subdomain").notNull(),
  customDomain: text("custom_domain"),
  isPublic: boolean("is_public").default(true).notNull(),
  showBranding: boolean("show_branding").default(true).notNull(),
  // NEW: Site meta fields
  favicon: text("favicon"),
  siteTitle: text("site_title"),
  siteDescription: text("site_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// NEW: Domain purchase orders
export const domainOrders = pgTable("domain_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  price: integer("price").notNull(), // cents
  currency: text("currency").default("USD").notNull(),
  status: text("status").default("pending").notNull(), // pending | paid | failed
  paymentMethod: text("payment_method").default("paypal").notNull(),
  godaddyOrderId: text("godaddy_order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const billingHistory = pgTable("billing_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(), // cents
  planName: text("plan_name").notNull(),
  status: text("status").notNull(), // completed, pending, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const figmaTokens = pgTable("figma_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
})

export const projectAuthProviders = pgTable("project_auth_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // 'email', 'google', 'twitter', 'facebook'
  isEnabled: boolean("is_enabled").default(false).notNull(),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type ProjectAuthProvider = typeof projectAuthProviders.$inferSelect
export type NewProjectAuthProvider = typeof projectAuthProviders.$inferInsert

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  username: text("username"),
  fullName: text("full_name"),
  email: text("email").notNull(),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  location: text("location"),
  isPrivate: boolean("is_private").default(false).notNull(),
  notificationSoundEnabled: boolean("notification_sound_enabled").default(true).notNull(),
  notificationVolume: integer("notification_volume").default(100).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const userAutomations = pgTable(
  "user_automations",
  {
    userId: text("user_id").primaryKey(),
    selectedModel: text("selected_model").default("gemini").notNull(),
    maxMessages: integer("max_messages").default(2).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    activatedAt: timestamp("activated_at"),
    nextRunAt: timestamp("next_run_at"),
    lastRun: timestamp("last_run"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [check("max_messages_check", sql`${table.maxMessages} >= 2`)],
)

export const serverConnections = pgTable("server_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  accessToken: text("access_token").notNull(),
  projectRef: text("project_ref").notNull(),
  projectName: text("project_name"),
  databaseUrl: text("database_url"),
  apiUrl: text("api_url"),
  isActive: boolean("is_active").default(true).notNull(),
  schema: jsonb("schema").$type<{
    tables?: Array<{
      name: string
      columns: Array<{ name: string; type: string; nullable: boolean }>
      rowCount?: number
    }>
  } | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const userCustomKnowledge = pgTable("user_custom_knowledge", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  promptName: text("prompt_name").notNull(),
  promptContent: text("prompt_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ====================
// DATABASE FEATURE TABLES
// ====================

export const projectDatabases = pgTable("project_databases", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectUsers = pgTable(
  "project_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectDatabaseId: uuid("project_database_id")
      .notNull()
      .references(() => projectDatabases.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").default("user").notNull(),
    passwordHash: text("password_hash").notNull(),
    metadata: jsonb("metadata").$type<{
      avatar?: string
      bio?: string
      settings?: Record<string, any>
    } | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEmailPerProject: sql`UNIQUE(${table.projectDatabaseId}, ${table.email})`,
  }),
)

export const projectTables = pgTable("project_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectDatabaseId: uuid("project_database_id")
    .notNull()
    .references(() => projectDatabases.id, { onDelete: "cascade" }),
  tableName: text("table_name").notNull(),
  columns: jsonb("columns")
    .$type<Array<{ name: string; type: string; nullable?: boolean; default?: any }>>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  queryFile: jsonb("query_file").$type<{
    fileName: string
    operations: Array<{
      name: string
      type: "select" | "insert" | "update" | "delete"
      query: string
      params?: Record<string, string>
    }>
  } | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectTableRows = pgTable("project_table_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectTableId: uuid("project_table_id")
    .notNull()
    .references(() => projectTables.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectDatabaseLogs = pgTable("project_database_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectDatabaseId: uuid("project_database_id")
    .notNull()
    .references(() => projectDatabases.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const projectQueryFiles = pgTable("project_query_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectDatabaseId: uuid("project_database_id")
    .notNull()
    .references(() => projectDatabases.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  tableId: uuid("table_id").references(() => projectTables.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  mainImage: text("main_image").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  domain: text("domain").notNull(),
  creatorId: text("creator_id").notNull(),
  cardDesign: text("card_design").default("none").notNull(),
  views: integer("views").default(0).notNull(),
  clones: integer("clones").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const templateLikes = pgTable("template_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const projectShares = pgTable("project_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  shareToken: text("share_token").notNull().unique(),
  role: text("role").$type<"viewer" | "editor" | "admin">().default("viewer").notNull(),
  label: text("label"),
  isActive: boolean("is_active").default(true).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  maxUses: integer("max_uses"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
})

export const projectCollaborators = pgTable("project_collaborators", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  invitedBy: text("invited_by").notNull(),
  shareId: uuid("share_id").references(() => projectShares.id, { onDelete: "set null" }),
  role: text("role").$type<"viewer" | "editor" | "admin">().default("viewer").notNull(),
  status: text("status").$type<"pending" | "accepted" | "revoked">().default("pending").notNull(),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  joinedAt: timestamp("joined_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectLogs = pgTable("project_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id").notNull(),
  level: text("level").notNull().$type<"info" | "warn" | "error" | "success">(),
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const projectSupabase = pgTable("project_supabase", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  supabaseProjectRef: text("supabase_project_ref").notNull(),
  supabaseUrl: text("supabase_url").notNull(),
  anonKey: text("anon_key").notNull(),
  serviceRoleKey: text("service_role_key").notNull(),
  dbPassword: text("db_password").notNull(),
  region: text("region").notNull().default("us-east-1"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectSupabaseSqlFiles = pgTable("project_supabase_sql_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const userSupabaseConnections = pgTable("user_supabase_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  selectedProjectRef: text("selected_project_ref"),
  selectedProjectName: text("selected_project_name"),
  supabaseUrl: text("supabase_url"),
  anonKey: text("anon_key"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectNeon = pgTable("project_neon", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  neonProjectRef: text("neon_project_ref").notNull(),
  databaseUrl: text("database_url").notNull(),
  dbPassword: text("db_password").notNull(),
  region: text("region").notNull().default("aws-us-east-1"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectNeonSqlFiles = pgTable("project_neon_sql_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const userNeonConnections = pgTable("user_neon_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  apiKey: text("api_key").notNull(),
  selectedProjectRef: text("selected_project_ref"),
  selectedProjectName: text("selected_project_name"),
  databaseUrl: text("database_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type ProjectNeon = typeof projectNeon.$inferSelect
export type NewProjectNeon = typeof projectNeon.$inferInsert

export type UserNeonConnection = typeof userNeonConnections.$inferSelect
export type NewUserNeonConnection = typeof userNeonConnections.$inferInsert

export const userGithubConnections = pgTable("user_github_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  githubUsername: text("github_username"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const userMcpConnections = pgTable("user_mcp_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  icon: text("icon"), // URL or path
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  apiKey: text("api_key"),
  webhookSecret: text("webhook_secret"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  isCustom: boolean("is_custom").default(false).notNull(),
  config: jsonb("config").$type<{
    transportType?: "STDIO" | "SSE" | "HTTP"
    serverUrl?: string
    envVars?: Array<{ key: string; value: string }>
    headers?: Array<{ name: string; value: string }>
    note?: string
    mcpCode?: string
  }>().default({}),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type UserMcpConnection = typeof userMcpConnections.$inferSelect
export type NewUserMcpConnection = typeof userMcpConnections.$inferInsert

export type ProjectSupabase = typeof projectSupabase.$inferSelect
export type NewProjectSupabase = typeof projectSupabase.$inferInsert

export type UserSupabaseConnection = typeof userSupabaseConnections.$inferSelect
export type NewUserSupabaseConnection = typeof userSupabaseConnections.$inferInsert

export type UserGithubConnection = typeof userGithubConnections.$inferSelect
export type NewUserGithubConnection = typeof userGithubConnections.$inferInsert

export const projectSecrets = pgTable("project_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projectFeedback = pgTable("project_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id"), // The user who sent feedback (if logged in on the generated site)
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending").notNull(), // pending | replied
  reply: text("reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type ProjectSecret = typeof projectSecrets.$inferSelect
export type NewProjectSecret = typeof projectSecrets.$inferInsert

// ====================
// PLAN MODE TABLE
// ====================

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  questions: jsonb("questions")
    .$type<Array<{ id: number; question: string; answer: string }>>()
    .notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert

// ====================
// SUSHI (SOCIAL CONTENT) TABLE
// ====================

export const projectSushi = pgTable("project_sushi", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  questions: jsonb("questions")
    .$type<Array<{ id: number; question: string; answer: string; options?: Array<{ title: string; subtitle: string }> }>>()
    .default(sql`'[]'::jsonb`).notNull(),
  strategy: text("strategy"),
  platforms: jsonb("platforms")
    .$type<string[]>()
    .default(sql`'["Instagram", "Facebook", "TikTok"]'::jsonb`).notNull(),
  posts: jsonb("posts")
    .$type<Array<{ 
      id: string; 
      platform: string; 
      content: string; 
      imageUrl: string; 
      imagePrompt: string;
      title?: string;
    }>>()
    .default(sql`'[]'::jsonb`).notNull(),
  status: text("status").default("idle").notNull(), // idle | loading_questions | answered | generating_posts | completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type ProjectSushi = typeof projectSushi.$inferSelect
export type NewProjectSushi = typeof projectSushi.$inferInsert

// ====================
// TYPE INFERENCES
// ====================

export type Favorite = typeof favorites.$inferSelect
export type NewFavorite = typeof favorites.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
export type Artifact = typeof artifacts.$inferSelect
export type NewArtifact = typeof artifacts.$inferInsert
export type GiftEvent = typeof giftEvents.$inferSelect
export type NewGiftEvent = typeof giftEvents.$inferInsert
export type UserCredits = typeof userCredits.$inferSelect
export type NewUserCredits = typeof userCredits.$inferInsert
export type Deployment = typeof deployments.$inferSelect
export type NewDeployment = typeof deployments.$inferInsert
export type DomainOrder = typeof domainOrders.$inferSelect
export type NewDomainOrder = typeof domainOrders.$inferInsert
export type ServerConnection = typeof serverConnections.$inferSelect
export type NewServerConnection = typeof serverConnections.$inferInsert
export type UserAutomation = typeof userAutomations.$inferSelect
export type NewUserAutomation = typeof userAutomations.$inferInsert
export type UserCustomKnowledge = typeof userCustomKnowledge.$inferSelect
export type NewUserCustomKnowledge = typeof userCustomKnowledge.$inferInsert
export type UserModelConfig = typeof userModelConfigs.$inferSelect
export type NewUserModelConfig = typeof userModelConfigs.$inferInsert
export type BotDeployment = typeof bot_deployments.$inferSelect
export type NewBotDeployment = typeof bot_deployments.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectTask = typeof projectTasks.$inferSelect
export type NewProjectTask = typeof projectTasks.$inferInsert
export type TaskAutomation = typeof taskAutomation.$inferSelect
export type NewTaskAutomation = typeof taskAutomation.$inferInsert
export type ProjectDatabase = typeof projectDatabases.$inferSelect
export type NewProjectDatabase = typeof projectDatabases.$inferInsert
export type ProjectUser = typeof projectUsers.$inferSelect
export type NewProjectUser = typeof projectUsers.$inferInsert
export type ProjectTable = typeof projectTables.$inferSelect
export type NewProjectTable = typeof projectTables.$inferInsert
export type ProjectTableRow = typeof projectTableRows.$inferSelect
export type NewProjectTableRow = typeof projectTableRows.$inferInsert
export type ProjectDatabaseLog = typeof projectDatabaseLogs.$inferSelect
export type NewProjectDatabaseLog = typeof projectDatabaseLogs.$inferInsert
export type ProjectQueryFile = typeof projectQueryFiles.$inferSelect
export type NewProjectQueryFile = typeof projectQueryFiles.$inferInsert
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateLike = typeof templateLikes.$inferSelect
export type NewTemplateLike = typeof templateLikes.$inferInsert
export type ProjectShare = typeof projectShares.$inferSelect
export type NewProjectShare = typeof projectShares.$inferInsert
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect
export type NewProjectCollaborator = typeof projectCollaborators.$inferInsert
export type ProjectLog = typeof projectLogs.$inferSelect
export type NewProjectLog = typeof projectLogs.$inferInsert
export type FigmaToken = typeof figmaTokens.$inferSelect
export type NewFigmaToken = typeof figmaTokens.$inferInsert

export type ProjectFeedback = typeof projectFeedback.$inferSelect
export type NewProjectFeedback = typeof projectFeedback.$inferInsert

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert

// ====================
// SKILLS SYSTEM TABLES
// ====================

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // e.g., "video-generator", "excel-generator"
  name: text("name").notNull(), // Display name
  description: text("description").notNull(),
  icon: text("icon").default("Sparkles").notNull(), // Lucide icon name
  category: text("category").default("general").notNull(), // e.g., "content", "analysis", "productivity"
  instructions: text("instructions").notNull(), // Detailed instructions for AI on how to use this skill
  modelConfig: jsonb("model_config").$type<{
    modelName?: string // e.g., "nano-banana"
    apiEndpoint?: string // e.g., "https://api.jamili.ai/v1"
    apiKeyEnvVar?: string // e.g., "JAMILI_API_KEY"
    additionalParams?: Record<string, any>
  } | null>().default(null),
  isSystem: boolean("is_system").default(true).notNull(), // true for built-in skills
  isActive: boolean("is_active").default(true).notNull(), // system-wide activation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const userSkills = pgTable("user_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  customConfig: jsonb("custom_config").$type<Record<string, any> | null>().default(null), // User-specific overrides
  enabledAt: timestamp("enabled_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserSkill: sql`UNIQUE(${table.userId}, ${table.skillId})`,
}))

export const userApiUsage = pgTable("user_api_usage", {
  userId: text("user_id").primaryKey(),
  messageCount: integer("message_count").default(0).notNull(),
  totalCost: integer("total_cost").default(0).notNull(), // in cents
  lastReset: timestamp("last_reset").defaultNow().notNull(),
  subscriptionTier: text("subscription_tier").default("free").notNull(),
})

export const userApiKeys = pgTable("user_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }), // for "chat" managed keys
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  type: text("type").notNull().default("custom"), // "custom" | "chat"
  messageCount: integer("message_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type UserApiUsage = typeof userApiUsage.$inferSelect
export type NewUserApiUsage = typeof userApiUsage.$inferInsert
export type UserApiKey = typeof userApiKeys.$inferSelect
export type NewUserApiKey = typeof userApiKeys.$inferInsert
export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert
export type UserSkill = typeof userSkills.$inferSelect
export type NewUserSkill = typeof userSkills.$inferInsert

export type BillingHistory = typeof billingHistory.$inferSelect
export type NewBillingHistory = typeof billingHistory.$inferInsert

// ====================
// SECURITY AGENT TABLES
// ====================

export const securitySessions = pgTable("security_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  messages: jsonb("messages").$type<any[]>().default(sql`'[]'::jsonb`).notNull(),
  scanResults: jsonb("scan_results").$type<any>().default(null),
  selectedModel: text("selected_model").default("glm-4.7-flash").notNull(),
  consoleLogs: jsonb("console_logs").$type<any[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const securityMonitors = pgTable("security_monitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  publishedUrl: text("published_url"),
  lastCheckedAt: timestamp("last_checked_at"),
  sslExpiryDate: timestamp("ssl_expiry_date"),
  sslValid: boolean("ssl_valid").default(true),
  uptimeStatus: text("uptime_status"), // "up", "down", "slow"
  threatFlags: jsonb("threat_flags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type SecuritySession = typeof securitySessions.$inferSelect
export type NewSecuritySession = typeof securitySessions.$inferInsert

export type SecurityMonitor = typeof securityMonitors.$inferSelect
export type NewSecurityMonitor = typeof securityMonitors.$inferInsert

// ====================
// ANALYTICS TABLES
// ====================

export const projectAnalyticsEvents = pgTable("project_analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id"),
  type: text("type").notNull().default("pageview"), // "pageview" | "session_start" | "session_end"
  page: text("page"),
  referrer: text("referrer"),
  country: text("country"),
  city: text("city"),
  browser: text("browser"),
  os: text("os"),
  device: text("device"), // "desktop" | "mobile" | "tablet"
  duration: integer("duration"), // seconds spent on page
  isNewVisitor: boolean("is_new_visitor").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type ProjectAnalyticsEvent = typeof projectAnalyticsEvents.$inferSelect
export type NewProjectAnalyticsEvent = typeof projectAnalyticsEvents.$inferInsert

// ====================
// PLUGINS TABLES
// ====================

export const plugins = pgTable("plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  creatorName: text("creator_name").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  reviewInstructions: text("review_instructions"),
  categories: jsonb("categories").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  visuals: jsonb("visuals").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  zipFileUrl: text("zip_file_url"),
  files: jsonb("files").$type<{ path: string; content: string }[]>().default(sql`'[]'::jsonb`).notNull(),
  code: text("code"), // Main execution JS (bundled/final)
  isPaid: boolean("is_paid").default(false).notNull(),
  price: integer("price").default(0).notNull(),
  installs: integer("installs").default(0).notNull(),
  rating: text("rating").default("0").notNull(),
  reviews: integer("reviews").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Plugin = typeof plugins.$inferSelect
export type NewPlugin = typeof plugins.$inferInsert

export type ProjectSushiType = typeof projectSushi.$inferSelect
export type NewProjectSushiType = typeof projectSushi.$inferInsert
