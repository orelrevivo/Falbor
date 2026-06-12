import { auth } from "@clerk/nextjs/server"
import { InputArea } from "@/components/workbench/input-area"
import DefaultDemo from "@/components/layout/Button/Navbar"
import Footer from "@/components/layout/footer"
import HeroSection from "@/components/layout/HeroSection"
import FAQ from "@/components/layout/faq"
import HeroText from "@/components/layout/hero"
import { LandingScrollHandler } from "@/components/layout/landing-scroll-handler"
import CompanyLogos from "@/components/layout/LogsCompanySection"
import SidebarProjects from "@/components/project/SidebarProjects"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"
import { neon } from "@neondatabase/serverless"
import { Suspense } from "react"
import "@/styles/bg.css"
import Example from "@/components/layout/Example"
import Example2 from "@/components/layout/Example/Example"
import FeatureScroller from "@/components/layout/features/feature-scroller";
import ApplicationPreview from "@/components/layout/features/feature-scroller/application-preview"
import PricingSection from "@/components/layout/features/feature-scroller/pricing"
import { Button } from "@/components/ui/button"
import FeatureCards from "@/components/layout/features/FeatureCards"
import { HomeTabs } from "@/components/home/home-tabs"
import * as motion from "framer-motion/client"
import { ThemeHandler } from "@/components/layout/ThemeHandler"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
      className={`relative min-h-screen flex flex-col ${isAuthenticated ? "overflow-hidden bg-background" : ""
        }`}
    >
      <main className="flex flex-1 flex-col items-center w-full">

        {!isAuthenticated && (
          <div className="w-full flex flex-col relative">
            <ThemeHandler force="light" />
            <LandingScrollHandler />

            {/* ✅ STICKY HERO SECTION (Pins in place) */}
            <div className="sticky top-0 w-full h-screen flex flex-col items-center justify-center z-10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 w-full z-20">
                <DefaultDemo />
              </div>

              {/* ✅ centered background image layer */}
              <div
                className="pointer-events-none absolute inset-0 w-full h-full z-0"
                style={{
                  backgroundImage: "url('/bg/bg-v3.png')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />

              {/* ✅ CONTENT ABOVE BG (Exactly original coordinates!) */}
              <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center mt-[-200px]">
                <HeroText />
                <div className="w-full flex justify-center mt-6">
                  <InputArea isAuthenticated={false} />
                </div>
              </div>
            </div>

            {/* ✅ Section 2: Features / HeroSection (z-20) */}
            <div className="sticky top-0 w-full h-screen overflow-y-auto no-scrollbar flex flex-col items-center justify-start z-20 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.06)] border-t border-zinc-150/40 pt-20 pb-16">
              <HeroSection />
            </div>

            {/* ✅ Section 3: ApplicationPreview (z-30) */}
            <div className="sticky top-0 w-full h-screen overflow-y-auto no-scrollbar flex flex-col items-center justify-start z-30 bg-background shadow-[0_-20px_40px_rgba(0,0,0,0.06)] border-t border-zinc-150/40 pt-20 pb-16">
              <div className="w-full max-w-7xl px-4 flex justify-center">
                <ApplicationPreview />
              </div>
            </div>

            {/* ✅ Section 4: PricingSection (z-40) */}
            <div className="sticky top-0 w-full h-screen overflow-y-auto no-scrollbar flex flex-col items-center justify-start z-40 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.06)] border-t border-zinc-150/40 pt-20 pb-16">
              <PricingSection />
            </div>

            {/* ✅ Section 5: FAQ (z-50) */}
            <div className="sticky top-0 w-full h-screen overflow-y-auto no-scrollbar flex flex-col items-center justify-start z-50 bg-background shadow-[0_-20px_40px_rgba(0,0,0,0.06)] border-t border-zinc-150/40 pt-20 pb-24">
              <FAQ />
            </div>
          </div>
        )}

        {/* ================= AUTH ================= */}
        {isAuthenticated && (
          <div
            // bg-[url('/bg/bg-v23-chat.png')]
            className="absolute z-10 p-6 sm:p-8 bg-[#FAFAFA] no-scrollbar w-full h-full dark:bg-[url('/bg/bg-blue-dark.png')] bg-no-repeat bg-center bg-cover"
            style={{
              top: "0px",
              left: "0px",
              right: "0px",
              bottom: "0px",
              overflowY: "hidden",
            }}
          >
            <div
              className="flex flex-col items-center h-full justify-center top-[-110px] relative w-full"
            >
              {/* <img src="/bg/bg-text.png" alt="" className="absolute mt-[-160px] ml-25 w-[50%] pointer-events-none" /> */}
              <div className="w-full flex justify-center mt-6 z-10">
                <InputArea isAuthenticated />
              </div>
              {/* <div className="absolute bottom-[-130px] flex justify-center w-full z-10">
                <FeatureCards />
              </div> */}
            </div>
          </div>
        )}
      </main>

      {!isAuthenticated && <Footer />}
    </div>
  )
}