import { FileTree } from "@/components/workbench/file/file-tree"
import { FileSelectionBar } from "./file/file-selection-bar"

interface FileSidebarProps {
  files: Array<{ path: string; content: string; language: string; type?: string; isLocked?: boolean }>
  onFileSelect: (file: { path: string; content: string; language: string }) => void
  selectedPath: string | null
  projectId: string
  onFilesChange: () => void
  currentRoot?: string
  currentlyEditingPath?: string | null
}

export function FileSidebar({ files, onFileSelect, selectedPath, projectId, onFilesChange, currentRoot, currentlyEditingPath }: FileSidebarProps) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <FileTree
          files={files}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
          projectId={projectId}
          onFilesChange={onFilesChange}
          currentRoot={currentRoot}
          currentlyEditingPath={currentlyEditingPath}
        />
      </div>
      <FileSelectionBar />
    </div>
  )
}