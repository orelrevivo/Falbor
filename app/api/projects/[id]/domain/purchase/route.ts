import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { deployments, domainOrders, projects, userCredits, userProfiles } from "@/config/schema"
import { eq, and } from "drizzle-orm"

// ─── GoDaddy config ────────────────────────────────────────────────────────────

const GODADDY_BASE_URL =
    process.env.GODADDY_ENV === "production"
        ? "https://api.godaddy.com"
        : "https://api.ote-godaddy.com"

function godaddyHeaders() {
    return {
        Authorization: `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
        "Content-Type": "application/json",
    }
}

// ─── PayPal config ─────────────────────────────────────────────────────────────

const PAYPAL_BASE_URL =
    process.env.PAYPAL_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"

async function getPayPalAccessToken(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured")
    }

    const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    })

    if (!res.ok) {
        throw new Error("Failed to get PayPal access token")
    }

    const data = await res.json()
    return data.access_token
}

async function verifyPayPalOrder(orderId: string): Promise<{
    verified: boolean
    amount?: string
    currency?: string
}> {
    const token = await getPayPalAccessToken()

    const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    })

    if (!res.ok) {
        return { verified: false }
    }

    const order = await res.json()

    if (order.status !== "COMPLETED" && order.status !== "APPROVED") {
        return { verified: false }
    }

    const capture = order.purchase_units?.[0]?.amount
    return {
        verified: true,
        amount: capture?.value,
        currency: capture?.currency_code,
    }
}

// ─── Build GoDaddy contact from user profile ──────────────────────────────────

function buildGoDaddyContact(profile: {
    email: string
    fullName?: string | null
}) {
    const [firstName, ...rest] = (profile.fullName || "Domain Owner").split(" ")
    const lastName = rest.join(" ") || "User"

    return {
        nameFirst: firstName,
        nameLast: lastName,
        email: profile.email,
        phone: "+1.0000000000", // placeholder -- user should update in GoDaddy
        addressMailing: {
            address1: "123 Main St",
            city: "San Francisco",
            state: "CA",
            postalCode: "94105",
            country: "US",
        },
    }
}

// ─── POST: Create PayPal order for domain ─────────────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: projectId } = await params
        const body = await req.json()
        const { domain, price, action } = body

        if (!domain || typeof price !== "number") {
            return NextResponse.json({ error: "Missing domain or price" }, { status: 400 })
        }

        // Verify project ownership
        const [project] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
            .limit(1)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Check Pro subscription
        const [credits] = await db
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1)

        if (!credits || !["pro", "enterprise"].includes(credits.subscriptionTier)) {
            return NextResponse.json(
                { error: "Custom domains require a Pro subscription" },
                { status: 403 }
            )
        }

        // ─── ACTION: create-paypal-order ───────────────────────────────────────────
        // Frontend calls this first to get a PayPal order ID for the buttons SDK

        if (action === "create-paypal-order") {
            const { domain, price } = body;

            if (typeof price !== "number" || price <= 0) {
                return NextResponse.json({ error: "Invalid price" }, { status: 400 });
            }

            console.log(`[DOMAIN ORDER] Creating PayPal order for ${domain} @ $${price}`);

            const token = await getPayPalAccessToken();

            const orderRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            description: `Domain registration: ${domain}`,
                            amount: {
                                currency_code: "USD",
                                value: price.toFixed(2),          // ← ensure toFixed(2)
                            },
                        },
                    ],
                }),
            });

            if (!orderRes.ok) {
                const errText = await orderRes.text();
                console.error("[PAYPAL CREATE]", errText);
                return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
            }

            const orderData = await orderRes.json();

            // Create a pending domain order in our DB
            await db.insert(domainOrders).values({
                userId,
                projectId,
                domain,
                price: Math.round(price * 100),
                currency: "USD",
                status: "pending",
                paymentMethod: "paypal",
                godaddyOrderId: null,
            })

            return NextResponse.json({
                paypalOrderId: orderData.id,
            })
        }

        // ─── ACTION: capture-paypal-order ──────────────────────────────────────────
        // Frontend calls this after user approves in PayPal popup

        if (action === "capture-paypal-order") {
            const { paypalOrderId } = body

            if (!paypalOrderId) {
                return NextResponse.json({ error: "Missing paypalOrderId" }, { status: 400 })
            }

            // 1. Capture the PayPal payment
            const token = await getPayPalAccessToken()

            const captureRes = await fetch(
                `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            )

            if (!captureRes.ok) {
                const err = await captureRes.text()
                console.error("[PAYPAL CAPTURE]", err)

                // Mark order as failed
                await db
                    .update(domainOrders)
                    .set({ status: "failed", updatedAt: new Date() })
                    .where(and(eq(domainOrders.domain, domain), eq(domainOrders.userId, userId)))

                return NextResponse.json({ error: "PayPal payment capture failed" }, { status: 500 })
            }

            const captureData = await captureRes.json()

            if (captureData.status !== "COMPLETED") {
                await db
                    .update(domainOrders)
                    .set({ status: "failed", updatedAt: new Date() })
                    .where(and(eq(domainOrders.domain, domain), eq(domainOrders.userId, userId)))

                return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
            }

            // 2. Purchase domain via GoDaddy API
            const [profile] = await db
                .select()
                .from(userProfiles)
                .where(eq(userProfiles.userId, userId))
                .limit(1)

            const contact = buildGoDaddyContact({
                email: profile?.email || "admin@falbor.xyz",
                fullName: profile?.fullName,
            })

            // Get legal agreements first (required by GoDaddy)
            const tld = domain.split(".").slice(1).join(".")
            const agreementsRes = await fetch(
                `${GODADDY_BASE_URL}/v1/domains/agreements?tlds=${encodeURIComponent(tld)}&privacy=false`,
                { headers: godaddyHeaders() }
            )

            let agreementKeys: string[] = []
            if (agreementsRes.ok) {
                const agreements = await agreementsRes.json()
                agreementKeys = agreements.map((a: { agreementKey: string }) => a.agreementKey)
            }

            const purchaseBody = {
                domain,
                consent: {
                    agreementKeys,
                    agreedBy: "0.0.0.0", // will be replaced with real IP in production
                    agreedAt: new Date().toISOString(),
                },
                contactAdmin: contact,
                contactBilling: contact,
                contactRegistrant: contact,
                contactTech: contact,
                period: 1, // 1 year
                renewAuto: false,
                privacy: false,
            }

            const purchaseRes = await fetch(`${GODADDY_BASE_URL}/v1/domains/purchase`, {
                method: "POST",
                headers: godaddyHeaders(),
                body: JSON.stringify(purchaseBody),
            })

            let godaddyOrderId: string | null = null

            if (purchaseRes.ok) {
                const purchaseData = await purchaseRes.json()
                godaddyOrderId = purchaseData.orderId?.toString() || null

                // 3. Update domain order as paid
                await db
                    .update(domainOrders)
                    .set({
                        status: "paid",
                        godaddyOrderId,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(domainOrders.domain, domain), eq(domainOrders.userId, userId)))

                // 4. Update deployment with custom domain
                const [dep] = await db
                    .select()
                    .from(deployments)
                    .where(eq(deployments.projectId, projectId))
                    .limit(1)

                if (dep) {
                    await db
                        .update(deployments)
                        .set({ customDomain: domain, updatedAt: new Date() })
                        .where(eq(deployments.id, dep.id))
                }

                // 5. Point domain DNS to your server (A record or CNAME)
                // Configure DNS to point to your Falbor deployment server
                const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"
                try {
                    await fetch(
                        `${GODADDY_BASE_URL}/v1/domains/${domain}/records`,
                        {
                            method: "PUT",
                            headers: godaddyHeaders(),
                            body: JSON.stringify([
                                {
                                    type: "CNAME",
                                    name: "@",
                                    data: baseDomain,
                                    ttl: 600,
                                },
                                {
                                    type: "CNAME",
                                    name: "www",
                                    data: baseDomain,
                                    ttl: 600,
                                },
                            ]),
                        }
                    )
                } catch (dnsErr) {
                    console.error("[DNS UPDATE]", dnsErr)
                    // Non-fatal: domain purchased but DNS may need manual config
                }

                return NextResponse.json({
                    success: true,
                    domain,
                    godaddyOrderId,
                    message: "Domain purchased and linked successfully",
                })
            } else {
                // GoDaddy purchase failed -- refund via PayPal
                const purchaseErr = await purchaseRes.text()
                console.error("[GODADDY PURCHASE FAILED]", purchaseErr)

                // Attempt PayPal refund
                try {
                    const captureId =
                        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id

                    if (captureId) {
                        await fetch(
                            `${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`,
                            {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        )
                    }
                } catch (refundErr) {
                    console.error("[PAYPAL REFUND]", refundErr)
                }

                await db
                    .update(domainOrders)
                    .set({ status: "failed", updatedAt: new Date() })
                    .where(and(eq(domainOrders.domain, domain), eq(domainOrders.userId, userId)))

                return NextResponse.json(
                    {
                        error:
                            "Domain registration failed with GoDaddy. Payment has been refunded.",
                    },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("[DOMAIN PURCHASE]", error)
        return NextResponse.json({ error: "Domain purchase failed" }, { status: 500 })
    }
}