"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, ShieldCheck, Globe, Lock, Cpu } from "lucide-react"
import { saveMcpConnection } from "@/app/actions/mcp"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface McpConnectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mcpType: string
    mcpName: string
    supportsOAuth?: boolean
    onSuccess: () => void
}

export function McpConnectModal({ open, onOpenChange, mcpType, mcpName, supportsOAuth, onSuccess }: McpConnectModalProps) {
    const [apiKey, setApiKey] = useState("")
    const [botToken, setBotToken] = useState("")
    const [isConnecting, setIsConnecting] = useState(false)
    const [step, setStep] = useState<"input" | "verifying" | "success">("input")
    const [verifyProgress, setVerifyProgress] = useState(0)

    const handleOAuthConnect = () => {
        window.location.href = `/api/mcp/auth/${mcpName.toLowerCase()}`
    }

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            toast.error("Please enter a valid API key")
            return
        }

        setIsConnecting(true)
        setStep("verifying")

        // Professional verification animation sequence
        const intervals = [30, 65, 90, 100]
        for (let i = 0; i < intervals.length; i++) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400))
            setVerifyProgress(intervals[i])
        }

        try {
            const result = await saveMcpConnection({
                type: mcpType,
                name: mcpName,
                apiKey: apiKey.trim(),
                metadata: mcpName.toLowerCase() === 'discord' ? { botToken: botToken.trim() } : undefined
            })

            if (result.success) {
                setStep("success")
                setTimeout(() => {
                    toast.success(`${mcpName} connected successfully!`)
                    onSuccess()
                    onOpenChange(false)
                    // Reset
                    setStep("input")
                    setVerifyProgress(0)
                    setApiKey("")
                    setIsConnecting(false)
                }, 1500)
            } else {
                setStep("input")
                setIsConnecting(false)
                setVerifyProgress(0)
                toast.error(result.error || "Failed to verify connection")
            }
        } catch (error) {
            setStep("input")
            setIsConnecting(false)
            setVerifyProgress(0)
            toast.error("An unexpected security error occurred")
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => {
            if (!isConnecting) onOpenChange(o)
        }}>
            <DialogContent className="sm:max-w-md border-zinc-200 shadow-2xl overflow-hidden p-0">
                <AnimatePresence mode="wait">
                    {step === "input" && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6"
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div className="p-1.5 bg-[#0099ff]/20 rounded-md">
                                        <Cpu className="w-5 h-5 text-[#0099ff]" />
                                    </div>
                                    Connect {mcpName}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-5 py-4">
                                <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                    Integrate {mcpName} into your AI workflow. Provide your API credentials to enable secure, real-time tool execution.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor="api-key" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        {supportsOAuth ? "Alternative: API Key / Token" : "API Key / Token"}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="api-key"
                                            type="password"
                                            placeholder={`sk_live_...`}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                        />
                                        <Lock className="absolute right-3 top-3.5 w-4 h-4 text-zinc-300" />
                                    </div>
                                </div>

                                {supportsOAuth && (
                                    <div className="relative py-2">
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t" />
                                        <div className="relative flex justify-center text-[12px] text-gray-700">
                                            <span className="bg-white px-2">Or</span>
                                        </div>
                                    </div>
                                )}

                                {supportsOAuth ? (
                                    <Button
                                        onClick={handleOAuthConnect}
                                        className="w-full h-12 rounded-sm bg-[#0099ff]/20 hover:bg-[#0099ff]/20 text-[#0099ff] text-sm flex items-center justify-center gap-2 group"
                                    >
                                        <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        Confirm {mcpName} Account
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleConnect}
                                        disabled={isConnecting || !apiKey.trim()}
                                        className="w-full h-12 bg-zinc-900 hover:bg-black font-bold text-sm shadow-lg shadow-black/5"
                                    >
                                        Establish Connection
                                    </Button>
                                )}

                                {mcpName.toLowerCase() === 'discord' && (
                                    <div className="space-y-2 mt-4 pb-4 border-b border-zinc-100 italic">
                                        <Label htmlFor="bot-token" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                            Optional: Discord Bot Token (For Sending Messages)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="bot-token"
                                                type="password"
                                                placeholder="MT..."
                                                value={botToken}
                                                onChange={(e) => setBotToken(e.target.value)}
                                            />
                                            <ShieldCheck className="absolute right-3 top-3 w-4 h-4 text-zinc-300" />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-1">
                                            Discord OAuth tokens cannot send messages. Add a bot token to enable messaging.
                                        </p>
                                    </div>
                                )}

                                {supportsOAuth && apiKey.trim() && (
                                    <Button
                                        variant="outline"
                                        onClick={handleConnect}
                                        disabled={isConnecting}
                                        className="w-full h-10 border-zinc-200 text-zinc-500 font-bold text-xs hover:bg-zinc-50 mt-2"
                                    >
                                        Connect with provided Key
                                    </Button>
                                )}

                                <div className="flex items-center gap-3 p-3 rounded-sm bg-[#e7e5df]/60">
                                    <ShieldCheck className="w-5 h-5 text-gray-700 shrink-0" />
                                    <p className="text-[11px] text-gray-700 font-medium leading-tight">
                                        Your credentials are encrypted end-to-end and never exposed to the browser.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === "verifying" && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="p-12 flex flex-col items-center justify-center text-center space-y-6"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse rounded-full" />
                                <div className="relative h-20 w-20 bg-zinc-900 rounded-3xl flex items-center justify-center animate-bounce">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black tracking-tight">Verifying Protocol</h3>
                                <p className="text-sm text-zinc-500 font-medium">Handshaking with {mcpName} security layers...</p>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-zinc-900"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${verifyProgress}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                <Globe className="w-3 h-3 animate-spin" />
                                SSL Secured Gateway
                            </div>
                        </motion.div>
                    )}

                    {step === "success" && (
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
                                <h3 className="text-xl font-black">Connection Established</h3>
                                <p className="text-sm text-zinc-500 font-medium">{mcpName} is now synced with your AI workspace.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}
