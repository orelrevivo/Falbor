"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { PluginEditor } from "@/components/plugins/PluginEditor"
import { Loader2 } from "lucide-react"

export default function EditPluginPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user } = useUser()
    const [fetching, setFetching] = useState(true)
    const [initialData, setInitialData] = useState<any>(null)

    useEffect(() => {
        const fetchPlugin = async () => {
            try {
                const res = await fetch(`/api/plugins/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setInitialData({
                        id: data.id,
                        name: data.name || "",
                        tagline: data.tagline || "",
                        summary: data.summary || "",
                        reviewInstructions: data.reviewInstructions || "",
                        description: data.description || "",
                        code: data.code || "",
                        isPaid: data.isPaid || false,
                        categories: Array.isArray(data.categories) ? data.categories.join(", ") : "Animation",
                        visualData: data.visuals?.[0] || "",
                        files: data.files || []
                    })
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
        fetchPlugin()
    }, [id, router])

    const handleUpdate = async (data: any) => {
        if (!user) {
            toast.error("Must be logged in to update a plugin")
            return
        }
        
        try {
            const res = await fetch(`/api/plugins/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    tagline: data.tagline,
                    summary: data.summary,
                    description: data.description,
                    reviewInstructions: data.reviewInstructions,
                    isPaid: data.isPaid,
                    categories: data.categories ? data.categories.split(",").map((c: string) => c.trim()) : [],
                    visuals: data.visualData ? [data.visualData] : [],
                    files: data.files,
                    code: data.code
                })
            })

            if (res.ok) {
                toast.success("Plugin updated successfully!")
                router.push(`/plugins/${id}`)
            } else {
                toast.error("Failed to update plugin")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error updating plugin")
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this plugin? This cannot be undone.")) return

        try {
            const res = await fetch(`/api/plugins/${id}`, {
                method: "DELETE"
            })

            if (res.ok) {
                toast.success("Plugin deleted")
                router.push("/creator/workspace")
            } else {
                toast.error("Failed to delete plugin")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error deleting plugin")
        }
    }

    if (fetching) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>

    return (
        <div className="h-[calc(100vh-134px)]">
            <PluginEditor 
                initialData={initialData}
                onSave={handleUpdate} 
                onDelete={handleDelete}
                isEditing={true}
            />
        </div>
    )
}
