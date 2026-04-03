"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Save, Plus, ExternalLink, ShieldCheck, ChevronDown, CheckCircle2, Copy, Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface AuthProvider {
    id?: string
    provider: string
    isEnabled: boolean
    clientId?: string
    clientSecret?: string
}

interface AuthProvidersProps {
    projectId: string
    onSendMessage?: (message: string) => void
}

export function AuthProviders({ projectId, onSendMessage }: AuthProvidersProps) {
    const [providers, setProviders] = useState<Record<string, AuthProvider>>({
        email: { provider: "email", isEnabled: true },
        google: { provider: "google", isEnabled: false },
        twitter: { provider: "twitter", isEnabled: false },
        facebook: { provider: "facebook", isEnabled: false },
    })

    const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})
    const [projectMetadata, setProjectMetadata] = useState<any>(null)
    const [supabaseMetadata, setSupabaseMetadata] = useState<any>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProviders() {
            try {
                const res = await fetch(`/api/projects/${projectId}/auth-providers`)
                if (res.ok) {
                    const data: AuthProvider[] = await res.json()
                    const newProviders = { ...providers }
                    data.forEach(p => {
                        newProviders[p.provider] = p
                    })
                    setProviders(newProviders)
                }

                // Fetch Project Metadata for Subdomain
                const projectRes = await fetch(`/api/projects/${projectId}`)
                if (projectRes.ok) {
                    const projectData = await projectRes.json()
                    setProjectMetadata(projectData)
                }

                // Fetch Supabase Metadata for Redirect URI
                const supabaseRes = await fetch(`/api/projects/${projectId}/supabase`)
                if (supabaseRes.ok) {
                    const supabaseData = await supabaseRes.json()
                    setSupabaseMetadata(supabaseData)
                }
            } catch (error) {
                console.error("Failed to fetch auth providers or project info", error)
            } finally {
                setLoading(false)
            }
        }
        fetchProviders()
    }, [projectId])

    const handleToggle = async (provider: string, checked: boolean) => {
        const updated = { ...providers[provider], isEnabled: checked }
        setProviders(prev => ({ ...prev, [provider]: updated }))

        try {
            await fetch(`/api/projects/${projectId}/auth-providers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated)
            })
        } catch (e) {
            console.error("Failed to save toggle", e)
        }
    }

    const handleSave = async (provider: string) => {
        setSaving(provider)
        try {
            const res = await fetch(`/api/projects/${projectId}/auth-providers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(providers[provider])
            })
            if (res.ok) {
                setSavedStatus(prev => ({ ...prev, [provider]: true }))
                setTimeout(() => setSavedStatus(prev => ({ ...prev, [provider]: false })), 3000)
            }
        } catch (e) {
            console.error("Failed to save provider", e)
        } finally {
            setSaving(null)
        }
    }

    const handleAdd = (provider: string) => {
        const p = providers[provider]
        let message = ""

        if (provider === "email") {
            message = "AI add me Email / Password Sign In. I enabled it in the settings."
        } else {
            message = `AI add me ${provider.charAt(0).toUpperCase() + provider.slice(1)} Sign In. I added the Client ID and Client Secret: ${p.clientId} / ${p.clientSecret}`
        }

        if (onSendMessage) {
            onSendMessage(message)
        } else {
            window.dispatchEvent(new CustomEvent('chat:send-message', { detail: { message } }))
        }
    }

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const renderSection = (
        id: string,
        icon: any,
        buttonTitle: string,
        panelTitle: string,
        description: string
    ) => {
        const isExpanded = expandedProvider === id
        const data = providers[id]

        return (
            <div className="flex flex-col border-b last:border-b-0 border-[#e5e7eb]">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedProvider(isExpanded ? null : id)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedProvider(isExpanded ? null : id);
                        }
                    }}
                    className={cn(
                        "flex items-center justify-between p-4 w-full hover:bg-gray-50 transition-colors text-left cursor-pointer outline-none focus-visible:bg-gray-50",
                        id === "email" && !isExpanded && "rounded-t-md",
                        id === "facebook" && !isExpanded && "rounded-b-md"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-md border">
                            <img src={icon} alt="Icons" />
                        </div>

                        <div>
                            <h4 className="text-sm text-gray-900">{buttonTitle}</h4>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                                checked={data.isEnabled}
                                onCheckedChange={(checked) => handleToggle(id, checked)}
                            />
                        </div>

                        <ChevronDown className={cn(
                            "w-4 h-4 text-gray-400 transition-transform",
                            isExpanded && "rotate-180"
                        )} />
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="p-6 pt-2 space-y-6">

                                <div className="">
                                    <h5 className="text-sm text-gray-900">
                                        {panelTitle}
                                    </h5>

                                    <p className="text-xs text-gray-500">
                                        Enables sign in with {buttonTitle}.{" "}
                                        <a
                                            href={
                                                id === "google" ? "https://developers.google.com/identity/protocols/oauth2" :
                                                    id === "twitter" ? "https://developer.twitter.com/en/docs/authentication/oauth-2-0" :
                                                        id === "facebook" ? "https://developers.facebook.com/docs/facebook-login" : "#"
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline inline-flex items-center gap-0.5"
                                        >
                                            Learn how to set up
                                            <ExternalLink className="w-2 h-2" />
                                        </a>
                                    </p>
                                </div>

                                {id !== "email" && (
                                    <div className="space-y-4">

                                        <div className="grid gap-2">
                                            <Label htmlFor={`${id}-client-id`} className="text-xs">
                                                Client ID
                                            </Label>

                                            <Input
                                                id={`${id}-client-id`}
                                                placeholder={`Paste your ${buttonTitle} Client ID here`}
                                                value={data.clientId || ""}
                                                onChange={(e) =>
                                                    setProviders(prev => ({
                                                        ...prev,
                                                        [id]: {
                                                            ...prev[id],
                                                            clientId: e.target.value
                                                        }
                                                    }))
                                                }
                                                className="bg-white border-gray-200 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor={`${id}-client-secret`} className="text-xs">
                                                Client Secret
                                            </Label>

                                            <Input
                                                id={`${id}-client-secret`}
                                                type="password"
                                                placeholder={`Paste your ${buttonTitle} Client Secret here`}
                                                value={data.clientSecret || ""}
                                                onChange={(e) =>
                                                    setProviders(prev => ({
                                                        ...prev,
                                                        [id]: {
                                                            ...prev[id],
                                                            clientSecret: e.target.value
                                                        }
                                                    }))
                                                }
                                                className="bg-white border-gray-200 focus:ring-primary/20"
                                            />
                                        </div>

                                        {/* OAuth URLs Section */}
                                        <div className="space-y-4 pt-2">
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-gray-500">Authorised JavaScript origins</Label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        readOnly
                                                        value={projectMetadata?.deploymentUrl || `https://${projectMetadata?.subdomain || '...'}.falbor.xyz`}
                                                        className="bg-gray-50 border-gray-100 text-[11px] pr-10"
                                                    />
                                                    <button
                                                        onClick={() => handleCopy(projectMetadata?.deploymentUrl || `https://${projectMetadata?.subdomain || '...'}.falbor.xyz`, `${id}-origin`)}
                                                        className="absolute right-2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {copiedField === `${id}-origin` ? (
                                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="text-xs text-gray-500">Authorised redirect URI</Label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        readOnly
                                                        value={supabaseMetadata?.projectRef ? `https://${supabaseMetadata.projectRef}.supabase.co/auth/v1/callback` : "https://<supabase-project-id>.supabase.co/auth/v1/callback"}
                                                        className="bg-gray-50 border-gray-100 text-[11px] pr-10"
                                                    />
                                                    <button
                                                        onClick={() => handleCopy(supabaseMetadata?.projectRef ? `https://${supabaseMetadata.projectRef}.supabase.co/auth/v1/callback` : `https://<supabase-project-id>.supabase.co/auth/v1/callback`, `${id}-redirect`)}
                                                        className="absolute right-2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {copiedField === `${id}-redirect` ? (
                                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {id === "email" && (
                                    <div className="flex items-center gap-2 p-3 rounded-sm bg-[#e7e5df]/60 text-gray-700 text-xs">
                                        <ShieldCheck className="w-4 h-4" />
                                        Email/Password authentication is handled securely via Argon2 hashing.
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-2">

                                    <Button
                                        size="sm"
                                        className="h-7 rounded-sm gap-2 bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/25"
                                        onClick={() => handleSave(id)}
                                        disabled={saving === id}
                                    >
                                        {saving === id ? (
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : savedStatus[id] ? (
                                            <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                            <Save className="w-3 h-3" />
                                        )}

                                        {savedStatus[id] ? "Saved" : "Save"}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 rounded-sm gap-2 bg-white border text-gray-900 hover:bg-white"
                                        onClick={() => handleAdd(id)}
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add to Code
                                    </Button>

                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-4">
            <div>
                <h3 className="text-md text-gray-900 font-bold">Auth Providers</h3>
                <p className="text-[12px] text-gray-500 mb-4">
                    Set up authentication methods for your app and allow users to log in securely with their preferred provider.
                </p>

                <div className="bg-white border border-[#e5e7eb] rounded-md shadow-xs overflow-hidden w-full flex flex-col gap-2">
                    {renderSection(
                        "email",
                        "/icons/email.svg",
                        "Email",
                        "Enable Email / Password Sign in",
                        "Enables password-based sign in on your project."
                    )}

                    {renderSection(
                        "google",
                        "/icons/google.svg",
                        "Google",
                        "Enable Google Sign in",
                        "Enables sign in with Google in your project."
                    )}

                    {renderSection(
                        "twitter",
                        "/icons/twitter.svg",
                        "X (Twitter)",
                        "Enable X (Twitter) Sign in",
                        "Enables sign in with X (Twitter) in your project."
                    )}

                    {renderSection(
                        "facebook",
                        "/icons/facebook.svg",
                        "Facebook",
                        "Enable Facebook Sign in",
                        "Enables sign in with Facebook in your project."
                    )}
                </div>

                <div className="p-4 rounded-sm bg-[#e7e5df]/60 flex gap-3 mt-4">
                    <ShieldCheck className="w-5 h-5 text-gray-700 shrink-0 mt-2" />

                    <div>
                        <p className="text-[12px] text-gray-700">Security Note</p>

                        <p className="text-[11px] text-gray-700">
                            Your Client Secrets are encrypted at rest. We recommend using a different set of credentials for staging and production environments.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}