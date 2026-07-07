# Portal auth spine declaration table

SSOT for L4 gap analysis on Client Declaration Portal auth ingress. Cross-check when diffs touch `lib/org-sign-in-entry.ts`, `lib/portal-session-routing.ts`, `lib/public-link-routing.ts`, or `proxy.ts`.

| ID | Condition | Route | Surface | Options popout | Min layer |
| --- | --- | --- | --- | --- | --- |
| P1 | Anonymous org entry | `/org/login` → `/auth/sign-in?from=org` | org sign-in | no | L0 + L4 smoke |
| P2 | Org access denied | `?reason=access-denied` preserved | org sign-in notice | no | L0 + L4 |
| P3 | Client entry | `/` or `/client/login` → post-auth dispatch | client gate | no | L0 |
| P4 | Public link unauth | `/f/*`, `/survey/*` → sign-in + returnTo | auth ingress | no | L0 + L4 |
| P5 | Public link authed client | → `/client/declare/*` or onboarding | declare / onboarding | no | L4 |
| P6 | Preview unavailable | `/client/preview-unavailable` | gate view | no | L4 smoke |

## Test placement

| ID | Minimum layer | Suggested spec |
| --- | --- | --- |
| P1–P2 | L0 | `lib/org-sign-in-entry.test.ts` |
| P3 | L0 | `lib/portal-session-routing.test.ts` |
| P4 | L0 + L4 | `lib/public-link-routing.test.ts` + `lib/portal-routes.test.ts` + `e2e/public-links.spec.ts` (@smoke unauth) |
| P5 | L0 + L4 | `lib/public-link-routing.test.ts` + `e2e/public-links.spec.ts` (@journey authed) |
| P6 | L4 | `e2e/smoke.spec.ts` |

L4 proves cross-route hydration and browser navigation L2 cannot simulate. Do not duplicate L0 href-builder assertions in L4 once L0 covers them.
