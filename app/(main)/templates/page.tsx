// app/templates/page.tsx
import { auth } from "@clerk/nextjs/server"
import { Suspense } from "react"
import { db } from "@/config/db"
import { templates, userCredits } from "@/config/schema"
import { desc, eq } from "drizzle-orm"
import { clerkClient } from "@clerk/nextjs/server"

import { TemplatesGrid } from "@/components/workbench/templates/templates-grid"
import SidebarProjects from "@/components/project/SidebarProjects"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"
import Footer from "@/components/layout/footer"

import "@/styles/bg.css"

// ── Types ─────────────────────────────────────────────
interface ProjectItem {
  id: string
  title: string
  updated_at: string
  is_owner: boolean
  collaborator_count?: number
}

// ── Data Fetching ─────────────────────────────────────
async function getUserProjects(userId: string): Promise<ProjectItem[]> {
  const sql = require("@neondatabase/serverless").neon(
    process.env.NEON_NEON_DATABASE_URL!
  )

  try {
    const owned = (await sql`
      SELECT id, title, updated_at, TRUE AS is_owner,
      (SELECT COUNT(*) FROM project_collaborators pc 
       WHERE pc.project_id = projects.id AND pc.status='accepted') AS collaborator_count
      FROM projects 
      WHERE user_id = ${userId} 
      ORDER BY updated_at DESC 
      LIMIT 12
    `) as ProjectItem[]

    const collab = (await sql`
      SELECT p.id, p.title, p.updated_at, FALSE AS is_owner, 0 AS collaborator_count
      FROM projects p
      JOIN project_collaborators pc ON p.id = pc.project_id
      WHERE pc.user_id = ${userId} AND pc.status='accepted'
      ORDER BY p.updated_at DESC 
      LIMIT 12
    `) as ProjectItem[]

    return [...owned, ...collab].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  } catch (err) {
    console.error("Failed to fetch projects:", err)
    return []
  }
}

async function getTemplates() {
  const allTemplates = await db
    .select()
    .from(templates)
    .orderBy(desc(templates.createdAt))

  return Promise.all(
    allTemplates.map(async (template) => {
      try {
        const client = await clerkClient()
        const user = await client.users.getUser(template.creatorId)

        const [credits] = await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.userId, template.creatorId))

        return {
          ...template,
          creatorName:
            user.firstName
              ? `${user.firstName} ${user.lastName || ""}`.trim()
              : user.username || "Anonymous",
          creatorImage: user.imageUrl,
          hasSubscription: credits?.subscriptionTier !== "none",
        }
      } catch {
        return {
          ...template,
          creatorName: "Anonymous",
          creatorImage: null,
          hasSubscription: false,
        }
      }
    })
  )
}

// ── Metadata ──────────────────────────────────────────
export const metadata = {
  title: "Templates | Falbor",
  description: "Browse and clone templates created by the community",
}

// ── Page ──────────────────────────────────────────────
export default async function TemplatesPage() {
  const templatesData = await getTemplates()

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center mt-6 mb-3">
        Community <span className="text-primary">Templates</span>
      </h1>

      <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
        Start faster by cloning high-quality templates shared by the community
      </p>

      <div className="max-w-7xl mx-auto">
        <TemplatesGrid templates={templatesData} />
      </div>
    </div>
  )
}
