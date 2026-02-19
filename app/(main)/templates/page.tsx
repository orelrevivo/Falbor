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
  const { userId } = await auth()
  const isAuthenticated = !!userId

  const templatesData = await getTemplates()
  const projects = isAuthenticated && userId
    ? await getUserProjects(userId)
    : []

  // ── AUTHENTICATED VIEW ────────────────────────────
  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#FAF9F5] overflow-hidden">
        {/* Sidebar */}
        <div className="absolute inset-y-0 left-0 z-20">
          <Suspense
            fallback={
              <div className="w-[320px] lg:w-[350px] h-screen bg-gray-100/60 animate-pulse" />
            }
          >
            <SidebarProjects userId={userId!} initialProjects={projects} />
          </Suspense>
        </div>

        {/* Logo */}
        <div className="absolute top-[-20px] left-2 z-30">
          <img src="/logo_light.png" width={140} alt="Falbor" />
        </div>

        {/* User menu */}
        <div className="absolute top-3 right-4 z-50">
          <UserProfileMenu />
        </div>

        {/* Main content */}
        <div
          className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-6 sm:p-8 bg-white overflow-auto"
          style={{ top: "60px", left: "300px", right: "10px", bottom: "10px" }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-center mt-6 mb-3">
            Community <span className="text-primary">Templates</span>
          </h1>

          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Start faster by cloning high-quality templates shared by the community
          </p>

          <TemplatesGrid templates={templatesData} />
        </div>
      </div>
    )
  }

  // ── PUBLIC VIEW ────────────────────────────────────
  return (
    <div className="min-h-screen Bg-main flex flex-col">
      <main className="container mx-auto px-4 mt-10 py-8 flex-1">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
            Start with the best{" "}
            <span className="font-semibold text-primary">Templates.</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Discover and clone templates published by the community
          </p>
        </div>

        <TemplatesGrid templates={templatesData} />
      </main>

      <Footer />
    </div>
  )
}
