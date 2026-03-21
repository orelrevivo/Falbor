"use client"

import React, { createContext, useContext, useState } from "react"

export type WorkbenchTab = "preview" | "code" | "database" | "settings"
export type DatabaseTab = "tables" | "users" | "sql" | "emails" | "storage" | "functions" | "credentials" | "auth_providers" | "feedback" | "ai" | "usage"
export type SettingsSection = "project-settings" | "ai-models" | "custom-knowledge" | "security" | "automations" | "publish-template" | "secrets" | "github" | "analytics"

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

interface WorkbenchContextType {
  activeTab: WorkbenchTab
  setActiveTab: (tab: WorkbenchTab) => void
  databaseTab: DatabaseTab
  setDatabaseTab: (tab: DatabaseTab) => void
  settingsSection: SettingsSection
  setSettingsSection: (section: SettingsSection) => void
  
  // File selection
  selectedFiles: string[]
  setSelectedFiles: (files: string[]) => void
  toggleFileSelection: (path: string) => void
  
  // Chat sessions
  chatSessions: ChatSession[]
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>
  activeChatId: string
  setActiveChatId: (id: string) => void
  addChatSession: (session: ChatSession) => void
  
  // Task Modal
  isTaskModalOpen: boolean
  setIsTaskModalOpen: (open: boolean) => void
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

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => 
      prev.includes(path) ? prev.filter(f => f !== path) : [...prev, path]
    )
  }

  const addChatSession = (session: ChatSession) => {
    setChatSessions(prev => [...prev, session])
    setActiveChatId(session.id)
  }

  return (
    <WorkbenchContext.Provider
      value={{
        activeTab,
        setActiveTab,
        databaseTab,
        setDatabaseTab,
        settingsSection,
        setSettingsSection,
        selectedFiles,
        setSelectedFiles,
        toggleFileSelection,
        chatSessions,
        setChatSessions,
        activeChatId,
        setActiveChatId,
        addChatSession,
        isTaskModalOpen,
        setIsTaskModalOpen,
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

