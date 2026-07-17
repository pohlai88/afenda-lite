# AFENDA Neon ERP — Next.js App Router UI/UX Blueprint

| Field | Value |
|-------|-------|
| Posture | **Scratch Target blueprint** — not Living, not materialization order |
| Living FE SSOT | [9-neon-auth-fe-surface-compose-map.md](./9-neon-auth-fe-surface-compose-map.md) (FE-01…FE-15 · disk + compose recipes) |
| Merge policy | **Keep separate** from doc 9 — do not fold this body into the living map |
| Materialize when | Neon Auth `N*` / GUIDE-018 **Approved slice** only — never “because it is in this file” |

**Quarantine:** `/system/*`, `/dev/neon/*`, deep `/fft/*`, aspirational admin KPI homes, and the shared-component zoo below are **Target narrative**. Living checkout uses `(public)` / `(operator)` / `(client)`, `/admin` org-admin, `/client/declarations` as client home, and `/fft` list-only until N18 + FFT-MOD-008. FFT deep commercial UX belongs in [FFT `7-fft-frontend-ui-ux.md`](../FFT/7-fft-frontend-ui-ux.md), not here.

## 1. Architecture verdict

The attached documents describe **an 18-slice Neon ERP development program**, not one ordinary product module. The frontend should therefore be divided into four clearly separated experiences:

1. **Public and authentication experience**
2. **Authorized ERP product shells**
3. **System administration and IAM**
4. **Neon engineering and operational control centre**

This separation prevents developers from mixing:

- authentication with authorization;
- organization membership with permissions;
- Neon infrastructure status with ERP product functions;
- operator pages with client pages;
- production controls with developer diagnostics.

~~The current immediate gap is **N7 post-login routing**.~~ **Superseded (living):** N7 is APPROVED. Disk already ships role-aware home (`OPERATOR_HOME_PATH=/admin`, `CLIENT_HOME_PATH=/client/declarations`), sanitized `?redirectTo=`, signed-in `/` bounce via `getAuthBootstrap` / `resolvePostLoginPath`, and `/403` fail-closed. See doc 9 FE-01 / FE-02 / FE-08 / FE-13 / FE-15 — do not reopen N7 from this blueprint.

The larger roadmap confirms that Neon Auth is already the identity provider, Drizzle and `@afenda/db` remain the product data path, organization roles are only coarse identity signals, and product authorization must use Afenda permission codes.

---

# 2. Recommended route domains

| Route domain | Audience                                | Responsibility                                            |
| ------------ | --------------------------------------- | --------------------------------------------------------- |
| `/`          | Public visitors                         | Public landing and sign-in entry                          |
| `/auth/*`    | Unauthenticated users                   | Neon Auth journeys                                        |
| `/join`      | Invited users                           | Organization invitation acceptance                        |
| `/admin/*`   | Admin and operator users                | ERP administration and operational workspace              |
| `/client/*`  | Client users                            | Client-facing ERP workspace                               |
| `/fft/*`     | Authorized FFT users                    | Feed–Farm–Trade vertical                                  |
| `/system/*`  | System administrators                   | IAM, permissions, audit, security and platform governance |
| `/dev/*`     | Authorized engineering/operations users | Neon status, diagnostics and operational evidence         |
| `/403`       | Authenticated unauthorized users        | Fail-closed forbidden state                               |
| `/error`     | All users                               | Governed application failure page                         |

I recommend using `/dev/neon` as the **Neon development and operations module**, while keeping business-facing administration under `/system` and `/admin`.

This avoids exposing database terminology to ordinary business users.

---

# 3. Proposed Next.js App Router structure

```text
apps/web/
└── app/
    ├── layout.tsx
    ├── global-error.tsx
    ├── not-found.tsx
    │
    ├── (public)/
    │   ├── layout.tsx
    │   └── page.tsx
    │
    ├── (auth)/
    │   ├── layout.tsx
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   ├── sign-up/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   ├── reset-password/page.tsx
    │   │   ├── verify-email/page.tsx
    │   │   └── sign-out/page.tsx
    │   └── join/page.tsx
    │
    ├── (protected)/
    │   ├── layout.tsx
    │   ├── 403/page.tsx
    │   │
    │   ├── admin/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── approvals/page.tsx
    │   │   ├── activity/page.tsx
    │   │   └── organizations/[organizationSlug]/page.tsx
    │   │
    │   ├── client/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── declarations/page.tsx
    │   │   ├── declarations/[declarationId]/page.tsx
    │   │   └── profile/page.tsx
    │   │
    │   ├── fft/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── pipeline/page.tsx
    │   │   ├── customers/page.tsx
    │   │   ├── customers/[customerId]/page.tsx
    │   │   ├── opportunities/[opportunityId]/page.tsx
    │   │   ├── activities/page.tsx
    │   │   ├── allocations/page.tsx
    │   │   ├── performance/page.tsx
    │   │   └── reports/page.tsx
    │   │
    │   ├── system/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── users/page.tsx
    │   │   ├── users/[userId]/page.tsx
    │   │   ├── organizations/page.tsx
    │   │   ├── organizations/[organizationId]/page.tsx
    │   │   ├── memberships/page.tsx
    │   │   ├── roles/page.tsx
    │   │   ├── roles/[roleId]/page.tsx
    │   │   ├── permissions/page.tsx
    │   │   ├── policies/page.tsx
    │   │   ├── approvals/page.tsx
    │   │   ├── audit/page.tsx
    │   │   ├── security/page.tsx
    │   │   ├── integrations/page.tsx
    │   │   └── diagnostics/page.tsx
    │   │
    │   └── dev/
    │       ├── layout.tsx
    │       ├── page.tsx
    │       └── neon/
    │           ├── layout.tsx
    │           ├── page.tsx
    │           ├── environment/page.tsx
    │           ├── database/page.tsx
    │           ├── performance/page.tsx
    │           ├── recovery/page.tsx
    │           ├── authentication/page.tsx
    │           ├── sessions/page.tsx
    │           ├── organizations/page.tsx
    │           ├── permissions/page.tsx
    │           ├── tenancy/page.tsx
    │           ├── audit/page.tsx
    │           ├── verification/page.tsx
    │           ├── operations/page.tsx
    │           └── slices/
    │               ├── page.tsx
    │               └── [sliceId]/page.tsx
    │
    └── api/
        └── auth/
            └── [...path]/route.ts
```

---

# 4. Public and authentication pages

## `/`

### Purpose

Public Afenda landing page for unauthenticated visitors.

### Required behavior

- Show product positioning and sign-in action.
- Do not query protected product data.
- When an authenticated user visits `/`, redirect through the governed role-home resolver.
- Do not reproduce role-resolution logic in the page.
- Preserve safe `callbackUrl` behavior.

### Components

```text
PublicHeader
HeroSection
ProductCapabilityGrid
SecurityTrustPanel
SignInCallToAction
PublicFooter
SignedInHomeRedirect
```

`SignedInHomeRedirect` should be server-side logic or middleware/proxy behavior—not a visible loading workaround.

---

## `/auth/login`

### Purpose

Neon Auth sign-in surface.

### UX structure

```text
AuthShell
├── BrandPanel
├── AuthView
├── EnvironmentBadge        development only
├── SecureReturnNotice
├── SupportLink
└── AuthLegalFooter
```

### Query parameters

```text
/auth/login?callbackUrl=/fft
/auth/login?callbackUrl=/client/declarations/123
/auth/login?reason=session-expired
```

### Security behavior

Accept only:

- relative application paths;
- normalized same-origin paths;
- recognized protected destinations.

Reject:

```text
https://external.example
//external.example
javascript:...
data:...
\external.example
```

A rejected callback must fall back to the user’s authorized product home—not to an error-prone or permissive route.

---

## `/auth/sign-up`

Use only when self-registration is approved.

Components:

- `AuthView`
- `PasswordRequirementPanel`
- `TermsAcknowledgement`
- `ExistingAccountLink`

Where invitation-only onboarding is required, replace open registration with an explicit governed notice rather than displaying an unusable form.

---

## `/auth/forgot-password`

Components:

- `AuthView`
- `AccountRecoveryExplanation`
- `ReturnToLoginLink`
- `EmailDeliveryNotice`

Do not add app-side SMTP. The architecture states that mail is sent through **Zoho SMTP configured in Neon Auth**, not through application SMTP code.

---

## `/auth/reset-password`

Components:

- `AuthView`
- `PasswordRequirementPanel`
- `ExpiredTokenState`
- `ReturnToLoginLink`

Required states:

- valid reset token;
- expired token;
- invalid token;
- successful reset;
- service unavailable.

---

## `/auth/verify-email`

Components:

- `VerificationStatus`
- `ResendVerificationAction`
- `OpenEmailInstructions`
- `ReturnToLoginLink`

---

## `/auth/sign-out`

Prefer immediate server-controlled sign-out with a small confirmation state:

```text
SigningOutState
SignedOutState
SignOutFailureState
```

---

## `/join`

### Purpose

Organization invitation acceptance.

### URLs

```text
/join
/join?invitationId={id}
```

### Components

- `InvitationRequiredState`
- `InvitationSummaryCard`
- `InvitationIdentityMismatch`
- `AcceptInvitationAction`
- `DeclineInvitationAction`
- `ExpiredInvitationState`
- `AlreadyMemberState`

The page must not infer organization membership from a URL alone. Invitation validity must be established by the server.

---

# 5. Governed post-login routing

**Living SSOT (do not re-implement under these names):** `@afenda/auth` — `resolvePostLoginPath`, `sanitizeCallbackUrl`, `getAuthBootstrap`, `POST_LOGIN_CALLBACK_PARAM` (`redirectTo`). Client home is **`/client/declarations`**, not a product dashboard at `/client/dashboard` (that URL is an alias redirect only — doc 9 FE-15).

The historical sketches below are **Target prose / superseded API shape**. Prefer the living exports above.

## Recommended public contract (superseded sketch)

```ts
// SUPERSEDED — living client home is "/client/declarations"
// Living API: resolvePostLoginPath({ role, callbackUrl }) in @afenda/auth
export type ProductHome = "/admin" | "/client/dashboard";

export type ResolveAuthorizedDestinationInput = {
  session: Session;
  callbackUrl?: string | null;
};

export type AuthorizedDestination = {
  href: string;
  source: "callback" | "role-home";
};

export function resolveAuthorizedDestination(
  input: ResolveAuthorizedDestinationInput,
): AuthorizedDestination;
```

## Resolution sequence

```text
1. Verify valid session
2. Resolve active organization membership
3. Resolve coarse shell role
4. Validate callback path
5. Check whether role can enter callback shell
6. Return authorized callback, when valid
7. Otherwise return authorized role home
8. Fail closed when role mapping is invalid
```

## Default role homes

| Neon organization signal | Afenda shell role | Default destination (living) | Blueprint note |
| ------------------------ | ----------------- | ---------------------------- | -------------- |
| `owner`                  | `admin`           | `/admin`                     | Matches living |
| `admin`                  | `operator`        | `/admin`                     | Matches living |
| `member`                 | `client`          | `/client/declarations`       | **Supersedes** `/client/dashboard` as role home |
| Unknown or unsupported   | none              | `/403` or explicit access error | Matches living |

N7 acceptance is **closed** on disk; this section must not drive a second resolver.

---

# 6. Admin product shell

## `/admin`

This is the authorized home for coarse `admin` and `operator` identities. It should be an **operational home**, not a database console.

### Recommended page layout

```text
AdminHome
├── WorkspaceHeader
│   ├── OrganizationSwitcher
│   ├── PeriodSelector
│   └── GlobalCommandTrigger
├── AttentionQueue
├── ApprovalSummary
├── OperationalKpiGrid
├── RecentActivity
├── AssignedWork
├── ProductEntryCards
│   ├── FFT
│   ├── Declarations
│   └── System Administration
└── EvidenceHealthPanel
```

### KPI examples

- pending approvals;
- unresolved exceptions;
- overdue activities;
- active organizations;
- failed integrations;
- high-risk audit events;
- incomplete onboarding;
- stale sessions or security incidents.

Only show KPI cards backed by genuine backend ports. Do not create placeholder production metrics.

---

## `/admin/approvals`

Components:

- `ApprovalQueue`
- `ApprovalFilterBar`
- `ApprovalRiskBadge`
- `ApprovalDetailDrawer`
- `ApprovalDecisionPanel`
- `DecisionEvidenceTimeline`
- `EmptyApprovalState`

Every decision should show:

- requesting user;
- organization;
- requested action;
- policy or permission involved;
- evidence;
- decision history;
- timestamp.

---

## `/admin/activity`

Components:

- `ActivityTimeline`
- `ActorFilter`
- `OrganizationFilter`
- `EventTypeFilter`
- `EvidenceLink`
- `CorrelationIdDisplay`

This is product activity, not the complete system audit viewer.

---

# 7. Client shell

**Living home:** `/client/declarations` (doc 9 FE-13). `/client` and `/client/dashboard` are **alias redirects** to that list (FE-15) — not a second dashboard implementation.

## `/client`

Server redirect to:

```text
/client/declarations
```

(Blueprint historically said `/client/dashboard` — **superseded**.)

---

## `/client/dashboard` (alias only — Target dashboard sketch below is not Living)

Living: thin redirect → `/client/declarations`. The component tree below is **Target aspirational** if a future Approved slice adds a real dashboard; do not invent it from this file alone.

### Components

```text
ClientDashboard
├── ClientWorkspaceHeader
├── OrganizationContextCard
├── ActionRequiredPanel
├── DeclarationStatusSummary
├── RecentSubmissions
├── NoticesPanel
└── SupportPanel
```

### UX principle

A client should see:

- what requires action;
- what was recently submitted;
- current status;
- next expected step;
- organization identity;
- responsible contact.

They should not see infrastructure, internal permissions, database or operational diagnostics.

---

## `/client/declarations`

Slice ownership: **N17**, not earlier identity slices.

Components:

- `DeclarationList`
- `DeclarationStatusTabs`
- `DeclarationSearch`
- `NewDeclarationAction`
- `DeclarationRowActions`
- `SubmissionDeadlineBadge`
- `TenantScopeIndicator`

---

## `/client/declarations/[declarationId]`

Components:

- `DeclarationHeader`
- `DeclarationStatusStepper`
- `DeclarationSummary`
- `DeclarationEvidenceList`
- `SubmissionHistory`
- `ValidationFindingPanel`
- `DeclarationActions`

All reads and mutations must be hard-scoped by `organization_id`.

---

# 8. System administration module

The system module should express Afenda IAM—not merely expose raw Neon Auth configuration.

## `/system`

### Components

- `SystemHealthSummary`
- `IdentityMetrics`
- `AuthorizationCoverage`
- `MembershipExceptions`
- `AuditRiskSummary`
- `SecurityAlertSummary`
- `IntegrationStatus`
- `SystemAdministrationNavigation`

---

## `/system/users`

### Components

- `UserDirectory`
- `UserSearch`
- `UserStatusFilter`
- `OrganizationMembershipSummary`
- `UserRiskIndicator`
- `InviteUserAction`
- `UserDetailLink`

Recommended columns:

| Column               | Meaning                            |
| -------------------- | ---------------------------------- |
| User                 | Name and verified email            |
| Status               | Active, invited, suspended         |
| Organizations        | Membership count                   |
| Effective shell role | Admin, operator, client            |
| Last activity        | Last authenticated interaction     |
| Security             | MFA/security status when available |
| Actions              | Permission-controlled actions      |

---

## `/system/users/[userId]`

Tabs:

```text
Overview
Memberships
Effective Permissions
Sessions
Security
Audit Activity
```

Components:

- `UserIdentityCard`
- `MembershipTable`
- `EffectivePermissionMatrix`
- `SessionList`
- `SecurityEventTimeline`
- `UserAdminActions`

Do not permit a page-level role to substitute for mutation-level permission checks.

---

## `/system/organizations`

Components:

- `OrganizationDirectory`
- `OrganizationStatusFilter`
- `MemberCount`
- `SecurityPostureBadge`
- `OrganizationDetailLink`
- `CreateOrganizationAction`

---

## `/system/organizations/[organizationId]`

Tabs:

```text
Overview
Members
Roles
Policies
Applications
Audit
Settings
```

Components:

- `OrganizationHeader`
- `MembershipRoster`
- `OrganizationRoleAssignments`
- `OrganizationPolicySummary`
- `ProductAccessMatrix`
- `OrganizationAuditTimeline`

---

## `/system/memberships`

### Purpose

Dedicated cross-organization membership governance.

Components:

- `MembershipTable`
- `MembershipStateBadge`
- `RoleAssignmentCell`
- `InvitationStatus`
- `MembershipConflictFinding`
- `RevokeMembershipAction`
- `ResendInvitationAction`

This module should make the distinction visible:

> A membership links a user to an organization. It does not by itself prove every product permission.

---

## `/system/roles`

### Components

- `RoleCatalog`
- `RoleTypeBadge`
- `PermissionCount`
- `AssignedMemberCount`
- `SystemRoleLock`
- `CreateCustomRoleAction`

---

## `/system/roles/[roleId]`

Components:

- `RoleDefinitionHeader`
- `PermissionAssignmentMatrix`
- `RoleMemberAssignments`
- `PolicyImpactPreview`
- `RoleChangeHistory`
- `SaveRoleAction`

System roles should clearly indicate whether they are:

- immutable;
- template-controlled;
- organization-scoped;
- custom;
- deprecated.

---

## `/system/permissions`

Slice ownership: N10 establishes the kernel; N11 wires permissions into products.

### Components

- `PermissionCatalog`
- `PermissionNamespaceFilter`
- `PermissionCodeCell`
- `PermissionDescription`
- `ConsumerCoverage`
- `AssignedRoleCount`
- `PermissionDetailDrawer`

Suggested grouping:

```text
system_admin.*
organizations.*
memberships.*
clients.*
declarations.*
fft.*
audit.*
security.*
integrations.*
```

The permission page must not imply a permission is enforced just because it exists in the catalog. Include an explicit distinction:

| State      | Meaning                          |
| ---------- | -------------------------------- |
| Registered | Code exists                      |
| Assigned   | Included in at least one role    |
| Evaluated  | Policy kernel can resolve it     |
| Enforced   | Product operation checks it      |
| Verified   | Security test proves enforcement |

This is especially important because the roadmap states that Tier-2 product authorization remains incomplete until the permission-wiring slice.

---

## `/system/policies`

Components:

- `PolicyCatalog`
- `PolicyScopeBadge`
- `PolicyConditionSummary`
- `PolicyDecisionSimulator`
- `PolicyVersionHistory`
- `PolicyConflictPanel`

Avoid exposing a free-form policy editor until a governed policy language and validation contract exist.

---

## `/system/audit`

Components:

- `AuditEventTable`
- `AuditSearch`
- `OrganizationFilter`
- `ActorFilter`
- `OutcomeFilter`
- `RiskFilter`
- `CorrelationIdFilter`
- `AuditEventDrawer`
- `EvidenceExportAction`

Event detail should show:

- actor;
- session;
- organization;
- action;
- target resource;
- outcome;
- reason;
- correlation ID;
- request timestamp;
- supporting metadata.

---

## `/system/security`

Components:

- `SecurityPostureSummary`
- `AuthenticationFailureChart`
- `SuspiciousSessionList`
- `OpenRedirectTestStatus`
- `SecretConfigurationStatus`
- `AccessExceptionQueue`
- `SecurityControlEvidence`

Never display actual secrets. Display only status such as:

```text
Configured
Missing
Invalid
Rotated on {date}
Validation failed
```

---

## `/system/integrations`

Components:

- `IntegrationCatalog`
- `IntegrationStatusBadge`
- `LastSuccessfulSync`
- `FailureSummary`
- `IntegrationConfigurationLink`
- `RetryAction`

Do not create a retry button until the backend exposes a permission-controlled, idempotent retry command.

---

## `/system/diagnostics`

Components:

- `ApplicationBuildInfo`
- `RuntimeHealth`
- `DependencyStatus`
- `EnvironmentContractStatus`
- `RequestCorrelationLookup`
- `FeatureAvailabilityMatrix`

This page may link to `/dev/neon`, but it should remain understandable to system administrators.

---

# 9. Neon development and operations module

## Primary URL

```text
/dev/neon
```

Recommended access requirement:

```text
platform.neon.read
```

Sensitive actions should require separate permissions:

```text
platform.neon.operate
platform.neon.recovery.manage
platform.neon.security.read
platform.neon.evidence.export
```

Do not use a broad “admin” role as the only protection.

---

## `/dev/neon`

### Page purpose

A consolidated engineering view of the 18-slice Neon ERP program.

### Page structure

```text
NeonControlCenter
├── PlatformIdentityHeader
├── EnvironmentBanner
├── ProductionReadinessScore
├── SliceProgressRail
├── CriticalFindingPanel
├── CapabilityStatusGrid
├── VerificationSummary
├── RecoveryReadiness
├── SecurityEvidenceSummary
└── RecentOperationalEvents
```

### Capability cards

- Environment contract
- Connection and migrations
- Backup and recovery
- Database performance
- Authentication
- Sessions
- Memberships
- Tenancy
- Permissions
- Audit evidence
- E2E verification
- Production operations

Each card should show:

```text
Status
Slice owner
Last verified
Evidence count
Open findings
Next authorized action
```

---

## `/dev/neon/environment`

Slice owner: **N1**

### Components

- `EnvironmentContractSummary`
- `EnvironmentVariableStatusTable`
- `RuntimeEnvironmentBadge`
- `NeonProjectIdentity`
- `BranchIdentity`
- `ConnectionEndpointStatus`
- `AuthEndpointStatus`
- `ValidationRunHistory`

Example table:

| Variable                  | Required | Status     | Source owner           | Exposed value |
| ------------------------- | -------: | ---------- | ---------------------- | ------------- |
| `DATABASE_URL`            |      Yes | Configured | Server                 | Never         |
| `NEON_AUTH_BASE_URL`      |      Yes | Valid      | Server/client boundary | Host only     |
| `NEON_AUTH_COOKIE_SECRET` |      Yes | Configured | Server                 | Never         |
| `APP_URL`                 |      Yes | Valid      | Application            | Origin        |
| Neon project ID           |      Yes | Matched    | Operations             | Identifier    |
| Neon branch ID            |      Yes | Matched    | Operations             | Identifier    |

No raw secret values should ever be rendered.

---

## `/dev/neon/database`

Slice owner: **N2**

Components:

- `ConnectionClassSummary`
- `PooledEndpointStatus`
- `MigrationJournal`
- `SchemaDriftStatus`
- `PendingMigrationPanel`
- `DatabaseConstraintSummary`
- `MigrationVerificationHistory`

The UI should distinguish:

- product connection;
- migration connection;
- administrative operation;
- validation-only connection.

---

## `/dev/neon/recovery`

Slice owner: **N3**

Components:

- `RecoveryReadinessCard`
- `HistoryRetentionStatus`
- `SnapshotSchedule`
- `NamedRestorePoints`
- `LastRecoveryExercise`
- `RecoveryProcedureLink`
- `RecoveryGapPanel`

Status examples:

```text
Verified
Configured but untested
Stale evidence
Failed
Unavailable
```

Do not label backup configuration as “recovery ready” without restoration evidence.

---

## `/dev/neon/performance`

Slice owner: **N4**

Components:

- `DatabaseLatencySummary`
- `ConnectionUtilization`
- `SlowQueryTable`
- `IndexCoverage`
- `ComputeConfiguration`
- `ColdStartEvidence`
- `PerformanceBaselineHistory`

Avoid exposing “increase compute” as a casual action. The architecture explicitly cautions against raising compute without evidence.

---

## `/dev/neon/authentication`

Slice owner: **N5**

Components:

- `AuthBffStatus`
- `BrowserClientStatus`
- `AuthUiConfiguration`
- `TrustedDomainStatus`
- `EmailProviderStatus`
- `AuthRouteCoverage`
- `AuthFailureSummary`

Display the configured email provider as:

```text
Zoho SMTP via Neon Auth
```

Not as an application integration.

---

## `/dev/neon/sessions`

Owners: **N6 and N7**

Components:

- `SessionContractStatus`
- `RoleMappingTable`
- `PostLoginRoutingStatus`
- `SafeCallbackValidationStatus`
- `ProtectedRouteMatrix`
- `AuthenticatedRootRedirectStatus`
- `SessionFailureBehavior`

### Route matrix (living param name: `redirectTo`, not `callbackUrl`)

| Scenario                   | Expected result (living)                                      |
| -------------------------- | ------------------------------------------------------------- |
| Unauthenticated `/admin`   | `/auth/login?redirectTo=%2Fadmin`                             |
| Unauthenticated `/fft`     | Login and authorized return via `redirectTo`                  |
| Admin successful login     | `/admin`                                                      |
| Client successful login    | `/client/declarations` (not `/client/dashboard` as role home) |
| Signed-in request to `/`   | Authorized product home                                       |
| Client request to `/admin` | `/403`                                                        |
| External callback URL      | Rejected                                                      |
| Protocol-relative callback | Rejected                                                      |

These match closed N7 behaviors on disk (doc 9 confidence appendix). This `/dev/neon/sessions` page itself remains **Target — not materialized**.

---

## `/dev/neon/organizations`

Slice owner: **N8**

Components:

- `OrganizationMembershipHealth`
- `InvitationDeliveryStatus`
- `InvitationAcceptanceMetrics`
- `OrphanMembershipFinding`
- `RoleMappingExceptions`
- `MembershipVerificationHistory`

---

## `/dev/neon/tenancy`

Slice owner: **N9**

Components:

- `HardTenancyCoverage`
- `TenantOwnedTableCatalog`
- `OrganizationIdConstraintStatus`
- `TenantQueryCoverage`
- `CrossTenantTestEvidence`
- `TenancyGapMatrix`

### Crucial UX message

```text
Hard tenancy enforced by organization_id.
No multi-database isolation claim.
```

This message matches the architecture’s explicit anti-claim.

---

## `/dev/neon/permissions`

Owners: **N10 and N11**

Components:

- `PermissionKernelStatus`
- `PermissionCatalogCoverage`
- `ProductEnforcementMatrix`
- `RolePermissionAssignments`
- `FailClosedTestStatus`
- `UnwiredPermissionFinding`

Example enforcement matrix:

| Permission          | Registered | Assigned | Evaluated | Enforced | Verified |
| ------------------- | ---------: | -------: | --------: | -------: | -------: |
| `clients.invite`    |          ✓ |        ✓ |         ✓ |        ✓ |        ✓ |
| `fft.pipeline.read` |          ✓ |        ✓ |         ✓ |  Pending |  Pending |
| `audit.events.read` |          ✓ |        ✓ |         ✓ |        ✓ |        ✓ |

---

## `/dev/neon/audit`

Slice owner: **N12**

Components:

- `AuditPipelineStatus`
- `SecurityEvidenceCoverage`
- `AppendOnlyStatus`
- `CorrelationCoverage`
- `SensitiveDataRedactionStatus`
- `AuditFailureFinding`
- `EvidenceRetentionStatus`

---

## `/dev/neon/verification`

Owners: **N13 and N14**

Components:

- `AuthenticatedJourneyMatrix`
- `SecurityTestMatrix`
- `FailureModeCoverage`
- `BrowserVerificationRuns`
- `BuildVerificationStatus`
- `RegressionHistory`
- `EvidenceArtifactLinks`

Test groups:

```text
Unit
Integration
Route/proxy
Redirect security
Tenancy
Permission
Authenticated browser
Production build
```

The closure audit document requires direct repository verification, checks for unsafe redirects and raw environment access, and completeness calculated from acceptance evidence—not file count.

---

## `/dev/neon/operations`

Slice owner: **N15**

Components:

- `ProductionOperationsStatus`
- `DeploymentIdentity`
- `RuntimeHealth`
- `IncidentReadiness`
- `RollbackReadiness`
- `OperationalRunbookLinks`
- `RecentChangeTimeline`
- `OpenOperationalRisks`

---

## `/dev/neon/slices`

### Purpose

Display the entire N1–N18 program without allowing unauthorized execution.

### Components

- `SliceRoadmap`
- `WaveSection`
- `SliceStatusCard`
- `DependencyConnector`
- `EvidenceBadge`
- `AcceptanceProgress`
- `NextAuthorizedSlice`

### Waves

| Wave                             | Slices  |
| -------------------------------- | ------- |
| Wave 0 — Foundation              | N1–N4   |
| Wave 1 — Identity/session        | N5–N8   |
| Wave 2 — Tenancy/authz/evidence  | N9–N12  |
| Wave 3 — Verification/operations | N13–N15 |
| Wave 4 — ERP verticals           | N16–N18 |

The program controller requires exactly one controlled slice per implementation mission and forbids implementing future slices for convenience.

---

## `/dev/neon/slices/[sliceId]`

Example:

```text
/dev/neon/slices/N7
```

### Components

```text
SliceDetailPage
├── SliceHeader
├── SliceVerdict
├── ObjectivePanel
├── DependencyPanel
├── AcceptanceCriteriaChecklist
├── ArchitectureCodeGapMatrix
├── FilesChangedTable
├── ContractsChangedTable
├── VerificationEvidenceTable
├── SecurityTenancyProof
├── UnimplementedFindings
├── ResidualRiskRegister
└── NextAuthorizedSlice
```

### Slice lifecycle states

```ts
type SliceState =
  | "not-started"
  | "preflight"
  | "in-progress"
  | "partial"
  | "blocked"
  | "ready-for-audit"
  | "approved"
  | "rejected"
  | "closed";
```

Do not collapse `ready-for-audit`, `approved`, and `closed` into one generic “done” status.

The execution template requires preflight, before-state findings, contracts changed, evidence and a strict stop after the current slice.

The repair flow also requires repairing only the rejected findings and returning the slice for independent closure rather than self-approving it.

---

# 10. N16 shared ERP platform shell

Slice **N16** should establish the shared authenticated shell.

## Recommended component hierarchy

```text
ErpAppShell
├── SkipNavigationLink
├── GlobalHeader
│   ├── ProductIdentity
│   ├── OrganizationSwitcher
│   ├── WorkspaceBreadcrumbs
│   ├── GlobalSearch
│   ├── NotificationTrigger
│   └── UserMenu
├── PrimaryNavigation
├── ContextNavigation
├── MainContent
├── GlobalCommandPalette
├── PermissionDeniedDialog
└── ApplicationStatusRegion
```

## Navigation must be capability-driven

```ts
type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType;
  requiredPermission?: PermissionCode;
  requiredRole?: ShellRole;
  availability?: "active" | "planned" | "disabled";
};
```

Prefer filtering navigation by effective access while **still enforcing authorization on the server**.

Hidden navigation is not security.

---

# 11. Shared frontend components

## Identity and access

```text
SessionBoundary
RoleBoundary
PermissionBoundary
OrganizationBoundary
AuthorizedAction
ForbiddenState
SessionExpiredState
MembershipRequiredState
```

### Important constraint

`PermissionBoundary` is for presentation behavior only. Server actions, route handlers and server-side data access must independently enforce permissions.

---

## Context and navigation

```text
OrganizationSwitcher
WorkspaceSwitcher
AppBreadcrumbs
GlobalCommandPalette
PrimaryNavigation
ContextNavigation
MobileNavigation
UserMenu
```

---

## Data and evidence

```text
DataTable
FilterBar
SearchInput
ColumnVisibilityMenu
Pagination
EvidenceBadge
VerificationBadge
RiskBadge
CorrelationId
AuditTimeline
ChangeHistory
```

---

## Governed states

```text
LoadingSurface
EmptyState
FilteredEmptyState
PermissionDeniedState
NotFoundState
ServiceUnavailableState
PartialDataWarning
StaleEvidenceWarning
ConfigurationRequiredState
```

Every data page should explicitly define:

- loading;
- no records;
- no search results;
- unauthorized;
- forbidden;
- configuration missing;
- service failure;
- stale evidence;
- partial data;
- success.

---

## Forms and actions

```text
FormSection
FieldGroup
ValidationSummary
UnsavedChangesGuard
ConfirmActionDialog
DestructiveActionDialog
ActionResultBanner
IdempotencyStatus
```

---

# 12. Recommended route authorization model

```ts
type RoutePolicy = {
  pattern: string;
  session: "public" | "anonymous-only" | "required";
  roles?: ShellRole[];
  permissions?: PermissionCode[];
  organizationRequired?: boolean;
};
```

Example catalog:

```ts
export const routePolicies: RoutePolicy[] = [
  {
    pattern: "/",
    session: "public",
  },
  {
    pattern: "/auth/:path*",
    session: "anonymous-only",
  },
  {
    pattern: "/admin/:path*",
    session: "required",
    roles: ["admin", "operator"],
    organizationRequired: true,
  },
  {
    pattern: "/client/:path*",
    session: "required",
    roles: ["client"],
    organizationRequired: true,
  },
  {
    pattern: "/system/permissions/:path*",
    session: "required",
    permissions: ["system_admin.permissions.read"],
    organizationRequired: true,
  },
  {
    pattern: "/dev/neon/:path*",
    session: "required",
    permissions: ["platform.neon.read"],
    organizationRequired: true,
  },
];
```

Keep route classification in one governed policy catalog rather than scattering string checks across layouts, middleware and individual pages.

---

# 13. Server and client component boundaries

## Server Components by default

Use Server Components for:

- session resolution;
- role-home routing;
- authorization decisions;
- organization context;
- page-level data loading;
- audit event queries;
- permission catalog reads;
- Neon status reads;
- security evidence;
- slice status.

## Client Components only where interactive behavior is necessary

Use Client Components for:

- search and filter interactions;
- modals and drawers;
- command palette;
- organization switcher UI;
- editable forms;
- charts;
- optimistic interaction;
- column visibility;
- tab controls.

## Recommended page pattern

```tsx
export default async function PermissionCatalogPage() {
  const context = await requireAuthorizedContext({
    permission: "system_admin.permissions.read",
  });

  const catalog = await listPermissionCatalog({
    organizationId: context.organization.id,
  });

  return (
    <PermissionCatalogScreen
      organization={context.organization}
      catalog={catalog}
    />
  );
}
```

Do not fetch protected identity or permission information from the browser merely to decide whether a page should be accessible.

---

# 14. Visual direction

For Afenda’s enterprise visual character, use:

- quiet editorial surface;
- clear evidence hierarchy;
- restrained status colour;
- strong typography;
- low visual noise;
- compact but breathable tables;
- explicit risk and verification states.

## Suggested shell hierarchy

```text
Canvas
  └── App shell
       ├── Header: 64px
       ├── Sidebar: 248px expanded / 72px collapsed
       ├── Context rail: optional 280px
       └── Main content: max-width 1600px
```

## Status semantics

| Status      | Presentation                               |
| ----------- | ------------------------------------------ |
| Verified    | Positive status icon and verification date |
| In progress | Neutral progress indicator                 |
| Warning     | Amber emphasis with required action        |
| Blocked     | Strong warning with owner and dependency   |
| Failed      | Critical emphasis with evidence link       |
| Unknown     | Neutral gray; never imply success          |
| Stale       | Age indicator and re-verification action   |

Do not rely on colour alone; every status needs text and an icon.

---

# 15. Responsive behavior

## Desktop

- persistent navigation;
- multi-column control-centre dashboard;
- tables with configurable columns;
- side detail drawers.

## Tablet

- collapsible navigation;
- two-column KPI layout;
- tables switch to essential columns;
- drawers use most of viewport width.

## Mobile

- bottom or overlay navigation;
- single-column cards;
- data rows become structured record cards;
- sticky primary action;
- filters displayed in a full-screen sheet.

The system module should remain usable on mobile for review and approvals, but complex role and permission editing may show an explicit “desktop recommended” notice—not a hard browser block.

---

# 16. Accessibility acceptance criteria

Every new frontend surface should meet:

- keyboard-complete navigation;
- visible focus states;
- skip-to-content link;
- semantic headings;
- screen-reader labels;
- error summary linked to fields;
- no colour-only state communication;
- sufficient contrast;
- modal focus trap and restoration;
- live-region announcements for async actions;
- reduced-motion support;
- table caption or accessible naming;
- minimum target sizes for interactive controls.

Browser verification is mandatory when user journeys change, and the N7 slice specifically calls for authenticated browser verification and a production build.

---

# 17. Slice-to-frontend delivery map

| Slice | Frontend deliverable                            |
| ----- | ----------------------------------------------- |
| N1    | `/dev/neon/environment`                         |
| N2    | `/dev/neon/database`                            |
| N3    | `/dev/neon/recovery`                            |
| N4    | `/dev/neon/performance`                         |
| N5    | `/auth/*`, Auth BFF status                      |
| N6    | Session and protected-layout boundaries         |
| N7    | Governed destination resolver and redirect UX   |
| N8    | `/join`, organization membership UI             |
| N9    | Tenancy evidence and organization context       |
| N10   | Permission catalog UI                           |
| N11   | Permission-aware product navigation and actions |
| N12   | Audit and security evidence UI                  |
| N13   | Authenticated journey evidence                  |
| N14   | Failure and security verification UI            |
| N15   | Operations and production-readiness UI          |
| N16   | Shared ERP AppShell                             |
| N17   | Client declarations vertical                    |
| N18   | Permitted FFT vertical only                     |

---

# 18. Recommended implementation priority

## Immediate: N7 only — **CLOSED (do not reopen from this file)**

N7 is APPROVED on disk. Do **not** implement a second `resolveAuthorizedDestination()` or treat the sketch below as open work.

```text
# Historical N7 checklist (superseded — already shipped under @afenda/auth names)
resolvePostLoginPath / sanitizeCallbackUrl / getAuthBootstrap
/auth/login redirectTo handling
signed-in / redirect
wrong-role /403 preservation
```

Do **not** implement the full Neon Control Centre (`/dev/neon/*`) or `/system/*` without an Approved slice. Next program ID per neon-auth-slice-map is **N18** only (FFT permitted vertical) — not a sneak-start of doc-10 Target trees.

## After N7 (program order — living slice map wins)

```text
N8–N17 APPROVED (see neon-auth-slice-map)
→ N18 permitted FFT only (UNEVALUATED; FFT-MOD-008 freeze on 2B–2D)
→ /system and /dev/neon only after explicit Approved slice groups
```

---

# 19. Enterprise frontend definition of done

A page is complete only when:

- its route is registered;
- page-level session protection exists;
- server authorization exists;
- organization context is explicit;
- backend queries are tenant-scoped;
- empty, loading, forbidden and failure states exist;
- mutations use permission-controlled server actions;
- audit requirements are satisfied;
- responsive behavior is verified;
- accessibility checks pass;
- unit and integration tests pass;
- browser journey passes when applicable;
- production build passes;
- no later-slice behavior has been introduced.

## Final recommendation

**Living today** (doc 9): `/admin` · `/client/declarations` · `/fft` list-only · auth island `/auth/*` · `/join` · `/403`, with one shared post-login resolver in `@afenda/auth`.

**Target blueprint in this file** (quarantined — not Living):

```text
/admin        Business operations (expand only via Approved slices)
/system       IAM, governance and evidence — not on disk
/dev/neon     Engineering and Neon operations — not on disk
```

Keep this document **separate** from [doc 9](./9-neon-auth-fe-surface-compose-map.md). Broader pages above are Target IA only — never materialization order and never a reason to merge or invent routes without an Approved slice.
