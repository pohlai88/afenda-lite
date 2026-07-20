> **Superseded for decisions:** [packages_refactor_v2.3.md](./packages_refactor_v2.3.md) (promotion-blocking amendments). Keep this v2.2 file for history only.

# Packages classification — Technical Specification v2.2

| Field | Value |
|-------|-------|
| Mode | Technical specification |
| Status | Draft — Scratch · **superseded by v2.3** |
| Audience | Engineers and agents maintaining `@afenda/*` |
| Decision enabled | Accept Scratch → promote laws into monorepo authority → run Phase 1–2 only |
| Supersedes | [v2.1](./packages_refactor_v2.1.md) · [v2](./packages_refactor_v2.md) · [v1](./packages_refactor.md) |
| Date | 2026-07-20 |
| Editorial | Refined for scanability (structure only; no architecture change) |
| Evidence | Living packages · [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |

**Scratch only.** Not Living DOC-001 until the approval handoff completes.

```text
AFTER HUMAN ACCEPTANCE:
  APPROVED FOR LIVING-AUTHORITY PROMOTION

AFTER LIVING PROMOTION COMPLETES — AUTHORIZED:
  Phase 1 classification
  Phase 2 manifests, registers, validators

NOT AUTHORIZED BY THIS DOCUMENT:
  Phase 3 physical nesting
  Phase 4 new ERP package creation
  Runtime @afenda/module-catalog
  @afenda/authorization extraction
  @afenda/jobs creation
```

---

## Overview

This spec freezes the ERP package governance model for Afenda-Lite. Architecture is stable; v2.2 closes anti-drift gaps so juniors and CI can execute the same laws.

```text
ERP expansion governance baseline = Phase 1 + Phase 2
  (only after Living-authority promotion).

Runtime module control plane readiness additionally requires
@afenda/module-catalog, org module-state, dependency closure,
and enablement enforcement — not docs or CI alone.
```

**Operating law for implementers**

1. Find the package owner; call its public API.
2. Do not import a peer ERP package without an approved **workspace** edge.
3. Do not write another module’s **mutation tables**.
4. Enforce declared permissions inside material commands via an injected authorization port.
5. Let CI prove the boundary (including negative fixtures).

---

## Problem

Almost every workspace package sits under Rank-1 Platform while mixing foundation leaves, runtime infra, data-plane SSOTs, control plane, ERP modules, and AI. Folder labels alone do not stop ownership drift. Import law, explicit ownership, and validators with negative fixtures do.

---

## Goals

1. Assign every existing package exactly one **band** (classification only — never import rights).
2. Keep one capability owner per package; ban category barrels and mega-helpers.
3. Enforce package-specific workspace edges and write boundaries in CI before more ERP packages land.
4. Keep workspace DAG and runtime module enablement in **separate registers**.
5. Promote Scratch laws into named monorepo authority **before** Phase 1–2 coding.

## Non-goals

- Mega-packages (`@afenda/commercial`, `@afenda/finance`) or shared-domain kits.
- Empty speculative packages or empty source trees.
- Restoring Living `docs/` or Collapse-era trees without named recovery.
- Shipping new ERP packages without an ARCH-006 / Approved slice.
- Claiming runtime enablement readiness from documentation or CI alone.
- Starting package or validator work from Scratch before Living promotion.
- Authorizing Phase 3/4, module-catalog runtime, authorization extract, or jobs here.

---

## Constraints

| Constraint | Source |
|------------|--------|
| Imports flow Rank 3 → 2 → 1; packages never import `apps/*` | ARCH-024 / LAYERS |
| No `@afenda/shared`; no category implementation packages | ARCH-024 |
| Schema DDL in `@afenda/db`; mutation authority in owning domain package | Monorepo + master-data / sales |
| Enterprise production quality — no shim or stub product paths | Always-apply rules |
| Scratch acceptance ≠ implementation start | Approval handoff |
| `apps/web/modules/*` ≠ `@afenda/module-catalog` | AGENTS.md |
| Flat `packages/<name>` remains valid indefinitely | Physical layout |

---

## Approval handoff (Scratch → Living)

Human acceptance authorizes **preparation of Living architecture amendments** only.

```text
1. Record the decision on the applicable controlled architecture surface
   (when Living docs reopen: ADR / ARCH companion; until then operative
   day-to-day surfaces are docs-V2/monorepo + LAYERS.md).
2. Update docs-V2/monorepo and LAYERS.md with the approved laws.
3. Assign document/version authority on those surfaces.
4. Mark this Scratch file accepted-reference or superseded.
5. Only then begin Phase 1.
```

Agents must not edit packages or add CI validators from this Scratch file alone.

---

## Proposed design

### Physical layout

**Canonical architecture is classification and ownership — not folder nesting.**

`packages/erp/sales` may stay at the package root forever while classified `band: R1-F`, `category: commercial`.

If Phase 3 is later authorized, use **one** category level; published names stay `@afenda/<name>`:

```text
packages/
├─ foundation/
├─ runtime/
├─ data-plane/
├─ control-plane/
├─ transaction-core/   # packages only when promote rule fires
├─ erp/
├─ intelligence/
└─ surfaces/
```

Category folders may contain `README.md` and child packages only — never `package.json`, barrels, or domain stores.

### Rank and band

Official ranks stay: 1 Platform · 2 Surfaces · 3 Application.

| Band | Kind | Examples |
|------|------|----------|
| R1-A | Foundation | config, env, errors |
| R1-B | Runtime | logger, http, security, metrics, openapi, rate-limit, cache |
| R1-C | Data plane | db, audit, events, search, notifications, jobs |
| R1-D | Control plane | auth, authorization, admin, module-catalog |
| R1-E | Transaction core | numbering, idempotency, document-links, approvals, workflow, attachments |
| R1-F | ERP | master-data, sales, … |
| R1-X | Optional capability | ai-the-machine |
| R2 | Surfaces | ui-system, emails |

```text
Bands classify packages; bands never grant dependency rights.
A package may import only what its package.json declares and
WORKSPACE-EDGE-REGISTER approves. Every edge is package-specific.
```

### Workspace edges vs module dependencies

**Default:** peer ERP packages do not import each other.

| Package | Approved workspace deps (living) |
|---------|----------------------------------|
| `@afenda/sales` | errors, db, audit, events, master-data |
| `@afenda/master-data` | errors, db, audit, events, search (per living DAG) |
| Future `@afenda/inventory` | Only via Approved ARCH-006 cut + workspace-edge row |

Also forbidden: dual-write another package’s mutation tables; ERP import of `@afenda/admin`.

These graphs **must not** share one register:

```text
docs-V2/modules/
├─ WORKSPACE-EDGE-REGISTER.yaml      # compile / package.json DAG
└─ MODULE-DEPENDENCY-REGISTER.yaml   # org enablement / integration
```

**Workspace edge example**

```yaml
edges:
  - from: "@afenda/sales"
    to: "@afenda/master-data"
    status: approved
    authority: ARCH-006
    reason: "FK + snapshots; masters via public API"
    effectiveDate: "2026-07-01"
```

**Module dependency example** (does not create a workspace edge)

```yaml
modules:
  sales:
    required: [master-data]
    optional: [inventory, fulfillment, receivables]
```

| Integration style | Meaning | Adapter location |
|-------------------|---------|------------------|
| `events` | Async reaction to versioned outbox events | Application composition root |
| `ports` | Sync call surface (not same-TX by default) | Composition root injects adapters |
| `app-saga` | Multi-command workflow | Composition root only |

```text
Cross-package adapters and sagas live in an approved application
composition root. Today: apps/web. Future worker, CLI, or scheduled
host may join without changing domain ownership.
```

**moduleId resolution:** every `moduleId` in a manifest or MODULE-DEPENDENCY-REGISTER must resolve to an on-disk module manifest **or** a row in `MODULE-ROADMAP.yaml`. Misspellings and orphan ids fail CI.

### Cross-domain transactions

```text
Cross-domain work is not same-transaction by default.
Each package commits its aggregate, audit fact, and outbox event
atomically. Peers react via versioned events or an application saga.
```

Same-TX across domains requires an approved architecture decision that names: atomic invariant, coordinator owner, shared TX context, participating ports, rollback, retry/idempotency, and Approved workspace edge. Injection alone is not atomicity.

### Persistence and queries

| Responsibility | Owner |
|----------------|--------|
| Drizzle DDL and migrations | `@afenda/db` |
| Business mutation authority | Owning ERP package |
| Canonical domain queries | Owning ERP package |
| Cross-domain reads | Owner public query API or Approved query port |
| Combined projections / reporting | Approved application or read-model owner |
| Direct app write to domain tables | Forbidden |

Example: `getSalesOrderById` → Sales. `getOrderFulfillmentInvoiceStatus` (Sales + Fulfillment + Receivables) → application projection — not a peer ERP import.

### Events

| Concern | Owner |
|---------|--------|
| Decision to emit | Domain package |
| Type / schema / version | `@afenda/events` |
| Outbox persistence | `@afenda/events` |
| Handler wiring | Application composition root |
| Consumer mutation | Consuming domain package |
| Delivery retry | Composition root or future Jobs |

`@afenda/events` does not own business event meaning.

### Command authorization

```text
Composition roots supply authorization adapters.
Material ERP commands enforce declared permissions through an injected
authorization port (or approved shared contract).
A route check alone is not sufficient command authorization.
```

ERP packages own a local authorization **port interface** and call it inside material commands. They never import `@afenda/admin`.

```ts
export interface SalesAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: SalesPermission;
  }): Promise<boolean>;
}

// inside a material command
const permitted = await authorization.can({
  organizationId: input.organizationId,
  actorUserId: input.actorUserId,
  permission: "sales.orders.post",
});
if (!permitted) {
  return { ok: false, error: salesErrors.forbidden("sales.orders.post") };
}
```

Composition-root adapters may wire to `@afenda/admin/authorization` until `@afenda/authorization` is extracted (extraction not authorized here). Workers, CLIs, and scripts must inject the same port.

### Control plane names

| Concern | Owner |
|---------|--------|
| Session / credentials | `@afenda/auth` |
| Permission evaluation adapter | `@afenda/admin/authorization` (composition roots) → later `@afenda/authorization` |
| Org console / RBAC audit | `@afenda/admin` |
| Module registration / org enablement | `@afenda/module-catalog` (runtime not authorized here) |

Glossary: `apps/web/modules/*` = app domain folders. `@afenda/module-catalog` = Rank-1 enablement package.

### Jobs and transaction-core

| Package | Owns | Does not |
|---------|------|----------|
| `@afenda/events` | Outbox SSOT + event contracts | Business meaning; message buses |
| `@afenda/jobs` (when promoted) | Durable retry / schedule / worker ops; invokes commands | Importing every ERP package; recreating commands |

Do not create `@afenda/jobs` because events exist. Promote when durable work leaves the HTTP request (schedules, long-running jobs, worker scaling, dead-letter, checkpoints, restart survival). **Not authorized here.**

Shared R1-E packages appear only when two modules need the capability, or one needs an enterprise guarantee that cannot stay package-local. Record intent in MODULE-ROADMAP. No empty scaffolds.

### No generic shared helpers

```text
Do not promote a business helper to a shared package because two
functions look similar. Promotion requires identical business meaning,
lifecycle, errors, tenancy, and ownership. Similarity is not authority.
```

Banned premature homes: `@afenda/common`, `@afenda/shared`, `@afenda/erp-utils`, `@afenda/domain-kit`.

### State vocabularies (three concerns)

```ts
// Package manifest (on-disk ERP only)
type PackageLifecycle = "scaffolded" | "active" | "deprecated" | "retired";

// MODULE-ROADMAP.yaml (no package required)
type ModulePlanningState =
  | "candidate"
  | "approved"
  | "implemented"
  | "on_hold"
  | "rejected";

// @afenda/module-catalog (future runtime — not authorized here)
type OrganizationModuleState = "disabled" | "enabled" | "read_only";
type ModuleActivationMode = "core" | "organization_toggle";
```

A candidate module has no package and no package manifest.

### Enablement invariants (future catalog)

```text
Cannot enable a module unless required dependencies are enabled.
Cannot disable a required dependency while active dependents exist.
read_only: authorized historical reads; reject business mutations.
disabled: hide normal nav; reject normal commands; keep history.
Enablement never changes package ownership or mutation-table authority.
```

### Module manifest

Every scaffolded/active ERP package exports `src/module.manifest.ts`. Exact IDs should be imported from package constants.

```ts
export interface AfendaModuleManifest {
  readonly id: string;
  readonly category: string;
  readonly packageName: `@afenda/${string}`;
  readonly band: "R1-F";
  readonly lifecycle: PackageLifecycle;
  readonly activationMode: ModuleActivationMode;

  readonly owns: {
    readonly aggregates: readonly string[];
    readonly commandNamespace: string;
    readonly commands: readonly string[];
  };

  readonly persistence: {
    readonly schemaOwner: "@afenda/db";
    readonly mutationTables: readonly string[];
  };

  readonly events: {
    readonly namespace: string;
    readonly emits: readonly string[];
    readonly consumes: readonly string[];
  };

  readonly permissions: {
    readonly namespace: string;
    readonly codes: readonly string[];
  };

  readonly moduleDependencies: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
  };

  readonly optionalIntegratesWith: readonly {
    readonly moduleId: string;
    readonly style: "events" | "ports" | "app-saga";
  }[];
}
```

Illustrative Sales (abbreviated permissions list for readability — living catalogs must be complete):

```ts
export const salesModuleManifest = {
  id: "sales",
  category: "commercial",
  packageName: "@afenda/sales",
  band: "R1-F",
  lifecycle: "active",
  activationMode: "organization_toggle",
  owns: {
    aggregates: ["sales_order"],
    commandNamespace: "sales.order",
    commands: [
      "sales.order.create",
      "sales.order.line.add",
      "sales.order.post",
    ],
  },
  persistence: {
    schemaOwner: "@afenda/db",
    mutationTables: ["sales_order", "sales_order_line"],
  },
  events: {
    namespace: "sales.order",
    emits: [
      "sales.order.created.v1",
      "sales.order.line_added.v1",
      "sales.order.posted.v1",
    ],
    consumes: [],
  },
  permissions: {
    namespace: "sales",
    codes: [
      "sales.orders.read",
      "sales.orders.create",
      "sales.orders.update",
      "sales.orders.submit",
      "sales.orders.approve",
      "sales.orders.post",
      "sales.orders.cancel",
      "sales.orders.export",
    ],
  },
  moduleDependencies: { required: ["master-data"], optional: [] },
  optionalIntegratesWith: [
    { moduleId: "inventory", style: "events" },
    { moduleId: "fulfillment", style: "events" },
    { moduleId: "receivables", style: "events" },
  ],
} as const satisfies AfendaModuleManifest;
```

CI validates: duplicate or undeclared permission/command/event codes; wrong namespace; route or command permission refs to missing codes. Routes and navigation stay application-owned.

### Registers and authority matrix

```text
docs-V2/modules/
├─ MODULE-CATALOG.generated.yaml     # on-disk only; CI-diff
├─ MODULE-ROADMAP.yaml               # planning rows only
├─ TABLE-OWNERSHIP.yaml
├─ COMMAND-REGISTER.yaml
├─ EVENT-REGISTER.yaml
├─ PERMISSION-REGISTER.yaml
├─ ROUTE-REGISTER.yaml               # application-owned
├─ WORKSPACE-EDGE-REGISTER.yaml
└─ MODULE-DEPENDENCY-REGISTER.yaml
```

Effective module universe = generated catalog + controlled roadmap.

| Information | Primary SSOT | Validation |
|-------------|--------------|------------|
| Existing module identity | ERP package manifest | → MODULE-CATALOG.generated.yaml |
| Planned module identity | MODULE-ROADMAP.yaml | No package manifest |
| Aggregate owner | Manifest `owns.aggregates` | ↔ TABLE-OWNERSHIP |
| Mutation-table authority | Manifest `persistence.mutationTables` | ↔ `@afenda/db` DDL |
| Workspace dependency | `package.json` | ↔ WORKSPACE-EDGE-REGISTER |
| Runtime module dependency | Manifest + MODULE-DEPENDENCY-REGISTER | Must not invent workspace edge |
| Event contract | `@afenda/events` | Manifest emits/consumes |
| Permission codes | Auth catalog + manifest `permissions` | Route/command refs |
| Route / navigation | Application registers | Module id + enablement (when catalog exists) |
| Org enablement | `@afenda/module-catalog` | Runtime — not authorized here |

Command: `pnpm validate:modules` (fan-out).

### Write-enforcement stack

| Layer | Mechanism |
|-------|-----------|
| 1 | Owner-only schema exports (`@afenda/db/schema/sales`, …) |
| 2 | Import-boundary CI (foreign / peer schema imports fail) |
| 3 | AST scan of Drizzle insert/update/delete ↔ TABLE-OWNERSHIP |
| 4 | Integration tests for hostile cross-domain / cross-tenant writes |
| 5 | Org-scoped FKs / uniques where practical |

**Phase 2 minimum:** Layers 1–2 plus negative fixtures.

### README and package creation

[packages/README.md](../../packages/README.md) lists on-disk packages by band only. Candidates live in MODULE-ROADMAP.

Create a package only with: owned aggregate · public command or query · store · manifest · test · README. Add folders when files exist.

### Candidate spine (create not authorized)

```text
Sales → Inventory → Fulfillment → Receivables → Payments → Accounting
Purchasing → Receiving → Inventory → Payables → Payments → Accounting
```

P0 candidates: `purchasing` · `inventory` · `receiving` · `fulfillment` · `receivables` · `payables` · `payments` · `accounting`.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Agents implement from Scratch | Approval handoff; Living promotion first |
| Runtime enablement claimed from CI | Explicit baseline vs control-plane wording |
| Optional module integration creates workspace edge | Dual registers + CI check |
| Same-TX assumed from DI | Exceptional ADR rule |
| Permission/command drift | Exact IDs on manifest + constants import |
| Premature shared packages | No-generic-helper rule |
| Phase 3 silent moves | Evidence gate; not authorized here |

---

## Rollout and rollback

### Phase 1 — Classification (after Living promotion)

Done when:

- [ ] Every existing package has exactly one band
- [ ] Bands documented as classification, not dependency rights
- [ ] ERP dependency law + dual registers in monorepo authority
- [ ] `master-data` / `sales` ownership and `mutationTables` documented
- [ ] Authority matrix in monorepo notes
- [ ] Package names and paths unchanged
- [ ] Candidates separated (MODULE-ROADMAP vs catalog)
- [ ] No claim of runtime control-plane readiness

**Rollback:** revert documentation commits.

### Phase 2 — Manifests and validators

Done when:

- [ ] `master-data` and `sales` export valid manifests
- [ ] MODULE-CATALOG.generated.yaml matches committed output
- [ ] WORKSPACE-EDGE-REGISTER matches living `package.json` edges
- [ ] MODULE-DEPENDENCY-REGISTER aligns with manifests; invents no workspace edges
- [ ] Route / event / permission authorities validated separately
- [ ] Duplicate module ids, mutation-table owners, command/event/permission codes fail CI
- [ ] Peer ERP imports fail without approved workspace edge
- [ ] Deep `@afenda/*/src/*` imports fail
- [ ] Unauthorized DB schema imports fail (Layers 1–2)
- [ ] Package DAG cycles fail
- [ ] `moduleId` refs resolve to catalog or MODULE-ROADMAP
- [ ] Candidates do not require workspace packages
- [ ] Material command auth-port coverage in package or contract tests
- [ ] Negative fixtures prove each rule fails on intentional violations

**Rollback:** remove CI job and validators in a follow-up commit. Do not mark failing validators green.

### Phase 3 / 4 — Not authorized

**Phase 3 evidence gate** (open nesting only if ≥2 hold): ≥24 root package dirs · ≥3 documented path mistakes in 60 days · maintainers need a manual category map · audit navigation slowed · nesting study shows fewer path errors.

**Phase 4:** ARCH-006 cut · manifest · store · command · test · README · workspace edge + module dependency rows · no peer imports without Approved edge.

---

## Proposed decisions pending human acceptance

1. One package per capability; category folders organizational only; `@afenda/<name>` imports.
2. Peer ERP imports forbidden by default; integrations declare style; composition-root adapters.
3. Bands classify only; WORKSPACE-EDGE-REGISTER vs MODULE-DEPENDENCY-REGISTER.
4. `persistence.mutationTables` with `schemaOwner: "@afenda/db"`; query ownership as above.
5. Command-level authorization via injected port; route check insufficient.
6. Exact commands, events, and permissions on the manifest.
7. Every `moduleId` resolves to catalog or MODULE-ROADMAP.
8. MODULE-CATALOG.generated.yaml vs MODULE-ROADMAP.yaml.
9. Event meaning vs contract ownership as above.
10. No-generic-helper rule; ban shared mega-kits.
11. Scratch acceptance → Living promotion → Phase 1–2 only.
12. Phase 3/4, module-catalog runtime, authorization extract, jobs — not authorized here.

---

## Open questions (defaults unless human overrides)

| ID | Topic | Default |
|----|-------|---------|
| Q1 | Authorization extract | Keep `@afenda/admin/authorization` for composition-root adapters; ERP local ports only. Extract `@afenda/authorization` when first non-admin Rank-1 package or second composition root needs the shared contract. **Not authorized here.** |
| Q2 | Phase 3 trigger | Multi-condition evidence gate — not a single package count. |
| Q3 | Jobs package | Stay composition-root injected until promote criteria under Jobs and transaction-core. **Not authorized here.** |

---

## Appendix A — v2.1 → v2.2 content delta

| Topic | v2.1 | v2.2 |
|-------|------|------|
| Dependency registers | Single DEPENDENCY-REGISTER | WORKSPACE-EDGE + MODULE-DEPENDENCY |
| Table field | `owns.tables` | `persistence.mutationTables` + schemaOwner |
| Authorization | Composition-root only | Command-level port law |
| Permissions | Prefix | Exact `permissions.codes` |
| Candidate refs | Underspecified | Catalog or MODULE-ROADMAP |
| Promotion | Implied | Explicit Scratch → Living handoff |
| Module files | Mixed | Generated catalog + roadmap |
| Shared helpers | Implicit | Explicit no-generic-helper |
| Approval target | Phase 1–2 directly | Living promotion first |

## Appendix B — Related docs

- Prior drafts: [v2.1](./packages_refactor_v2.1.md) · [v2](./packages_refactor_v2.md) · [v1](./packages_refactor.md)
- [packages/README.md](../../packages/README.md)
- [docs-V2/monorepo/README.md](../monorepo/README.md)
- [docs-V2/master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md)
- [afenda-elite-monorepo-discipline](../../.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md)
