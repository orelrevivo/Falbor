"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { ProfessionalIDE } from "@/components/plugins/ProfessionalIDE"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function PluginIDEPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user } = useUser()
    const [fetching, setFetching] = useState(true)
    const [pluginData, setPluginData] = useState<any>(null)

    useEffect(() => {
        const fetchPlugin = async () => {
            try {
                const res = await fetch(`/api/plugins/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    // Security: Verify owner
                    if (user && data.userId !== user.id) {
                        toast.error("Unauthorized to edit this plugin")
                        router.push("/creator/workspace")
                        return
                    }
                    setPluginData(data)
                } else {
                    toast.error("Plugin not found")
                    router.push("/creator/workspace")
                }
            } catch (e) {
                console.error(e)
                toast.error("Error loading plugin")
            } finally {
                setFetching(false)
            }
        }
        if (user) fetchPlugin()
    }, [id, router, user])

    const handleUpdate = async (files: any[]) => {
        if (!user) return
        
        try {
            const entryPoint = files.find(f => f.path === 'index.js')?.content || ""
            const res = await fetch(`/api/plugins/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files,
                    code: entryPoint
                })
            })

            if (!res.ok) {
                throw new Error("Failed to save changes")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error updating plugin")
            throw error // Let the IDE component handle the error state
        }
    }

    if (fetching || !pluginData) return (
        <div className="h-screen bg-[#1e1e1e] flex flex-col items-center justify-center gap-4 text-white/40">
             <Loader2 className="w-8 h-8 animate-spin text-[#0099ff]" />
             <p className="text-xs font-bold uppercase tracking-widest">Booting IDE Environment...</p>
        </div>
    )

    return (
        <ProfessionalIDE
            pluginName={pluginData.name}
            initialFiles={pluginData.files || [{ path: 'index.js', content: pluginData.code || "" }]}
            onSave={handleUpdate}
            onBack={() => router.push(`/creator/workspace/plugin/${id}`)}
        />
    )
}
