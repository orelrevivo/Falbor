"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Github, Loader2, HelpCircle, Lock, LayoutGrid, CheckCircle2, Link as LinkIcon } from "lucide-react"
import { useUser } from "@clerk/nextjs"

interface CreditsData {
  subscriptionTier: string
}

interface Repo {
  fullName: string
  name: string
  description: string | null
  private: boolean
  html_url: string
}

interface GithubCloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GithubCloneDialog({ open, onOpenChange }: GithubCloneDialogProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)

  // Github states
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [username, setUsername] = useState<string | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [cloningRepo, setCloningRepo] = useState<string | null>(null)

  const router = useRouter()
  const { user, isLoaded } = useUser()

  const fetchCredits = async () => {
    if (!user?.id) return
    try {
      const res = await fetch("/api/user/credits")
      if (!res.ok) throw new Error("Failed to fetch credits")
      const data: CreditsData = await res.json()
      setCreditsData(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Check connection and load repos
  const fetchGithubConnection = async () => {
    try {
      // First check direct GitHub connection
      const res = await fetch("/api/github/connection")
      if (res.ok) {
        const data = await res.json()
        if (data.connected) {
          setIsConnected(true)
          setUsername(data.username)
          loadRepositories()
          return
        }
      }

      // If no direct connection, check for MCP GitHub connection
      const mcpRes = await fetch("/api/mcp/connections")
      if (mcpRes.ok) {
        const mcpData = await mcpRes.json()
        const githubConnection = mcpData.connections?.find(
          (c: any) => c.name.toLowerCase() === 'github' && c.type === 'github'
        )

        if (githubConnection?.accessToken) {
          // Sync MCP GitHub connection with GitHub connection system
          try {
            const userRes = await fetch("https://api.github.com/user", {
              headers: {
                "Authorization": `Bearer ${githubConnection.accessToken}`,
                "Accept": "application/vnd.github.v3+json"
              }
            })

            if (userRes.ok) {
              const userData = await userRes.json()

              // Store in GitHub connection system
              await fetch("/api/github/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: githubConnection.accessToken,
                  username: userData.login,
                  fromMcp: true
                })
              })

              setIsConnected(true)
              setUsername(userData.login)
              loadRepositories()
            }
          } catch (err) {
            console.error("Failed to sync MCP GitHub connection:", err)
          }
        }
      }
    } catch (err) {
      console.error("Failed to check GH connection", err)
    }
  }

  const loadRepositories = async () => {
    setLoadingRepos(true)
    try {
      const res = await fetch("/api/github/repos")
      if (res.ok) {
        const { repos } = await res.json()
        setRepos(repos || [])
      }
    } catch (err) {
      console.error("Failed to load repos", err)
    } finally {
      setLoadingRepos(false)
    }
  }

  // Load credits early (for button + dialog)
  useEffect(() => {
    if (isLoaded && user?.id && !creditsData) {
      fetchCredits()
    }
  }, [isLoaded, user?.id])

  // Optional refresh when dialog opens
  useEffect(() => {
    if (open && isLoaded && user?.id) {
      setLoadingCredits(true)
      fetchCredits().finally(() => setLoadingCredits(false))
      fetchGithubConnection()
    }
  }, [open, isLoaded, user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || isLoading) return

    setError("")
    setIsLoading(true)

    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        setError("Invalid GitHub URL")
        return
      }

      const [, owner, repo] = match
      const cleanRepo = repo.replace(/\.git$/, "")

      const res = await fetch("/api/github/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo: cleanRepo, githubUrl: url }),
      })

      if (!res.ok) throw new Error("Clone failed")

      const { projectId } = await res.json()
      router.push(`/chat/${projectId}`)
      onOpenChange(false)
    } catch (err) {
      setError("Failed to clone repository")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloneRepo = async (repo: Repo) => {
    if (cloningRepo || isLoading) return

    setCloningRepo(repo.fullName)
    setError("")

    try {
      const [owner, repoName] = repo.fullName.split('/')
      const res = await fetch("/api/github/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          githubUrl: repo.html_url
        }),
      })

      if (!res.ok) {
        throw new Error("Clone failed")
      }

      const { projectId } = await res.json()
      router.push(`/chat/${projectId}`)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to clone repository")
    } finally {
      setCloningRepo(null)
    }
  }

  const hasSubscription = creditsData?.subscriptionTier !== "none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[60vh]">
        <DialogTitle className="sr-only">Clone GitHub Repository</DialogTitle>

        {/* HEADER — ONLY FOR SUBSCRIBED USERS */}
        {hasSubscription && (
          <div className="bg-[#0099ff]/10 rounded-t-md h-24 flex items-center justify-center shrink-0">
            <Github className="w-12 h-12 text-[#0099ff]" />
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* TITLE — ONLY FOR SUBSCRIBED USERS */}
          {hasSubscription && (
            <div className="text-center pt-4 shrink-0">
              <p className="text-black font-medium">
                Import from GitHub
              </p>
              <p className="text-black/70 text-sm">
                Paste a URL or select from your connected repositories
              </p>
            </div>
          )}

          {loadingCredits ? (
            <div className="p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-black/70" /></div>
          ) : !hasSubscription ? (
            /* 🔒 NO SUBSCRIPTION VIEW */
            <div className="text-center space-y-2 px-3 py-6">
              <p className="text-black">
                You don’t have a subscription
              </p>
              <p className="text-black/70 text-sm mt-[-14px]">
                Upgrade to unlock GitHub cloning
              </p>
              <Button
                className="w-full bg-[#c15f3c] hover:bg-[#c1603cdc]"
                onClick={() => {
                  onOpenChange(false)
                  router.push("/pricing")
                }}
              >
                Go to Pricing
              </Button>
            </div>
          ) : (
            /* ✅ FULL GITHUB CLONE UI */
            <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4 space-y-6">

              {/* URL Clone Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste public GitHub repository URL"
                  disabled={isLoading}
                  className="bg-[#f9f9f9] border-[#e0e0e0] text-black"
                />

                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="w-full bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff]/20 py-2 rounded-md font-medium text-sm transition-colors"
                >
                  {isLoading && !cloningRepo ? "Cloning..." : "Clone from URL"}
                </button>
                {error && !cloningRepo && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="flex gap-2 text-xs text-black/50 justify-center">
                  <LinkIcon className="w-3 h-3 mt-0.5" />
                  Paste any public github project URL to import
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">Or from your account</span>
                </div>
              </div>

              {/* Connected Repositories Section */}
              <div className="space-y-3">
                {!isConnected ? (
                  <div className="text-center bg-[#f9f9f9] border border-[#e0e0e0] rounded-md p-6">
                    <p className="text-sm text-black mb-2 font-medium">Connect your GitHub account</p>
                    <p className="text-xs text-gray-500 mb-4">Connect to seamlessly import your public and private repositories.</p>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        // Trigger setting sidebar redirect or open settings modal logic
                        // The user should go to the project settings but wait, we need a project ID to go to SettingsTab!
                        // If they don't have a project yet, we just tell them to use the settings in any project.
                        alert("To connect your GitHub account, open any project and go to Settings > GitHub.")
                      }}
                      className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black/90"
                    >
                      Connect in Settings
                    </button>
                  </div>
                ) : loadingRepos ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : repos.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 p-4">
                    No repositories found in @{username}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Repositories for @{username}</p>
                    <div className="border border-gray-100 rounded-md divide-y divide-gray-100 bg-[#f9f9f9]/50">
                      {repos.map((repo) => (
                        <div key={repo.fullName} className="p-3 flex items-center justify-between group hover:bg-white transition-colors">
                          <div className="min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-black truncate flex-1">{repo.name}</span>
                              {repo.private && <Lock className="w-3 h-3 text-gray-400 shrink-0" />}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{repo.description}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCloneRepo(repo)}
                            disabled={cloningRepo !== null || isLoading}
                            className="shrink-0 bg-white border border-gray-200 text-black px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                          >
                            {cloningRepo === repo.fullName ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Import"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {error && cloningRepo && <p className="text-red-500 text-sm text-center">{error}</p>}
              </div>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GithubClone() {
  const [open, setOpen] = useState(false)
  const { user, isLoaded } = useUser()
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetch("/api/user/credits")
        .then(res => res.json())
        .then((data: CreditsData) => {
          setHasSubscription(data.subscriptionTier !== "none")
        })
        .catch(() => { })
    }
  }, [isLoaded, user?.id])

  return (
    <div>
      {/* MAIN BUTTON */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 sm:flex text-sm font-medium cursor-pointer border py-1 px-4 rounded-4xl text-[#000000] items-center gap-2 w-full sm:w-auto"
      >
        <span className="flex items-center gap-2">
          <Github className="w-4 h-4" />
          <span className="text-sm font-light">Clone from GitHub</span>
        </span>

        {!hasSubscription && (
          <span className="flex items-center gap-1 text-xs font-medium bg-[#0099ff] ml-2 text-white px-2 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </button>

      {/* DIALOG */}
      <GithubCloneDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}