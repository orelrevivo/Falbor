"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader } from "lucide-react"

interface SignupChartProps {
    projectId: string
}

interface SignupData {
    date: string
    count: number
}

export function SignupChart({ projectId }: SignupChartProps) {
    const [data, setData] = useState<SignupData[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<7 | 30 | 90>(30)

    useEffect(() => {
        fetchSignupStats()
    }, [projectId, period])

    const fetchSignupStats = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/projects/${projectId}/supabase/analytics/signups?days=${period}`)
            if (res.ok) {
                const { stats } = await res.json()
                setData(stats || [])
            }
        } catch (err) {
            console.error("Failed to fetch signup stats:", err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    const totalSignups = data.reduce((sum, item) => sum + parseInt(item.count as any), 0)

    return (
        <div className="bg-white border rounded-md p-6 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Signups</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {totalSignups} {totalSignups === 1 ? "user" : "users"} in the last {period} days
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days as 7 | 30 | 90)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${period === days
                                ? "bg-white text-blue-600 border"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            {days}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : data.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                    <p className="text-sm text-gray-400">No signup data available</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "12px",
                                padding: "8px 12px",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            labelFormatter={formatDate}
                            formatter={(value: any) => [value, "Signups"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#colorSignups)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
