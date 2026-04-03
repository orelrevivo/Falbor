import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { projectAuthProviders, projectSecrets } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const { id: projectId } = await params

    try {
        const providers = await db
            .select()
            .from(projectAuthProviders)
            .where(
                and(
                    eq(projectAuthProviders.projectId, projectId),
                    eq(projectAuthProviders.userId, userId)
                )
            )

        return NextResponse.json(providers)
    } catch (error) {
        console.error("[Auth Providers API] GET error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) return new Response("Unauthorized", { status: 401 })

    const { id: projectId } = await params
    const body = await req.json()
    const { provider, isEnabled, clientId, clientSecret } = body

    if (!provider) return new Response("Provider is required", { status: 400 })

    try {
        // Check if provider exists
        const [existing] = await db
            .select()
            .from(projectAuthProviders)
            .where(
                and(
                    eq(projectAuthProviders.projectId, projectId),
                    eq(projectAuthProviders.userId, userId),
                    eq(projectAuthProviders.provider, provider)
                )
            )

        if (existing) {
            await db
                .update(projectAuthProviders)
                .set({
                    isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
                    clientId: clientId !== undefined ? clientId : existing.clientId,
                    clientSecret: clientSecret !== undefined ? clientSecret : existing.clientSecret,
                    updatedAt: new Date(),
                })
                .where(eq(projectAuthProviders.id, existing.id))

            if (clientId !== undefined || clientSecret !== undefined) {
                const secretUpdates = []
                const prefix = provider.toUpperCase()

                if (clientId) {
                    secretUpdates.push({ name: `${prefix}_CLIENT_ID`, value: clientId })
                }
                if (clientSecret) {
                    secretUpdates.push({ name: `${prefix}_CLIENT_SECRET`, value: clientSecret })
                }

                for (const secret of secretUpdates) {
                    const [existingSecret] = await db
                        .select()
                        .from(projectSecrets)
                        .where(
                            and(
                                eq(projectSecrets.projectId, projectId),
                                eq(projectSecrets.userId, userId),
                                eq(projectSecrets.name, secret.name)
                            )
                        )

                    if (existingSecret) {
                        await db
                            .update(projectSecrets)
                            .set({ value: secret.value, updatedAt: new Date() })
                            .where(eq(projectSecrets.id, existingSecret.id))
                    } else {
                        await db.insert(projectSecrets).values({
                            projectId,
                            userId,
                            name: secret.name,
                            value: secret.value,
                        })
                    }
                }
            }

            return NextResponse.json({ success: true, updated: true })
        } else {
            const [newProvider] = await db
                .insert(projectAuthProviders)
                .values({
                    projectId,
                    userId,
                    provider,
                    isEnabled: isEnabled || false,
                    clientId: clientId || null,
                    clientSecret: clientSecret || null,
                })
                .returning()

            // Also sync secrets for new provider
            if (clientId || clientSecret) {
                const secretUpdates = []
                const prefix = provider.toUpperCase()

                if (clientId) secretUpdates.push({ name: `${prefix}_CLIENT_ID`, value: clientId })
                if (clientSecret) secretUpdates.push({ name: `${prefix}_CLIENT_SECRET`, value: clientSecret })

                for (const secret of secretUpdates) {
                    await db.insert(projectSecrets).values({
                        projectId,
                        userId,
                        name: secret.name,
                        value: secret.value,
                    })
                }
            }

            return NextResponse.json({ success: true, created: true })
        }
    } catch (error) {
        console.error("[Auth Providers API] POST error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
