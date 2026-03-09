"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AppMcpGrid } from "./AppMcpGrid"
import { CustomMcpTab } from "./CustomMcpTab"

interface McpTabsProps {
    connections: any[]
    onDisconnect: (id: string, name: string) => void
    onSuccess: () => void
}

export function McpTabs({ connections, onDisconnect, onSuccess }: McpTabsProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredConnections = useMemo(() => {
        if (!searchQuery) return connections
        const q = searchQuery.toLowerCase()
        return connections.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.config?.note && c.config.note.toLowerCase().includes(q))
        )
    }, [connections, searchQuery])

    return (
        <Tabs defaultValue="apps" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <TabsList className="bg-white shadow-xs flex items-center">

                    <TabsTrigger
                        value="apps"
                        className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
                    >
                        Applications
                    </TabsTrigger>
                    <TabsTrigger
                        value="custom"
                        className="gap-2 text-black data-[state=active]:text-[#0099ff] cursor-pointer"
                    >
                        Castium MCP
                    </TabsTrigger>
                </TabsList>

                <div className="relative w-64 group">
                    <Input
                        placeholder="Search MCPs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 pl-10 pr-3 text-xs font-bold rounded-xl bg-white border border-zinc-200 focus:border-[#0099ff] focus:ring-1 focus:ring-[#0099ff]/10"
                    />
                </div>
            </div>

            <TabsContent value="apps" className="focus-visible:outline-none mt-0">
                <AppMcpGrid
                    searchQuery={searchQuery}
                    connections={filteredConnections}
                    onDisconnect={onDisconnect}
                    onSuccess={onSuccess}
                />
            </TabsContent>

            <TabsContent value="custom" className="focus-visible:outline-none mt-0">
                <CustomMcpTab
                    searchQuery={searchQuery}
                    connections={filteredConnections}
                    onDisconnect={onDisconnect}
                    onSuccess={onSuccess}
                />
            </TabsContent>
        </Tabs>
    )
}
