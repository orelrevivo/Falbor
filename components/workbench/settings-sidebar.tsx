"use client"

import { cn } from "@/lib/utils"
import { Brain, Cpu, Settings, Shield, CheckSquare, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SettingsSidebarProps {
  activeSection: "project-settings" | "ai-models" | "custom-knowledge" | "security" | "automations" | "publish-template"
  onSectionChange: (
    section: "project-settings" | "ai-models" | "custom-knowledge" | "security" | "automations" | "publish-template",
  ) => void
}

const menuItems = [
  {
    id: "project-settings" as const,
    label: "General",
    icon: Settings,
    group: "Project Settings",
  },
  {
    id: "security" as const,
    label: "Security",
    icon: Shield,
    group: "Project Settings",
  },
  {
    id: "automations" as const,
    label: "Automations",
    icon: CheckSquare,
    group: "Project Settings",
  },
  {
    id: "publish-template" as const,
    label: "Publish to Template",
    icon: Upload,
    group: "Project Settings",
  },
  {
    id: "custom-knowledge" as const,
    label: "Custom Knowledge",
    icon: Brain,
    group: "Project Settings",
  },
  // {
  //   id: "ai-models" as const,
  //   label: "AI Models",
  //   icon: Cpu,
  //   group: "AI Settings",
  // },
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const groups = Array.from(new Set(menuItems.map((item) => item.group)))

  return (
    <div className="w-56">
      {groups.map((group) => (
        <div key={group} className="w-[250px] flex flex-col bg-white">
          <div className="flex-1 p-3 space-y-1">
            {menuItems
              .filter((item) => item.group === group)
              .map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 cursor-pointer h-8 px-3 py-2 rounded-md text-[13px] font-medium text-left",
                      activeSection === item.id
                        ? "bg-white text-gray-900 BackgroundStyleButton"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.id === "automations" && (
                      <Badge className="ml-5" variant="secondary">
                        Beta
                      </Badge>
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}