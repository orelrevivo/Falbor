"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Upload, Link2, Key, Info } from "lucide-react"
import { saveMcpConnection } from "@/app/actions/mcp"
import { toast } from "sonner"

interface AddCustomMcpModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AddCustomMcpModal({ open, onOpenChange, onSuccess }: AddCustomMcpModalProps) {
    const [name, setName] = useState("")
    const [iconUrl, setIconUrl] = useState("")
    const [envVars, setEnvVars] = useState([{ key: "", value: "" }])
    const [isLoading, setIsLoading] = useState(false)

    const addEnvVar = () => {
        setEnvVars([...envVars, { key: "", value: "" }])
    }

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index))
    }

    const updateEnvVar = (index: number, field: "key" | "value", val: string) => {
        const newVars = [...envVars]
        newVars[index][field] = val
        setEnvVars(newVars)
    }

    const handleSave = async () => {
        if (!name) return toast.error("Please enter a name")

        setIsLoading(true)
        try {
            const result = await saveMcpConnection({
                type: "custom",
                name: name,
                icon: iconUrl,
                isCustom: true,
                config: {
                    envVars: envVars.filter(v => v.key && v.value)
                }
            })

            if (result.success) {
                toast.success(`${name} added successfully`)
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Failed to add custom API")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-white rounded-md p-8 border-none shadow-xs overflow-hidden">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black text-zinc-900 tracking-tight">Add API Castium</DialogTitle>
                    <DialogDescription className="text-zinc-500 font-medium">Configure your custom API integration. Add as many environment variables as needed.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-8 py-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="api_name" className="text-xs font-black uppercase tracking-widest text-zinc-400">API Name</Label>
                            <Input
                                id="api_name"
                                placeholder="e.g. Nvidia, OpenAI, Internal Service"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 bg-zinc-50 border-zinc-100 focus:bg-white transition-all rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="api_icon" className="text-xs font-black uppercase tracking-widest text-zinc-400">Icon URL or Image</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        id="api_icon"
                                        placeholder="https://example.com/icon.png"
                                        value={iconUrl}
                                        onChange={(e) => setIconUrl(e.target.value)}
                                        className="h-12 pl-10 bg-zinc-50 border-zinc-100 focus:bg-white transition-all rounded-xl"
                                    />
                                    <Link2 className="w-4 h-4 absolute left-3 top-4 text-zinc-400" />
                                </div>
                                <Button variant="outline" className="h-12 px-4 rounded-xl border-zinc-200 border-2 gap-2 text-xs font-bold whitespace-nowrap">
                                    <Upload className="w-4 h-4" />
                                    Upload
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Environment Variables</Label>
                            <div className="flex items-center gap-2 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold uppercase tracking-tight">
                                <Key className="w-3 h-3" />
                                Required for Authentication
                            </div>
                        </div>

                        <div className="space-y-3">
                            {envVars.map((v, i) => (
                                <div key={i} className="flex gap-3 group animate-in slide-in-from-top-1 fade-in duration-200">
                                    <Input
                                        placeholder="API Key Name (e.g. NVIDIA_API_KEY)"
                                        value={v.key}
                                        onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                                        className="h-11 bg-zinc-50 border-zinc-100 rounded-xl font-mono text-[11px]"
                                    />
                                    <Input
                                        placeholder="Value (e.g. sk-...)"
                                        type="password"
                                        value={v.value}
                                        onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                                        className="h-11 bg-zinc-50 border-zinc-100 rounded-xl font-mono text-[11px]"
                                    />
                                    {envVars.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => removeEnvVar(i)}
                                            className="h-11 w-11 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            onClick={addEnvVar}
                            className="w-full h-11 border-dashed border-2 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-xl gap-2 text-xs font-bold text-zinc-500 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Another API Key
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-8 pt-6 border-t border-zinc-50">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-12 px-6 font-bold text-zinc-500 rounded-xl hover:bg-zinc-100"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="h-12 px-10 bg-black hover:bg-zinc-800 text-white font-black rounded-xl shadow-xl shadow-black/10 transition-all"
                    >
                        {isLoading ? "Saving..." : "Add API Castium"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
