# ARCH-023 Multi-Tenancy Model

| Field | Value |
|-------|-------|
| ID | ARCH-023 |
| Category | Architecture |
| Version | 2.4.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

**Enables:** Correct tenancy claims; hard `organization_id` predicates on every tenant query/write; safe Neon shared-schema ops without reopening locked decisions.

**Audience:** Engineers and agents before inventing tenancy features or changing Neon posture.

**Absorbed:** ADR-012 (shared-schema — deleted). Platform IAM: [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) (former ADR-002).

**Ops:** [RB-001](../../runbooks/RB-001-multi-org-ops.md) · [RB-005](../../runbooks/RB-005-post-lock-coding-cheat-sheet.md) · [neon-tenancy-efficiency](../../../.cursor/skills/neon-tenancy-efficiency/SKILL.md)

**Supersedes:** [ARCH-003](../archive/ARCH-003-multi-tenant-ecosystem.md) (archived stub) · ADR-012 as Living SSOT

---

## Context

Afenda-Lite is a multi-module SaaS (Declarations + Feed Farm Trade) on **one** Next.js deployable, **one** Vercel project, and **one** Neon Postgres project. Tenants are Neon Auth **organizations**. Product permissions are **app-owned** (platform RBAC + module catalogs) — not Neon Auth role names.

| Neon pattern | Afenda-Lite |
|--------------|-------------|
| Project-per-tenant | Rejected (R5 / D5) |
| Schema-per-tenant | Rejected (R4) |
| Shared schema + `organization_id` | **Production model** |

**Shipped:** hard `organization_id NOT NULL` + application predicates on the BFF path.  
**Target API (new work):** `@afenda/auth` + `@afenda/db` `withOrg` ([ARCH-022](ARCH-022-system-overview.md)). Until those packages exist, enforce the same predicates in domain helpers when the product tree is present — do not invent a third model.

**Anti-claim:** Do not say multi-DB isolation or project-per-tenant. **Multi-org ready** means logical tenancy (M1–M4): switcher + scoped templates + isolation proof + org-required ops — not multi-project isolation.

---

## Shared-schema decision (from ADR-012)

**Decision:** Use **shared schema**. Every tenant table includes `organization_id … NOT NULL`. All reads go through `withOrg(orgId)` in `@afenda/db` (Target) or the equivalent hard SQL helper. Neon Row-Level Security is **not** applied on the BFF path — session-based scoping via `withOrg` is sufficient.

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
| Neon RLS on the BFF path | Valuable for direct-DB clients; not needed where `withOrg` already enforces isolation with lower overhead | **R3** |

### Constraints that must not be broken

- Shared schema only — no project-per-tenant and no schema-per-tenant without reopening **R4** / **R5** / **D5** (or a superseding ADR)
- `orgId` is resolved from session and passed explicitly — never inferred from ambient globals or URL alone
- Neon RLS stays out of scope on the BFF path until a direct-DB client forces a new ADR (**R3**)

---

## Responsibilities and boundaries

```text
Tier 1  Neon Auth      who the user is + org membership (organizationId = tenant)
Tier 2  Platform RBAC  fixed permission codes + named roles + scoped assignments (modules/identity)
Tier 3  Modules         check permission codes only (hasPermission) — never role display names
```

**IAM rules, seed catalogs, and rejected IAM alternatives:** [ARCH-011](../ARCH-011-platform-tenancy-rbac.md).

| Layer | Owns | Must not |
|-------|------|----------|
| Neon Auth | Identity, membership, invites, active org | Product permission codes |
| Platform RBAC | Catalogs, org-scoped assignments, `fft.access` | FFT domain event/order permissions |
| Module domain | Org-scoped queries/writes + business rules | Ambient org; `organizations[0]` when multi-member |
| Neon Postgres | Pool, compute, branch protect, restore | App authorization (no RLS on BFF) |

| Concern | Target surface |
|---------|----------------|
| Session | `@afenda/auth` → `getSession()` → `{ userId, orgId, role }` |
| Guard | `@afenda/auth` → `requireRole(role)` |
| Tenant read | `@afenda/db` → `withOrg(orgId)` only |
| Domain | `apps/web/modules/*/domain` — `orgId: string` required |

When the monolith tree is present and packages are not: same invariants via platform org resolve + hard SQL scope helpers under `modules/**` ([GUIDE-004](../../guides/GUIDE-004-engineering-drift-register.md) if paths are missing).

**Shipped IAM surfaces:** see [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) Consequences.

---

## Components

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

---

## Data / request flow

```text
Browser
  → Next.js BFF (RSC / Server Action)
  → getSession() / requireSession (+ requireRole)
  → domain(orgId, …)          // orgId explicit — never ambient
  → withOrg(orgId) / hard SQL
  → Neon shared schema
       WHERE organization_id = $orgId
```

---

## Key decisions

| Decision | Record |
|----------|--------|
| Three-tier IAM (Neon Auth / platform RBAC / module codes) | [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) |
| Shared schema, not project- or schema-per-tenant | This doc § Shared-schema · R4 / R5 / D5 |
| App predicates on BFF; no Neon RLS by default | This doc § Shared-schema · R3 |
| Hard `NOT NULL` + hard filters (no soft dual-mode) | Migration `027` · R1 |
| `withOrg` / hard scope as the only tenant read entry | This doc · [ARCH-024](ARCH-024-package-boundaries.md) |
| FFT domain catalogs stay out of `platform_*` | [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) · R6 |

---

## Decision lock

**Locked 2026-07-12.** Agents must not reopen **Rejected** or **Deferred** rows unless the user explicitly reopens that ID in the current turn.

Cheat sheet: [RB-005](../../runbooks/RB-005-post-lock-coding-cheat-sheet.md).

### Shipped — build on these

| Invariant | Evidence |
|-----------|----------|
| Shared schema + hard `organization_id = $org` | Migrations `026`–`028`; hard scope / Target `withOrg` |
| App predicates on BFF (not Neon RLS) | [ARCH-011](../ARCH-011-platform-tenancy-rbac.md); Server Actions path |
| Multi-org ready M1–M4 (logical) | Switcher, scoped templates, isolation e2e, org-required ops |
| Neon prod posture | Protected branch; pooler; PITR 7d; snapshots; restore drill |
| Efficiency ladder A–E | neon-tenancy skill closed 2026-07-12 |
| Anti-drift D7 + e2e org resolve D8 | Closed 2026-07-12 |

### Rejected — do not implement or re-teach

| ID | Approach | Why | Reopen only if |
|----|----------|-----|----------------|
| **R1** | Soft SQL `(organization_id IS NULL OR = $org)` | Fail-open dual-mode deleted | Never |
| **R2** | First-org stamp `ORDER BY … LIMIT 1` | Wrong-tenant backfill | Never — explicit org / sole membership |
| **R3** | Neon RLS / Data API as default isolation | Product path is BFF + domain SQL | New Data API ADR |
| **R4** | Schema-per-tenant | Migration fan-out | Explicit infra program |
| **R5** | Project-per-tenant as “efficiency” (D5) | One deploy / one Neon project | Compliance, noisy-neighbor, or per-tenant PITR program |
| **R6** | Merge FFT domain catalogs into `platform_*` | Couples FFT gates to platform IAM | Separate ADR + FFT reopen |
| **R7** | Raise CU / invent ERP env placeholders to green checks | Masks pooler/null/org bugs | Measured latency / integration pack |

### Deferred — do not start without reopen

| ID | Item | Why deferred | Reopen trigger |
|----|------|--------------|----------------|
| **D4 / M5** | `organization_id` on FFT children | Parent `fft_event` + org-scoped get enough for v1 | Cross-event analytics / join pain |
| **D5** | Project-per-tenant fleet | Accepted non-goal (same as R5) | Same as R5 |
| — | Prod `PORTAL_ORG_SWITCHER_ENABLED` | Needs second membership + rollback | Operator multi-org go-live |
| — | FFT P3 prod flag promotion | Gate-register only | Explicit FFT reopen |

### Allowed next

1. Product work that **keeps** hard org filters on every new tenant-root query/write.  
2. Weekly anti-drift verify via neon-tenancy skill (do not reopen R*/D*).  
3. Named product slices — not tenancy-model experiments.  
4. Turborepo package wiring per [ARCH-028](ARCH-028-implementation-slices.md) when explicitly requested.

---

## Failure modes

| Failure | Symptom | Action |
|---------|---------|--------|
| Cross-tenant leak | Wrong org data | Stop deploy; find unscoped queries; run isolation e2e |
| Null org on root | `NOT NULL` violation | Fix writer; `npm run audit:tenancy-nulls` |
| Multi-membership, no active org | `NO_ACTIVE_ORGANIZATION` | Switcher / set active |
| Pool exhaustion | Timeouts | Confirm `-pooler`; shorten transactions |
| Missing `orgId` in Target API | Empty result / throw | Keep `orgId: string` (never optional) |
| Session expired | Redirect to login | Normal auth flow |

---

## Operational considerations

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

Detail and weekly ladder: [neon-tenancy-efficiency](../../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) · procedures: [RB-001](../../runbooks/RB-001-multi-org-ops.md).

| Area | Rule |
|------|------|
| Connections | Runtime `-pooler`; migrations use direct endpoint |
| Compute | Paid plan; same region as Vercel; protected prod branch; disable scale-to-zero if cold starts hurt UX |
| Queries | Hard `organization_id = $org`; prefer `(organization_id, …)` leading indexes |
| Restore | PITR 7d (Launch max); daily snapshots; restore drill in RB-001 |
| Security | Missing org predicate = **critical bug**, not a Neon misconfig |

**ASSUMPTION:** Console autoscaling / scale-to-zero / protected-branch toggles are operator-owned and may change outside git. Verify before claiming compliance.

**Live snapshot (2026-07-12 — Launch):** Cloud `org-fragrant-lake-90358173` · project `young-hat-54755363` (**Afenda-Lite**) · branch `br-tiny-hill-ao82jp6f` / `production` protected · PITR **7d** · daily snapshots · compute 0.25–2 CU · region `aws-ap-southeast-1`.

Local auth uses the production Neon branch ([AGENTS.md](../../../AGENTS.md)).

### Commands

```bash
npm run audit:tenancy-nulls
npm run check:tenancy-residue
npm run backfill:fft-access -- --organization-id=<org-uuid>
```

---

## Known limits / future changes

**Non-goals (v1):** Neon RLS on BFF; merging FFT domain catalogs into `platform_*`; FFT P3 prod flags without gate-register; denormalized `organization_id` on every FFT child (D4/M5); project- or schema-per-tenant without closing D5.

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

---

## Related sources

| Doc | Role |
|-----|------|
| [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) | Platform IAM + hard tenancy rules (former ADR-002) |
| [ARCH-022](ARCH-022-system-overview.md) | System overview (ex-ADR-010 workspace) |
| [ARCH-024](ARCH-024-package-boundaries.md) | Package contracts |
| [ARCH-025](ARCH-025-data-layer.md) | Drizzle / `withOrg` (ex-ADR-011) |
| [ARCH-026](ARCH-026-auth-session.md) | Session / RBAC (ex-ADR-013) |
| [FFT-MOD-005](../../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) | FFT domain RBAC (separate catalog) |
| [ARCH-003](../archive/ARCH-003-multi-tenant-ecosystem.md) | Superseded — archived stub |

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.4.0 | 2026-07-13 | Absorbed ADR-012 shared-schema decision (consequences, alternatives, constraints) |
| 2.3.0 | 2026-07-13 | Platform IAM detail → [ARCH-011](../ARCH-011-platform-tenancy-rbac.md); this doc keeps Neon model + Decision lock |
| 2.2.0 | 2026-07-13 | Absorbed ADR-002 platform IAM (three-tier rules, seed catalogs, surfaces) |
| 2.1.0 | 2026-07-13 | Clarity rewrite — architecture mode structure; Decision lock retained |
| 2.0.0 | 2026-07-13 | Absorbed ARCH-003; Living SSOT |
| 1.0.0 | 2026-07-13 | Initial Target sketch |
