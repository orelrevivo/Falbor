import { db } from '@/config/db'
import { eq, sql } from 'drizzle-orm'
import { userApiUsage, userCredits, userApiKeys } from '@/config/schema'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free"
const PRICE_PER_1K_TOKENS = 2; // $0.02 per 1k tokens

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-falbor-key',
    'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
    })
}

export async function GET() {
    return NextResponse.json({ 
        status: 'active', 
        message: 'Falbor AI API is online. Use POST with x-falbor-key to chat.' 
    }, {
        headers: CORS_HEADERS
    })
}

export async function POST(req: Request) {
    try {
        const apiKeyString = req.headers.get('x-falbor-key')
        const openRouterKey = process.env.OPENROUTER_API_KEY

        if (!apiKeyString) {
            return NextResponse.json({ error: 'Missing API Key (x-falbor-key)' }, { status: 401, headers: CORS_HEADERS })
        }

        if (!openRouterKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured on server' }, { status: 500, headers: CORS_HEADERS })
        }

        // 1. Validate the API Key
        const apiKeyRecord = await db
            .select()
            .from(userApiKeys)
            .where(eq(userApiKeys.key, apiKeyString))
            .then(r => r[0])

        if (!apiKeyRecord) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401, headers: CORS_HEADERS })
        }

        const userId = apiKeyRecord.userId

        // 2. Check User's Actual Balance ($)
        const credits = await db
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .then(r => r[0])

        if (!credits || credits.balance <= 0) {
            return NextResponse.json({ 
                error: 'Insufficient Balance', 
                message: 'Your Falbor balance is empty. Recharge in settings to continue using the API.' 
            }, { status: 402, headers: CORS_HEADERS })
        }

        // 3. Proxy to OpenRouter
        const body = await req.json()
        const { messages, systemPrompt } = body

        const chatMessages = []
        if (systemPrompt) {
            chatMessages.push({ role: "system", content: systemPrompt })
        }
        chatMessages.push(...messages)

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://falbor.xyz",
                "X-Title": "Falbor AI API Service",
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: chatMessages,
                max_tokens: 4000,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("[Falbor AI Proxy] OpenRouter error:", errorText)
            return NextResponse.json({ error: 'AI Service Error', details: errorText }, { 
                status: response.status,
                headers: CORS_HEADERS
            })
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content || ""
        
        // 4. Calculate Tokens and Cost
        // If OpenRouter provides usage, we use it; otherwise, we estimate
        const promptTokens = data.usage?.prompt_tokens || JSON.stringify(chatMessages).length / 4;
        const completionTokens = data.usage?.completion_tokens || text.length / 4;
        const totalTokens = promptTokens + completionTokens;
        
        // Cost in cents (rounding up to at least 1 cent for long messages)
        const costInCents = Math.max(1, Math.ceil((totalTokens / 1000) * PRICE_PER_1K_TOKENS));

        // 5. Update: Balance Deduction and Usage Logging (Sequential as Neon HTTP doesn't support transactions)
        
        // Deduct from Balance
        await db.update(userCredits)
            .set({ balance: sql`${userCredits.balance} - ${costInCents}` })
            .where(eq(userCredits.userId, userId))

        // Update Global API Usage Stats
        await db.insert(userApiUsage)
            .values({
                userId,
                messageCount: 1,
                totalCost: costInCents,
                lastReset: new Date(),
            })
            .onConflictDoUpdate({
                target: userApiUsage.userId,
                set: {
                    messageCount: sql`${userApiUsage.messageCount} + 1`,
                    totalCost: sql`${userApiUsage.totalCost} + ${costInCents}`
                }
            })

        // Update Specific Key Stats
        await db.update(userApiKeys)
            .set({
                messageCount: sql`${userApiKeys.messageCount} + 1`,
                lastUsedAt: new Date()
            })
            .where(eq(userApiKeys.id, apiKeyRecord.id))

        return NextResponse.json({
            content: text,
            cost: costInCents / 100, // Return cost in dollars for display
            balanceRemaining: (credits.balance - costInCents) / 100,
            usage: data.usage
        }, { headers: CORS_HEADERS })

    } catch (error: any) {
        console.error("[API/AI/Chat] POST error:", error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { 
            status: 500,
            headers: CORS_HEADERS
        })
    }
}
