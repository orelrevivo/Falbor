// app/api/subscribe/route.ts
import { auth } from '@clerk/nextjs/server'
import { db } from '@/config/db'
import { userCredits } from '@/config/schema'
import { eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { subscriptionId, tier } = body

  if (!subscriptionId || !tier) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const balanceMap: Record<string, number> = {
    standard: 2000, // $20.00
    pro: 5000,      // $50.00
    teams: 10000,   // $100.00
  }

  const balancePerMonth = balanceMap[tier]
  if (!balancePerMonth) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Check if record exists, create if not
  let record = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).then(r => r[0])
  if (!record) {
    await db.insert(userCredits).values({
      userId,
      balance: balancePerMonth, // Add initial month's balance
      lastRegenTime: new Date(),
      lastClaimedGiftId: null,
      lastMonthlyClaim: null,
      lastDispense: new Date(),
      subscriptionTier: tier,
      balancePerMonth,
      paypalSubscriptionId: subscriptionId,
      stripeCustomerId: null,
    })
  } else {
    await db
      .update(userCredits)
      .set({
        paypalSubscriptionId: subscriptionId,
        subscriptionTier: tier,
        balancePerMonth,
        lastDispense: new Date(),
        balance: sql`${userCredits.balance} + ${balancePerMonth}`,
      })
      .where(eq(userCredits.userId, userId))
  }

  return NextResponse.json({ success: true })
}