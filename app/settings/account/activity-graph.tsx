"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserActivity } from "@/app/actions/activity"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ActivityGraphProps {
    userId: string
    createdAt?: number | Date
}

interface DayActivity {
    date: string // YYYY-MM-DD
    count: number
    level: 0 | 1 | 2 | 3 | 4
}

// Helper to get level from count
const getLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 5) return 2
    if (count <= 10) return 3
    return 4
}

export default function ActivityGraph({ userId, createdAt }: ActivityGraphProps) {
    const [data, setData] = useState<DayActivity[]>([])
    const [loading, setLoading] = useState(true)
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(currentYear)
    const [years, setYears] = useState<number[]>([currentYear])

    useEffect(() => {
        if (createdAt) {
            const startYear = new Date(createdAt).getFullYear()
            const yearList = []
            for (let y = currentYear; y >= startYear; y--) {
                yearList.push(y)
            }
            setYears(yearList)
        }
    }, [createdAt, currentYear])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const activityData = await getUserActivity(userId, year)

                // Create a map for quick lookup
                const activityMap = new Map(activityData.map((item: any) => [item.date, item.count]))

                const days: DayActivity[] = []
                const startDate = new Date(year, 0, 1)
                const endDate = new Date(year, 11, 31)

                // Generate all days for the year
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split("T")[0]
                    const count = activityMap.get(dateStr) || 0
                    days.push({
                        date: dateStr,
                        count,
                        level: getLevel(count),
                    })
                }
                setData(days)
            } catch (error) {
                console.error("Failed to fetch activity data", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userId, year])

    const totalContributions = data.reduce((acc, curr) => acc + curr.count, 0)

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-zinc-800">
                    Activity in {year}
                </h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-8 bg-white border text-black hover:bg-white hover:text-black">
                            {year} <ChevronDown className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {years.map((y) => (
                            <DropdownMenuItem key={y} onClick={() => setYear(y)}>
                                {y}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="border rounded-md p-4 bg-white/50 backdrop-blur-sm shadow-xs">

                <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
                    <div className="grid grid-rows-7 grid-flow-col gap-1">
                        {data.map((day) => (
                            <TooltipProvider key={day.date}>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={cn(
                                                "h-3 w-3 rounded-sm cursor-pointer transition-colors",
                                                day.level === 0 && "bg-zinc-100 dark:bg-zinc-800",
                                                day.level === 1 && "bg-emerald-200",
                                                day.level === 2 && "bg-emerald-400",
                                                day.level === 3 && "bg-emerald-600",
                                                day.level === 4 && "bg-emerald-800"
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                            {day.count} contributions on {day.date}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>

                {/* <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-600" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-800" />
                </div>
                <span>More</span>
            </div> */}
            </div>
        </div>
    )
}
