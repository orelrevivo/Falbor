import { auth } from "@clerk/nextjs/server"
import { InputArea } from "@/components/workbench/input-area"
import Footer from "@/components/layout/footer"
import HeroSection from "@/components/layout/HeroSection"
import FAQ from "@/components/layout/faq"
import HeroText from "@/components/layout/hero"
import CompanyLogos from "@/components/layout/LogsCompanySection"
import SidebarProjects from "@/components/project/SidebarProjects"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"
import { neon } from "@neondatabase/serverless"
import { Suspense } from "react"
import "@/styles/bg.css"

interface ProjectItem {
  id: string
  title: string
  updated_at: string
  is_owner: boolean
  collaborator_count?: number
}

async function getUserProjects(userId: string): Promise<ProjectItem[]> {
  const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

  try {
    const owned = await sql`
      SELECT id, title, updated_at, TRUE AS is_owner,
      (SELECT COUNT(*) FROM project_collaborators pc WHERE pc.project_id = projects.id AND pc.status='accepted') AS collaborator_count
      FROM projects WHERE user_id = ${userId} ORDER BY updated_at DESC LIMIT 12
    ` as ProjectItem[]

    const collab = await sql`
      SELECT p.id, p.title, p.updated_at, FALSE AS is_owner, 0 AS collaborator_count
      FROM projects p
      JOIN project_collaborators pc ON p.id = pc.project_id
      WHERE pc.user_id = ${userId} AND pc.status='accepted'
      ORDER BY p.updated_at DESC LIMIT 12
    ` as ProjectItem[]

    return [...owned, ...collab].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime()
    )
  } catch (err) {
    console.error("Failed to fetch projects:", err)
    return []
  }
}

export default async function HomePage() {
  const { userId } = await auth()
  const isAuthenticated = !!userId

  let projects: ProjectItem[] = []
  if (isAuthenticated && userId) {
    projects = await getUserProjects(userId)
  }

  return (
    <div
      className={`relative min-h-screen flex flex-col overflow-hidden ${isAuthenticated ? "bg-[#FAF9F5]" : "Bg-main"
        }`}
    >
      <main className="flex flex-1 flex-col items-center px-4 w-full">
        {isAuthenticated && (
          <>
            <div className="absolute inset-y-0 left-0 z-20">
              <Suspense
                fallback={
                  <div className="w-[320px] lg:w-[350px] h-screen bg-gray-100/60 animate-pulse" />
                }
              >
                <SidebarProjects
                  userId={userId!}
                  initialProjects={projects}
                />
              </Suspense>
            </div>
            <div className="absolute top-[-20px] left-2">
              <img src="/logo_light.png" width={140} alt="" />
            </div>
            <div className="absolute top-3 right-4 z-50">
              <UserProfileMenu />
            </div>
          </>
        )}

        {!isAuthenticated && (
          <div className="w-full flex flex-col">
            <div className="w-full min-h-screen flex flex-col items-center justify-center">
              <div className="w-full max-w-4xl px-4 flex flex-col items-center mt-[-200px]">
                <HeroText />
                <div className="w-full flex justify-center mt-6">
                  <InputArea isAuthenticated={false} />
                </div>
              </div>
            </div>

            <div className="w-full space-y-20 pb-20">
              <HeroSection />
              <FAQ />
              <CompanyLogos />
            </div>
          </div>
        )}

        {isAuthenticated && (
          <div
            className="absolute z-10 backdrop-blur-md border rounded-md shadow-sm p-6 sm:p-8 overflow-auto bg-white"
            style={{
              top: "60px",
              left: "300px",
              right: "10px",
              bottom: "10px",
            }}
          >
            <div className="flex flex-col items-center h-full justify-center top-[-120px] relative">
              <HeroText />
              <div className="w-full flex justify-center mt-6">
                <InputArea isAuthenticated />
              </div>
            </div>
          </div>
        )}
      </main>

      {!isAuthenticated && <Footer />}
    </div>
  )
}