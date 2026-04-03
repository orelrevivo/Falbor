"use client"

import { useState, useRef } from "react"
import { Plus, Settings2, Trash2, Power, Globe, PlayCircle, Upload, Link2, Key, Terminal, StickyNote, ChevronLeft, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { saveMcpConnection } from "@/app/actions/mcp"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CustomMcpTabProps {
    connections: any[]
    searchQuery?: string
    onDisconnect: (id: string, name: string) => void
    onSuccess: () => void
}

type ViewState = "list" | "add-custom" | "add-json"

export function CustomMcpTab({ connections, searchQuery = "", onDisconnect, onSuccess }: CustomMcpTabProps) {
    const [view, setView] = useState<ViewState>("list")
    const [manageOpenId, setManageOpenId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form states
    const [name, setName] = useState("")
    const [iconUrl, setIconUrl] = useState("")
    const [envVars, setEnvVars] = useState([{ key: "", value: "" }])

    const [serverName, setServerName] = useState("")
    const [mcpCode, setMcpCode] = useState("")
    const [transportType, setTransportType] = useState<"STDIO" | "SSE" | "HTTP">("STDIO")
    const [serverUrl, setServerUrl] = useState("")
    const [note, setNote] = useState("")
    const [headers, setHeaders] = useState([{ name: "", value: "" }])

    const customConnections = connections.filter(c => c.isCustom &&
        (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.config?.note && c.config.note.toLowerCase().includes(searchQuery.toLowerCase())))
    )

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) return toast.error("Image too large (max 2MB)")

        const reader = new FileReader()
        reader.onload = (event) => {
            setter(event.target?.result as string)
            toast.success("Image uploaded successfully")
        }
        reader.readAsDataURL(file)
    }

    const resetForms = () => {
        setName("")
        setIconUrl("")
        setEnvVars([{ key: "", value: "" }])
        setServerName("")
        setMcpCode("")
        setTransportType("STDIO")
        setServerUrl("")
        setNote("")
        setHeaders([{ name: "", value: "" }])
        setView("list")
    }

    const handleSaveCustom = async () => {
        if (!name) return toast.error("Please enter a name")
        setIsLoading(true)
        try {
            const result = await saveMcpConnection({
                type: "custom",
                name,
                icon: iconUrl,
                isCustom: true,
                config: { envVars: envVars.filter(v => v.key && v.value) }
            })
            if (result.success) {
                toast.success(`${name} added successfully`)
                onSuccess()
                resetForms()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Failed to add custom API")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveJson = async () => {
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
                resetForms()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Failed to import MCP configuration")
        } finally {
            setIsLoading(false)
        }
    }

    if (view === "add-custom") {
        return (
            <div className="bg-white rounded-md border shadow-xs px-5 py-5">
                <div className="flex items-center mb-2">
                    <Button variant="ghost" size="icon" onClick={() => setView("list")} className="rounded-xl"><ChevronLeft className="w-5 h-5" /></Button>
                    <div>
                        <h3 className="text-xl text-gray-900 tracking-tight">Add API Castium</h3>
                        <p className="text-zinc-500 text-sm font-medium">Configure your custom API integration inline.</p>
                    </div>
                </div>

                <div className="grid gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">API Name</Label>
                            <Input placeholder="e.g. Nvidia Internal" value={name} onChange={e => setName(e.target.value)} className="h-12 bg-zinc-50 border-zinc-100 rounded-xl font-bold" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Icon / Logo</Label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Input placeholder="https://..." value={iconUrl} onChange={e => setIconUrl(e.target.value)} className="h-12 pl-10 bg-zinc-50 border-zinc-100 rounded-xl" />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, setIconUrl)} />
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-9 px-4 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] gap-2 text-[11px] rounded-md">
                                    <Upload className="w-4 h-4" />
                                    Upload
                                </Button>
                            </div>
                            {iconUrl && (
                                <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100 w-fit">
                                    <img src={iconUrl} className="w-6 h-6 rounded-md object-contain" alt="Preview" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Preview Loaded</span>
                                    <button onClick={() => setIconUrl("")} className="ml-2 text-emerald-400 hover:text-emerald-600"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Environment Variables</Label>
                            {envVars.map((v, i) => (
                                <div key={i} className="flex gap-3">
                                    <Input placeholder="KEY" value={v.key} onChange={e => {
                                        const n = [...envVars]; n[i].key = e.target.value; setEnvVars(n)
                                    }} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl font-mono text-[11px]" />
                                    <Input placeholder="VALUE" type="password" value={v.value} onChange={e => {
                                        const n = [...envVars]; n[i].value = e.target.value; setEnvVars(n)
                                    }} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl font-mono text-[11px]" />
                                    <Button variant="ghost" size="icon" onClick={() => setEnvVars(envVars.filter((_, idx) => idx !== i))} className="h-11 w-11 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={() => setEnvVars([...envVars, { key: "", value: "" }])} className="h-9 px-4 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[11px] rounded-md">
                                <Plus className="w-4 h-4 mr-2" /> Add Variable
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                        <Button variant="ghost" onClick={() => setView("list")} className="h-9 px-4 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[11px] rounded-md">Cancel</Button>
                        <Button onClick={handleSaveCustom} disabled={isLoading} className="h-9 px-4 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] gap-2 text-[11px] rounded-md">
                            {isLoading ? "Saving..." : "Save Integration"}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (view === "add-json") {
        return (
            <div className="bg-white rounded-md border shadow-xs px-5 py-5">
                <div className="flex items-center mb-2">
                    <Button variant="ghost" size="icon" onClick={() => setView("list")} className="rounded-xl"><ChevronLeft className="w-5 h-5" /></Button>
                    <div>
                        <h3 className="text-xl text-gray-900 tracking-tight">JSON Import</h3>
                        <p className="text-zinc-500 text-sm font-medium">Advanced configuration import.</p>
                    </div>
                </div>

                <div className="grid gap-8">
                    <div className="space-y-2">
                        <Label className="text-[12px] text-gray-700 ml-0.5">MCP Configuration Code</Label>
                        <Textarea
                            placeholder='{ "mcpServers": { ... } }'
                            value={mcpCode}
                            onChange={e => setMcpCode(e.target.value)}
                            className="min-h-[160px] bg-zinc-50 text-emerald-400 font-mono text-xs p-4 rounded-md border-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Server Name</Label>
                            <Input placeholder="e.g. Supabase Server" value={serverName} onChange={e => setServerName(e.target.value)} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Transport Type</Label>
                            <Select value={transportType} onValueChange={(val: any) => setTransportType(val)}>
                                <SelectTrigger className="bg-zinc-50 rounded-md text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white rounded-xl">
                                    <SelectItem value="STDIO">STDIO</SelectItem>
                                    <SelectItem value="SSE">SSE</SelectItem>
                                    <SelectItem value="HTTP">HTTP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[12px] text-gray-700 ml-0.5">Server URL (Target)</Label>
                        <Input placeholder="https://..." value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Icon URL</Label>
                            <div className="flex gap-2">
                                <Input value={iconUrl} onChange={e => setIconUrl(e.target.value)} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl text-xs" />
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, setIconUrl)} />
                                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="h-9 px-4 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] gap-2 text-[11px] rounded-md"><Upload className="w-4 h-4" /></Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-gray-700 ml-0.5">Note</Label>
                            <Input value={note} onChange={e => setNote(e.target.value)} className="h-11 bg-zinc-50 border-zinc-100 rounded-xl text-xs" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                        <Button variant="ghost" onClick={() => setView("list")} className="h-9 px-4 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[11px] rounded-md">Cancel</Button>
                        <Button onClick={handleSaveJson} disabled={isLoading} className="h-9 px-4 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] gap-2 text-[11px] rounded-md">
                            {isLoading ? "Importing..." : "Add Import JSON"}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {customConnections.length} Custom Integraions
                </h3>
                <div className="flex gap-3">
                    <Button onClick={() => setView("add-custom")} variant="outline" className="h-7 px-4 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[11px] rounded-md">
                        <Plus className="w-4 h-4 mr-2" /> Add API
                    </Button>
                    <Button onClick={() => setView("add-json")} variant="outline" className="h-7 px-4 bg-white hover:bg-zinc-50 border shadow-xs text-zinc-900 gap-2 text-[11px] rounded-md">
                        <Terminal className="w-4 h-4 mr-2" /> JSON Import
                    </Button>
                </div>
            </div>

            {customConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center shadow-xs p-20 border border-dashed rounded-md">
                    <div className="w-10 h-10 bg-[#0099ff]/20 rounded-md flex items-center justify-center mb-1 group">
                        <Globe className="w-5 h-5 text-[#0099ff] group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-xl">No custom integrations found</h3>
                    <p className="text-zinc-500 text-sm font-medium mb-8">Start by adding a new API or importing a configuration.</p>
                </div>
            ) : (
                <div className="bg-white rounded-md border shadow-xs overflow-hidden">
                    <table className="w-full">
                        <thead className="border-b">
                            <tr>
                                <th className="px-6 py-4 text-left text-[12px] text-gray-700">Provider</th>
                                <th className="px-6 py-4 text-left text-[12px] text-gray-700">Configuration Details</th>
                                <th className="px-6 py-4 text-center text-[12px] text-gray-700">Status</th>
                                <th className="px-6 py-4 text-right text-[12px] text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {customConnections.map((mcp) => {
                                const isManageOpen = manageOpenId === mcp.id
                                return (
                                    <tr key={mcp.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-6 border-none">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 min-w-12 rounded-md bg-white flex items-center justify-center shadow-xs border`}>
                                                    {mcp.icon ? <img src={mcp.icon} alt={mcp.name} className="w-10 h-10" /> : <Globe className="w-6 h-6" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 border-none">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[12px] text-zinc-600 font-medium line-clamp-1">{mcp.config?.note || 'Custom integration'}</p>
                                                <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{mcp.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center border-none">
                                            <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-bold text-[9px] uppercase tracking-widest rounded-full whitespace-nowrap">Active</Badge>
                                        </td>
                                        <td className="px-6 py-6 border-none">
                                            <div className="flex items-center justify-end gap-3 relative">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-zinc-400 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
                                                        >
                                                            <Settings2 className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-2 z-50">
                                                        <DropdownMenuItem
                                                            className="flex items-center gap-3 px-3 py-2.5 font-bold text-red-500 text-[11px] rounded-xl hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                            onClick={() => onDisconnect(mcp.id, mcp.name)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Remove Integration
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
