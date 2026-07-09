# S18 — Playground UI review harness

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | local-dev only |
| **Depends on** | S1, S3, S6, S7 |
| **Feeds into** | Storybook (`stories/**`) and E2E for product validation |

## Purpose

Local developer harness at `/playground` that iframes real product routes with `?embed=1` for layout review. **Not a client or operator product entry point.**

## Inputs / outputs

- **Inputs:** `PLAYGROUND_ENABLED`, `PLAYGROUND_*` fixture ids, operator admin session
- **Outputs:** iframe previews, HITL route checklist, binding validation via `npm run check:playground`

## Owned files

- `app/playground/page.tsx`, `app/playground/layout.tsx`, `app/playground/error.tsx`
- `app/playground/[screenId]/page.tsx`, `app/playground/hitl-review/page.tsx`
- `lib/playground-registry.ts` — screen ids, path templates, route file bindings (SSOT)
- `lib/playground.ts` — embed helpers, nav groups, enabled gate
- `lib/playground-nav.ts` — playground href constants and review nav links
- `lib/playground-index-page.tsx`, `lib/playground-layout.tsx`
- `lib/playground-screen-page.tsx`, `lib/playground-screen.logic.ts`
- `lib/playground-hitl-review-page.tsx`, `lib/playground-hitl-rows.ts`
- `lib/playground-e2e-fixtures.ts`, `lib/operator-shell-members.ts`
- `components/playground-sidebar.tsx`, `components/playground-screen-preview.tsx`, `components/playground-hitl-route-table.tsx`
- `scripts/check-playground-bindings-runner.ts`, `e2e/playground.spec.ts`

## Critical control points

- `PLAYGROUND_ENABLED=true` required locally; never synced to Vercel production (`AGENTS.md`)
- `runPlaygroundLayout` calls `notFound()` when disabled
- `requireAdminSession` on playground layout (operator-only harness)
- Registry parity: `playgroundScreenDefs` ↔ nav ↔ E2E fixtures (`check:playground`)

## Required tests

- `npm run check:playground` — route file bindings and nav parity
- `lib/playground-embed.test.ts` — embed query helpers
- `lib/playground-screen.logic.test.ts`, `lib/playground-index-page.test.ts`, `lib/playground-screen-page.test.tsx`
- `lib/playground-hitl-rows.test.ts`
- `e2e/playground.spec.ts` — iframe binding smoke (`@smoke` when enabled)

## Acceptance proof

- [x] `/playground` redirects to first registry screen
- [x] Each registry screen resolves nav href, route file, and embed URL
- [x] HITL checklist lists all registry rows with route files
- [x] Embed requests bypass operator shell via `x-playground-embed` (`proxy.ts`)

## Must not bypass

- Do not wire product features or client journeys to depend on `/playground`
- Do not add playground-only behavior to production auth or assignment flows except `?embed=1` layout stripping

## Drift risk

- New routes added without updating `playground-registry.ts` and `playground-e2e-fixtures.ts`
- Duplicate flat `app/client/*` pages conflicting with route groups (`legacyFlatClientRouteFiles`)
