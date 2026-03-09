# Fix Deployed Sites: Supabase Blank Pages + SPA Routing 404s

## Plan
- [x] Step 1: Create `app/deploy/[subdomain]/__html/route.ts` — serves final HTML as `text/html` with env vars + branding injected
- [x] Step 2: Update `app/deploy/[subdomain]/page.tsx` — switch iframe from `srcDoc` to `src` pointing to `/__html` route
- [x] Step 3: Update `app/deploy/[subdomain]/[...path]/route.ts` — add SPA fallback to serve `index.html` for non-asset routes
- [x] Step 4: Clean up page.tsx — removed unused helper function, env var fetching, subscription check (all moved to __html route)

## Summary of Changes
- **`__html/route.ts` (new)**: Serves `dist/index.html` as real `text/html` response with env vars, meta tags, and branding badge injected
- **`page.tsx` (simplified)**: Now just renders an iframe with `src` (not `srcDoc`), giving the deployed site a real browser origin
- **`[...path]/route.ts` (enhanced)**: Added SPA fallback — non-asset paths that don't match a file serve `index.html` with full injection
