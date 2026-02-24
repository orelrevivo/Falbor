import { db } from "@/config/db"
import { deployments, files, projects, userCredits } from "@/config/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// ─── Dynamic Metadata ──────────────────────────────────────────────────────────
// This sets the browser tab title + favicon at the Next.js level for SSR pages.
// For the iframe srcDoc approach, we also inject meta directly into the HTML.

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

// ─── Helper: inject meta tags into raw HTML string ─────────────────────────────

function injectMetaIntoHtml(
    html: string,
    meta: {
        favicon?: string | null
        siteTitle?: string | null
        siteDescription?: string | null
    }
): string {
    let result = html

    // Title
    if (meta.siteTitle) {
        if (result.includes("<title>")) {
            result = result.replace(/<title>[^<]*<\/title>/, `<title>${meta.siteTitle}</title>`)
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `<title>${meta.siteTitle}</title>\n</head>`)
        } else {
            // No <head> at all -- wrap in a minimal one
            result = `<head><title>${meta.siteTitle}</title></head>\n${result}`
        }
    }

    // Description
    if (meta.siteDescription) {
        const descTag = `<meta name="description" content="${meta.siteDescription.replace(/"/g, "&quot;")}" />`
        if (result.includes('name="description"')) {
            result = result.replace(
                /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
                descTag
            )
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `${descTag}\n</head>`)
        }
    }

    // Favicon
    if (meta.favicon) {
        let type = "image/x-icon"
        if (meta.favicon.includes("image/png")) type = "image/png"
        else if (meta.favicon.includes("image/svg")) type = "image/svg+xml"

        const faviconTag = `<link rel="icon" type="${type}" href="${meta.favicon}" />`
        if (result.includes('rel="icon"')) {
            result = result.replace(/<link\s+rel="icon"[^>]*\/?>/, faviconTag)
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `${faviconTag}\n</head>`)
        }
    }

    return result
}

// ─── Page Component ────────────────────────────────────────────────────────────

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

    if (!deployment) {
        notFound()
    }

    const [project] = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, deployment.projectId))
        .limit(1)

    if (!project) {
        notFound()
    }

    const [ownerCredits] = await db
        .select({ subscriptionTier: userCredits.subscriptionTier })
        .from(userCredits)
        .where(eq(userCredits.userId, project.userId))
        .limit(1)

    const hasSubscription = ownerCredits?.subscriptionTier !== "none"

    const projectFiles = await db
        .select()
        .from(files)
        .where(eq(files.projectId, deployment.projectId))

    if (!projectFiles.length) {
        return (
            <div className="flex h-screen items-center justify-center text-xl">
                No files available
            </div>
        )
    }

    const hasPy = projectFiles.some((f) => f.path.endsWith(".py"))
    const hasJsTs = projectFiles.some((f) => /\.(js|jsx|ts|tsx)$/.test(f.path))

    if (hasPy && !hasJsTs) {
        return (
            <div className="flex h-screen items-center justify-center text-xl">
                Python deployment not supported yet
            </div>
        )
    }

    if (!hasJsTs) {
        return (
            <div className="flex h-screen items-center justify-center text-xl">
                Unsupported project type
            </div>
        )
    }

    const distHtmlFile = projectFiles.find((f) => f.path === "dist/index.html")

    // Serve HTML from dist -- inject favicon/title/description into the HTML
    if (distHtmlFile) {
        const finalHtml = injectMetaIntoHtml(distHtmlFile.content, {
            favicon: deployment.favicon,
            siteTitle: deployment.siteTitle,
            siteDescription: deployment.siteDescription,
        })

        return (
            <div className="relative w-full h-screen overflow-hidden">
                <iframe
                    title={deployment.siteTitle || "Site Preview"}
                    className="w-full h-full border-none m-0 p-0"
                    srcDoc={finalHtml}
                />
                {!hasSubscription && (
                    <div className="absolute h-12 bottom-0 right-2 flex justify-center py-2 bg-white/80 text-center">
                        <button className="bg-black/90 text-white px-4 py-1 rounded-sm text-sm font-medium flex items-center">
                            <span className="mt-[-3px] font-semibold">Made in</span>
                            <img src="/logo.png" width={80} alt="" className="ml-[2px]" />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="relative flex flex-col items-center justify-center p-8 bg-gray-50 h-[100vh]">
            <h1 className="text-xl font-bold mb-4">
                Site Building or Not Published Correctly
            </h1>
            <p>
                Please open the Preview tab and click Publish to build the project files
                correctly.
            </p>
            {!hasSubscription && (
                <div className="absolute h-12 bottom-0 right-2 flex justify-center py-2 bg-white/80 text-center">
                    <button className="bg-black/90 text-white px-4 py-1 rounded-sm text-sm font-medium flex items-center">
                        <span className="mt-[-3px] font-semibold">Made in</span>
                        <img src="/logo.png" width={80} alt="" className="ml-[2px]" />
                    </button>
                </div>
            )}
        </div>
    )
}
