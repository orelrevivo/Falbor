import { db } from "@/config/db"
import { deployments, files, projects, userCredits, projectSecrets, projectSupabase } from "@/config/schema"
import { eq } from "drizzle-orm"
import { type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Injects favicon, title, description, env vars, and SPA router fix into the HTML.
 */
function injectMetaAndSecretsIntoHtml(
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

    // ─── Inject Environment Variables + Debug Overlay ──────────────────────────
    if (meta.env) {
        const envScript = `
        <script>
            (function() {
                // 1. Visible debug overlay — shows errors ON the page
                var _dbg = document.createElement('div');
                _dbg.id = '__falbor_dbg';
                _dbg.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;color:#0f0;font:12px/1.4 monospace;padding:8px 12px;max-height:40vh;overflow:auto;display:none;';
                document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(_dbg); });

                function _showDbg(msg, color) {
                    _dbg.style.display = 'block';
                    var p = document.createElement('div');
                    p.style.color = color || '#f44';
                    p.textContent = msg;
                    _dbg.appendChild(p);
                }

                // 2. Error catchers
                window.addEventListener('error', function(event) {
                    console.error("[Falbor Debug] Runtime Error:", event.error);
                    _showDbg('ERROR: ' + (event.error ? event.error.message || event.error : event.message), '#f44');
                });
                window.addEventListener('unhandledrejection', function(event) {
                    console.error("[Falbor Debug] Unhandled Rejection:", event.reason);
                    _showDbg('REJECTION: ' + (event.reason ? event.reason.message || event.reason : 'unknown'), '#fa0');
                });

                // 3. Environment Shims
                var env = ${JSON.stringify(meta.env)};
                window.process = window.process || {};
                window.process.env = { NODE_ENV: 'production', ...window.process.env, ...env };
                if (typeof global === 'undefined') window.global = window;

                // 4. Monitor React mount — hide overlay after 5s if no errors
                setTimeout(function() {
                    var root = document.getElementById('root');
                    if (root && root.children.length > 0 && _dbg.children.length === 0) {
                        _dbg.style.display = 'none';
                    } else if (root && root.children.length === 0) {
                        _showDbg('WARNING: #root is empty after 5s — React may not have mounted.', '#fa0');
                        _showDbg('Scripts on page: ' + document.querySelectorAll('script').length, '#0af');
                        _showDbg('Env keys: ' + Object.keys(env).join(', '), '#0af');
                    }
                }, 5000);

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

    // ─── Title ─────────────────────────────────────────────────────────────────
    if (meta.siteTitle) {
        if (result.includes("<title>")) {
            result = result.replace(/<title>[^<]*<\/title>/, `<title>${meta.siteTitle}</title>`)
        } else if (result.includes("</head>")) {
            result = result.replace("</head>", `<title>${meta.siteTitle}</title>\n</head>`)
        } else {
            result = `<head><title>${meta.siteTitle}</title></head>\n${result}`
        }
    }

    // ─── Description ───────────────────────────────────────────────────────────
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

    // ─── Favicon ───────────────────────────────────────────────────────────────
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

    // ─── Production Scrubber ───────────────────────────────────────────────────
    // Remove leftover Vite dev client scripts
    result = result.replace(/<script[^>]*src=["'][^"']*\/@vite\/client["'][^>]*><\/script>/gi, "")
    result = result.replace(/<script[^>]*src=["']http:\/\/localhost:[^"']*["'][^>]*><\/script>/gi, "")

    // Swap any remaining import.meta.env → process.env so the runtime shim works
    result = result.replace(/import\.meta\.env/g, "process.env")

    // ─── Branding Badge (injected into body for free-tier users) ───────────────
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
 * Fetches all env vars (Supabase + Secrets) for a project.
 */
async function getProjectEnvVars(projectId: string): Promise<Record<string, string>> {
    const envVars: Record<string, string> = {}

    // 1. Supabase
    const [supabase] = await db
        .select()
        .from(projectSupabase)
        .where(eq(projectSupabase.projectId, projectId))
        .limit(1)

    if (supabase) {
        envVars["VITE_SUPABASE_URL"] = supabase.supabaseUrl
        envVars["VITE_SUPABASE_ANON_KEY"] = supabase.anonKey
    }

    // 2. Secrets
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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ subdomain: string }> }
) {
    const { subdomain } = await params

    // 1. Find deployment
    const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.subdomain, subdomain))
        .limit(1)

    if (!deployment) {
        return new Response("Not Found", { status: 404 })
    }

    // 2. Find project
    const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, deployment.projectId))
        .limit(1)

    if (!project) {
        return new Response("Not Found", { status: 404 })
    }

    // 3. Get env vars
    const envVars = await getProjectEnvVars(project.id)

    // 4. Check subscription (for branding)
    const [ownerCredits] = await db
        .select({ subscriptionTier: userCredits.subscriptionTier })
        .from(userCredits)
        .where(eq(userCredits.userId, project.userId))
        .limit(1)

    const hasSubscription = ownerCredits?.subscriptionTier !== "none"

    // 5. Get dist/index.html
    const projectFiles = await db
        .select()
        .from(files)
        .where(eq(files.projectId, deployment.projectId))

    const distHtmlFile = projectFiles.find((f) => f.path === "dist/index.html")

    if (!distHtmlFile) {
        return new Response(
            "<html><body><h1>Site Not Published</h1><p>Please open the Preview tab and click Publish.</p></body></html>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    }

    // 6. Inject env vars, meta, branding into HTML
    const finalHtml = injectMetaAndSecretsIntoHtml(distHtmlFile.content, {
        favicon: deployment.favicon,
        siteTitle: deployment.siteTitle,
        siteDescription: deployment.siteDescription,
        env: envVars,
        showBranding: !hasSubscription,
    })

    return new Response(finalHtml, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
    })
}
