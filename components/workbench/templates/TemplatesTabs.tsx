"use client"

import { useState } from "react"
import { TemplatesGrid } from "@/components/workbench/templates/templates-grid"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Folder, Download, Star } from "lucide-react"
import { useUser } from "@clerk/nextjs"

export function TemplatesTabs({ templatesData, pluginsData }: { templatesData: any[], pluginsData: any[] }) {
    const [activeTab, setActiveTab] = useState<"templates" | "plugins">("templates")
    const { user } = useUser()

    return (
        <div className="space-y-8">
            {/* Tabs */}
            <div className="flex justify-center">
                <div className="bg-gray-100/50 p-1.5 rounded-xl inline-flex gap-2">
                    <button
                        onClick={() => setActiveTab("templates")}
                        className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === "templates"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab("plugins")}
                        className={`px-8 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === "plugins"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Plugins
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                {activeTab === "templates" ? (
                    <TemplatesGrid templates={templatesData} />
                ) : (
                    <div className="space-y-6">
                        {pluginsData.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 font-bold bg-white rounded-sm border border-gray-100 shadow-sm max-w-2xl mx-auto">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                None uploaded yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pluginsData.map((plugin) => (
                                    <div key={plugin.id} className="bg-white rounded-sm border shadow-xs py-5 px-7 space-y-4 hover:border-blue-100 transition-colors group relative overflow-hidden">
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{plugin.name}</h4>
                                            <p className="text-xs font-bold text-gray-500 tracking-tight line-clamp-1">{plugin.tagline}</p>
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 font-bold">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {plugin.installs}</span>
                                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gray-500" /> {plugin.rating}</span>
                                            </div>
                                            <span>{plugin.isPaid ? 'Paid' : 'Free'}</span>
                                        </div>

                                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 rounded-sm
                                         group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                            <Link href={`/plugins/${plugin.id}`}>
                                                <Button size="sm" className="bg-[#0099ff] hover:bg-[#0099ff] text-white rounded-sm text-[10px] h-7 px-3">View Plugin</Button>
                                            </Link>
                                            {user?.id === plugin.userId && (
                                                <Link href={`/creator/workspace/plugin/${plugin.id}`}>
                                                    <Button size="sm" variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700 rounded-sm text-[10px] h-7 px-3">Edit Plugin</Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
