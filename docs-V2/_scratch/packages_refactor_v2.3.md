# Packages classification — Technical Specification v2.3

| Field | Value |
|-------|-------|
| Mode | Technical specification |
| Status | **Accepted reference** — Living-authority promotion complete 2026-07-20 |
| Audience | Engineers and agents maintaining `@afenda/*` |
| Decision enabled | Historical record of promotion; **do not implement from this file** |
| Operative authority | [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [WORKSPACE-EDGE-REGISTER.yaml](../modules/WORKSPACE-EDGE-REGISTER.yaml) · [packages/README.md](../../packages/README.md) |
| Supersedes | [v2.2](./packages_refactor_v2.2.md) · [v2.1](./packages_refactor_v2.1.md) · prior drafts |
| Date | 2026-07-20 |
| Promoted | `monorepo-governance/2026-07-20` · `layers-governance/2026-07-20` · `packages-catalog/2026-07-20` · `workspace-edges/2026-07-20` |
| Evidence | Living packages · docs-V2/monorepo · LAYERS.md |

**Scratch accepted reference only.** Scratch documents never become interim implementation authority. Implement against the operative surfaces above.

```text
PROMOTION COMPLETE:
  docs-V2/monorepo + LAYERS.md amended
  WORKSPACE-EDGE-REGISTER.yaml + MODULE-ROADMAP.yaml seeded
  packages/README.md Phase 1 band classification applied

AUTHORIZED NEXT (historical at promotion):
  Phase 2 manifests, generated registers, validators, negative fixtures

SUPERSEDED 2026-07-20 by [phase3_phase4.md](./phase3_phase4.md):
  Phase 3 folder nesting — AUTHORIZED (evidence gate waived)
  Phase 4 ERP package creation — AUTHORIZED (package-by-package after Phase 3 audit)

STILL NOT AUTHORIZED:
  @afenda/module-catalog runtime
  @afenda/authorization extraction
  @afenda/jobs creation
  new transaction-core packages
```

---

## Overview

Architecture is correct, scalable, and enforceable. v2.3 removes remaining dual-authority ambiguities and makes operation→permission mapping machine-verifiable.

```text
ERP expansion governance baseline = Phase 1 + Phase 2
  (only after Living-authority promotion completes).

Runtime module control plane readiness additionally requires
@afenda/module-catalog, org module-state, dependency closure,
and enablement enforcement — not docs or CI alone.
```

**Operating law**

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

1. Assign every existing package exactly one band (classification only).
2. One capability owner per package; ban category barrels and mega-helpers.
3. Dual-control workspace edges (`package.json` realizes; register authorizes; CI reconciles).
4. Separate workspace edges from runtime module enablement; generate runtime dependency views from manifests.
5. Promote Scratch laws into named Living surfaces **before** Phase 1 coding.

## Non-goals

- Mega-packages or shared-domain kits (`@afenda/shared`, `@afenda/common`, …).
- Empty speculative packages or empty source trees.
- Restoring Living `docs/` or Collapse trees without named recovery.
- Shipping new ERP packages without Approved slice + `docs-V2/modules` MODULE-ROADMAP cut (dormant ARCH-006 ID is a label only — not on-disk SSOT).
- Claiming runtime enablement readiness from docs or CI alone.
- Treating Scratch as temporary implementation authority.
- Authorizing Phase 3/4, module-catalog runtime, authorization extract, jobs, or new transaction-core packages.

---

## Constraints

| Constraint | Source |
|------------|--------|
| Imports Rank 3 → 2 → 1; packages never import `apps/*` | docs-V2/monorepo · LAYERS.md |
| No `@afenda/shared`; no category implementation packages | docs-V2/monorepo · LAYERS.md |
| Schema DDL in `@afenda/db`; mutation authority in owning package | docs-V2/monorepo · master-data / sales |
| Enterprise production quality — no shim or stub product paths | Always-apply rules |
| Scratch acceptance ≠ implementation start | Approval handoff |
| `apps/web/modules/*` ≠ `@afenda/module-catalog` | AGENTS.md |
| Flat `packages/<name>` remains valid indefinitely | Physical layout |

---

## Approval handoff (Scratch → Living)

```text
Human acceptance authorizes a narrowly scoped reopening and amendment
of docs-V2/monorepo and LAYERS.md.

Scratch documents never become interim implementation authority.

If the named Living-authority surfaces cannot be updated, Phase 1
does not begin.
```

**Only valid sequence**

```text
Scratch accepted
→ Living Scratch authority amended (docs-V2/monorepo + LAYERS.md)
→ version / authority recorded
→ Phase 1 begins
  (dormant ARCH/ADR IDs = labels only until Docs-lane reopen — never ghost Living docs/ SSOT)
```

**Forbidden sequence**

```text
Scratch accepted
→ Scratch treated as temporary authority
→ implementation begins
```

Steps:

1. Human stamps this Scratch plan accepted for Living-authority promotion.
2. Amend `docs-V2/monorepo` and `LAYERS.md` with the approved laws. Do **not** recreate Living `docs/architecture/ARCH-*` bodies — Docs-lane reopen is a separate named mission.
3. Record version/authority on those surfaces.
4. Mark this Scratch file accepted-reference or superseded.
5. Only then begin Phase 1.

---

## Proposed design

### Physical layout

Canonical architecture is **classification and ownership**, not folder nesting. `packages/erp/sales` may stay at the package root indefinitely (`band: R1-F`, `category: commercial`).

If Phase 3 is later authorized: one category level; published names stay `@afenda/<name>`. Category folders hold `README.md` + child packages only — never barrels or domain stores.

### Rank and band

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
```

### Workspace edges — dual control

| Surface | Responsibility |
|---------|----------------|
| `package.json` | Executable dependency truth (realizes the edge) |
| `WORKSPACE-EDGE-REGISTER.yaml` | Architecture authorization + rationale (authorizes the edge) |
| Validator | Requires exact agreement between both |

```text
package.json realizes the workspace edge.

WORKSPACE-EDGE-REGISTER authorizes the edge and records its authority,
reason, and effective date.

A workspace dependency is valid only when it exists in both surfaces.

An edge in package.json without an approved register row fails CI.
An approved register row without the corresponding package.json edge
also fails CI unless its status is explicitly planned.

Register authorizes; package.json realizes; CI reconciles.
```

Do **not** say either file independently “owns” the entire graph.

**Default:** peer ERP packages do not import each other.

| Package | Living workspace deps (must appear in both surfaces) |
|---------|------------------------------------------------------|
| `@afenda/sales` | errors, db, audit, events, master-data |
| `@afenda/master-data` | errors, db, audit, events, search |
| Future `@afenda/inventory` | Only via MODULE-ROADMAP cut + dual-control edge |

Also forbidden: dual-write another package’s mutation tables; ERP import of `@afenda/admin`.

```yaml
# WORKSPACE-EDGE-REGISTER.yaml
edges:
  - from: "@afenda/sales"
    to: "@afenda/master-data"
    status: approved
    authority: docs-V2/monorepo
    reason: "FK + snapshots; masters via public API"
    effectiveDate: "2026-07-01"
```

### Runtime module dependencies

Workspace edges and runtime enablement are different graphs.

```text
docs-V2/modules/
├─ WORKSPACE-EDGE-REGISTER.yaml       # authorize compile edges
├─ MODULE-DEPENDENCY.generated.yaml   # from on-disk manifests; CI-diff
└─ MODULE-ROADMAP.yaml                # candidates + planning deps (no package)
```

**Manifest contract (no duplicate optional arrays)**

```ts
readonly moduleDependencies: {
  readonly required: readonly string[];
};

readonly optionalIntegratesWith: readonly {
  readonly moduleId: string;
  readonly style: "events" | "ports" | "app-saga";
}[];
```

- `required` — enablement prerequisites  
- `optionalIntegratesWith` — optional relationships **and** integration style  

Generated runtime view (`MODULE-DEPENDENCY.generated.yaml`):

```yaml
modules:
  sales:
    required:
      - master-data
    optional:
      - moduleId: inventory
        style: events
      - moduleId: fulfillment
        style: events
```

For on-disk modules, the **manifest is primary**; the generated file is CI-diffed. Planning-only modules without packages keep dependency intent in MODULE-ROADMAP only.

| Style | Meaning | Adapter location |
|-------|---------|------------------|
| `events` | Async outbox reaction | Application composition root |
| `ports` | Sync call (not same-TX by default) | Composition root injects |
| `app-saga` | Multi-command workflow | Composition root only |

```text
Cross-package adapters and sagas live in an approved application
composition root. Today: apps/web. Future worker, CLI, or scheduled
host may join without changing domain ownership.
```

**moduleId resolution:** every id in a manifest, generated dependency view, or roadmap must resolve to an on-disk module manifest **or** a MODULE-ROADMAP row.

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

Manifests **import** event IDs from `@afenda/events`. Sales decides *when* to emit; events owns *what* the contract is.

`@afenda/admin/authorization` must **not** define Sales-specific permission constants (avoids control-plane→ERP ownership or duplicated codes).

### Command and query authorization

```text
Composition roots supply authorization adapters.

Every public ERP mutation command and every organization-scoped query
must enforce its declared permission through an injected authorization
port (or an approved shared contract).

A composition-root route check alone is not sufficient.
```

Every public operation resolves to exactly one of:

- a declared permission code; or  
- an explicit `systemOnly` policy; or  
- an explicitly approved public/anonymous policy.

No command or organization-scoped query may be silently unprotected.

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

Composition-root adapters may wire to `@afenda/admin/authorization`. Workers, CLIs, and scripts must inject the same port.

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

Illustrative Sales:

```ts
import {
  SALES_ORDER_CREATED_EVENT,
  SALES_ORDER_LINE_ADDED_EVENT,
  SALES_ORDER_POSTED_EVENT,
} from "@afenda/events";

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
      "sales.order.cancel",
    ],
    queryNamespace: "sales.order",
    queries: ["sales.order.get", "sales.order.list"],
  },
  persistence: {
    schemaOwner: "@afenda/db",
    mutationTables: ["sales_order", "sales_order_line"],
  },
  events: {
    namespace: "sales.order",
    emits: [
      SALES_ORDER_CREATED_EVENT,
      SALES_ORDER_LINE_ADDED_EVENT,
      SALES_ORDER_POSTED_EVENT,
    ],
    consumes: [],
  },
  permissions: {
    namespace: "sales",
    codes: [
      "sales.orders.read",
      "sales.orders.create",
      "sales.orders.update",
      "sales.orders.post",
      "sales.orders.cancel",
    ],
  },
  authorization: {
    commands: {
      "sales.order.create": "sales.orders.create",
      "sales.order.line.add": "sales.orders.update",
      "sales.order.post": "sales.orders.post",
      "sales.order.cancel": "sales.orders.cancel",
    },
    queries: {
      "sales.order.get": "sales.orders.read",
      "sales.order.list": "sales.orders.read",
    },
  },
  moduleDependencies: { required: ["master-data"] },
  optionalIntegratesWith: [
    { moduleId: "inventory", style: "events" },
    { moduleId: "fulfillment", style: "events" },
    { moduleId: "receivables", style: "events" },
  ],
} as const satisfies AfendaModuleManifest;
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

**Phase 2 minimum:** Layers 1–2 + negative fixtures.

### README, package creation, candidates

[packages/README.md](../../packages/README.md): on-disk packages by band. Candidates in MODULE-ROADMAP.

Create package only with: owned aggregate · public command or query · store · manifest · test · README.

P0 candidates (create not authorized): `purchasing` · `inventory` · `receiving` · `fulfillment` · `receivables` · `payables` · `payments` · `accounting`.

---

## Forward note — actor principals (non-blocking)

Current `actorUserId: string` is valid for web-user flows. Before Jobs, CLI mutations, or system event handlers perform ERP mutations, define an actor principal:

```ts
type ActorPrincipal =
  | { kind: "user"; userId: string }
  | { kind: "service"; serviceId: string }
  | { kind: "system"; systemId: string; reason: string };
```

Does **not** block Phase 1–2. Record before worker-driven ERP mutations begin.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Scratch used as interim authority | Handoff forbids it; Phase 1 blocked until Living surfaces update |
| package.json vs register drift | Dual-control + CI reconcile |
| Optional deps duplicated / disagree | Single `optionalIntegratesWith`; generated MODULE-DEPENDENCY |
| Unmapped commands/queries | `authorization` map + CI |
| Permission constants owned by admin | ERP package owns codes; admin evaluates only |
| Agents invent Phase 3/4 | Explicit NOT AUTHORIZED list |

---

## Rollout and rollback

### Phase 1 — after Living promotion only

- [ ] Named Living surfaces amended (`docs-V2/monorepo`, `LAYERS.md`) with version/authority
- [ ] Every existing package has exactly one band
- [ ] Bands = classification only
- [ ] Dual-control workspace-edge law documented
- [ ] `master-data` / `sales` ownership + `mutationTables` documented
- [ ] Authority matrix in monorepo notes
- [ ] Package paths unchanged
- [ ] Candidates only in MODULE-ROADMAP
- [ ] No runtime control-plane readiness claim

**Rollback:** revert Living-surface / doc commits.

### Phase 2

- [ ] `master-data` and `sales` export valid manifests (queries + authorization maps)
- [ ] MODULE-CATALOG.generated.yaml and MODULE-DEPENDENCY.generated.yaml match committed output
- [ ] WORKSPACE-EDGE-REGISTER ↔ `package.json` exact agreement (or `planned` rows)
- [ ] Generated runtime deps invent no workspace edges
- [ ] Duplicate ids / mutation-table owners / command / query / event / permission codes fail CI
- [ ] Every public mutation and org-scoped query maps to permission, systemOnly, or approved public policy
- [ ] Peer ERP imports fail without dual-control edge
- [ ] Deep `@afenda/*/src/*` and unauthorized schema imports fail
- [ ] DAG cycles fail; `moduleId` resolves to catalog or MODULE-ROADMAP
- [ ] Auth-port coverage in package or contract tests
- [ ] Negative fixtures for each rule

**Rollback:** remove CI job and validators in a follow-up commit. Do not mark failing validators green.

### Phase 3 / 4 — status after Phase 1–2

Phase 1–2 = governance baseline (done on disk). Phase 3 is **optional folder nesting**, not the next required mission after Phase 1–2. Flat `packages/<name>` remains valid indefinitely.

**Audit 2026-07-20 (evidence gate, ≥2 of 5):** root packages **22** (Unmet vs ≥24) · documented path mistakes in 60 days **none found** (Unmet) · manual category map / audit navigation / nesting study = Unevaluated or Unmet. **Verdict: GATE_UNMET** — no nesting mission from that audit. Commands: `git ls-files "packages/*/package.json"` · `git log --since=2026-05-21` path-mistake probes.

Evidence criteria (for a future nesting mission only): ≥24 root packages · ≥3 path mistakes in 60 days · manual category map needed · audit navigation slowed · nesting study shows fewer errors.

Phase 4 still requires MODULE-ROADMAP cut + full package bar + dual-control edges.

---

## Proposed decisions pending human acceptance

1. Scratch never interim authority; Living surfaces must update or Phase 1 does not start.
2. Register authorizes; `package.json` realizes; CI reconciles.
3. `required` + `optionalIntegratesWith` only; MODULE-DEPENDENCY.generated.yaml.
4. Exact queries + operation→permission authorization maps; every public mutation and org-scoped query authorized.
5. Commands/queries/permission codes owned by ERP package; event contracts by `@afenda/events`; evaluation by authorization subsystem.
6. All prior v2.2 keepers (peer forbid, bands, persistence, composition root, no-generic-helper, Phase 3/4 barred).

---

## Open questions (defaults)

| ID | Topic | Default |
|----|-------|---------|
| Q1 | Authorization extract | Composition-root adapters on `@afenda/admin/authorization`; extract on boundary crossing. **Not authorized here.** |
| Q2 | Phase 3 | Multi-condition evidence gate. |
| Q3 | Jobs | Composition-root injected until promote criteria. **Not authorized here.** |
| Q4 | ActorPrincipal | Record before worker/CLI ERP mutations; not required for Phase 1–2. |

---

## Appendix A — v2.2 → v2.3 delta

| Topic | v2.2 | v2.3 |
|-------|------|------|
| Scratch as interim authority | Ambiguous handoff wording | Explicitly forbidden |
| Workspace SSOT | Dual claims | Register authorizes; package.json realizes; CI reconciles |
| Optional deps | `optional` + `optionalIntegratesWith` | `optionalIntegratesWith` only; generated MODULE-DEPENDENCY |
| Queries / auth map | Commands only; “material” | Exact queries + authorization maps; every public mutation |
| Permission SSOT | Split unclear | ERP owns codes; admin evaluates; register generated |
| Event IDs | Package constants vs events | Import from `@afenda/events` |
| Actor principals | Absent | Forward note; non-blocking |

## Appendix B — Related docs

- [v2.2](./packages_refactor_v2.2.md) · [v2.1](./packages_refactor_v2.1.md) · [v2](./packages_refactor_v2.md) · [v1](./packages_refactor.md)
- [packages/README.md](../../packages/README.md)
- [docs-V2/monorepo/README.md](../monorepo/README.md)
- [docs-V2/master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md)
- [afenda-elite-monorepo-discipline](../../.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md)
