import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/config/db"
import { deployments, projects, files } from "@/config/schema"
import { eq, and } from "drizzle-orm"

const MAIN_TSX_CONTENT = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
<React.StrictMode>
<App />
</React.StrictMode>,
)`

const INDEX_CSS_CONTENT = `@tailwind base;
@tailwind components;
@tailwind utilities;`

/**
 * Injects favicon, title, and description meta tags into the HTML <head>.
 * If the tags already exist, replaces them. Otherwise, appends before </head>.
 */
function injectMetaTags(
  html: string,
  meta: { favicon?: string | null; siteTitle?: string | null; siteDescription?: string | null }
): string {
  let result = html

  // Inject/replace <title>
  if (meta.siteTitle) {
    if (result.includes("<title>")) {
      result = result.replace(/<title>[^<]*<\/title>/, `<title>${meta.siteTitle}</title>`)
    } else {
      result = result.replace("</head>", `  <title>${meta.siteTitle}</title>\n</head>`)
    }
  }

  // Inject/replace meta description
  if (meta.siteDescription) {
    if (result.includes('name="description"')) {
      result = result.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${meta.siteDescription}" />`
      )
    } else {
      result = result.replace(
        "</head>",
        `  <meta name="description" content="${meta.siteDescription}" />\n</head>`
      )
    }
  }

  // Inject/replace favicon
  if (meta.favicon) {
    // Determine type from base64 prefix
    let type = "image/x-icon"
    if (meta.favicon.includes("image/png")) type = "image/png"
    else if (meta.favicon.includes("image/svg")) type = "image/svg+xml"

    const faviconTag = `<link rel="icon" type="${type}" href="${meta.favicon}" />`

    if (result.includes('rel="icon"')) {
      result = result.replace(/<link\s+rel="icon"[^>]*\/?>/, faviconTag)
    } else {
      result = result.replace("</head>", `  ${faviconTag}\n</head>`)
    }
  }

  return result
}

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
    const body = await req.json().catch(() => ({}))

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Optional: prepare files if needed
    const projectFiles = await db.select().from(files).where(eq(files.projectId, projectId))

    const hasPy = projectFiles.some((f) => f.path.endsWith(".py") || f.language === "python")
    const hasJsTs = projectFiles.some(
      (f) =>
        f.language === "javascript" ||
        f.language === "typescript" ||
        f.path.match(/\.j(sx?)$/) ||
        f.path.match(/\.ts(x?)$/)
    )

    if (hasJsTs && !hasPy) {
      const hasMainTsx = projectFiles.some((f) => f.path === "src/main.tsx")
      const hasIndexCss = projectFiles.some((f) => f.path === "src/index.css")

      const toInsert: Array<{ projectId: string; path: string; content: string; language: string }> = []

      if (!hasMainTsx) {
        toInsert.push({
          projectId,
          path: "src/main.tsx",
          content: MAIN_TSX_CONTENT,
          language: "tsx",
        })
      }

      if (!hasIndexCss) {
        toInsert.push({
          projectId,
          path: "src/index.css",
          content: INDEX_CSS_CONTENT,
          language: "css",
        })
      }

      if (toInsert.length > 0) {
        await db.insert(files).values(toInsert)
      }
    }

    if (projectFiles.length === 0 && !body.subdomain) {
      return NextResponse.json({ error: "No files to deploy" }, { status: 400 })
    }

    // Get existing deployment
    const [existing] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .limit(1)

    // Determine subdomain
    let subdomain = existing?.subdomain || projectId.toLowerCase().replace(/[^a-z0-9-]/g, "-")

    // If user wants to change subdomain
    if (body.subdomain && typeof body.subdomain === "string") {
      const cleanSubdomain = body.subdomain
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "")

      if (cleanSubdomain.length >= 3 && cleanSubdomain !== subdomain) {
        subdomain = cleanSubdomain
      }
    }

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"
    const deploymentUrl =
      process.env.NODE_ENV === "development"
        ? `http://localhost:3000/deploy/${subdomain}`
        : `https://${subdomain}.${baseDomain}`

    let updatedDeployment

    if (existing) {
      const updateData: Record<string, any> = {
        deploymentUrl,
        subdomain,
        updatedAt: new Date(),
      }

        ;[updatedDeployment] = await db
          .update(deployments)
          .set(updateData)
          .where(eq(deployments.id, existing.id))
          .returning()
    } else {
      ;[updatedDeployment] = await db
        .insert(deployments)
        .values({
          projectId,
          deploymentUrl,
          subdomain,
          isPublic: true,
          showBranding: true,
        })
        .returning()
    }

    // Handle distHtml with meta tag injection
    if (body.distHtml) {
      let finalHtml = body.distHtml

      // Safely get deployment record (updated or existing)
      const deploymentRecord = updatedDeployment || existing

      if (deploymentRecord) {
        finalHtml = injectMetaTags(finalHtml, {
          favicon: deploymentRecord.favicon ?? null,
          siteTitle: deploymentRecord.siteTitle ?? null,
          siteDescription: deploymentRecord.siteDescription ?? null,
        })
      }

      const [existingDist] = await db
        .select()
        .from(files)
        .where(and(eq(files.projectId, projectId), eq(files.path, "dist/index.html")))
        .limit(1)

      if (existingDist) {
        await db
          .update(files)
          .set({ content: finalHtml, updatedAt: new Date() })
          .where(eq(files.id, existingDist.id))
      } else {
        await db.insert(files).values({
          projectId,
          path: "dist/index.html",
          content: finalHtml,
          language: "html",
        })
      }
    }

    return NextResponse.json({
      deploymentUrl,
      subdomain,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DEPLOY POST]", error)
    // Optional: include more debug info in development (remove in production)
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? (error as Error).message || "Unknown error"
        : "Failed to deploy/update project"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}