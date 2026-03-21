"use client"

import { useState, useEffect } from "react"
import { Key, Plus, Trash2, Loader2, Database, ShieldCheck, Eye, EyeOff, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Secret {
    id: string
    name: string
    value: string
    createdAt: string
}

interface SecretsSectionProps {
    projectId: string
}

export function SecretsSection({ projectId }: SecretsSectionProps) {
    const [secrets, setSecrets] = useState<Secret[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newName, setNewName] = useState("")
    const [newValue, setNewValue] = useState("")
    const [showValues, setShowValues] = useState<Record<string, boolean>>({})
    const [supabaseConnected, setSupabaseConnected] = useState(false)
    const [neonConnected, setNeonConnected] = useState(false)

    const [usage, setUsage] = useState<{ apiKey: string; count: number; limit: number; percentage: number; tier: string } | null>(null)
    const [loadingUsage, setLoadingUsage] = useState(true)

    useEffect(() => {
        fetchSecrets()
        checkConnections()
        fetchUsage()
    }, [projectId])

    const fetchUsage = async () => {
        try {
            setLoadingUsage(true)
            const res = await fetch(`/api/ai/usage`)
            if (res.ok) {
                const data = await res.json()
                setUsage(data)
            }
        } catch (error) {
            console.error("Failed to fetch usage:", error)
        } finally {
            setLoadingUsage(false)
        }
    }

    const fetchSecrets = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/projects/${projectId}/secrets`)
            if (res.ok) {
                const data = await res.json()
                setSecrets(data)
            }
        } catch (error) {
            console.error("Failed to fetch secrets:", error)
        } finally {
            setLoading(false)
        }
    }

    const checkConnections = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/supabase`)
            if (res.ok) {
                const data = await res.json()
                if (data && data.anonKey && data.anonKey !== "pending") {
                    setSupabaseConnected(true)
                }
            }
            const neonRes = await fetch(`/api/projects/${projectId}/neon`)
            if (neonRes.ok) {
                const data = await neonRes.json()
                if (data && data.databaseUrl) {
                    setNeonConnected(true)
                }
            }
        } catch (error) {
            console.error("Failed to check database connections:", error)
        }
    }

    const handleAddSecret = async () => {
        if (!newName || !newValue) return
        setSaving(true)

        try {
            const res = await fetch(`/api/projects/${projectId}/secrets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, value: newValue }),
            })

            if (res.ok) {
                const newSecret = await res.json()
                setSecrets((prev) => [...prev, newSecret])
                setNewName("")
                setNewValue("")
            }
        } catch (error) {
            console.error("Failed to add secret:", error)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteSecret = async (secretId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/secrets/${secretId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                setSecrets((prev) => prev.filter((s) => s.id !== secretId))
            }
        } catch (error) {
            console.error("Failed to delete secret:", error)
        }
    }

    const toggleShowValue = (id: string) => {
        setShowValues((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-2 space-y-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Secrets</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your project's environment variables and API keys. These secrets are available to the AI when generating code.
                    </p>
                </div>
            </div>

            {/* {supabaseConnected && (
                <Alert className="bg-green-50/50 border-green-200">
                    <Database className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 flex items-center gap-2">
                        Automatic Database Connected
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                        This project is automatically connected to a Supabase server. Database credentials (VITE_SUPABASE_URL, etc.) are managed automatically.
                    </AlertDescription>
                </Alert>
            )}

            {neonConnected && (
                <Alert className="bg-green-50/50 border-green-200">
                    <Database className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 flex items-center gap-2">
                        Automatic Database Connected (Neon)
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                        This project is automatically connected to a Neon Postgres database. Database credentials (DATABASE_URL, etc.) are managed automatically.
                    </AlertDescription>
                </Alert>
            )} */}


            <Card className="border rounded-sm shadow-xs">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Add New Secret</CardTitle>
                    <CardDescription>Enter a name and value for the new environment variable.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold ml-1">Name</label>
                            <Input
                                placeholder="e.g. STRIPE_API_KEY"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold ml-1">Value</label>
                            <Input
                                type="password"
                                placeholder="Enter secret value"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddSecret}
                        disabled={saving || !newName || !newValue}
                        className="w-full md:w-auto h-9"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Secret
                    </Button>
                </CardContent>
            </Card>

            {/* Environment Variables Table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                    <h3 className="text-sm font-semibold">Environment Variables</h3>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 font-normal">
                        {secrets.length + (usage?.apiKey ? 1 : 0)} Total
                    </Badge>
                </div>
                
                <div className="grid gap-3">
                    {/* Falbor AI System Managed Secret */}
                    {usage?.apiKey && (
                        <div className="flex items-center justify-between p-3 border rounded-md bg-zinc-50/50 border-blue-100 hover:border-blue-300 transition-colors group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1">
                                <Badge className="bg-blue-600 text-[8px] h-3 px-1 hover:bg-blue-600 border-none">System</Badge>
                            </div>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-blue-100 p-2 rounded-md">
                                    <Database className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-blue-900 truncate">VITE_FALBOR_AI_API_KEY</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-blue-600/70 font-mono">
                                            {showValues['falbor_system_key'] ? usage.apiKey : "••••••••••••••••••••••••••••••••"}
                                        </span>
                                        <button
                                            onClick={() => toggleShowValue('falbor_system_key')}
                                            className="text-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            {showValues['falbor_system_key'] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-400 italic pr-2">
                                Auto-managed
                            </div>
                        </div>
                    )}

                    {secrets.length === 0 && !usage?.apiKey ? (
                        <div className="text-center py-12 border rounded-md bg-muted/20 text-muted-foreground flex flex-col items-center gap-2">
                            <Key className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No environment variables yet.</p>
                        </div>
                    ) : (
                        secrets.map((secret) => (
                            <div
                                key={secret.id}
                                className="flex items-center justify-between p-3 border rounded-md bg-white hover:border-primary/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-primary/10 p-2 rounded-md">
                                        <Key className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-sm font-semibold truncate">{secret.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {showValues[secret.id] ? secret.value : "••••••••••••••••"}
                                            </span>
                                            <button
                                                onClick={() => toggleShowValue(secret.id)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showValues[secret.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSecret(secret.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 h-8 w-8"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Security & Privacy</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Secrets are encrypted at rest and never shared with anyone. The AI has access to these keys to correctly configure your environment and integrate third-party services like Stripe, OpenAI, or AWS.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
