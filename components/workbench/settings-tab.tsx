"use client"

import { useState } from "react"
import { SettingsSidebar } from "./settings-sidebar"
import { CustomKnowledgeSection } from "./custom-knowledge-section"
// import { AIModelsSection } from "./ai-models-section"
import ProjectSettings from "./ProjectSettings"
import { SecuritySection } from "./security-section"
import { TasksSection } from "./tasks"
import { PublishTemplateSection } from "./templates/publish-template-section"
import { SecretsSection } from "./secrets-section"
import { GithubSection } from "./github-section"
import { AnalyticsSection } from "./analytics-section"
import { PluginsSection } from "./plugins-section"
import { VersionsSection } from "./VersionsSection"
import { SushiSection } from "./sushi-section"
import { useWorkbench } from "@/lib/workbench-context"

interface SettingsTabProps {
  projectId: string
  messages: any[]
  activeMessageId: string | null
  onActivateVersion: (messageId: string) => void
}

export function SettingsTab({ projectId, messages, activeMessageId, onActivateVersion }: SettingsTabProps) {
  const { settingsSection, setSettingsSection } = useWorkbench()
  const activeSection = settingsSection || "project-settings"

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#fafbfc]">
      {/* <div className="w-64 border-r border-gray-100 bg-white h-full shrink-0">
         <SettingsSidebar activeSection={activeSection as any} onSectionChange={setSettingsSection as any} />
      </div> */}
      <div className="flex-1 overflow-y-auto w-full px-6 py-2 bg-white/50">
        <div className="max-w-4xl mx-auto w-full py-8">
          {activeSection === "project-settings" && <ProjectSettings projectId={projectId} />}
          {activeSection === "versions" && (
            <VersionsSection
              projectId={projectId}
              messages={messages}
              activeMessageId={activeMessageId}
              onActivateVersion={onActivateVersion}
            />
          )}
          {activeSection === "custom-knowledge" && <CustomKnowledgeSection />}
          {activeSection === "security" && <SecuritySection projectId={projectId} />}
          {activeSection === "automations" && <TasksSection projectId={projectId} />}
          {activeSection === "publish-template" && <PublishTemplateSection projectId={projectId} />}
          {activeSection === "secrets" && <SecretsSection projectId={projectId} />}
          {activeSection === "github" && <GithubSection projectId={projectId} />}
          {activeSection === "analytics" && <AnalyticsSection projectId={projectId} />}
          {activeSection === "plugins" && <PluginsSection projectId={projectId} />}
          {activeSection === "sushi" && <SushiSection projectId={projectId} />}
        </div>
      </div>
    </div>
  )
}
