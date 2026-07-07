# L4 Playwright (Client Declaration Portal)

On-demand reference for `/afenda-test` and `afenda-test-engineer`. Authority: [`testing/README.md`](../../../../testing/README.md)

## Layer placement

| Claim | Layer | Notes |
| --- | --- | --- |
| Zod schema, registry allowlist, pure transform | L0 | Never Playwright |
| Route handler `GET()` / loader | L1 | Vitest import — no HTTP server |
| Radix click, menu, dialog, membership option list | L2 | `*.interaction.test.tsx` + `testing/react.tsx` |
| Component layout review | L3 | Storybook — on demand, not CI gate |
| Hydration, multi-route nav, viewport overflow, full auth journey | L4 | Playwright `@smoke` / `@journey` |

**Reject:** Cypress · Jest as new runners · Playwright for claims Vitest already proves.

## Surface and options popout

| Column | Meaning |
| --- | --- |
| **Surface** | L4 view, auth ingress route, or registry artifact |
| **Options popout** | `yes` = row-actions menu, command dialog, dropdown, or membership option list; `no` = render-only or redirect; `n/a` |

**L2 before L4** unless the claim requires real navigation, hydration, or cross-route spine behavior.

## Layout

| App | Spec location | Config | Port |
| --- | --- | --- | --- |
| Client Declaration Portal | `e2e/**/*.spec.ts` | `playwright.config.ts` | 3000 |

Extend shared fixtures in `testing/e2e/` only.

## Tags

| Tag | Project | Use |
| --- | --- | --- |
| `@smoke` | `smoke` | P0 browser smoke — CI default |
| `@journey` | `journey` | Serial full-flow specs — pre-release |

## Authoring rules

1. Import from `@/testing/e2e/playwright-base` — not `@playwright/test` directly in specs
2. Locators: `getByRole`, `getByLabel`, `portalCopy` SSOT for copy assertions
3. Auth: Neon Auth via `testing/e2e/credentials.ts` — operator `SHARED_ADMIN_*`, client `PREVIEW_CLIENT_*` or `E2E_*`
4. Credentials helpers: `loginAsOperator`, `loginAsClient` from `testing/e2e/flows.ts`
5. Redundancy: keep lower layer when L0/L2 already proves the claim

## Portal auth spine

See [portal-auth-spine.md](portal-auth-spine.md) for P1–P6 spine IDs and minimum layers.

## OSS (non-authoritative)

Personal `playwright-best-practices` may inform mechanics; portal factory imports, gates, and pyramid in this repo win on conflict.
