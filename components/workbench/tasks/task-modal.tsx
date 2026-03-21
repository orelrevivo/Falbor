"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash, Play, X, Edit3, Layers, Settings2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWorkbench } from "@/lib/workbench-context"
import { MODEL_OPTIONS } from "@/lib/common/prompts/prompt"

// ── Import your custom DropdownMenu components ──
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"   // ← adjust path if needed
import { cn } from "@/lib/utils"

export function TaskModal({ projectId }: { projectId: string }) {
  const {
    isTaskModalOpen,
    setIsTaskModalOpen,
    selectedFiles,
    setSelectedFiles,
  } = useWorkbench()

  const [tasks, setTasks] = useState<string[]>([""])
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isTaskModalOpen) return null

  const handleAddTask = () => {
    setTasks([...tasks, ""])
  }

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks]
    newTasks[index] = value
    setTasks(newTasks)
  }

  const handleRemoveTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index))
    }
  }

  const handleSubmitTasks = async () => {
    if (tasks.every(t => !t.trim())) return


    setIsSubmitting(true)

    const validTasks = tasks.filter(t => t.trim())
    const taskGroupId = `task-group-${Date.now()}`
    const totalTasks = validTasks.length

    // Cleanup UI immediately
    setIsSubmitting(false)
    setIsTaskModalOpen(false)
    const savedFiles = [...selectedFiles]
    setSelectedFiles([])
    setTasks([""])

    // Dispatch each task as a separate event with group metadata
    validTasks.forEach((task, index) => {
      const formattedMessage = `**Task ${index + 1} of ${totalTasks}:**\n${task}\n\n` +
        `**Selected Files:**\n${savedFiles.map(f => `- ${f}`).join("\n")}`

      // Stagger dispatches slightly so they arrive in order
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('chat:new-task-session', {
          detail: {
            sessionId: "main",
            message: formattedMessage,
            model: selectedModel,
            taskGroupId,
            taskIndex: index + 1,
            totalTasks,
          }
        }))
      }, index * 100)
    })
  }

  const selectedModelLabel = MODEL_OPTIONS.find(m => m.id === selectedModel)?.name || selectedModel

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/30 backdrop-blur-sm"
          onClick={() => setIsTaskModalOpen(false)}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white border border-gray-200 shadow-xs rounded-md w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="bg-[#0099ff]/20 p-2 rounded-sm text-[#0099ff]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Define Tasks</h3>
                <p className="text-xs text-gray-500 font-medium">
                  Apply changes to {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Model Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Processing Model
              </label>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white hover:bg-gray-50 text-black border-gray-300 rounded-lg"
                    >
                      <span className="font-medium">{selectedModelLabel}</span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="w-[min(280px,90vw)] max-h-80 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2">
                      Available Models
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {MODEL_OPTIONS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onSelect={() => setSelectedModel(model.id)}
                        className={cn(
                          "flex flex-col items-start py-2.5 px-3",
                          selectedModel === model.id && "bg-blue-50 text-blue-800"
                        )}
                      >
                        <div className="font-medium">{model.name}</div>
                        {(model as any).description && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {(model as any).description}
                          </div>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-[11px] text-gray-400 font-medium leading-tight">
                Model that will process these file modifications
              </span>
            </div>

            {/* Task List */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Task Sequence
              </label>

              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <motion.div
                    layout
                    key={index}
                    className="flex items-center gap-2 group"
                  >
                    <div className="flex-none w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">
                      {index + 1}
                    </div>
                    <div className="flex-1 relative">
                      <Input
                        value={task}
                        onChange={(e) => handleTaskChange(index, e.target.value)}
                        placeholder={index === 0 ? "e.g. Add a close button to modal.tsx" : "Add another instruction..."}
                        className="h-11 pl-4 pr-10 bg-white border-gray-200 rounded-xl focus:border-[#0099ff] transition-all shadow-sm"
                      />
                    </div>
                    {tasks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTask(index)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleAddTask}
                className="w-full h-8 border-dashed text-[#0099ff] bg-[#0099ff]/20 hover:text-[#0099ff] hover:border-[#0099ff] hover:bg-[#0099ff]/30 rounded-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step-by-Step Task
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
            <div className="text-xs text-gray-500 font-medium">
              Ready to process <span className="text-[#0099ff] font-bold">{selectedFiles.length}</span> file
              {selectedFiles.length !== 1 ? "s" : ""}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-gray-900 bg-transparent hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#0099ff] hover:bg-[#0099ff]/80 text-white"
                onClick={handleSubmitTasks}
                disabled={isSubmitting || tasks.every(t => !t.trim())}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4 fill-white" />
                    Launch Tasks
                  </span>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}