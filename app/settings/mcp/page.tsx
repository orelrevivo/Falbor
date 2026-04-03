"use client"

import { useState, useEffect } from "react"
import { getMcpConnections, deleteMcpConnection } from "@/app/actions/mcp"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { McpHeader } from "@/components/mcp/McpHeader"
import { McpTabs } from "@/components/mcp/McpTabs"

export default function MCPPage() {
    const [connections, setConnections] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

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
            <McpHeader />
            <McpTabs
                connections={connections}
                onDisconnect={handleDisconnect}
                onSuccess={fetchConnections}
            />
        </div>
    )
}
