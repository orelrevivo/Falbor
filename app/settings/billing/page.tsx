"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CreditCard, History, ArrowUpCircle, Wallet } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BillingPage() {
    const [subscription, setSubscription] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [creditsRes, historyRes] = await Promise.all([
                    fetch("/api/user/credits"),
                    fetch("/api/user/credits?type=billing")
                ])

                if (creditsRes.ok) {
                    const data = await creditsRes.json()
                    setSubscription(data)
                }

                if (historyRes.ok) {
                    const data = await historyRes.json()
                    setHistory(data)
                }
            } catch (err) {
                console.error("Failed to fetch billing data:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const isFree = !subscription || subscription.subscriptionTier === 'none' || subscription.subscriptionTier === 'free'

    return (
        <div className="flex flex-col gap-10 p-8 max-w-6xl mx-auto w-full min-h-screen">
            {/* Header */}
            <header className="flex flex-col gap-3 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0099ff]/20 rounded-md">
                        <CreditCard className="w-6 h-6 text-[#0099ff]" />
                    </div>
                    <h1 className="text-2xl font-semibold">
                        Billing & Subscriptions
                    </h1>
                </div>
                <p className="text-muted-foreground text-md max-w-2xl leading-relaxed">
                    Manage your subscription plans and view your payment history.
                </p>
            </header>

            <div className="grid gap-6">
                {/* Balance Section */}
                <div className="py-4 px-6 border border-border rounded-sm bg-card shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Falbor Balance</h2>
                            <p className="text-sm text-muted-foreground">
                                Your current balance available for AI and API usage.
                            </p>
                        </div>
                        <div className="text-2xl font-black text-[#0099ff]">
                            ${((subscription?.balance || 0) / 100).toFixed(2)}
                        </div>
                    </div>

                    <div className="mt-2 p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-card rounded-full border border-border">
                                <Wallet className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Available Credit: <span className="font-bold text-foreground">${((subscription?.balance || 0) / 100).toFixed(2)}</span>
                            </div>
                        </div>
                        <Button variant="outline" className="h-8 text-xs font-bold border-border bg-card hover:bg-muted">
                            Add Credits
                        </Button>
                    </div>
                </div>

                {/* Subscription Section */}
                <div className="py-4 px-6 border border-border rounded-sm bg-card shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Current Subscription</h2>
                            <p className="text-sm text-muted-foreground">
                                {isFree ? "You are currently on the free plan." : `You are currently on the ${subscription.subscriptionTier} plan.`}
                            </p>
                        </div>
                        {isFree && (
                            <Link href="/pricing">
                                <Button className="bg-[#0099ff] hover:bg-[#0088ee] text-white flex items-center gap-2">
                                    <ArrowUpCircle className="w-4 h-4" />
                                    Upgrade Plan
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="mt-2 p-4 bg-muted/50 rounded-lg border border-border italic text-muted-foreground">
                        {isFree ? (
                            "No active subscriptions found. Upgrade to unlock premium features."
                        ) : (
                            `Registered: Active ${subscription.subscriptionTier} Subscription`
                        )}
                    </div>
                </div>

                {/* Billing History Section */}
                <div className="py-4 px-6 border border-border rounded-sm bg-card shadow-xs flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-6">
                        <History className="w-5 h-5 text-muted-foreground/50" />
                        <h2 className="text-lg font-semibold text-foreground">Billing History</h2>
                    </div>

                    {isLoading ? (
                        <div className="py-10 text-center text-muted-foreground">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                            No payment history found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border text-sm text-muted-foreground font-medium">
                                        <th className="pb-3 pr-4">Date</th>
                                        <th className="pb-3 px-4">Subscription</th>
                                        <th className="pb-3 px-4 text-right">Amount</th>
                                        <th className="pb-3 pl-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-border/50">
                                    {history.map((item) => (
                                        <tr key={item.id} className="group hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                                            <td className="py-4 pr-4 text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-foreground capitalize">
                                                {item.planName}
                                            </td>
                                            <td className="py-4 px-4 text-right text-muted-foreground">
                                                ${(item.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 pl-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
