import Link from "next/link"

interface CreditsSectionProps {
    credits: number
    maxCredits: number
    progressValue: number
    secondsUntilRegen: number
    subscriptionTier: string
    formatTime: (seconds: number) => string
}

export function CreditsSection({
    credits,
    maxCredits,
    progressValue,
    secondsUntilRegen,
    subscriptionTier,
    formatTime,
}: CreditsSectionProps) {
    return (
        <div className="px-2 py-2 space-y-2 border rounded-sm shadow-sm">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">Credits</span>
                <span className="font-semibold text-gray-900">
                    {credits} / {maxCredits}
                </span>
            </div>

            <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-[#c1603cdc] transition-all rounded-full"
                    style={{ width: `${progressValue}%` }}
                />
            </div>

            <div className="flex justify-between text-[11px] text-gray-400">
                <span>Monthly refill</span>
                <span>{formatTime(secondsUntilRegen)}</span>
            </div>

            {subscriptionTier === "none" && (
                <Link
                    href="/pricing"
                    className="block text-[11px] font-medium text-[#c1603cdc] hover:underline"
                >
                    Upgrade plan
                </Link>
            )}
        </div>
    )
}
