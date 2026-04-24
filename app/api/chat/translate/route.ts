import { auth } from "@clerk/nextjs/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { text, targetLanguage = "English" } = await request.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text into ${targetLanguage}. 
Provide ONLY the translated text, no explanations, no quotes, no extra words. 
If the text is already in ${targetLanguage}, return it as is.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0,
    })

    const translatedText = response.choices[0].message.content?.trim()

    return new Response(JSON.stringify({ translatedText }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Translation error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
