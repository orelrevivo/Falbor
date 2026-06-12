"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Bot,
  Sparkles,
  Code2,
  Users,
  Database,
  Terminal,
  Cpu,
  Key,
  Upload,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  Globe,
  Wrench,
  Search,
  Image,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  status: string
  currentStep: string
  config?: any
}

const PREBUILT_AVATARS = [
  { icon: Bot, label: "Assistant", color: "from-blue-500 to-indigo-500", name: "bot" },
  { icon: Sparkles, label: "Creative", color: "from-amber-500 to-orange-500", name: "sparkles" },
  { icon: Code2, label: "Developer", color: "from-emerald-500 to-teal-500", name: "code" },
  { icon: Users, label: "Collaborator", color: "from-purple-500 to-pink-500", name: "users" },
  { icon: Database, label: "Analyst", color: "from-cyan-500 to-blue-500", name: "database" },
  { icon: Terminal, label: "Engineer", color: "from-rose-500 to-red-500", name: "terminal" },
  { icon: Cpu, label: "Brain", color: "from-violet-500 to-purple-500", name: "cpu" },
  { icon: Key, label: "Security", color: "from-yellow-500 to-amber-600", name: "key" },
]

export default function AgentCreatePage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [agentId, setAgentId] = useState(id)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [avatarType, setAvatarType] = useState<"icon" | "image">("icon")
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState("bot")
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null)

  // Prompts & Starters
  const [instructions, setInstructions] = useState(
    "Think step-by-step and show reasoning for complex problems. Use specific examples. Emphasize action items, and leave placeholders when information is missing. Use a polite, enthusiastic tone."
  )
  const [starters, setStarters] = useState<string[]>([
    "Build a production-ready SaaS landing page in React with Tailwind CSS.",
    "Create a polished e-commerce product page with an interactive gallery.",
    "",
    ""
  ])

  // Capabilities
  const [webSearch, setWebSearch] = useState(true)
  const [openUrl, setOpenUrl] = useState(true)
  const [imageGen, setImageGen] = useState(false)
  const [codeInterpreter, setCodeInterpreter] = useState(true)
  const [codingAgent, setCodingAgent] = useState(false)

  // Knowledge base
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string }[]>([])

  // Advanced settings
  const [overwritePrompt, setOverwritePrompt] = useState(false)
  const [reminders, setReminders] = useState("")
  const [defaultModel, setDefaultModel] = useState("gpt-4o")
  const [gameImageProvider, setGameImageProvider] = useState<"openai" | "stability">("openai")
  const [gameImageModel, setGameImageModel] = useState("gpt-image-1")

  useEffect(() => {
    if (id) {
      setAgentId(id)
      fetchAgent()
    }
  }, [id])

  const applyConfig = (c: any) => {
    if (c.description) setDescription(c.description)
    if (c.avatar) {
      setAvatarType(c.avatar.type || "icon")
      setSelectedAvatarIcon(c.avatar.icon || "bot")
      setUploadedImageBase64(c.avatar.image || null)
    }
    if (c.instructions) setInstructions(c.instructions)
    if (c.starterMessages) {
      const msgs = [...c.starterMessages]
      while (msgs.length < 4) msgs.push("")
      setStarters(msgs.slice(0, 4))
    }
    if (c.knowledgeEnabled !== undefined) setKnowledgeEnabled(c.knowledgeEnabled)
    if (c.knowledgeFiles) setAttachedFiles(c.knowledgeFiles)
    if (c.capabilities) {
      setWebSearch(!!c.capabilities.webSearch)
      setOpenUrl(!!c.capabilities.openUrl)
      setImageGen(!!c.capabilities.imageGen)
      setCodeInterpreter(!!c.capabilities.codeInterpreter)
      setCodingAgent(!!c.capabilities.codingAgent)
    }
    if (c.advanced) {
      setOverwritePrompt(!!c.advanced.overwritePrompt)
      setReminders(c.advanced.reminders || "")
      setDefaultModel(c.advanced.defaultModel || "gpt-4o")
    }
    if (c.games) {
      if (c.games.imageProvider === "stability" || c.games.imageProvider === "openai") {
        setGameImageProvider(c.games.imageProvider)
      }
      if (typeof c.games.imageModel === "string" && c.games.imageModel.trim()) {
        setGameImageModel(c.games.imageModel.trim())
      }
    }
  }

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${id}`)

      if (!res.ok) {
        console.log("Agent not found for ID, attempting auto-recovery...")

        // 1. Fetch all agents for this user
        const listRes = await fetch("/api/agents")
        if (listRes.ok) {
          const listData = await listRes.json()
          const userAgents = listData.agents || []

          // 2. Find any in_progress agent
          const inProgress = userAgents.find((a: any) => a.status === "in_progress")
          if (inProgress) {
            toast.success("Resuming your in-progress agent setup...")
            setAgentId(inProgress.id)
            router.replace(`/agents/${inProgress.id}/create`)
            setName(inProgress.name || "")
            if (inProgress.config) {
              applyConfig(inProgress.config)
            }
            return
          }
        }

        // 3. If no in-progress agent exists, auto-create a brand new one!
        toast.info("Initializing a new builder agent...")
        const createRes = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Builder Agent #${Math.floor(1000 + Math.random() * 9000)}`,
            description: "Autonomous website development agent"
          })
        })

        if (createRes.ok) {
          const createData = await createRes.json()
          const newAg = createData.agent
          setAgentId(newAg.id)
          router.replace(`/agents/${newAg.id}/create`)
          setName(newAg.name || "")
          return
        }

        throw new Error("Agent not found and auto-creation failed")
      }

      const data = await res.json()
      const ag = data.agent as Agent
      setName(ag.name || "")
      if (ag.config) {
        applyConfig(ag.config)
      }
    } catch (error) {
      console.error(error)
      toast.error("Could not retrieve or initialize agent setup.")
      router.push("/agents")
    } finally {
      setLoading(false)
    }
  }

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImageBase64(reader.result as string)
      setAvatarType("image")
      toast.success("Avatar image uploaded successfully!")
    }
    reader.readAsDataURL(file)
  }

  // Simulated File Upload for Knowledge Base
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newAttached = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB"
    }))

    setAttachedFiles(prev => [...prev, ...newAttached])
    toast.success(`${files.length} document(s) added to knowledge base!`)
  }

  // Save Agent state
  const handleSaveAgent = async (activate = false) => {
    if (!name.trim()) {
      toast.error("Please enter a name for your agent.")
      return
    }

    setSaving(true)
    try {
      const filteredStarters = starters.filter(s => s.trim() !== "")
      const configPayload = {
        description,
        avatar: {
          type: avatarType,
          icon: selectedAvatarIcon,
          image: uploadedImageBase64
        },
        instructions,
        starterMessages: filteredStarters,
        knowledgeEnabled,
        knowledgeFiles: attachedFiles,
        capabilities: {
          webSearch,
          openUrl,
          imageGen,
          codeInterpreter,
          codingAgent
        },
        advanced: {
          overwritePrompt,
          reminders,
          defaultModel
        },
        games: {
          imageProvider: gameImageProvider,
          imageModel: gameImageModel
        }
      }

      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status: activate ? "completed" : "in_progress",
          currentStep: activate ? "completed" : "step_1",
          config: configPayload
        })
      })

      if (!res.ok) throw new Error("Failed to save agent configuration")

      if (activate) {
        toast.success("Agent activated and locked in successfully!")
        setTimeout(() => {
          router.push("/projects")
        }, 1000)
      } else {
        toast.success("Configuration progress saved!")
        router.push("/agents")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to save configuration. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const renderAvatarPreview = (size = "h-20 w-20") => {
    if (avatarType === "image" && uploadedImageBase64) {
      return (
        <img
          src={uploadedImageBase64}
          alt="custom avatar"
          className={cn("rounded-md object-cover border border-zinc-200 shadow-sm", size)}
        />
      )
    }

    const prebuilt = PREBUILT_AVATARS.find(a => a.name === selectedAvatarIcon) || PREBUILT_AVATARS[0]
    const IconComp = prebuilt.icon

    return (
      <div className={cn("rounded-md flex items-center justify-center bg-gradient-to-tr text-white shadow-sm border border-white/10", prebuilt.color, size)}>
        <IconComp className="h-1/2 w-1/2" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0099ff] mb-4" />
        <p className="text-zinc-500 text-sm font-medium">Loading agent setup session...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">

      {/* Sticky top header */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <button
            onClick={() => router.push("/agents")}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Agents
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveAgent(false)}
              disabled={saving}
              className="h-8 text-xs font-semibold rounded-md border-zinc-250 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveAgent(true)}
              disabled={saving}
              className="h-8 text-xs font-semibold rounded-md bg-[#0099ff] hover:bg-[#0099ff]/90 text-white cursor-pointer flex items-center gap-1 shadow-xs"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-0.5" />}
              Save & Activate
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Container (No parent Card wrapper, flows naturally with page scroll) */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-6 flex flex-col">

        {/* Main 2-column Split Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 pt-2 pb-4">

          {/* LEFT COLUMN: Setup Configuration Panels (3/5 Width) */}
          <div className="lg:col-span-3 space-y-5">

            {/* PANEL 1: General Details */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-3.5">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                General Settings
              </h2>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Agent Name</label>
                  <Input
                    placeholder="e.g. Falbor Builder Agent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  />
                  <p className="text-[9px] text-zinc-400">Give your builder agent a name for selection listing.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Short Description</label>
                  <Input
                    placeholder="What is this builder agent specialized in?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  />
                  <p className="text-[9px] text-zinc-400">A quick summary of this agent's core capability.</p>
                </div>
              </div>
            </div>

            {/* PANEL 2: Prompts & Conversation Starters */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                Instructions & Prompts
              </h2>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Instructions (System Prompt)</label>
                <Textarea
                  rows={3}
                  placeholder="Add custom system instructions to tailor responses..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="bg-white border-zinc-250 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none leading-relaxed"
                />
                <p className="text-[9px] text-zinc-400">These guide how the agent approaches tasks, solves errors, and communicates.</p>
              </div>

              <div className="space-y-2.5 pt-2.5 border-t border-zinc-100">
                <div>
                  <h3 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Conversation Starters</h3>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Quick-action example prompts to instantly trigger chat generations.</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-zinc-400 w-16">Starter {i + 1}</span>
                      <input
                        type="text"
                        placeholder={i === 0 ? "e.g. Build a SaaS landing page..." : "Optional prompt..."}
                        value={starters[i] || ""}
                        onChange={(e) => {
                          const next = [...starters]
                          next[i] = e.target.value
                          setStarters(next)
                        }}
                        className="flex-1 h-7.5 px-3 text-xs rounded-md border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PANEL 3: Capabilities (Actions) */}
            <div className="relative">
              {/* Blurred / disabled overlay */}
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md backdrop-blur-[5px] bg-white/40 border border-white/20">
                <span className="text-sm font-semibold text-zinc-700 tracking-wide">
                  Capabilities & Actions Coming Soon
                </span>
              </div>

              {/* Content */}
              <div className="pointer-events-none select-none opacity-80 bg-white/70 border border-zinc-200 rounded-md p-4 shadow-xs space-y-3.5">
                <h2 className="text-xs z-10 font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                  Capabilities & Actions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Web Search */}
                  <div className="flex items-center justify-between p-2.5 bg-white/80 border border-zinc-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-blue-50 flex items-center justify-center text-[#0099ff]">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-800">Web Search</h4>
                        <p className="text-[9px] text-zinc-400">Search online for info.</p>
                      </div>
                    </div>
                    <Switch checked={webSearch} onCheckedChange={setWebSearch} />
                  </div>

                  {/* Fetch URLs */}
                  <div className="flex items-center justify-between p-2.5 bg-white/80 border border-zinc-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-purple-50 flex items-center justify-center text-purple-600">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-800">Fetch URLs</h4>
                        <p className="text-[9px] text-zinc-400">Fetch website contents.</p>
                      </div>
                    </div>
                    <Switch checked={openUrl} onCheckedChange={setOpenUrl} />
                  </div>

                  {/* Image Gen */}
                  <div className="flex items-center justify-between p-2.5 bg-white/80 border border-zinc-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600">
                        <Image className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-800">Image Generation</h4>
                        <p className="text-[9px] text-zinc-400">Synthesize visual assets.</p>
                      </div>
                    </div>
                    <Switch checked={imageGen} onCheckedChange={setImageGen} />
                  </div>

                  {/* Code Interpreter */}
                  <div className="flex items-center justify-between p-2.5 bg-white/80 border border-zinc-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-800">Code Sandbox</h4>
                        <p className="text-[9px] text-zinc-400">Run code & process data.</p>
                      </div>
                    </div>
                    <Switch checked={codeInterpreter} onCheckedChange={setCodeInterpreter} />
                  </div>

                  {/* Coding Agent */}
                  <div className="flex items-center justify-between p-2.5 bg-white/80 border border-zinc-200 rounded-md md:col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-rose-50 flex items-center justify-center text-rose-600">
                        <Code2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-800">Deep GitHub Analytics</h4>
                        <p className="text-[9px] text-zinc-400">Analyze repositories and structure code.</p>
                      </div>
                    </div>
                    <Switch checked={codingAgent} onCheckedChange={setCodingAgent} />
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 4: Knowledge base */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Agent Knowledge Base</h3>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Attach local references, manuals, or structured datasets.</p>
                </div>
                <Switch checked={knowledgeEnabled} onCheckedChange={setKnowledgeEnabled} />
              </div>

              {knowledgeEnabled && (
                <div className="space-y-2.5 pt-2.5 border-t border-zinc-100">
                  <div className="space-y-1">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-200 rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-[#0099ff] shrink-0" />
                          <span className="text-xs font-semibold text-zinc-700 truncate">{file.name}</span>
                          <span className="text-[9px] text-zinc-400 font-mono">({file.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-zinc-100 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {attachedFiles.length === 0 && (
                      <div className="text-center py-5 border border-dashed border-zinc-200 rounded-md text-zinc-400 text-xs bg-zinc-50/50">
                        No reference documents uploaded yet.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <input
                      type="file"
                      multiple
                      id="kb-file-uploader"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("kb-file-uploader")?.click()}
                      className="h-7.5 text-xs font-semibold rounded-md border-zinc-200 bg-white text-zinc-650 shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 w-3" />
                      Upload Files
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* PANEL 5: Advanced & Tuning */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                Advanced Configurations
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Model Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Default Model</label>
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="bg-white border border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer text-zinc-750 font-medium"
                  >
                    <option value="gpt-4o">GPT-4 Omni (Latest OpenAI Model)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI Engine)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast OpenAI Model)</option>
                    <option value="o1-mini">OpenAI o1-mini (Reasoning Model)</option>
                    <option value="o1-preview">OpenAI o1-preview (Reasoning Model)</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">Specifies the LLM engine to back this agent.</p>
                </div>

                {/* Overwrite Toggle */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Overwrite Base Prompt</label>
                  <div className="flex items-center justify-between p-2 bg-white border border-zinc-250 rounded-md h-8.5">
                    <span className="text-xs text-zinc-550">Ignore format rules</span>
                    <Switch checked={overwritePrompt} onCheckedChange={setOverwritePrompt} />
                  </div>
                  <p className="text-[9px] text-zinc-400">Not recommended. Removes base formatting controls.</p>
                </div>

                {/* Task Reminders */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Prompt Reminders (Append prompt)</label>
                  <Input
                    placeholder="e.g. Always format your responses in neat sections..."
                    value={reminders}
                    onChange={(e) => setReminders(e.target.value)}
                    className="bg-white border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  />
                  <p className="text-[9px] text-zinc-400">Appended to prompt sequences to enforce strict formatting advancing in conversation.</p>
                </div>
              </div>
            </div>

            {/* PANEL 6: Creating Games */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                Creating Games
              </h2>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Used only when the user enables <span className="font-semibold">Game Maker (2D)</span> inside chat. The chat/code model still uses your Agent&apos;s Default Model, but the asset step uses this image model first.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Image Provider</label>
                  <select
                    value={gameImageProvider}
                    onChange={(e) => setGameImageProvider(e.target.value as any)}
                    className="bg-white border border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer text-zinc-750 font-medium"
                  >
                    <option value="openai">OpenAI Images API</option>
                    <option value="stability">Stability (stable-image core)</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">Controls which image generator runs before game code generation.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Image Model</label>
                  <select
                    value={gameImageModel}
                    onChange={(e) => setGameImageModel(e.target.value)}
                    className="bg-white border border-zinc-250 rounded-md px-3 h-8.5 text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer text-zinc-750 font-medium"
                  >
                    <option value="gpt-image-1">gpt-image-1 (Recommended)</option>
                    <option value="gpt-image-1-mini">gpt-image-1-mini (Faster)</option>
                    <option value="chatgpt-image-latest">chatgpt-image-latest</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">If provider is Stability, this is ignored (uses stable-image core).</p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Avatar Selector & Premium Preview Card (2/5 Width) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Live Preview Card */}
            <div className="border border-zinc-200 rounded-md p-4 bg-zinc-900 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0099ff]/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

              <span className="text-[9px] font-bold tracking-widest text-[#0099ff] bg-[#0099ff]/15 px-2 py-0.5 rounded-full border border-[#0099ff]/20 uppercase">
                Live Preview Card
              </span>

              <div className="flex items-start gap-3 mt-3">
                {renderAvatarPreview("h-12 w-12 shrink-0")}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-extrabold truncate text-white">{name || "Unnamed Agent"}</h4>
                  <p className="text-[9px] text-zinc-400 mt-0.5 line-clamp-2 italic font-light">
                    {description || "No description provided yet."}
                  </p>

                  {/* Capabilities badges */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {webSearch && <span className="text-[8px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1 py-0.1 rounded font-semibold">Web Search</span>}
                    {openUrl && <span className="text-[8px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1 py-0.1 rounded font-semibold">URLs</span>}
                    {imageGen && <span className="text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1 py-0.1 rounded font-semibold">Image Gen</span>}
                    {codeInterpreter && <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 py-0.1 rounded font-semibold">Sandbox</span>}
                    {codingAgent && <span className="text-[8px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1 py-0.1 rounded font-semibold">GitHub Analytics</span>}
                    {knowledgeEnabled && attachedFiles.length > 0 && <span className="text-[8px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1 py-0.1 rounded font-semibold">Knowledge: {attachedFiles.length} doc(s)</span>}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[8px] text-zinc-500 font-mono">
                    <span>DEFAULT ENGINE: {defaultModel.toUpperCase()}</span>
                    <span>COMPILED AGENT 1.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Avatar Upload & Pre-built Presets Card */}
            <div className="bg-white border border-zinc-200 rounded-md p-4 shadow-xs space-y-3.5">
              <div>
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Choose Avatar Icon</h3>
                <p className="text-[9px] text-zinc-400 mt-0.5">Select a vibrant color preset or upload a custom brand image.</p>
              </div>

              <div className="flex items-center gap-3">
                {renderAvatarPreview("h-11 w-11")}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7.5 px-3 text-xs font-semibold rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors shadow-xs cursor-pointer"
                  >
                    Upload Custom Image
                  </button>
                </div>
              </div>

              {/* Prebuilt grid */}
              <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-zinc-100">
                {PREBUILT_AVATARS.map((item) => {
                  const IconComp = item.icon
                  const isSelected = avatarType === "icon" && selectedAvatarIcon === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarIcon(item.name)
                        setAvatarType("icon")
                      }}
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center p-1 border transition-all cursor-pointer",
                        isSelected
                          ? "bg-white border-[#0099ff] shadow-sm ring-1 ring-[#0099ff]/20 scale-105"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      <div className={cn("w-5.5 h-5.5 rounded-sm flex items-center justify-center text-white bg-gradient-to-tr mb-0.5", item.color)}>
                        <IconComp className="w-3 h-3" />
                      </div>
                      <span className="text-[7.5px] font-bold text-zinc-500 truncate w-full text-center">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
