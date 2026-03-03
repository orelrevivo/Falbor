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
import { Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { CreditsSection } from "./CreditsSection"

export function UserProfileMenu() {
    const { user, isLoaded } = useUser()
    const clerk = useClerk()

    const [balance, setBalance] = useState<number>(0)
    const [balancePerMonth, setBalancePerMonth] = useState<number>(500)
    const [subscriptionTier, setSubscriptionTier] = useState<string>("none")
    const [secondsUntilRegen, setSecondsUntilRegen] = useState<number>(0)

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

        fetchBalance()
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

    if (!isLoaded || !user) {
        return (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        )
    }

    const progressValue = Math.min((balance / balancePerMonth) * 100, 100)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative h-8 w-8 cursor-pointer rounded-full overflow-hidden ring-1 ring-transparent hover:ring-gray-200 transition-all">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback className="text-xs">
                            {user.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-60 p-1 mr-3 bg-white border border-gray-200 shadow-xs rounded-lg mt-[-20px]"
                align="end"
                forceMount
            >
                {/* User Info */}
                <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8 border border-gray-100">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback className="text-xs">
                            {user.firstName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                        <p className="text-xs font-semibold text-gray-900 leading-none">
                            {user.fullName || user.username}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[150px]">
                            {user.primaryEmailAddress?.emailAddress}
                        </p>
                    </div>
                </div>

                {/* Credits */}
                <CreditsSection
                    credits={balance}
                    maxCredits={balancePerMonth}
                    progressValue={progressValue}
                    secondsUntilRegen={secondsUntilRegen}
                    subscriptionTier={subscriptionTier}
                    formatTime={formatTime}
                />


                <div className="h-px my-0.5" />

                {/* Actions */}
                <DropdownMenuItem
                    onClick={() => clerk.openUserProfile()}
                    className="gap-2 px-3 py-2 rounded-md cursor-pointer"
                >
                    <Settings className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-700">Account Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => clerk.signOut()}
                    className="gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-red-50 group"
                >
                    <LogOut className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-500" />
                    <span className="text-xs text-gray-700 group-hover:text-red-600">
                        Sign Out
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
