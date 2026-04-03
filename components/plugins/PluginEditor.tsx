"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Sparkles, Image as ImageIcon, Loader2, Send, Bot, User, Trash2, FileCode, Folder, ChevronRight, Plus, X, Globe, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface PluginFile {
    path: string
    content: string
}

interface PluginData {
    id?: string
    name: string
    tagline: string
    summary: string
    description: string
    reviewInstructions: string
    code: string
    isPaid: boolean
    categories: string
    visualData: string
    files: PluginFile[]
}

interface PluginEditorProps {
    initialData?: PluginData
    onSave: (data: PluginData) => Promise<void>
    onDelete?: () => Promise<void>
    isEditing?: boolean
}

export function PluginEditor({ initialData, onSave, onDelete, isEditing = false }: PluginEditorProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    // Multi-file state
    const [files, setFiles] = useState<PluginFile[]>(initialData?.files || [
        { path: 'index.js', content: initialData?.code || '' }
    ])

    const imageInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState<PluginData>(initialData || {
        name: "",
        tagline: "",
        summary: "",
        description: "",
        reviewInstructions: "",
        code: "",
        isPaid: false,
        categories: "Animation",
        visualData: "",
        files: []
    })

    // Chat builder state
    const [chatInput, setChatInput] = useState("")
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: isEditing 
            ? "Welcome back. How can I help you improve your plugin today?"
            : "Hello! I can help you architect your new plugin. Just describe what you want it to do." 
        }
    ])
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim() || generating) return

        const userMsg = chatInput.trim()
        setChatInput("")
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setGenerating(true)

        try {
            const { generatePluginWithAI } = await import('../../app/(main)/creator/workspace/new-plugin/actions')
            const currentStructure = files.map(f => `File: ${f.path}\nContent:\n${f.content}`).join('\n\n')
            
            const aiData = await generatePluginWithAI({
                hint: isEditing 
                    ? `Editing existing plugin. Files:\n${currentStructure}\n\nRequest: ${userMsg}`
                    : userMsg,
                model: "google/gemini-3.1-flash-lite-preview"
            })

            if (aiData) {
                setFormData(prev => ({
                    ...prev,
                    name: aiData.name || prev.name,
                    tagline: aiData.tagline || prev.tagline,
                    summary: aiData.summary || prev.summary,
                    description: aiData.description || prev.description,
                    reviewInstructions: aiData.reviewInstructions || prev.reviewInstructions,
                    code: aiData.code || prev.code,
                }))

                if (aiData.files && aiData.files.length > 0) {
                    setFiles(aiData.files)
                } else if (aiData.code) {
                    setFiles([{ path: 'index.js', content: aiData.code }])
                }

                setChatMessages(prev => [...prev, { role: 'assistant', content: "Got it. I've rebuilt the plugin logic based on your request. Check the preview to see it in action!" }])
            }
        } catch (err) {
            console.error(err)
            toast.error("Generation failed.")
        } finally {
            setGenerating(true) // Stay in architect mode
            setGenerating(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            setFormData(prev => ({ ...prev, visualData: event.target?.result as string }))
        }
        reader.readAsDataURL(file)
    }

    const handleLocalSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const entryPoint = files.find(f => f.path === 'index.js')?.content || ""
            await onSave({ ...formData, files, code: entryPoint })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Left AI Sidebar - Restored Original White Input Design */}
            <div className="w-full lg:w-[350px] flex flex-col border border-[#313131] bg-[#111] rounded-md overflow-hidden shrink-0 h-[calc(100vh-150px)]">
                <div className="p-4 border-b border-[#313131] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0099ff]" />
                    <h2 className="text-white/90 text-[11px] font-black uppercase tracking-widest">Plugin Architect</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-transparent">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded-full border border-[#313131] bg-[#111] flex items-center justify-center shrink-0">
                                {msg.role === 'user' ? <User className="w-4 h-4 text-white/40" /> : <Bot className="w-4 h-4 text-[#0099ff]" />}
                            </div>
                            <div className={cn(
                                "text-[11px] leading-relaxed max-w-[85%] px-4 py-3 rounded-2xl",
                                msg.role === 'user' ? "bg-[#383838] text-white/90 shadow-sm" : "bg-[#1a1a1a] border border-[#313131] text-white/70"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {generating && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#313131] flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-[#0099ff]" />
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 border border-[#313131] bg-[#1a1a1a] rounded-2xl">
                                <Loader2 className="w-3 h-3 animate-spin text-[#0099ff]" />
                                <span className="text-[10px] text-white/30 uppercase font-black">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 border-t border-[#313131] bg-[#1a1a1a]">
                    <div className="relative group">
                        <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Architect your plugin..."
                            className="h-11 px-4 text-xs w-full bg-white text-black rounded-lg outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-[#0099ff]/50 transition-all font-medium placeholder:text-gray-400"
                            disabled={generating}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!chatInput.trim() || generating}
                            className="absolute right-1 top-1 h-9 w-9 bg-[#0099ff] hover:bg-[#0099ff]/80 rounded-md transition-all active:scale-95 shadow-md flex items-center justify-center"
                        >
                            <Send className="w-4 h-4 text-white" />
                        </Button>
                    </div>
                </form>
            </div>

            {/* Right Configuration Workspace */}
            <div className="flex-1 space-y-8 max-w-4xl pb-20 no-scrollbar">
                <form onSubmit={handleLocalSave} className="space-y-10">
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

                    <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <h3 className="text-2xl text-white/90">Identity</h3>
                            <p className="text-xs text-white/40">Basic info and community branding.</p>
                         </div>
                         <div className="flex gap-2">
                            {isEditing && onDelete && (
                                <Button
                                    type="button"
                                    onClick={onDelete}
                                    className="bg-transparent border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-sm h-8 text-[11px] font-black uppercase px-4"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-[#0099ff] hover:bg-[#0099ff]/80 text-white rounded-sm px-6 h-8 text-[11px] font-black uppercase tracking-widest"
                            >
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                                {isEditing ? "Save Plugin" : "Publish to Falbor"}
                            </Button>
                         </div>
                    </div>

                    <section className="space-y-4">
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className="h-32 rounded-md bg-[#313131] border-2 border-dashed border-[#262626] flex flex-col items-center justify-center cursor-pointer hover:bg-[#383838] transition-all relative overflow-hidden group"
                        >
                            {formData.visualData ? (
                                <img src={formData.visualData} alt="preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                            ) : (
                                <>
                                    <ImageIcon className="w-6 h-6 mb-2 text-white/20" />
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Brand Artwork</span>
                                </>
                            )}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Public Name</Label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="h-11 px-4 w-full bg-[#1a1a1a] border border-[#313131] rounded-sm text-sm text-white/90 outline-none focus:border-[#0099ff]/50 transition-colors font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Catchy Hook</Label>
                            <input
                                value={formData.tagline}
                                onChange={e => setFormData({ ...formData, tagline: e.target.value.substring(0, 30) })}
                                className="h-11 px-4 w-full bg-[#1a1a1a] border border-[#313131] rounded-sm text-sm text-white/90 outline-none focus:border-[#0099ff]/50 transition-colors font-bold"
                                placeholder="..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Detailed Context</Label>
                        <Textarea
                            value={formData.summary}
                            onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            className="min-h-[100px] px-4 py-3 w-full bg-[#1a1a1a] border border-[#313131] rounded-sm text-sm text-white/90 outline-none focus:border-[#0099ff]/50 transition-colors resize-none leading-relaxed"
                            placeholder="..."
                        />
                    </div>

                    <div className="space-y-4 pt-10 border-t border-[#313131]">
                        <div className="flex items-center justify-between pb-4">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-[#0099ff]" />
                                <h4 className="text-xl text-white/90">Development Workspace</h4>
                            </div>
                            {isEditing && (
                                <button 
                                    type="button" 
                                    onClick={() => router.push(`/creator/workspace/plugin/${initialData?.id}/editor`)}
                                    className="px-4 h-8 text-[10px] font-black uppercase bg-[#313131] border border-[#444] hover:bg-[#444] text-white rounded-md tracking-widest transition-all shadow-lg flex items-center gap-2"
                                >
                                    <FileCode className="w-3.5 h-3.5" />
                                    Switch to Full File IDE
                                </button>
                            )}
                        </div>

                        <div className="h-[480px] rounded-md border border-[#313131] bg-white overflow-hidden shadow-2xl relative">
                             <iframe
                                title="Safe Runtime Preview"
                                className="w-full h-full"
                                srcDoc={`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <style>
                                            body { margin: 0; padding: 2rem; font-family: -apple-system, system-ui, sans-serif; background: white; color: black; }
                                            .container { border: 2px solid #f4f4f4; border-radius: 12px; padding: 2rem; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                                            .btn { background: #0099ff; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 11px; margin: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; transition: 0.2s; }
                                            .btn:hover { background: #0088ee; transform: scale(1.02); }
                                            .runtime-tag { font-size: 9px; color: #ccc; font-weight: 900; margin-bottom: 20px; letter-spacing: 0.2em; border-bottom: 1px solid #f4f4f4; padding-bottom: 8px; }
                                        </style>
                                        <script type="module">
                                            window.falbor = {
                                                registerPlugin: (p) => {
                                                    const root = document.getElementById('root');
                                                    if (p.chatInputButtons) {
                                                       p.chatInputButtons.forEach(b => {
                                                          const btn = document.createElement('button');
                                                          btn.className = 'btn';
                                                          btn.innerText = b.tooltip || 'Action';
                                                          btn.onclick = () => alert(b.tooltip);
                                                          root.appendChild(btn);
                                                       });
                                                    }
                                                },
                                                sendPrompt: (p) => console.log('EMULATED PROMPT:', p),
                                                getMessages: () => []
                                            };
                                            try { ${files.find(f => f.path === 'index.js')?.content} } catch(e) { console.error(e); }
                                        </script>
                                    </head>
                                    <body>
                                        <div class="container">
                                            <div class="runtime-tag flex items-center gap-2">
                                                FALBOR RUNTIME ENGINE
                                            </div>
                                            <div id="root"></div>
                                        </div>
                                    </body>
                                    </html>
                                `}
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
