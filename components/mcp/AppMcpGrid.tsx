"use client"

import { useState } from "react"
import { Mail, MessageSquare, Plus, Globe, Settings2, PlayCircle, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { McpConnectModal } from "@/components/project/McpConnectModal"
import { DiscordConfigModal } from "@/components/mcp/DiscordConfigModal"
import { GitConfigModal } from "@/components/mcp/GitConfigModal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const BUILTIN_MCPS = [
    {
        type: "email",
        name: "Gmail",
        description: "Full integration with your Gmail account. Allow the AI to read messages, search for security alerts, and assist with email workflows.",
        icon: "https://images.icon-icons.com/2642/PNG/512/google_mail_gmail_logo_icon_159346.png",
        docs: "https://developers.google.com/gmail/api/guides",
        supportsOAuth: true
    },
    {
        type: "social",
        name: "Discord",
        description: "Integration with Discord servers. Allow the AI to read messages, manage channels, and assist with community workflows.",
        icon: "https://static.vecteezy.com/system/resources/previews/019/493/250/non_2x/discord-logo-discord-icon-discord-symbol-free-free-vector.jpg",
        docs: "https://discord.com/developers/docs/intro",
        supportsOAuth: true
    },
    {
        type: "github",
        name: "GitHub",
        description: "Integration with GitHub repositories. Allow the AI to read code, manage repositories, clone projects, and assist with development workflows.",
        icon: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        docs: "https://docs.github.com/en/rest",
        supportsOAuth: true
    },
    {
        type: "git",
        name: "Git Clone",
        description: "Clone and import Git repositories directly into your projects. Connect your Git account to seamlessly import public and private repositories.",
        icon: "https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png",
        docs: "https://git-scm.com/doc",
        supportsOAuth: true,
        isGitClone: true
    },
    // {
    //     type: "social",
    //     name: "LinkedIn",
    //     description: "Integration with LinkedIn. Allow the AI to manage your professional profile, share updates, and assist with networking workflows.",
    //     icon: "https://content.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg",
    //     docs: "https://docs.microsoft.com/en-us/linkedin/",
    //     supportsOAuth: true
    // },
    {
        type: "social",
        name: "Twitter",
        description: "Integration with Twitter/X. Allow the AI to read tweets, post updates, and assist with social media management.",
        icon: "https://about.twitter.com/content/dam/about-twitter/x/brand-toolkit/logo-black.png.twimg.1920.png",
        docs: "https://developer.twitter.com/en/docs/twitter-api",
        supportsOAuth: true
    },
    {
        type: "communication",
        name: "Slack",
        description: "Integration with Slack workspaces. Allow the AI to send messages, read channels, and assist with team communication.",
        icon: "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png",
        docs: "https://api.slack.com/docs",
        supportsOAuth: true
    },
    {
        type: "entertainment",
        name: "Spotify",
        description: "Integration with Spotify. Allow the AI to manage playlists, control playback, and assist with music workflows.",
        icon: "/icons/Spotify_App_Logo.svg.png",
        docs: "https://developer.spotify.com/documentation/web-api",
        supportsOAuth: true
    }
]

interface AppMcpGridProps {
    connections: any[]
    searchQuery?: string
    onDisconnect: (id: string, name: string) => void
    onSuccess: () => void
}

export function AppMcpGrid({ connections, searchQuery = "", onDisconnect, onSuccess }: AppMcpGridProps) {
    const [selectedMcp, setSelectedMcp] = useState<any>(null)
    const [discordConfigOpen, setDiscordConfigOpen] = useState(false)
    const [discordConfigConnection, setDiscordConfigConnection] = useState<any>(null)
    const [gitConfigOpen, setGitConfigOpen] = useState(false)
    const [gitConfigConnection, setGitConfigConnection] = useState<any>(null)
    const router = useRouter()

    const filteredBuiltins = BUILTIN_MCPS.filter(mcp =>
        mcp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mcp.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleTryIt = (name: string) => {
        const prompt = `Help me test the ${name} connector and show me how to use its feature.`
        localStorage.setItem("falbor_auto_prompt", prompt)
        router.push("/")
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white rounded-md border shadow-xs overflow-hidden">
                <table className="w-full">
                    <thead className="border-b">
                        <tr>
                            <th className="px-6 py-4 text-left text-[12px] text-gray-700">Application</th>
                            <th className="px-6 py-4 text-left text-[12px] text-gray-700">Description</th>
                            <th className="px-6 py-4 text-center text-[12px] text-gray-700">Status</th>
                            <th className="px-6 py-4 text-right text-[12px] text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {filteredBuiltins.map((mcp) => {
                            const connection = connections.find(c => c.name.toLowerCase() === mcp.name.toLowerCase())

                            return (
                                <tr key={mcp.name} className="group hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-6 border-none">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 min-w-12 rounded-md bg-white flex items-center justify-center shadow-xs border`}>
                                                <img src={mcp.icon} alt={mcp.name} className="w-8 h-8 rounded-md" />
                                            </div>
                                            <div className="">{mcp.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 max-w-md border-none">
                                        <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">
                                            {mcp.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-6 text-center border-none">
                                        {connection ? (
                                            <Badge className="bg-[#e7e5df] text-gray-700 border-none px-3 py-1 font-bold text-[11px] rounded-md">
                                                Connected
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-[#e7e5df] text-gray-700 border-none px-3 py-1 font-bold text-[11px] rounded-md">
                                                Inactive
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-6 border-none">
                                        <div className="flex items-center justify-end gap-3">
                                            {!connection ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (mcp.isGitClone) {
                                                            setGitConfigOpen(true)
                                                        } else {
                                                            setSelectedMcp(mcp)
                                                        }
                                                    }}
                                                    className="h-8 px-3 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] gap-2 text-[10px] rounded-md"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Connect
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-2 relative">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleTryIt(mcp.name)}
                                                        className="h-8 px-3 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[10px] rounded-md"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                        Try
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-3 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-400 hover:text-zinc-900 gap-2 text-[10px] rounded-md data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
                                                            >
                                                                <Settings2 className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 bg-white border border-zinc-200 rounded-md shadow-xs p-1 z-50">
                                                            {mcp.name === 'Discord' && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        className="flex items-center gap-3 px-3 py-2.5 font-bold text-zinc-600 text-[11px] rounded-md hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer"
                                                                        onClick={() => {
                                                                            setDiscordConfigConnection(connection)
                                                                            setDiscordConfigOpen(true)
                                                                        }}
                                                                    >
                                                                        <Settings2 className="w-4 h-4" />
                                                                        Configure & Bot Token
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-zinc-100 my-1" />
                                                                </>
                                                            )}
                                                            {mcp.name === 'Git Clone' && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        className="flex items-center gap-3 px-3 py-2.5 font-bold text-zinc-600 text-[11px] rounded-md hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer"
                                                                        onClick={() => {
                                                                            setGitConfigConnection(connection)
                                                                            setGitConfigOpen(true)
                                                                        }}
                                                                    >
                                                                        <Settings2 className="w-4 h-4" />
                                                                        Configure & Clone Repo
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-zinc-100 my-1" />
                                                                </>
                                                            )}
                                                            {mcp.name !== 'Discord' && mcp.name !== 'Git Clone' && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        className="flex items-center gap-3 px-3 py-2.5 font-bold text-zinc-600 text-[11px] rounded-md hover:bg-zinc-50 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer"
                                                                        onClick={() => toast.info("Configuration options coming soon")}
                                                                    >
                                                                        <Settings2 className="w-4 h-4" />
                                                                        Configure Permissions
                                                                    </DropdownMenuItem>
                                                                    <div className="h-px bg-zinc-100 my-1" />
                                                                </>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="flex items-center gap-3 px-3 py-2.5 font-bold text-red-500 text-[11px] rounded-md hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                                onClick={() => onDisconnect(connection.id, mcp.name)}
                                                            >
                                                                <Power className="w-4 h-4" />
                                                                Disconnect App
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {selectedMcp && (
                <McpConnectModal
                    open={!!selectedMcp}
                    onOpenChange={(open) => !open && setSelectedMcp(null)}
                    mcpType={selectedMcp.type}
                    mcpName={selectedMcp.name}
                    supportsOAuth={selectedMcp.supportsOAuth}
                    onSuccess={onSuccess}
                />
            )}

            {discordConfigOpen && discordConfigConnection && (
                <DiscordConfigModal
                    open={discordConfigOpen}
                    onOpenChange={setDiscordConfigOpen}
                    connection={discordConfigConnection}
                    onSuccess={onSuccess}
                />
            )}

            <GitConfigModal
                open={gitConfigOpen}
                onOpenChange={setGitConfigOpen}
                connection={gitConfigConnection}
                onSuccess={() => {
                    onSuccess()
                    setGitConfigConnection(null)
                }}
            />
        </div>
    )
}
