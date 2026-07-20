> **Superseded for decisions:** [packages_refactor_v2.2.md](./packages_refactor_v2.2.md). Keep this v2 file for history only.

# Packages classification — Revise Plan v2

| Field | Value |
|-------|-------|
| Mode | Technical specification (revise plan) |
| Status | Draft — Scratch · **superseded by v2.1** |
| Audience | Engineers maintaining `@afenda/*` and monorepo agents |
| Enables | Accept classification + governance model before any folder move or new ERP package |
| Supersedes | [packages_refactor.md](./packages_refactor.md) (v1 assessment) |
| Date | 2026-07-20 |
| Evidence | v1 scratch · [packages/README.md](../../packages/README.md) · [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · architecture review 2026-07-20 |

**Scratch only.** Not Living DOC-001. Does not approve ARCH-006 domain packages or invent Elite skill farms.

---

## Overview

v1 correctly diagnosed Rank-1 overload and proposed category folders, bands, manifests, and registers. v2 keeps that spine and **closes the gaps** that would make Phase 3–4 unsafe: ERP↔ERP law, schema vs mutation ownership, manifest/register SSOT, naming collisions, and phase gates.

**Production-ready control plane = Phase 1 + Phase 2.** Physical nesting (Phase 3) and new ERP packages (Phase 4) are separate, gated missions.

---

## Problem

Today almost every workspace package is labeled Rank-1 Platform while mixing foundation leaves, runtime infra, data-plane SSOTs, control plane, ERP modules, and AI. That catalog will not stay navigable when peer transactional modules arrive. Folders alone do not stop ownership drift; **import law + manifests + validators** do.

---

## Goals

1. Classify packages by architectural responsibility without changing published names (`@afenda/<name>`).
2. Keep one capability owner per package; never introduce category barrels (`@afenda/erp`, `@afenda/runtime`, …).
3. Enforce ERP dependency and write boundaries in CI before more ERP packages exist.
4. Make module enablement and workspace DAG **separate** contracts.
5. Deliver Phase 1–2 as the default end-state; nest folders only when navigation pain is measured and a dedicated mission is opened.

## Non-goals

- Consolidating domains into mega-packages (`@afenda/commercial`, `@afenda/finance`).
- Creating empty speculative packages or empty `commands/` / `queries/` trees.
- Restoring Living `docs/` or Collapse-era trees.
- Approving Purchasing / Inventory / Finance / Accounting skill farms or packages without ARCH-006 / Approved slice.
- Claiming multi-DB tenancy or changing Neon shared-schema posture.
- Treating this Scratch doc as Living architecture SSOT.

---

## Constraints

| Constraint | Source |
|------------|--------|
| Imports flow down Rank 3 → 2 → 1; packages never import `apps/*` | ARCH-024 / LAYERS |
| No `@afenda/shared`; no category implementation packages | ARCH-024 · v1 §2 |
| Schema DDL for domain tables lives in `@afenda/db`; mutation SSOT in owning domain package | Living monorepo + master-data / sales contracts |
| Enterprise production quality only — no shim or stub product paths | always-apply rules |
| Scratch may propose candidates; shipping new ERP packages needs Approved cut | Elite router · ARCH-006 |
| `apps/web/modules/*` is application domain layout — not the module-catalog package | AGENTS.md |

---

## Proposed design

### 1. Canonical physical layout (unchanged from v1 shape)

One category level. Published names unchanged.

```text
packages/
├─ foundation/     config · env · errors
├─ runtime/        logger · http · security · metrics · openapi · rate-limit · cache
├─ data-plane/     db · audit · events · search · notifications · (jobs when promoted)
├─ control-plane/  auth · admin · (authorization when extracted) · module-catalog
├─ transaction-core/   # reserved; packages only when promote rule fires
├─ erp/            master-data · sales · <Approved candidates only>
├─ intelligence/   ai-the-machine
└─ surfaces/       ui-system · emails
```

Category folders may hold `README.md` and child packages only — never `package.json`, barrels, or domain stores.

### 2. Rank vs band

Keep official ranks (1 Platform · 2 Surfaces · 3 Application). Add **band** for catalog and DAG docs only:

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

Bands are not new ranks. Dependency position is enforced by the **ERP dependency law** and existing forbidden pairs — not by band labels alone.

### 3. ERP dependency law (new — critical)

**Default:** peer ERP packages do **not** import each other.

| From | May depend on | Must not |
|------|---------------|----------|
| Any R1-F ERP | R1-A leaves, R1-C data-plane (per existing edges), `@afenda/master-data` when masters required | Peer ERP packages unless an **Approved edge** is listed in DEPENDENCY-REGISTER |
| Any R1-F ERP | Command/query ports defined in-package; handlers injected from `apps/web` | Dual-write another package’s tables |
| `@afenda/sales` (living) | `@afenda/db` · `errors` · `audit` · `events` · `master-data` | Own purchasing / inventory / md_* mutations |

**Optional integration styles** (manifest `optionalIntegratesWith`):

| Style | When | Owner of orchestration |
|-------|------|------------------------|
| `events` | Async reaction to outbox events | Handler in `apps/web` (or future worker); package does not import peer |
| `ports` | Sync read/command needed in same TX | Port interface in consumer; adapter injected from app — still no peer package import in `package.json` until Approved edge |
| `app-saga` | Multi-command workflow | `apps/web` only |

**Inventory (when it exists):** sole mutation owner for its stock/ledger tables. Peers never write inventory rows; they publish events or call app-injected ports.

**Promote optional → required module dependency:** only via org enablement in `@afenda/module-catalog` (runtime), not by silently adding a workspace import. Compile-time `package.json` edges still require Approved DAG update.

### 4. Schema vs mutation ownership (new — non-negotiable)

```text
DDL / Drizzle table definitions  →  @afenda/db
Mutating writes / list SSOTs     →  owning package (manifest owns.tables)
Reads of foreign tables          →  allowed only via owning package public API or Approved query port
```

Validators reject: dual-write into a table whose owner is another package; ERP package declaring tables that have no DDL owner in `@afenda/db`.

### 5. Control plane naming

| Concern | Owner |
|---------|--------|
| Authentication / session | `@afenda/auth` |
| Permission evaluation (`hasPermission`, catalog, policy decision) | Extract to `@afenda/authorization` **or** single export path under `@afenda/admin` until extract — never scattered ERP checks |
| Org-console commands / RBAC audit | `@afenda/admin` |
| Module IDs, enablement, compatibility | **`@afenda/module-catalog`** (not `@afenda/modules`) |

**Glossary:** `apps/web/modules/*` = application domain folders. `@afenda/module-catalog` = Rank-1 package for module registration and org enablement. Do not merge the names.

### 6. Jobs vs events

| Package | Owns | Does not |
|---------|------|----------|
| `@afenda/events` | `platform_domain_event` outbox SSOT | Business commands; NATS/Redis bus |
| `@afenda/jobs` (when promoted) | Retry / schedule / worker observability; **invokes** package commands via injected handlers | ERP imports of every domain; recreating command logic |

Same injection pattern as today’s events handlers from `apps/web`.

### 7. Transaction core promote rule (unchanged intent)

Create a shared R1-E package only when **two independent modules** need the capability, or one module needs an enterprise guarantee that cannot stay package-local.

Until then: implement inside the first owner; record future authority in the module plan / register. Do not scaffold empty R1-E packages.

### 8. Module manifest contract (revised)

Every active ERP package exports a manifest (e.g. `src/module.manifest.ts`).

```ts
export interface AfendaModuleManifest {
  readonly id: string;
  /** Business catalog label — validated against MODULE-REGISTER, not a closed TS enum forever */
  readonly category: string;
  readonly packageName: `@afenda/${string}`;
  readonly band: "R1-F";

  readonly owns: {
    readonly tables: readonly string[];
    readonly aggregates: readonly string[];
    readonly commandPrefixes: readonly string[];
    readonly eventPrefixes: readonly string[];
  };

  /** Org enablement graph — module ids only */
  readonly moduleDependencies: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
  };

  /** Optional peer integrations — style required */
  readonly optionalIntegratesWith: readonly {
    readonly moduleId: string;
    readonly style: "events" | "ports" | "app-saga";
  }[];

  readonly application: {
    /** Permission / command namespace — not URL IA */
    readonly permissionPrefix: string;
  };

  readonly lifecycle:
    | "planned"
    | "scaffolded"
    | "active"
    | "deprecated"
    | "retired";
}
```

**Dropped from v1:** hardcoded `rank: 1`; `routeBase` on the package manifest (routes live in ROUTE-REGISTER / app).

**Workspace DAG** remains `package.json` + [docs-V2/monorepo](../monorepo/README.md) — not duplicated as a free-form string list inside the manifest.

Example (Sales, illustrative):

```ts
export const salesModuleManifest = {
  id: "sales",
  category: "commercial",
  packageName: "@afenda/sales",
  band: "R1-F",
  owns: {
    tables: ["sales_order", "sales_order_line"],
    aggregates: ["sales_order"],
    commandPrefixes: ["sales.order"],
    eventPrefixes: ["sales.order"],
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
  lifecycle: "active",
} as const satisfies AfendaModuleManifest;
```

### 9. Registers — manifests primary

```text
docs-V2/modules/
├─ MODULE-REGISTER.yaml          # generated or CI-diffed from manifests
├─ TABLE-OWNERSHIP.yaml
├─ COMMAND-REGISTER.yaml
├─ EVENT-REGISTER.yaml
├─ PERMISSION-REGISTER.yaml
├─ ROUTE-REGISTER.yaml           # app/IA owned; packages do not invent route roots
└─ DEPENDENCY-REGISTER.yaml      # Approved ERP↔ERP edges + module enablement
```

**SSOT rule:** package manifests are primary for package-owned fields. Registers are **generated** (or regenerated and CI-diffed). Do not maintain seven hand-edited YAMLs as a second authority.

Recommended entry:

```bash
pnpm validate:modules
```

Fans out to table ownership, commands, events, permissions, routes, package DAG, and no-cross-domain-writes.

Reject: duplicate module IDs, duplicate table owners, overlapping command/event/permission namespaces, undeclared workspace edges, peer ERP imports without Approved edge, writes outside owner.

### 10. Catalog / README rules

[packages/README.md](../../packages/README.md) lists **only packages that exist on disk**, grouped by band.

Planned modules live in MODULE-REGISTER / Scratch roadmaps (e.g. master-data remaining-slices) — never as fake catalog rows.

### 11. Package creation standard

A workspace package may be created only when it has at least:

- one owned aggregate;
- one public command or query;
- one store contract;
- one manifest (ERP);
- one real test;
- one README ownership statement.

Folder shape (`commands/`, `queries/`, …) appears when files exist — do not pre-create empty trees.

### 12. Candidate ERP spine (not a create list)

Operational chains remain the **product target**, not an immediate package-create list:

```text
Sales → Inventory → Fulfillment → Receivables → Payments → Accounting
Purchasing → Receiving → Inventory → Payables → Payments → Accounting
```

**Candidate** package ids for a future Approved cut (P0):

`purchasing` · `inventory` · `receiving` · `fulfillment` · `receivables` · `payables` · `payments` · `accounting`

P1/P2 names from v1 stay roadmap language only.

---

## Interfaces / dependencies

| Surface | Role after v2 |
|---------|----------------|
| `@afenda/<name>` | Unchanged consumer import |
| `pnpm-workspace.yaml` / Turbo | Updated only if Phase 3 nests paths |
| `docs-V2/monorepo` · LAYERS | Must document bands + ERP law + Approved edges |
| `@afenda/module-catalog` | New when enablement is implemented — Phase 1 catalog prose does not require the package on disk |
| `@afenda/authorization` | Extract when evaluation must leave admin; until then single export path |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Agents treat candidate spine as create-now | Phase 4 gate + “candidate” wording + Elite ARCH-006 rule |
| Dual SSOT (manifest vs YAML) | Generate + CI diff |
| Phase 3 churn (CODEOWNERS, agents, CI paths) | Phase 3 only under a dedicated nesting mission after navigation pain is recorded |
| `@afenda/modules` vs `apps/web/modules` confusion | Package name `module-catalog` + glossary |
| Inventory hub pressure | Write law + events/ports only |
| Premature R1-E packages | Promote rule + no empty scaffold |

---

## Rollout and rollback

### Phase 1 — Classification without moves (required)

Update:

- `packages/README.md` band grouping (existing packages only);
- Scratch / monorepo DAG notes for bands + ERP law;
- MODULE-REGISTER seed from living `master-data` + `sales` manifests (when added).

No folder moves. **Rollback:** revert doc commits.

### Phase 2 — Validator enforcement (required)

Add `pnpm validate:modules` (+ fan-out). Enforce table ownership, namespaces, DAG, no-cross-domain-writes.

**Rollback:** remove the CI job and validator scripts in a follow-up commit if the contract must be withdrawn. Do not leave failing validators marked green.

### Phase 3 — Directory nesting (dedicated mission)

Move packages into one-level categories only when navigation pain is documented (e.g. onboarding / agent path errors) and a nesting mission is explicitly opened. Same mission updates workspace globs, CODEOWNERS, CI paths, Turbo, docs links, agent references.

**Rollback:** reverse moves in one mission; published names never changed so consumers stay stable.

### Phase 4 — New ERP packages (gated)

Each candidate requires:

1. Approved ARCH-006 / slice cut for that domain;
2. Manifest + store + command + test + README;
3. DAG + register update;
4. No peer imports without Approved edge.

**Rollback:** remove a package only via an Approved delete mission that names the surface.

---

## Accepted decisions (from review)

1. ERP peer imports forbidden by default; optional integrations declare style.
2. Manifests primary; registers generated.
3. Schema in `@afenda/db`; mutation in owner.
4. Drop manifest `rank` and `routeBase`; use `band` + permissionPrefix.
5. Package name `@afenda/module-catalog` for enablement authority.
6. Phase 1–2 = default done state for this revise plan; Phase 3 needs a dedicated nesting mission; Phase 4 is gated.
7. P0 spine = candidates, not a create list.

## Open questions

| ID | Question | Default if unanswered |
|----|----------|------------------------|
| Q1 | Extract `@afenda/authorization` in Phase 2, or single `@afenda/admin` export path first? | Single admin export path until second consumer forces extract |
| Q2 | Numeric trigger for Phase 3 (e.g. ≥N Rank-1 packages)? | Human-declared navigation pain in Scratch note — no silent move |
| Q3 | Worker process for `@afenda/jobs` vs Next.js-only handlers? | Stay web-injected handlers until jobs package is promoted |

---

## v1 → v2 delta (quick)

| Topic | v1 | v2 |
|-------|----|----|
| ERP↔ERP | Underspecified | Default forbid + styles + Approved edges |
| Manifest deps | Mixed module + platform | `moduleDependencies` only; workspace DAG separate |
| rank / routeBase | On manifest | Removed |
| `@afenda/modules` | Proposed name | `@afenda/module-catalog` |
| Registers | Hand YAML or generate | Generate / CI-diff; manifests primary |
| Phase 3 | Planned sequence | Dedicated nesting mission |
| Phase 4 list | Implicit create order | Candidates + ARCH-006 gate |
| README catalog | Listed planned pkgs | Existing only |

---

## Related docs

- [packages_refactor.md](./packages_refactor.md) — v1 (superseded for decisions; keep for history)
- [packages/README.md](../../packages/README.md)
- [docs-V2/monorepo/README.md](../monorepo/README.md)
- [docs-V2/master-data/arch-006-consumer-contract.md](../master-data/arch-006-consumer-contract.md)
- [afenda-elite-monorepo-discipline](../../.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md)
