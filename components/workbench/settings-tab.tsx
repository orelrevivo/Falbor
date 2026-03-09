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

interface SettingsTabProps {
  projectId: string
}

export function SettingsTab({ projectId }: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<
    "custom-knowledge" | "project-settings" | "ai-models" | "security" | "automations" | "publish-template" | "secrets" | "github"
  >("project-settings")

  return (
    <div className="flex w-full h-full overflow-hidden">
      <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 overflow-y-auto w-full px-6 py-2">
        {activeSection === "project-settings" && <ProjectSettings projectId={projectId} />}
        {activeSection === "custom-knowledge" && <CustomKnowledgeSection />}
        {/* {activeSection === "ai-models" && <AIModelsSection />} */}
        {activeSection === "security" && <SecuritySection projectId={projectId} />}
        {activeSection === "automations" && <TasksSection projectId={projectId} />}
        {activeSection === "publish-template" && <PublishTemplateSection projectId={projectId} />}
        {activeSection === "secrets" && <SecretsSection projectId={projectId} />}
        {activeSection === "github" && <GithubSection projectId={projectId} />}
      </div>
    </div>
  )
}
