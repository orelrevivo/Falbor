"use client"

import SidebarProjects from "@/components/project/SidebarProjects"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"
import { Suspense, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/workbench-context"
import { motion, AnimatePresence } from "framer-motion"

export default function Shell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const { activeTab, isPreviewFullScreen } = useWorkbench()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [sidebarHovered, setSidebarHovered] = useState(false)
  const isChatPage = pathname?.startsWith("/chat/")
  const isSettingsPage = pathname?.startsWith("/settings")
  const isHomePage = pathname === '/' || pathname === ''
  const isTemplatesPage = pathname?.startsWith('/templates')
  const isPricingPage = pathname?.startsWith('/pricing')
  const isProjectsPage = pathname?.startsWith('/projects')
  const isSecurityPage = pathname?.startsWith('/super-security')
  const isProfilePage = pathname?.startsWith('/profile')
  const isAlwaysOpenPage = isHomePage || isTemplatesPage || isPricingPage || isProjectsPage || isSecurityPage || isProfilePage

  const effectiveSidebarHovered = isAlwaysOpenPage || isChatPage || isSettingsPage || sidebarHovered
  const currentSidebarWidth = isAlwaysOpenPage ? 180 : ((isChatPage || isSettingsPage) ? 160 : (effectiveSidebarHovered ? 180 : 64))

  // Manage body and html scrollbar visibility
  useEffect(() => {
    if (isLoaded && user) {
      document.body.classList.add('no-scrollbar', 'overflow-hidden')
      document.documentElement.classList.add('no-scrollbar', 'overflow-hidden')
    } else {
      document.body.classList.remove('no-scrollbar', 'overflow-hidden')
      document.documentElement.classList.remove('no-scrollbar', 'overflow-hidden')
    }
    return () => {
      document.body.classList.remove('no-scrollbar', 'overflow-hidden')
      document.documentElement.classList.remove('no-scrollbar', 'overflow-hidden')
    }
  }, [isLoaded, user])

  // Don't wrap if not loaded or not signed in
  if (!isLoaded || !user) {
    return <>{children}</>
  }

  // Optional: Hide shell on specific unauthenticated-style pages even if logged in (e.g. specialized previews)
  const isDeployPage = pathname?.startsWith("/deploy")
  const isCreatorPage = pathname?.startsWith("/creator")
  if (isDeployPage || isCreatorPage) return <>{children}</>

  return (
    <div className={cn("relative min-h-screen flex flex-col overflow-hidden", isChatPage ? "bg-card" : "bg-background")}>
      {/* Global Sidebar — hidden in fullscreen */}
      {!isPreviewFullScreen && (
        <div
          className="absolute inset-y-0 left-0 z-[100]"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Suspense
            fallback={
              <div className="w-[320px] h-screen bg-gray-100/60 animate-pulse" />
            }
          >
            <SidebarProjects userId={user.id} />
          </Suspense>
        </div>
      )}

      {/* Logo — hidden in fullscreen */}
      {!isPreviewFullScreen && (
        <div className="absolute top-[-23px] left-2 z-[101] pointer-events-none">
          <img src="/logo_light.png" width={140} alt="" className="dark:hidden" />
          <img src="/logo.png" width={110} alt="" className="hidden dark:block mt-[-5px]" />
        </div>
      )}

      {/* Top Right Header — hidden in fullscreen */}
      {!isPreviewFullScreen && (
        <div className="absolute top-3 right-4 z-[102] flex items-center gap-2">
          <div id="header-right-portal" className="flex items-center gap-2" />
          {!pathname?.startsWith("/chat/") && <UserProfileMenu />}
        </div>
      )}

      {/* Top Left Header — hidden in fullscreen */}
      {!isPreviewFullScreen && (
        <div
          className="absolute top-3 transition-all duration-300 z-[102] flex items-center"
          style={{
            left: `calc(${currentSidebarWidth}px + 10px + var(--chat-width, 0px))`
          }}
        >
          <div id="header-left-portal" className="flex items-center" />
        </div>
      )}

      {/* Main content area */}
      <div
        className={cn(
          "absolute z-10 no-scrollbar transition-all duration-300",
          isChatPage
            ? "bg-card border-none rounded-none shadow-none"
            : "border border-border rounded-md bg-card overflow-hidden",
          isAlwaysOpenPage ? "transition-none" : "",
          (pathname === "/" || pathname?.startsWith("/super-security") || isChatPage) ? "" : "overflow-y-auto"
        )}
        style={isPreviewFullScreen ? {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        } : {
          top: "50px",
          left: `${currentSidebarWidth + 10}px`,
          right: "10px",
          bottom: "10px",
        }}
        id="main-content-square"
      >
        {(pathname === "/" || pathname?.startsWith("/super-security") || isChatPage) ? (
          <div className="w-full h-full">
            {children}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <div
              key={pathname}
              className="w-full h-full"
            >
              {children}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
