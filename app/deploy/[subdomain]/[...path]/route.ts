import { db } from "@/config/db"
import { deployments, files, projects, userCredits, projectSecrets, projectSupabase } from "@/config/schema"
import { eq, and } from "drizzle-orm"
import { type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const MIME_TYPES: Record<string, string> = {
    "js": "application/javascript",
    "mjs": "application/javascript",
    "css": "text/css",
    "html": "text/html",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "json": "application/json",
    "ico": "image/x-icon",
    "txt": "text/plain",
    "woff": "font/woff",
    "woff2": "font/woff2",
    "ttf": "font/ttf",
    "eot": "application/vnd.ms-fontobject",
    "map": "application/json",
    "xml": "application/xml",
    "webmanifest": "application/manifest+json",
}

/** File extensions that are definitely static assets (not SPA routes) */
const STATIC_ASSET_EXTENSIONS = new Set([
    "js", "mjs", "css", "png", "jpg", "jpeg", "gif", "webp", "svg",
    "json", "ico", "txt", "woff", "woff2", "ttf", "eot", "map",
    "xml", "webmanifest", "mp3", "mp4", "wav", "ogg", "pdf", "zip",
])

/**
 * Injects env vars, meta tags, and branding into HTML for SPA fallback responses.
 */
function injectIntoHtml(
    html: string,
    meta: {
        favicon?: string | null
        siteTitle?: string | null
        siteDescription?: string | null
        env?: Record<string, string>
        showBranding?: boolean
    }
): string {
    let result = html

    // ─── Environment Variables ──────────────────────────────────────────────
    if (meta.env) {
        const envScript = `
        <script>
            (function() {
                window.addEventListener('error', function(event) {
                    console.error("[Falbor Debug] Runtime Error:", event.error);
                });
                window.addEventListener('unhandledrejection', function(event) {
                    console.error("[Falbor Debug] Unhandled Rejection:", event.reason);
                });
                var env = ${JSON.stringify(meta.env)};
                window.process = window.process || {};
                window.process.env = { NODE_ENV: 'production', ...window.process.env, ...env };
                if (typeof global === 'undefined') window.global = window;
                console.log("[Falbor] Environment initialized.", Object.keys(env));
            })();
        </script>
        `
        if (result.includes("<head>")) {
            result = result.replace("<head>", `<head>\n${envScript}`)
        } else {
            result = envScript + result
        }
    }

    // ─── Title ─────────────────────────────────────────────────────────────
    if (meta.siteTitle) {
        if (result.includes("<title>")) {
            result = result.replace(/<title>[^<]*<\/title>/, `<title>${meta.siteTitle}</title>`)
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `<title>${meta.siteTitle}</title>\n</head>`)
        }
    }

    // ─── Description ───────────────────────────────────────────────────────
    if (meta.siteDescription) {
        const descTag = `<meta name="description" content="${meta.siteDescription.replace(/"/g, "&quot;")}" />`
        if (result.includes('name="description"')) {
            result = result.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, descTag)
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `${descTag}\n</head>`)
        }
    }

    // ─── Favicon ───────────────────────────────────────────────────────────
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

    // ─── Production Scrubber ───────────────────────────────────────────────
    result = result.replace(/<script[^>]*src=["'][^"']*\/@vite\/client["'][^>]*><\/script>/gi, "")
    result = result.replace(/<script[^>]*src=["']http:\/\/localhost:[^"']*["'][^>]*><\/script>/gi, "")
    result = result.replace(/import\.meta\.env/g, "process.env")

    // ─── Branding Badge ────────────────────────────────────────────────────
    if (meta.showBranding) {
        const brandingHtml = `
        <div id="falbor-branding" style="position:fixed;bottom:0;right:8px;z-index:999999;height:48px;display:flex;align-items:center;justify-content:center;padding:8px;background:rgba(255,255,255,0.8);">
            <a href="https://falbor.xyz" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;background:rgba(0,0,0,0.9);color:white;padding:4px 16px;border-radius:4px;font-size:14px;font-weight:500;text-decoration:none;font-family:sans-serif;">
                <span style="margin-top:-2px;font-weight:600;">Made in</span>
                <span style="margin-left:6px;font-weight:700;letter-spacing:0.5px;">Falbor</span>
            </a>
        </div>
        `
        if (result.includes("</body>")) {
            result = result.replace("</body>", `${brandingHtml}\n</body>`)
        } else {
            result = result + brandingHtml
        }
    }

    return result
}

/**
 * Fetches env vars (Supabase + Secrets) for a project.
 */
async function getProjectEnvVars(projectId: string): Promise<Record<string, string>> {
    const envVars: Record<string, string> = {}

    const [supabase] = await db
        .select()
        .from(projectSupabase)
        .where(eq(projectSupabase.projectId, projectId))
        .limit(1)

    if (supabase) {
        envVars["VITE_SUPABASE_URL"] = supabase.supabaseUrl
        envVars["VITE_SUPABASE_ANON_KEY"] = supabase.anonKey
    }

    const secrets = await db
        .select()
        .from(projectSecrets)
        .where(eq(projectSecrets.projectId, projectId))

    secrets.forEach((s) => {
        const key = s.name.startsWith("VITE_") ? s.name : `VITE_${s.name}`
        envVars[key] = s.value
    })

    return envVars
}

/**
 * Serves the SPA index.html with full env var injection as a fallback.
 */
async function serveSpaFallback(deployment: any, projectId: string) {
    // Get dist/index.html
    const [indexFile] = await db
        .select()
        .from(files)
        .where(and(
            eq(files.projectId, projectId),
            eq(files.path, "dist/index.html")
        ))
        .limit(1)

    if (!indexFile) {
        return new Response("Not Found", { status: 404 })
    }

    // Get project for userId (needed for subscription check)
    const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)

    // Get env vars
    const envVars = await getProjectEnvVars(projectId)

    // Check subscription for branding
    let showBranding = true
    if (project) {
        const [ownerCredits] = await db
            .select({ subscriptionTier: userCredits.subscriptionTier })
            .from(userCredits)
            .where(eq(userCredits.userId, project.userId))
            .limit(1)
        showBranding = ownerCredits?.subscriptionTier === "none"
    }

    const finalHtml = injectIntoHtml(indexFile.content, {
        favicon: deployment.favicon,
        siteTitle: deployment.siteTitle,
        siteDescription: deployment.siteDescription,
        env: envVars,
        showBranding,
    })

    return new Response(finalHtml, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    })
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ subdomain: string; path: string[] }> }
) {
    const { subdomain, path } = await params
    const joinedPath = path.join("/")
    const filePath = "dist/" + joinedPath

    // Find the deployment
    const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.subdomain, subdomain))
        .limit(1)

    if (!deployment) {
        return new Response("Not Found", { status: 404 })
    }

    // Try to find the exact file in the database
    const [file] = await db
        .select()
        .from(files)
        .where(and(
            eq(files.projectId, deployment.projectId),
            eq(files.path, filePath)
        ))
        .limit(1)

    if (file) {
        // Serve the static file
        const ext = filePath.split(".").pop()?.toLowerCase() || ""
        const contentType = MIME_TYPES[ext] || "application/octet-stream"

        return new Response(file.content, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        })
    }

    // ─── SPA Fallback ──────────────────────────────────────────────────────────
    // File not found. If the path looks like a static asset (has a known file
    // extension), return 404. Otherwise, assume it's a client-side route and
    // serve dist/index.html so React Router / Vue Router / etc. can handle it.

    const ext = joinedPath.split(".").pop()?.toLowerCase() || ""
    const looksLikeAsset = joinedPath.includes(".") && STATIC_ASSET_EXTENSIONS.has(ext)

    if (looksLikeAsset) {
        return new Response("Asset Not Found", { status: 404 })
    }

    // It's a client-side route (e.g. /about, /login, /dashboard)
    // → serve index.html with env vars so the SPA router can handle it
    return serveSpaFallback(deployment, deployment.projectId)
}
