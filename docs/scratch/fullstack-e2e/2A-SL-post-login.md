The most important sequence is POL-S1 → POL-S2 → POL-S3 → POL-S5/POL-S6 → POL-S8. That establishes session, tenancy, role, and permission authority before implementing organization writes or declaration workflows.

# Post-Login Fullstack E2E — Development Slice Map

## 1. Mission

Implement and verify the authenticated application boundary beginning after Neon Auth has established a valid session.

The development scope covers:

- Session completion and cookie synchronization
- Active-organization resolution
- Post-login role-home routing
- Operator and client role shells
- Tier-2 permission enforcement
- Organization administration
- Invitation, role assignment, and role revocation
- Client declaration draft and submission
- Tenant isolation and durable audit records
- FFT Phase 2A list-only access
- Authenticated accessibility and E2E evidence

This slice map must not:

- reopen completed Neon Auth N1–N18 slices;
- invent N19;
- reopen FFT Phase 2B–2D;
- create deep `/fft/*` routes;
- claim GUIDE-018 I6 complete;
- claim GUIDE-017 READY;
- apply the `0000_*` database baseline to production.

---

# 2. Slice Register

| Slice   | Name                                    | Primary layer   | Size | Dependencies             |
| ------- | --------------------------------------- | --------------- | ---: | ------------------------ |
| POL-S1  | Post-Login Route and Role-Home Contract | Auth / FE       |    S | Pre-Login closed         |
| POL-S2  | Session Cookie Synchronization          | Auth / BE       |    M | POL-S1                   |
| POL-S3  | Active Organization Resolution          | Auth / Tenancy  |    M | POL-S2                   |
| POL-S4  | Authenticated Public Bounce             | Auth / FE       |    S | POL-S1–POL-S3            |
| POL-S5  | Operator Role Shell                     | FE / Authz      |    M | POL-S1–POL-S3            |
| POL-S6  | Client Workspace Role Shell             | FE / Authz      |    M | POL-S1–POL-S3            |
| POL-S7  | Authenticated Forbidden Boundary        | FE / Security   |    S | POL-S5, POL-S6           |
| POL-S8  | Tier-2 Permission Kernel                | Authz / DB      |    M | POL-S3                   |
| POL-S9  | Organization Administration Surface     | FE / Domain     |    L | POL-S5, POL-S8           |
| POL-S10 | Invite Organization Member              | BE / Auth / Ops |    M | POL-S8, POL-S9           |
| POL-S11 | Assign Organization Role                | BE / DB         |    M | POL-S8, POL-S9           |
| POL-S12 | Revoke Organization Role                | BE / DB         |    M | POL-S8, POL-S9           |
| POL-S13 | RBAC Audit Durability                   | DB / Security   |    M | POL-S10–POL-S12          |
| POL-S14 | FFT Phase 2A Read Shell                 | FE / Authz      |    M | POL-S5, POL-S8           |
| POL-S15 | Client Declaration Home                 | FE / Domain     |    M | POL-S6                   |
| POL-S16 | Declaration Draft API and Recovery      | FE / BE / DB    |    L | POL-S15                  |
| POL-S17 | Declaration Submission and Readback     | FE / BE / DB    |    L | POL-S16                  |
| POL-S18 | Client Route Aliases                    | FE              |    S | POL-S15                  |
| POL-S19 | Cross-Tenant Denial                     | DB / Security   |    M | POL-S8, POL-S13, POL-S17 |
| POL-S20 | Safe Errors and Correlation             | Platform / BE   |    M | POL-S2–POL-S19           |
| POL-S21 | Authenticated Accessibility             | Quality / FE    |    M | POL-S5–POL-S18           |
| POL-S22 | Post-Login Browser Journeys             | E2E             |    L | POL-S1–POL-S21           |
| POL-S23 | HITL Evidence and Closure               | Governance      |    S | POL-S22                  |

---

# 3. Development Slices

## POL-S1 — Post-Login Route and Role-Home Contract

**Objective**

Create a single source of truth for authenticated home routes and safe post-login redirects.

**Canonical routes**

```text
Operator home: /admin
Client home:   /client/declarations
FFT entry:     /fft
Forbidden:     /403
```

**Likely files**

```text
packages/auth/src/post-login.ts
packages/auth/src/index.ts
apps/web/features/auth/operator-paths.ts
apps/web/features/auth/client-paths.ts
apps/web/app/(operator)/**
apps/web/app/(client)/**
```

**Implementation requirements**

1. Export typed route constants from `@afenda/auth`.
2. Implement `resolveRoleHome()` from authenticated session role data.
3. Maintain an explicit internal `redirectTo` allowlist.
4. Reject absolute URLs and protocol-relative URLs.
5. Do not infer role homes from arbitrary query strings.
6. Keep client aliases separate from canonical home paths.
7. Do not introduce `/dashboard` or `/account` as product homes.
8. Test unknown, missing, and conflicting role states fail closed.

**Acceptance criteria**

- Operator resolves to `/admin`.
- Client resolves to `/client/declarations`.
- External redirect destinations are rejected.
- Unknown role does not silently receive an operator or client home.
- All role-home consumers import the same constants.
- No duplicated route literals exist outside approved route catalogs.

**Verification**

```powershell
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/web test -- `
  post-login-routing `
  operator-paths `
  client-paths
```

---

## POL-S2 — Session Cookie Synchronization

**Objective**

Complete the transition from the Neon Auth session to the application’s server-recognized session state.

**Routes**

```text
GET  /api/session/sync-cookies
POST /api/session/sync-cookies
```

**Likely files**

```text
apps/web/app/api/session/sync-cookies/route.ts
packages/auth/src/session.ts
packages/auth/src/cookies.ts
packages/auth/src/proxy.ts
```

**Implementation requirements**

- Read the provider-managed session through `@afenda/auth`.
- Synchronize only approved application cookies.
- Set secure attributes appropriately:
  - `HttpOnly`
  - `Secure` in production
  - suitable `SameSite`
  - bounded expiry
  - governed path and domain

- Never return cookie secrets in the response.
- Reject unauthenticated requests.
- Preserve correlation identifiers.
- Avoid database writes unless explicitly required.
- Make repeated synchronization idempotent.
- Do not create a parallel application session table.

**Acceptance criteria**

- Valid provider session completes cookie synchronization.
- Missing session produces a safe unauthorized response.
- Repeating the call does not create inconsistent cookies.
- Cookies are inaccessible to client JavaScript where required.
- Raw provider tokens are never logged.
- The route imports session capabilities only through `@afenda/auth`.

**Verification**

```powershell
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web test -- `
  session-sync `
  session-proxy-request `
  auth-sdk-boundary
```

---

## POL-S3 — Active Organization Resolution

**Objective**

Ensure every authenticated product request has one authorized active organization before entering organization-scoped features.

**Routes**

```text
GET  /api/session/ensure-active-organization
POST /api/session/ensure-active-organization
```

**Likely files**

```text
apps/web/app/api/session/ensure-active-organization/route.ts
packages/auth/src/session.ts
packages/auth/src/post-login.ts
apps/web/modules/platform/domain/**
packages/db/**
```

**Resolution order**

1. Validate authenticated identity.
2. Read authorized organization memberships.
3. Validate the existing active organization, when present.
4. Select a valid organization according to controlled policy.
5. Set the active-organization context.
6. Reject users with no authorized organization.
7. Never trust an organization ID supplied only by the browser.

**Implementation requirements**

- Organization selection must come from server-verified membership.
- Cross-organization values must be rejected.
- Zero-membership state must fail closed.
- Multiple-membership selection must be deterministic.
- The active organization must be attached to the server session context.
- Avoid soft `organization_id = null` fallbacks.
- Log only redacted identifiers where needed.
- Make repeated calls idempotent.

**Acceptance criteria**

- A valid member receives an authorized active organization.
- A stale active organization is replaced or rejected safely.
- A user cannot select an organization without membership.
- Zero-membership users do not enter product routes.
- Organization context remains stable across subsequent requests.
- No client-supplied organization ID overrides the authenticated context.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  ensure-active-organization `
  tenancy-isolation `
  session-completion
```

---

## POL-S4 — Authenticated Public Bounce

**Objective**

Route a signed-in user visiting `/` to the correct role home after session and organization completion.

**Primary surface**

```text
GET /
```

**Likely file**

```text
apps/web/app/(public)/page.tsx
```

**Flow**

```text
Authenticated request
        ↓
Session readiness
        ↓
Active organization resolution
        ↓
resolveRoleHome()
        ↓
/admin or /client/declarations
```

**Acceptance criteria**

- Ready operator session redirects to `/admin`.
- Ready client session redirects to `/client/declarations`.
- Incomplete session enters the approved completion flow.
- Unknown role fails closed.
- The public landing does not render before redirect for a ready session.
- No redirect loop occurs.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  post-login-routing `
  signed-in-public-bounce
```

---

## POL-S5 — Operator Role Shell

**Objective**

Protect the operator route group and compose the governed operator platform shell.

**Routes**

```text
/admin
/fft
```

**Likely files**

```text
apps/web/app/(operator)/layout.tsx
apps/web/app/(operator)/admin/page.tsx
apps/web/app/(operator)/fft/page.tsx
apps/web/features/operator-platform/**
```

**Implementation requirements**

- Call `requireRole("operator")` at the route-group layout.
- Resolve organization context before feature rendering.
- Render `OperatorPlatformChrome`.
- Keep operator navigation restricted to routes present on disk.
- Do not expose deep FFT navigation.
- Do not import the public auth island stylesheet.
- Do not render protected shell content before authorization completes.
- Ensure shell slots support loading, empty, error, and forbidden states.

**Acceptance criteria**

- Operator can access `/admin`.
- Operator can access `/fft` only with `fft.access`.
- Client role cannot access operator surfaces.
- No protected content flashes before redirect or denial.
- Navigation contains no nonexistent `/fft/*` or AdminCN routes.
- Shell uses canonical role and route contracts.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  role-shells `
  operator-platform-shell `
  operator-paths
```

---

## POL-S6 — Client Workspace Role Shell

**Objective**

Protect the client workspace and expose only the declarations product home.

**Routes**

```text
/client/declarations
/client/declarations/[assignmentId]
```

**Likely files**

```text
apps/web/app/(client)/client/(workspace)/layout.tsx
apps/web/app/(client)/client/(workspace)/declarations/page.tsx
apps/web/app/(client)/client/(workspace)/declarations/[assignmentId]/page.tsx
apps/web/features/declarations/**
```

**Implementation requirements**

- Call `requireRole("client")` at the workspace layout.
- Resolve active organization before declaration queries.
- Render client workspace chrome without operator controls.
- Keep organization and assignment IDs server-authorized.
- Do not expose operator administration navigation.
- Provide loading, empty, error, and forbidden states.
- Maintain responsive behavior for list and detail surfaces.

**Acceptance criteria**

- Client can access declaration home.
- Client can access an authorized assignment detail.
- Operator-only controls are absent.
- Operator/client role mismatches fail closed.
- Assignment identifiers are not authorization evidence.
- Shell does not import direct database clients.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  role-shells `
  client-paths `
  portal-chrome `
  declarations-shell
```

---

## POL-S7 — Authenticated Forbidden Boundary

**Objective**

Provide a consistent fail-closed `/403` result for authenticated users lacking the correct role or permission.

**Primary route**

```text
/403
```

**Triggers**

- Client accesses `/admin`.
- Client accesses `/fft`.
- Operator without `fft.access` accesses `/fft`.
- User lacks `org.roles.manage`.
- User lacks `clients.invite`.
- User attempts a cross-organization resource access.

**Implementation requirements**

- Preserve authentication while denying authorization.
- Avoid redirecting authenticated wrong-role users to login.
- Do not reveal whether protected records exist.
- Provide a safe route back to the user’s canonical home.
- Maintain accessible heading, focus, and main landmark.
- Do not expose raw permission codes unless intentionally designed for support.

**Acceptance criteria**

- Authenticated wrong-role requests land on `/403`.
- Anonymous requests remain governed by the Pre-Login gate.
- Forbidden shell returns no protected data.
- Back-to-home action uses `resolveRoleHome()`.
- No redirect loop exists.
- Browser history behaves predictably.

**Verification**

```powershell
pnpm --filter @afenda/web test -- role-shells wrong-role-gate
pnpm exec playwright test e2e/smoke/wrong-role-gate.spec.ts
```

---

## POL-S8 — Tier-2 Permission Kernel

**Objective**

Enforce product permissions below the coarse operator/client role boundary.

**Required permissions**

```text
org.roles.manage
clients.invite
fft.access
```

**Likely files**

```text
packages/auth/src/permissions.ts
apps/web/modules/platform/domain/has-permission.ts
apps/web/modules/platform/domain/require-permission.ts
apps/web/features/fft/require-fft-access.ts
packages/db/**
```

**Implementation requirements**

1. Use the controlled permission catalog.
2. Evaluate permissions against:
   - authenticated user;
   - active organization;
   - active membership;
   - assigned roles;
   - role-permission links.

3. Fail closed when catalog data is absent.
4. Do not permit wildcard or implied permissions unless governed.
5. Do not trust client-visible permission claims.
6. Keep authorization checks server-side.
7. Use one shared denial model.
8. Support deterministic test fixtures.

**Acceptance criteria**

- `clients.invite` controls invitation actions.
- `org.roles.manage` controls assign and revoke.
- `fft.access` controls `/fft`.
- Role alone does not bypass missing Tier-2 permissions.
- Cross-organization roles do not grant access.
- Missing catalog records produce denial rather than permissive fallback.
- Product authorization tests pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  has-permission `
  permission-kernel `
  product-authorization-wiring `
  n14-security-failure-verification
```

---

## POL-S9 — Organization Administration Surface

**Objective**

Compose the `/admin` surface for member visibility, invitation, role assignment, role revocation, and audit viewing.

**Primary route**

```text
/admin
```

**Likely files**

```text
apps/web/features/org-admin/org-admin-shell.tsx
apps/web/features/org-admin/organization-users.tsx
apps/web/features/org-admin/org-admin-panels.tsx
apps/web/features/org-admin/assign-org-role-form.tsx
apps/web/modules/platform/domain/**
```

**Required panels**

- Organization member directory
- Invite member
- Assign role
- Revoke role
- RBAC audit view
- Permission-denied state
- Empty and loading states

**Implementation requirements**

- Keep feature components free from direct `@afenda/db` imports.
- Commands must use Server Actions or governed backend functions.
- Forms must display safe field and action errors.
- Disable actions while submitting.
- Prevent duplicate invitation or role mutations.
- Confirm destructive revocation actions.
- Refresh data only after confirmed success.
- Do not optimistically claim a role mutation before persistence.
- Organization context must come from the authenticated session.

**Acceptance criteria**

- Authorized operator sees all permitted panels.
- Missing permission hides or disables the relevant control and remains server-enforced.
- Member directory is organization-scoped.
- Assignment and revocation forms validate inputs.
- Audit panel displays only current-organization records.
- No feature module imports `@afenda/db`.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  org-admin-shell `
  organization-users `
  org-admin-panels `
  assign-org-role-form `
  feature-db-boundary
```

---

## POL-S10 — Invite Organization Member

**Objective**

Allow an authorized operator to create a managed invitation for the active organization.

**Likely files**

```text
apps/web/app/actions/invite-org-member.ts
apps/web/modules/platform/domain/invite-org-member.ts
packages/auth/**
packages/db/**
```

**Command contract**

```ts
type InviteOrgMemberInput = {
  email: string;
  roleTemplateId?: string;
};

type InviteOrgMemberResult =
  | { ok: true; invitationId: string }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "INVALID_INPUT"
        | "ALREADY_MEMBER"
        | "INVITATION_EXISTS"
        | "PROVIDER_ERROR";
      message: string;
    };
```

**Implementation requirements**

- Require authenticated operator.
- Require `clients.invite`.
- Derive organization ID from session context.
- Validate and normalize email.
- Do not accept organization ID from form input.
- Use Neon Auth invitation capability.
- Avoid logging invitation tokens.
- Record a durable organization-scoped audit event.
- Return a normalized `ActionResult`.
- Keep mail delivery provider-owned.

**Acceptance criteria**

- Authorized invite succeeds.
- Unauthorized invite is denied server-side.
- Existing member is not duplicated.
- Existing pending invitation is handled deterministically.
- Organization ID cannot be spoofed.
- Audit record has a hard organization ID.
- Provider failures return safe error copy.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  invite-org-member `
  action-result-contract `
  n14-security-failure-verification `
  record-rbac-audit
```

---

## POL-S11 — Assign Organization Role

**Objective**

Assign an approved organization role to an existing membership.

**Likely files**

```text
apps/web/app/actions/assign-org-role.ts
apps/web/modules/platform/domain/assign-org-role-audited.ts
packages/db/**
```

**Implementation requirements**

- Require `org.roles.manage`.
- Resolve actor and organization from session.
- Validate target membership belongs to the active organization.
- Validate role belongs to the approved organization/system catalog.
- Prevent duplicate assignments.
- Execute role assignment and audit write transactionally.
- Return normalized action results.
- Do not allow a user to escalate through client-supplied organization IDs.
- Preserve system-role governance.

**Acceptance criteria**

- Valid assignment persists once.
- Duplicate assignment remains idempotent or returns a controlled conflict.
- Cross-organization membership is denied.
- Unknown role is denied.
- Assignment and audit record share the same organization ID.
- Failure does not leave a partial assignment without audit evidence.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  assign-org-role `
  n12-assign-revoke-audited `
  record-rbac-audit `
  tenancy-isolation
```

---

## POL-S12 — Revoke Organization Role

**Objective**

Revoke a role without breaking organization control or producing an unaudited mutation.

**Likely files**

```text
apps/web/app/actions/revoke-org-role.ts
apps/web/modules/platform/domain/revoke-org-role-audited.ts
packages/db/**
```

**Implementation requirements**

- Require `org.roles.manage`.
- Verify target membership and role are organization-scoped.
- Prevent unauthorized self-escalation or governance lockout.
- Apply governed last-admin protection where required.
- Execute revocation and audit record transactionally.
- Treat an already-absent assignment deterministically.
- Return safe `ActionResult`.
- Refresh UI only after persistence succeeds.

**Acceptance criteria**

- Authorized revocation succeeds.
- Cross-organization revocation is denied.
- Unauthorized actor is denied.
- Protected system-role constraints are enforced.
- No partial mutation exists without audit.
- Repeated revoke has deterministic behavior.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  revoke-org-role `
  n12-assign-revoke-audited `
  n12-audit-security-evidence `
  tenancy-isolation
```

---

## POL-S13 — RBAC Audit Durability

**Objective**

Guarantee durable evidence for invitation, assignment, revocation, and permission-sensitive administration.

**Primary table**

```text
platform_rbac_audit
```

**Likely files**

```text
apps/web/modules/platform/domain/record-rbac-audit.ts
packages/db/src/schema/**
packages/db/src/queries/**
```

**Required fields**

- Audit event ID
- Hard `organization_id`
- Actor user ID
- Target user or membership ID
- Action type
- Role or permission reference
- Correlation ID
- Timestamp
- Safe metadata
- Success/failure disposition where governed

**Implementation requirements**

- `organization_id` must never be nullable for organization-scoped actions.
- Derive tenant context from the authenticated session.
- Keep records append-only.
- Do not record secrets, tokens, or raw credentials.
- Couple critical mutation and audit insertion transactionally.
- Make correlation IDs available for support tracing.
- Prevent product features from bypassing the audited domain functions.

**Acceptance criteria**

- Invite, assign, and revoke each create the expected audit evidence.
- Audit organization matches session organization.
- Cross-tenant audit reads are denied.
- Audit rows cannot be updated through product paths.
- Failed transactions do not create misleading success records.
- Security evidence tests pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  record-rbac-audit `
  n12-assign-revoke-audited `
  n12-audit-security-evidence `
  tenancy-isolation
```

---

## POL-S14 — FFT Phase 2A Read Shell

**Objective**

Expose the permitted `/fft` list-only surface without reopening frozen FFT development.

**Primary route**

```text
/fft
```

**Likely files**

```text
apps/web/app/(operator)/fft/page.tsx
apps/web/features/fft/fft-events-shell.tsx
apps/web/features/fft/require-fft-access.ts
```

**Permitted capabilities**

- List existing FFT events or permitted records.
- Show loading, empty, error, and forbidden states.
- Filter or sort only where already supported on disk.
- Navigate only within existing surfaces.

**Prohibited capabilities**

- `/fft/events/[id]`
- `/fft/admin`
- Pipeline management
- Allocation writes
- Deposits or transfers
- Pickup operations
- ERP synchronization controls
- Phase 2B–2D functionality
- Invented FFT APIs

**Implementation requirements**

- Require operator role.
- Require `fft.access`.
- Scope reads by active organization.
- Keep page read-only.
- Do not expose disabled controls implying unsupported functionality.
- Do not create placeholder deep navigation.
- Use safe empty and permission-denied states.

**Acceptance criteria**

- Authorized operator sees the list shell.
- Operator without `fft.access` reaches `/403`.
- Client role is denied.
- No deep FFT route is generated.
- No write action is reachable.
- Organization-scoped query tests pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- fft-permitted-vertical
pnpm exec playwright test e2e/smoke/fft-permitted-vertical.spec.ts
```

---

## POL-S15 — Client Declaration Home

**Objective**

Deliver the client’s authenticated declaration workspace.

**Primary route**

```text
/client/declarations
```

**Likely files**

```text
apps/web/features/declarations/declarations-shell.tsx
apps/web/features/declarations/declaration-panel.tsx
apps/web/features/declarations/declaration-draft-sheet.tsx
apps/web/modules/declarations/domain/**
```

**Required surface elements**

- Assignment or declaration list
- Honest metric strip
- Status indicators
- Draft entry action
- Draft sheet
- Empty state
- Loading state
- Recoverable error state

**Implementation requirements**

- Query only the active organization.
- Show only assignments accessible to the authenticated client.
- Metrics must derive from actual returned data.
- Do not invent counts while loading.
- Keep draft state recoverable.
- Avoid direct database imports in feature components.
- Use stable assignment identifiers.
- Do not expose internal organization IDs unnecessarily.

**Acceptance criteria**

- Client sees only authorized assignments.
- Empty organizations receive a useful empty state.
- Metrics match the organization-scoped query.
- Draft entry opens the approved sheet or panel.
- Operator controls do not appear.
- Cross-tenant records remain inaccessible.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  declarations-shell `
  declaration-submit-read `
  feature-db-boundary
```

---

## POL-S16 — Declaration Draft API and Recovery

**Objective**

Provide organization-safe draft creation, update, retrieval, and recovery.

**Route**

```text
GET  /api/client/declaration-draft
POST /api/client/declaration-draft
```

**Likely files**

```text
apps/web/app/api/client/declaration-draft/route.ts
apps/web/app/actions/declaration-draft.ts
apps/web/modules/declarations/domain/**
packages/db/**
openapi/**
```

**Implementation requirements**

- Require authenticated client.
- Resolve organization from the session.
- Validate assignment ownership.
- Apply schema validation to draft payloads.
- Support repeat saves without duplicate drafts.
- Maintain a deterministic draft version or update strategy.
- Protect against stale updates where applicable.
- Return safe errors.
- Include correlation ID.
- Keep OpenAPI aligned with routes on disk.
- Do not accept a browser-supplied organization override.

**Acceptance criteria**

- Client can create and recover a draft.
- Draft remains organization-scoped.
- A client cannot load another organization’s draft.
- Invalid payload produces a controlled validation response.
- Repeated save does not create uncontrolled duplicates.
- API and action contracts remain consistent.
- OpenAPI checks pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  declaration-draft `
  declarations-draft-recovery `
  tenancy-isolation `
  openapi-api-now-disk

pnpm check:openapi
```

---

## POL-S17 — Declaration Submission and Readback

**Objective**

Submit a valid declaration and prove it can be read back only within its authorized organization.

**Likely files**

```text
apps/web/app/actions/submit-client-declaration.ts
apps/web/modules/declarations/domain/submit-client-declaration.ts
apps/web/modules/declarations/domain/get-declaration.ts
packages/db/**
```

**Submission flow**

```text
Authenticated client
        ↓
Active organization
        ↓
Authorized assignment
        ↓
Payload validation
        ↓
Draft/version validation
        ↓
Transactional submission
        ↓
Readback
        ↓
Safe ActionResult
```

**Implementation requirements**

- Require authenticated client role.
- Validate assignment belongs to the active organization.
- Validate submission against domain rules.
- Prevent duplicate final submissions.
- Use a transaction for submission state changes.
- Maintain appropriate audit or evidence fields.
- Return the canonical declaration reference.
- Deny cross-tenant reads and submissions.
- Do not trust assignment ownership from route parameters alone.
- Support safe adverse-recovery behavior.

**Acceptance criteria**

- Valid declaration submits once.
- Submitted record can be read back by the same authorized client.
- Duplicate submission is prevented or governed.
- Cross-organization submission and read are denied.
- Invalid assignment is not distinguishable from unauthorized access where that protects confidentiality.
- Failed submission does not leave inconsistent final state.
- Journey and adverse tests pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  declaration-submit-read `
  submit-client-declaration-action `
  tenancy-isolation `
  action-result-contract
```

---

## POL-S18 — Client Route Aliases

**Objective**

Normalize client entry routes to the canonical declaration home.

**Aliases**

```text
/client
/client/dashboard
```

**Canonical target**

```text
/client/declarations
```

**Likely files**

```text
apps/web/features/auth/client-paths.ts
apps/web/app/(client)/client/page.tsx
apps/web/app/(client)/client/dashboard/page.tsx
```

**Implementation requirements**

- Use permanent or temporary redirects consistently.
- Import the canonical client home constant.
- Preserve only approved query parameters.
- Avoid redirect loops.
- Do not build a second dashboard.
- Ensure aliases remain behind authenticated role enforcement.

**Acceptance criteria**

- `/client` redirects to `/client/declarations`.
- `/client/dashboard` redirects to `/client/declarations`.
- Anonymous behavior remains governed by the Pre-Login edge gate.
- No duplicate client home UI exists.
- Alias tests pass.

**Verification**

```powershell
pnpm --filter @afenda/web test -- client-paths post-login-routing
```

---

## POL-S19 — Cross-Tenant Denial

**Objective**

Prove that organization-scoped reads and writes cannot cross tenant boundaries.

**Required adverse scenarios**

- Org B reads Org A declaration.
- Org B drafts against Org A assignment.
- Org B submits Org A assignment.
- Org B assigns a role to Org A membership.
- Org B revokes Org A role.
- User supplies Org A ID while active in Org B.
- An operator’s role in Org A is reused in Org B.
- Audit rows from Org A are queried in Org B.

**Implementation requirements**

- Apply hard `organization_id` filters.
- Resolve organization from server session context.
- Require ownership joins where IDs alone are insufficient.
- Never use soft nullable tenant filtering.
- Return safe not-found or forbidden responses.
- Test both direct domain calls and browser journeys.
- Include a two-organization E2E fixture.

**Acceptance criteria**

- Every cross-tenant scenario is denied.
- No unauthorized record contents are returned.
- No unauthorized mutation occurs.
- Audit records remain organization-scoped.
- Direct database query helpers require an organization context.
- Two-org smoke passes or is explicitly BLOCKED with an owner.

**Verification**

```powershell
pnpm --filter @afenda/web test -- tenancy-isolation
pnpm exec playwright test e2e/smoke/two-org-denial.spec.ts
```

---

## POL-S20 — Safe Errors and Correlation

**Objective**

Provide traceable but non-sensitive failures across authenticated routes, APIs, and Server Actions.

**Likely files**

```text
apps/web/lib/safe-error-copy.ts
packages/observability/**
apps/web/app/actions/**
apps/web/app/api/**
```

**Implementation requirements**

- Generate or propagate one correlation ID per request.
- Return correlation ID where support workflows require it.
- Redact:
  - session cookies;
  - provider tokens;
  - invitation IDs;
  - SMTP credentials;
  - database URLs;
  - declaration confidential payloads.

- Normalize errors into governed public codes.
- Preserve detailed exceptions only in protected server logs.
- Distinguish validation, unauthenticated, forbidden, conflict, and internal errors.
- Avoid returning raw database errors.

**Acceptance criteria**

- Safe error-copy tests pass.
- Correlation inventory covers authenticated APIs and actions.
- Logs contain no known secret patterns.
- Permission denial does not reveal protected data.
- Provider and database errors are translated safely.
- Action and API error structures remain consistent.

**Verification**

```powershell
pnpm --filter @afenda/web test -- `
  safe-error-copy `
  i53-correlation-inventory `
  n14-security-failure-verification `
  action-result-contract
```

---

## POL-S21 — Authenticated Accessibility

**Objective**

Meet the controlled accessibility floor for operator and client product homes.

**Required surfaces**

```text
/admin
/client/declarations
/403
```

**Accessibility requirements**

- Skip link and valid main landmark
- Keyboard-accessible navigation
- Visible focus states
- Correct headings
- Accessible forms and validation
- Dialog or Sheet focus trapping
- Escape-to-close where applicable
- Focus restoration after closing overlays
- Status and error announcements
- Meaningful table/list semantics
- No reliance on color alone
- Responsive zoom and narrow viewport usability
- Reduced-motion compliance

**Acceptance criteria**

- A11Y03-P3 passes for `/admin`.
- A11Y03-P4 passes for `/client/declarations`.
- No critical or serious axe violations.
- Invite and role forms are keyboard operable.
- Declaration Sheet correctly manages focus.
- `/403` provides a usable recovery action.

**Verification**

```powershell
pnpm --filter @afenda/web test -- ux-a11y-i18n-perf-matrix.inventory

pnpm exec playwright test `
  e2e/smoke/a11y-assistive-matrix.spec.ts `
  e2e/smoke/operator-platform-shell.spec.ts
```

---

## POL-S22 — Post-Login Browser Journeys

**Objective**

Verify the complete authenticated journeys using controlled E2E users and organization fixtures.

### Journey A — Operator Home

```text
Successful authentication
→ session sync
→ active organization
→ /admin
```

Expected:

- operator shell renders;
- organization context exists;
- administration panels match permissions.

### Journey B — Client Home

```text
Successful authentication
→ session sync
→ active organization
→ /client/declarations
```

Expected:

- client workspace renders;
- only client assignments are visible.

### Journey C — Wrong Role

```text
Client → /admin
```

Expected:

```text
/403
```

### Journey D — FFT Permission

```text
Operator with fft.access → /fft
Operator without fft.access → /403
```

### Journey E — Role Management

```text
Operator
→ assign role
→ audit record
→ revoke role
→ audit record
```

### Journey F — Declaration Draft Recovery

```text
Client opens assignment
→ saves draft
→ reloads
→ draft restored
```

### Journey G — Declaration Submission

```text
Client
→ validates declaration
→ submits
→ reads submitted declaration
```

### Journey H — Cross-Tenant Denial

```text
Org B actor
→ Org A assignment or member
→ denied
```

### Journey I — Invite and Join Border

```text
Operator invite
→ provider email
→ invitee join
→ membership/session
→ resolved role home
```

This journey may remain `BLOCKED` when mailbox, trusted-domain, or factory dependencies are unavailable. It must not be silently marked PASS.

**Verification bundle**

```powershell
pnpm exec playwright test `
  e2e/journey/post-login-routing.spec.ts `
  e2e/smoke/wrong-role-gate.spec.ts `
  e2e/smoke/operator-platform-shell.spec.ts `
  e2e/smoke/fft-permitted-vertical.spec.ts `
  e2e/journey/declarations-submit-read.spec.ts `
  e2e/journey/declarations-draft-recovery.spec.ts `
  e2e/journey/declarations-adverse-recovery.spec.ts `
  e2e/smoke/two-org-denial.spec.ts `
  e2e/journey/invite-join.spec.ts
```

**Acceptance criteria**

- Operator and client route to their canonical homes.
- Wrong-role and missing-permission cases fail closed.
- Declaration draft and submission journeys pass.
- Two-organization denial passes.
- Invite/join is PASS or explicitly BLOCKED.
- No test requires a frozen or nonexistent FFT route.
- No credentials or cookies are pasted into evidence documents.

---

## POL-S23 — HITL Evidence and Closure

**Objective**

Close the Post-Login scratch ledger with reproducible evidence without overstating wider program maturity.

**Required command bundle**

```powershell
pnpm validate:neon-env

pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test

pnpm --filter @afenda/web typecheck

pnpm --filter @afenda/web test -- `
  post-login-routing `
  client-paths `
  operator-paths `
  role-shells `
  org-admin-shell `
  organization-users `
  portal-chrome `
  fft-permitted-vertical `
  invite-org-member `
  assign-org-role `
  revoke-org-role `
  declaration-submit-read `
  submit-client-declaration-action `
  action-result-contract `
  record-rbac-audit `
  n12-assign-revoke-audited `
  tenancy-isolation `
  has-permission `
  permission-kernel `
  product-authorization-wiring `
  feature-db-boundary `
  i51-security-cut-ledger `
  i53-correlation-inventory `
  safe-error-copy `
  n14-security-failure-verification `
  auth-sdk-boundary `
  openapi-api-now-disk

pnpm check:openapi

pnpm exec turbo run lint typecheck test `
  --filter=@afenda/web `
  --filter=@afenda/auth `
  --filter=@afenda/db
```

**Evidence record**

| Field                | Required                                          |
| -------------------- | ------------------------------------------------- |
| Slice                | POL-S1–POL-S23                                    |
| Commit SHA           | Yes                                               |
| Environment          | Local, preview, or production                     |
| Command              | Exact command                                     |
| Result               | PASS, FAIL, or BLOCKED                            |
| Operator             | Human or CI                                       |
| Execution date       | Yes                                               |
| Evidence link        | Log, CI, screenshot, or redacted console evidence |
| Organization fixture | Redacted identifier                               |
| Blocker owner        | Required for BLOCKED                              |
| Remediation          | Required for FAIL                                 |

**Closure condition**

Post-Login HITL is `PASS` only when:

- UI-UX layer passes;
- Frontend layer passes;
- Database layer passes;
- Backend layer passes;
- role routing passes;
- permission gates pass;
- tenancy isolation passes;
- RBAC audit durability passes;
- declarations draft and submission pass;
- FFT list-only boundary passes;
- mandatory authenticated E2E journeys pass;
- operationally unavailable checks are not misrepresented.

---

# 4. Recommended Delivery Waves

## Wave 1 — Session and Routing Foundation

- POL-S1 Route and Role-Home Contract
- POL-S2 Session Cookie Synchronization
- POL-S3 Active Organization Resolution
- POL-S4 Authenticated Public Bounce

**Wave gate**

A valid session consistently resolves an authorized organization and canonical home without redirect loops.

---

## Wave 2 — Authenticated Shells and Authorization

- POL-S5 Operator Role Shell
- POL-S6 Client Workspace Role Shell
- POL-S7 Forbidden Boundary
- POL-S8 Tier-2 Permission Kernel
- POL-S18 Client Route Aliases

**Wave gate**

Role and permission boundaries fail closed before protected content or data is returned.

---

## Wave 3 — Operator Administration

- POL-S9 Organization Administration Surface
- POL-S10 Invite Member
- POL-S11 Assign Role
- POL-S12 Revoke Role
- POL-S13 RBAC Audit Durability

**Wave gate**

Every organization administration mutation is permission-checked, organization-scoped, transactional, and audited.

---

## Wave 4 — Product Verticals

- POL-S14 FFT Phase 2A Read Shell
- POL-S15 Client Declaration Home
- POL-S16 Declaration Draft API
- POL-S17 Declaration Submission

**Wave gate**

FFT remains list-only, while declaration draft and submission are fully tenant-isolated.

---

## Wave 5 — Security and Enterprise Evidence

- POL-S19 Cross-Tenant Denial
- POL-S20 Safe Errors and Correlation
- POL-S21 Authenticated Accessibility
- POL-S22 Browser Journeys
- POL-S23 HITL Closure

**Wave gate**

All mandatory authenticated journeys and adverse security paths pass with reproducible evidence.

---

# 5. Dependency Graph

```text
Pre-Login boundary
        │
        ▼
     POL-S1
        │
        ▼
     POL-S2
        │
        ▼
     POL-S3
      ┌─┴───────────────┐
      ▼                 ▼
   POL-S4            POL-S8
      │                 │
   ┌──┴───┐      ┌──────┼───────────────┐
   ▼      ▼      ▼      ▼               ▼
POL-S5 POL-S6 POL-S9  POL-S14          POL-S19
   │      │      │
   │      │   ┌──┼─────────┐
   │      │   ▼  ▼         ▼
   │      │ S10 S11       S12
   │      │   └──┴────┬────┘
   │      │           ▼
   │      │         POL-S13
   │      │
   │      ├───────────────┐
   │      ▼               ▼
   │   POL-S15         POL-S18
   │      │
   │      ▼
   │   POL-S16
   │      │
   │      ▼
   │   POL-S17
   │
   └──────────┬───────────────┘
              ▼
           POL-S20
              │
              ▼
           POL-S21
              │
              ▼
           POL-S22
              │
              ▼
           POL-S23
```

---

# 6. Enterprise Definition of Done

The Post-Login development cut is complete only when:

1. Role-home paths have one authoritative contract.
2. Session cookie synchronization is secure and idempotent.
3. Active organization is server-resolved from authorized membership.
4. Signed-in users reach the correct canonical home.
5. Operator and client layouts enforce coarse role boundaries.
6. Wrong-role users reach `/403`, not login.
7. Tier-2 permissions are enforced server-side.
8. `/admin` contains only authorized organization administration functions.
9. Invitation is controlled by `clients.invite`.
10. Assignment and revocation require `org.roles.manage`.
11. All RBAC mutations produce durable organization-scoped audit evidence.
12. `/fft` remains Phase 2A list-only and requires `fft.access`.
13. Client aliases route only to `/client/declarations`.
14. Declaration drafts can be saved and recovered.
15. Declaration submissions are transactional and read back correctly.
16. Cross-organization reads and writes are denied.
17. Feature components never import `@afenda/db`.
18. Neon Auth SDK usage remains inside `@afenda/auth`.
19. Safe errors and correlation identifiers are present.
20. OpenAPI matches routes on disk.
21. Authenticated accessibility tests pass.
22. Operator/client E2E factory journeys pass or carry named blockers.
23. The production `0000_*` baseline migration prohibition remains intact.
24. FFT Phase 2B–2D remains frozen.
25. The result does not claim N19, I6 completion, GUIDE-017 READY, or multi-database isolation.

---

# 7. Recommended First Executable Mission

Begin with the following bounded mission:

```text
POL-S1–POL-S4 — Post-Login Session and Routing Foundation
```

**Mission acceptance**

- `OPERATOR_HOME_PATH` and `CLIENT_HOME_PATH` are authoritative.
- `redirectTo` is internal and allowlisted.
- `sync-cookies` is secure and idempotent.
- `ensure-active-organization` accepts only server-verified memberships.
- Signed-in operators route to `/admin`.
- Signed-in clients route to `/client/declarations`.
- Unknown role, zero membership, and invalid organization states fail closed.
- Unit, typecheck, and authenticated routing tests pass.
- No product functionality is modified.
- No database baseline migration is executed.
