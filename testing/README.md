# Portal test factory

Single source of truth for test commands, pyramid placement, and shared helpers in the Client Declaration Portal.

Gap analysis: `/afenda-test` · Persona: [`.agents/subagents/afenda-test-engineer.md`](../.agents/subagents/afenda-test-engineer.md)

## Pyramid

| Layer | Runner | Location | CI gate |
| --- | --- | --- | --- |
| L0 | Vitest node | `lib/**/*.test.ts`, `app/api/**/*.test.ts` | `npm run test:unit` |
| L2 | Vitest jsdom | `**/*.interaction.test.tsx` | `npm run test:interaction` |
| L3 | Storybook | `stories/**` | on demand (layout review) |
| L4 smoke | Playwright `@smoke` | `e2e/**/*.spec.ts` | `npm run test:e2e:smoke` |
| L4 journey | Playwright `@journey` | `e2e/**/*.spec.ts` | `npm run test:e2e:journey` (main push CI) |

Registry scripts (`npm run checks`) act as non-Vitest L0 substitutes for copy, nav, and proxy allowlists.

## Commands

```bash
npm run test:unit           # L0 — pure lib, policy, href builders
npm run test:interaction    # L2 — Radix menus, dialogs, dropdowns
npm run test:e2e:smoke      # L4 — auth ingress, health, public links (CI)
npm run test:e2e:journey    # L4 — full operator/client flows
npm test                    # all Playwright projects (local pre-release)
```

## Factory layout

```
testing/
  vitest.config.ts       # unit + interaction projects
  vitest.setup.ts        # jsdom polyfills (matchMedia)
  react.tsx              # renderPortal, setupUser
  e2e/
    playwright-base.ts   # re-export test/expect — use in specs
    credentials.ts       # operator/client creds from env
    fixtures.ts          # evidence path, playground fixtures
    operator-flows.ts    # loginAsOperator, createDeclaration, …
    client-flows.ts      # loginAsClient
    onboarding-flows.ts  # completeClientOnboardingWizard
    declaration-flows.ts # submitDefaultDeclarationAnswers, …
    client-declare-gates.ts # declare gate assertions + portal ack fixtures
e2e/
  **/*.spec.ts           # L4 specs — import from @/testing/e2e/*
  helpers/               # thin re-exports (deprecated — prefer @/testing/e2e)
```

**Rule:** Credentials, fixtures, and flow helpers live only under `testing/e2e/`. Specs import `@/testing/e2e/playwright-base`, not `@playwright/test` directly.

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

## E2E environment

| Variable | Purpose |
| --- | --- |
| `SHARED_ADMIN_EMAIL` / `SHARED_ADMIN_PASSWORD` | Operator login |
| `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD` | Operator override |
| `PREVIEW_CLIENT_EMAIL` / `CLIENT_DEFAULT_PASSWORD` | Preview client journeys |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | Client override |
| `E2E_SURVEY_SLUG` / `E2E_INVITE_TOKEN` | Public link smoke without operator create |
| `PLAYWRIGHT_REUSE_SERVER` | Reuse running dev server locally (`true` when port 3000 is already up) |

Run `npm run env:compose` before local E2E.

## Playwright projects

| Project | Grep | Use |
| --- | --- | --- |
| `smoke` | `@smoke` | PR + main CI — fast browser gate |
| `journey` | `@journey` | Main push CI + local pre-release |
| `all` | (none) | Local full suite via `npm test` |

Tag `@smoke` or `@journey` in the **describe** title (grep matches describe + test names).

## Auth spine

Portal auth ingress IDs P1–P6: [`.agents/skills/afenda-test/reference/portal-auth-spine.md`](../.agents/skills/afenda-test/reference/portal-auth-spine.md)

## Prove-It (bugs)

1. Write the failing test at the lowest layer that captures the bug
2. Confirm no existing test covers the scenario
3. Fix code; keep the test

## L0 coverage (initial)

- `lib/evidence-policy.test.ts`
- `lib/portal-routes.test.ts`
- `lib/org-sign-in-entry.test.ts`
- `lib/not-found-routing.test.ts`
- `lib/public-link-routing.test.ts`
- `lib/portal-session-routing.test.ts`

## L2 coverage (initial)

- `components/team-switcher.interaction.test.tsx`
- `components/declaration-row-delete-action.interaction.test.tsx` — menu item → confirm dialog chain (DropdownMenu stubbed)
- `components/confirm-dialog.interaction.test.tsx`

## Rejected runners

Cypress and Jest are not used in this repo.
