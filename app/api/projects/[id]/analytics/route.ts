import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/config/db"
import {
  projects,
  projectAnalyticsEvents,
  projectCollaborators,
  deployments,
} from "@/config/schema"
import { eq, and, gte, count, countDistinct, avg, sql } from "drizzle-orm"

function getPeriodDate(period: string): Date {
  const now = new Date()
  switch (period) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

// GET: Fetch aggregated analytics data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "7d"
  const metric = searchParams.get("metric") || "visitors"

  // Verify access
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = project.userId === userId
  if (!isOwner) {
    const [collab] = await db
      .select()
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId),
          eq(projectCollaborators.status, "accepted")
        )
      )
    if (!collab) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Check published status via deployments table
  const [deployment] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.projectId, projectId))
    .limit(1)

  const isPublished = !!deployment?.deploymentUrl
  const publishedUrl = deployment?.deploymentUrl || null

  const since = getPeriodDate(period)

  const baseWhere = and(
    eq(projectAnalyticsEvents.projectId, projectId),
    gte(projectAnalyticsEvents.createdAt, since)
  )

  const pageviewWhere = and(
    baseWhere,
    eq(projectAnalyticsEvents.type, "pageview")
  )

  // Summary metrics
  const [{ visitors }] = await db
    .select({ visitors: countDistinct(projectAnalyticsEvents.visitorId) })
    .from(projectAnalyticsEvents)
    .where(baseWhere)

  const [{ pageviews }] = await db
    .select({ pageviews: count() })
    .from(projectAnalyticsEvents)
    .where(pageviewWhere)

  // Avg duration (seconds) — exclude nulls
  const [{ avgDuration }] = await db
    .select({ avgDuration: avg(projectAnalyticsEvents.duration) })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.duration} IS NOT NULL`))

  // Bounce rate: sessions with only 1 pageview / total sessions
  const sessionCounts = await db
    .select({
      sessionId: projectAnalyticsEvents.sessionId,
      pvCount: count(),
    })
    .from(projectAnalyticsEvents)
    .where(pageviewWhere)
    .groupBy(projectAnalyticsEvents.sessionId)

  const totalSessions = sessionCounts.length
  const bounceSessions = sessionCounts.filter((s) => Number(s.pvCount) === 1).length
  const bounceRate = totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0

  // Build time-series for selected metric
  // Group by day (or hour for 24h)
  const isHourly = period === "24h"
  const truncFn = isHourly
    ? sql<string>`to_char(date_trunc('hour', ${projectAnalyticsEvents.createdAt}), 'HH24:MI')`
    : sql<string>`to_char(date_trunc('day', ${projectAnalyticsEvents.createdAt}), 'MM/DD')`

  let timeSeriesQuery
  if (metric === "visitors") {
    timeSeriesQuery = db
      .select({ label: truncFn, value: countDistinct(projectAnalyticsEvents.visitorId) })
      .from(projectAnalyticsEvents)
      .where(baseWhere)
      .groupBy(truncFn)
      .orderBy(truncFn)
  } else if (metric === "pageviews") {
    timeSeriesQuery = db
      .select({ label: truncFn, value: count() })
      .from(projectAnalyticsEvents)
      .where(pageviewWhere)
      .groupBy(truncFn)
      .orderBy(truncFn)
  } else if (metric === "bounce_rate") {
    // For bounce rate time series: sessions grouped by day
    timeSeriesQuery = db
      .select({ label: truncFn, value: count() })
      .from(projectAnalyticsEvents)
      .where(pageviewWhere)
      .groupBy(truncFn)
      .orderBy(truncFn)
  } else {
    // avg_duration
    timeSeriesQuery = db
      .select({ label: truncFn, value: avg(projectAnalyticsEvents.duration) })
      .from(projectAnalyticsEvents)
      .where(and(pageviewWhere, sql`${projectAnalyticsEvents.duration} IS NOT NULL`))
      .groupBy(truncFn)
      .orderBy(truncFn)
  }

  const timeSeries = await timeSeriesQuery

  // Breakdown data
  const topPages = await db
    .select({ value: projectAnalyticsEvents.page, count: count() })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.page} IS NOT NULL`))
    .groupBy(projectAnalyticsEvents.page)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  const topReferrers = await db
    .select({ value: projectAnalyticsEvents.referrer, count: count() })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.referrer} IS NOT NULL AND ${projectAnalyticsEvents.referrer} != ''`))
    .groupBy(projectAnalyticsEvents.referrer)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  const topCountries = await db
    .select({ value: projectAnalyticsEvents.country, count: count() })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.country} IS NOT NULL`))
    .groupBy(projectAnalyticsEvents.country)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  const topBrowsers = await db
    .select({ value: projectAnalyticsEvents.browser, count: count() })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.browser} IS NOT NULL`))
    .groupBy(projectAnalyticsEvents.browser)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  const topOS = await db
    .select({ value: projectAnalyticsEvents.os, count: count() })
    .from(projectAnalyticsEvents)
    .where(and(pageviewWhere, sql`${projectAnalyticsEvents.os} IS NOT NULL`))
    .groupBy(projectAnalyticsEvents.os)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  return NextResponse.json({
    isPublished,
    publishedUrl,
    summary: {
      visitors: Number(visitors) || 0,
      pageviews: Number(pageviews) || 0,
      bounceRate,
      avgDuration: avgDuration ? Math.round(Number(avgDuration)) : 0,
    },
    timeSeries: timeSeries.map((t) => ({ label: t.label, value: Number(t.value) || 0 })),
    breakdown: {
      pages: topPages.map((r) => ({ value: r.value || "(direct)", count: Number(r.count) })),
      referrers: topReferrers.map((r) => ({ value: r.value || "(direct)", count: Number(r.count) })),
      countries: topCountries.map((r) => ({ value: r.value || "Unknown", count: Number(r.count) })),
      browsers: topBrowsers.map((r) => ({ value: r.value || "Unknown", count: Number(r.count) })),
      os: topOS.map((r) => ({ value: r.value || "Unknown", count: Number(r.count) })),
    },
  })
}

// POST: Record an analytics event (called from published sites)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  // Verify project exists and is published
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId))
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [dep] = await db
    .select({ deploymentUrl: deployments.deploymentUrl })
    .from(deployments)
    .where(eq(deployments.projectId, projectId))
    .limit(1)

  if (!dep?.deploymentUrl) {
    return NextResponse.json({ error: "Not published" }, { status: 404 })
  }

  const body = await req.json()
  const {
    sessionId,
    visitorId,
    type = "pageview",
    page,
    referrer,
    duration,
  } = body

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }

  // Parse User-Agent for browser / OS detection
  const ua = req.headers.get("user-agent") || ""
  const browser = detectBrowser(ua)
  const os = detectOS(ua)
  const device = detectDevice(ua)

  // Geo from CF header or x-forwarded-for
  const country = req.headers.get("cf-ipcountry") || req.headers.get("x-country") || null

  // Is new visitor: check if visitorId was seen before for this project
  let isNewVisitor = false
  if (visitorId) {
    const [prev] = await db
      .select({ id: projectAnalyticsEvents.id })
      .from(projectAnalyticsEvents)
      .where(
        and(
          eq(projectAnalyticsEvents.projectId, projectId),
          eq(projectAnalyticsEvents.visitorId, visitorId)
        )
      )
      .limit(1)
    isNewVisitor = !prev
  }

  await db.insert(projectAnalyticsEvents).values({
    projectId,
    sessionId,
    visitorId: visitorId || null,
    type,
    page: page || null,
    referrer: referrer || null,
    country,
    browser,
    os,
    device,
    duration: duration ? Number(duration) : null,
    isNewVisitor,
  })

  return NextResponse.json({ ok: true })
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge"
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera"
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome"
  if (/Firefox\//i.test(ua)) return "Firefox"
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari"
  if (/MSIE|Trident/i.test(ua)) return "Internet Explorer"
  return "Other"
}

function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return "Windows"
  if (/Mac OS X/i.test(ua)) return "macOS"
  if (/Android/i.test(ua)) return "Android"
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS"
  if (/Linux/i.test(ua)) return "Linux"
  return "Other"
}

function detectDevice(ua: string): string {
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad/i.test(ua)) return "tablet"
    return "mobile"
  }
  return "desktop"
}
