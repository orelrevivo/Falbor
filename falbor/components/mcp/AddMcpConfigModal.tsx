"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Terminal, Globe, Cloud, Link2, Upload, StickyNote, Info } from "lucide-react"
import { saveMcpConnection } from "@/app/actions/mcp"
import { toast } from "sonner"

interface AddMcpConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AddMcpConfigModal({ open, onOpenChange, onSuccess }: AddMcpConfigModalProps) {
    const [serverName, setServerName] = useState("")
    const [mcpCode, setMcpCode] = useState("")
    const [transportType, setTransportType] = useState<"STDIO" | "SSE" | "HTTP">("STDIO")
    const [serverUrl, setServerUrl] = useState("")
    const [iconUrl, setIconUrl] = useState("")
    const [note, setNote] = useState("")
    const [headers, setHeaders] = useState([{ name: "", value: "" }])
    const [isLoading, setIsLoading] = useState(false)

    const addHeader = () => setHeaders([...headers, { name: "", value: "" }])
    const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index))
    const updateHeader = (index: number, field: "name" | "value", val: string) => {
        const newHeaders = [...headers];
        newHeaders[index][field] = val;
        setHeaders(newHeaders);
    };

    const handleImport = async () => {
        if (!serverName) return toast.error("Please enter a server name")

        setIsLoading(true)
        try {
            const result = await saveMcpConnection({
                type: "custom_config",
                name: serverName,
                icon: iconUrl,
                isCustom: true,
                config: {
                    transportType,
                    serverUrl,
                    mcpCode,
                    note,
                    headers: headers.filter(h => h.name && h.value)
                }
            })

            if (result.success) {
                toast.success(`MCP Config ${serverName} imported successfully`)
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Failed to import MCP configuration")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white rounded-3xl p-8 border-none shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-zinc-900 tracking-tight">Add Jason Import</DialogTitle>
                    <DialogDescription className="text-zinc-500 font-medium italic underline decoration-red-500 underline-offset-4">
                        Import an MCP server configuration using JSON or manual entry.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-4 space-y-8 py-6 scrollbar-thin">
                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">MCP Configuration Code</Label>
                        <Textarea
                            placeholder='{ "mcpServers": { "custom-server": { "command": "npx", "args": [...] } } }'
                            value={mcpCode}
                            onChange={(e) => setMcpCode(e.target.value)}
                            className="min-h-[140px] bg-zinc-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Server Name</Label>
                            <div className="relative">
                                <Input
                                    placeholder="e.g. Supabase Server"
                                    value={serverName}
                                    onChange={(e) => setServerName(e.target.value)}
                                    className="h-11 pl-10 bg-zinc-50 border-zinc-100 rounded-xl"
                                />
                                <Terminal className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Transport Type</Label>
                            <Select value={transportType} onValueChange={(val: any) => setTransportType(val)}>
                                <SelectTrigger className="h-11 bg-zinc-50 border-zinc-100 rounded-xl font-bold text-xs uppercase tracking-widest">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white rounded-xl border-zinc-200">
                                    <SelectItem value="STDIO">STDIO</SelectItem>
                                    <SelectItem value="SSE">SSE</SelectItem>
                                    <SelectItem value="HTTP">HTTP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Server URL (Target)</Label>
                        <div className="relative">
                            <Input
                                placeholder="http://localhost:3000/mcp"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                className="h-11 pl-10 bg-zinc-50 border-zinc-100 rounded-xl"
                            />
                            <Globe className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Icon UI</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Icon URL"
                                        value={iconUrl}
                                        onChange={(e) => setIconUrl(e.target.value)}
                                        className="h-11 pl-9 bg-zinc-50 border-zinc-100 rounded-xl text-xs"
                                    />
                                    <Link2 className="w-4 h-4 absolute left-3 top-3.5 text-zinc-400" />
                                </div>
                                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-zinc-200 border-2">
                                    <Upload className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Add Note</Label>
                            <div className="relative">
                                <Input
                                    placeholder="Integration details..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="h-11 pl-10 bg-zinc-50 border-zinc-100 rounded-xl text-xs"
                                />
                                <StickyNote className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Custom Headers (Optional)</Label>
                        <div className="space-y-2">
                            {headers.map((h, i) => (
                                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-top-1">
                                    <Input
                                        placeholder="Header Name"
                                        value={h.name}
                                        onChange={(e) => updateHeader(i, "name", e.target.value)}
                                        className="h-10 bg-zinc-50 border-zinc-100 rounded-xl text-xs"
                                    />
                                    <Input
                                        placeholder="Header Value"
                                        value={h.value}
                                        onChange={(e) => updateHeader(i, "value", e.target.value)}
                                        className="h-10 bg-zinc-50 border-zinc-100 rounded-xl text-xs"
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeHeader(i)} className="h-10 w-10 text-zinc-400 hover:text-red-500 rounded-xl">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={addHeader}
                                className="w-full h-10 gap-2 border-dashed border-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:bg-zinc-50 transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                New Header
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-6 border-t border-zinc-50 mt-auto">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-12 px-6 font-bold text-zinc-500 rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="h-12 px-10 bg-black hover:bg-zinc-800 text-white font-black rounded-xl shadow-xl shadow-black/10"
                        onClick={handleImport}
                        disabled={isLoading}
                    >
                        {isLoading ? "Importing..." : "Add Import Jason"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
