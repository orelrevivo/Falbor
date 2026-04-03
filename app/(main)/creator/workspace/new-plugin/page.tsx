"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { PluginEditor } from "@/components/plugins/PluginEditor"

export default function NewPluginPage() {
    const router = useRouter()
    const { user } = useUser()

    const handleSave = async (data: any) => {
        if (!user) {
            toast.error("Must be logged in to create a plugin")
            return
        }
        
        try {
            const res = await fetch("/api/plugins/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    creatorName: user.fullName || user.username || "Anonymous",
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
                const plugin = await res.json()
                toast.success("Plugin published!")
                router.push(`/plugins/${plugin.id}`)
            } else {
                toast.error("Failed to publish plugin")
            }
        } catch (error) {
            toast.error("Error publishing plugin")
        }
    }

    return (
        <div className="h-[calc(100vh-134px)]">
            <PluginEditor 
                onSave={handleSave} 
                isEditing={false}
            />
        </div>
    )
}
