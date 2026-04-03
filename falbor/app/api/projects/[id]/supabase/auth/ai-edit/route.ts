// app/api/projects/[id]/supabase/auth/ai-edit/route.ts
import { auth } from "@clerk/nextjs/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { prompt, subject, body, templateType } = await request.json()

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
        }

        const googleKey = process.env.GOOGLE_API_KEY
        if (!googleKey) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(googleKey)
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" })

        const systemPrompt = `
      You are an expert HTML email designer specializing in Supabase Auth templates.
      Your task is to modify an existing Supabase Auth email template based on a user's prompt.
      
      CRITICAL RULES:
      1. PRESERVE ALL Supabase variables like {{ .ConfirmationURL }}, {{ .Token }}, {{ .Email }}, {{ .NewEmail }}, {{ .Data }}. DO NOT CHANGE OR REMOVE THEM.
      2. Use clean, modern, responsive inline CSS for the HTML.
      3. Focus on rich aesthetics: vibrant colors, good typography, and professional layouts.
      4. The template type is: ${templateType}.
      5. Return your response in JSON format with two keys: "subject" and "body".
      6. Do NOT include markdown code blocks in your response, ONLY the raw JSON.
      
      User Prompt: ${prompt}
      Current Subject: ${subject}
      Current Body: ${body}
    `

        const result = await model.generateContent(systemPrompt)
        const responseText = result.response.text()

        // Attempt to parse JSON from response
        try {
            // Handle cases where the model might still wrap in markdown
            const jsonStr = responseText.replace(/```json|```/g, "").trim()
            const parsed = JSON.parse(jsonStr)
            return NextResponse.json(parsed)
        } catch (parseError) {
            console.error("AI response parse error:", responseText)
            return NextResponse.json({
                error: "Failed to parse AI response. Please try again.",
                raw: responseText // Returning raw for debugging if needed (careful with UI)
            }, { status: 500 })
        }

    } catch (error: any) {
        console.error("AI Template Edit error:", error)
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
