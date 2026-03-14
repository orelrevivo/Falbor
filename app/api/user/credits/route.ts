import { auth } from '@clerk/nextjs/server'
import { db } from '@/config/db'
import { eq, sum, gt, desc, sql, count } from 'drizzle-orm'
import { userCredits, giftEvents, billingHistory, messages, projects } from '@/config/schema'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REGEN_INTERVAL_MINUTES = 400
const INTERVAL_MS = REGEN_INTERVAL_MINUTES * 60 * 1000

// Helper to check if a month has passed since last monthly claim
function isMonthPassed(lastClaim: any): boolean {
  if (!lastClaim) return true
  const lastDate = new Date(lastClaim)
  if (isNaN(lastDate.getTime())) return true

  const today = new Date()
  const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate())
  if (nextMonth.getDate() !== lastDate.getDate()) {
    nextMonth.setDate(0)
  }
  return today >= nextMonth
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    console.error('PayPal credentials missing');
    throw new Error('PayPal configuration error');
  }

  const isSandbox = clientId.startsWith('EJ');
  const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('PayPal OAuth error:', errorData);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function isSubscriptionActive(subscriptionId: string | null): Promise<boolean> {
  if (!subscriptionId) return false;

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const isSandbox = clientId?.startsWith('EJ');
    const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`PayPal subscription check failed with status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.status === 'ACTIVE' || data.status === 'APPROVED';
  } catch (error) {
    console.error('Error checking PayPal subscription status:', error);
    return false;
  }
}

async function applyRegeneration(userId: string) {
  let record = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .then(r => r[0])

  if (!record) {
    await db.insert(userCredits).values({
      userId,
      balance: 150, // $1.50
      lastRegenTime: new Date(),
      lastClaimedGiftId: null,
      lastMonthlyClaim: null,
      lastDispense: null,
      subscriptionTier: 'none',
      balancePerMonth: 0,
      paypalSubscriptionId: null,
      stripeCustomerId: null,
    })
    record = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .then(r => r[0])
  }

  const now = new Date()
  const nowMs = now.getTime()
  const isPaid = record.subscriptionTier !== 'none' && record.paypalSubscriptionId !== null

  if (isPaid) {
    const active = await isSubscriptionActive(record.paypalSubscriptionId);
    if (!active) {
      await db
        .update(userCredits)
        .set({
          subscriptionTier: 'none',
          balancePerMonth: 0,
          paypalSubscriptionId: null,
        })
        .where(eq(userCredits.userId, userId));
      return applyRegeneration(userId);
    }

    let newBalance = record.balance
    let lastDispense = record.lastDispense
    let secondsUntilNextRegen = 0

    if (!lastDispense || isMonthPassed(lastDispense)) {
      newBalance += record.balancePerMonth
      lastDispense = now
      await db
        .update(userCredits)
        .set({
          balance: newBalance,
          lastDispense: now,
        })
        .where(eq(userCredits.userId, userId))
    } else {
      const d = new Date(lastDispense)
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate())
      if (nextMonth.getDate() !== d.getDate()) {
        nextMonth.setDate(0)
      }
      const timeLeftMs = nextMonth.getTime() - nowMs
      secondsUntilNextRegen = Math.max(0, Math.ceil(timeLeftMs / 1000))
    }

    return {
      balance: newBalance,
      secondsUntilNextRegen,
      record: { ...record, balance: newBalance, lastDispense },
      pendingMonthly: 0
    }
  } else {
    // Free user logic
    const pendingMonthly = isMonthPassed(record.lastMonthlyClaim) ? 150 : 0
    const lastClaim = record.lastMonthlyClaim || record.lastRegenTime
    const lastDate = new Date(lastClaim)
    const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate())
    if (nextMonth.getDate() !== lastDate.getDate()) {
      nextMonth.setDate(0)
    }
    const timeLeftMs = nextMonth.getTime() - nowMs
    const secondsUntilNextRegen = Math.max(0, Math.ceil(timeLeftMs / 1000))

    // Daily Message Limit Logic (5 messages then 9 hour wait)
    let dailyMessageCount = record.dailyMessageCount || 0
    let secondsUntilDailyReset = 0

    if (dailyMessageCount >= 5 && record.lastDailyMessageReset) {
      const resetTime = new Date(record.lastDailyMessageReset).getTime()
      const nineHoursMs = 9 * 60 * 60 * 1000
      const elapsed = nowMs - resetTime
      
      if (elapsed >= nineHoursMs) {
        // Reset count
        dailyMessageCount = 0
        await db.update(userCredits)
          .set({ dailyMessageCount: 0, lastDailyMessageReset: null })
          .where(eq(userCredits.userId, userId))
      } else {
        secondsUntilDailyReset = Math.ceil((nineHoursMs - elapsed) / 1000)
      }
    }

    return {
      balance: record.balance,
      lastRegenTime: record.lastRegenTime,
      secondsUntilNextRegen,
      record: { ...record, dailyMessageCount }, // update local record with potentially reset count
      pendingMonthly,
      dailyMessageCount,
      secondsUntilDailyReset
    }
  }
}

async function calculatePendingGift(userRecord: any) {
  const lastGiftId = userRecord?.lastClaimedGiftId
  let pendingGift = 0

  if (lastGiftId) {
    const lastGiftRecord = await db
      .select({ createdAt: giftEvents.createdAt })
      .from(giftEvents)
      .where(eq(giftEvents.id, lastGiftId))
      .then(r => r[0])

    if (lastGiftRecord?.createdAt) {
      const unclaimedSum = await db
        .select({ total: sum(giftEvents.amount) })
        .from(giftEvents)
        .where(gt(giftEvents.createdAt, lastGiftRecord.createdAt))
        .then(r => r[0].total ?? BigInt(0))

      pendingGift = Number(unclaimedSum)
    }
  } else {
    const totalSum = await db
      .select({ total: sum(giftEvents.amount) })
      .from(giftEvents)
      .then(r => r[0].total ?? BigInt(0))

    pendingGift = Number(totalSum)
  }

  return pendingGift
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'billing') {
      const history = await db.select()
        .from(billingHistory)
        .where(eq(billingHistory.userId, userId))
        .orderBy(desc(billingHistory.createdAt))

      return NextResponse.json(history)
    }

    if (type === 'usage') {
      const usage = await db.select({
        projectId: messages.projectId,
        projectTitle: projects.title,
        createdAt: projects.createdAt,
        totalCost: sum(messages.cost),
        messageCount: count(messages.id),
      })
        .from(messages)
        .innerJoin(projects, eq(messages.projectId, projects.id))
        .where(eq(projects.userId, userId))
        .groupBy(messages.projectId, projects.title, projects.createdAt)
        .orderBy(desc(projects.createdAt))

      return NextResponse.json(usage)
    }

    const data = await applyRegeneration(userId)
    const pendingGift = data.record.subscriptionTier === 'none' ? await calculatePendingGift(data.record) : 0

    return NextResponse.json({
      balance: data.balance,
      pendingGift,
      pendingMonthly: data.pendingMonthly,
      secondsUntilNextRegen: data.secondsUntilNextRegen,
      subscriptionTier: data.record.subscriptionTier,
      dailyMessageCount: (data as any).dailyMessageCount ?? 0,
      secondsUntilDailyReset: (data as any).secondsUntilDailyReset ?? 0,
    })
  } catch (error: any) {
    console.error("[API/Credits] GET error:", error)
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message,
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await applyRegeneration(userId)
    const record = data.record
    const isPaid = record.subscriptionTier !== 'none' && record.paypalSubscriptionId !== null

    let body: any = null
    try {
      body = await request.json()
    } catch { }

    if (body?.addGift !== undefined && typeof body.addGift === 'number' && body.addGift > 0 && !isPaid) {
      await db.insert(giftEvents).values({ amount: body.addGift })
      return NextResponse.json({ success: true })
    }

    if (body?.claimGift === true && !isPaid) {
      const pendingGift = await calculatePendingGift(record)
      if (pendingGift <= 0) return NextResponse.json({ error: 'No gift' }, { status: 400 })

      const latestGift = await db.select().from(giftEvents).orderBy(desc(giftEvents.createdAt)).limit(1).then(r => r[0])
      if (!latestGift) return NextResponse.json({ error: 'No gift events' }, { status: 400 })

      await db.update(userCredits).set({
        balance: record.balance + pendingGift,
        lastClaimedGiftId: latestGift.id
      }).where(eq(userCredits.userId, userId))

      return NextResponse.json({ success: true, newBalance: record.balance + pendingGift })
    }

    if (body?.claimMonthly === true && !isPaid) {
      if (!isMonthPassed(record.lastMonthlyClaim)) {
        return NextResponse.json({ error: 'Not yet available' }, { status: 400 })
      }
      const newBal = record.balance + 150
      await db.update(userCredits).set({
        balance: newBal,
        lastMonthlyClaim: new Date()
      }).where(eq(userCredits.userId, userId))

      return NextResponse.json({ success: true, newBalance: newBal })
    }

    if (body?.orderId && body?.amount) {
      const added = Number(body.amount);
      if (isNaN(added) || added <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

      let updates: any = { balance: record.balance + added };
      if (body.tier && record.subscriptionTier === 'none') {
        const tierLower = body.tier.toLowerCase();
        updates.subscriptionTier = tierLower;
        const balanceMap: Record<string, number> = { standard: 2000, pro: 5000, teams: 10000 };
        updates.balancePerMonth = balanceMap[tierLower] || 0;
      }
      await db.update(userCredits).set(updates).where(eq(userCredits.userId, userId));

      // Record in billing history
      await db.insert(billingHistory).values({
        userId,
        amount: added,
        planName: body.tier || "Credit Add-on",
        status: "completed",
      });

      return NextResponse.json({ success: true, newBalance: record.balance + added });
    }

    // Default: deduct
    const cost = body?.cost || 5
    if (record.balance < cost) return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 })

    // Increment daily message count for free users
    if (record.subscriptionTier === 'none') {
      const dailyCount = (record.dailyMessageCount || 0) + 1
      const isNowZero = dailyCount >= 5
      await db.update(userCredits)
        .set({ 
          balance: record.balance - cost,
          dailyMessageCount: dailyCount,
          lastDailyMessageReset: isNowZero ? new Date() : record.lastDailyMessageReset
        })
        .where(eq(userCredits.userId, userId))
    } else {
      await db.update(userCredits).set({ balance: record.balance - cost }).where(eq(userCredits.userId, userId))
    }
    
    return NextResponse.json({ success: true, remainingBalance: record.balance - cost })

  } catch (error: any) {
    console.error("[API/Credits] POST error:", error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
