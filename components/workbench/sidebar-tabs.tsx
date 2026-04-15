// components/workbench/sidebar-tabs.tsx
import { cn } from "@/lib/utils"
import { Files, Search, Lock } from "lucide-react"

interface SidebarTabsProps {
  sidebarView: "files" | "search" | "locks"
  setSidebarView: (view: "files" | "search" | "locks") => void
}

export function SidebarTabs({ sidebarView, setSidebarView }: SidebarTabsProps) {
  return (
    <div className="flex items-end pb-[5px] pt-1 pl-1 border-border dark:border-white/10 border-b">
      <button
        onClick={() => setSidebarView("files")}
        className={cn(
          "w-[80px] h-[24px] mr-1 flex items-center rounded-md justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-all -mb-[1px]",
          sidebarView === "files"
            ? "text-black dark:text-white bg-[#7a7a7a2a] dark:bg-white/10 shadow-sm"
            : "text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-[#7a7a7a1f] dark:hover:bg-white/5"
        )}
      >
        <Files className="w-3.5 h-3.5" />
        Files
      </button>

      <button
        onClick={() => setSidebarView("search")}
        className={cn(
          "w-[80px] h-[24px] mr-1 flex items-center rounded-md justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-all -mb-[1px]",
          sidebarView === "search"
            ? "text-black dark:text-white bg-[#7a7a7a2a] dark:bg-white/10 shadow-sm"
            : "text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-[#7a7a7a1f] dark:hover:bg-white/5"
        )}
      >
        <Search className="w-3.5 h-3.5" />
        Search
      </button>

      <button
        onClick={() => setSidebarView("locks")}
        className={cn(
          "w-[80px] h-[24px] flex items-center rounded-md justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-all -mb-[1px]",
          sidebarView === "locks"
            ? "text-black dark:text-white bg-[#7a7a7a2a] dark:bg-white/10 shadow-sm"
            : "text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-[#7a7a7a1f] dark:hover:bg-white/5"
        )}
      >
        <Lock className="w-3.5 h-3.5" />
        Locks
      </button>
    </div>
  )
}