# Post-login spine declaration table

SSOT for L4 gap analysis on ERP auth ingress. Server logic: `apps/erp/src/lib/auth/validate-post-login-membership.server.ts`.

| ID | Condition | `entryPath` | Surface | Options popout | `/auth/complete` round-trip |
| --- | --- | --- | --- | --- | --- |
| D1 | Unknown tenant | `/access-denied` | `error-access-denied-page-01` | no | no |
| D2 | No active memberships | `/access-denied?reason=unlinked` | `error-access-denied-page-01` | no | no |
| D3 | ≤1 workspace target | `/workspace` (safe default) | protected app | no | resolver may run once |
| D4 | Multi-target, single company, multi-org | `/organization/select` | `login-page-03` · workspace select ingress (org) | **yes** | **yes** — select → `/auth/complete` |
| D5 | Multi-target, multi-company | `/workspace/select` | `login-page-03` · workspace select ingress | **yes** | **yes** — select → `/auth/complete` |
| D6 | Post-select resolver | `/auth/complete` | `login-page-03` · `AuthCompleteIngressSurface` | no | **yes** — intentional spine hop |
| D7 | Single target after resolve | `next` or `/workspace` | protected destination | no | exits auth ingress |

## Test placement

| ID | Minimum layer | Suggested spec |
| --- | --- | --- |
| D1–D3 | L0 | `validate-post-login-membership.server.test.ts` |
| D4–D5 options list | L2 | `auth-workspace-selection.interaction.test.tsx` |
| D6 resolver redirect | L2 | `auth-complete-ingress.interaction.test.tsx` |
| D4–D7 full navigation | L4 | `apps/erp/e2e/auth-spine.spec.ts` (planned) |

L4 proves cross-route hydration and browser navigation L2 cannot simulate. Do not duplicate L0 assertions in L4.
