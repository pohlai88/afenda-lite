The strongest implementation sequence is PL-S1 → PL-S3 → PL-S5 → PL-S7 → PL-S9/PL-S10, because those slices establish the route, session, SDK, and write-isolation boundaries before visual polish or operational sign-off.

# Pre-Login Fullstack E2E — Development Slice Map

## 1. Mission

Implement, verify, and close the complete Pre-Login experience across:

- UI/UX
- Frontend routing and composition
- Edge/session gate
- Auth BFF
- Environment and database readiness
- Neon Auth operational integration
- Accessibility, performance, and E2E evidence

The implementation stops when an unauthenticated user reaches or interacts with the authentication boundary.

The following are not included:

- Authenticated role homes
- Organization bootstrap after login
- Operator invitation management
- Membership assignment or revocation
- Product workflows
- Successful login-to-dashboard verification
- Wrong-role authenticated `/403` journeys

---

# 2. Slice Summary

| Slice  | Name                                 |     Primary layer | Size | Dependency   |
| ------ | ------------------------------------ | ----------------: | ---: | ------------ |
| PL-S1  | Public Route Inventory and Contract  | Architecture / FE |    S | None         |
| PL-S2  | Public Landing Surface               |        UI/UX + FE |    S | PL-S1        |
| PL-S3  | Auth Island Route Shell              |        UI/UX + FE |    M | PL-S1        |
| PL-S4  | Join and Invitation Entry            |         FE + Auth |    M | PL-S1, PL-S3 |
| PL-S5  | Anonymous Session Gate               |         Edge + FE |    M | PL-S1, PL-S3 |
| PL-S6  | Client Gate Aliases                  |         FE + Edge |    S | PL-S5        |
| PL-S7  | Auth BFF Boundary                    |           Backend |    M | PL-S3        |
| PL-S8  | Health and Dependency Readiness      |      Backend + DB |    M | PL-S1        |
| PL-S9  | Neon Environment Contract            |     Platform + DB |    S | None         |
| PL-S10 | Managed Identity and Write Isolation |     Security + DB |    M | PL-S7, PL-S9 |
| PL-S11 | Recovery Mail and Trusted Domains    |        Ops + Auth |    M | PL-S7, PL-S9 |
| PL-S12 | Public Accessibility and Performance |      Quality + FE |    M | PL-S2–PL-S6  |
| PL-S13 | Pre-Login E2E Verification           |        Full stack |    M | PL-S1–PL-S12 |
| PL-S14 | HITL Evidence Closure                |        Governance |    S | PL-S13       |

---

# 3. Development Slices

## PL-S1 — Public Route Inventory and Contract

**Objective**

Establish a single, testable contract for all permitted Pre-Login routes.

**Scope**

- `/`
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/sign-up`
- `/auth/sign-out`
- `/join`
- `/auth/accept-invitation`
- `/403`
- `/client/login`
- `/client/preview-unavailable`
- `/api/auth/[...path]`
- `/api/health/liveness`
- `/api/health/readiness`

**Likely files**

```text
packages/auth/src/auth-paths.ts
packages/auth/src/index.ts
apps/web/app/(public)/**
apps/web/app/(gate)/**
apps/web/next.config.ts
apps/web/proxy.ts
apps/web/src/**/client-paths*
```

**Implementation requirements**

1. Keep public authentication routes in one typed allowlist.
2. Export canonical constants such as `AUTH_LOGIN_PATH`.
3. Do not duplicate literal `/auth/login` strings across unrelated components.
4. Explicitly reject undeclared aliases such as `/auth/sign-in`.
5. Separate public paths, gate bypasses, protected matchers, and API paths.
6. Add an inventory test comparing declared routes with expected disk surfaces.

**Acceptance criteria**

- All documented Pre-Login routes exist or redirect intentionally.
- `/auth/sign-in` is not silently accepted.
- Route constants are imported rather than locally redefined.
- No post-login route is classified as public.
- Tests fail when a public route is added without updating the contract.

**Verification**

```powershell
git ls-files "apps/web/app/(public)/**"
git ls-files "apps/web/app/(gate)/**"

pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web test -- client-paths auth-paths
```

**Exit evidence**

- Route inventory output
- Passing route contract tests
- No undeclared aliases

---

## PL-S2 — Public Landing Surface

**Objective**

Deliver the anonymous `/` landing surface with one clear authentication entry point.

**Primary route**

```text
GET /
```

**Likely files**

```text
apps/web/app/(public)/page.tsx
apps/web/app/(public)/layout.tsx
apps/web/features/public/**
packages/ui/**
```

**UI requirements**

- Afenda product identity is visible.
- One dominant “Sign in” action links to `/auth/login`.
- No authenticated application sidebar, organization switcher, Nexus navigation, or product module navigation.
- Semantic heading order is valid.
- Main content has `id="main-content"`.
- Keyboard users can reach the main content through a skip link.
- Mobile layout remains usable without horizontal overflow.
- Loading and navigation behavior must not create layout shifts.

**Boundary rule**

A signed-in user redirecting from `/` to a role home may remain existing behavior, but it is not a Pre-Login acceptance criterion.

**Acceptance criteria**

- Anonymous request returns `200`.
- Primary CTA resolves to the canonical login constant.
- No post-login shell is rendered for anonymous users.
- No anonymous database write occurs.
- Page remains functional without JavaScript enhancement where practical.

**Verification**

```powershell
curl.exe -sI http://localhost:3000/
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- public-landing
```

---

## PL-S3 — Auth Island Route Shell

**Objective**

Provide a governed Afenda shell around the Neon-managed authentication UI.

**Routes**

```text
/auth/login
/auth/forgot-password
/auth/reset-password
/auth/sign-up
/auth/sign-out
```

**Likely files**

```text
apps/web/app/(public)/auth/[path]/page.tsx
apps/web/app/(public)/auth/[path]/loading.tsx
apps/web/app/(public)/auth/[path]/error.tsx
apps/web/features/auth/**
apps/web/styles/auth-surface.css
packages/auth/src/auth-paths.ts
```

**Implementation requirements**

1. Keep the dynamic page thin.
2. Resolve the route through the typed public auth-path contract.
3. Return `notFound()` for unsupported auth paths.
4. Render Neon Auth UI inside an Afenda-owned visual shell.
5. Keep credential processing and identity storage provider-owned.
6. Provide loading, error, and recovery states.
7. Do not create a second application-owned login form.
8. Do not expose secrets or provider error internals.
9. Normalize user-facing auth errors into safe copy.
10. Ensure every auth surface has accessible labels and focus behavior.

**Acceptance criteria**

- Every declared public auth path returns `200`.
- `/auth/sign-in` returns `404`.
- Login UI is rendered inside the governed auth island.
- Loading and error files exist.
- Skip link targets `#main-content`.
- Browser back/forward navigation works.
- No Neon SDK import appears in the page or feature layer outside `@afenda/auth`.

**Verification**

```powershell
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- auth-paths auth-surface

curl.exe -sI http://localhost:3000/auth/login
curl.exe -sI http://localhost:3000/auth/forgot-password
curl.exe -sI http://localhost:3000/auth/reset-password
curl.exe -sI http://localhost:3000/auth/sign-up
curl.exe -sI http://localhost:3000/auth/sign-out
curl.exe -sI http://localhost:3000/auth/sign-in
```

---

## PL-S4 — Join and Invitation Entry

**Objective**

Implement the public invitation entry surface without crossing into authenticated membership completion.

**Routes**

```text
GET /join
GET /join?invitationId={value}
GET /auth/accept-invitation?invitationId={value}
```

**Likely files**

```text
apps/web/app/(public)/join/page.tsx
apps/web/app/(public)/join/loading.tsx
apps/web/features/auth/public-message-shell.tsx
apps/web/next.config.ts
packages/auth/src/**
```

**States**

| State                   | Expected behavior                                     |
| ----------------------- | ----------------------------------------------------- |
| No invitation ID        | Show invitation-required message                      |
| Invitation ID present   | Render managed invitation entry or handoff            |
| Malformed ID            | Safe validation response                              |
| Accept-invitation alias | `308` redirect to `/join`, preserving query           |
| Provider error          | Safe recoverable error message                        |
| Expired invitation      | Provider-backed message; no invented membership state |

**Implementation requirements**

- Validate query shape without logging the invitation token.
- Preserve query parameters across the alias redirect.
- Provide a direct link to `/auth/login`.
- Do not write `platform_membership` directly.
- Do not treat invitation presence as proof of authorization.
- Keep actual acceptance and session creation outside this slice’s PASS boundary.

**Acceptance criteria**

- `/join` renders an invitation-required state.
- `/join?invitationId=test` renders safely.
- Alias returns `308`.
- Redirect preserves `invitationId`.
- Invitation values do not appear in application logs.
- No application tenancy write occurs before managed acceptance.

**Verification**

```powershell
curl.exe -sI http://localhost:3000/join
curl.exe -sI "http://localhost:3000/join?invitationId=test"
curl.exe -sI "http://localhost:3000/auth/accept-invitation?invitationId=test"

pnpm --filter @afenda/web test -- join accept-invitation
```

---

## PL-S5 — Anonymous Session Gate

**Objective**

Ensure protected document navigation is denied at the edge and redirected to the canonical login URL.

**Likely files**

```text
apps/web/proxy.ts
packages/auth/src/proxy.ts
packages/auth/src/session-gate-policy.ts
packages/auth/src/auth-paths.ts
apps/web/e2e/smoke/anonymous-gate.spec.ts
```

**Implementation requirements**

1. Use `createSessionProxy()` from `@afenda/auth`.
2. Keep matcher policy explicit and testable.
3. Bypass only approved public, auth, health, static, embed, and client-gate surfaces.
4. Preserve the original destination through a safe return-path mechanism where approved.
5. Reject open redirect targets.
6. Distinguish document navigation from API or Server Action requests.
7. Do not redirect API calls to HTML login pages when a structured unauthorized response is required.
8. Do not execute product database reads before anonymous denial.

**Acceptance criteria**

- Anonymous `/admin` redirects to `/auth/login`.
- Anonymous `/fft` redirects to `/auth/login`.
- Anonymous `/client/declarations` redirects to `/auth/login`.
- Public routes remain accessible.
- Auth BFF remains reachable.
- Health routes remain reachable.
- Static assets do not enter the auth gate.
- Server Action POST and approved embed behavior match the governing policy.
- Return-path values cannot point to an external origin.

**Verification**

```powershell
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web test -- session-gate-policy session-proxy-request
pnpm exec playwright test e2e/smoke/anonymous-gate.spec.ts
```

---

## PL-S6 — Client Gate Aliases

**Objective**

Normalize legacy or client-facing entry routes without creating a second authentication system.

**Routes**

```text
/client/login
/client/preview-unavailable
```

**Likely files**

```text
apps/web/app/(gate)/login/page.tsx
apps/web/app/(gate)/preview-unavailable/page.tsx
apps/web/src/**/client-paths.ts
packages/auth/src/session-gate-policy.ts
```

**Implementation requirements**

- `/client/login` redirects to canonical `/auth/login`.
- Do not duplicate auth UI at `/client/login`.
- `/client/preview-unavailable` remains anonymously accessible only when explicitly approved.
- Gate paths must be represented in one typed client-path contract.
- Gate surfaces must not import authenticated product shells.

**Acceptance criteria**

- `/client/login` resolves to `/auth/login`.
- Redirect does not loop.
- Preview-unavailable returns the intended status and content.
- Both routes are covered by route-policy tests.
- No product data is fetched.

**Verification**

```powershell
curl.exe -sI http://localhost:3000/client/login
curl.exe -sI http://localhost:3000/client/preview-unavailable

pnpm --filter @afenda/web test -- client-paths session-gate-policy
```

---

## PL-S7 — Auth BFF Boundary

**Objective**

Expose the Neon Auth server handlers through one governed application BFF route.

**Route**

```text
/api/auth/[...path]
```

**Likely files**

```text
apps/web/app/api/auth/[...path]/route.ts
packages/auth/src/api.ts
packages/auth/src/index.ts
packages/auth/src/__tests__/**
apps/web/**/auth-bff-route.test.ts
```

**Implementation requirements**

1. The route delegates to `createAuthApiHandlers()`.
2. Provider SDK imports remain inside `@afenda/auth`.
3. Export only required HTTP handlers.
4. Apply provider-compatible cookie and origin handling.
5. Do not wrap the managed protocol in a competing application protocol.
6. Do not expose raw exception bodies.
7. Apply request correlation without logging credentials or tokens.
8. Validate trusted origin and host behavior.
9. Preserve provider-required headers.
10. Keep the BFF excluded from application OpenAPI where the provider owns the contract.

**Acceptance criteria**

- Route handler test passes.
- Handlers are package-sourced.
- No direct Neon Auth SDK imports exist in `apps/web`.
- Secrets and authorization headers are redacted.
- Unsupported methods behave safely.
- Provider cookie behavior passes request-level tests.

**Verification**

```powershell
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web test -- auth-bff-route
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web typecheck
```

---

## PL-S8 — Health and Dependency Readiness

**Objective**

Provide truthful liveness and readiness responses for the Pre-Login dependency chain.

**Routes**

```text
GET /api/health/liveness
GET /api/health/readiness
```

**Likely files**

```text
apps/web/app/api/health/liveness/route.ts
apps/web/app/api/health/readiness/route.ts
apps/web/modules/platform/domain/health.ts
packages/db/**
packages/env/**
openapi/**
```

**Liveness behavior**

- Confirms the web process can serve a response.
- Does not require database access.
- Does not require a Neon Auth network call.

**Readiness behavior**

- Runs a bounded database `select 1`.
- Reports storage status truthfully.
- Reports auth environment configuration truthfully.
- Distinguishes “configured” from “provider reachable”.
- Uses a strict timeout.
- Returns a non-ready status when critical dependencies are unavailable.
- Does not expose connection strings or secret values.

**Suggested response model**

```ts
type ReadinessStatus = {
  status: "ready" | "degraded" | "not_ready";
  checks: {
    storage: {
      provider: "postgres";
      status: "reachable" | "unreachable";
    };
    auth: {
      provider: "neon_auth";
      status: "configured" | "misconfigured";
    };
  };
};
```

**Acceptance criteria**

- Liveness returns `200`.
- Readiness reports `storage.provider = "postgres"`.
- Valid env and reachable DB produce a ready response.
- Missing auth configuration is reported as misconfigured.
- Unreachable DB cannot be represented as ready.
- Response contains no secrets.
- Health operations match OpenAPI disk truth.

**Verification**

```powershell
curl.exe -s http://localhost:3000/api/health/liveness
curl.exe -s http://localhost:3000/api/health/readiness

pnpm check:openapi
pnpm --filter @afenda/web test -- health
```

---

## PL-S9 — Neon Environment Contract

**Objective**

Validate all environment values required by the Pre-Login auth and readiness boundaries.

**Likely files**

```text
packages/env/src/neon-contract.ts
packages/env/src/**
scripts/validate-neon-env.*
.env.example
turbo.json
package.json
```

**Required contract areas**

- `DATABASE_URL`
- Neon project identifier
- Neon branch identifier
- Environment/branch posture
- `NEON_AUTH_BASE_URL`
- Cookie secret with minimum length
- `APP_URL`
- Approved local and production hosts
- Production branch baseline-migration prohibition
- Pooler/direct URL classification where applicable

**Implementation requirements**

- Parse once through `@afenda/env`.
- Do not read raw `process.env` throughout feature code.
- Reject malformed URLs.
- Reject short cookie secrets.
- Identify production branch mismatches.
- Never print secret values.
- Keep `.env.local` ignored.
- Keep example values non-secret.

**Acceptance criteria**

```powershell
pnpm validate:neon-env
```

must:

- exit `0` for a valid environment;
- exit non-zero for missing required variables;
- reject a cookie secret below the minimum;
- reject malformed `APP_URL`;
- identify a prohibited production branch migration posture;
- redact all sensitive values.

---

## PL-S10 — Managed Identity and Write Isolation

**Objective**

Prove that anonymous and auth-entry requests do not create unauthorized application-owned identity or tenancy writes.

**Review scope**

```text
apps/web/app/(public)/**
apps/web/app/(gate)/**
apps/web/app/api/auth/**
packages/auth/**
packages/db/**
```

**Prohibited Pre-Login writes**

- `platform_rbac_audit`
- organization or tenant membership
- role assignment
- permission assignment
- declarations
- FFT records
- product audit records
- application-owned session tables
- parallel user credential tables

**Permitted behavior**

- Provider-managed Neon Auth operations through the BFF
- Readiness `select 1`
- Safe telemetry without credentials, tokens, or invitation values
- Rate-limit bookkeeping only when governed and privacy-safe

**Implementation requirements**

- Add a static dependency or import-boundary test.
- Add a test that fails if public route modules import product write commands.
- Confirm identity persistence remains provider-owned.
- Document that provider-owned tables are not application migration targets.
- Preserve the production baseline migration prohibition.

**Acceptance criteria**

- Public route dependency test passes.
- No application tenancy command is reachable from anonymous routes.
- No app session table is introduced.
- Neon-managed auth storage is confirmed operationally.
- Readiness remains read-only.

**Verification**

```powershell
pnpm --filter @afenda/web test -- prelogin-write-isolation
pnpm --filter @afenda/auth test
pnpm exec turbo run lint typecheck --filter=@afenda/web --filter=@afenda/auth
```

---

## PL-S11 — Recovery Mail and Trusted Domains

**Objective**

Close the operational path for forgot-password and invitation email delivery.

**Ownership**

- Neon Auth: message generation and dispatch integration
- Zoho SMTP: mail transport
- Afenda application: trusted URLs, UI entry, safe error handling
- Ops: console configuration and mailbox evidence

**Implementation and operational checks**

1. Confirm Zoho SMTP is configured in Neon Auth.
2. Confirm the sender identity is authorized.
3. Confirm `APP_URL` matches an approved callback origin.
4. Register local, preview, and production domains as required.
5. Trigger a forgot-password email to an approved test mailbox.
6. Confirm message receipt.
7. Confirm reset link returns to the expected auth surface.
8. Confirm invitation mail follows the Neon-managed route.
9. Confirm no application-owned SMTP module sends these messages.
10. Record redacted evidence only.

**Acceptance criteria**

- Forgot-password request leaves Neon Auth.
- Approved mailbox receives the message.
- Callback host is trusted.
- Reset entry returns to `/auth/reset-password` or the provider-approved equivalent.
- No app SMTP path duplicates provider delivery.
- Failures are recorded as `BLOCKED` with a named owner rather than marked PASS.

**Evidence**

- Redacted Neon console screenshot
- Redacted received-message screenshot
- Trusted-domain list
- Test date, environment, operator, and result

---

## PL-S12 — Public Accessibility and Performance

**Objective**

Meet the enterprise public-surface quality floor for login and forbidden states.

**Required surfaces**

- `/`
- `/auth/login`
- `/join`
- `/403`
- `/client/preview-unavailable`

**Accessibility requirements**

- Skip link
- Valid main landmark
- Valid heading hierarchy
- Programmatic field labels
- Error announcement
- Visible keyboard focus
- No keyboard trap
- Meaningful page title
- Sufficient contrast
- Reduced-motion handling
- Correct autocomplete attributes
- Focus moved appropriately after auth errors
- Decorative assets hidden from assistive technology

**Performance requirements**

- No unnecessary post-login bundles on public routes.
- Avoid importing product module registries.
- Auth island CSS remains scoped.
- Fonts and hero assets do not block interaction unnecessarily.
- No severe cumulative layout shift.
- Loading state reserves stable space.
- Public route JavaScript remains within the governed budget.

**Acceptance criteria**

- A11Y03-P1 and A11Y03-P2 pass.
- Axe finds no critical or serious violations.
- Skip link works by keyboard.
- Public CWV tests meet configured budgets.
- Auth and `/403` pages remain usable at narrow viewport widths.
- Auth errors are announced to screen readers.

**Verification**

```powershell
pnpm --filter @afenda/web test -- ux-a11y-i18n-perf-matrix.inventory

pnpm exec playwright test `
  e2e/smoke/a11y-assistive-matrix.spec.ts `
  e2e/smoke/fe-cwv-budgets.spec.ts
```

---

## PL-S13 — Pre-Login E2E Verification

**Objective**

Execute the complete anonymous journey and provide reproducible evidence.

**Required scenarios**

### Scenario A — Landing to Login

```text
/ → Sign in → /auth/login
```

Expected:

- landing returns `200`;
- one primary CTA exists;
- CTA resolves to canonical login;
- auth island renders.

### Scenario B — Protected Anonymous Navigation

```text
/admin → /auth/login
/fft → /auth/login
/client/declarations → /auth/login
```

Expected:

- anonymous request is denied;
- no protected shell flashes;
- no product query or write executes;
- redirect cannot be externally manipulated.

### Scenario C — Recovery Entry

```text
/auth/login → forgot password → recovery shell
```

Expected:

- recovery shell is reachable;
- managed email operation is invoked through the auth provider;
- application does not send mail directly.

### Scenario D — Join Without Invitation

```text
/join
```

Expected:

- invitation-required message;
- sign-in link;
- no membership mutation.

### Scenario E — Invitation Alias

```text
/auth/accept-invitation?invitationId=test
→ /join?invitationId=test
```

Expected:

- `308`;
- query preserved;
- no token logging.

### Scenario F — Forbidden Public Shell

```text
/403
```

Expected:

- `200`;
- accessible heading and main landmark;
- no authenticated data requirements.

### Scenario G — Health

```text
/api/health/liveness
/api/health/readiness
```

Expected:

- liveness truthful;
- readiness reports DB and auth-env status;
- no secrets exposed.

**Required command bundle**

```powershell
pnpm validate:neon-env

pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test

pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- `
  session-gate-policy `
  session-proxy-request `
  client-paths `
  auth-bff-route `
  role-shells `
  prelogin-write-isolation

pnpm check:openapi

pnpm exec playwright test `
  e2e/smoke/anonymous-gate.spec.ts `
  e2e/smoke/a11y-assistive-matrix.spec.ts `
  e2e/smoke/fe-cwv-budgets.spec.ts

pnpm exec turbo run lint typecheck test `
  --filter=@afenda/web `
  --filter=@afenda/auth
```

**Acceptance criteria**

- Every mandatory command passes.
- Browser evidence exists for all public routes.
- Operational checks are separately signed.
- Skipped authenticated tests do not block Pre-Login closure when they are expressly post-login.
- A failed or unavailable check is recorded as `FAIL` or `BLOCKED`, never silently omitted.

---

## PL-S14 — HITL Evidence Closure

**Objective**

Close the scratch HITL mission without overstating program readiness.

**Required evidence record**

| Field         | Required content                                      |
| ------------- | ----------------------------------------------------- |
| Slice         | PL-S1 through PL-S14                                  |
| Commit        | Verified commit SHA                                   |
| Environment   | Local, preview, or production                         |
| Command       | Exact command executed                                |
| Result        | PASS, FAIL, or BLOCKED                                |
| Date          | Execution date                                        |
| Operator      | Human or CI identity                                  |
| Artifact      | Log, screenshot, CI URL, or redacted console evidence |
| Blocker owner | Required for BLOCKED                                  |
| Remediation   | Required for FAIL                                     |

**Layer closure rules**

A layer can be marked `PASS` only when every mandatory criterion for that layer passes.

A layer can be marked `BLOCKED` only when:

- the dependency is genuinely unavailable;
- the blocker is named;
- an owner is assigned;
- the next action is documented.

A partial pass cannot be summarized as:

- GUIDE-018 READY;
- I6 complete;
- GUIDE-017 compliant;
- Neon Auth N19;
- product authentication complete;
- post-login E2E complete.

**Final Pre-Login result**

```text
PASS
```

only when:

- UI-UX = PASS
- Frontend = PASS
- DB = PASS
- Backend = PASS
- security isolation = PASS
- public accessibility = PASS
- operational auth configuration = PASS

Otherwise the result must be:

```text
FAIL
```

or:

```text
BLOCKED
```

with named findings.

---

# 4. Recommended Delivery Waves

## Wave 1 — Contract and Routing

- PL-S1 Public Route Inventory
- PL-S2 Public Landing
- PL-S3 Auth Island
- PL-S4 Join Entry
- PL-S6 Client Gate Aliases

**Gate**

All public routes compile, resolve correctly, and have route-contract tests.

---

## Wave 2 — Authentication Boundary

- PL-S5 Anonymous Session Gate
- PL-S7 Auth BFF
- PL-S9 Environment Contract
- PL-S10 Managed Identity and Write Isolation

**Gate**

Anonymous protected navigation is denied before product access, and provider SDK ownership remains inside `@afenda/auth`.

---

## Wave 3 — Operational Readiness

- PL-S8 Health and Readiness
- PL-S11 Recovery Mail and Trusted Domains

**Gate**

Database readiness, auth configuration, callback domains, and mail transport have truthful evidence.

---

## Wave 4 — Enterprise Verification

- PL-S12 Accessibility and Performance
- PL-S13 Fullstack E2E Verification
- PL-S14 HITL Evidence Closure

**Gate**

All four layers are signed PASS, or the ledger remains explicitly FAIL/BLOCKED.

---

# 5. Slice Dependency Graph

```text
PL-S1
├── PL-S2
├── PL-S3
│   ├── PL-S4
│   └── PL-S7
│       ├── PL-S10
│       └── PL-S11
├── PL-S5
│   └── PL-S6
└── PL-S8

PL-S9
├── PL-S8
├── PL-S10
└── PL-S11

PL-S2–PL-S6
└── PL-S12

PL-S1–PL-S12
└── PL-S13
    └── PL-S14
```

---

# 6. Definition of Done

The Pre-Login development cut is complete when:

1. Public route inventory matches disk.
2. Anonymous landing and auth routes render successfully.
3. Unsupported auth aliases return `404`.
4. Join and invitation redirects behave safely.
5. Protected anonymous navigation redirects before product access.
6. Client login uses the canonical auth route.
7. Auth protocol is exposed only through the governed BFF.
8. Provider SDK access is contained within `@afenda/auth`.
9. Environment validation passes.
10. Readiness truthfully reports PostgreSQL and auth configuration.
11. Anonymous routes cannot mutate tenancy or product data.
12. Neon Auth remains the identity store.
13. Zoho SMTP and trusted domains are operationally confirmed.
14. Public accessibility and performance gates pass.
15. Browser and command evidence is attached.
16. UI-UX, Frontend, DB, and Backend owners sign the ledger.
17. No post-login success claim is made.
18. No GUIDE-018 I6, GUIDE-017 READY, or invented N19 claim is produced.

---

# 7. Recommended Next Artifact

After PL-S14 is closed, create a separate **Post-Login HITL development slice map** beginning with:

- session bootstrap;
- cookie synchronization;
- active organization resolution;
- role-home routing;
- wrong-role `/403`;
- authenticated navigation;
- organization and tenancy enforcement;
- logout and session revocation;
- operator/client product-entry boundaries.

Do not merge those concerns back into the Pre-Login ledger.
