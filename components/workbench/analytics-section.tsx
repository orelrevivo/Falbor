"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  Eye,
  TrendingDown,
  Clock,
  Globe,
  Monitor,
  BarChart3,
  Loader2,
  ChevronDown,
  Rocket,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Period = "24h" | "7d" | "30d" | "90d"
type Metric = "visitors" | "pageviews" | "bounce_rate" | "avg_duration"

interface BreakdownItem {
  value: string
  count: number
}

interface AnalyticsData {
  isPublished: boolean
  publishedUrl: string | null
  summary: {
    visitors: number
    pageviews: number
    bounceRate: number
    avgDuration: number
  }
  timeSeries: { label: string; value: number }[]
  breakdown: {
    pages: BreakdownItem[]
    referrers: BreakdownItem[]
    countries: BreakdownItem[]
    browsers: BreakdownItem[]
    os: BreakdownItem[]
  }
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "24h", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
]

const METRIC_CARDS: { id: Metric; label: string; icon: React.ElementType; format: (v: number) => string }[] = [
  { id: "visitors", label: "Visitors", icon: Users, format: (v) => v.toLocaleString() },
  { id: "pageviews", label: "Pageviews", icon: Eye, format: (v) => v.toLocaleString() },
  { id: "bounce_rate", label: "Bounce Rate", icon: TrendingDown, format: (v) => `${v}%` },
  { id: "avg_duration", label: "Avg Duration", icon: Clock, format: (v) => formatDuration(v) },
]

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

const BREAKDOWN_SECTIONS = [
  { key: "pages" as const, label: "Page" },
  { key: "referrers" as const, label: "Referrer" },
  { key: "countries" as const, label: "Country" },
  { key: "browsers" as const, label: "Browser" },
  { key: "os" as const, label: "Operating System" },
]

// Auto-refresh interval: 30 seconds
const AUTO_REFRESH_MS = 30_000

interface AnalyticsSectionProps {
  projectId: string
}

export function AnalyticsSection({ projectId }: AnalyticsSectionProps) {
  const [period, setPeriod] = useState<Period>("7d")
  const [periodOpen, setPeriodOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric>("visitors")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async (p: Period, m: Metric, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics?period=${p}&metric=${m}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      const json = await res.json()
      setData(json)
      setLastRefreshed(new Date())
    } catch (e) {
      setError("Failed to load analytics data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [projectId])

  // Fetch when period or metric changes
  useEffect(() => {
    fetchData(period, selectedMetric)
  }, [period, selectedMetric, fetchData])

  // Auto-refresh every 30s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      fetchData(period, selectedMetric, true)
    }, AUTO_REFRESH_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [period, selectedMetric, fetchData])

  const handleRefresh = () => {
    fetchData(period, selectedMetric, true)
    // Reset interval
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      fetchData(period, selectedMetric, true)
    }, AUTO_REFRESH_MS)
  }

  const handleMetricClick = (metric: Metric) => setSelectedMetric(metric)

  const handlePeriodSelect = (p: Period) => {
    setPeriod(p)
    setPeriodOpen(false)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm">Loading analytics...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  if (!data) return null

  const selectedMetricCard = METRIC_CARDS.find((m) => m.id === selectedMetric)!
  const currentValue =
    selectedMetric === "visitors" ? data.summary.visitors
      : selectedMetric === "pageviews" ? data.summary.pageviews
        : selectedMetric === "bounce_rate" ? data.summary.bounceRate
          : data.summary.avgDuration

  // Format last refreshed time
  const lastRefreshedLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Analytics</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track how users interact with your published app
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Last refreshed label */}
          {lastRefreshedLabel && (
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              Updated {lastRefreshedLabel}
            </span>
          )}

          {/* Manual refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh analytics"
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-all text-zinc-500 hover:text-zinc-800",
              refreshing && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>

          {/* Period selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-zinc-200"
              onClick={() => setPeriodOpen((v) => !v)}
            >
              {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
              <ChevronDown className={cn("h-3 w-3 transition-transform", periodOpen && "rotate-180")} />
            </Button>
            {periodOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 py-1 min-w-[120px]">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handlePeriodSelect(opt.value)}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50 transition-colors",
                      period === opt.value ? "font-medium text-zinc-900" : "text-zinc-600"
                    )}
                  >
                    Last {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {METRIC_CARDS.map((card) => {
          const value =
            card.id === "visitors" ? data.summary.visitors
              : card.id === "pageviews" ? data.summary.pageviews
                : card.id === "bounce_rate" ? data.summary.bounceRate
                  : data.summary.avgDuration
          const isActive = selectedMetric === card.id
          return (
            <button
              key={card.id}
              onClick={() => handleMetricClick(card.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-all cursor-pointer",
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900"
              )}
            >
              <div className={cn("flex items-center gap-1.5 mb-2", isActive ? "text-zinc-300" : "text-zinc-400")}>
                <card.icon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{card.label}</span>
              </div>
              <div className={cn("text-xl font-bold", isActive ? "text-white" : "text-zinc-900")}>
                {card.format(value)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-600">
            {selectedMetricCard.label} over time
          </span>
          {refreshing && <Loader2 className="h-3 w-3 animate-spin text-zinc-300 ml-auto" />}
        </div>
        {data.timeSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-zinc-400 gap-2">
            <span className="text-sm">No data yet</span>
            <span className="text-xs text-zinc-300">Visit your published site to start tracking</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.timeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,.07)",
                }}
                labelStyle={{ fontWeight: 600, color: "#18181b" }}
                formatter={(value: number) => [selectedMetricCard.format(value), selectedMetricCard.label]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#18181b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#18181b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 gap-3">
        {BREAKDOWN_SECTIONS.map((section) => {
          const items = data.breakdown[section.key]
          const maxCount = items.length > 0 ? items[0].count : 1
          return (
            <div key={section.key} className="bg-white border border-zinc-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-zinc-700 mb-3">{section.label}</h3>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-zinc-700 truncate max-w-[70%]">{item.value}</span>
                          <span className="text-xs text-zinc-500 font-medium">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Not Published Overlay */}
      {!data.isPublished && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-white/70 rounded-xl flex items-center justify-center z-10">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl p-8 text-center max-w-xs mx-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-zinc-100 mx-auto mb-4">
              <Rocket className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">App not published yet</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Publish your app to start tracking how users are interacting with your app.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
