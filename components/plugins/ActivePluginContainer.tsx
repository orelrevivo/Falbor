"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Sparkles, Move } from "lucide-react"
import { useWorkbench } from "@/lib/workbench-context"

/**
 * Renders a floating, draggable window for an active plugin
 * that resides entirely inside the chat window.
 */
export function ActivePluginContainer() {
    const { activePluginId, setActivePluginId } = useWorkbench()

    const [loading, setLoading] = useState(false)
    const [pluginName, setPluginName] = useState("AI Plugin")
    const [pluginCode, setPluginCode] = useState("")
    const [frameHeight, setFrameHeight] = useState(300)

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'PLUGIN_RESIZE') {
                setFrameHeight(e.data.height)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    useEffect(() => {
        if (!activePluginId) return;
        setLoading(true)

        const fetchPlugin = async () => {
            try {
                const res = await fetch(`/api/plugins/${activePluginId}`)
                if (res.ok) {
                    const data = await res.json()
                    setPluginName(data.name || "Plugin")
                    setPluginCode(data.code || "")
                }
            } catch (e) {
                console.error("Failed to load plugin data", e)
            } finally {
                setLoading(false)
            }
        }

        fetchPlugin()
    }, [activePluginId])

    if (!activePluginId) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                drag
                dragMomentum={false}
                dragListener={true}
                className="fixed z-[999] top-24 right-8 w-[400px] flex flex-col pointer-events-none"
            >
                {/* Glassmorphic Header */}
                <div className="h-11 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-t-xl flex items-center justify-between px-4 cursor-move pointer-events-auto select-none">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="font-bold text-[12px] text-gray-700 tracking-tight">{pluginName}</span>
                    </div>

                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setActivePluginId(null)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-900"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Container */}
                <div className="bg-white border-x border-b border-gray-200/50 shadow-2xl rounded-b-xl overflow-hidden pointer-events-auto bg-white min-h-[100px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Architecting UI...</p>
                        </div>
                    ) : pluginCode ? (
                        <iframe
                            title="Plugin View"
                            style={{ height: Math.max(150, frameHeight), width: '100%' }}
                            className="border-none w-full"
                            srcDoc={`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { 
                                            margin: 0; padding: 1.5rem; 
                                            font-family: -apple-system, system-ui, sans-serif; 
                                            background: white; 
                                            color: #1e293b;
                                            font-size: 14px;
                                        }
                                        * { box-sizing: border-box; }
                                        button { cursor: pointer; }
                                    </style>
                                    <script type="module">
                                        window.falbor = {
                                            registerPlugin: (p) => window.parent.falbor?.registerPlugin(p),
                                            sendPrompt: (p) => window.parent.falbor?.sendPrompt(p),
                                            setActivePlugin: (id) => window.parent.falbor?.setActivePlugin(id),
                                            getMessages: () => window.parent.falbor?.getMessages() || []
                                        };

                                        const sendHeight = () => {
                                            const ht = document.documentElement.scrollHeight;
                                            window.parent.postMessage({ type: 'PLUGIN_RESIZE', height: ht }, '*');
                                        };
                                        const ro = new ResizeObserver(sendHeight);
                                        ro.observe(document.body);
                                        window.addEventListener('load', sendHeight);
                                        setTimeout(sendHeight, 200);
                                    </script>
                                </head>
                                <body>
                                    <div id="falbor-plugin-root"></div>
                                    <script type="module">
                                        try {
                                            ${pluginCode}
                                        } catch (e) {
                                            document.body.innerHTML = '<div style="color:red; font-size:12px; font-family:mono;">Plugin Error: ' + e.message + '</div>';
                                        }
                                    </script>
                                </body>
                                </html>
                            `}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                            <Sparkles className="w-8 h-8 text-gray-200" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Interface Defined</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
