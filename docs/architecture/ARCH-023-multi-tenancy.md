# ARCH-023 Multi-Tenancy and Platform RBAC

| Field | Value |
|-------|-------|
| ID | ARCH-023 |
| Category | Architecture |
| Version | 3.1.1 |
| Status | Living |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |

# 1. Purpose

**Sole Living SSOT** for platform tenancy **and** platform RBAC. Enables correct three-tier IAM, hard `organization_id` predicates, shared-schema Neon ops, and Decision lock enforcement without reopening Rejected/Deferred rows.

**Audience:** Engineers and agents before inventing tenancy, IAM, or Neon posture changes.

**Action enabled:** Apply hard org predicates and permission-first IAM; refuse Rejected/Deferred approaches unless the user explicitly reopens that lock ID.

Module FFT domain catalogs stay in [FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md).

**Ops:** [RB-001](../runbooks/RB-001-multi-org-ops.md) · [RB-005](../runbooks/RB-005-post-lock-coding-cheat-sheet.md) · [neon-tenancy-efficiency](../../.cursor/skills/neon-tenancy-efficiency/SKILL.md)

**Supersedes:** [ARCH-003](archive/ARCH-003-multi-tenant-ecosystem.md) (archived stub). Do **not** recreate a separate IAM architecture file.

# 2. Scope

## 2.1 In Scope

- Shared-schema multi-tenancy with hard `organization_id` predicates
- Three-tier IAM (Neon Auth / platform RBAC / module permission codes)
- Tenant-root inventory and query contract (`withOrg` / hard SQL)
- Org resolve (M1) and multi-org readiness (M1–M4)
- Decision lock (Shipped / Rejected / Deferred)
- Neon shared-schema operational posture on the BFF path

## 2.2 Out of Scope

- Neon RLS on the BFF path
- Neon Auth custom product roles
- Merging FFT **domain** permission catalogs into `platform_*` tables
- Project-per-tenant or schema-per-tenant isolation
- FFT domain RBAC detail (owned by FFT-MOD-005)

**Anti-claim:** Do not say multi-DB isolation or project-per-tenant. **Multi-org ready** means logical tenancy (M1–M4) — not multi-project isolation.

# 3. Multi-Tenancy and Platform RBAC

## 3.1 Context

Afenda-Lite is a multi-module SaaS (Declarations + Feed Farm Trade) on **one** Next.js deployable (`apps/web` Target), **one** Vercel project, and **one** Neon Postgres project. Tenants are Neon Auth **organizations**. Neon Auth provides identity and organizations with **fixed** roles (`owner` | `admin` | `member`) and cannot define product permission codes. Product permissions are **app-owned** (platform RBAC + module catalogs).

| Neon pattern | Afenda-Lite |
|--------------|-------------|
| Project-per-tenant | Rejected (R5 / D5) |
| Schema-per-tenant | Rejected (R4) |
| Shared schema + `organization_id` | **Production model** |

**Shipped:** hard `organization_id NOT NULL` + application predicates on the BFF path.  
**Target API:** `@afenda/auth` + `@afenda/db` `withOrg` ([ARCH-022](ARCH-022-system-overview.md)).

## 3.2 Three-tier IAM

```text
Tier 1  Neon Auth      who the user is + which organization (organizationId = tenant)
Tier 2  Platform RBAC  fixed permission codes + named roles + scoped assignments + audit
Tier 3  Modules         check permission codes only (hasPermission) — never role display names
```

| Layer | Owns | Must not |
|-------|------|----------|
| Neon Auth | Identity, membership, invites, active org | Product permission codes |
| Platform RBAC | Catalogs, org-scoped assignments, `fft.access` | FFT domain event/order permissions |
| Module domain | Org-scoped queries/writes + business rules | Ambient org; first-org stamp when multi-member |
| Neon Postgres | Pool, compute, branch protect, restore | App authorization (no RLS on BFF) |

### IAM rules

1. Neon org roles manage membership/invite only — not product authorization.
2. Neon `user.role` `admin`|`user` bootstraps platform access until assignments exist; product code must prefer permission checks.
3. Platform catalog is product-owned; adding a code is a release; assigning it to a role is an org-admin action.
4. Scope v1: `organization` | `platform`. Defer team/BU/event until an explicit ARCH update.
5. FFT keeps its own `fft_*` **domain** catalog. Platform owns **module entry** via `fft.access`. Additive `organization_id` on FFT tables in `026`; hard `NOT NULL` + hard SQL filters in `027`.
6. Reads: RSC → Identity domain. Mutations: Server Actions + Zod + `ActionResult`. No new web-UI REST list endpoints for IAM chrome.
7. AdminCN Roles/Permissions DNA adapts into `apps/web/features/organization-admin`; demo zustand stays DNA-only.
8. **Neon RLS is out of scope** for the product path (Server Actions + explicit org predicates).
9. Tenant-root reads/writes use hard `organization_id = $org` only — no soft `(NULL OR org)` dual-mode after Gate 0 + `027`.

### Seed permission codes (v1)

```text
org.users.manage | org.roles.manage
declarations.manage | declarations.read
clients.invite | account.self
fft.access
```

### Seed role templates (display names only)

```text
Org Admin → all v1 codes (includes fft.access)
Editor → declarations.manage, declarations.read, clients.invite, account.self
Viewer → declarations.read, account.self
```

### Shipped IAM surfaces

- Declarations + FFT tenant roots are `organization_id NOT NULL` (`027`); app filters are hard `= org`.
- `/dashboard/users` is membership-scoped via `neon_auth.member`.
- `/dashboard/roles` and `/dashboard/permissions` are organization-admin product routes under `apps/web`.
- S12 tenancy hard cutover is **closed** (soft dual-mode deleted).

## 3.3 Shared-schema decision

**Decision:** Use **shared schema**. Every tenant table includes `organization_id … NOT NULL`. All reads go through `withOrg(orgId)` in `@afenda/db` (Target) or the equivalent hard SQL helper. Neon Row-Level Security is **not** applied on the BFF path.

### Consequences

| Positive | Accepted cost |
|----------|---------------|
| Single migration run applies to all tenants | Omitting `organization_id` can leak cross-tenant data — mitigate with `withOrg` as the only read entry + `audit:tenancy-nulls` in CI |
| Cross-tenant analytics / backfill are ordinary SQL | Large tenants cannot move to dedicated infra without a migration |
| Shared Neon connection pool — no per-tenant pools | |
| Schema changes reviewed once, not once per tenant | |

### Alternatives rejected (detail)

| Alternative | Why rejected | Lock ID |
|-------------|--------------|---------|
| Schema-per-tenant | Migration fan-out; dynamic schema switching; Drizzle does not natively support it | **R4** |
| Project-per-tenant (separate Neon project) | Cost + pool overhead; no cross-tenant queries; provisioning needs infra automation | **R5** / **D5** |
| Neon RLS on the BFF path | Valuable for direct-DB clients; not needed where `withOrg` already enforces isolation | **R3** |
| Encode product IAM in Neon Auth roles | Neon forbids custom roles/permissions | — |
| Only Neon `admin`\|`user` forever | Cannot support ERP multi-module SaaS | — |
| Merge FFT **domain** catalogs into platform tables now | Couples FFT gates to platform IAM | **R6** |
| Soft `(NULL OR org)` dual-mode after Gate 0 | Fail-open; hard-deleted | **R1** |
| First-org `ORDER BY … LIMIT 1` stamp | Wrong-tenant risk | **R2** |

### Constraints that must not be broken

- Shared schema only — no project-per-tenant and no schema-per-tenant without reopening **R4** / **R5** / **D5** (explicit user reopen)
- `orgId` is resolved from session and passed explicitly — never inferred from ambient globals or URL alone
- Neon RLS stays out of scope on the BFF path until a direct-DB client forces a superseding ARCH decision (**R3**)

## 3.4 Responsibilities and boundaries (Target packages)

| Concern | Target surface |
|---------|----------------|
| Session | `@afenda/auth` → `getSession()` → `{ userId, orgId, role }` |
| Guard | `@afenda/auth` → `requireRole(role)` |
| Tenant read | `@afenda/db` → `withOrg(orgId)` only |
| Domain | `apps/web/modules/*/domain` — `orgId: string` required |
| Edge session gate | `apps/web/proxy.ts` (Next.js proxy — **not** `middleware.ts`) |

## 3.5 Components

### Session

```typescript
type Session = {
  userId: string
  orgId: string // required — never nullable
  role: 'admin' | 'operator' | 'client'
}
```

### Schema

Every tenant-root table includes `organization_id … NOT NULL` (uuid in shipped migrations). CI: `npm run audit:tenancy-nulls`.

**Tenant roots (after migration `027`):**

| Module | Tables |
|--------|--------|
| Declarations | `surveys`, `client_invitations`, `client_profiles`, `client_assignments` |
| FFT | `fft_event`, `fft_sales_member`, `fft_role`, `fft_role_assignment` |

`platform_role.organization_id` may be NULL only when `is_system_template = TRUE`.

### Query contract

- **Reads:** `withOrg(orgId)` (Target) or equivalent hard `organization_id = $org` helper — never soft `(NULL OR org)`.
- **Writes:** always set `organizationId` explicitly.
- Unscoped tenant reads in app code are forbidden.

### Org resolve (M1 — shipped)

1. `activeOrganizationId` if the user is a member  
2. else slug match  
3. else **sole** membership  
4. else create + `setActive`  

Never `organizations[0]` when membership length > 1 → `NO_ACTIVE_ORGANIZATION`.

## 3.6 Data / request flow

```text
Browser
  → apps/web (RSC / Server Action) · edge gate apps/web/proxy.ts
  → getSession() / requireSession (+ requireRole)
  → domain(orgId, …)          // orgId explicit — never ambient
  → withOrg(orgId) / hard SQL
  → Neon shared schema
       WHERE organization_id = $orgId
```

## 3.7 Key decisions

| Decision | Record |
|----------|--------|
| Three-tier IAM (Neon Auth / platform RBAC / module codes) | This doc § 3.2 |
| Shared schema, not project- or schema-per-tenant | This doc § 3.3 · R4 / R5 / D5 |
| App predicates on BFF; no Neon RLS by default | This doc § 3.3 · R3 |
| Hard `NOT NULL` + hard filters (no soft dual-mode) | Migration `027` · R1 |
| `withOrg` / hard scope as the only tenant read entry | This doc · [ARCH-024](ARCH-024-package-boundaries.md) |
| FFT domain catalogs stay out of `platform_*` | This doc · R6 · [FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) |

## 3.8 Decision lock

**Locked 2026-07-12.** Agents must not reopen **Rejected** or **Deferred** rows unless the user explicitly reopens that ID in the current turn.

Cheat sheet: [RB-005](../runbooks/RB-005-post-lock-coding-cheat-sheet.md).

### Shipped — build on these

| Invariant | Evidence |
|-----------|----------|
| Shared schema + hard `organization_id = $org` | Migrations `026`–`028`; hard scope / Target `withOrg` |
| App predicates on BFF (not Neon RLS) | This doc § 3.2; Server Actions path |
| Multi-org ready M1–M4 (logical) | Switcher, scoped templates, isolation e2e, org-required ops |
| Neon prod posture | Protected branch; pooler; PITR 7d; snapshots; restore drill |
| Efficiency ladder A–E | neon-tenancy skill closed 2026-07-12 |
| Anti-drift D7 + e2e org resolve D8 | Closed 2026-07-12 |

### Rejected — do not implement or re-teach

| ID | Approach | Why | Reopen only if |
|----|----------|-----|----------------|
| **R1** | Soft SQL `(organization_id IS NULL OR = $org)` | Fail-open dual-mode deleted | Never |
| **R2** | First-org stamp `ORDER BY … LIMIT 1` | Wrong-tenant backfill | Never — explicit org / sole membership |
| **R3** | Neon RLS / Data API as default isolation | Product path is BFF + domain SQL | Explicit user reopen + superseding ARCH |
| **R4** | Schema-per-tenant | Migration fan-out | Explicit infra program |
| **R5** | Project-per-tenant as “efficiency” (D5) | One deploy / one Neon project | Compliance, noisy-neighbor, or per-tenant PITR program |
| **R6** | Merge FFT domain catalogs into `platform_*` | Couples FFT gates to platform IAM | Explicit FFT reopen + ARCH update |
| **R7** | Raise CU / invent ERP env placeholders to green checks | Masks pooler/null/org bugs | Measured latency / integration pack |

### Deferred — do not start without reopen

| ID | Item | Why deferred | Reopen trigger |
|----|------|--------------|----------------|
| **D4 / M5** | `organization_id` on FFT children | Parent `fft_event` + org-scoped get enough for v1 | Cross-event analytics / join pain |
| **D5** | Project-per-tenant fleet | Accepted non-goal (same as R5) | Same as R5 |
| — | Prod `PORTAL_ORG_SWITCHER_ENABLED` | Needs second membership + rollback | Operator multi-org go-live |
| — | FFT P3 prod flag promotion | Ops gate in FFT-MOD-008 | Explicit FFT reopen |

### Allowed next

1. Product work that **keeps** hard org filters on every new tenant-root query/write.  
2. Weekly anti-drift verify via neon-tenancy skill (do not reopen R*/D*).  
3. Named product slices — not tenancy-model experiments.  
4. Turborepo package wiring per [ARCH-028](ARCH-028-implementation-slices.md) when explicitly requested.

## 3.9 Failure modes

| Failure | Symptom | Action |
|---------|---------|--------|
| Cross-tenant leak | Wrong org data | Stop deploy; find unscoped queries; run isolation e2e |
| Null org on root | `NOT NULL` violation | Fix writer; `npm run audit:tenancy-nulls` |
| Multi-membership, no active org | `NO_ACTIVE_ORGANIZATION` | Switcher / set active |
| Pool exhaustion | Timeouts | Confirm `-pooler`; shorten transactions |
| Missing `orgId` in Target API | Empty result / throw | Keep `orgId: string` (never optional) |
| Session expired | Redirect to login | Normal auth flow |

## 3.10 Operational considerations

### Environment

| Var | Meaning |
|-----|---------|
| `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` | Auth org bootstrap (optional) |
| `PORTAL_ORG_SWITCHER_ENABLED` | Header org switcher (default off) |
| `APP_URL` | Invite Origin + slug fallback |
| `FFT_RBAC_ENABLED` | FFT **domain** dual-read — **not** soft SQL tenancy |
| `DATABASE_URL` | Prod must use Neon **`-pooler`** host |
| `NEON_ORG_ID` | Neon **Cloud** org — not the Auth tenant id |

No Auth organization UUID is hardcoded in app runtime.

### Neon efficiency (shared-schema)

Detail and weekly ladder: [neon-tenancy-efficiency](../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) · procedures: [RB-001](../runbooks/RB-001-multi-org-ops.md).

| Area | Rule |
|------|------|
| Connections | Runtime `-pooler`; migrations use direct endpoint |
| Compute | Paid plan; same region as Vercel; protected prod branch; disable scale-to-zero if cold starts hurt UX |
| Queries | Hard `organization_id = $org`; prefer `(organization_id, …)` leading indexes |
| Restore | PITR 7d (Launch max); daily snapshots; restore drill in RB-001 |
| Security | Missing org predicate = **critical bug**, not a Neon misconfig |

**ASSUMPTION:** Console autoscaling / scale-to-zero / protected-branch toggles are operator-owned and may change outside git. Verify before claiming compliance.

**Live snapshot (2026-07-12 — Launch):** Cloud `org-fragrant-lake-90358173` · project `young-hat-54755363` (**Afenda-Lite**) · branch `br-tiny-hill-ao82jp6f` / `production` protected · PITR **7d** · daily snapshots · compute 0.25–2 CU · region `aws-ap-southeast-1`.

Local auth uses the production Neon branch ([AGENTS.md](../../AGENTS.md)).

### Commands

```bash
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run backfill:fft-access -- --organization-id=<org-uuid>
```

# 4. References

| ID | Title | Relationship |
|----|-------|--------------|
| DOC-001 | Documentation Control Standard | Governance |
| ARCH-022 | System Overview — Turborepo | System overview + workspace |
| ARCH-024 | Package Boundaries | Package contracts |
| ARCH-025 | Data Layer | Drizzle / `withOrg` Target packaging |
| ARCH-026 | Authentication and Session Model | Session helpers (not Living IAM) |
| ARCH-028 | Turborepo Implementation Slices | Target package wiring order |
| FFT-MOD-005 | FFT Auth / Tenancy / RBAC | FFT domain RBAC (separate catalog) |
| RB-001 | Multi-org ops | Operational procedures |
| RB-005 | Post-lock coding cheat sheet | Decision lock flash card |
| ARCH-003 | Multi-tenant Ecosystem | Superseded — archived stub |

# 5. Change Log

| Version | Date | Summary |
|---------|------|---------|
| 3.1.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 3.1.0 | 2026-07-14 | DOC-003 six-section retrofit; Decision lock R1–R7 / D4·D5 content unchanged. |
| 3.0.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 3.0.0 | 2026-07-13 | Merged platform IAM/RBAC into this doc; deleted separate ARCH-023; Target paths (`apps/web`); no ADR residue |
| 2.4.0 | 2026-07-13 | Shared-schema decision detail |
| 2.0.0 | 2026-07-13 | Absorbed ARCH-003; Living SSOT |
| 1.0.0 | 2026-07-13 | Initial Target sketch |

# 6. Notes

**Non-goals (v1):** Neon RLS on BFF; merging FFT domain catalogs into `platform_*`; FFT P3 prod flags without FFT-MOD-008 reopen; denormalized `organization_id` on every FFT child (D4/M5); project- or schema-per-tenant without closing D5.

| ID | Status |
|----|--------|
| D1–D3, D6–D8 | **Closed** |
| D4 | **Deferred (M5)** — children via `fft_event` |
| D5 | **Accepted non-goal** — single Neon project/branch |

| Phase | Status | Requirement |
|-------|--------|-------------|
| M1–M4 | **Shipped** | Switcher, scoped templates, isolation e2e, org-required ops |
| M5 | Proposed | Child `organization_id` if analytics need it |

After M1–M4, say **multi-org ready** (logical). Never multi-DB / project-per-tenant (D5).

Cross-tenant analytics need a warehouse or replica — not supported in this model.

Decision lock rows in § 3.8 remain binding; this Notes section does not reopen them.
