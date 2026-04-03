"use client"

import { Cpu, Zap } from "lucide-react"

export function McpHeader() {
    return (
        <header className="flex flex-col gap-3 relative">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0099ff]/20 rounded-md">
                    <Cpu className="w-6 h-6 text-[#0099ff]" />
                </div>
                <h1 className="text-2xl">
                    Model Context Protocol
                </h1>
            </div>
            <p className="text-zinc-500 text-md max-w-2xl leading-relaxed">
                Connect your workspace to powerful external tools. MCP allows the AI to securely interact with your data for advanced automation and insights.
            </p>
        </header>
    )
}
