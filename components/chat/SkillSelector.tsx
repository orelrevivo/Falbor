"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Zap,
  Cpu,
  GitBranch,
  MessageSquare,
  Search,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Video,
  Cloud,
  Sparkles,
  Wand2,
  Github,
  Loader2,
  Check,
  Mail,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserSkills, getAllSkills, enableSkill } from "@/app/actions/skills"
import { getMcpConnections } from "@/app/actions/mcp"
import { Skill, UserSkill } from "@/config/schema"
import { toast } from "sonner"

interface SkillSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'skill' | 'mcp' | 'template', value: string, fullData?: any) => void
  showMcp?: boolean
}

type TabType = 'skills' | 'mcp' | 'templates'

const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Wand2,
  Github,
  Search,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Video,
  Cloud,
  Zap,
  MessageSquare,
  GitBranch,
}

const EMAIL_TEMPLATES = [
  { id: "confirmation", label: "Confirm Sign Up" },
  { id: "invite", label: "Invite User" },
  { id: "magic_link", label: "Magic Link" },
  { id: "email_change", label: "Change Email" },
  { id: "recovery", label: "Reset Password" },
  { id: "reauthentication", label: "Reauthentication" },
]

export function SkillSelector({ isOpen, onClose, onSelect, showMcp = true }: SkillSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('mcp')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [userSkillsData, setUserSkillsData] = useState<UserSkill[]>([])
  const [mcpConnections, setMcpConnections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)

  const loadData = useCallback(async () => {
    if (!isOpen) return

    setIsLoading(true)
    try {
      if (activeTab === 'skills') {
        const [all, user] = await Promise.all([
          getAllSkills(),
          getUserSkills()
        ])
        const sortedSkills = [...all].sort((a, b) => a.name.localeCompare(b.name))
        setAllSkills(sortedSkills)
        setUserSkillsData(user)
      } else if (activeTab === 'mcp' && showMcp) {
        const connections = await getMcpConnections()
        setMcpConnections(connections)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isOpen, activeTab, showMcp])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInstallSkill = async (skillId: string) => {
    try {
      setIsInstalling(true)
      const result = await enableSkill(skillId)
      if (result.success) {
        toast.success("Skill added successfully")
        const userSkills = await getUserSkills()
        setUserSkillsData(userSkills)
      } else {
        toast.error(result.error || "Failed to add skill")
      }
    } catch (error) {
      toast.error("Failed to add skill")
    } finally {
      setIsInstalling(false)
    }
  }

  const handleSelectItem = (item: any) => {
    if (activeTab === 'skills') {
      const isInstalled = userSkillsData.some(us => us.skillId === item.id)
      if (!isInstalled) {
        handleInstallSkill(item.id)
      } else {
        onSelect('skill', `/${item.slug}`, item)
        onClose()
      }
    } else if (activeTab === 'mcp') {
      onSelect('mcp', item.name, item)
      onClose()
    } else if (activeTab === 'templates') {
      onSelect('template', `Email/${item.id}`, item)
      onClose()
    }
  }

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase()
    if (activeTab === 'skills') {
      return allSkills.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      )
    } else if (activeTab === 'mcp') {
      return mcpConnections.filter(c => c.name.toLowerCase().includes(query))
    } else if (activeTab === 'templates') {
      return EMAIL_TEMPLATES.filter(t => t.label.toLowerCase().includes(query))
    }
    return []
  }

  const items = getFilteredItems()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute bottom-full left-0 mb-2 z-[100] bg-white border border-zinc-200 flex overflow-hidden rounded-md shadow-none"
        style={{ width: '380px', height: '280px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[124px] max-w-[124px] bg-white border-r border-zinc-100 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setActiveTab('mcp')}
            className={`w-full px-2 py-1 text-left text-[13px] ${activeTab === 'mcp' ? 'BackgroundStyleButton text-black' : 'text-zinc-400'}`}
            title="MCP"
          >
            Conections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`w-full px-2 py-1 text-left text-[13px] ${activeTab === 'templates' ? 'BackgroundStyleButton text-black' : 'text-zinc-400'}`}
            title="Templates"
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`w-full px-2 py-1 text-left text-[13px] ${activeTab === 'skills' ? 'BackgroundStyleButton text-black' : 'text-zinc-400'}`}
            title="Skills"
          >
            Skills
          </button>
        </div>

        {/* List */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-1.5 border-b border-zinc-50">
            <input
              type="text"
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-[11px] border border-zinc-100 rounded bg-zinc-50 outline-none placeholder:text-zinc-400"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-[9px] text-zinc-400 text-center mt-4">No results</p>
            ) : activeTab === 'templates' ? (
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-[15px] text-zinc-900 border-b border-zinc-50 mb-1">
                  Email Blueprints
                </div>
                <div className="max-h-[240px] overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectItem(t)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-zinc-50 rounded-xl transition-all group text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0099ff]/20 flex items-center justify-center text-[#0099ff] group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-blue-100 transition-all">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-zinc-900 truncate">{t.label}</div>
                        <div className="text-[11px] text-zinc-700">System Template</div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-900" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className="w-full text-left p-1.5 rounded hover:bg-zinc-50 flex items-center gap-2 group transition-colors"
                >
                  <div className={`p-1 rounded bg-zinc-50 text-zinc-400 group-hover:text-zinc-900`}>
                    {activeTab === 'mcp' ? <Cpu className="w-3 h-3" /> : activeTab === 'templates' ? <MessageSquare className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-zinc-700 truncate">{item.name}</p>
                    {activeTab === 'skills' && userSkillsData.some(us => us.skillId === item.id) && (
                      <span className="text-[8px] text-green-600 font-bold uppercase tracking-tighter">Added</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

