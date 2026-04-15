"use client"

import { useState, useEffect } from "react"
import { Package, Download, Star, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { plugins } from "@/config/schema"

export function PluginsSection({ projectId }: { projectId: string }) {
    const [pluginsList, setPluginsList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPlugins = async () => {
            try {
                // Fetch all plugins
                const res = await fetch("/api/plugins")
                if (res.ok) {
                    const data = await res.json()
                    setPluginsList(data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchPlugins()
    }, [])

    const handleOpenPlugin = (pluginId: string) => {
        toast.info("Plugin selected for project. Reloading chat...")
        // In the future this might save the plugin to the project relations in the DB
        // For now we navigate back to the chat with the plugin param
        window.location.href = `/chat/${projectId}?plugin=${pluginId}`
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight dark:text-white">Project Plugins</h3>
                <p className="text-sm text-gray-500 dark:text-white/60">
                    Apply plugins to customize your chat functionality and design.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-white/20" />
                </div>
            ) : pluginsList.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-white/10 rounded-lg p-12 text-center bg-gray-50 dark:bg-[#111114]">
                    <Package className="w-12 h-12 text-gray-300 dark:text-white/10 mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-600 dark:text-white/40">No plugins available yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pluginsList.map((plugin) => (
                        <div key={plugin.id} className="border border-gray-200 dark:border-white/10 rounded-lg p-5 flex flex-col justify-between bg-white dark:bg-[#1E1E21] hover:border-blue-200 dark:hover:border-[#0099ff]/50 transition-colors shadow-sm">
                            <div className="space-y-2 mb-4">
                                <h4 className="font-bold text-gray-900 dark:text-white tracking-tight">{plugin.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-white/40 line-clamp-2">{plugin.tagline}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-50 dark:border-white/5 pt-3">
                                <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-white/30">
                                    <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {plugin.installs}</span>
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {plugin.rating}</span>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleOpenPlugin(plugin.id)}
                                    className="bg-blue-50 dark:bg-[#0099ff]/10 text-blue-600 dark:text-[#0099ff] hover:bg-blue-100 dark:hover:bg-[#0099ff]/20 border-none font-bold"
                                >
                                    <Play className="w-3 h-3 mr-1" /> Load
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
