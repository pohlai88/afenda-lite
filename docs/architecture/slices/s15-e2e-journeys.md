# S15 — E2E journey coverage

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 15 (post Phase C) |
| **Depends on** | S1 auth, S3 operator CRUD, S4 submission, S5 share, S6–S7 client flows, S10 validation |
| **Feeds into** | CI quality gate (S13), production acceptance (doctrine §7) |

## Purpose

Automate identity, public link routing, and submission paths: smoke checks, public link redirects, client assignment journeys, and file metadata.

## Test factory

Authority: [`testing/README.md`](../../../testing/README.md). Shared E2E helpers live under `testing/e2e/`; specs import `@/testing/e2e/*`.

## Owned files

### L4 Playwright

- `e2e/smoke.spec.ts` — `@smoke` health, auth ingress, invite redirect; `@journey` operator CRUD
- `e2e/public-links.spec.ts` — `@smoke` unauthenticated redirects; `@journey` authenticated + share rotate
- `e2e/org-sidebar.spec.ts` — `@journey` operator sidebar nav
- `e2e/secure-file.spec.ts` — `@journey` file question + submission count
- `e2e/client-journey.spec.ts` — `@journey` operator assign → client submit → `CDP-*`
- `e2e/client-onboarding.spec.ts` — `@journey` register → four-step wizard → `/client`
- `e2e/client-declare-gates.spec.ts` — `@journey` declare wizard gates (review attestation, draft save)
- `e2e/client-invitation-journey.spec.ts` — `@journey` org invitation → join → onboarding
- `e2e/playground.spec.ts` — local playground iframe binding (skips when `PLAYGROUND_ENABLED` false)
- `e2e/fixtures/sample-evidence.txt` — Playwright file-input fixture

### L0 Vitest

- `lib/evidence-policy.test.ts` — MIME/size/extension policy
- `lib/portal-routes.test.ts` — `sanitizeReturnToPath`, auth href builders
- `lib/org-sign-in-entry.test.ts` — org sign-in ingress hrefs
- `lib/not-found-routing.test.ts` — session-aware not-found back links
- `lib/public-link-routing.test.ts` — session branches for public link landing
- `lib/portal-session-routing.test.ts` — authenticated landing dispatch (P3)

### L2 Vitest interaction

See `testing/README.md` — 17 interaction/a11y files including declaration form, confirm dialog, portal-atmosphere fixtures, join panel.

## CI gates

| Step | Command | When |
| --- | --- | --- |
| L0 | `npm run test:unit` | Every PR + main |
| L2 | `npm run test:interaction` | Every PR + main |
| L4 smoke | `npm run test:e2e:smoke` | Every PR + main (after build + seed) |
| L4 journey | `npm run test:e2e:journey` | **Main push only** (parallel `journey` job) |
| Full browser (local pre-release) | `npm test` | Local |

## Critical control points

- Operator creds from `SHARED_ADMIN_*` or `E2E_OPERATOR_*` env
- Client invite URL captured from UI (no email inbox automation)
- File evidence: metadata registered only; policy rejects disallowed MIME/size
- Client journey uses isolated browser context after invite issued

## Required tests

| Spec | Tag | Proves |
|------|-----|--------|
| smoke | `@smoke` / `@journey` | Readiness JSON, org login, invite redirect; operator create/delete |
| public-links | `@smoke` / `@journey` | Invalid links 404; redirect + returnTo; authenticated declare; share + rotate |
| org-sidebar | `@journey` | Sidebar links match canonical org routes |
| secure-file | `@journey` | Operator adds file question; client assignment submit; submission count |
| client-journey | `@journey` | Operator assign, client submit, `CDP-*` receipt |
| client-onboarding | `@journey` | Operator register, Neon Auth sign-in, four-step wizard, dashboard |

## Acceptance proof

- [x] `npm run test:e2e:smoke` runs in CI with secrets configured
- [x] `@journey` specs are serial and skip gracefully without operator creds
- [x] Evidence policy rejects disallowed MIME at action boundary (L0 + L4)

## Rollback

Remove or skip failing spec files; `@smoke` remains minimum CI gate.

## Drift risk

- Question editor missing `file` type breaks secure-file spec
- Neon Auth trusted-domain mismatch breaks client invite in production manual tests
- Duplicating E2E helpers outside `testing/e2e/` breaks factory SSOT
