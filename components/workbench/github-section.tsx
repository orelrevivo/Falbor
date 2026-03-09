"use client"

import { useState, useEffect } from "react"
import { Github, Loader2, Plus, GitCommit, ExternalLink, Key, CheckCircle2, Lock } from "lucide-react"

interface GithubSectionProps {
    projectId: string
}

export function GithubSection({ projectId }: GithubSectionProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const [token, setToken] = useState("")
    const [connection, setConnection] = useState<any>(null)
    const [projectMetadata, setProjectMetadata] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Publishing form state
    const [isPublishing, setIsPublishing] = useState(false)
    const [repoName, setRepoName] = useState("")
    const [description, setDescription] = useState("Created with Falbor AI")
    const [isPrivate, setIsPrivate] = useState(false)

    // Push commit form state
    const [isPushing, setIsPushing] = useState(false)
    const [commitMessage, setCommitMessage] = useState("Update via Falbor AI")

    const fetchData = async () => {
        try {
            setLoading(true)
            const [connRes, projRes] = await Promise.all([
                fetch("/api/github/connection"),
                fetch(`/api/projects/${projectId}`)
            ])

            const connData = connRes.ok ? await connRes.json() : null
            setConnection(connData?.connected ? connData : null)

            const projData = projRes.ok ? await projRes.json() : null
            setProjectMetadata(projData)

            if (projData) {
                const defaultName = projData.title.toLowerCase().replace(/[^a-z0-9-]/g, "-") || `falbor-${projectId.slice(0, 5)}`
                setRepoName(defaultName)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [projectId])

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsConnecting(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch("/api/github/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to connect to GitHub")
            }

            setSuccess("Successfully connected to GitHub!")
            setToken("")
            fetchData()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect your GitHub account?")) return

        try {
            await fetch("/api/github/connection", { method: "DELETE" })
            setConnection(null)
        } catch (err) {
            console.error("Disconnect failed", err)
        }
    }

    const handlePublishNewRepo = async () => {
        setIsPublishing(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`/api/projects/${projectId}/git/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoName, description, isPrivate }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Failed to publish repository")
            }

            setSuccess("Successfully published project to GitHub!")
            fetchData()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsPublishing(false)
        }
    }

    const handlePushChanges = async () => {
        setIsPushing(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch(`/api/projects/${projectId}/git/push`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: commitMessage }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Failed to push changes")
            }

            setSuccess("Successfully pushed changes to GitHub branch!")
            setCommitMessage("Update via Falbor AI")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsPushing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    // Determine view state
    const isGithubClone = projectMetadata?.isGithubClone
    const isOwner = isGithubClone && connection?.username && projectMetadata?.githubOwner?.toLowerCase() === connection?.username?.toLowerCase()
    const canPushDirectly = isOwner || projectMetadata?.isGitAdopted

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h2 className="text-xl font-semibold mb-1">GitHub Integration</h2>
                <p className="text-sm text-gray-500">
                    Connect your GitHub account to publish projects, import repositories, and intuitively push your changes.
                </p>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="p-5 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md shadow-sm border">
                            <Github className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm">GitHub Connection</h3>
                            <p className="text-xs text-gray-500">
                                {connection ? `Connected as @${connection.username}` : "No account connected"}
                            </p>
                        </div>
                    </div>
                    {connection && (
                        <button
                            onClick={handleDisconnect}
                            className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            Disconnect
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {!connection ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md">
                                <p className="font-medium mb-1">To connect via Personal Access Token:</p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                                    <li>Go to GitHub Developer Settings {'>'} Personal Access Tokens {'>'} Tokens (classic)</li>
                                    <li>Generate a New Token (Classic or Fine-grained)</li>
                                    <li>Ensure it has <strong>repo</strong> permissions ticked</li>
                                    <li>Paste the token below</li>
                                </ol>
                            </div>

                            <form onSubmit={handleConnect} className="flex gap-2">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        placeholder="ghp_..."
                                        className="pl-9 w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isConnecting || !token}
                                    className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
                                >
                                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                                    Connect Account
                                </button>
                            </form>

                            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                GitHub account is connected gracefully.
                            </div>

                            {projectMetadata && (
                                <div className="border rounded-md p-5">
                                    <h4 className="font-medium text-sm border-b pb-3 mb-4">Project Repository Options</h4>

                                    {isGithubClone && canPushDirectly ? (
                                        /* 🚀 PUSH TO GITHUB VIEW */
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider">Connected Repository</span>
                                                <a
                                                    href={projectMetadata.githubUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium text-sm"
                                                >
                                                    {projectMetadata.githubOwner}/{projectMetadata.githubRepoName}
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>

                                            <div className="bg-[#f9f9f9] border p-4 rounded-md space-y-4">
                                                <p className="text-sm text-gray-700 font-medium">Push Changes to Repository</p>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-gray-500 relative bg-white px-1 -bottom-2 left-2 pb-0">Commit Message</label>
                                                    <textarea
                                                        value={commitMessage}
                                                        onChange={e => setCommitMessage(e.target.value)}
                                                        className="w-full border rounded-md px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0099ff] resize-none"
                                                        rows={2}
                                                        placeholder="What did you change?"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handlePushChanges}
                                                    disabled={isPushing || !commitMessage.trim()}
                                                    className="flex items-center gap-2 bg-[#0099ff] text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-[#0099ff]/90 disabled:opacity-50 transition-colors w-full justify-center"
                                                >
                                                    {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
                                                    Push Files to {projectMetadata.githubBranch || "main"}
                                                </button>
                                            </div>

                                            {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                                            {success && <p className="text-sm text-green-600 mt-2 text-center bg-green-50 p-2 rounded">{success}</p>}
                                        </div>
                                    ) : (
                                        /* 🔨 PUBLISH NEW (OR FORK) REPOSITORY VIEW */
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600">
                                                {!isGithubClone
                                                    ? "This project is not connected to any GitHub repository."
                                                    : "This project was cloned from an external repository that you do not own."}
                                                <br />
                                                Publish it directly to your GitHub account to enable Push functionality!
                                            </p>

                                            <div className="bg-[#f9f9f9] border p-4 rounded-md space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Repository Name</label>
                                                    <div className="flex bg-white border border-gray-200 rounded-md items-center pl-3">
                                                        <span className="text-sm text-gray-400 font-mono select-none">{connection.username}/</span>
                                                        <input
                                                            value={repoName}
                                                            onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                                                            className="w-full bg-transparent px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-0"
                                                            placeholder="project-name"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Description (optional)</label>
                                                    <input
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0099ff]"
                                                        placeholder="My amazing website"
                                                    />
                                                </div>

                                                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded border border-transparent hover:border-gray-100 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPrivate}
                                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                                        className="rounded border-gray-300 w-4 h-4"
                                                    />
                                                    <div className="flex items-center gap-1.5 flex-1">
                                                        {isPrivate ? <Lock className="w-3.5 h-3.5 text-gray-500" /> : <Github className="w-3.5 h-3.5 text-gray-500" />}
                                                        <span className="font-medium text-gray-700 select-none">Make this repository private</span>
                                                    </div>
                                                </label>

                                                <button
                                                    onClick={handlePublishNewRepo}
                                                    disabled={isPublishing || !repoName.trim()}
                                                    className="flex w-full justify-center items-center gap-2 bg-[#0099ff] text-white px-4 py-2.5 rounded-md font-medium text-sm hover:bg-[#0099ff]/90 disabled:opacity-50 transition-colors"
                                                >
                                                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                    Create Repository directly on GitHub
                                                </button>
                                            </div>

                                            {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                                            {success && <p className="text-sm text-green-600 mt-2 text-center bg-green-50 p-2 rounded">{success}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
