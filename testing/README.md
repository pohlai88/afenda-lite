# Portal test factory

Single source of truth for test commands, pyramid placement, and shared helpers.

**Program status:** [doc/architecture/closed-scope-register.md](../doc/architecture/closed-scope-register.md) · FFT ops: [docs/fft/ops/gate-register.md](../docs/fft/ops/gate-register.md) · **Architecture:** [S15](../docs/architecture/slices/s15-e2e-journeys.md)

---

## Pyramid

| Layer | Runner | Location | CI |
| --- | --- | --- | --- |
| L0 | Vitest node | `lib/**/*.test.ts`, `modules/**/*.test.ts`, `features/**/*.test.ts(x)`, `app/api/**/*.test.ts` | `npm run test:unit` |
| L2 | Vitest jsdom | `**/*.interaction.test.tsx`, `**/*.a11y.test.tsx` | `npm run test:interaction` |
| Registry | Node scripts | `npm run checks` | Every PR |
| L4 smoke | Playwright `@smoke` | `e2e/**/*.spec.ts` | `npm run test:e2e:smoke` |
| L4 journey | Playwright `@journey` | `e2e/**/*.spec.ts` | `npm run test:e2e:journey` (main push) |

**Last verified (local):** L0 **391** · L2 **58** · `npm run checks` 12 gates · `npm run build` pass

---

## Commands

```bash
npm run test:unit           # L0
npm run test:interaction    # L2 (single worker — Radix portals)
npm run test:e2e:smoke      # L4 smoke
npm run test:e2e:journey    # L4 journey
npm test                    # all Playwright projects
npm run env:compose         # before local E2E
```

---

## Factory layout

```
testing/
  vitest.config.ts          # unit + interaction projects
  vitest.setup.ts           # jsdom polyfills (matchMedia, ResizeObserver, timers)
  react.tsx                 # renderPortal, setupUser
  css-contract.ts           # CSS contract helpers (portal-atmosphere L0)
  unit/
    domain-fixtures.ts      # ClientProfile, Assignment, Survey fixtures (L0)
  mocks/
    server-only.ts          # Vitest alias
    next-image.tsx          # Vitest alias (owl/atmosphere interaction tests)
  e2e/
    env.ts                  # loadPlaywrightEnv — used by playwright.config.ts
    run-node-script.ts      # runNodeScript* — no --env-file=.env in CI
    playwright-base.ts      # re-export test/expect — use in specs
    credentials.ts          # operator/client creds from env
    fixtures.ts             # evidence path, playground fixtures
    organization-admin-flows.ts       # loginAsOperator, createDeclaration, …
    client-flows.ts         # loginAsClient
    onboarding-flows.ts     # expectClientOnboardingUnavailable (wizard blocked)
    declaration-flows.ts    # submitDefaultDeclarationAnswers, …
    client-declare-gates.ts # ack gate + assignment lookup via scripts
    client-invitation-flows.ts # join journey + Neon test-user helpers
    radix-select.ts         # Radix select helper for operator forms
e2e/
  **/*.spec.ts              # L4 specs — import @/testing/e2e/* only
  fixtures/                 # sample-evidence.pdf, .txt
```

**Rules**

1. Credentials, flows, and Playwright base live under `testing/e2e/` only.
2. Specs import `@/testing/e2e/playwright-base`, not `@playwright/test` directly.
3. E2E script helpers use `runNodeScript` with inherited `process.env` — not `--env-file=.env`.
4. Tag `@smoke` or `@journey` in **describe** titles (Playwright grep matches describe + test names).

---

## L4 specs (S15)

| Spec | Tags | Proves |
| --- | --- | --- |
| `smoke.spec.ts` | smoke, journey | Health, auth ingress, invite redirect; operator CRUD |
| `public-links.spec.ts` | smoke, journey | Invalid links, returnTo, authenticated declare, share rotate |
| `org-sidebar.spec.ts` | journey | Sidebar → canonical org routes |
| `secure-file.spec.ts` | journey | File question, client submit, submission count |
| `client-journey.spec.ts` | journey | Assign → submit → `CDP-*` receipt |
| `client-onboarding.spec.ts` | journey | Register → wizard → `/client` |
| `client-declare-gates.spec.ts` | journey | Review attestation, draft save, ack gate |
| `client-invitation-journey.spec.ts` | journey | Org invite → join → onboarding |
| `playground.spec.ts` | smoke | Playground bindings (skips when `PLAYGROUND_ENABLED` false) |

---

## E2E environment

| Variable | Purpose |
| --- | --- |
| `SHARED_ADMIN_EMAIL` / `SHARED_ADMIN_PASSWORD` | Operator login |
| `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD` | Operator override |
| `PREVIEW_CLIENT_EMAIL` / `CLIENT_DEFAULT_PASSWORD` | Preview client journeys |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | Client override |
| `E2E_SURVEY_SLUG` / `E2E_INVITE_TOKEN` | Public link smoke without operator create |
| `PLAYWRIGHT_REUSE_SERVER` | Reuse dev server on port 3000 |
| `PLAYWRIGHT_BASE_URL` | Override base URL (default `http://localhost:3000`) |

---

## Minimum gates by change type

| Changed | Gate |
| --- | --- |
| Pure lib routing/auth/policy | `npm run test:unit` |
| Health route handlers | `npm run test:unit` |
| Radix menu/dialog/dropdown | `npm run test:interaction` |
| Auth ingress / public links | `npm run test:e2e:smoke` |
| Full client/operator journeys | `npm run test:e2e:journey` |
| Governance registries | `npm run checks` |
| Release / pre-merge browser | `npm test` |

---

## Prove-It (bugs)

1. Write the failing test at the lowest layer that captures the bug.
2. Confirm no existing test covers the scenario.
3. Fix code; keep the test.

---

## Rejected

Cypress, Jest, and duplicate helpers under `e2e/helpers/` (removed — use `@/testing/e2e/*`).
