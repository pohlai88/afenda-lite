# Next.js MCP — runtime verify

Elite-adapted from Xerp `runtime-mcp.md`. Uses this repo’s `next-devtools` MCP.

## Wiring

| Item | Value |
|------|-------|
| MCP server | `project-0-client-declaration-portal-next-devtools` (or local `next-devtools`) |
| Default app | port **3000** after `npm run dev` |

Checkout may be docs-first (no product tree). Only run MCP verify when a Next app is actually running.

## Tool sequence

```text
nextjs_index
nextjs_call → get_project_metadata
nextjs_call → get_routes
nextjs_call → get_errors
```

## After App Router edits

1. `get_routes` — paths match [ARCH-012](../../../docs/architecture/ARCH-012-app-router-routes.md)  
2. `get_errors` — must be clean before claiming done  

Also use Vercel `nextjs` **debug-tricks**: confirm the real dev port (do not assume 3000); Next 16 exposes `/_next/mcp` by default.

## Known P0 patterns to avoid

| Issue | Fix |
|-------|-----|
| `error.tsx` without `'use client'` or with Studio barrels | Client-safe UI only |
| Async `'use client'` components | Fetch in RSC parent |
| Skipping MCP after route edits | Always `get_errors` |

## API uncertainty

- Vercel plugin **`nextjs`** (+ `next-cache-components` · `routing-middleware` · `vercel-functions`)  
- Mapped Afenda digest: [nextjs-conventions.md](nextjs-conventions.md)  
- Perf picks: [vercel-perf.md](vercel-perf.md)  
- Docs: MCP `search_vercel_documentation` when APIs drift  

## Audit

Full scorecard: [app-router-audit.md](app-router-audit.md)
