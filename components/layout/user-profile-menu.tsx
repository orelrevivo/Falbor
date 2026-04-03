"use client"

import { useUser, useClerk } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useRouter, usePathname } from "next/navigation"
import { User, Settings, LogOut, Zap, DollarSign, Shield } from "lucide-react"
import { CreditsSection } from "./CreditsSection"
import { AutomationDialog } from "@/components/models/AutomationDialog"
import { israelTimeToUTC, utcToIsraelTime } from "@/lib/common/timezone/timezone-utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Button } from "../ui/button"
import Link from "next/link"
import { DashboardIcon, DashIcon } from "@radix-ui/react-icons"

interface AutomationSettings {
    selectedModel: string
    dailyTime: string
    maxMessages: number
    isActive: boolean
    timezone: string
}

type ModelOption = {
    label: string
    icon: string
    color: string
    soon?: string
}

type ModelType =
    | "gemini"
    | "claude-sonnet-4.6"
    | "claude-opus-4.6"
    | "claude-haiku-4.5"
    | "glm-4.7-flash"

const modelOptions: Record<ModelType, ModelOption> = {
    gemini: { label: "Gemini 3.1 Pro", icon: "/icons/gemini.png", color: "text-blue-400" },
    "claude-sonnet-4.6": { label: "Claude Sonnet 4.6", icon: "/icons/claude.png", color: "text-purple-400" },
    "claude-opus-4.6": { label: "Claude Opus 4.6", icon: "/icons/claude.png", color: "text-purple-500" },
    "claude-haiku-4.5": { label: "Claude Haiku 4.5", icon: "/icons/claude.png", color: "text-purple-300" },
    "glm-4.7-flash": { label: "GLM 4.7 Flash", icon: "/icons/zAI.png", color: "text-teal-400" },
}

export function UserProfileMenu() {
    const router = useRouter()
    const pathname = usePathname()
    const isCreator = pathname?.startsWith("/creator")

    const { user, isLoaded } = useUser()
    const clerk = useClerk()

    const [balance, setBalance] = useState<number>(0)
    const [balancePerMonth, setBalancePerMonth] = useState<number>(500)
    const [subscriptionTier, setSubscriptionTier] = useState<string>("none")
    const [secondsUntilRegen, setSecondsUntilRegen] = useState<number>(0)

    const [automationOpen, setAutomationOpen] = useState(false)
    const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null)
    const [automationLoading, setAutomationLoading] = useState(false)

    useEffect(() => {
        if (!isLoaded || !user) return

        const fetchBalance = async () => {
            try {
                const res = await fetch("/api/user/credits")
                if (res.ok) {
                    const data = await res.json()

                    setBalance(data.balance || 0)
                    setBalancePerMonth(data.balancePerMonth || 500)
                    setSubscriptionTier(data.subscriptionTier || "none")
                    setSecondsUntilRegen(data.secondsUntilNextRegen || 0)
                }
            } catch (error) {
                console.error("Failed to fetch balance:", error)
            }
        }

        const fetchAutomation = async () => {
            try {
                const res = await fetch("/api/automation")
                if (res.ok) {
                    const data = await res.json()
                    setAutomationSettings(data)
                }
            } catch (error) {
                console.error("Failed to fetch automation:", error)
            }
        }

        fetchBalance()
        fetchAutomation()
    }, [isLoaded, user])

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "Now"

        const mins = Math.ceil(seconds / 60)
        const hours = Math.floor(mins / 60)
        const remainingMins = mins % 60

        if (hours > 0) {
            return `${hours}h ${remainingMins}m`
        }

        return `${mins}m`
    }

    const parseTime = (utcTime24: string) => {
        if (!utcTime24) {
            return { hour: 14, minute: 0, second: 0, timezone: "UTC+2 (IST)" }
        }

        const parts = utcTime24.split(":")

        return utcToIsraelTime(
            parts[0] || "11",
            parts[1] || "00",
            parts[2] || "00"
        )
    }

    const currentParsed = automationSettings
        ? parseTime(automationSettings.dailyTime)
        : { hour: 14, minute: 0, second: 0, timezone: "UTC+2 (IST)" }

    const updateTime = (
        key: "hour" | "minute" | "second",
        val: number | string
    ) => {
        if (!automationSettings) return

        const newUtcTime = israelTimeToUTC(
            key === "hour" ? Number(val) : currentParsed.hour,
            key === "minute" ? Number(val) : currentParsed.minute,
            key === "second" ? Number(val) : currentParsed.second
        )

        setAutomationSettings(prev =>
            prev ? { ...prev, dailyTime: newUtcTime } : prev
        )
    }

    const handleUpdateSettings = (
        updater: (prev: AutomationSettings) => AutomationSettings
    ) => {
        setAutomationSettings(prev => {
            if (!prev) return prev
            return updater(prev)
        })
    }

    const handleSave = async () => {
        if (!automationSettings) return

        setAutomationLoading(true)

        try {
            const res = await fetch("/api/automation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(automationSettings),
            })

            if (res.ok) {
                setAutomationSettings(await res.json())
                toast.success("Automation settings saved and scheduled.")
            }
        } catch (err) {
            console.error("Save failed:", err)
        } finally {
            setAutomationLoading(false)
            setAutomationOpen(false)
        }
    }

    const handleTestNow = async () => {
        if (!user?.id) return
        if (!automationSettings?.isActive) return alert("Please activate automation first!")

        if (confirm("Simulate daily run now? This will deduct credits and create a new project.")) {
            try {
                const res = await fetch(`/api/cron/daily?test=true`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id }),
                })

                if (res.ok) {
                    alert("Test run triggered!")
                } else {
                    const err = await res.text()
                    alert(`Test failed: ${err || "Unknown error"}`)
                }
            } catch (err) {
                alert("Error: " + (err as Error).message)
            }
        }
    }

    const progressValue = Math.min((balance / balancePerMonth) * 100, 100)

    if (!isLoaded || !user) {
        return (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        )
    }

    return (
        <div className="flex items-center gap-2">

            {/* Credits Button */}
            <Button
                className={`h-6.5 px-4 cursor-pointer rounded-sm text-[12px] font-medium transition-all flex items-center gap-2
                ${isCreator
                        ? "bg-[#313131] hover:bg-[#3a3a3a] text-white/90 border-none shadow-none"
                        : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-xs"
                    }`}
            >
                <DollarSign className={`w-2 h-2 ${isCreator ? "text-white/90" : "text-gray-800"}`} />
                <span>{(balance / 100).toFixed(2)}</span>
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="relative h-7 w-7 cursor-pointer rounded-full overflow-hidden transition-all shadow-sm">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback className="text-xs">
                                {user.firstName?.charAt(0) || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    className={`w-60 p-1 mr-3 rounded-lg
                    ${isCreator
                            ? "bg-[#313131] border-none shadow-none text-white/90"
                            : "bg-white border border-gray-200 shadow-xs"
                        }`}
                    align="end"
                    forceMount
                >
                    {/* SAME CONTENT — untouched except colors */}

                    <div className="flex items-center gap-2 p-2">
                        <Avatar className={`h-8 w-8 ${isCreator ? "" : "border border-gray-100"}`}>
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback className="text-xs">
                                {user.firstName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col">
                            <p className={`text-xs font-semibold ${isCreator ? "text-white" : "text-gray-900"}`}>
                                {user.fullName || user.username}
                            </p>

                            <p className={`text-[11px] truncate max-w-[150px] ${isCreator ? "text-white/60" : "text-gray-500"}`}>
                                {user.primaryEmailAddress?.emailAddress}
                            </p>
                        </div>
                    </div>

                    <CreditsSection
                        credits={balance}
                        maxCredits={balancePerMonth}
                        progressValue={progressValue}
                        secondsUntilRegen={secondsUntilRegen}
                        subscriptionTier={subscriptionTier}
                        formatTime={formatTime}
                    />

                    <div className={`h-px my-0.5 ${isCreator ? "bg-white/10" : ""}`} />

                    <DropdownMenuItem
                        onClick={() => router.push("/super-security")}
                        className={`gap-2 px-3 py-2 rounded-md cursor-pointer ${isCreator ? "hover:bg-white/10" : ""}`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs flex-1">Super Security</span>
                        <Badge className="text-[10px] px-1.5 py-0 h-4">New</Badge>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => router.push(`/creator/workspace`)}
                        className={`gap-2 px-3 py-2 rounded-md cursor-pointer ${isCreator ? "hover:bg-white/10" : ""}`}
                    >
                        <DashboardIcon className="w-3.5 h-3.5" />
                        <span className="text-xs flex-1">Creator Workspace</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => router.push(`/profile/${user.id}`)}
                        className={`gap-2 px-3 py-2 rounded-md cursor-pointer ${isCreator ? "hover:bg-white/10" : ""}`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span className="text-xs flex-1">Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => clerk.openUserProfile()}
                        className={`gap-2 px-3 py-2 rounded-md cursor-pointer ${isCreator ? "hover:bg-white/10" : ""}`}
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="text-xs">Account Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => clerk.signOut()}
                        className={`gap-2 px-3 py-2 rounded-md cursor-pointer ${isCreator ? "hover:bg-red-500/20" : "hover:bg-red-50"
                            }`}
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="text-xs">Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AutomationDialog
                open={automationOpen}
                onOpenChange={setAutomationOpen}
                automationSettings={automationSettings}
                onUpdateSettings={handleUpdateSettings}
                onSave={handleSave}
                onTestNow={handleTestNow}
                loading={automationLoading}
                modelOptions={modelOptions}
                currentParsed={currentParsed}
                onUpdateTime={updateTime}
            />
        </div>
    )
}