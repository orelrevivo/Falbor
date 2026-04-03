import { redirect } from "next/navigation"
import { db } from "@/config/db"
import { deployments } from "@/config/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ subdomain: string }>
}): Promise<Metadata> {
    const { subdomain } = await params

    const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.subdomain, subdomain))
        .limit(1)

    if (!deployment) return { title: "Not Found" }

    return {
        title: deployment.siteTitle || "Falbor App",
        description: deployment.siteDescription || undefined,
        icons: deployment.favicon
            ? [{ rel: "icon", url: deployment.favicon }]
            : undefined,
    }
}

// Fallback — middleware normally rewrites to /__html before this is reached.
export default async function DeployPage({
    params,
}: {
    params: Promise<{ subdomain: string }>
}) {
    const { subdomain } = await params

    const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.subdomain, subdomain))
        .limit(1)

    if (!deployment) notFound()

    redirect(`/deploy/${subdomain}/__html`)
}
