"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ColorSchemeSection() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const options = [
        {
            id: "light",
            label: "Light",
            icon: Sun,
            description: "Default light theme",
            preview: "bg-[#FAF9F5]"
        },
        {
            id: "dark",
            label: "Dark",
            icon: Moon,
            description: "Premium dark theme",
            preview: "bg-[#0F0F0F]"
        },
        {
            id: "system",
            label: "System",
            icon: Monitor,
            description: "Follow system settings",
            preview: "bg-gradient-to-r from-[#FAF9F5] to-[#0F0F0F]"
        }
    ]

    return (
        <Card className="shadow-xs rounded-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Sun className="w-5 h-5 dark:hidden" />
                    <Moon className="w-5 h-5 hidden dark:block" />
                    Color Scheme
                </CardTitle>
                <CardDescription>
                    Choose how you want the site to look.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {options.map((option) => {
                        const Icon = option.icon
                        const isActive = theme === option.id

                        return (
                            <button
                                key={option.id}
                                onClick={() => setTheme(option.id)}
                                className={cn(
                                    "flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200 group cursor-pointer",
                                    isActive 
                                        ? "border-[#0099ff] bg-[#0099ff]/5 shadow-sm" 
                                        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm dark:bg-[#1E1E21] dark:border-gray-800"
                                )}
                            >
                                <div className="flex items-center justify-between w-full mb-3">
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isActive ? "bg-[#0099ff] text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        isActive ? "bg-[#0099ff] border-[#0099ff]" : "border-gray-200 dark:border-gray-700"
                                    )}>
                                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="font-bold text-sm block">{option.label}</span>
                                    <span className={cn(
                                        "text-xs block",
                                        isActive ? "text-[#0099ff]/80" : "text-gray-500"
                                    )}>
                                        {option.description}
                                    </span>
                                </div>
                                
                                {/* Theme Preview Square */}
                                <div className={cn(
                                    "mt-4 w-full h-12 rounded-lg border border-gray-100 dark:border-gray-800",
                                    option.preview
                                )} />
                            </button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
