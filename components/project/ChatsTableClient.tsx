"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
    Users,
    Clock,
    ExternalLink,
    MoreVertical,
    Trash2,
    Copy,
    Edit2,
    Globe,
    Search,
    ChevronDown,
    SlidersHorizontal,
    LayoutGrid,
    List,
    Star,
    Eye,
    EyeOff
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "../ui/input"

interface Project {
    id: string
    title: string
    updated_at: string
    user_id: string
    is_owner: boolean
    owner_name?: string
    collaborator_count?: number
    preview_url?: string | null
    is_public?: boolean
    published_url?: string | null
    is_favorite?: boolean
}

interface User {
    id: string
    firstName?: string | null
    imageUrl: string
}

interface ChatsTableClientProps {
    initialProjects: Project[]
    user: User
}

export function ChatsTableClient({ initialProjects, user }: ChatsTableClientProps) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>(initialProjects)

    // Filter and Sort states
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<"default" | "latest">("default")
    const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorites" | "non-favorites">("all")
    const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all")
    const [creatorFilter, setCreatorFilter] = useState<"all" | "me" | "shared">("all")
    const [viewMode, setViewMode] = useState<"grid" | "list">("list")

    const handleDelete = async (projectId: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this chat?")) return

        setProjects(prev => prev.filter(p => p.id !== projectId))
        try {
            const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete chat")
            toast.success("Chat deleted")
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error("Failed to delete chat")
            router.refresh()
        }
    }

    const handleDuplicate = async (project: Project, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        toast.success("Duplicate feature coming soon.")
    }

    const handleRename = async (project: Project, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const newName = prompt("Enter new name for this chat:", project.title)
        if (!newName || newName.trim() === "" || newName === project.title) return

        setProjects(prev => prev.map(p =>
            p.id === project.id ? { ...p, title: newName } : p
        ))
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newName }),
            })
            if (!res.ok) throw new Error("Failed to rename")
            toast.success("Chat renamed")
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error("Failed to rename chat")
            setProjects(initialProjects)
            router.refresh()
        }
    }

    const handleToggleFavorite = async (projectId: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // Optimistically update
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
        ))

        try {
            const res = await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' })
            if (!res.ok) throw new Error("Failed to toggle favorite")
            const data = await res.json()
            toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites")
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error("Failed to update favorite status")
            // Rollback
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, is_favorite: !p.is_favorite } : p
            ))
        }
    }

    // Recalculate filtered and sorted list
    const filteredProjects = useMemo(() => {
        let list = [...projects]

        // 1. Search filter
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase()
            list = list.filter(p => p.title.toLowerCase().includes(query))
        }

        // 2. Favorites filter
        if (favoriteFilter === "favorites") {
            list = list.filter(p => p.is_favorite)
        } else if (favoriteFilter === "non-favorites") {
            list = list.filter(p => !p.is_favorite)
        }

        // 3. Visibility filter
        if (visibilityFilter === "public") {
            list = list.filter(p => p.is_public)
        } else if (visibilityFilter === "private") {
            list = list.filter(p => !p.is_public)
        }

        // 4. Creator filter (Voice of Creators)
        if (creatorFilter === "me") {
            list = list.filter(p => p.is_owner)
        } else if (creatorFilter === "shared") {
            list = list.filter(p => !p.is_owner)
        }

        // 5. Sorting
        if (sortBy === "default") {
            list.sort((a, b) => a.title.localeCompare(b.title))
        } else if (sortBy === "latest") {
            list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        }

        return list
    }, [projects, searchQuery, sortBy, favoriteFilter, visibilityFilter, creatorFilter])

    return (
        <div className="space-y-3">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-sm border">
                <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-black hover:text-[#0099ff] bg-white">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span className="font-medium text-xs">
                                    {sortBy === "default" ? "Default" : "Latest Update"}
                                </span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44" align="end">
                            <DropdownMenuItem onClick={() => setSortBy("default")}>Default</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy("latest")}>Latest Update</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Favorites Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-black hover:text-[#0099ff] gap-1.5 border-zinc-200 bg-white">
                                <Star className="w-3.5 h-3.5" />
                                <span className="font-medium text-xs">
                                    {favoriteFilter === "all" ? "All" : favoriteFilter === "favorites" ? "Favorites" : "Without Favorites"}
                                </span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44" align="end">
                            <DropdownMenuItem onClick={() => setFavoriteFilter("all")}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFavoriteFilter("favorites")}>Favorites</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFavoriteFilter("non-favorites")}>Without Favorites</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Visibility Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-zinc-600 text-black hover:text-[#0099ff] border-zinc-200 bg-white">
                                {visibilityFilter === "public" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span className="font-medium text-xs">
                                    {visibilityFilter === "all" ? "All Visibility" : visibilityFilter === "public" ? "Public" : "Private"}
                                </span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44" align="end">
                            <DropdownMenuItem onClick={() => setVisibilityFilter("all")}>All Visibility</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setVisibilityFilter("public")}>Public</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setVisibilityFilter("private")}>Private</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Creators Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-black hover:text-[#0099ff] border-zinc-200 bg-white">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-medium text-xs">
                                    {creatorFilter === "all" ? "All Creators" : creatorFilter === "me" ? "Created by Me" : "Shared with Me"}
                                </span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44" align="end">
                            <DropdownMenuItem onClick={() => setCreatorFilter("all")}>All Creators</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreatorFilter("me")}>Created by Me</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreatorFilter("shared")}>Shared with Me</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Toggles */}
                    <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as "grid" | "list")}>
                        <TabsList className="h-8 text-black">
                            <TabsTrigger value="grid" className="h-7 w-8 p-0">
                                <LayoutGrid className="w-4 h-4 text-black" />
                            </TabsTrigger>
                            <TabsTrigger value="list" className="h-7 w-8 p-0">
                                <List className="w-4 h-4 text-black" />
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Content List/Grid */}
            {filteredProjects.length === 0 ? (
                <div className="text-center text-zinc-500 py-16 border border-dashed rounded-xl bg-white border-zinc-200">
                    <p className="text-base font-medium">No matching chats found</p>
                    <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or search query.</p>
                </div>
            ) : viewMode === "grid" ? (
                /* Grid / Squares View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => {
                        const formattedDate = new Date(project.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                        const targetUrl = project.published_url || project.preview_url

                        return (
                            <div
                                key={project.id}
                                onClick={() => router.push(`/chat/${project.id}`)}
                                className="group relative bg-white border border-zinc-200 rounded-sm  shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[280px]"
                            >
                                {/* Preview section */}
                                <div className="relative w-full h-36 bg-zinc-50 border-b border-zinc-100 overflow-hidden select-none pointer-events-none">
                                    {targetUrl ? (
                                        <div className="w-[400%] h-[400%] scale-[0.25] origin-top-left pointer-events-none select-none">
                                            <iframe
                                                src={targetUrl}
                                                title={project.title}
                                                className="w-full h-full border-none pointer-events-none select-none overflow-hidden"
                                                sandbox="allow-scripts"
                                            />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100/50">
                                            <div
                                                className="absolute inset-0 z-0 pointer-events-none opacity-25"
                                                style={{
                                                    backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 1px)',
                                                    backgroundSize: '16px 16px'
                                                }}
                                            />
                                            <div className="relative z-10 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-400 border border-zinc-200 shadow-sm mb-1.5 group-hover:scale-110 transition-transform duration-300">
                                                <Globe className="w-5 h-5 text-zinc-500" />
                                            </div>
                                            <span className="relative z-10 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">No Preview Published</span>
                                        </div>
                                    )}

                                    {/* Visibility badge */}
                                    <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                                        <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-white/95 backdrop-blur-sm border-zinc-200 shadow-sm text-zinc-600 font-medium">
                                            {project.is_public ? "Public" : "Private"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Content section */}
                                <div className="p-4 flex-grow flex flex-col justify-between bg-white relative z-10">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 max-w-[80%]">
                                                <button
                                                    onClick={(e) => handleToggleFavorite(project.id, e)}
                                                    className="text-zinc-300 hover:text-yellow-400 transition-colors flex-shrink-0"
                                                >
                                                    <Star className={cn("w-4 h-4 transition-all", project.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-zinc-300")} />
                                                </button>
                                                <h3 className="font-semibold text-sm text-zinc-800 truncate group-hover:text-zinc-900 transition-colors">
                                                    {project.title}
                                                </h3>
                                            </div>

                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-7 w-7 p-0 rounded-full hover:bg-zinc-100">
                                                            <MoreVertical className="h-4 w-4 text-zinc-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {targetUrl && (
                                                            <DropdownMenuItem onClick={() => window.open(targetUrl, '_blank')}>
                                                                <Globe className="mr-2 h-4 w-4" />
                                                                Open Live Site
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={(e) => handleRename(project, e)}>
                                                            <Edit2 className="mr-2 h-4 w-4" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => handleToggleFavorite(project.id, e)}>
                                                            <Star className="mr-2 h-4 w-4" />
                                                            {project.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => handleDuplicate(project, e)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        {project.is_owner && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                                                    onClick={(e) => handleDelete(project.id, e)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete Chat
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-1">
                                            <Avatar className="h-4 w-4 border">
                                                <AvatarImage src={user.imageUrl} />
                                                <AvatarFallback className="text-[8px]">{user.firstName?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[11px] font-medium text-zinc-500 truncate max-w-[150px]">
                                                {project.is_owner ? user.firstName || "You" : "Shared"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-auto">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{formattedDate}</span>
                                        </div>

                                        {project.collaborator_count && project.collaborator_count > 0 ? (
                                            <div className="flex items-center gap-1 text-zinc-400">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{project.collaborator_count}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* List / Table View */
                <div className="bg-white rounded-sm border border-zinc-200 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow>
                                <TableHead className="w-[400px]">Name</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead>Collaborators</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.map((project) => {
                                const formattedDate = new Date(project.updated_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })
                                const targetUrl = project.published_url || project.preview_url

                                return (
                                    <TableRow
                                        key={project.id}
                                        className="group hover:bg-zinc-50 cursor-pointer"
                                        onClick={() => router.push(`/chat/${project.id}`)}
                                    >
                                        <TableCell className="font-medium text-zinc-900">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => handleToggleFavorite(project.id, e)}
                                                    className="text-zinc-300 hover:text-yellow-400 transition-colors"
                                                >
                                                    <Star className={cn("w-4 h-4 transition-all", project.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-zinc-300")} />
                                                </button>
                                                <span className="truncate max-w-[280px]">{project.title}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 border">
                                                    <AvatarImage src={user.imageUrl} />
                                                    <AvatarFallback className="text-[10px]">{user.firstName?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-zinc-600 font-medium">{project.is_owner ? user.firstName || "You" : "Shared"}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="secondary" className={cn("text-[10px] font-medium py-0.5 px-2.5", project.is_public ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : "bg-zinc-50 text-zinc-600 border-zinc-200/50")}>
                                                {project.is_public ? "Public" : "Private"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {project.collaborator_count && project.collaborator_count > 0 ? (
                                                <div className="flex items-center gap-1.5 text-zinc-500">
                                                    <Users className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{project.collaborator_count}</span>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400 text-xs">—</span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-zinc-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs">{formattedDate}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right relative">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {targetUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(targetUrl, '_blank')}
                                                        className="h-8 text-xs bg-zinc-100 hover:bg-zinc-200"
                                                    >
                                                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                                                        Live Site
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {targetUrl && (
                                                            <DropdownMenuItem onClick={() => window.open(targetUrl, '_blank')}>
                                                                <Globe className="mr-2 h-4 w-4" />
                                                                Open Live Site
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={(e) => handleRename(project, e)}>
                                                            <Edit2 className="mr-2 h-4 w-4" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => handleToggleFavorite(project.id, e)}>
                                                            <Star className="mr-2 h-4 w-4" />
                                                            {project.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => handleDuplicate(project, e)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        {project.is_owner && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                                                    onClick={(e) => handleDelete(project.id, e)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete Chat
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
