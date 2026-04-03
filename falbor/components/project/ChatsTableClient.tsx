"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Users, Clock, ExternalLink, MoreVertical, Trash2, Copy, Edit2, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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

interface Project {
    id: string
    title: string
    updated_at: string
    user_id: string
    is_owner: boolean
    owner_name?: string
    collaborator_count?: number
    preview_url?: string | null
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

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-50/50">
                    <TableRow>
                        <TableHead className="w-[400px]">Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Collaborators</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map((project) => {
                        const formattedDate = new Date(project.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        })

                        return (
                            <TableRow key={project.id} className="group hover:bg-zinc-50 cursor-pointer" onClick={() => router.push(`/chat/${project.id}`)}>
                                <TableCell className="font-medium text-zinc-900">
                                    <div className="flex items-center gap-3">
                                        <span className="truncate max-w-[300px]">{project.title}</span>
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
                                        {project.preview_url && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(project.preview_url!, '_blank')}
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
                                                {project.preview_url && (
                                                    <DropdownMenuItem onClick={() => window.open(project.preview_url!, '_blank')}>
                                                        <Globe className="mr-2 h-4 w-4" />
                                                        Open Live Site
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={(e) => handleRename(project, e)}>
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Rename
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
    )
}
