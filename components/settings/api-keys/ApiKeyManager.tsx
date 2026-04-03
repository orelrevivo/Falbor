"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Key,
    User,
    Sparkles,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Copy,
    Check,
    ExternalLink,
    AlertCircle,
    BrainCircuit,
    Terminal,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'

interface ApiKey {
    id: string
    userId: string
    projectId: string | null
    name: string
    key: string
    type: 'custom' | 'chat'
    messageCount: number
    lastUsedAt: string | null
    createdAt: string
}

export default function ApiKeyManager() {
    const [keys, setKeys] = useState<ApiKey[]>([])
    const [activeTab, setActiveTab] = useState<'custom' | 'chat'>('custom')
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [newKeyData, setNewKeyData] = useState({ name: '', newlyCreated: '' })
    const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
    const [isDocOpen, setIsDocOpen] = useState(false)
    const [balance, setBalance] = useState<number>(0)
    const [selectedKeyForDoc, setSelectedKeyForDoc] = useState<string | null>(null)
    const router = useRouter()
    const fetchAll = async () => {
        setIsLoading(true)
        try {
            const [keysRes, usageRes] = await Promise.all([
                fetch('/api/ai/keys'),
                fetch('/api/ai/usage')
            ])
            const keysData = await keysRes.json()
            const usageData = await usageRes.json()
            setKeys(keysData)
            setBalance(usageData.balance || 0)
        } catch (err) {
            toast.error("Failed to load keys")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    const handleCreate = async () => {
        if (!newKeyData.name) return
        try {
            const res = await fetch('/api/ai/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyData.name, type: 'custom' })
            })
            const data = await res.json()
            setNewKeyData({ ...newKeyData, newlyCreated: data.key })
            fetchAll()
            toast.success("Key created successfully")
        } catch (err) {
            toast.error("Failed to create key")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This key will stop working immediately.")) return
        try {
            await fetch(`/api/ai/keys/${id}`, { method: 'DELETE' })
            setKeys(keys.filter(k => k.id !== id))
            toast.success("Key deleted")
        } catch (err) {
            toast.error("Failed to delete")
        }
    }

    const handleUpdateName = async () => {
        if (!editingKey || !editingKey.name) return
        try {
            await fetch(`/api/ai/keys/${editingKey.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingKey.name })
            })
            setIsEditOpen(false)
            fetchAll()
            toast.success("Key updated")
        } catch (err) {
            toast.error("Failed to update")
        }
    }

    const filteredKeys = keys.filter(k => k.type === activeTab)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
                <p className="text-muted-foreground text-sm max-w-2xl">
                    Manage your model and platform API keys. While in beta, API calls will consume your
                    <span className="font-semibold text-zinc-900"> Falbor Balance (${balance.toFixed(2)})</span>.
                    By using the API, you agree to our API Terms.{" "}
                    <button
                        onClick={() => setIsDocOpen(true)}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                        Learn more about the Falbor API <ExternalLink size={12} />
                    </button>
                </p>
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-zinc-200/50 rounded-md w-fit border border-zinc-100">
                <button
                    onClick={() => setActiveTab('custom')}
                    className={cn(
                        "px-4 py-1.5 text-xs font-medium rounded-sm cursor-pointer",
                        activeTab === 'custom' ? "bg-white text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                    )}
                >
                    API Keys
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={cn(
                        "px-4 py-1.5 text-xs font-medium rounded-sm cursor-pointer",
                        activeTab === 'chat' ? "bg-white text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                    )}
                >
                    Project Chat Keys
                </button>
            </div>

            <div className="bg-white border border-zinc-150 rounded-sm overflow-hidden overflow-visible">
                <div className="p-4 border-b border-zinc-150 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-700">{filteredKeys.length} Keys</span>
                        <Badge variant="outline" className="text-[10px] bg-white">BETA</Badge>
                    </div>
                    {activeTab === 'custom' && (
                        <Button
                            onClick={() => {
                                setNewKeyData({ name: '', newlyCreated: '' })
                                setIsCreateOpen(true)
                            }}
                            className="h-7 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] gap-2 rounded-lg"
                        >
                            <Plus size={14} /> Create Key
                        </Button>
                    )}
                    {activeTab === 'chat' && (
                        <Button onClick={() => router.push('/')}
                            className="h-7 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] gap-2 rounded-lg"
                        >
                            Create New Chat
                        </Button>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[100px]">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-zinc-900 border-b border-zinc-150">
                                <th className="px-5 py-3 font-light">Name</th>
                                <th className="px-5 py-3 font-light">API Key</th>
                                <th className="px-5 py-3 font-light">Usage</th>
                                <th className="px-5 py-3 font-light">Created</th>
                                <th className="px-5 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-400 italic">Loading keys...</td>
                                </tr>
                            ) : filteredKeys.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-400 italic">
                                        No keys found in this category.
                                    </td>
                                </tr>
                            ) : filteredKeys.map(key => (
                                <tr key={key.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-5 py-4 font-medium text-zinc-900">{key.name}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 font-mono text-zinc-500 tracking-tight">
                                            {activeTab === 'chat' ? (
                                                <div className="flex items-center gap-2">
                                                    <span>{key.key.substring(0, 15)}...{key.key.slice(-4)}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(key.key)
                                                            toast.success("Key copied")
                                                        }}
                                                    >
                                                        <Copy size={12} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span>flb_live_••••••••{key.key.slice(-4)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">{key.messageCount} calls</td>
                                    <td className="px-5 py-4 text-zinc-400 text-xs">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                                    <MoreHorizontal size={14} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEditingKey({ ...key })
                                                        setIsEditOpen(true)
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <Pencil size={14} /> Edit Name
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(key.id)}
                                                    className="gap-2 text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 size={14} /> Revoke Key
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Key Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New API Key</DialogTitle>
                        <DialogDescription>
                            Give your key a name to help you identify it later.
                        </DialogDescription>
                    </DialogHeader>

                    {!newKeyData.newlyCreated ? (
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Key Name</label>
                                <Input
                                    placeholder="e.g. My Website Chatbot"
                                    value={newKeyData.name}
                                    onChange={e => setNewKeyData({ ...newKeyData, name: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-sm">
                                <AlertCircle className="shrink-0" size={18} />
                                <p>Save this key now! You won't be able to see it again after closing this window.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Your API Key</label>
                                <div className="flex gap-2">
                                    <Input value={newKeyData.newlyCreated} readOnly className="font-mono bg-zinc-50" />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(newKeyData.newlyCreated)
                                            toast.success("Copied to clipboard")
                                        }}
                                    >
                                        <Copy size={14} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {!newKeyData.newlyCreated ? (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate}>Create</Button>
                        ) : (
                            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => setIsCreateOpen(false)}>Done</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Key Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit API Key</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Display Name</label>
                        <Input
                            value={editingKey?.name || ''}
                            onChange={e => setEditingKey(editingKey ? { ...editingKey, name: e.target.value } : null)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateName}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Doc Modal */}
            <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
                <DialogContent className="max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BrainCircuit className="text-blue-600" size={20} />
                            Falbor API (v1 Beta) Documentation
                        </DialogTitle>
                        <DialogDescription>
                            Everything you need to integrate Falbor's AI into your own websites or applications.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 py-4">
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Key size={14} /> Step 1: Authentication
                            </h3>
                            <p className="text-xs text-zinc-600 mb-4">
                                Use the header <code className="bg-zinc-200 px-1 rounded">x-falbor-key</code> to authenticate your requests.
                                We recommend using a backend proxy to keep your key hidden.
                            </p>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-400">Select Key for Example</label>
                                <select
                                    className="w-full bg-white border border-zinc-200 rounded-lg h-9 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                    onChange={(e) => setSelectedKeyForDoc(e.target.value)}
                                >
                                    <option value="">Select a key...</option>
                                    {keys.map(k => (
                                        <option key={k.id} value={k.key}>{k.name} ({k.key.substring(0, 8)}...)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Terminal size={14} /> Step 2: Basic Integration
                            </h3>
                            <div className="relative group">
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => {
                                        navigator.clipboard.writeText(`const response = await fetch('https://falbor.xyz/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-falbor-key': '${selectedKeyForDoc || "YOUR_KEY_HERE"}'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});`)
                                        toast.success("Code copied")
                                    }}>
                                        <Copy size={12} />
                                    </Button>
                                </div>
                                <pre className="bg-zinc-900 text-zinc-300 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
                                    {`const response = await fetch('https://falbor.xyz/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-falbor-key': '${selectedKeyForDoc || "YOUR_KEY_HERE"}'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});`}
                                </pre>
                            </div>
                        </div>

                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-2 text-blue-900 font-semibold">
                                <Sparkles size={18} /> Elite AI Builder Prompt
                            </div>
                            <p className="text-xs text-blue-700">
                                Copy this prompt and send it to any AI (ChatGPT, Claude, v0) to automatically build a custom chat interface connected to your Falbor API.
                            </p>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 shadow-lg shadow-blue-500/20"
                                onClick={() => {
                                    navigator.clipboard.writeText(`I want you to build me a modern, beautiful React Chat application using Vite and Tailwind CSS.
Use the Falbor AI API for the backend. 
- Endpoint: https://falbor.xyz/api/ai/chat
- Required Header: x-falbor-key (use '${selectedKeyForDoc || "VITE_FALBOR_AI_API_KEY"}' as the value)
- Implementation: Create a clean Chat UI with motion effects (framer-motion) and lucide icons. 
Focus on a premium look with soft shadows and rounded corners. Always handle loading states and errors.`)
                                    toast.success("AI Prompt copied!")
                                }}
                            >
                                <Copy size={16} /> Copy AI Builder Prompt
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-start pt-4 border-t border-zinc-100">
                        <p className="text-[10px] text-zinc-400">
                            Each message uses approximately $0.002 to $0.05 from your Falbor balance depending on length.
                        </p>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
