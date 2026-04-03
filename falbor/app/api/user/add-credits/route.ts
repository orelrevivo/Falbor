import { db } from "@/config/db"
import { userCredits } from "@/config/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const body = await request.json()
    const { amount = 500, reason = "added_api_key" } = body // Default $5.00

    let creditRecord = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .then((r) => r[0])

    if (!creditRecord) {
      creditRecord = await db
        .insert(userCredits)
        .values({
          userId,
          balance: amount,
        })
        .returning()
        .then((r) => r[0])
    } else {
      await db
        .update(userCredits)
        .set({
          balance: creditRecord.balance + amount,
        })
        .where(eq(userCredits.userId, userId))
    }

    return new Response(JSON.stringify({ success: true, newBalance: (creditRecord?.balance || 0) + amount }), {
      status: 200,
    })
  } catch (error) {
    console.error("[API/add-credits] Error:", error)
    return new Response(JSON.stringify({ error: "Failed to add balance" }), { status: 500 })
  }
}