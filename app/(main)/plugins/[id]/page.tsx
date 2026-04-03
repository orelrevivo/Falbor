"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, Zap, Star, Download, Loader2, Folder, X, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function PluginDetailPage() {
    const { id } = useParams()
    const { user } = useUser()
    const router = useRouter()

    const [plugin, setPlugin] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showProjectPicker, setShowProjectPicker] = useState(false)
    const [projects, setProjects] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)

    useEffect(() => {
        if (!id) return;
        const fetchPlugin = async () => {
            try {
                const res = await fetch(`/api/plugins/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setPlugin(data)
                } else {
                    toast.error("Plugin not found")
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchPlugin()
    }, [id])

    const fetchUserProjects = async () => {
        if (!user) {
            toast.error("Please sign in to use plugins")
            return
        }
        setLoadingProjects(true)
        setShowProjectPicker(true)

        try {
            const res = await fetch("/api/projects")
            if (res.ok) {
                const data = await res.json()
                const projectsList = Array.isArray(data) ? data : (data.projects || [])
                setProjects(projectsList)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingProjects(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
    if (!plugin) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Plugin not found</div>

    return (
        <div className="min-h-screen bg-[#fcfdfe]">
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-8 sticky top-0 z-[100]">
                <Link href="/templates" className="flex items-center gap-2 text-xs font-bold text-black/90 hover:text-black/60">
                    <ArrowLeft className="w-4 h-4" />
                    Marketplace
                </Link>
            </header>

            <main className="max-w-5xl mx-auto px-8 py-16">
                <div className="flex flex-col lg:flex-row gap-16">
                    <div className="flex-1 space-y-12">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#0099ff] rounded-sm flex items-center justify-center text-white shadow-blue-200 shrink-0">
                                <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <div className="space-y-1">
                                {/* <Badge className="bg-black/10 text-black/90 hover:bg-black/10 text-[10px] px-2.5">Community Plugin</Badge> */}
                                <h1 className="text-3xl text-gray-900">{plugin.name}</h1>
                                <p className="text-lg text-gray-500">{plugin.tagline}</p>
                            </div>
                        </div>

                        {plugin.visuals?.[0] && (
                            <div className="aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-2xl relative group">
                                <img src={plugin.visuals[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 bg-[#0099ff] rounded-full" />
                                <h3 className="text-xs text-gray-900">Description</h3>
                            </div>
                            <div className="prose prose-blue max-w-none text-gray-600 font-medium leading-loose text-base whitespace-pre-wrap">
                                {plugin.description}
                            </div>
                        </div>
                    </div>

                    <aside className="w-full lg:w-[320px] shrink-0">
                        <div className="sticky top-32 space-y-6">
                            <div className="bg-white py-4 px-4 rounded-sm border shadow-xs shadow-gray-100/50 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="">
                                        <div className="text-[14px] text-black/80">Price</div>
                                        <div className="text-2xl text-black/90">{plugin.isPaid ? `$${(plugin.price / 100).toFixed(2)}` : 'FREE'}</div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-[12px] text-black/70">Rating</div>
                                        <div className="flex items-center gap-1 font-black text-gray-900">
                                            <Star className="w-4 h-4 fill-gray-400 text-gray-400" />
                                            {plugin.rating}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={fetchUserProjects}
                                    className="w-full h-7 bg-[#0099ff]
                                     hover:bg-[#0099ff] text-white rounded-sm text-sm"
                                >
                                    Install Plugin
                                </Button>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                    <div className="space-y-1">
                                        <div className="text-[13px] text-black/80">Installs</div>
                                        <div className="text-sm font-bold text-gray-700">{plugin.installs.toLocaleString()}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[13px] text-black/80">Updated</div>
                                        <div className="text-sm font-bold text-black/90">{new Date(plugin.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-sm shadow-xs border flex items-center gap-4">
                                <div className="w-12 h-12 rounded-sm bg-white border flex items-center justify-center text-lg">
                                    {plugin.creatorName?.[0]}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[13px] text-gray-800">Created by</div>
                                    <div className="text-sm text-gray-900">{plugin.creatorName}</div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <AnimatePresence>
                {showProjectPicker && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProjectPicker(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Select Project</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Where should we install?</p>
                                </div>
                                <button onClick={() => setShowProjectPicker(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
                                {loadingProjects ? (
                                    <div className="space-y-2 p-4">
                                        <Skeleton className="h-16 w-full rounded-2xl bg-gray-50" />
                                        <Skeleton className="h-16 w-full rounded-2xl bg-gray-50" />
                                        <Skeleton className="h-16 w-full rounded-2xl bg-gray-50" />
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="py-12 px-8 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-200">
                                            <Folder className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">You don't have any projects yet.</p>
                                        <Button onClick={() => router.push("/")} className="bg-blue-600 rounded-xl font-bold">Create Project</Button>
                                    </div>
                                ) : (
                                    projects.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={async () => {
                                                try {
                                                    // Increment install count
                                                    await fetch(`/api/plugins/${id}/install`, { method: "POST" })
                                                    router.push(`/chat/${p.id}?plugin=${plugin.id}`)
                                                } catch (e) {
                                                    console.error("Failed to record install", e)
                                                    router.push(`/chat/${p.id}?plugin=${plugin.id}`)
                                                }
                                            }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group"
                                        >
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                                                <Folder className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 truncate text-left">
                                                <div className="text-sm font-black text-gray-800 tracking-tight group-hover:text-blue-600 truncate">{p.title}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-300 transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
