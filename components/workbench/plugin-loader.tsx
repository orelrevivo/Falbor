"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

export function PluginLoader({ pluginId }: { pluginId: string }) {
    useEffect(() => {
        if (!pluginId) return

        const loadPlugin = async () => {
            try {
                const res = await fetch(`/api/plugins/${pluginId}`)
                if (res.ok) {
                    const pluginData = await res.json()
                    
                    if (!pluginData.code) return;

                    console.log(`[Plugin System] Initializing plugin: ${pluginData.name}`)
                    
                    const rootId = `plugin-script-${pluginId}`
                    if (document.getElementById(rootId)) return;

                    // Create a context for the plugin
                    const context = {
                        sendPrompt: (prompt: string) => (window as any).falbor.sendPrompt(prompt),
                        setActivePlugin: (id: string | null) => (window as any).falbor.setActivePlugin(id),
                        getMessages: () => (window as any).falbor.getMessages(),
                        projectId: (window as any).falbor.getProject()?.id
                    }

                    // Wrap the code to inject the context and handle registration
                    // We expect the AI code to call window.falbor.registerPlugin(...)
                    const script = document.createElement("script")
                    script.id = rootId
                    script.type = "module"
                    script.innerHTML = `
                        (function() {
                            const pluginContext = ${JSON.stringify(context)};
                            ${pluginData.code}
                        })();
                    `
                    document.body.appendChild(script)

                    toast.success(`Plugin "${pluginData.name}" loaded`)
                }
            } catch (err) {
                console.error("Failed to load plugin", err)
            }
        }
        
        loadPlugin()

        return () => {
            const script = document.getElementById(`plugin-script-${pluginId}`)
            if (script) document.body.removeChild(script)
        }
    }, [pluginId])

    return null
}
