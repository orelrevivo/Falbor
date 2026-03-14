"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CreditCard, History, ArrowUpCircle } from "lucide-react"
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
            {/* Header - Matching MCP style */}
            <header className="flex flex-col gap-3 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#ff9900]/20 rounded-md">
                        <CreditCard className="w-6 h-6 text-[#ff9900]" />
                    </div>
                    <h1 className="text-2xl font-semibold">
                        Billing & Subscriptions
                    </h1>
                </div>
                <p className="text-zinc-500 text-md max-w-2xl leading-relaxed">
                    Manage your subscription plans and view your payment history.
                </p>
            </header>

            <div className="grid gap-6">
                {/* Subscription Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border border-zinc-200 rounded-xl bg-white shadow-sm flex flex-col gap-4"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900">Current Subscription</h2>
                            <p className="text-sm text-zinc-500">
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

                    <div className="mt-2 p-4 bg-zinc-50 rounded-lg border border-zinc-100 italic text-zinc-600">
                        {isFree ? (
                            "No active subscriptions found. Upgrade to unlock premium features."
                        ) : (
                            `Registered: Active ${subscription.subscriptionTier} Subscription`
                        )}
                    </div>
                </motion.div>

                {/* Billing History Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 border border-zinc-200 rounded-xl bg-white shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <History className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-lg font-semibold text-zinc-900">Billing History</h2>
                    </div>

                    {isLoading ? (
                        <div className="py-10 text-center text-zinc-500">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="py-10 text-center text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                            No payment history found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-zinc-100 text-sm text-zinc-400 font-medium">
                                        <th className="pb-3 pr-4">Date</th>
                                        <th className="pb-3 px-4">Subscription</th>
                                        <th className="pb-3 px-4 text-right">Amount</th>
                                        <th className="pb-3 pl-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-zinc-50">
                                    {history.map((item) => (
                                        <tr key={item.id} className="group hover:bg-zinc-50 transition-colors">
                                            <td className="py-4 pr-4 text-zinc-600">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-zinc-900 capitalize">
                                                {item.planName}
                                            </td>
                                            <td className="py-4 px-4 text-right text-zinc-600">
                                                ${(item.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 pl-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                    item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
