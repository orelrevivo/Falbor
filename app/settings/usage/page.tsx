"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BarChart3, Database, MessageSquare, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function UsagePage() {
    const [subscription, setSubscription] = useState<any>(null)
    const [usage, setUsage] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [creditsRes, usageRes] = await Promise.all([
                    fetch("/api/user/credits"),
                    fetch("/api/user/credits?type=usage")
                ])

                if (creditsRes.ok) {
                    const data = await creditsRes.json()
                    setSubscription(data)
                }

                if (usageRes.ok) {
                    const data = await usageRes.json()
                    setUsage(data)
                }
            } catch (err) {
                console.error("Failed to fetch usage data:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="flex flex-col gap-10 p-8 max-w-6xl mx-auto w-full min-h-screen">
            {/* Header - Matching MCP style */}
            <header className="flex flex-col gap-3 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0099ff]/20 rounded-md">
                        <BarChart3 className="w-6 h-6 text-[#0099ff]" />
                    </div>
                    <h1 className="text-2xl font-semibold">
                        Usage & Resource Credits
                    </h1>
                </div>
                <p className="text-zinc-500 text-md max-w-2xl leading-relaxed">
                    Monitor your credit consumption across all your chats and projects.
                </p>
            </header>

            <div className="grid gap-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        className="p-6 border border-zinc-200 rounded-sm bg-white shadow-xs flex flex-col"
                    >
                        <h3 className="text-sm font-medium text-zinc-500 mb-2">Active Plan</h3>
                        <p className="text-2xl font-bold text-zinc-900 capitalize">
                            {subscription?.subscriptionTier || "Free"}
                        </p>
                    </div>

                    <div
                        className="p-6 border border-zinc-200 rounded-sm bg-white shadow-xs flex flex-col"
                    >
                        <h3 className="text-sm font-medium text-zinc-500 mb-2">Total Credits</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-zinc-900">
                                {subscription ? (subscription.balance / 100).toFixed(2) : "0.00"}
                            </span>
                            <span className="text-sm text-zinc-400 font-normal underline decoration-dashed underline-offset-4">USD Value</span>
                        </div>
                    </div>

                    <div
                        className="p-6 border border-zinc-200 rounded-sm bg-white shadow-xs flex flex-col"
                    >
                        <h3 className="text-sm font-medium text-zinc-500 mb-2">Free Monthly Credits</h3>
                        <p className="text-2xl font-bold text-zinc-900">
                            $1.50
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">Included in every account</p>
                    </div>
                </div>

                {/* Usage History Table */}
                <div
                    className="p-6 border border-zinc-200 rounded-sm bg-white shadow-xs flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Database className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-lg font-semibold text-zinc-900">Usage by Chat</h2>
                    </div>

                    {isLoading ? (
                        <div className="py-10 text-center text-zinc-500">Loading usage history...</div>
                    ) : usage.length === 0 ? (
                        <div className="py-10 text-center text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                            No usage history registered yet. Start a chat to see data.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-zinc-100 text-sm text-zinc-400 font-medium">
                                        <th className="pb-3 pr-4">Chat Name</th>
                                        <th className="pb-3 px-4">Date Created</th>
                                        <th className="pb-3 px-4 text-center">Messages</th>
                                        <th className="pb-3 px-4 text-right">Total Cost</th>
                                        <th className="pb-3 pl-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-zinc-50">
                                    {usage.map((item) => (
                                        <tr key={item.projectId} className="group hover:bg-zinc-50 transition-colors">
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded text-zinc-400">
                                                        <MessageSquare className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-zinc-900 truncate max-w-[200px]">
                                                        {item.projectTitle || "Untitled Chat"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-zinc-600">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 text-center text-zinc-600">
                                                {item.messageCount}
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-zinc-900">
                                                ${(item.totalCost / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 pl-4 text-right">
                                                <Link
                                                    href={`/chat/${item.projectId}`}
                                                    className="inline-flex items-center gap-1.5 text-[#0099ff] hover:text-[#0088ee] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    View Chat
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
