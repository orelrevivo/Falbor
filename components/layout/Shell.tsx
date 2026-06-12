"use client"

import SidebarProjects from "@/components/project/SidebarProjects"
import { UserProfileMenu } from "@/components/layout/user-profile-menu"
import { Suspense, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/workbench-context"
import { PreviewToolbar } from "@/components/workbench/preview-toolbar"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Home,
  BookTemplate,
  CreditCard,
  UserCircle,
  BarChart3,
  Cpu,
  Key,
  Sparkles,
  Folder,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Bot
} from "lucide-react"

export default function Shell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const {
    activeTab,
    isPreviewFullScreen,
    previewUrl,
    previewPages,
    selectedDevice,
    setSelectedDevice,
    zoom,
    setZoom,
    refreshPreview,
    setIsPreviewFullScreen,
    isTerminalOpen,
    setIsTerminalOpen,
  } = useWorkbench()
  const [mounted, setMounted] = useState(false)

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      const fetchProjects = async () => {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            setProjects(data.projects || []);
          }
        } catch (err) {
          console.error("Shell failed to fetch projects for search:", err);
        }
      };
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Chats", path: "/projects", icon: MessageSquare },
    { name: "Agents", path: "/agents", icon: Bot },
    { name: "Templates", path: "/templates", icon: BookTemplate },
    { name: "Pricing", path: "/pricing", icon: CreditCard },
    { name: "Settings - Account", path: "/settings/account", icon: UserCircle },
    { name: "Settings - Billing", path: "/settings/billing", icon: CreditCard },
    { name: "Settings - Usage", path: "/settings/usage", icon: BarChart3 },
    { name: "Settings - MCP", path: "/settings/mcp", icon: Cpu },
    { name: "Settings - API Keys", path: "/settings/api-keys", icon: Key },
    { name: "Settings - Skills", path: "/settings/skills", icon: Sparkles },
  ]

  const filteredNavItems = navItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredProjects = projects.filter(project =>
    (project.title || "Untitled Project").toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true)
  const isChatPage = pathname?.startsWith("/chat/")
  const isSettingsPage = pathname?.startsWith("/settings")
  const isHomePage = pathname === '/' || pathname === ''
  const isTemplatesPage = pathname?.startsWith('/templates')
  const isPricingPage = pathname?.startsWith('/pricing')
  const isProjectsPage = pathname?.startsWith('/projects')
  const isSecurityPage = pathname?.startsWith('/super-security')
  const isProfilePage = pathname?.startsWith('/profile')
  const isAlwaysOpenPage = isHomePage || isTemplatesPage || isPricingPage || isProjectsPage || isSecurityPage || isProfilePage

  const effectiveSidebarHovered = isAlwaysOpenPage || isSettingsPage || sidebarHovered
  const currentSidebarWidth = isChatPage ? (chatSidebarOpen ? 180 : 0) : (isAlwaysOpenPage || isSettingsPage ? 180 : (effectiveSidebarHovered ? 180 : 64))

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
      {!isPreviewFullScreen && (!isChatPage || chatSidebarOpen) && (
        <div
          id="falbor-sidebar"
          className="absolute top-[50px] bottom-0 left-0 z-[100]"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Suspense
            fallback={
              <div className="w-[320px] h-[calc(100vh-50px)] bg-gray-100/60 animate-pulse" />
            }
          >
            <SidebarProjects userId={user.id} />
          </Suspense>
        </div>
      )}

      {/* Top Navbar — hidden in fullscreen */}
      {!isPreviewFullScreen && (
        <div
          id="falbor-header"
          className="absolute top-0 left-0 right-0 h-[50px] z-[90] flex items-center justify-between px-6 bg-background border-b border-border transition-all duration-300"
        >
          {/* Left section: Logo + Left Portal */}
          <div className="flex items-center h-full">
            {/* Logo */}
            <div className="flex items-center relative h-full w-[160px] mr-4">
              <div className="absolute top-[-7rpx] left-[-10px] pointer-events-none">
                <img src="/Falbor-logo-chat.png" width={120} alt="" className="dark:hidden" />
                <img src="/Falbor-logo-chat-dark.png" width={120} alt="" className="hidden dark:block mt-[-5px]" />
              </div>
            </div>

            {/* Sidebar toggle + Profile dropdown — only on chat pages */}
            {isChatPage && (
              <div className="flex items-center gap-1 mr-4">
                <button
                  onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={chatSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                  <ChevronLeft
                    className={cn(
                      "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300",
                      !chatSidebarOpen && "rotate-180"
                    )}
                  />
                </button>
                <div id="navbar-profile-portal" className="relative flex items-center" />
              </div>
            )}

            {/* Top Left Header */}
            <div
              className="flex items-center transition-all duration-300"
              style={{
                paddingLeft: `calc(var(--chat-width, 0px) + ${currentSidebarWidth}px - 160px + 10px)`
              }}
            >
              <div id="header-left-portal" className="flex items-center" />
            </div>
          </div>

          {/* Centered Search Button */}
          {!isChatPage && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
              <button
                onClick={() => {
                  setSearchQuery("")
                  setIsSearchOpen(true)
                }}
                className="flex items-center justify-between gap-2 px-4 py-1.5 w-[380px] bg-zinc-50 dark:bg-[#1E1E22] border border-[#dbd9d965]  dark:border-none hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-sm transition-all text-xs font-normal cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Search...</span>
                </span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium opacity-100 border-border">
                  <span className="text-[10px]">⌘</span>K
                </kbd>
              </button>
            </div>
          )}

          {/* PreviewToolbar — absolute centered, same as Shell's search button */}
          {(isPreviewFullScreen || (isChatPage && activeTab === "preview")) && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
              <PreviewToolbar
                url={previewUrl}
                onRefresh={refreshPreview}
                selectedDevice={selectedDevice}
                onDeviceChange={setSelectedDevice}
                zoom={zoom}
                onZoomChange={setZoom}
                isFullScreen={isPreviewFullScreen}
                onToggleFullScreen={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
                pages={previewPages}
                onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
              />
            </div>
          )}

          {/* Top Right Header */}
          <div className="flex items-center gap-2">
            <div id="header-right-portal" className="flex items-center gap-2" />
            {!pathname?.startsWith("/chat/") && <UserProfileMenu />}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div
        className={cn(
          "absolute z-10 no-scrollbar transition-all duration-300 bg-card overflow-hidden",
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
          left: `${currentSidebarWidth}px`,
          right: 0,
          bottom: 0,
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
      {/* Premium Spotlight Command Palette Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-white/20 dark:bg-black/85 backdrop-blur-sm z-[999] flex items-start justify-center pt-24 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.05 }}
              className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-border shadow-md rounded-sm w-full max-w-lg overflow-hidden flex flex-col max-h-[500px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Search Input */}
              <div className="relative flex items-center border-b border-border px-4 py-3 bg-[#FCFCFD] dark:bg-[#242426]">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps, pages, settings..."
                  className="bg-transparent text-sm w-full outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[10px] bg-muted dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-2 py-1 rounded text-muted-foreground select-none cursor-pointer transition-colors border border-border"
                >
                  ESC
                </button>
              </div>

              {/* Body: Scrollable Results */}
              <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar max-h-[380px] bg-background">
                {/* Navigation Group */}
                {filteredNavItems.length > 0 && (
                  <div>
                    <div className="px-2.5 pb-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Navigation & Settings</div>
                    <div className="space-y-0.5">
                      {filteredNavItems.map(item => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              router.push(item.path);
                              setIsSearchOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl text-foreground hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-all cursor-pointer text-left group"
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</span>
                            </span>
                            <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Apps Group */}
                {filteredProjects.length > 0 && (
                  <div>
                    <div className="px-2.5 pb-1.5 mt-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Apps & Projects</div>
                    <div className="space-y-0.5">
                      {filteredProjects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            router.push(`/chat/${project.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl text-foreground hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-all cursor-pointer text-left group"
                        >
                          <span className="flex items-center gap-3">
                            <Folder className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors truncate max-w-[280px]">{project.title || "Untitled Project"}</span>
                          </span>
                          <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredNavItems.length === 0 && filteredProjects.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No results found</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">We couldn't find any page, settings, or project matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
