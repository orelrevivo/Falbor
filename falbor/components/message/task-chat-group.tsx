"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight, Layers, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskChatGroupProps {
  taskIndex: number
  totalTasks: number
  isLoading?: boolean
  children: React.ReactNode
  defaultExpanded?: boolean
}

export function TaskChatGroup({
  taskIndex,
  totalTasks,
  isLoading = false,
  children,
  defaultExpanded = true,
}: TaskChatGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="my-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
          "bg-gradient-to-r from-[#0099ff]/5 to-transparent border border-[#0099ff]/15",
          "hover:from-[#0099ff]/10 hover:border-[#0099ff]/25",
          "group cursor-pointer"
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[#0099ff]/10 text-[#0099ff]">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Layers className="w-3 h-3" />
          )}
        </div>
        <span className="text-[#0099ff]">
          Task {taskIndex} of {totalTasks}
        </span>
        {isLoading && (
          <span className="text-[10px] text-[#0099ff]/60 font-medium ml-1">
            Processing...
          </span>
        )}
        <div className="ml-auto text-gray-400 group-hover:text-[#0099ff] transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l-2 border-[#0099ff]/15 ml-2.5 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
