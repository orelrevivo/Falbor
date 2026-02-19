"use client"

import { useState, useEffect } from "react"
import { McpConnectModal } from "@/components/project/McpConnectModal"
import { getMcpConnections, deleteMcpConnection } from "@/app/actions/mcp"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Github,
    Search,
    Slack,
    MessageSquare,
    ShoppingCart,
    Trash2,
    Plus,
    ExternalLink,
    Database,
    Cpu,
    Zap,
    Globe
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

const AVAILABLE_CONNECTORS = [
    {
        type: "code",
        name: "GitHub",
        description: "Allow the AI to read repositories, create issues, and submit pull requests directly from the chat.",
        icon: Github,
        color: "text-zinc-900",
        bg: "bg-zinc-100",
        docs: "https://github.com/settings/developers",
        supportsOAuth: true
    },
    {
        type: "search",
        name: "Google Search",
        description: "Enhance the AI's knowledge with real-time web search capabilities for up-to-date information.",
        icon: Search,
        color: "text-blue-500",
        bg: "bg-blue-50",
        docs: "https://developers.google.com/custom-search/v1/overview",
        supportsOAuth: false
    },
    {
        type: "communication",
        name: "Slack",
        description: "Enable the AI to send messages, manage channels, and integrate with your team's workflow.",
        icon: Slack,
        color: "text-purple-600",
        bg: "bg-purple-50",
        docs: "https://api.slack.com/apps",
        supportsOAuth: true
    },
    {
        type: "communication",
        name: "Discord",
        description: "Let the AI interact with Discord servers, manage roles, and handle community automation.",
        icon: MessageSquare,
        color: "text-indigo-500",
        bg: "bg-indigo-50",
        docs: "https://discord.com/developers/applications",
        supportsOAuth: true
    },
    {
        type: "commerce",
        name: "Shopify",
        description: "Connect your store to allow the AI to manage products, analyze sales, and assist customers.",
        icon: ShoppingCart,
        color: "text-green-600",
        bg: "bg-green-50",
        docs: "https://shopify.dev/docs/apps/auth",
        supportsOAuth: false
    },
    {
        type: "payments",
        name: "Stripe",
        description: "Securely handle subscriptions, products, and checkout sessions with AI-assisted logic.",
        icon: Zap,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        docs: "https://dashboard.stripe.com/apikeys",
        supportsOAuth: false
    },
    {
        type: "deployment",
        name: "Vercel",
        description: "Let the AI check deployment logs, manage environment variables, and trigger new builds.",
        icon: Globe,
        color: "text-black",
        bg: "bg-zinc-100",
        docs: "https://vercel.com/docs/api#tokens",
        supportsOAuth: false
    },
    {
        type: "email",
        name: "Resend",
        description: "Automate transactional emails and manage contact lists directly through AI reasoning.",
        icon: MessageSquare,
        color: "text-orange-500",
        bg: "bg-orange-50",
        docs: "https://resend.com/docs/api-reference/introduction",
        supportsOAuth: false
    },
    {
        type: "data",
        name: "Supabase",
        description: "Advanced management of tables, edge functions, and storage buckets beyond basic integration.",
        icon: Database,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        docs: "https://supabase.com/docs/guides/api",
        supportsOAuth: false
    }
]

export default function MCPPage() {
    const [connections, setConnections] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedMcp, setSelectedMcp] = useState<any>(null)

    const fetchConnections = async () => {
        setIsLoading(true)
        try {
            const data = await getMcpConnections()
            setConnections(data)
        } catch (err) {
            console.error("Failed to fetch MCPs:", err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchConnections()
    }, [])

    const handleDisconnect = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to disconnect ${name}?`)) return

        try {
            const result = await deleteMcpConnection(id)
            if (result.success) {
                toast.success(`${name} disconnected`)
                fetchConnections()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Failed to disconnect")
        }
    }

    return (
        <div className="flex flex-col gap-10 p-8 max-w-6xl mx-auto w-full min-h-screen">
            <header className="flex flex-col gap-3 relative">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="p-2 bg-black rounded-lg">
                        <Cpu className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900">
                        Model Context Protocol
                    </h1>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-500 text-lg max-w-2xl leading-relaxed"
                >
                    Connect your workspace to thousands of external tools. MCP allows the AI to securely interact with your favorite services in real-time.
                </motion.p>

                <div className="absolute top-0 right-0 hidden lg:block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                        <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Protocol Active</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {AVAILABLE_CONNECTORS.map((connector, index) => {
                        const connection = connections.find(c => c.name === connector.name)
                        const Icon = connector.icon

                        return (
                            <motion.div
                                key={connector.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="h-full flex flex-col relative overflow-hidden group shadow-xs transition-all border bg-white">
                                    <CardHeader className="flex flex-row items-start gap-4 pb-2">
                                        <div className={`h-14 w-14 rounded-2xl ${connector.bg} flex items-center justify-center ${connector.color} group-hover:rotate-6 transition-all duration-300 shadow-sm border border-black/5`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                                                    {connector.name}
                                                </CardTitle>
                                                {connection ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 animate-in fade-in zoom-in duration-300">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-zinc-400 border-zinc-200 font-medium">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-zinc-400 mt-1 flex items-center gap-1.5">
                                                <Globe className="w-3 h-3" />
                                                {connector.type}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-4 flex-1">
                                        <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                                            {connector.description}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex gap-4 justify-between pt-4 border-t border-zinc-100 bg-zinc-50/30">
                                        <a
                                            href={connector.docs}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors py-2 px-1"
                                        >
                                            Docs
                                            <ExternalLink className="w-3 h-3" />
                                        </a>

                                        {connection ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnect(connection.id, connector.name)}
                                                className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-50/50 gap-2 border border-transparent hover:border-red-100 transition-all font-bold text-xs"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Disconnect
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => setSelectedMcp(connector)}
                                                className="h-9 px-4 bg-zinc-900 hover:bg-black text-white gap-2 shadow-sm hover:shadow-md transition-all font-bold text-xs rounded-lg"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Connect Tool
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {selectedMcp && (
                <McpConnectModal
                    open={!!selectedMcp}
                    onOpenChange={(open) => !open && setSelectedMcp(null)}
                    mcpType={selectedMcp.type}
                    mcpName={selectedMcp.name}
                    supportsOAuth={selectedMcp.supportsOAuth}
                    onSuccess={fetchConnections}
                />
            )}

            <footer className="mt-6 p-6 rounded-2xl bg-zinc-900 text-white overflow-hidden relative group">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold mb-1">Need a custom integration?</h3>
                        <p className="text-zinc-400 text-sm">Our AI can help you build custom MCP connectors for your private internal APIs.</p>
                    </div>
                    <Button variant="secondary" className="bg-white text-zinc-900 hover:bg-zinc-100 font-bold whitespace-nowrap">
                        Request Connector
                    </Button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150" />
            </footer>
        </div>
    )
}
