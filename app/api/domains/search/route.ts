import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { userCredits } from "@/config/schema"
import { eq } from "drizzle-orm"

const GODADDY_BASE_URL =
    process.env.GODADDY_ENV === "production"
        ? "https://api.godaddy.com"
        : "https://api.ote-godaddy.com"

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check Pro subscription
        const [credits] = await db
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1)

        if (!credits || !["pro", "enterprise"].includes(credits.subscriptionTier)) {
            return NextResponse.json(
                { error: "Custom domains require a Pro subscription" },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get("query")?.trim()

        if (!query || query.length < 2) {
            return NextResponse.json(
                { error: "Query must be at least 2 characters", results: [] },
                { status: 400 }
            )
        }

        const apiKey = process.env.GODADDY_API_KEY
        const apiSecret = process.env.GODADDY_API_SECRET

        if (!apiKey || !apiSecret) {
            console.error("[DOMAIN SEARCH] Missing GoDaddy credentials")
            return NextResponse.json(
                { error: "Domain search is not configured on the server", results: [] },
                { status: 500 }
            )
        }

        const headers = {
            Authorization: `sso-key ${apiKey}:${apiSecret}`,
            "Content-Type": "application/json",
        }

        // Normalize query: if no TLD, try .com for exact
        const exactDomain = query.includes(".") ? query : `${query}.com`

        let results: Array<{
            domain: string
            available: boolean
            price: number
            currency: string
        }> = []

        let errorMessage: string | null = null

        // ── Exact availability check ─────────────────────────────────────────────
        try {
            const availableRes = await fetch(
                `${GODADDY_BASE_URL}/v1/domains/available?domain=${encodeURIComponent(exactDomain)}&checkType=FAST`,
                { headers, cache: "no-store" }
            )

            if (availableRes.ok) {
                const exact = await availableRes.json()
                if (exact && typeof exact.available === "boolean") {
                    results.push({
                        domain: exact.domain,
                        available: exact.available,
                        price: exact.price ? exact.price / 1000000 : 0,
                        currency: exact.currency || "USD",
                    })
                }
            } else {
                const status = availableRes.status
                const errText = await availableRes.text().catch(() => "")
                console.error(`[DOMAIN AVAILABLE] ${status} - ${exactDomain}: ${errText}`)

                if (status === 403) {
                    errorMessage = "Domain availability check restricted. Your GoDaddy account needs 50+ domains for production access."
                } else if (status === 429) {
                    errorMessage = "Rate limit reached. Try again in a minute."
                }
            }
        } catch (fetchErr) {
            console.error("[DOMAIN AVAILABLE FETCH ERROR]", fetchErr)
        }

        // ── Suggestions ───────────────────────────────────────────────────────────
        try {
            const suggestRes = await fetch(
                `${GODADDY_BASE_URL}/v1/domains/suggest?query=${encodeURIComponent(query)}&limit=10&waitMs=2000`,
                { headers, cache: "no-store" }
            )

            if (suggestRes.ok) {
                const suggestions = await suggestRes.json()
                if (Array.isArray(suggestions)) {
                    for (const s of suggestions) {
                        if (s.domain && s.domain !== exactDomain) {
                            results.push({
                                domain: s.domain,
                                available: true, // suggestions usually available, but could verify if needed
                                price: s.price ? s.price / 1000000 : 0,
                                currency: s.currency || "USD",
                            })
                        }
                    }
                }
            } else {
                console.error(`[DOMAIN SUGGEST] ${suggestRes.status} - ${query}`)
            }
        } catch (fetchErr) {
            console.error("[DOMAIN SUGGEST FETCH ERROR]", fetchErr)
        }

        // Optional: in development, add dummy data if empty (remove in prod!)
        // if (process.env.NODE_ENV === "development" && results.length === 0) {
        //   results = [
        //     { domain: `${query}-test.xyz`, available: true, price: 1.99, currency: "USD" },
        //     { domain: `${query}2026.online`, available: true, price: 2.99, currency: "USD" },
        //   ]
        // }

        const responseBody = {
            results,
            message: errorMessage || (results.length === 0 ? "No available domains found for this search" : null),
        }

        return NextResponse.json(responseBody)
    } catch (error) {
        console.error("[DOMAIN SEARCH GLOBAL ERROR]", error)
        return NextResponse.json(
            { error: "Domain search failed", results: [] },
            { status: 500 }
        )
    }
}