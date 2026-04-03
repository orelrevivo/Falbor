"use server"

import { auth } from "@clerk/nextjs/server"

export async function generatePluginWithAI(data: { hint: string, model: string }) {
    const { userId } = await auth()
    if (!userId) {
        throw new Error("Unauthorized")
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
        throw new Error("OpenRouter API Key not configured")
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://falbor.com",
                "X-Title": "Falbor - Plugin Generation",
            },
            body: JSON.stringify({
                model: data.model || "google/gemini-3.1-flash-lite-preview",
                messages: [
                    {
                        role: "system",
                        content: `You are the Falbor Professional Plugin Architect. Your task is to generate high-quality, professional, and fully functional plugins for the Falbor website builder.
                        
                        THE PLUGIN MUST BE ROBUST:
                        - Use modular, clean JavaScript.
                        - Avoid placeholders like '/* logic here */'.
                        - Implement real, useful features based on the hint.
                        - Handle potential errors gracefully.

                        THE PLUGIN MUST USE THE FALBOR BRIDGE:
                        1. window.falbor.registerPlugin(pluginObject): Register hooks for the UI.
                           - chatInputButtons: Buttons shown next to chat input (icon, tooltip, onClick).
                           - sidebarLinks: Links shown in the project sidebar (icon, label, onClick).
                           - previewToolbarButtons: Buttons shown above the site preview.
                        2. context object passed to onClick:
                           - context.sendPrompt(string, isAutomated=true): Sends a message to the AI. 'isAutomated' means the message is sent immediately without user confirmation.
                           - context.setActivePlugin(id|null): Opens/closes the floating plugin window (using your plugin's ID).
                           - context.getMessages(): Returns the current chat message history.
                           - context.setPreviewUrl(url): Updates the URL of the site preview.

                        EXAMPLE OF A PREMIUM "AUTO-DEBUGGER" PLUGIN:
                        window.falbor.registerPlugin({
                            id: "auto-debugger",
                            chatInputButtons: [{
                                icon: "Bug",
                                tooltip: "Scan for bugs and fix",
                                onClick: (ctx) => {
                                    const history = ctx.getMessages();
                                    const lastAssistant = history.filter(m => m.role === 'assistant').pop();
                                    if (lastAssistant) {
                                      ctx.sendPrompt("I detected a potential issue in your last response: " + lastAssistant.content.substring(0, 100) + "... Please review it for bugs.");
                                    } else {
                                      ctx.sendPrompt("Please scan my current code for any potential bugs or performance bottlenecks.");
                                    }
                                }
                            }]
                        });

                        REQUIRED JSON STRUCTURE:
                        {
                            "name": "Concise Name",
                            "tagline": "Catchy tagline",
                            "summary": "High-level summary",
                            "description": "Professional markdown description",
                            "reviewInstructions": "Detailed steps to test",
                            "files": [
                              {"path": "index.js", "content": "..."},
                              {"path": "utils.js", "content": "..."},
                              {"path": "styles.css", "content": "..."}
                            ],
                            "code": "FINAL EXECUTABLE JAVASCRIPT. This is the entry point that MUST call window.falbor.registerPlugin and can import logic from the other files if needed (though for simplicity, it should be the final bundled result)."
                        }

                        Return ONLY valid JSON. No markdown blocks.`
                    },
                    {
                        role: "user",
                        content: `Hint: ${data.hint}\nOutput the plugin JSON.`
                    }
                ]
            }),
        })

        if (!response.ok) {
            console.error("Openrouter Error:", await response.text())
            throw new Error("Failed to generate with AI")
        }

        const json = await response.json()
        const contentStr = json?.choices?.[0]?.message?.content || "{}"

        let cleanedObj = {}
        try {
            // Remove markdown code blocks if present
            const jsonText = contentStr.replace(/```json/g, "").replace(/```/g, "").trim()
            cleanedObj = JSON.parse(jsonText)
        } catch (e) {
            const match = contentStr.match(/\{[\s\S]*\}/)
            if (match) {
                cleanedObj = JSON.parse(match[0])
            }
        }

        return cleanedObj as {
            name?: string,
            tagline?: string,
            summary?: string,
            description?: string,
            reviewInstructions?: string,
            code?: string,
            files?: { path: string; content: string }[]
        }
    } catch (e) {
        console.error(e)
        throw new Error("AI generation failed")
    }
}
