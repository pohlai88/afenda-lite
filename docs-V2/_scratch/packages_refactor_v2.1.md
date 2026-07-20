> **Superseded for decisions:** [packages_refactor_v2.2.md](./packages_refactor_v2.2.md) (focused critical amendments). Keep this v2.1 file for history only.

# Packages classification — Revise Plan v2.1

| Field | Value |
|-------|-------|
| Mode | Technical specification (revise plan) |
| Status | Draft — Scratch · **superseded by v2.2** |
| Review score | 88/100 (pre-amendment); this file applies the mandatory v2.1 amendments |
| Audience | Engineers maintaining `@afenda/*` and monorepo agents |
| Enables | Approve **Phase 1–2** ERP expansion governance baseline only |
| Supersedes | [packages_refactor_v2.md](./packages_refactor_v2.md) body · [packages_refactor.md](./packages_refactor.md) (v1) |
| Date | 2026-07-20 |
| Evidence | v2 review verdict · living packages · [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |

**Scratch only.** Not Living DOC-001. Does not approve ARCH-006 domain packages, Phase 3 nesting, or Phase 4 ERP creates.

```text
APPROVAL TARGET (after this amendment is accepted by human):
  APPROVED FOR PHASE 1–2 IMPLEMENTATION
  PHASE 3 NOT AUTHORIZED
  PHASE 4 NOT AUTHORIZED
```

---

## Overview

v2 locked the right architecture: one package per capability, category folders organizational only, `@afenda/<name>` imports, peer ERP forbid-by-default, schema in `@afenda/db` / mutation in owner, enablement ≠ workspace DAG, manifests primary for package-owned fields, no empty speculative packages, Phase 3 separated, Phase 4 ARCH-006-gated.

v2.1 makes those rules **executable** for juniors and CI: no overclaim of runtime control-plane readiness, no band-wide import rights, same-TX as exceptional ADR, composition-root wording, per-register authority matrix, exact command/event IDs, separated lifecycles, enablement invariants, and a layered write-enforcement stack.

```text
ERP expansion governance baseline = Phase 1 + Phase 2.

A production-ready runtime module control plane additionally requires
the approved implementation of @afenda/module-catalog, organization
module-state persistence, dependency closure, authorization and
enablement enforcement.
```

**Junior law:** Find the package owner, use its public API, never import a peer ERP package without an approved edge, never write another module’s tables, and let CI prove the boundary.

---

## Problem

Rank-1 mixes foundation, runtime, data-plane, control plane, ERP, and AI. Folders alone do not stop drift. **Import law + ownership + validators with negative fixtures** do.

---

## Goals

1. Classify every existing package with exactly one band (classification only — never dependency rights).
2. Keep one capability owner per package; never introduce category barrels.
3. Enforce package-specific DAG edges and write boundaries in CI before more ERP packages exist.
4. Separate module enablement, workspace DAG, package lifecycle, and roadmap planning.
5. Complete Phase 1–2 as the **governance baseline**; Phase 3/4 remain unauthorized until separately approved.

## Non-goals

- Consolidating domains into mega-packages (`@afenda/commercial`, `@afenda/finance`).
- Empty speculative packages or empty `commands/` / `queries/` trees.
- Restoring Living `docs/` or Collapse-era trees.
- Shipping Purchasing / Inventory / Finance packages without ARCH-006 / Approved slice.
- Claiming runtime module enablement is ready from docs + CI alone.
- Treating Scratch prose as Living architecture SSOT.
- Authorizing Phase 3 folder moves or Phase 4 package creates in this document.

---

## Constraints

| Constraint | Source |
|------------|--------|
| Imports flow down Rank 3 → 2 → 1; packages never import `apps/*` | ARCH-024 / LAYERS |
| No `@afenda/shared`; no category implementation packages | ARCH-024 |
| Schema DDL in `@afenda/db`; mutation SSOT in owning domain package | Living monorepo + master-data / sales |
| Enterprise production quality — no shim or stub product paths | always-apply rules |
| Scratch proposes; shipping ERP packages needs Approved cut | Elite router · ARCH-006 |
| `apps/web/modules/*` ≠ `@afenda/module-catalog` | AGENTS.md |
| Flat `packages/<name>` remains valid indefinitely | This amendment §1 |

---

## Proposed design

### 1. Eligible physical layout if Phase 3 is approved

**Canonical architecture is package classification and ownership — not folder location.**

`packages/erp/sales` may remain at the package root indefinitely while Sales is classified `band: R1-F`, `category: commercial`.

If (and only if) Phase 3 is later authorized, nesting is **one category level**, published names unchanged:

```text
packages/
├─ foundation/     config · env · errors
├─ runtime/        logger · http · security · metrics · openapi · rate-limit · cache
├─ data-plane/     db · audit · events · search · notifications · (jobs when promoted)
├─ control-plane/  auth · admin · (authorization when extracted) · module-catalog
├─ transaction-core/   # packages only when promote rule fires
├─ erp/            master-data · sales · <Approved candidates only>
├─ intelligence/   ai-the-machine
└─ surfaces/       ui-system · emails
```

Category folders may hold `README.md` and child packages only — never `package.json`, barrels, or domain stores.

### 2. Rank vs band (classification only)

Keep official ranks (1 Platform · 2 Surfaces · 3 Application). Add **band** for catalog and navigation only:

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

A package may import only dependencies declared in its package.json
and approved in the monorepo DAG. Every edge is package-specific.

R1-F → R1-A or R1-C is not automatically permitted merely because
the destination belongs to an allowed band.
```

### 3. ERP dependency law

**Default:** peer ERP packages do **not** import each other.

| Package | Approved direct dependencies (living / illustrative) |
|---------|------------------------------------------------------|
| `@afenda/sales` | `@afenda/errors`, `@afenda/db`, `@afenda/audit`, `@afenda/events`, `@afenda/master-data` |
| `@afenda/master-data` | `@afenda/errors`, `@afenda/db`, `@afenda/audit`, `@afenda/events`, `@afenda/search` (per living DAG) |
| Future `@afenda/inventory` | Determined only by its Approved ARCH-006 cut + DAG update |

Must not: peer ERP `package.json` edges without Approved DEPENDENCY-REGISTER row; dual-write another package’s tables; ERP import of `@afenda/admin`.

**Optional integration styles** (`optionalIntegratesWith`):

| Style | Meaning | Where adapters live |
|-------|---------|---------------------|
| `events` | Async reaction to versioned outbox events | Approved **application composition root** |
| `ports` | Sync call surface (not same-TX by default) | Composition root injects adapters; no peer package import until Approved edge |
| `app-saga` | Multi-command workflow across aggregates | Composition root only |

```text
Cross-package adapters and sagas live in an approved application
composition root. Today that is apps/web. A future worker, CLI, or
scheduled host may become an additional composition root without
changing domain ownership.
```

**Inventory (when it exists):** sole mutation owner for its stock/ledger tables. Peers never write inventory rows.

**Runtime module dependency** (enablement in `@afenda/module-catalog`) must not imply a workspace import.

### 4. Cross-domain transactions

```text
Cross-domain operations are not same-transaction by default.

Each package commits its own aggregate, audit fact and outbox event
atomically. Other domains react through versioned events or an
application saga.
```

**Exceptional same-TX** only when an approved architecture decision defines:

1. the atomic business invariant;
2. the transaction coordinator owner;
3. the shared transaction-context contract;
4. participating package ports;
5. rollback behavior;
6. retry and idempotency behavior;
7. the Approved DAG edge.

Dependency injection alone does **not** create atomicity.

### 5. Schema vs mutation ownership

```text
DDL / Drizzle table definitions  →  @afenda/db
Mutating writes / list SSOTs     →  owning package (manifest owns.tables)
Reads of foreign tables          →  owning package public API or Approved query port
```

### 6. Control plane naming

| Concern | Owner |
|---------|--------|
| Authentication / session | `@afenda/auth` |
| Permission evaluation | Controlled path `@afenda/admin/authorization` for composition roots only; extract to `@afenda/authorization` per Q1 |
| Org-console / RBAC audit | `@afenda/admin` |
| Module registration + org enablement | `@afenda/module-catalog` |

**Glossary:** `apps/web/modules/*` = application domain folders. `@afenda/module-catalog` = Rank-1 enablement package. Do not merge.

ERP packages must **not** import `@afenda/admin`.

### 7. Jobs vs events

| Package | Owns | Does not |
|---------|------|----------|
| `@afenda/events` | `platform_domain_event` outbox SSOT | Business commands; NATS/Redis bus |
| `@afenda/jobs` (when promoted) | Durable retry / schedule / worker observability; invokes package commands via injected handlers | Importing every ERP package; recreating command logic |

Stay composition-root injected until a dedicated jobs capability is actually required. Promote `@afenda/jobs` when any of these is real: durable retries outside HTTP, scheduled business execution, long-running processing, independent worker scaling, dead-letter handling, job checkpointing, worker metrics, execution that must survive application restarts. Do not create `@afenda/jobs` merely because events exist.

### 8. Transaction core promote rule

Create a shared R1-E package only when **two independent modules** need the capability, or one module needs an enterprise guarantee that cannot stay package-local. Until then: implement inside the first owner; record future authority in the roadmap register. Do not scaffold empty R1-E packages.

### 9. Three separate state vocabularies

**Package manifest** (on-disk ERP package only):

```ts
type PackageLifecycle =
  | "scaffolded"
  | "active"
  | "deprecated"
  | "retired";
```

**Roadmap / module register** (no package required):

```ts
type ModulePlanningState =
  | "candidate"
  | "approved"
  | "implemented"
  | "on_hold"
  | "rejected";
```

**Organization runtime** (`@afenda/module-catalog`):

```ts
type OrganizationModuleState =
  | "disabled"
  | "enabled"
  | "read_only";

type ModuleActivationMode =
  | "core"
  | "organization_toggle";
```

Examples: `master-data` → `core`; `sales` / `inventory` → `organization_toggle`.

A planned/candidate module has **no** package and therefore **no** package manifest.

### 10. Module enablement invariants

`@afenda/module-catalog` must answer enablement deterministically.

```text
A module cannot be enabled unless required dependencies are enabled.

A required dependency cannot be disabled while active dependents exist.

read_only permits authorized historical reads but rejects business
mutations.

disabled hides normal navigation and rejects normal commands, but
does not delete historical records.

Module enablement never changes package ownership or table ownership.
```

Open product answers (document when implementing catalog): event-consumer behavior under `read_only`; whether disabled modules expose historical document access; whether required dependencies auto-enable.

### 11. Module manifest contract

Every **scaffolded/active** ERP package exports `src/module.manifest.ts` (or equivalent). Exact command/event IDs should be imported from package constants (no silent hand lists).

```ts
export interface AfendaModuleManifest {
  readonly id: string;
  readonly category: string;
  readonly packageName: `@afenda/${string}`;
  readonly band: "R1-F";
  readonly lifecycle: PackageLifecycle;

  readonly owns: {
    readonly tables: readonly string[];
    readonly aggregates: readonly string[];
    readonly commandNamespace: string;
    readonly commands: readonly string[];
  };

  readonly events: {
    readonly namespace: string;
    readonly emits: readonly string[];
    readonly consumes: readonly string[];
  };

  readonly moduleDependencies: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
  };

  readonly optionalIntegratesWith: readonly {
    readonly moduleId: string;
    readonly style: "events" | "ports" | "app-saga";
  }[];

  readonly application: {
    readonly permissionPrefix: string;
  };

  readonly activationMode: ModuleActivationMode;
}
```

Illustrative Sales:

```ts
export const salesModuleManifest = {
  id: "sales",
  category: "commercial",
  packageName: "@afenda/sales",
  band: "R1-F",
  lifecycle: "active",
  activationMode: "organization_toggle",
  owns: {
    tables: ["sales_order", "sales_order_line"],
    aggregates: ["sales_order"],
    commandNamespace: "sales.order",
    commands: [
      "sales.order.create",
      "sales.order.line.add",
      "sales.order.post",
    ],
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
  moduleDependencies: {
    required: ["master-data"],
    optional: [],
  },
  optionalIntegratesWith: [
    { moduleId: "inventory", style: "events" },
    { moduleId: "fulfillment", style: "events" },
    { moduleId: "receivables", style: "events" },
  ],
  application: { permissionPrefix: "sales" },
} as const satisfies AfendaModuleManifest;
```

Workspace DAG stays in `package.json` + monorepo docs — not a free-form string list in the manifest.

### 12. Register authority matrix

```text
docs-V2/modules/
├─ MODULE-REGISTER.yaml
├─ TABLE-OWNERSHIP.yaml
├─ COMMAND-REGISTER.yaml
├─ EVENT-REGISTER.yaml
├─ PERMISSION-REGISTER.yaml
├─ ROUTE-REGISTER.yaml
└─ DEPENDENCY-REGISTER.yaml
```

| Information | Primary SSOT | Validation relationship |
|-------------|--------------|-------------------------|
| Existing module identity | ERP package manifest | Generated into MODULE-REGISTER |
| Planned module identity | Approved roadmap / MODULE-REGISTER planning rows | No package manifest yet |
| Aggregate mutation owner | ERP package manifest | Cross-checked against TABLE-OWNERSHIP |
| Table DDL existence | `@afenda/db` schema | Must match manifest ownership |
| Workspace dependency | `package.json` | Cross-checked against approved DAG |
| Runtime module dependency | Manifest + `@afenda/module-catalog` | Must not imply workspace import |
| Exact event contract | `@afenda/events` | Manifest declares emitted/consumed IDs |
| Permission code | Authorization catalog (`@afenda/admin/authorization` → later `@afenda/authorization`) | Manifest owns/references namespace |
| Route | Application route register | Must reference an existing module ID |
| Navigation | Application registry | Must respect module enablement |
| Organization enablement | `@afenda/module-catalog` | Runtime state, not package metadata |

**“Manifests primary”** applies only to package-owned rows. Other authorities are not overwritten by ERP manifests.

Entry command:

```bash
pnpm validate:modules
```

### 13. Cross-table write enforcement stack

`validate:no-cross-domain-writes` is not a text grep alone.

| Layer | Mechanism |
|-------|-----------|
| 1 | Controlled DB schema exports — e.g. `@afenda/db/schema/sales`, `@afenda/db/schema/master-data` — only the declared owner may import its write surface |
| 2 | Import-boundary CI — reject `@afenda/sales` → `@afenda/db/schema/inventory` and peer ERP schema imports |
| 3 | AST mutation scan — map Drizzle `insert` / `update` / `delete` table refs to TABLE-OWNERSHIP |
| 4 | Runtime/integration tests — hostile cross-domain and cross-tenant attempts fail |
| 5 | Database constraints — org-scoped FKs / uniques where practical |

**Phase 2 minimum:** Layers 1 and 2 must land with the validators. Layers 3–5 may follow in the same or immediately subsequent missions but must not be claimed done without evidence.

### 14. Catalog / README

[packages/README.md](../../packages/README.md) lists **only packages on disk**, grouped by band. Candidate modules live in MODULE-REGISTER planning rows / Scratch roadmaps — never as fake catalog rows.

### 15. Package creation standard

Create a workspace package only with: owned aggregate · public command or query · store contract · manifest (ERP) · real test · README ownership. Folder shape appears when files exist.

### 16. Candidate ERP spine (unauthorized create list)

Product chains (target, not create-now):

```text
Sales → Inventory → Fulfillment → Receivables → Payments → Accounting
Purchasing → Receiving → Inventory → Payables → Payments → Accounting
```

P0 candidates for a **future** Approved cut: `purchasing` · `inventory` · `receiving` · `fulfillment` · `receivables` · `payables` · `payments` · `accounting`.

---

## Phase 1 acceptance criteria

Phase 1 is complete only when:

- [ ] every existing package is assigned exactly one band;
- [ ] bands are documented as classification, not dependency rights;
- [ ] the ERP dependency law is added to monorepo authority (Scratch monorepo + LAYERS companion notes);
- [ ] current `master-data` and `sales` ownership is documented;
- [ ] the register authority matrix is present in this Scratch / monorepo notes;
- [ ] package names and physical locations remain unchanged;
- [ ] candidate modules are separated from existing modules;
- [ ] no Scratch wording claims runtime control-plane readiness.

**Rollback:** revert doc commits.

## Phase 2 acceptance criteria

Phase 2 is complete only when:

- [ ] `master-data` and `sales` export valid module manifests;
- [ ] generated package-owned registers match committed output;
- [ ] route / event / permission authorities are separately validated;
- [ ] duplicate module IDs fail CI;
- [ ] duplicate table owners fail CI;
- [ ] duplicate command namespaces / exact command IDs fail CI;
- [ ] duplicate exact event IDs fail CI;
- [ ] peer ERP imports fail without an approved edge;
- [ ] deep imports `@afenda/*/src/*` fail;
- [ ] unauthorized DB schema imports fail (Layers 1–2);
- [ ] package DAG cycles fail;
- [ ] candidate modules do not require workspace packages;
- [ ] **negative validator fixtures** prove each rule fails on intentional violations.

**Rollback:** remove CI job + validator scripts in a follow-up commit if the contract is withdrawn. Do not mark failing validators green.

## Phase 3 — NOT AUTHORIZED

Evidence gate (open a nesting mission only when **at least two** are true):

1. ≥24 active package directories at the package root;
2. ≥3 documented onboarding, agent-routing, CODEOWNERS, or path-selection mistakes within 60 days;
3. Maintainers repeatedly need a manual category map to locate ownership;
4. Root-level navigation materially slows audit/review;
5. A navigation study shows nesting reduces path errors.

## Phase 4 — NOT AUTHORIZED

Each future package still requires: Approved ARCH-006 cut · manifest · store · command · test · README · DAG + register update · no peer imports without Approved edge.

---

## Proposed decisions pending approval

These are Scratch proposals until a human marks this document approved for Phase 1–2.

1. One package per business capability; category folders organizational only; `@afenda/<name>` imports.
2. Peer ERP imports forbidden by default; integrations declare `events` | `ports` | `app-saga`; composition-root adapters.
3. Bands classify only; every import edge is package-specific and DAG-approved.
4. Schema in `@afenda/db`; mutation in owner; write enforcement Layers 1–2 minimum in Phase 2.
5. Cross-domain same-TX is exceptional and ADR-governed.
6. Manifests primary for package-owned fields; authority matrix for all other registers.
7. Exact command/event ID lists (plus namespaces); no `planned` on package manifests.
8. Separate package lifecycle, module planning state, and organization enablement state.
9. Enablement invariants for `@afenda/module-catalog` (implementation not required for Phase 1–2 baseline).
10. Package name `@afenda/module-catalog`; temporary `@afenda/admin/authorization` for composition roots.
11. Phase 1–2 = ERP expansion governance baseline only; Phase 3/4 not authorized here.
12. P0 spine = candidates, not a create list.

---

## Open questions — recommended answers (pending human confirm)

### Q1 — Authorization extraction

Keep `@afenda/admin/authorization` for composition roots only.

```text
ERP packages must not import @afenda/admin.

Permission evaluation is extracted to @afenda/authorization when the
first non-admin Rank-1 package needs to consume it directly, or when
a second application composition root needs the same evaluation
contract.
```

Trigger = architectural boundary crossing, not an arbitrary consumer count alone.

### Q2 — Phase 3 nesting

Use the multi-condition evidence gate above — not a single package-count number.

### Q3 — Jobs package

Stay composition-root injected until a dedicated jobs capability is actually required (promote criteria in §7).

---

## v2 → v2.1 delta

| Topic | v2 | v2.1 |
|-------|----|------|
| Phase 1–2 outcome | “Production-ready control plane” | ERP expansion governance baseline |
| Physical layout | “Canonical” | Eligible if Phase 3 approved; flat path valid |
| Band imports | Broad R1-F → R1-A/C | Bands never grant rights; package-specific edges |
| Same-TX | Underspecified ports | Exceptional ADR-governed |
| Orchestration | `apps/web` hardcoded | Application composition root |
| Registers | Manifests primary (over-broad) | Per-field authority matrix |
| Commands/events | Prefixes only | Namespace + exact IDs |
| Lifecycles | One enum incl. planned | Three vocabularies |
| Enablement | IDs only | Activation mode + invariants |
| Write validation | Named, not how | Layers 1–5; 1–2 mandatory for Phase 2 |
| Decisions heading | “Accepted” | Proposed pending approval |
| Phase 3/4 | Separated | Explicitly NOT AUTHORIZED |

---

## Related docs

- [packages_refactor_v2.md](./packages_refactor_v2.md) — prior draft (keep for history)
- [packages_refactor.md](./packages_refactor.md) — v1 assessment
- [packages/README.md](../../packages/README.md)
- [docs-V2/monorepo/README.md](../monorepo/README.md)
- [docs-V2/master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md)
- [afenda-elite-monorepo-discipline](../../.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md)
