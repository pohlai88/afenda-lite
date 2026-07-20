# Afenda Packages Governance — Consolidated Program Spec

| Field | Value |
|-------|-------|
| Mode | Architecture + program specification |
| Status | **Scratch accepted reference** — single consolidate of packages classification + Phase 3/4 authorization |
| Audience | Engineers and agents maintaining `@afenda/*` |
| Decision enabled | Apply Living Scratch authority for laws; execute remaining Phase 4 slices under this authorization |
| Operative authority | [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml) · [MODULE-ROADMAP.yaml](../modules/MODULE-ROADMAP.yaml) · [packages/README.md](../../packages/README.md) |
| Supersedes | [packages_refactor_v2.3.md](./packages_refactor_v2.3.md) · [phase3_phase4.md](./phase3_phase4.md) · [v2.2](./packages_refactor_v2.2.md) · earlier refactor drafts |
| Date | 2026-07-20 |
| Promoted (Phase 1–2) | `monorepo-governance/2026-07-20` · `layers-governance/2026-07-20` · `packages-catalog/2026-07-20` · `workspace-edges/2026-07-20` |

**Scratch accepted reference only.** Scratch never becomes interim implementation authority for laws already promoted. Implement laws against the operative surfaces above. Phase 4 remaining slices use this document as the human authorization record plus MODULE-ROADMAP cuts.

```text
PROGRAM STATUS (disk + Living Scratch — 2026-07-20)

DONE:
  Phase 1 — band classification + Living Scratch promotion
  Phase 2 — manifests, generated registers, validators, negative fixtures
  Phase 3 — one-level category nesting (22 packages; published names unchanged)
  Phase 4.1–4.7 — purchasing · inventory · receiving · fulfillment · receivables · payables · payments

AUTHORIZED / NEXT:
  Phase 4.8 Accounting
  (package-by-package; each slice closes before the next)

STILL NOT AUTHORIZED:
  @afenda/module-catalog runtime
  @afenda/authorization extraction
  @afenda/jobs creation
  new transaction-core packages
  category barrels / mega-packages
  shadow master tables / cross-domain direct writes
```

---

## Overview

Architecture is classification, ownership, dual-control edges, and machine-verifiable operation→permission maps. Folder nesting is optional organization only — published names stay `@afenda/<name>`.

```text
ERP expansion governance baseline = Phase 1 + Phase 2 (done).
Physical category nesting = Phase 3 (done; evidence gate waived in writing 2026-07-20).
P0 transactional spine = Phase 4 (in progress; serial slices).

Runtime module control-plane readiness additionally requires
@afenda/module-catalog, org module-state, dependency closure,
and enablement enforcement — not docs or CI alone.
```

### Operating law

1. Find the package owner; call its public API.
2. Do not import a peer ERP package without an edge that exists in **both** `package.json` and WORKSPACE-EDGE-REGISTER.
3. Do not write another module’s mutation tables.
4. Every public ERP mutation command and organization-scoped query enforces a declared permission via an injected authorization port (or an explicit systemOnly / approved public policy).
5. Let CI prove the boundary (including negative fixtures).

---

## Problem

Rank-1 mixes foundation, runtime, data-plane, control plane, ERP, and AI. Folder labels alone do not stop drift. Import law, ownership, and validators with negative fixtures do.

---

## Goals

1. Every existing package has exactly one band (classification only).
2. One capability owner per package; ban category barrels and mega-helpers.
3. Dual-control workspace edges (`package.json` realizes; register authorizes; CI reconciles).
4. Separate workspace edges from runtime module enablement; generate runtime dependency views from manifests.
5. Nest packages under one category level without changing published names or consumer imports (Phase 3 — done).
6. Deliver the P0 ERP transactional spine as independently owned packages (Phase 4 — serial).

## Non-goals

- Mega-packages or shared-domain kits (`@afenda/shared`, `@afenda/common`, …).
- Empty speculative packages or empty source trees.
- Restoring Living `docs/` or Collapse trees without named recovery.
- Claiming runtime enablement readiness from docs or CI alone.
- Treating Scratch as temporary implementation authority for promoted laws.
- Eight-package empty scaffold batch for Phase 4.
- Compatibility symlinks, path shims, duplicate folders, or forwarding packages after nesting.

---

## Constraints

| Constraint | Source |
|------------|--------|
| Imports Rank 3 → 2 → 1; packages never import `apps/*` | docs-V2/monorepo · LAYERS.md |
| No `@afenda/shared`; no category implementation packages | docs-V2/monorepo · LAYERS.md |
| Schema DDL in `@afenda/db`; mutation authority in owning package | docs-V2/monorepo · master-data / ERP packages |
| Enterprise production quality — no shim or stub product paths | Always-apply rules |
| Scratch acceptance ≠ implementation start for unpromoted laws | Approval handoff |
| `apps/web/modules/*` ≠ `@afenda/module-catalog` | AGENTS.md |
| Flat `packages/<name>` remains valid indefinitely as a layout option | Physical layout |
| Living ARCH/ADR bodies absent until Docs-lane reopen | no-living-arch-ghost-ssot |

---

## Approval handoff (Scratch → Living Scratch)

```text
Human acceptance authorizes a narrowly scoped amendment of
docs-V2/monorepo and LAYERS.md (and related registers).

Scratch documents never become interim implementation authority
for laws that must live on those surfaces.

If the named Living Scratch surfaces cannot be updated, new
governance coding does not begin.
```

**Only valid sequence (historical for Phase 1; still binding for new laws)**

```text
Scratch accepted
→ Living Scratch authority amended (docs-V2/monorepo + LAYERS.md + registers)
→ version / authority recorded
→ implementation begins
  (dormant ARCH/ADR IDs = labels only until Docs-lane reopen —
   never ghost Living docs/ SSOT)
```

**Forbidden sequence**

```text
Scratch accepted
→ Scratch treated as temporary authority
→ implementation begins
```

---

## Architecture

### Physical layout

Canonical architecture is **classification and ownership**. One category level organizes the tree; published names stay `@afenda/<name>`. Category folders hold `README.md` + child packages only — never barrels or domain stores.

```text
packages/
├─ foundation/          → config · env · errors
├─ runtime/             → logger · http · security · metrics · openapi · rate-limit · cache
├─ data-plane/          → db · audit · events · search · notifications
├─ control-plane/       → auth · admin
├─ erp/                 → master-data · sales · purchasing · inventory · receiving
│                         · fulfillment · receivables · (+ Phase 4 remaining)
├─ intelligence/        → ai-the-machine
└─ surfaces/            → ui-system · emails
```

```text
packages/erp/sales → @afenda/sales
packages/data-plane/events → @afenda/events
```

Consumers import package names only. No consumer may import physical paths.

**Forbidden category packages:** `@afenda/foundation` · `@afenda/runtime` · `@afenda/data-plane` · `@afenda/control-plane` · `@afenda/erp` · `@afenda/surfaces`.

### Rank and band

| Band | Kind | Examples |
|------|------|----------|
| R1-A | Foundation | config, env, errors |
| R1-B | Runtime | logger, http, security, metrics, openapi, rate-limit, cache |
| R1-C | Data plane | db, audit, events, search, notifications, jobs |
| R1-D | Control plane | auth, authorization, admin, module-catalog |
| R1-E | Transaction core | numbering, idempotency, document-links, approvals, workflow, attachments |
| R1-F | ERP | master-data, sales, purchasing, … |
| R1-X | Optional capability | ai-the-machine |
| R2 | Surfaces | ui-system, emails |

```text
Bands classify packages; bands never grant dependency rights.
```

### Workspace edges — dual control

| Surface | Responsibility |
|---------|----------------|
| `package.json` | Executable dependency truth (realizes the edge) |
| `WORKSPACE-EDGE-REGISTER.yaml` | Architecture authorization + rationale (authorizes the edge) |
| Validator | Requires exact agreement between both |

```text
Register authorizes; package.json realizes; CI reconciles.

A workspace dependency is valid only when it exists in both surfaces
(or the register row is explicitly planned).
```

**Default:** peer ERP packages do not import each other. Also forbidden: dual-write another package’s mutation tables; ERP import of `@afenda/admin`.

### Runtime module dependencies

Workspace edges and runtime enablement are different graphs.

```text
docs-V2/modules/
├─ WORKSPACE-EDGE-REGISTER.yaml       # authorize compile edges
├─ MODULE-DEPENDENCY.generated.yaml   # from on-disk manifests; CI-diff
└─ MODULE-ROADMAP.yaml                # candidates + planning deps (no package)
```

**Manifest contract**

```ts
readonly moduleDependencies: {
  readonly required: readonly string[];
};

readonly optionalIntegratesWith: readonly {
  readonly moduleId: string;
  readonly style: "events" | "ports" | "app-saga";
}[];
```

| Style | Meaning | Adapter location |
|-------|---------|------------------|
| `events` | Async outbox reaction | Application composition root |
| `ports` | Sync call (not same-TX by default) | Composition root injects |
| `app-saga` | Multi-command workflow | Composition root only |

Cross-package adapters and sagas live in an approved application composition root (`apps/web` today). **moduleId** must resolve to an on-disk module manifest or a MODULE-ROADMAP row.

### Cross-domain transactions

```text
Cross-domain work is not same-transaction by default.
Each package commits its aggregate, audit fact, and outbox event
atomically. Peers react via versioned events or an application saga.
```

Same-TX across domains requires an approved architecture decision covering invariant, coordinator, TX context, ports, rollback, retry/idempotency, and Approved workspace edge. Injection alone ≠ atomicity.

### Persistence and queries

| Responsibility | Owner |
|----------------|--------|
| Drizzle DDL and migrations | `@afenda/db` |
| Business mutation authority | Owning ERP package |
| Canonical domain queries | Owning ERP package |
| Cross-domain reads | Owner public query API or Approved query port |
| Combined projections | Approved application / read-model owner |
| Direct app write to domain tables | Forbidden |

### Events and permissions — SSOT split

| Concern | Primary SSOT |
|---------|--------------|
| Command / query IDs | Owning ERP package constants |
| Decision to emit an event | Owning ERP package |
| Event name / version / payload schema | `@afenda/events` |
| Outbox persistence | `@afenda/events` |
| Handler wiring | Application composition root |
| ERP permission codes and operation requirements | Owning ERP package |
| Aggregated permission register | Generated from ERP manifests |
| Grants, roles, policy decisions | Authorization subsystem |
| Permission evaluation adapter | `@afenda/admin/authorization` → later `@afenda/authorization` |

Manifests **import** event IDs from `@afenda/events`. ERP packages own codes; `@afenda/admin/authorization` evaluates only — it must not define Sales-specific (or peer ERP) permission constants.

### Command and query authorization

```text
Composition roots supply authorization adapters.

Every public ERP mutation command and every organization-scoped query
must enforce its declared permission through an injected authorization port.

A composition-root route check alone is not sufficient.
```

Every public operation resolves to exactly one of: a declared permission code; an explicit `systemOnly` policy; or an explicitly approved public/anonymous policy.

ERP packages own a local authorization port and call it inside public mutations and org-scoped queries. They never import `@afenda/admin`.

```ts
export interface SalesAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: SalesPermission;
  }): Promise<boolean>;
}
```

### Control plane names

| Concern | Owner |
|---------|--------|
| Session / credentials | `@afenda/auth` |
| Evaluation adapter | `@afenda/admin/authorization` (composition roots) |
| Org console / RBAC audit | `@afenda/admin` |
| Module registration / org enablement | `@afenda/module-catalog` (runtime not authorized) |

### Jobs, transaction-core, no-generic-helpers

Stay composition-root injected for jobs until durable work leaves HTTP. **Jobs and new transaction-core packages not authorized here.**

Promote a shared R1-E package only when two modules need it, or one needs an enterprise guarantee that cannot stay package-local. Record intent in MODULE-ROADMAP. No empty scaffolds.

```text
Do not promote a business helper to a shared package because two
functions look similar. Similarity is not authority.
```

Banned: `@afenda/common`, `@afenda/shared`, `@afenda/erp-utils`, `@afenda/domain-kit`.

### State vocabularies

```ts
type PackageLifecycle = "scaffolded" | "active" | "deprecated" | "retired";

type ModulePlanningState =
  | "candidate"
  | "approved"
  | "implemented"
  | "on_hold"
  | "rejected";

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

Every scaffolded/active ERP package exports `src/module.manifest.ts`. Prefer inferred literal maps so every declared operation is mapped.

```ts
type AuthorizationMap<
  TOperation extends string,
  TPermission extends string,
> = Readonly<Record<TOperation, TPermission>>;

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
    readonly queryNamespace: string;
    readonly queries: readonly string[];
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

  readonly authorization: {
    readonly commands: Readonly<Record<string, string>>;
    readonly queries: Readonly<Record<string, string>>;
  };

  readonly moduleDependencies: {
    readonly required: readonly string[];
  };

  readonly optionalIntegratesWith: readonly {
    readonly moduleId: string;
    readonly style: "events" | "ports" | "app-saga";
  }[];
}
```

Routes and navigation remain application-owned.

### Registers and authority matrix

```text
docs-V2/modules/
├─ MODULE-CATALOG.generated.yaml
├─ MODULE-ROADMAP.yaml
├─ MODULE-DEPENDENCY.generated.yaml
├─ TABLE-OWNERSHIP.yaml
├─ COMMAND-REGISTER.yaml
├─ EVENT-REGISTER.yaml
├─ PERMISSION-REGISTER.yaml        # generated from ERP manifests
├─ ROUTE-REGISTER.yaml             # application-owned
└─ WORKSPACE-EDGE-REGISTER.yaml
```

| Information | Primary SSOT | Validation |
|-------------|--------------|------------|
| Existing module identity | ERP package manifest | → MODULE-CATALOG.generated.yaml |
| Planned module identity | MODULE-ROADMAP.yaml | No package manifest |
| Aggregate / command / query IDs | Owning ERP package | Manifest + COMMAND/QUERY registers |
| Mutation-table authority | Manifest `persistence.mutationTables` | ↔ `@afenda/db` DDL |
| Workspace edge | Dual: `package.json` + WORKSPACE-EDGE-REGISTER | Exact agreement (or register `planned`) |
| Runtime module dependency | Manifest → MODULE-DEPENDENCY.generated.yaml | Must not invent workspace edge |
| Event contracts | `@afenda/events` | Manifest emits/consumes import those IDs |
| ERP permission codes | Owning ERP package | Aggregated PERMISSION-REGISTER generated |
| Operation→permission map | Manifest `authorization` | Every public op mapped or systemOnly/public |
| Grants / evaluation | Authorization subsystem | Adapter only |
| Route / navigation | Application registers | Module id + enablement (when catalog exists) |
| Org enablement | `@afenda/module-catalog` | Runtime — not authorized here |

Command: `pnpm validate:modules` (fan-out).

### Write-enforcement stack

| Layer | Mechanism |
|-------|-----------|
| 1 | Owner-only schema exports |
| 2 | Import-boundary CI |
| 3 | AST scan of Drizzle mutations ↔ TABLE-OWNERSHIP |
| 4 | Hostile cross-domain / cross-tenant tests |
| 5 | Org-scoped FKs / uniques where practical |

**Phase 2 minimum (done):** Layers 1–2 + negative fixtures.

### Package creation bar

Create package only with: owned aggregate · public command or query · store · manifest · test · README. Candidates live in MODULE-ROADMAP until authorized.

---

## Forward note — actor principals (non-blocking)

Current `actorUserId: string` is valid for web-user flows. Before Jobs, CLI mutations, or system event handlers perform ERP mutations, define an actor principal:

```ts
type ActorPrincipal =
  | { kind: "user"; userId: string }
  | { kind: "service"; serviceId: string }
  | { kind: "system"; systemId: string; reason: string };
```

Does **not** block Phase 1–4 package delivery. Record before worker-driven ERP mutations begin.

---

## Phase program

### Phase 1 — Living Scratch promotion (done)

- Named Living Scratch surfaces amended with version/authority
- Every existing package has exactly one band (classification only)
- Dual-control workspace-edge law documented
- master-data / sales ownership + `mutationTables` documented
- Candidates only in MODULE-ROADMAP
- No runtime control-plane readiness claim

**Rollback:** revert Living-surface / doc commits.

### Phase 2 — Manifests and validators (done)

- On-disk ERP packages export valid manifests (queries + authorization maps)
- Generated catalogs match committed output
- WORKSPACE-EDGE-REGISTER ↔ `package.json` exact agreement (or `planned`)
- Duplicate ids / mutation-table owners / codes fail CI
- Peer ERP imports fail without dual-control edge
- Auth-port coverage + negative fixtures

**Rollback:** remove CI job and validators in a follow-up commit. Do not mark failing validators green.

### Phase 3 — One-level nesting (done)

**Human override 2026-07-20:** evidence gate waived in writing; nesting authorized and completed.

| Rule | Detail |
|------|--------|
| Move | All existing packages moved exactly once into category folders |
| Names | Published `@afenda/<name>` unchanged |
| Exports | Public exports unchanged |
| Behavior | No runtime / schema / ownership change from nesting alone |
| Path surfaces | Workspace, Turbo, Biome, Vitest, CI, docs, skills, validators updated in the same mission |
| Forbidden | Compatibility shims, category barrels, leftover flat dirs |

Historical acceptance probe (pre-waiver): root packages 22; evidence gate was GATE_UNMET — superseded by written waiver.

### Phase 4 — P0 ERP transactional packages (in progress)

Authorized as one program; executed as eight independently closable slices. No eight-package empty scaffold mission.

| Slice | Package | Status |
|-------|---------|--------|
| 4.1 | `@afenda/purchasing` | **Done** |
| 4.2 | `@afenda/inventory` | **Done** |
| 4.3 | `@afenda/receiving` | **Done** |
| 4.4 | `@afenda/fulfillment` | **Done** |
| 4.5 | `@afenda/receivables` | **Done** |
| 4.6 | `@afenda/payables` | **Done** |
| 4.7 | `@afenda/payments` | **Done** |
| 4.8 | `@afenda/accounting` | **Next** |

```text
Delivery chains (progressive close):

Purchasing → Receiving → Inventory → Payables → Payments → Accounting
Sales → Inventory → Fulfillment → Receivables → Payments → Accounting
```

---

## Phase 4 package contracts

### Uniform package shape

```text
packages/erp/<module>/
├─ src/
│  ├─ commands/ · queries/ · domain/ · ports/ · stores/ · schemas/
│  ├─ permissions.ts · operation-ids.ts · module.manifest.ts · index.ts
├─ tests/  (commands · queries · stores · authorization · tenancy · conformance)
├─ README.md · package.json · tsconfig.json · vitest.config.ts
```

Folders appear only when real files exist.

### Mandatory package contract

Every package must provide: one owned aggregate · mutation-table authority · real command · real query · store interface · Drizzle production store · memory test store · module manifest · exact command/query IDs · exact permission codes · operation→permission mapping · versioned event contracts · same-TX audit/outbox · cross-tenant tests · negative boundary fixtures · README ownership contract.

Forbidden: empty barrel · placeholder package · route-only shell · TODO implementation · mock production adapter · temporary cross-domain owner.

### Universal Phase 4 acceptance gate

| Area | Must pass |
|------|-----------|
| Ownership | One aggregate owner; one mutation owner; no shadow Party/Item/Supplier/Customer/Warehouse/Account tables; no direct app table mutation; no peer ERP imports without dual-control edge |
| Tenancy | Non-null `organization_id`; org-scoped commands/queries; same-org master validation; hostile cross-tenant tests |
| Authorization | Exact permission constants; every public mutation and org-scoped query mapped; injected auth port inside ops; system-only explicit |
| Transactions | Entity + audit + outbox atomic; idempotency on material mutations; optimistic concurrency; no hard delete after posting; explicit reverse/cancel |
| Queries | Canonical owner queries; server pagination; allowlisted filters/sort; no N+1; defined read models; required indexes |
| Events | Contract in `@afenda/events`; versioned; emit only after valid transition; no emit on rollback; idempotent consumers |
| Tests | Domain · transitions · auth · tenancy · rollback · concurrency · idempotency · memory/Drizzle conformance · audit/outbox · negative fixtures |
| Operations | Structured logs · correlation ID · mutation/error metrics · migration + rollback/repair guidance · runbook |

---

### 4.1 `@afenda/purchasing` — Done

**Owns:** Purchase Order · Purchase Order Line. Lifecycle: `draft → posted → closed` (↘ cancelled).

**Surface:** `createDraftPurchaseOrder` · `addPurchaseOrderLine` · `postPurchaseOrder` · `cancelPurchaseOrder` · `getPurchaseOrderById` · `listPurchaseOrders`.

**Masters:** supplier → `md_party` (supplier role) · item → `md_item` · payment term / warehouse references via master-data.

**Events:** `purchasing.order.created.v1` · `line_added` · `posted` · `cancelled`. Optional: receiving · payables · inventory (events).

### 4.2 `@afenda/inventory` — Done

**Owns:** Stock Movement · Line · Ledger Entry · Reservation. Movement types: receipt · issue · transfer · adjustment · reservation · reservation_release.

**Surface:** `createStockMovement` · `addStockMovementLine` · `postStockMovement` · `reserveStock` · `releaseReservation` · get/list movement · `getStockAvailability`.

Sole mutator of stock/ledger tables. Peers must not update `on_hand` / `available` / `reserved` / ledger / movement directly.

### 4.3 `@afenda/receiving` — Done

**Owns:** Goods Receipt · Line · Receiving Discrepancy. Lifecycle: `draft → posted → closed` (↘ rejected/cancelled).

**Surface:** create/add/post/cancel receipt · `recordReceivingDiscrepancy` · get/list.

Does not write Inventory tables directly — port or composition-root event. Sources: PO · expected receipt · return · unplanned.

### 4.4 `@afenda/fulfillment` — Done

**Owns:** Delivery · Line · Pick · Pack · Proof of Delivery. Lifecycle: draft → picking → packed → posted → delivered → closed.

**Surface:** create/add delivery · `startPicking` · `confirmPick` · `confirmPack` · `postDelivery` · `recordProofOfDelivery` · cancel · get/list.

Does not write Inventory or Sales tables directly.

### 4.5 `@afenda/receivables` — Done

**Owns:** Sales Invoice · Line · Credit Note · Customer Allocation · Customer Balance Projection.

**Surface:** create/add/post/cancel invoice · `issueCreditNote` · `allocateCustomerReceipt` · get/list · `getCustomerBalance`.

Does not write Sales, Fulfillment, Payments, or Accounting tables directly.

### 4.6 `@afenda/payables` — Done

**Owns:** Supplier Invoice · Line · Supplier Credit Note · Supplier Allocation · Three-Way Match Result.

**Surface:**

```ts
createDraftSupplierInvoice;
addSupplierInvoiceLine;
matchSupplierInvoice;
postSupplierInvoice;
issueSupplierCreditNote;
allocateSupplierPayment;
cancelSupplierInvoice;
getSupplierInvoiceById;
listSupplierInvoices;
getSupplierBalance;
```

**Events:** `payables.invoice.created.v1` · `matched` · `posted` · credit_note/allocation posted.

### 4.7 `@afenda/payments` — Done

**Owns:** Payment · Payment Allocation · Payment Reversal. Directions: receipt · disbursement · refund · transfer. Refunds are payments with `payment.direction = refund`; there is no separate refund table.

**Surface:** `createDraftPayment` · `addPaymentAllocation` · `postPayment` · `reversePayment` · `postRefund` · get/list.

Does not directly mutate Receivables, Payables, or Accounting tables.

### 4.8 `@afenda/accounting` — Authorized

**Owns:** Journal · Journal Line · Ledger Posting · Accounting Period.

**Surface:** create/add/post/reverse journal · open/close period · get/list · `getTrialBalance`.

**Invariants:** total debit = total credit · posted journal immutable · reversal creates new journal · closed period rejects posting · organization scope mandatory · currency precision deterministic.

Consumes approved financial events through application-composed handlers. Does not import every transaction package.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Scratch used as interim authority | Handoff forbids it; laws live on monorepo / LAYERS / registers |
| package.json vs register drift | Dual-control + CI reconcile |
| Optional deps duplicated / disagree | Single `optionalIntegratesWith`; generated MODULE-DEPENDENCY |
| Unmapped commands/queries | `authorization` map + CI |
| Permission constants owned by admin | ERP package owns codes; admin evaluates only |
| Agents invent unauthorized extracts | Explicit STILL NOT AUTHORIZED list |
| Phase 4 empty batch | Serial slices; mandatory package contract |

---

## Open questions (defaults)

| ID | Topic | Default |
|----|-------|---------|
| Q1 | Authorization extract | Composition-root adapters on `@afenda/admin/authorization`; extract on boundary crossing. **Not authorized here.** |
| Q2 | Jobs | Composition-root injected until promote criteria. **Not authorized here.** |
| Q3 | ActorPrincipal | Record before worker/CLI ERP mutations; not required for Phase 4 package delivery. |
| Q4 | Phase 3 evidence gate | **Waived in writing 2026-07-20** — historical only. |

---

## Final authorization (still binding)

```text
AUTHORIZED:

PHASE 3 (complete on disk)
- One-level categories; @afenda/<name> unchanged; no shims or category barrels.

PHASE 4 (serial)
- 4.1–4.7 done on disk.
- Create and implement remaining:
  @afenda/accounting

EXECUTION LAW:
- Each Phase 4 slice closes before the next begins.
- No empty package batch.
- No peer-domain direct writes.
- No reduction of the enterprise quality bar.

NOT AUTHORIZED:
- module-catalog runtime · authorization extract · jobs · new transaction-core
```

---

## Related docs

- Operative: [docs-V2/monorepo/README.md](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [packages/README.md](../../packages/README.md)
- Registers: [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml) · [MODULE-ROADMAP.yaml](../modules/MODULE-ROADMAP.yaml)
- Historical: [packages_refactor_v2.3.md](./packages_refactor_v2.3.md) · [phase3_phase4.md](./phase3_phase4.md) · [v2.2](./packages_refactor_v2.2.md)
- Farm: [afenda-elite-monorepo-discipline](../../.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md)
- Master-data consumer contract: [arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md)
