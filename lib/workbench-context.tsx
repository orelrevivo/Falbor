"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type WorkbenchTab = "preview" | "code" | "database" | "settings"
export type DatabaseTab = "tables" | "users" | "sql" | "emails" | "storage" | "functions" | "credentials" | "auth_providers" | "feedback" | "ai" | "usage"
export type SettingsSection = "project-settings" | "ai-models" | "custom-knowledge" | "security" | "automations" | "publish-template" | "secrets" | "github" | "analytics" | "plugins" | "versions" | "sushi"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  hasArtifact?: boolean
  projectId?: string
  thinking?: string | null
  versionName?: string | null
  searchQueries?: string[] | null
  isAutomated?: boolean
  tokensUsed?: number | null
  cost?: number | null
  sessionId?: string
  imageData?: string | null
  metadata?: Record<string, any> | null
}

export interface ChatSession {
  id: string
  name: string
  messages: Message[]
  model?: string
}

export interface PluginHook {
  pluginId: string
  icon?: string
  label?: string
  tooltip?: string
  onClick: (context: any) => void
}

export interface PluginRegistry {
  chatInputButtons: PluginHook[]
  navbarButtons: PluginHook[]
  sidebarLinks: PluginHook[]
  previewToolbarButtons: PluginHook[]
}

interface WorkbenchContextType {
  activeTab: WorkbenchTab
  setActiveTab: (tab: WorkbenchTab) => void
  databaseTab: DatabaseTab
  setDatabaseTab: (tab: DatabaseTab) => void
  settingsSection: SettingsSection
  setSettingsSection: (section: SettingsSection) => void

  selectedFiles: string[]
  setSelectedFiles: (files: string[]) => void
  toggleFileSelection: (path: string) => void

  chatSessions: ChatSession[]
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>
  activeChatId: string
  setActiveChatId: (id: string) => void
  addChatSession: (session: ChatSession) => void

  isTaskModalOpen: boolean
  setIsTaskModalOpen: (open: boolean) => void

  activePluginId: string | null
  setActivePluginId: (id: string | null) => void

  autoFixEnabled: boolean
  setAutoFixEnabled: (enabled: boolean) => void
  isAiStreaming: boolean
  setIsAiStreaming: (enabled: boolean) => void

  pluginRegistry: PluginRegistry
  registerPlugin: (plugin: any) => void
  setActivePlugin: (id: string | null) => void
  
  sendPrompt: (prompt: string, isAutomated?: boolean) => void
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined)

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("preview")
  const [databaseTab, setDatabaseTab] = useState<DatabaseTab>("tables")
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("project-settings")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: "main", name: "Main Chat", messages: [] }
  ])
  const [activeChatId, setActiveChatId] = useState<string>("main")
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [activePluginId, setActivePluginId] = useState<string | null>(null)
  const [autoFixEnabled, setAutoFixEnabled] = useState(true)
  const [isAiStreaming, setIsAiStreaming] = useState(false)
  const [pluginRegistry, setPluginRegistry] = useState<PluginRegistry>({ 
    chatInputButtons: [],
    navbarButtons: [],
    sidebarLinks: [],
    previewToolbarButtons: []
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).falbor = {
        ...(window as any).falbor,
        autoFixEnabled,
        setAutoFixEnabled: (val: boolean) => setAutoFixEnabled(val),
        isAiStreaming,
        setIsAiStreaming: (val: boolean) => setIsAiStreaming(val),
        registerPlugin: (plugin: any) => {
          setPluginRegistry((prev) => {
            const pluginId = plugin.id || `plugin-${Date.now()}`
            const processHooks = (hooks: any[] = []) => hooks.map((btn: any) => ({
              ...btn,
              pluginId,
              onClick: typeof btn.onClick === 'string' ? new Function('context', btn.onClick) : btn.onClick
            }))

            return {
              ...prev,
              chatInputButtons: [...prev.chatInputButtons.filter(b => b.pluginId !== pluginId), ...processHooks(plugin.chatInputButtons)],
              navbarButtons: [...prev.navbarButtons.filter(b => b.pluginId !== pluginId), ...processHooks(plugin.navbarButtons)],
              sidebarLinks: [...prev.sidebarLinks.filter(b => b.pluginId !== pluginId), ...processHooks(plugin.sidebarLinks)],
              previewToolbarButtons: [...prev.previewToolbarButtons.filter(b => b.pluginId !== pluginId), ...processHooks(plugin.previewToolbarButtons)],
            }
          })
        },
        setActivePlugin: (id: string | null) => setActivePluginId(id),
        sendPrompt: (prompt: string) => {
           if ((window as any).falbor._internalSubmit) {
             (window as any).falbor._internalSubmit(prompt)
           }
        },
        getMessages: () => (window as any).falbor._currentMessages || []
      }
    }
  }, [autoFixEnabled, isAiStreaming])

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => prev.includes(path) ? prev.filter(f => f !== path) : [...prev, path])
  }

  const addChatSession = (session: ChatSession) => {
    setChatSessions(prev => [...prev, session])
    setActiveChatId(session.id)
  }

  return (
    <WorkbenchContext.Provider
      value={{
        activeTab, setActiveTab,
        databaseTab, setDatabaseTab,
        settingsSection, setSettingsSection,
        selectedFiles, setSelectedFiles, toggleFileSelection,
        chatSessions, setChatSessions,
        activeChatId, setActiveChatId, addChatSession,
        isTaskModalOpen, setIsTaskModalOpen,
        activePluginId, setActivePluginId,
        autoFixEnabled, setAutoFixEnabled,
        isAiStreaming, setIsAiStreaming,
        pluginRegistry,
        registerPlugin: (plugin: any) => {
           if (typeof window !== "undefined" && (window as any).falbor?.registerPlugin) {
               (window as any).falbor.registerPlugin(plugin)
           }
        },
        setActivePlugin: (id: string | null) => setActivePluginId(id),
        sendPrompt: (prompt: string, isAutomated = false) => {
            if ((window as any).falbor._internalSubmit) {
              (window as any).falbor._internalSubmit(undefined, prompt, isAutomated)
            }
        }
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  )
}

export function useWorkbench() {
  const context = useContext(WorkbenchContext)
  if (context === undefined) {
    throw new Error("useWorkbench must be used within a WorkbenchProvider")
  }
  return context
}
