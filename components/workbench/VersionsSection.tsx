"use client"

import { useState, useEffect } from "react"
import { History, Check, ArrowRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  hasArtifact?: boolean
  versionName?: string | null
}

interface VersionsSectionProps {
  projectId: string
  messages: Message[]
  activeMessageId: string | null
  onActivateVersion: (messageId: string) => void
}

export function VersionsSection({ projectId, messages, activeMessageId, onActivateVersion }: VersionsSectionProps) {
  const versions = messages
    .filter(m => m.role === "assistant" && m.hasArtifact)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const latestVersionId = versions[0]?.id

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold dark:text-white">Versions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Restore your project to a previous state.</p>
        </div>
      </div>

      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50/50 dark:bg-white/5 dark:border-white/10">
            <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No versions found yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ask the AI to build something to create versions.</p>
          </div>
        ) : (
          versions.map((version, index) => {
            const isActive =
              activeMessageId === version.id ||
              (activeMessageId === null && version.id === latestVersionId)

            const isLatest = version.id === latestVersionId

            return (
              <div
                key={version.id}
                className={isActive ? "bg-[#0099ff]/20 p-[5px] rounded-[16px]" : ""}
              >
                <div
                  className={cn(
                    "group relative overflow-hidden border rounded-xl p-4 transition-all duration-200",
                    isActive
                      ? "bg-white dark:bg-white/10 border-[#0099ff] dark:border-[#0099ff] shadow-xs"
                      : "bg-white dark:bg-[#1E1E21] border-border dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-xs"
                  )}
                >
                  {/* MAIN CONTENT */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {version.versionName || `Update ${versions.length - index}`}
                        </span>

                        {isLatest && (
                          <span className="px-2 py-0.5 bg-[#0099ff]/20 text-[#0099ff] text-[11px] rounded-full">
                            Latest
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <RotateCcw className="w-3 h-3" />
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => onActivateVersion(version.id)}
                      className={cn(
                        "h-7 px-3 rounded-sm transition-all z-10",
                        isActive
                          ? "bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/90 pointer-events-none"
                          : "border dark:border-white/10 bg-white dark:bg-white/5 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                      )}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          Restore
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* ✅ OVERLAY PREVIEW (TOP → DOWN ANIMATION) */}
                  <div className="absolute inset-0 pointer-events-none">
                      <div
                        className="
                          absolute top-0 left-0 w-full rounded-[16px]
                          bg-white/95 dark:bg-black/90 backdrop-blur-sm
                          px-4 pt-4 pb-3
                          opacity-0 scale-y-0
                          origin-top
                          group-hover:opacity-100 group-hover:scale-y-100
                          transition-all duration-300 ease-out
                        "
                      >
                        <p className="text-[12px] text-gray-900 dark:text-white">
                          {version.content
                            .substring(0, 100)
                            .replace(/<[^>]*>/g, "")
                            .trim()}
                          ...
                        </p>
                      </div>
                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}