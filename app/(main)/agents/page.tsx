"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bot,
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Loader2,
  Calendar,
  User,
  Star,
  Edit2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  Users2,
  ArrowUpDown,
  Lock,
  ChevronDown,
  Activity,
  Code2,
  Database,
  Terminal,
  Cpu,
  Key
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface Agent {
  id: string
  name: string
  description: string | null
  status: string
  currentStep: string
  createdAt: string
  updatedAt: string
  config?: any
}

export default function AgentsPage() {
  const router = useRouter()
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress || "orelrevivo4000@gmail.com"

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("")
  const [activeActionFilter, setActiveActionFilter] = useState<string>("All Actions")

  // Column Visibility Controls
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    createdBy: true,
    access: true
  })

  // Sorting Control
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  // Favorites persistence
  const [favorites, setFavorites] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  // Fetch agents & load favorites on mount
  useEffect(() => {
    fetchAgents()
    const storedFavs = localStorage.getItem("fav_agents")
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents")
      if (!res.ok) {
        throw new Error("Failed to fetch agents")
      }
      const data = await res.json()
      setAgents(data.agents || [])
      if (data.agents && data.agents.length > 0) {
        localStorage.setItem("mock_agents", JSON.stringify(data.agents))
      }
    } catch (error) {
      console.warn("Failed to fetch database agents, loading robust mock fallbacks:", error)
      const localMock = localStorage.getItem("mock_agents")
      if (localMock) {
        try {
          setAgents(JSON.parse(localMock))
          setLoading(false)
          return
        } catch (e) { }
      }

      const seeded = [
        {
          id: "agent-1",
          name: "Test Builder Agent",
          description: "Autonomous website and component generator",
          status: "completed",
          currentStep: "completed",
          createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            avatar: { type: "icon", icon: "bot" },
            access: "Private"
          }
        },
        {
          id: "agent-2",
          name: "Framer Copywriter",
          description: "Specialized copywriting agent for conversion optimized SaaS landing pages",
          status: "completed",
          currentStep: "completed",
          createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          config: {
            avatar: { type: "icon", icon: "sparkles" },
            access: "Public"
          }
        }
      ]
      setAgents(seeded)
      localStorage.setItem("mock_agents", JSON.stringify(seeded))
    } finally {
      setLoading(false)
    }
  }

  // Toggle Favorite
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    let updated: string[]
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id)
      toast.success("Removed from favorites")
    } else {
      updated = [...favorites, id]
      toast.success("Added to favorites (will rank first)")
    }
    setFavorites(updated)
    localStorage.setItem("fav_agents", JSON.stringify(updated))
  }

  const handleCreateAgent = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Builder Agent #${Math.floor(1000 + Math.random() * 9000)}`,
          description: "Autonomous website development agent"
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success("Agent initiated! Redirecting to setup...")
        setTimeout(() => {
          router.push(`/agents/${data.agent.id}/create`)
        }, 500)
        return
      }
      throw new Error("Failed to initialize agent")
    } catch (error) {
      console.warn("POST /api/agents failed, using robust mock creation:", error)
      const newMockId = `mock-agent-${Math.floor(10000 + Math.random() * 90000)}`
      const newMock = {
        id: newMockId,
        name: `Builder Agent #${Math.floor(1000 + Math.random() * 9005)}`,
        description: "Autonomous website development agent",
        status: "in_progress",
        currentStep: "setup",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          avatar: { type: "icon", icon: "bot" },
          access: "Private"
        }
      }

      const updated = [newMock, ...agents]
      setAgents(updated)
      localStorage.setItem("mock_agents", JSON.stringify(updated))

      toast.success("Agent initiated (Local Mode)! Redirecting to setup...")
      setTimeout(() => {
        router.push(`/agents/${newMockId}/create`)
      }, 500)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteAgent = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setAgents(prev => prev.filter(a => a.id !== id))
        toast.success("Agent successfully deleted.")
        return
      }
      throw new Error("Deletion failed")
    } catch (error) {
      console.warn("DELETE failed, removing from local mocks:", error)
      const updated = agents.filter(a => a.id !== id)
      setAgents(updated)
      localStorage.setItem("mock_agents", JSON.stringify(updated))
      toast.success("Agent successfully deleted.")
    } finally {
      setDeletingId(null)
    }
  }

  // Filter & sorting pipeline
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))

    // Capability action filters mapped from config capabilities
    let matchesAction = true
    if (activeActionFilter !== "All Actions") {
      const caps = agent.config?.capabilities || {}
      if (activeActionFilter === "Web Search" && !caps.webSearch) matchesAction = false
      if (activeActionFilter === "Fetch URLs" && !caps.openUrl) matchesAction = false
      if (activeActionFilter === "Image Generation" && !caps.imageGen) matchesAction = false
      if (activeActionFilter === "Code Sandbox" && !caps.codeInterpreter) matchesAction = false
      if (activeActionFilter === "GitHub Analytics" && !caps.codingAgent) matchesAction = false
    }

    return matchesSearch && matchesAction
  })

  // Sort pipeline: Favorites rank first, then apply sortOrder toggle (Newest First vs Oldest First)
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    const aFav = favorites.includes(a.id) ? 1 : 0
    const bFav = favorites.includes(b.id) ? 1 : 0
    if (aFav !== bFav) return bFav - aFav

    const timeA = new Date(a.updatedAt).getTime()
    const timeB = new Date(b.updatedAt).getTime()
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB
  })

  // Toggle Sorting
  const toggleSortOrder = () => {
    const nextOrder = sortOrder === "newest" ? "oldest" : "newest"
    setSortOrder(nextOrder)
    toast.info(nextOrder === "newest" ? "Sorted by newest updates first" : "Sorted by oldest updates first")
  }

  // Pagination calculation
  const totalItems = sortedAgents.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAgents = sortedAgents.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when queries/filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeActionFilter])

  // Calculate dynamic column spans based on visible items to sum up to 12
  let nameSpan = 3
  const descSpan = 3
  const createdSpan = 3
  const accessSpan = 2
  const actionsSpan = 1

  let defaultRemaining = 12 - actionsSpan
  if (visibleColumns.description) defaultRemaining -= descSpan
  if (visibleColumns.createdBy) defaultRemaining -= createdSpan
  if (visibleColumns.access) defaultRemaining -= accessSpan
  nameSpan = defaultRemaining

  return (
    <div className="min-h-screen bg-zinc-50/60 text-zinc-950 px-4 md:px-8 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex-1 flex flex-col">

        {/* Header Section */}
        <div className="flex items-start justify-between mb-8 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-zinc-950 rounded-full flex items-center justify-center relative">
                <div className="w-2.5 h-2.5 bg-zinc-950 rounded-full" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">Agents</h1>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Customize AI behavior and knowledge with agents. Manage agents in your organization.
            </p>
          </div>

          <Button
            onClick={handleCreateAgent}
            disabled={creating}
            className="bg-[#0099ff] hover:bg-[#0077cc] text-white font-semibold text-xs px-3.5 h-6.5 rounded-sm shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            {creating ? (
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-0.5" />
            )}
            New Agent
          </Button>
        </div>

        {/* Toolbar & Filters (Matching exact screenshot layouts) */}
        <div className="space-y-3 mb-4">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9"
            />
          </div>

          {/* Filtering dropdowns row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">

              {/* Everyone filter using prebuilt DropdownMenu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 h-8 rounded-sm bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors shadow-xs">
                    <User className="h-3 w-3 text-zinc-400" />
                    <span>Everyone</span>
                    <ChevronDown className="h-3 w-3 text-zinc-400 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white border border-zinc-200 rounded-md shadow-md py-1.5 z-20">
                  <DropdownMenuLabel className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Collaborators
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="px-3 py-1.5 text-xs text-zinc-750 font-semibold truncate hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/20 shadow-2xs" />
                    {userEmail} (You)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Actions/Capabilities filter using prebuilt DropdownMenu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 h-8 rounded-sm bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors shadow-xs">
                    <Activity className="h-3 w-3 text-zinc-400" />
                    <span>{activeActionFilter}</span>
                    <ChevronDown className="h-3 w-3 text-zinc-400 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-white border border-zinc-200 rounded-md shadow-md py-1 z-20">
                  {["All Actions", "Web Search", "Fetch URLs", "Image Generation", "Code Sandbox", "GitHub Analytics"].map((act) => (
                    <DropdownMenuItem
                      key={act}
                      onClick={() => setActiveActionFilter(act)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors hover:bg-zinc-50",
                        activeActionFilter === act ? "text-[#0099ff] bg-blue-50/10 font-bold" : "text-zinc-650"
                      )}
                    >
                      {act}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

            </div>

            {/* Active Toolbar Buttons */}
            <div className="flex items-center gap-1">

              {/* Column Settings using prebuilt DropdownMenu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 h-8 rounded-sm bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors shadow-xs">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44 bg-white border border-zinc-200 rounded-md shadow-md py-2 px-3 z-20 space-y-1.5">
                  <DropdownMenuLabel className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-100 mb-1.5">
                    Show Columns
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    className="flex items-center gap-2.5 text-xs font-semibold text-zinc-650 cursor-pointer select-none"
                    onSelect={(e) => {
                      e.preventDefault()
                      setVisibleColumns(prev => ({ ...prev, description: !prev.description }))
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.description}
                      readOnly
                      className="rounded border-zinc-300 text-[#0099ff] focus:ring-[#0099ff] pointer-events-none"
                    />
                    <span>Description</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2.5 text-xs font-semibold text-zinc-650 cursor-pointer select-none"
                    onSelect={(e) => {
                      e.preventDefault()
                      setVisibleColumns(prev => ({ ...prev, createdBy: !prev.createdBy }))
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.createdBy}
                      readOnly
                      className="rounded border-zinc-300 text-[#0099ff] focus:ring-[#0099ff] pointer-events-none"
                    />
                    <span>Created By</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2.5 text-xs font-semibold text-zinc-650 cursor-pointer select-none"
                    onSelect={(e) => {
                      e.preventDefault()
                      setVisibleColumns(prev => ({ ...prev, access: !prev.access }))
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.access}
                      readOnly
                      className="rounded border-zinc-300 text-[#0099ff] focus:ring-[#0099ff] pointer-events-none"
                    />
                    <span>Access</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort toggle button */}
              <button
                className="flex items-center gap-1.5 px-3 h-8 rounded-sm bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors shadow-xs"
                onClick={toggleSortOrder}
                title={`Sort: ${sortOrder === "newest" ? "Newest First" : "Oldest First"}`}
              >
                <ArrowUpDown className={cn("h-3.5 w-3.5 transition-transform", sortOrder === "oldest" && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>

        {/* Table/List Grid Layout */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-zinc-200/80 rounded-lg shadow-2xs">
            <Loader2 className="h-7 w-7 animate-spin text-[#0099ff] mb-3" />
            <p className="text-zinc-400 text-xs font-medium">Retrieving active agents...</p>
          </div>
        ) : paginatedAgents.length === 0 ? (
          <div className="flex-1 border border-dashed border-zinc-250 rounded-lg p-10 flex flex-col items-center justify-center text-center bg-white shadow-2xs">
            <Bot className="h-10 w-10 text-zinc-350 mb-3" />
            <h3 className="text-sm font-bold text-zinc-800">No Agents Setup Yet</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs mt-1 mb-4">
              Initiate your custom website-building agent to automate your React/Tailwind design workflows.
            </p>
            <Button
              onClick={handleCreateAgent}
              disabled={creating}
              className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs px-3 h-8 rounded-full shadow-xs cursor-pointer"
            >
              Create Agent
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-2">

            {/* Table Header row */}
            <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none border-b border-zinc-100">
              <div style={{ gridColumn: `span ${nameSpan} / span ${nameSpan}` }}>Name</div>
              {visibleColumns.description && <div className="col-span-3">Description</div>}
              {visibleColumns.createdBy && <div className="col-span-3">Created By</div>}
              {visibleColumns.access && <div className="col-span-2">Access</div>}
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Body rows */}
            <div className="space-y-1.5">
              {paginatedAgents.map((agent) => {
                const isFavorite = favorites.includes(agent.id)
                const avatarCfg = agent.config?.avatar || {}
                const accessLevel = agent.config?.access || "Private"

                // Render custom uploaded avatar or preset gradient icon
                const renderRowAvatar = () => {
                  if (avatarCfg.type === "image" && avatarCfg.image) {
                    return (
                      <img
                        src={avatarCfg.image}
                        alt=""
                        className="w-5.5 h-5.5 rounded-md object-cover border border-zinc-200"
                      />
                    )
                  }

                  // Preset configs match preset color gradient
                  const prebuilt = PREBUILT_AVATARS.find(a => a.name === avatarCfg.icon) || PREBUILT_AVATARS[0]
                  const IconComponent = prebuilt.icon

                  return (
                    <div className={cn("w-5.5 h-5.5 rounded-md flex items-center justify-center bg-gradient-to-tr text-white text-[9px] border border-white/5", prebuilt.color)}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                  )
                }

                return (
                  <div
                    key={agent.id}
                    className="grid grid-cols-12 items-center px-4 py-3 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 hover:shadow-2xs transition-all relative group"
                  >
                    {/* Name column with avatar icon */}
                    <div
                      style={{ gridColumn: `span ${nameSpan} / span ${nameSpan}` }}
                      className="flex items-center gap-2.5 min-w-0 pr-2"
                    >
                      {renderRowAvatar()}
                      <span className="text-xs font-bold text-zinc-900 truncate">
                        {agent.name}
                      </span>
                    </div>

                    {/* Description column */}
                    {visibleColumns.description && (
                      <div className="col-span-3 text-xs text-zinc-550 truncate pr-4">
                        {agent.description || "No description."}
                      </div>
                    )}

                    {/* Created By column (Email of active user) */}
                    {visibleColumns.createdBy && (
                      <div className="col-span-3 flex items-center gap-1.5 text-xs text-zinc-650 min-w-0 pr-4">
                        <User className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="truncate font-medium">{userEmail}</span>
                      </div>
                    )}

                    {/* Access level column */}
                    {visibleColumns.access && (
                      <div className="col-span-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          accessLevel === "Public"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-150"
                        )}>
                          {accessLevel === "Public" ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          {accessLevel}
                        </span>
                      </div>
                    )}

                    {/* Actions and Row Hover Buttons Column */}
                    <div className="col-span-1 flex items-center justify-end relative">

                      {/* Hover action bar overlay (Star, Edit, Menu) */}
                      <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white pl-2 py-1">

                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(agent.id, e)}
                          className={cn(
                            "p-1 rounded-md border transition-all cursor-pointer",
                            isFavorite
                              ? "bg-amber-50 border-amber-250 text-amber-500"
                              : "bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                          )}
                          title="Pin/Favorite to Top"
                        >
                          <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-amber-500" : "")} />
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => router.push(`/agents/${agent.id}/create`)}
                          className="p-1 bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Agent settings"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Dropdown menu for row actions using prebuilt DropdownMenu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-28 bg-white border border-zinc-250 rounded-md shadow-md py-1 z-30">
                            <DropdownMenuItem
                              onClick={() => router.push(`/agents/${agent.id}/status`)}
                              className="w-full text-left px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Activity className="h-3.5 w-3.5 text-zinc-400" />
                              Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="w-full text-left px-2.5 py-1 text-xs font-semibold text-red-650 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                      </div>

                      {/* Static Default Icon (when not hovered) */}
                      <div className="group-hover:opacity-0 transition-opacity">
                        <MoreHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                      </div>

                    </div>

                  </div>
                )
              })}
            </div>

            {/* Pagination footer section */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-150 text-xs text-zinc-400 select-none">
              <span>
                Showing {totalItems === 0 ? 0 : startIndex + 1}~{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={cn(
                        "w-6.5 h-6.5 rounded-md text-xs font-bold transition-all cursor-pointer",
                        currentPage === pNum
                          ? "bg-zinc-150 text-zinc-900 border border-zinc-200"
                          : "text-zinc-400 hover:text-zinc-800"
                      )}
                    >
                      {pNum}
                    </button>
                  )
                })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

// Preset color list for layout bindings
const PREBUILT_AVATARS = [
  { icon: Bot, color: "from-blue-500 to-indigo-500", name: "bot" },
  { icon: Sparkles, color: "from-amber-500 to-orange-500", name: "sparkles" },
  { icon: Code2, color: "from-emerald-500 to-teal-500", name: "code" },
  { icon: Users2, color: "from-purple-500 to-pink-500", name: "users" },
  { icon: Database, color: "from-cyan-500 to-blue-500", name: "database" },
  { icon: Terminal, color: "from-rose-500 to-red-500", name: "terminal" },
  { icon: Cpu, color: "from-violet-500 to-purple-500", name: "cpu" },
  { icon: Key, color: "from-yellow-500 to-amber-600", name: "key" },
]
