"use client"

import { useState, useMemo } from "react"
import Editor from "@monaco-editor/react"
import { 
    FileCode, 
    Plus, 
    X, 
    Save, 
    ArrowLeft, 
    Trash2,
    Loader2,
    ChevronRight,
    File
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PluginFile {
    path: string
    content: string
}

interface ProfessionalIDEProps {
    initialFiles: PluginFile[]
    onSave: (files: PluginFile[]) => Promise<void>
    onBack: () => void
    pluginName: string
}

export function ProfessionalIDE({ initialFiles, onSave, onBack, pluginName }: ProfessionalIDEProps) {
    const [files, setFiles] = useState<PluginFile[]>(initialFiles)
    const [activeFilePath, setActiveFilePath] = useState<string>(initialFiles[0]?.path || "index.js")
    const [loading, setLoading] = useState(false)

    const activeFile = useMemo(() => files.find(f => f.path === activeFilePath), [files, activeFilePath])

    const updateFileContent = (newContent: string | undefined) => {
        if (newContent === undefined) return
        setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: newContent } : f))
    }

    const addNewFile = () => {
        const name = prompt("Enter new filename (e.g., globals.css):")
        if (!name) return
        if (files.find(f => f.path === name)) return toast.error("File already exists")
        setFiles(prev => [...prev, { path: name, content: "" }])
        setActiveFilePath(name)
    }

    const deleteFile = (path: string) => {
        if (path === "index.js") return toast.error("Cannot delete the entry point (index.js)")
        if (!confirm(`Are you sure you want to delete ${path}?`)) return
        setFiles(prev => prev.filter(f => f.path !== path))
        if (activeFilePath === path) setActiveFilePath("index.js")
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            await onSave(files)
            toast.success("Plugin Source Logic Saved")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-150px)] bg-[#111] rounded-2xl overflow-hidden border border-[#313131] shadow-2xl relative">
            
            {/* Header / Ribbon */}
            <div className="h-14 bg-[#1a1a1a] border-b border-[#313131] flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-1">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#0099ff]" />
                        <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">{pluginName} / IDE</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="h-8 bg-[#0099ff] hover:bg-[#0099ff]/80 text-white text-[10px] uppercase font-black px-6 tracking-widest"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                        SAVE PROGRESS
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* File Sidebar (Custom Explorer) */}
                <div className="w-[240px] bg-[#111] border-r border-[#313131] flex flex-col shrink-0">
                    <div className="p-4 border-b border-[#313131] flex items-center justify-between bg-black/20">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">FILES</span>
                        <Plus className="w-3.5 h-3.5 text-white/30 cursor-pointer hover:text-white" onClick={addNewFile} />
                    </div>
                    <div className="py-2 overflow-y-auto no-scrollbar flex-1">
                        {files.map(f => (
                            <div 
                                key={f.path}
                                onClick={() => setActiveFilePath(f.path)}
                                className={cn(
                                    "px-4 py-2 text-[11px] font-medium flex items-center justify-between group cursor-pointer transition-all border-l-2",
                                    activeFilePath === f.path 
                                        ? "bg-[#1a1a1a] text-white border-[#0099ff]" 
                                        : "text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <ChevronRight className={cn("w-3 h-3 transition-transform", activeFilePath === f.path ? "rotate-90 text-[#0099ff]" : "text-white/10")} />
                                    <File className={cn("w-3.5 h-3.5", f.path.endsWith('.css') ? "text-blue-500" : "text-yellow-500/70")} />
                                    <span className="truncate">{f.path}</span>
                                </div>
                                {f.path !== 'index.js' && (
                                    <X 
                                        className="w-3.5 h-3.5 text-red-400 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all" 
                                        onClick={(e) => { e.stopPropagation(); deleteFile(f.path); }} 
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Code Workspace (Monaco Editor) */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
                    <div className="h-8 px-4 flex items-center bg-[#1a1a1a] border-b border-[#313131]">
                        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">{activeFilePath}</span>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            path={activeFilePath}
                            language={activeFilePath.endsWith('.css') ? 'css' : 'javascript'}
                            value={activeFile?.content || ""}
                            onChange={updateFileContent}
                            options={{
                                fontSize: 13,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                padding: { top: 15 },
                                automaticLayout: true,
                                fixedOverflowWidgets: true,
                                scrollbar: {
                                    vertical: 'hidden',
                                    horizontal: 'hidden'
                                },
                            }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Simple Footer */}
            <div className="h-6 bg-[#0099ff] flex items-center px-4 justify-between shrink-0">
                <span className="text-[9px] font-black text-white tracking-widest uppercase">Safe Development Zone</span>
                <div className="flex gap-4">
                    <span className="text-[9px] font-black text-white/80">{files.length} FILES LOADED</span>
                </div>
            </div>
        </div>
    )
}
