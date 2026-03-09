"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Loader2, Check, ShieldCheck, Bot, User, CheckCircle2, ExternalLink, Lock
} from "lucide-react"
import { saveBotToken } from "@/app/actions/mcp"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface DiscordConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connection: any  // The existing connection record from DB
    onSuccess: () => void
}

export function DiscordConfigModal({ open, onOpenChange, connection, onSuccess }: DiscordConfigModalProps) {
    const existingBotToken = (connection?.metadata as any)?.botToken || ""
    const [botToken, setBotToken] = useState(existingBotToken)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const hasBotToken = !!existingBotToken

    const handleSave = async () => {
        if (!botToken.trim()) {
            toast.error("Please enter a valid Bot Token")
            return
        }
        setIsSaving(true)
        try {
            const result = await saveBotToken(connection.id, botToken.trim())
            if (result.success) {
                setSaved(true)
                toast.success("Bot Token saved successfully!")
                setTimeout(() => {
                    onSuccess()
                    onOpenChange(false)
                    setSaved(false)
                }, 1500)
            } else {
                toast.error(result.error || "Failed to save token")
            }
        } catch {
            toast.error("An unexpected error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    const username = (connection?.metadata as any)?.username || "Discord User"
    const uid = (connection?.metadata as any)?.id || ""

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!isSaving) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-md border-zinc-200 shadow-2xl overflow-hidden p-0">
                <AnimatePresence mode="wait">
                    {saved ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-12 flex flex-col items-center justify-center text-center space-y-6"
                        >
                            <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                                <Check className="w-10 h-10 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black">Bot Token Saved</h3>
                                <p className="text-sm text-zinc-500 font-medium">Discord messaging is now fully enabled.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="config"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6"
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div className="p-1.5 bg-[#5865F2]/15 rounded-md">
                                        <img
                                            src="https://static.vecteezy.com/system/resources/previews/019/493/250/non_2x/discord-logo-discord-icon-discord-symbol-free-free-vector.jpg"
                                            className="w-5 h-5 rounded"
                                            alt="Discord"
                                        />
                                    </div>
                                    Discord Configuration
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5 py-4">

                                {/* Connection Status */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Connected Account</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <User className="w-3 h-3 text-emerald-600" />
                                            <span className="text-sm font-semibold text-emerald-800 truncate">@{username}</span>
                                            {uid && (
                                                <span className="text-[10px] text-emerald-500 font-mono">({uid})</span>
                                            )}
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase tracking-widest">
                                        OAuth Active
                                    </Badge>
                                </div>

                                {/* Bot Token Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">
                                            Discord Bot Token
                                        </Label>
                                        {hasBotToken && (
                                            <Badge className="bg-[#5865F2]/10 text-[#5865F2] border-none text-[9px] font-black uppercase tracking-widest gap-1">
                                                <Bot className="w-2.5 h-2.5" />
                                                Bot Connected
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-700 leading-relaxed">
                                        <strong>Why a Bot Token?</strong> Discord's OAuth only allows reading your account info.
                                        To <strong>send messages</strong>, you need a Bot Token from the{" "}
                                        <a
                                            href="https://discord.com/developers/applications"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline font-bold inline-flex items-center gap-0.5"
                                        >
                                            Discord Developer Portal <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                        . Your bot must be a member of the server you want to message.
                                    </div>

                                    <div className="relative">
                                        <Input
                                            id="discord-bot-token"
                                            type="password"
                                            placeholder={hasBotToken ? "••••••••••• (token saved)" : "MT..."}
                                            value={botToken}
                                            onChange={(e) => setBotToken(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                            className="pr-10"
                                        />
                                        <Lock className="absolute right-3 top-3.5 w-4 h-4 text-zinc-300" />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || !botToken.trim()}
                                    className="w-full h-11 bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] text-sm"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Bot className="w-4 h-4 mr-2" />
                                            {hasBotToken ? "Update Bot Token" : "Save Bot Token"}
                                        </>
                                    )}
                                </Button>

                                <div className="flex items-center gap-3 p-3 rounded-sm bg-[#e7e5df]/60">
                                    <ShieldCheck className="w-5 h-5 text-gray-700 shrink-0" />
                                    <p className="text-[11px] text-gray-700 font-medium leading-tight">
                                        Your bot token is encrypted at rest and never exposed in the browser or AI responses.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}
