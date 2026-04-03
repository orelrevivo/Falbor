import { db } from "@/config/db"
import {
    deployments,
    files,
    projects,
    userCredits,
    projectSecrets,
    projectSupabase,
    projectAnalyticsEvents,
} from "@/config/schema"
import { eq, and, gte } from "drizzle-orm"
import { type NextRequest } from "next/server"

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "falbor.xyz"

export const dynamic = "force-dynamic"

// ── UA helpers (duplicated here to avoid cross-route imports) ─────────────────
function uaBrowser(ua: string): string {
    if (/Edg\//i.test(ua)) return "Edge"
    if (/OPR\/|Opera/i.test(ua)) return "Opera"
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome"
    if (/Firefox\//i.test(ua)) return "Firefox"
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari"
    if (/MSIE|Trident/i.test(ua)) return "Internet Explorer"
    return "Other"
}
function uaOS(ua: string): string {
    if (/Windows NT/i.test(ua)) return "Windows"
    if (/Mac OS X/i.test(ua)) return "macOS"
    if (/Android/i.test(ua)) return "Android"
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS"
    if (/Linux/i.test(ua)) return "Linux"
    return "Other"
}
function uaDevice(ua: string): string {
    if (/iPad/i.test(ua)) return "tablet"
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile"
    return "desktop"
}

// Filter out bots so they don't pollute analytics
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|twitterbot|linkedinbot|applebot|googlestackdrivermonitoring|pingdom|uptimerobot|headlesschrome/i

// ── Determine API base for the injected client-side script ────────────────────
// In prod: request host = xyz.falbor.xyz → API lives at https://falbor.xyz
// In dev:  request host = localhost:3000  → API lives at http://localhost:3000
function getApiBase(req: NextRequest): string {
    const host = req.headers.get("host") || ""
    if (host.endsWith(`.${BASE_DOMAIN}`)) return `https://${BASE_DOMAIN}`
    const proto = req.headers.get("x-forwarded-proto") || "http"
    return `${proto}://${host}`
}

/**
 * Lightweight client-side script for SPA sub-page navigation.
 * Root "/" is already tracked server-side when this HTML is served.
 */
function buildAnalyticsScript(projectId: string, apiBase: string): string {
    return `<script>
(function(){
  try{
    var API='${apiBase}/api/projects/${projectId}/analytics';
    var VK='__fa_vid_${projectId}',SK='__fa_sid_${projectId}',STK='__fa_sid_ts_${projectId}';
    var TTL=30*60*1000;
    function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});}
    var vid=localStorage.getItem(VK)||(function(){var v=uuid();localStorage.setItem(VK,v);return v;})();
    var now=Date.now(),sid=localStorage.getItem(SK),sts=parseInt(localStorage.getItem(STK)||'0',10);
    if(!sid||now-sts>TTL){sid=uuid();localStorage.setItem(SK,sid);}
    localStorage.setItem(STK,String(now));
    var t0=now,pg=location.pathname||'/',ref=document.referrer||'',durSent=false;
    function post(p){
      var b=JSON.stringify(p),ok=false;
      try{if(navigator.sendBeacon){ok=navigator.sendBeacon(API,new Blob([b],{type:'application/json'}));}}catch(e){}
      if(!ok){fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true}).catch(function(){});}
    }
    // Root "/" is tracked server-side; only send client events for SPA sub-pages
    if(pg!=='/'&&pg!==''){
      post({sessionId:sid,visitorId:vid,type:'pageview',page:pg,referrer:ref,duration:null});
    }
    function dur(){
      if(durSent)return;durSent=true;
      var d=Math.round((Date.now()-t0)/1000);
      if(d>=2)post({sessionId:sid,visitorId:vid,type:'duration_update',page:pg,referrer:ref,duration:d});
    }
    window.addEventListener('beforeunload',dur);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')dur();});
  }catch(e){}
})();
</script>`
}

/**
 * ── SERVER-SIDE analytics tracking ─────────────────────────────────────────────
 * Inserts a pageview directly into the DB when the HTML is served.
 * This is the PRIMARY tracking mechanism — no JavaScript, CORS, or deployment needed.
 * Identical approach used by Plausible, Fathom, and Simple Analytics.
 */
async function trackServerSidePageview(req: NextRequest, projectId: string): Promise<void> {
    try {
        const ua = req.headers.get("user-agent") || ""

        // Skip bots entirely
        if (BOT_RE.test(ua)) return

        // ── Geo / referrer ─────────────────────────────────────────────────────────
        const country =
            req.headers.get("cf-ipcountry") ||
            req.headers.get("x-vercel-ip-country") ||
            null

        const rawReferrer = req.headers.get("referer") || req.headers.get("referrer") || null
        let referrerHost: string | null = null
        if (rawReferrer) {
            try { referrerHost = new URL(rawReferrer).hostname } catch { referrerHost = rawReferrer }
        }

        // ── Visitor fingerprint (stable per IP+UA, not stored permanently) ─────────
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown"
        const raw = `${ip}_${ua.slice(0, 200)}`
        let hash = 5381
        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) + hash) ^ raw.charCodeAt(i)
            hash = hash >>> 0 // keep as uint32
        }
        const visitorId = `sv_${hash.toString(36)}`

        // ── Session dedup: skip if this visitor was seen in the last 30 minutes ────
        // This prevents counting page refreshes as new pageviews
        const since30 = new Date(Date.now() - 30 * 60 * 1000)
        const [recentEvent] = await db
            .select({ id: projectAnalyticsEvents.id })
            .from(projectAnalyticsEvents)
            .where(
                and(
                    eq(projectAnalyticsEvents.projectId, projectId),
                    eq(projectAnalyticsEvents.visitorId, visitorId),
                    gte(projectAnalyticsEvents.createdAt, since30)
                )
            )
            .limit(1)

        if (recentEvent) return // Already counted this visitor in the current session

        // ── Is this a new visitor ever? ────────────────────────────────────────────
        const [prevEver] = await db
            .select({ id: projectAnalyticsEvents.id })
            .from(projectAnalyticsEvents)
            .where(
                and(
                    eq(projectAnalyticsEvents.projectId, projectId),
                    eq(projectAnalyticsEvents.visitorId, visitorId)
                )
            )
            .limit(1)

        const sessionId = `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

        await db.insert(projectAnalyticsEvents).values({
            projectId,
            sessionId,
            visitorId,
            type: "pageview",
            page: "/",
            referrer: referrerHost,
            country,
            browser: uaBrowser(ua),
            os: uaOS(ua),
            device: uaDevice(ua),
            duration: null,
            isNewVisitor: !prevEver,
        })
    } catch (err) {
        // Never fail page serving due to analytics errors
        console.error("[Analytics server-track error]", err)
    }
}

/**
 * Injects favicon, title, description, env vars, analytics script, and branding into the HTML.
 */
function injectMetaAndSecretsIntoHtml(
    html: string,
    meta: {
        favicon?: string | null
        siteTitle?: string | null
        siteDescription?: string | null
        env?: Record<string, string>
        showBranding?: boolean
        projectId?: string
        apiBase?: string
    }
): string {
    let result = html

    // ─── Inject Environment Variables + Debug Overlay ──────────────────────────
    if (meta.env) {
        const envScript = `
    <script>
        (function() {
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
            window.addEventListener('error', function(event) {
                console.error("[Falbor Debug] Runtime Error:", event.error);
                _showDbg('ERROR: ' + (event.error ? event.error.message || event.error : event.message), '#f44');
            });
            window.addEventListener('unhandledrejection', function(event) {
                console.error("[Falbor Debug] Unhandled Rejection:", event.reason);
                _showDbg('REJECTION: ' + (event.reason ? event.reason.message || event.reason : 'unknown'), '#fa0');
            });
            var env = ${JSON.stringify(meta.env)};
            window.process = window.process || {};
            window.process.env = { NODE_ENV: 'production', ...window.process.env, ...env };
            if (typeof global === 'undefined') window.global = window;
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
            result = result.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, descTag)
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

    // ─── Client-side analytics script (SPA sub-page tracking) ──────────────────
    if (meta.projectId && meta.apiBase) {
        const analyticsScript = buildAnalyticsScript(meta.projectId, meta.apiBase)
        if (result.includes("</head>")) {
            result = result.replace("</head>", `${analyticsScript}\n</head>`)
        } else if (result.includes("</body>")) {
            result = result.replace("</body>", `${analyticsScript}\n</body>`)
        } else {
            result = result + analyticsScript
        }
    }

    // ─── Production Scrubber ───────────────────────────────────────────────────
    result = result.replace(/<script[^>]*src=["'][^"']*\/@vite\/client["'][^>]*><\/script>/gi, "")
    result = result.replace(/<script[^>]*src=["']http:\/\/localhost:[^"']*["'][^>]*><\/script>/gi, "")
    result = result.replace(/import\.meta\.env/g, "process.env")

    // ─── Branding Badge ────────────────────────────────────────────────────────
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

    // 3. SERVER-SIDE ANALYTICS TRACKING — fires immediately, no JS/CORS needed
    //    This is the primary tracking mechanism (server reads the request headers directly)
    await trackServerSidePageview(req, project.id)

    // 4. Get env vars
    const envVars = await getProjectEnvVars(project.id)

    // 5. Check subscription (for branding)
    const [ownerCredits] = await db
        .select({ subscriptionTier: userCredits.subscriptionTier })
        .from(userCredits)
        .where(eq(userCredits.userId, project.userId))
        .limit(1)

    const hasSubscription = ownerCredits?.subscriptionTier !== "none"

    // 6. Get dist/index.html
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

    // 7. Inject env vars, meta, analytics script, and branding
    const apiBase = getApiBase(req)
    const finalHtml = injectMetaAndSecretsIntoHtml(distHtmlFile.content, {
        favicon: deployment.favicon,
        siteTitle: deployment.siteTitle,
        siteDescription: deployment.siteDescription,
        env: envVars,
        showBranding: !hasSubscription,
        projectId: project.id,
        apiBase,
    })

    return new Response(finalHtml, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            // No caching — every request must hit the server so tracking fires
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    })
}
















// import { db } from "@/config/db"
// import { deployments, files, projects, userCredits, projectSecrets, projectSupabase } from "@/config/schema"
// import { eq } from "drizzle-orm"
// import { type NextRequest } from "next/server"

// export const dynamic = "force-dynamic"

// /**
//  * Injects favicon, title, description, env vars, and SPA router fix into the HTML.
//  */
// function injectMetaAndSecretsIntoHtml(
//     html: string,
//     meta: {
//         favicon?: string | null
//         siteTitle?: string | null
//         siteDescription?: string | null
//         env?: Record<string, string>
//         showBranding?: boolean
//     }
// ): string {
//     let result = html

//     // ─── Inject Environment Variables + Debug Overlay ──────────────────────────
//     if (meta.env) {
//         const envScript = `
//         <script>
//             (function() {
//                 // 1. Visible debug overlay — shows errors ON the page
//                 var _dbg = document.createElement('div');
//                 _dbg.id = '__falbor_dbg';
//                 _dbg.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;color:#0f0;font:12px/1.4 monospace;padding:8px 12px;max-height:40vh;overflow:auto;display:none;';
//                 document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(_dbg); });

//                 function _showDbg(msg, color) {
//                     _dbg.style.display = 'block';
//                     var p = document.createElement('div');
//                     p.style.color = color || '#f44';
//                     p.textContent = msg;
//                     _dbg.appendChild(p);
//                 }

//                 // 2. Error catchers
//                 window.addEventListener('error', function(event) {
//                     console.error("[Falbor Debug] Runtime Error:", event.error);
//                     _showDbg('ERROR: ' + (event.error ? event.error.message || event.error : event.message), '#f44');
//                 });
//                 window.addEventListener('unhandledrejection', function(event) {
//                     console.error("[Falbor Debug] Unhandled Rejection:", event.reason);
//                     _showDbg('REJECTION: ' + (event.reason ? event.reason.message || event.reason : 'unknown'), '#fa0');
//                 });

//                 // 3. Environment Shims
//                 var env = ${JSON.stringify(meta.env)};
//                 window.process = window.process || {};
//                 window.process.env = { NODE_ENV: 'production', ...window.process.env, ...env };
//                 if (typeof global === 'undefined') window.global = window;

//                 // 4. Monitor React mount — hide overlay after 5s if no errors
//                 setTimeout(function() {
//                     var root = document.getElementById('root');
//                     if (root && root.children.length > 0 && _dbg.children.length === 0) {
//                         _dbg.style.display = 'none';
//                     } else if (root && root.children.length === 0) {
//                         _showDbg('WARNING: #root is empty after 5s — React may not have mounted.', '#fa0');
//                         _showDbg('Scripts on page: ' + document.querySelectorAll('script').length, '#0af');
//                         _showDbg('Env keys: ' + Object.keys(env).join(', '), '#0af');
//                     }
//                 }, 5000);

//                 console.log("[Falbor] Environment initialized.", Object.keys(env));
//             })();
//         </script>
//         `
//         if (result.includes("<head>")) {
//             result = result.replace("<head>", `<head>\n${envScript}`)
//         } else {
//             result = envScript + result
//         }
//     }

//     // ─── Title ─────────────────────────────────────────────────────────────────
//     if (meta.siteTitle) {
//         if (result.includes("<title>")) {
//             result = result.replace(/<title>[^<]*<\/title>/, `<title>${meta.siteTitle}</title>`)
//         } else if (result.includes("</head>")) {
//             result = result.replace("</head>", `<title>${meta.siteTitle}</title>\n</head>`)
//         } else {
//             result = `<head><title>${meta.siteTitle}</title></head>\n${result}`
//         }
//     }

//     // ─── Description ───────────────────────────────────────────────────────────
//     if (meta.siteDescription) {
//         const descTag = `<meta name="description" content="${meta.siteDescription.replace(/"/g, "&quot;")}" />`
//         if (result.includes('name="description"')) {
//             result = result.replace(
//                 /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
//                 descTag
//             )
//         } else if (result.includes("</head>")) {
//             result = result.replace("</head>", `${descTag}\n</head>`)
//         }
//     }

//     // ─── Favicon ───────────────────────────────────────────────────────────────
//     if (meta.favicon) {
//         let type = "image/x-icon"
//         if (meta.favicon.includes("image/png")) type = "image/png"
//         else if (meta.favicon.includes("image/svg")) type = "image/svg+xml"

//         const faviconTag = `<link rel="icon" type="${type}" href="${meta.favicon}" />`
//         if (result.includes('rel="icon"')) {
//             result = result.replace(/<link\s+rel="icon"[^>]*\/?>/, faviconTag)
//         } else if (result.includes("</head>")) {
//             result = result.replace("</head>", `${faviconTag}\n</head>`)
//         }
//     }

//     // ─── Production Scrubber ───────────────────────────────────────────────────
//     // Remove leftover Vite dev client scripts
//     result = result.replace(/<script[^>]*src=["'][^"']*\/@vite\/client["'][^>]*><\/script>/gi, "")
//     result = result.replace(/<script[^>]*src=["']http:\/\/localhost:[^"']*["'][^>]*><\/script>/gi, "")

//     // Swap any remaining import.meta.env → process.env so the runtime shim works
//     result = result.replace(/import\.meta\.env/g, "process.env")

//     // ─── Branding Badge (injected into body for free-tier users) ───────────────
//     if (meta.showBranding) {
//         const brandingHtml = `
//         <div id="falbor-branding" style="position:fixed;bottom:0;right:8px;z-index:999999;height:48px;display:flex;align-items:center;justify-content:center;padding:8px;background:rgba(255,255,255,0.8);">
//             <a href="https://falbor.xyz" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;background:rgba(0,0,0,0.9);color:white;padding:4px 16px;border-radius:4px;font-size:14px;font-weight:500;text-decoration:none;font-family:sans-serif;">
//                 <span style="margin-top:-2px;font-weight:600;">Made in</span>
//                 <span style="margin-left:6px;font-weight:700;letter-spacing:0.5px;">Falbor</span>
//             </a>
//         </div>
//         `
//         if (result.includes("</body>")) {
//             result = result.replace("</body>", `${brandingHtml}\n</body>`)
//         } else {
//             result = result + brandingHtml
//         }
//     }

//     return result
// }

// /**
//  * Fetches all env vars (Supabase + Secrets) for a project.
//  */
// async function getProjectEnvVars(projectId: string): Promise<Record<string, string>> {
//     const envVars: Record<string, string> = {}

//     // 1. Supabase
//     const [supabase] = await db
//         .select()
//         .from(projectSupabase)
//         .where(eq(projectSupabase.projectId, projectId))
//         .limit(1)

//     if (supabase) {
//         envVars["VITE_SUPABASE_URL"] = supabase.supabaseUrl
//         envVars["VITE_SUPABASE_ANON_KEY"] = supabase.anonKey
//     }

//     // 2. Secrets
//     const secrets = await db
//         .select()
//         .from(projectSecrets)
//         .where(eq(projectSecrets.projectId, projectId))

//     secrets.forEach((s) => {
//         const key = s.name.startsWith("VITE_") ? s.name : `VITE_${s.name}`
//         envVars[key] = s.value
//     })

//     return envVars
// }

// export async function GET(
//     req: NextRequest,
//     { params }: { params: Promise<{ subdomain: string }> }
// ) {
//     const { subdomain } = await params

//     // 1. Find deployment
//     const [deployment] = await db
//         .select()
//         .from(deployments)
//         .where(eq(deployments.subdomain, subdomain))
//         .limit(1)

//     if (!deployment) {
//         return new Response("Not Found", { status: 404 })
//     }

//     // 2. Find project
//     const [project] = await db
//         .select()
//         .from(projects)
//         .where(eq(projects.id, deployment.projectId))
//         .limit(1)

//     if (!project) {
//         return new Response("Not Found", { status: 404 })
//     }

//     // 3. Get env vars
//     const envVars = await getProjectEnvVars(project.id)

//     // 4. Check subscription (for branding)
//     const [ownerCredits] = await db
//         .select({ subscriptionTier: userCredits.subscriptionTier })
//         .from(userCredits)
//         .where(eq(userCredits.userId, project.userId))
//         .limit(1)

//     const hasSubscription = ownerCredits?.subscriptionTier !== "none"

//     // 5. Get dist/index.html
//     const projectFiles = await db
//         .select()
//         .from(files)
//         .where(eq(files.projectId, deployment.projectId))

//     const distHtmlFile = projectFiles.find((f) => f.path === "dist/index.html")

//     if (!distHtmlFile) {
//         return new Response(
//             "<html><body><h1>Site Not Published</h1><p>Please open the Preview tab and click Publish.</p></body></html>",
//             { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
//         )
//     }

//     // 6. Inject env vars, meta, branding into HTML
//     const finalHtml = injectMetaAndSecretsIntoHtml(distHtmlFile.content, {
//         favicon: deployment.favicon,
//         siteTitle: deployment.siteTitle,
//         siteDescription: deployment.siteDescription,
//         env: envVars,
//         showBranding: !hasSubscription,
//     })

//     return new Response(finalHtml, {
//         status: 200,
//         headers: {
//             "Content-Type": "text/html; charset=utf-8",
//             "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
//         },
//     })
// }