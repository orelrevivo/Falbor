"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
    Copy,
    Check,
    Plus,
    Users,
    ArrowLeft,
    Trash2,
    Link as LinkIcon,
    Eye,
    Pencil,
    Shield,
    ChevronDown,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "../ui/input"

// ── Added only for animation ──
import { motion, AnimatePresence } from "framer-motion"

type ShareRole = "viewer" | "editor" | "admin"

interface ShareLink {
    id: string
    share_token: string
    role: ShareRole
    label: string | null
    is_active: boolean
    usage_count: number
    max_uses: number | null
    created_at: string
    expires_at: string | null
}

interface Collaborator {
    id: string
    user_id: string
    role: ShareRole
    status: string
    display_name: string | null
    image_url: string | null
    joined_at: string | null
}

interface ShareDialogProps {
    projectId: string
    isOpen: boolean
    onClose: () => void
}

const roleConfig = {
    viewer: {
        label: "Viewer",
        description: "Can view chat and code only",
        icon: Eye,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
    },
    editor: {
        label: "Editor",
        description: "Can edit code and send messages",
        icon: Pencil,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
    },
    admin: {
        label: "Admin",
        description: "Full access including publishing",
        icon: Shield,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
    },
}

export function ShareDialog({ projectId, isOpen, onClose }: ShareDialogProps) {
    const { getToken } = useAuth()

    const [view, setView] = useState<"main" | "collaborators" | "create-link">("main")

    const [isPublic, setIsPublic] = useState(false)
    const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
    const [collaborators, setCollaborators] = useState<Collaborator[]>([])
    const [loading, setLoading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [newLinkRole, setNewLinkRole] = useState<ShareRole>("viewer")
    const [newLinkLabel, setNewLinkLabel] = useState("")
    const [showRoleDropdown, setShowRoleDropdown] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchProjectSettings()
            fetchShareLinks()
            fetchCollaborators()
        }
    }, [isOpen, projectId])

    const fetchProjectSettings = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`)
            if (res.ok) {
                const data = await res.json()
                setIsPublic(data.isPublic || false)
            }
        } catch (err) {
            console.error("Failed to fetch project settings:", err)
        }
    }

    const fetchShareLinks = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/share`)
            if (res.ok) {
                const data = await res.json()
                setShareLinks(data.shares || [])
            }
        } catch (err) {
            console.error("Failed to fetch share links:", err)
        }
    }

    const fetchCollaborators = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborators`)
            if (res.ok) {
                const data = await res.json()
                setCollaborators(data.collaborators || [])
            }
        } catch (err) {
            console.error("Failed to fetch collaborators:", err)
        }
    }

    const handlePublicToggle = async (checked: boolean) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublic: checked }),
            })
            if (res.ok) {
                setIsPublic(checked)
            }
        } catch (err) {
            console.error("Failed to update project privacy:", err)
        } finally {
            setLoading(false)
        }
    }

    const createShareLink = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: newLinkRole,
                    label: newLinkLabel || null,
                }),
            })
            if (res.ok) {
                const data = await res.json()
                setShareLinks([data.share, ...shareLinks])
                setNewLinkLabel("")
                setNewLinkRole("viewer")
                setView("main")
            }
        } catch (err) {
            console.error("Failed to create share link:", err)
        } finally {
            setLoading(false)
        }
    }

    const toggleLinkActive = async (shareId: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shareId, isActive }),
            })
            if (res.ok) {
                setShareLinks(
                    shareLinks.map((link) =>
                        link.id === shareId ? { ...link, is_active: isActive } : link
                    )
                )
            }
        } catch (err) {
            console.error("Failed to toggle link:", err)
        }
    }

    const deleteShareLink = async (shareId: string) => {
        try {
            const res = await fetch(
                `/api/projects/${projectId}/share?shareId=${shareId}`,
                { method: "DELETE" }
            )
            if (res.ok) {
                setShareLinks(shareLinks.filter((link) => link.id !== shareId))
            }
        } catch (err) {
            console.error("Failed to delete link:", err)
        }
    }

    const updateCollaboratorRole = async (collaboratorId: string, role: ShareRole) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborators`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collaboratorId, role }),
            })
            if (res.ok) {
                setCollaborators(
                    collaborators.map((c) =>
                        c.id === collaboratorId ? { ...c, role } : c
                    )
                )
            }
        } catch (err) {
            console.error("Failed to update collaborator:", err)
        }
    }

    const removeCollaborator = async (collaboratorId: string) => {
        try {
            const res = await fetch(
                `/api/projects/${projectId}/collaborators?collaboratorId=${collaboratorId}`,
                { method: "DELETE" }
            )
            if (res.ok) {
                setCollaborators(collaborators.filter((c) => c.id !== collaboratorId))
            }
        } catch (err) {
            console.error("Failed to remove collaborator:", err)
        }
    }

    const copyLink = async (token: string, id: string) => {
        const url = `${window.location.origin}/share/${token}`
        await navigator.clipboard.writeText(url)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="w-full bg-white dark:bg-[#1E1E21] rounded-lg overflow-hidden">

            {/* Header – completely unchanged */}
            <div className="flex items-center justify-between p-4 border-b dark:border-white/10">
                {view !== "main" && (
                    <button
                        onClick={() => setView("main")}
                        className="p-1 BackgroundStyle dark:hover:bg-[#2C2C30] rounded mr-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 dark:text-white" />
                    </button>
                )}
                <h3 className="font-semibold text-base flex-1 dark:text-white">
                    {view === "main" && "Invite Users"}
                    {view === "collaborators" && "People with Access"}
                    {view === "create-link" && "Create Invite Link"}
                </h3>
            </div>

            {/* Animated content wrapper – this is the only part changed */}
            <AnimatePresence mode="wait">
                {view === "main" && (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="p-4 space-y-4"
                    >
                        {/* Public Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm dark:text-white">Make Public</p>
                                <p className="text-xs text-gray-500 dark:text-white/50">
                                    Allow anyone with link to view
                                </p>
                            </div>
                            <Switch
                                checked={isPublic}
                                onCheckedChange={handlePublicToggle}
                                disabled={loading}
                            />
                        </div>

                        <Button
                            onClick={() => setView("create-link")}
                            variant="outline"
                            className="w-full justify-center gap-2 BackgroundStyleButton text-black dark:text-white dark:border-white/10 dark:hover:bg-[#2C2C30] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Invite Link
                        </Button>

                        {shareLinks.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium ml-1">Active Links</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {shareLinks.map((link) => {
                                        const config = roleConfig[link.role]
                                        const RoleIcon = config.icon
                                        return (
                                            <div
                                                key={link.id}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-sm border dark:border-white/10",
                                                    !link.is_active && "opacity-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className={cn("p-1.5")}>
                                                        <RoleIcon className={cn("w-3.5 h-3.5 dark:text-white/70")} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate dark:text-white">
                                                            {link.label || config.label}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-white/50">
                                                            {link.usage_count} uses
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => copyLink(link.share_token, link.id)}
                                                        className="p-1.5 BackgroundStyle dark:hover:bg-[#2C2C30] rounded transition-colors"
                                                        title="Copy link"
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-gray-500 dark:text-white/70" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleLinkActive(link.id, !link.is_active)}
                                                        className={cn(
                                                            "p-1.5 BackgroundStyle dark:hover:bg-[#2C2C30] rounded text-xs transition-colors",
                                                            link.is_active ? "text-gray-500 dark:text-white/70" : "text-blue-600 dark:text-blue-400"
                                                        )}
                                                        title={link.is_active ? "Disable" : "Enable"}
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteShareLink(link.id)}
                                                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {collaborators.length > 0 && (
                            <button
                                onClick={() => setView("collaborators")}
                                className="w-full flex items-center cursor-pointer justify-between BackgroundStyleButton p-3 rounded-sm transition-colors dark:hover:bg-[#2C2C30] dark:border-white/10"
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-500 dark:text-white/70" />
                                    <span className="text-sm font-medium dark:text-white">People with Access</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {collaborators.slice(0, 3).map((c) => (
                                            <img
                                                key={c.id}
                                                src={c.image_url || "/placeholder.svg"}
                                                alt={c.display_name || "User"}
                                                className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1E1E21]"
                                            />
                                        ))}
                                    </div>
                                    {collaborators.length > 3 && (
                                        <span className="text-xs text-gray-500 dark:text-white/50">
                                            +{collaborators.length - 3}
                                        </span>
                                    )}
                                </div>
                            </button>
                        )}
                    </motion.div>
                )}

                {view === "create-link" && (
                    <motion.div
                        key="create-link"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="p-4 space-y-2"
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Access Level</label>
                            <div />
                             <div className="relative">
                                <button
                                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                    className="w-full flex items-center justify-between p-3 border rounded-lg BackgroundStyle cursor-pointer hover:border-white dark:border-white/10 dark:hover:bg-[#2C2C30] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const config = roleConfig[newLinkRole]
                                            const RoleIcon = config.icon
                                            return (
                                                <>
                                                    <div className={cn("p-1.5 rounded")}>
                                                        <RoleIcon className={cn("w-4 h-4 dark:text-white/70")} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-medium dark:text-white">{config.label}</p>
                                                        <p className="text-xs text-gray-500 dark:text-white/50">
                                                            {config.description}
                                                        </p>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/50" />
                                </button>

                                {showRoleDropdown && (
                                    <div className="absolute top-0 left-0 right-0 bg-white dark:bg-[#1E1E21] border dark:border-white/10 rounded-lg z-10 p-1 space-y-1 shadow-xl">
                                        {(Object.keys(roleConfig) as ShareRole[]).map((role) => {
                                            const config = roleConfig[role]
                                            const RoleIcon = config.icon
                                            return (
                                                <button
                                                    key={role}
                                                    onClick={() => {
                                                        setNewLinkRole(role)
                                                        setShowRoleDropdown(false)
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 p-3 BackgroundStyle text-left rounded-md cursor-pointer dark:hover:bg-[#2C2C30] transition-colors",
                                                        role === newLinkRole && "BackgroundStyleButton dark:bg-[#2C2C30]"
                                                    )}
                                                >
                                                    <div className={cn("p-1.5 rounded")}>
                                                        <RoleIcon className={cn("w-4 h-4 text-black dark:text-white")} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium dark:text-white">{config.label}</p>
                                                        <p className="text-xs text-gray-500 dark:text-white/50">
                                                            {config.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Label (optional)</label>
                            <div />
                            <Input
                                type="text"
                                value={newLinkLabel}
                                onChange={(e) => setNewLinkLabel(e.target.value)}
                                placeholder="e.g., Design Team, Developers"
                            />
                        </div>

                        <Button
                            onClick={createShareLink}
                            disabled={loading}
                            className="w-full mt-2"
                        >
                            {loading ? "Creating..." : "Create Link"}
                        </Button>
                    </motion.div>
                )}

                {view === "collaborators" && (
                    <motion.div
                        key="collaborators"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="p-4"
                    >
                        {collaborators.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No collaborators yet
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {collaborators.map((collaborator) => (
                                    <CollaboratorRow
                                        key={collaborator.id}
                                        collaborator={collaborator}
                                        onRoleChange={(role) =>
                                            updateCollaboratorRole(collaborator.id, role)
                                        }
                                        onRemove={() => removeCollaborator(collaborator.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// CollaboratorRow remains 100% unchanged
function CollaboratorRow({
    collaborator,
    onRoleChange,
    onRemove,
}: {
    collaborator: Collaborator
    onRoleChange: (role: ShareRole) => void
    onRemove: () => void
}) {
    const [showRoleDropdown, setShowRoleDropdown] = useState(false)
    const config = roleConfig[collaborator.role]
    const RoleIcon = config.icon

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10 dark:hover:bg-[#2C2C30]/50 transition-colors">
            <div className="flex items-center gap-3">
                <img
                    src={collaborator.image_url || "/placeholder.svg"}
                    alt={collaborator.display_name || "User"}
                    className="w-8 h-8 rounded-full border dark:border-white/10"
                />
                <div>
                    <p className="text-sm font-medium dark:text-white">
                        {collaborator.display_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-white/50">
                        Joined {collaborator.joined_at ? new Date(collaborator.joined_at).toLocaleDateString() : "Recently"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                            config.bgColor,
                            config.color,
                            "dark:bg-white/10 dark:text-white"
                        )}
                    >
                        <RoleIcon className="w-3 h-3" />
                        {config.label}
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {showRoleDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1E1E21] border dark:border-white/10 rounded-lg shadow-xl z-10 min-w-32 p-1">
                            {(Object.keys(roleConfig) as ShareRole[]).map((role) => {
                                const roleConf = roleConfig[role]
                                const Icon = roleConf.icon
                                return (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            onRoleChange(role)
                                            setShowRoleDropdown(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#2C2C30] text-left text-sm rounded transition-colors",
                                            role === collaborator.role && "bg-gray-50 dark:bg-[#2C2C30] dark:text-white",
                                            "dark:text-white/80"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", roleConf.color, "dark:text-white/70")} />
                                        {roleConf.label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <button
                    onClick={onRemove}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                    title="Remove access"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}