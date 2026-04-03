"use client"

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { Verified, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Navbar } from "@/components/navbar/navbar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const tiers = [
  {
    name: "Free",
    price: 0,
    balanceAmount: 150, // $1.50
    features: [
      "Public and private projects",
      "$1.50 balance per month",
      "Falbor branding on websites",
      "Website hosting",
      "Unlimited databases",
    ],
  },
  {
    name: "Standard",
    price: 20,
    balanceAmount: 2000, // $20.00
    features: [
      "Public and private projects",
      "$20.00 balance per month",
      "No Falbor branding on websites",
      "Website hosting",
      "Unlimited databases",
      "Import from github",
    ],
  },
  {
    name: "Pro",
    price: 50,
    balanceAmount: 5000, // $50.00
    popular: true,
    features: [
      "Public and private projects",
      "$50.00 balance per month",
      "No Falbor branding on websites",
      "Website hosting",
      "Unused balance roll over",
      "Custom domain support",
      "SEO boosting",
      "Unlimited databases",
      "Import from github",
    ],
    coming: "Advanced features coming soon",
  },
  {
    name: "Teams",
    price: 100,
    balanceAmount: 10000, // $100.00
    features: [
      "$100.00 balance per month",
      "Public and private projects",
      "No Falbor branding on websites",
      "Website hosting",
      "Unused balance roll over",
      "Custom domain support",
      "SEO boosting",
      "Unlimited databases",
      "Import from github",
    ],
    coming: "Advanced features coming soon",
  },
]

const BALANCE_RATE = 1.0 // $1 per $1 added

function PricingContent() {
  const [subscriptionTier, setSubscriptionTier] = useState("none")
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(100)

  useEffect(() => {
    async function fetchTier() {
      const res = await fetch("/api/user/credits")
      if (res.ok) {
        const data = await res.json()
        setSubscriptionTier((data.subscriptionTier || "none").toLowerCase())
      }
      setIsLoading(false)
    }
    fetchTier()
  }, [])

  const onApprove = async (data: any, actions: any, balance: number, tier?: string) => {
    const details = await actions.order.capture()

    const body: any = {
      orderId: details.id,
      amount: balance, // passed in cents
    }

    if (tier) body.tier = tier.toLowerCase()

    const res = await fetch("/api/user/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      alert("Payment successful! Balance added.")

      const refreshRes = await fetch("/api/user/credits")
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setSubscriptionTier((refreshData.subscriptionTier || "none").toLowerCase())
      }
    } else {
      alert("Payment succeeded but balance update failed.")
    }
  }

  const price = selectedAmount * BALANCE_RATE

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="bg-transparent">
      <div className="container mx-auto py-10 px-4">

        {/* Title */}
        <h1 className="text-3xl font-bold mb-12 text-center text-black">
          <span className="text-black px-2 rounded-md BackgroundStyleButton">Upgrade</span> Plans &amp; Add Balance
        </h1>

        {/* CONNECTED PRICING TABLE */}
        <div className="flex flex-col md:flex-row max-w-7xl mx-auto border border-[#e6e6e6] rounded-md overflow-hidden">

          {tiers.map((tier, index) => {
            const isCurrentTier =
              (subscriptionTier === "none" && tier.name === "Free") ||
              subscriptionTier === tier.name.toLowerCase()

            return (
              <div
                key={tier.name}
                className={`
                  flex-1 p-6 text-black relative
                  ${tier.popular ? "bg-white z-10 scale-105 shadow-xl" : "bg-white"}
                  ${index !== tiers.length - 1 ? "md:border-r border-[#e6e6e6]" : ""}
                `}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute top-4 right-4 text-sm BackgroundStyleButton text-black px-2 py-1 rounded-md">
                    Popular
                  </div>
                )}

                <h2 className="text-2xl font-semibold mb-2">{tier.name}</h2>

                <p className="text-3xl font-bold mb-4">
                  ${tier.price}
                  <span className="text-sm font-normal"> /One-time subscription</span>
                </p>

                {/* Features */}
                <ul className="mb-6 space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Verified className="text-green-500 w-4 h-4 mt-1" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {tier.coming && (
                    <li className="flex items-start gap-2 bg-green-100 text-gray-800 px-2 py-1 rounded-sm">
                      <span>{tier.coming}</span>
                    </li>
                  )}
                </ul>

                {/* Actions */}
                {isCurrentTier ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-4">You are on this plan</p>

                    {tier.name !== "Free" && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="BackgroundStyleButton text-black px-3 py-1.5 rounded w-full cursor-pointer"
                      >
                        Add More Balance
                      </button>
                    )}
                  </div>
                ) : (
                  tier.name !== "Free" && (
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              amount: {
                                value: tier.price.toString(),
                                currency_code: "USD",
                              },
                            },
                          ],
                        })
                      }}
                      onApprove={(data, actions) =>
                        onApprove(data, actions, tier.balanceAmount, tier.name)
                      }
                    />
                  )
                )}
              </div>
            )
          })}
        </div>

        {/* ADD CREDITS MODAL */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="z-[9999] max-w-sm overflow-y-auto bg-[#ffffff] border-0 p-0 sm:max-w-md">
            <DialogHeader className="p-6 pb-6 mb-[-30px]">
              <DialogTitle className="text-black text-xl">
                Select Amount to Add
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full bg-white border-2 border-[#c15f3c] rounded-md px-3 py-2 text-left flex justify-between items-center">
                  ${selectedAmount}.00 balance - ${price.toFixed(2)}
                  <ChevronDown className="ml-2" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-full z-[99999] shadow-lg"
                  side="bottom"
                  align="start"
                >
                  {[5, 10, 20, 50, 100].map(
                    (amt) => (
                      <DropdownMenuItem
                        key={amt}
                        onSelect={() => setSelectedAmount(amt)}
                      >
                        ${amt}.00 balance - ${(amt * BALANCE_RATE).toFixed(2)}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <PayPalButtons
                style={{ layout: "vertical" }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          value: price.toString(),
                          currency_code: "USD",
                        },
                      },
                    ],
                  })
                }}
                onApprove={(data, actions) =>
                  onApprove(data, actions, selectedAmount * 100).then(() =>
                    setShowModal(false)
                  )
                }
              />
            </div>

            <DialogFooter className="px-3 pb-3 flex gap-2">
              <Button
                onClick={() => setShowModal(false)}
                variant="secondary"
                className="flex-1 bg-[#e4e4e4b4] hover:bg-[#e4e4e4b4] text-black"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function Pricing() {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!paypalClientId) {
    return <div>PayPal not configured.</div>
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      <PricingContent />
    </PayPalScriptProvider>
  )
}