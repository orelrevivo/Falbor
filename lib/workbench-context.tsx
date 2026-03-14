"use client"

import React, { createContext, useContext, useState } from "react"

export type WorkbenchTab = "preview" | "code" | "database" | "settings"
export type DatabaseTab = "tables" | "users" | "sql" | "emails" | "storage" | "functions" | "credentials" | "auth_providers" | "feedback"
export type SettingsSection = "project-settings" | "ai-models" | "custom-knowledge" | "security" | "automations" | "publish-template" | "secrets" | "github" | "analytics"

interface WorkbenchContextType {
  activeTab: WorkbenchTab
  setActiveTab: (tab: WorkbenchTab) => void
  databaseTab: DatabaseTab
  setDatabaseTab: (tab: DatabaseTab) => void
  settingsSection: SettingsSection
  setSettingsSection: (section: SettingsSection) => void
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined)

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("preview")
  const [databaseTab, setDatabaseTab] = useState<DatabaseTab>("tables")
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("project-settings")

  return (
    <WorkbenchContext.Provider
      value={{
        activeTab,
        setActiveTab,
        databaseTab,
        setDatabaseTab,
        settingsSection,
        setSettingsSection,
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
