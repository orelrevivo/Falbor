"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"; // assuming shadcn/ui or similar
import { Button } from "@/components/ui/button";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// ────────────────────────────────────────────────
//   Assume you have a way to know if user is logged in
//   In real app: use context, zustand, next-auth session, etc.
// ────────────────────────────────────────────────
const useAuth = () => {
    // Replace with your real auth logic (e.g. useSession from next-auth)
    const [isLoggedIn, setIsLoggedIn] = useState(false); // ← dummy — replace!
    return { isLoggedIn };
};

const tiers = [
    {
        name: "Free",
        price: 0,
        credits: 10,
        features: [
            "Public and private projects",
            "10 credits per month",
            "Falbor branding on websites",
            "Website hosting",
            "Unlimited databases",
        ],
        gradient: "from-[#0099ff69]/20 to-transparent",
    },
    {
        name: "Standard",
        price: 10,
        credits: 20,
        features: [
            "Public and private projects",
            "20 credits per month",
            "No Falbor branding on websites",
            "Website hosting",
            "Unlimited databases",
            "Import from github",
        ],
        gradient: "from-[#0099ff69]/20 to-transparent",
    },
    {
        name: "Pro",
        price: 25,
        credits: 50,
        popular: true,
        features: [
            "Public and private projects",
            "50 credits per month",
            "No Falbor branding on websites",
            "Website hosting",
            "Unused tokens roll over",
            "Custom domain support",
            "SEO boosting",
            "Unlimited databases",
            "Import from github",
        ],
        coming: "Advanced features coming soon",
        gradient: "from-[#0099ff69]/20 via-[#0099ff69]/20 to-transparent",
    },
];

const PricingSection = () => {
    const { isLoggedIn } = useAuth(); // ← replace with real auth hook
    const router = useRouter();

    const [selectedTier, setSelectedTier] = useState<typeof tiers[number] | null>(null);

    const openPaymentModal = (tier: typeof tiers[number]) => {
        if (tier.price === 0) return; // Free shouldn't open modal
        setSelectedTier(tier);
    };

    const handleButtonClick = (tier: typeof tiers[number]) => {
        if (!isLoggedIn) {
            if (tier.price === 0) {
                router.push("/sign-up"); // or "/register" — your route
            } else {
                router.push("/sign-in"); // or "/login"
            }
            return;
        }

        // Logged in → different behavior
        if (tier.price === 0) {
            // Optional: show toast "You're already on Free" or do nothing
            return;
        }

        openPaymentModal(tier);
    };

    const onApprove = async (data: any, actions: any) => {
        try {
            const details = await actions.order.capture();

            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: details.id,
                    tier: selectedTier?.name.toLowerCase(),
                    planPrice: selectedTier?.price,
                }),
            });

            if (res.ok) {
                alert("Subscription activated!");
                setSelectedTier(null);
                // Optional: refresh user data / redirect
            } else {
                alert("Payment captured but activation failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Something went wrong.");
        }
    };

    return (
        <>
            <section className="bg-white py-[120px] md:py-[160px]">
                <div className="container px-6 mx-auto max-w-[1280px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={`relative overflow-hidden bg-[#F7F7F2] rounded-[32px] p-10 flex flex-col min-h-[480px] ${tier.popular ? "" : ""
                                    }`}
                            >
                                <div
                                    className={`absolute bottom-0 left-0 w-full h-[180px] bg-gradient-to-t ${tier.gradient} pointer-events-none`}
                                />

                                <div className="relative z-10 flex-grow">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-[24px] font-semibold text-black">{tier.name}</h3>
                                        {tier.popular && (
                                            <span className="bg-black text-white text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                Popular
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-[48px] font-medium text-black">${tier.price}</span>
                                        <span className="text-[18px] text-[#4A4A4A]">/mo</span>
                                    </div>

                                    <p className="text-[14px] font-semibold text-[#4A4A4A] mb-4">
                                        Includes {tier.credits} credits:
                                    </p>

                                    <ul className="space-y-3 mb-6">
                                        {tier.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-[#FF5F1F] mt-0.5 flex-shrink-0" />
                                                <span className="text-[15px] text-[#4A4A4A]">{feature}</span>
                                            </li>
                                        ))}
                                        {tier.coming && (
                                            <li className="flex items-start gap-2 bg-white/50 backdrop-blur-sm border border-[#E6E6E6] text-[#4A4A4A] px-3 py-1.5 rounded-lg text-[13px] font-medium">
                                                <span>{tier.coming}</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="relative z-10 mt-10">
                                    <button
                                        onClick={() => handleButtonClick(tier)}
                                        disabled={isLoggedIn && tier.price === 0} // optional
                                        className={`w-full text-[14px] font-semibold py-4 rounded-full transition-all ${tier.popular
                                            ? "bg-black text-white hover:opacity-90"
                                            : "bg-white text-black border border-[#E6E6E6] hover:bg-black hover:text-white"
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {tier.price === 0
                                            ? isLoggedIn
                                                ? "Current Plan"
                                                : "Start for free"
                                            : `Get ${tier.name}`}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Enterprise bar remains unchanged */}
                    {/* <div className="mt-6">
                        <a
                            href="/contact"
                            className="w-full flex items-center justify-center py-5 bg-[#DDE7E9] rounded-2xl md:rounded-full group transition-colors hover:bg-[#D5DFE1]"
                        >
                            <span className="text-[14px] font-medium text-[#4A4A4A] flex items-center gap-1">
                                Looking for enterprise solutions?{" "}
                                <span className="font-semibold text-black">Contact sales →</span>
                            </span>
                        </a>
                    </div> */}
                </div>
            </section>

            {/* ────────────────────────────────────────────────
          PAYPAL MODAL (only shown when logged in + paid tier clicked)
      ──────────────────────────────────────────────── */}
            <Dialog open={!!selectedTier} onOpenChange={() => setSelectedTier(null)}>
                <DialogContent className="sm:max-w-md bg-white p-6">
                    {selectedTier && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">
                                    Subscribe to {selectedTier.name}
                                </DialogTitle>
                                <p className="text-muted-foreground mt-1">
                                    ${selectedTier.price}/month – {selectedTier.credits} credits included
                                </p>
                            </DialogHeader>

                            <div className="py-6">
                                <PayPalButtons
                                    style={{ layout: "vertical", label: "subscribe" }}
                                    createSubscription={(data, actions) => {
                                        return actions.subscription.create({
                                            plan_id: "YOUR_PAYPAL_PLAN_ID_HERE", // ← create plans in PayPal dashboard!
                                            // OR use dynamic — but usually better to use fixed plans
                                            custom_id: selectedTier.name.toLowerCase(), // optional
                                        });
                                    }}
                                    onApprove={async (data, actions) => {
                                        // subscription approval
                                        console.log("Subscription ID:", data.subscriptionID);
                                        // You should call your backend here to activate subscription
                                        alert("Subscription activated! (ID: " + data.subscriptionID + ")");
                                        setSelectedTier(null);
                                    }}
                                    onError={(err) => {
                                        console.error("PayPal error", err);
                                        alert("Payment failed. Please try again.");
                                    }}
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedTier(null)}>
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default function WrappedPricingSection() {
    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!paypalClientId) {
        return <div className="text-red-600">PayPal not configured.</div>;
    }

    return (
        <PayPalScriptProvider
            options={{
                clientId: paypalClientId,
                currency: "USD",
                intent: "subscription", // important for recurring!
                vault: true,            // needed for subscriptions
                components: "buttons",
            }}
        >
            <PricingSection />
        </PayPalScriptProvider>
    );
}