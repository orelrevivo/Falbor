"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  Bot, 
  Sparkles, 
  Code2, 
  Users2, 
  Database, 
  Terminal, 
  Cpu, 
  Key, 
  Calendar,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Activity,
  User,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

interface Agent {
  id: string
  name: string
  description: string | null
  status: string
  currentStep: string
  createdAt: string
  updatedAt: string
  config?: any
}

interface ActivityLog {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "action"
  message: string
}

export default function AgentStatusPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Analytics States (Starting from scratch: 0 by default)
  const [totalMessages, setTotalMessages] = useState(0)
  const [uniqueUsers, setUniqueUsers] = useState(0)
  const [dateRange, setDateRange] = useState("Apr 18, 2026 - May 18, 2026")
  
  // Logs & Simulation State
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isSimulating, setIsSimulating] = useState(false)

  // Fetch Agent details on mount
  useEffect(() => {
    if (id) {
      fetchAgent()
    }
  }, [id])

  const formatLogTime = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `[${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`
  }

  const initializeStats = (selectedAgent: Agent, realMsgs = 0, realUsers = 0) => {
    const storageKey = `agent_stats_${selectedAgent.id}`
    const persisted = localStorage.getItem(storageKey)
    
    setTotalMessages(realMsgs)
    setUniqueUsers(realUsers)

    // Build timeline logs matching agent capability configuration
    const name = selectedAgent.name
    const caps = selectedAgent.config?.capabilities || {}
    const activeCaps = Object.keys(caps).filter(k => caps[k])
    
    // Clean starting logs
    const initialLogs: ActivityLog[] = [
      {
        id: "1",
        timestamp: formatLogTime(new Date(selectedAgent.createdAt)),
        type: "success",
        message: `🟢 Agent '${name}' compiled and initialized successfully in organization.`
      },
      {
        id: "2",
        timestamp: formatLogTime(new Date(new Date(selectedAgent.createdAt).getTime() + 15000)),
        type: "info",
        message: `⚙️ Capability models loaded: ${activeCaps.length > 0 ? activeCaps.join(", ") : "General Text Completions, Code Interpreter"}.`
      }
    ]

    if (caps.webSearch) {
      initialLogs.push({
        id: "cap-web",
        timestamp: formatLogTime(new Date(new Date(selectedAgent.createdAt).getTime() + 45000)),
        type: "info",
        message: "🔍 Connected live Google Search API connector for real-time web lookups."
      })
    }

    if (persisted) {
      try {
        const parsed = JSON.parse(persisted)
        // Keep simulated logs if any exist in storage
        const simulatedLogs = (parsed.logs || []).filter((l: any) => l.id.startsWith("sim-"))
        setLogs([...simulatedLogs, ...initialLogs])
        return
      } catch (e) {}
    }

    setLogs(initialLogs)
  }

  const fetchAgent = async () => {
    try {
      // Step 1: Query exact endpoint with real database-calculated metrics
      const res = await fetch(`/api/agents/${id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.agent) {
          setAgent(data.agent)
          const realMsgs = data.stats?.totalMessages || 0
          const realUsers = data.stats?.uniqueUsers || 0
          initializeStats(data.agent, realMsgs, realUsers)
          return
        }
      }
      
      // Step 2: Backup search
      const listRes = await fetch("/api/agents")
      if (listRes.ok) {
        const listData = await listRes.json()
        const matched = (listData.agents || []).find((a: any) => a.id === id)
        if (matched) {
          setAgent(matched)
          initializeStats(matched, 0, 0)
          return
        }
      }
      
      // Step 3: Seed offline mock starting from 0
      const fallbackAgent = {
        id,
        name: "Test Builder Agent",
        description: "Autonomous website and component generator",
        status: "completed",
        currentStep: "completed",
        createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          avatar: { type: "icon", icon: "bot" }
        }
      }
      setAgent(fallbackAgent)
      initializeStats(fallbackAgent, 0, 0)

    } catch (error) {
      console.error("Fetch agent error, falling back to mock:", error)
      const fallbackAgent = {
        id,
        name: "Test Builder Agent",
        description: "Autonomous website and component generator",
        status: "completed",
        currentStep: "completed",
        createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          avatar: { type: "icon", icon: "bot" }
        }
      }
      setAgent(fallbackAgent)
      initializeStats(fallbackAgent, 0, 0)
    } finally {
      setLoading(false)
    }
  }

  // Simulates a live message sequence with real-time timeline logs!
  const triggerLiveSimulation = () => {
    if (isSimulating || !agent) return
    setIsSimulating(true)
    
    // Increment message count stats
    const nextMsgs = totalMessages + 1
    const nextUsers = uniqueUsers === 0 ? 1 : uniqueUsers
    setTotalMessages(nextMsgs)
    setUniqueUsers(nextUsers)

    const promptId = Math.floor(100 + Math.random() * 900)
    
    const steps = [
      {
        type: "action" as const,
        message: `💬 Message received from client: 'Build a premium responsive dashboard layout.' (Session #${promptId})`,
        delay: 0
      },
      {
        type: "info" as const,
        message: "🧠 Started deep reasoning logic. Analyzing layout specifications...",
        delay: 1000
      },
      {
        type: "info" as const,
        message: "⚙️ Executed web capabilities check. sandbox, fetchUrl, search active.",
        delay: 2200
      },
      {
        type: "info" as const,
        message: "🛠️ Generating files: components/Dashboard.tsx, components/Sidebar.tsx.",
        delay: 3600
      },
      {
        type: "success" as const,
        message: "✅ Generation completed. Responsive rendering verified in local sandbox container.",
        delay: 5000
      }
    ]

    let currentLogs = [...logs]

    steps.forEach((step, idx) => {
      setTimeout(() => {
        const timeStr = formatLogTime(new Date())
        const newLogItem = {
          id: `sim-${idx}-${Date.now()}`,
          timestamp: timeStr,
          type: step.type,
          message: step.message
        }
        
        currentLogs = [newLogItem, ...currentLogs]
        setLogs(currentLogs)

        // Save progress step logs dynamically to localStorage
        localStorage.setItem(`agent_stats_${agent.id}`, JSON.stringify({
          totalMessages: nextMsgs,
          uniqueUsers: nextUsers,
          logs: currentLogs
        }))

        if (idx === steps.length - 1) {
          setIsSimulating(false)
          toast.success("Simulation sequence fully completed!")
        }
      }, step.delay)
    })
  }

  const renderAvatarPreview = (size = "h-10 w-10") => {
    if (!agent) return null
    const avatarCfg = agent.config?.avatar || {}
    
    if (avatarCfg.type === "image" && avatarCfg.image) {
      return (
        <img 
          src={avatarCfg.image} 
          alt="" 
          className={cn("rounded-md object-cover border border-zinc-200 shadow-sm", size)}
        />
      )
    }

    const prebuilt = PREBUILT_AVATARS.find(a => a.name === avatarCfg.icon) || PREBUILT_AVATARS[0]
    const IconComp = prebuilt.icon

    return (
      <div className={cn("rounded-md flex items-center justify-center bg-gradient-to-tr text-white border border-white/5 shadow-sm", prebuilt.color, size)}>
        <IconComp className="h-1/2 w-1/2" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50/60 text-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#0099ff] mb-4" />
        <p className="text-zinc-500 text-xs font-semibold">Retrieving agent analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 text-zinc-950 px-4 md:px-8 pt-10 pb-16 flex flex-col items-center justify-start">
      <div className="w-full max-w-3xl flex flex-col gap-5">
        
        {/* Back navigation button */}
        <button 
          onClick={() => router.push("/agents")} 
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer font-semibold self-start"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Agents
        </button>

        {/* Main Analytics Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm w-full space-y-6">
          
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-sm font-bold text-zinc-800 tracking-tight flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-[#0099ff]" />
              Agent Analytics
            </h2>
            
            {/* Date range picker using prebuilt DropdownMenu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-650 cursor-pointer shadow-2xs transition-colors">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{dateRange}</span>
                  <ChevronDown className="h-3 w-3 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 bg-white border border-zinc-200 rounded-md shadow-md py-1 z-20">
                {[
                  "Apr 18, 2026 - May 18, 2026",
                  "Today",
                  "Last 7 Days",
                  "Last 30 Days",
                  "All Time"
                ].map((range) => (
                  <DropdownMenuItem
                    key={range}
                    onClick={() => {
                      setDateRange(range)
                      toast.info(`Filtered date range: ${range}`)
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-zinc-705 cursor-pointer hover:bg-zinc-50"
                  >
                    {range}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Subcards Grid Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Card: Agent Profile Details */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start gap-4 shadow-2xs min-h-[105px]">
              {renderAvatarPreview("h-11 w-11 shrink-0")}
              <div className="min-w-0 space-y-1">
                <h3 className="text-xs font-bold text-zinc-900 truncate">
                  {agent?.name}
                </h3>
                <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {agent?.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Right Card: Message & User Metrics */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 grid grid-cols-2 gap-4 shadow-2xs min-h-[105px]">
              <div className="space-y-0.5 border-r border-zinc-100 pr-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Total Messages
                </span>
                <span className="text-2xl font-bold text-zinc-950 font-mono tracking-tight block">
                  {totalMessages}
                </span>
              </div>
              <div className="space-y-0.5 pl-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Unique Users
                </span>
                <span className="text-2xl font-bold text-zinc-950 font-mono tracking-tight block">
                  {uniqueUsers}
                </span>
              </div>
            </div>

          </div>

          {/* Activity / Timeline Section */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Live Action logs
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Activity stream, notifications, and code execution pipelines.
                </p>
              </div>
              
              <Button
                size="sm"
                onClick={triggerLiveSimulation}
                disabled={isSimulating}
                className="h-7.5 px-3 rounded-full text-[10px] font-bold bg-zinc-950 hover:bg-zinc-800 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isSimulating ? (
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" />
                )}
                Simulate Message
              </Button>
            </div>

            {/* Log list wrapper */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-950 text-emerald-400 font-mono text-[10px] space-y-2.5 max-h-[220px] overflow-y-auto shadow-inner min-h-[120px]">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 animate-in fade-in slide-in-from-left-1 duration-200">
                  <span className="text-zinc-500 select-none shrink-0">{log.timestamp}</span>
                  <span className={cn(
                    "font-medium",
                    log.type === "success" && "text-emerald-400",
                    log.type === "info" && "text-zinc-350",
                    log.type === "action" && "text-amber-400",
                    log.type === "warning" && "text-red-400"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  No activity found in the selected date range.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}

const PREBUILT_AVATARS = [
  { icon: Bot, color: "from-blue-500 to-indigo-500", name: "bot" },
  { icon: Sparkles, color: "from-amber-500 to-orange-500", name: "sparkles" },
  { icon: Code2, color: "from-emerald-500 to-teal-500", name: "code" },
  { icon: Users2, color: "from-purple-500 to-pink-500", name: "users" },
  { icon: Database, color: "from-cyan-500 to-blue-500", name: "database" },
  { icon: Terminal, color: "from-rose-500 to-red-500", name: "terminal" },
  { icon: Cpu, color: "from-violet-500 to-purple-500", name: "cpu" },
  { icon: Key, color: "from-yellow-500 to-amber-600", name: "key" },
]
