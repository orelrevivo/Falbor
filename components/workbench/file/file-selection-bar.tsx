"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Save, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkbench } from "@/lib/workbench-context"
import "@/styles/rgb.css"

export function FileSelectionBar() {
  const { selectedFiles, setSelectedFiles, setIsTaskModalOpen } = useWorkbench()

  if (selectedFiles.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-8 rgb-box left-1/2 -translate-x-1/2 z-[100] bg-white border border-[#e4e4e4] shadow-xs rounded-md p-2 px-4 flex items-center gap-4 min-w-[300px]"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <div className="bg-[#0099ff]/20 p-1.5 rounded-sm">
            <FileText className="w-4 h-4 text-[#0099ff]" />
          </div>
          <span>{selectedFiles.length} files selected</span>
        </div>

        <div className="flex -space-x-2 overflow-hidden">
          {selectedFiles.slice(0, 3).map((file, i) => (
            <div
              key={file}
              className="w-6 h-6 rounded-md bg-gray-100 border-2 border-white flex items-center justify-center"
              title={file}
            >
              <FileText className="w-3 h-3 text-gray-400" />
            </div>
          ))}
          {selectedFiles.length > 3 && (
            <div className="w-6 h-6 rounded-md bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
              +{selectedFiles.length - 3}
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-gray-200 mx-2" />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-gray-500 border border-[#e4e4e4] rounded-sm cursor-defult"
            onClick={() => setSelectedFiles([])}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 bg-[#0099ff] hover:bg-[#007acc] text-white hover:text-white rounded-sm cursor-defult"
            onClick={() => setIsTaskModalOpen(true)}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
