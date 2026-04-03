import { db } from "@/config/db"
import { files } from "@/config/schema"
import { ToolResult } from "@/lib/mcp/actions"

const FREEPIK_API_BASE = "https://api.freepik.com/v1"

export const freepikActions = {
  /**
   * Search for icons on Freepik
   */
  async searchIcons(query: string, limit: number = 10): Promise<ToolResult> {
    const apiKey = process.env.FREEPIK_API_KEY
    if (!apiKey) return { success: false, error: "Freepik API key not configured" }

    try {
      const res = await fetch(`${FREEPIK_API_BASE}/icons?term=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: {
          "x-freepik-api-key": apiKey,
          Accept: "application/json",
        },
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: `Freepik API Error: ${err.message}` }
    }
  },

  /**
   * Download a specific icon and save it to the project files
   */
  async downloadIcon(
    projectId: string,
    messageId: string,
    iconId: string,
    fileName?: string
  ): Promise<ToolResult> {
    const apiKey = process.env.FREEPIK_API_KEY
    if (!apiKey) return { success: false, error: "Freepik API key not configured" }

    try {
      // 1. Get the download URL (requesting SVG by default for websites)
      const downloadRes = await fetch(`${FREEPIK_API_BASE}/icons/${iconId}/download`, {
        headers: {
          "x-freepik-api-key": apiKey,
          Accept: "application/json",
        },
      })
      if (!downloadRes.ok) throw new Error(await downloadRes.text())
      const { url } = await downloadRes.json()

      // 2. Fetch the actual file content
      const fileRes = await fetch(url)
      if (!fileRes.ok) throw new Error("Failed to fetch the icon file from the provided URL")
      
      const content = await fileRes.text()
      const contentType = fileRes.headers.get("content-type") || ""
      const isSvg = contentType.includes("svg") || content.trim().startsWith("<svg")

      // 3. Save to database
      const path = `public/icons/${fileName || `icon-${iconId}`}.${isSvg ? "svg" : "png"}`
      
      await db.insert(files).values({
        projectId,
        messageId,
        path,
        content: isSvg ? content : Buffer.from(content).toString("base64"), // Base64 if not SVG
        language: isSvg ? "svg" : "base64",
        additions: content.split("\n").length,
        deletions: 0,
      })

      return { 
        success: true, 
        data: { 
          path, 
          message: `Successfully saved icon to ${path}` 
        } 
      }
    } catch (err: any) {
      return { success: false, error: `Freepik Download Error: ${err.message}` }
    }
  },
}
