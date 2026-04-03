"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Github, GitBranch, Key, Globe, Loader2, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface GitConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connection?: any
    onSuccess: () => void
}

export function GitConfigModal({ open, onOpenChange, connection, onSuccess }: GitConfigModalProps) {
    const [repoUrl, setRepoUrl] = useState("")
    const [token, setToken] = useState("")
    const [isConnecting, setIsConnecting] = useState(false)
    const [step, setStep] = useState<"input" | "verifying" | "success">("input")
    const [verifyProgress, setVerifyProgress] = useState(0)

    const handleOAuthConnect = () => {
        // Redirect to GitHub OAuth for Git Clone MCP
        window.location.href = `/api/mcp/auth/github?source=git-clone`
    }

    const handleConnectWithToken = async () => {
        if (!token.trim()) {
            toast.error("Please enter a valid Git token")
            return
        }

        setIsConnecting(true)
        setStep("verifying")

        // Verification animation sequence
        const intervals = [30, 65, 90, 100]
        for (let i = 0; i < intervals.length; i++) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400))
            setVerifyProgress(intervals[i])
        }

        try {
            // Verify the token by calling GitHub API
            const res = await fetch("https://api.github.com/user", {
                headers: {
                    "Authorization": `Bearer ${token.trim()}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            })

            if (!res.ok) {
                throw new Error("Invalid token")
            }

            const userData = await res.json()

            // Save the connection via API
            const saveRes = await fetch("/api/mcp/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Git Clone",
                    type: "git",
                    accessToken: token.trim(),
                    metadata: {
                        username: userData.login,
                        fromToken: true
                    }
                })
            })

            if (!saveRes.ok) {
                throw new Error("Failed to save connection")
            }

            // Also sync with GitHub connection system
            await fetch("/api/github/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: token.trim(),
                    username: userData.login,
                    fromMcp: true
                })
            })

            setStep("success")
            setTimeout(() => {
                toast.success("Git Clone connected successfully!")
                onSuccess()
                onOpenChange(false)
                // Reset
                setStep("input")
                setVerifyProgress(0)
                setToken("")
                setIsConnecting(false)
            }, 1500)
        } catch (error) {
            setStep("input")
            setIsConnecting(false)
            setVerifyProgress(0)
            toast.error("Failed to verify token. Please check your credentials.")
        }
    }

    const handleCloneRepo = async () => {
        if (!repoUrl.trim()) {
            toast.error("Please enter a repository URL")
            return
        }

        // Validate GitHub URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
        if (!match) {
            toast.error("Invalid GitHub URL. Please use format: https://github.com/owner/repo")
            return
        }

        const [, owner, repo] = match
        const cleanRepo = repo.replace(/\.git$/, "")

        try {
            const res = await fetch("/api/github/clone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo: cleanRepo,
                    githubUrl: repoUrl
                })
            })

            if (!res.ok) {
                throw new Error("Clone failed")
            }

            const { projectId } = await res.json()
            toast.success("Repository cloned successfully!")
            
            // Redirect to the new project
            window.location.href = `/chat/${projectId}`
        } catch (error) {
            toast.error("Failed to clone repository. Please check the URL and your permissions.")
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
                                    <div className="p-1.5 bg-orange-500/20 rounded-md">
                                        <GitBranch className="w-5 h-5 text-orange-600" />
                                    </div>
                                    Connect Git Clone
                                </DialogTitle>
                                <DialogDescription className="text-sm text-zinc-500">
                                    Clone and import Git repositories directly into your projects.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5 py-4">
                                {/* OAuth Option */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        Connect with GitHub Account
                                    </Label>
                                    <Button
                                        onClick={handleOAuthConnect}
                                        className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-black text-white text-sm flex items-center justify-center gap-2 group"
                                    >
                                        <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        Connect GitHub Account
                                    </Button>
                                    <p className="text-[10px] text-zinc-400">
                                        Secure OAuth connection with your GitHub account
                                    </p>
                                </div>

                                <div className="relative py-2">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t" />
                                    <div className="relative flex justify-center text-[12px] text-gray-700">
                                        <span className="bg-white px-2">Or</span>
                                    </div>
                                </div>

                                {/* Token Option */}
                                <div className="space-y-2">
                                    <Label htmlFor="git-token" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        Personal Access Token
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="git-token"
                                            type="password"
                                            placeholder="ghp_... or github_pat_..."
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            className="pr-10"
                                        />
                                        <Key className="absolute right-3 top-3.5 w-4 h-4 text-zinc-300" />
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        Create a token in your{" "}
                                        <a
                                            href="https://github.com/settings/tokens"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#0099ff] hover:underline inline-flex items-center gap-0.5"
                                        >
                                            GitHub Settings
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </p>
                                </div>

                                {token.trim() && (
                                    <Button
                                        onClick={handleConnectWithToken}
                                        disabled={isConnecting}
                                        className="w-full h-10 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] font-bold text-sm"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Verifying...
                                            </>
                                        ) : (
                                            "Connect with Token"
                                        )}
                                    </Button>
                                )}

                                {/* Repository URL Input (shown when connected) */}
                                {connection && (
                                    <div className="space-y-2 pt-4 border-t border-zinc-100">
                                        <Label htmlFor="repo-url" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                            Clone Repository
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="repo-url"
                                                placeholder="https://github.com/owner/repo"
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                className="pr-10"
                                            />
                                            <GitBranch className="absolute right-3 top-3.5 w-4 h-4 text-zinc-300" />
                                        </div>
                                        <Button
                                            onClick={handleCloneRepo}
                                            disabled={!repoUrl.trim()}
                                            className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm"
                                        >
                                            <GitBranch className="w-4 h-4 mr-2" />
                                            Clone Repository
                                        </Button>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 p-3 rounded-sm bg-[#e7e5df]/60">
                                    <Globe className="w-5 h-5 text-gray-700 shrink-0" />
                                    <p className="text-[11px] text-gray-700 font-medium leading-tight">
                                        Your credentials are encrypted and stored securely. We only access repositories you specify.
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
                                <div className="absolute inset-0 bg-orange-500/20 blur-2xl animate-pulse rounded-full" />
                                <div className="relative h-20 w-20 bg-zinc-900 rounded-3xl flex items-center justify-center animate-bounce">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black tracking-tight">Verifying Git Access</h3>
                                <p className="text-sm text-zinc-500 font-medium">Connecting to GitHub...</p>
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
                                SSL Secured Connection
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
                                <p className="text-sm text-zinc-500 font-medium">Git Clone is now ready to use.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}

