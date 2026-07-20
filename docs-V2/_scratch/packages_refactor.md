> **Superseded for decisions:** [packages_refactor_v2.3.md](./packages_refactor_v2.3.md) (2026-07-20). Prior: [v2.2](./packages_refactor_v2.2.md) · [v2.1](./packages_refactor_v2.1.md) · [v2](./packages_refactor_v2.md) · this v1.

# Assessment

Your current `packages/` structure is **healthy but no longer sufficiently classified**.

The main problem is not that packages are flat. It is that the catalog currently calls almost everything **Rank-1 Platform**, even though it mixes:

- foundation utilities;
- runtime infrastructure;
- data-plane services;
- identity and administration;
- ERP master data;
- ERP transactional modules;
- AI capability.

That will become confusing when Purchasing, Inventory, Finance, Manufacturing, Quality, and Projects arrive.

The scalable rule should be:

> **Group folders by architectural responsibility, while preserving one package per independently owned capability.**

Do not consolidate packages into `@afenda/commercial` or `@afenda/finance`.
Do not create category-level barrels.
Package imports remain `@afenda/<name>`.

---

# 1. Recommended canonical physical structure

A single category level is enough:

```text
packages/
├─ foundation/
│  ├─ config/
│  ├─ env/
│  └─ errors/
│
├─ runtime/
│  ├─ logger/
│  ├─ http/
│  ├─ security/
│  ├─ metrics/
│  ├─ openapi/
│  ├─ rate-limit/
│  └─ cache/
│
├─ data-plane/
│  ├─ db/
│  ├─ audit/
│  ├─ events/
│  ├─ search/
│  ├─ notifications/
│  └─ jobs/                    # proposed
│
├─ control-plane/
│  ├─ auth/
│  ├─ authorization/           # proposed
│  ├─ admin/
│  └─ modules/                 # proposed
│
├─ transaction-core/
│  ├─ workflow/                # introduce when first genuinely shared
│  ├─ approvals/
│  ├─ numbering/
│  ├─ idempotency/
│  ├─ document-links/
│  └─ attachments/
│
├─ erp/
│  ├─ master-data/
│  ├─ sales/
│  ├─ purchasing/
│  ├─ inventory/
│  ├─ receiving/
│  ├─ fulfillment/
│  ├─ receivables/
│  ├─ payables/
│  ├─ payments/
│  └─ accounting/
│
├─ intelligence/
│  └─ ai-the-machine/
│
└─ surfaces/
   ├─ ui-system/
   └─ emails/
```

Published names remain unchanged:

```ts
import { createDraftOrder } from "@afenda/sales";
import { Button } from "@afenda/ui-system";
import { env } from "@afenda/env";
```

The directories are for repository navigation only.

For example:

```text
packages/erp/sales
```

still publishes:

```text
@afenda/sales
```

---

# 2. Category folders must never become packages

A category folder may contain:

```text
README.md
child packages
optional ownership metadata
```

It must not contain:

```text
package.json
src/index.ts
business commands
tables
shared domain stores
category barrel exports
```

Therefore, never introduce:

```text
@afenda/erp
@afenda/runtime
@afenda/data-plane
@afenda/control-plane
```

as implementation packages.

That would recreate ambiguity at a different level.

---

# 3. How the current packages should be grouped

## Foundation

These should be dependency leaves or near-leaves.

| Package          | Responsibility                                |
| ---------------- | --------------------------------------------- |
| `@afenda/config` | Build-time TypeScript and Biome configuration |
| `@afenda/env`    | Runtime environment contract                  |
| `@afenda/errors` | Transport-neutral errors and `Result`         |

Rules:

- `config` is dev-time only.
- `errors` must not depend on domain packages.
- `env` must not import business packages.
- Most other packages may consume these.

---

## Runtime

These provide technical runtime behavior but do not own persistent business records.

| Package              | Responsibility                  |
| -------------------- | ------------------------------- |
| `@afenda/logger`     | Structured logging              |
| `@afenda/http`       | HTTP primitives and correlation |
| `@afenda/security`   | Headers, CSP and CORS           |
| `@afenda/metrics`    | Operational instrumentation     |
| `@afenda/openapi`    | API schema generation           |
| `@afenda/rate-limit` | Abuse limiting                  |
| `@afenda/cache`      | Process and Redis caching       |

Rules:

- No ERP tables.
- No document ownership.
- No sales, stock, invoice, payment, party or item semantics.
- No imports from ERP modules.
- HTTP concerns remain outside domain commands.

---

## Data plane

These own durable horizontal platform records.

| Package                 | Responsibility                                         |
| ----------------------- | ------------------------------------------------------ |
| `@afenda/db`            | Schema, migrations and database primitives             |
| `@afenda/audit`         | Audit record authority                                 |
| `@afenda/events`        | Outbox and event contract authority                    |
| `@afenda/search`        | Search-document authority                              |
| `@afenda/notifications` | In-app notification authority                          |
| Proposed `@afenda/jobs` | Background execution, retries and scheduled processing |

`@afenda/jobs` is worth considering because the current structure identifies the outbox owner but not the reusable owner for:

- event dispatch execution;
- retry policy;
- dead-letter handling;
- scheduled jobs;
- batch-processing checkpoints;
- worker observability.

It should not own business decisions. A job invokes a package command; it does not recreate the command logic.

---

## Control plane

These determine who can use the system and which capabilities are available.

| Package                          | Responsibility                                                 |
| -------------------------------- | -------------------------------------------------------------- |
| `@afenda/auth`                   | Authentication, identity session and sign-in                   |
| Proposed `@afenda/authorization` | Roles, permissions, policies and permission evaluation         |
| `@afenda/admin`                  | Administrative orchestration and organization console services |
| Proposed `@afenda/modules`       | ERP module catalog, dependencies and organization enablement   |

### Critical current ambiguity

Your catalog states:

```text
@afenda/auth  → session and credentials
@afenda/admin → org console and RBAC audit
```

But it does not clearly identify the sole runtime owner of:

```text
hasPermission
permission catalog
role-permission evaluation
policy decision
authorization context
```

That needs one explicit authority.

My preferred separation is:

```text
@afenda/auth
  authentication and session identity

@afenda/authorization
  roles, permissions and policy evaluation

@afenda/admin
  commands for administering those records
```

`@afenda/admin` should not become the permission-check package used throughout the ERP.

---

# 4. The most important missing package: `@afenda/modules`

For genuine plug-and-play ERP development, the system needs a module control-plane authority.

```text
@afenda/modules
```

It should own:

- canonical module IDs;
- module category;
- module lifecycle state;
- package ownership declaration;
- required module dependencies;
- optional integration dependencies;
- organization-level enablement;
- read-only and disabled states;
- module compatibility metadata;
- capability exposure;
- module registration validation.

Example:

```ts
export const salesModule = {
  id: "sales",
  category: "erp",
  packageName: "@afenda/sales",

  dependsOn: ["master-data"],
  optionallyIntegratesWith: ["inventory", "fulfillment", "receivables"],

  permissionPrefix: "sales",
  routeBase: "/commercial/sales",

  lifecycle: "active",
} as const;
```

Organization state:

```ts
export type OrganizationModuleState = "disabled" | "enabled" | "read_only";
```

This gives you the actual plug-and-play mechanism.

Without it, “module enabled” will eventually be implemented independently in:

- navigation;
- route middleware;
- server actions;
- permissions;
- background consumers;
- settings pages.

That is exactly how drift starts.

---

# 5. Transaction core: reserve the ownership now, scaffold only when real

The following capabilities will be needed by many ERP modules:

```text
@afenda/workflow
@afenda/approvals
@afenda/numbering
@afenda/idempotency
@afenda/document-links
@afenda/attachments
```

However, do not create all six as empty packages immediately.

Use this rule:

> Create a shared package when at least two independent modules need the capability, or when one module needs an enterprise guarantee that cannot safely remain package-local.

## Recommended timing

| Capability     | Recommendation                                                           |
| -------------- | ------------------------------------------------------------------------ |
| Idempotency    | Establish before the second transactional module                         |
| Numbering      | Establish before Sales and Purchasing both allocate document numbers     |
| Document links | Establish before order→delivery→invoice relationships                    |
| Approvals      | Establish when two modules need governed approvals                       |
| Workflow       | Establish when lifecycle definitions become configurable or cross-module |
| Attachments    | Establish when durable document attachments are introduced               |

Until promoted, the capability can remain inside the first owning package, but the future authority must be recorded in the module plan.

---

# 6. ERP transactional modules missing from the current catalog

Your current ERP domain is:

```text
master-data
sales
```

That is a valid beginning but not yet an operational ERP transaction spine.

## P0 — next complete operational spine

```text
packages/erp/
├─ master-data/          → @afenda/master-data
├─ sales/                → @afenda/sales
├─ purchasing/           → @afenda/purchasing
├─ inventory/            → @afenda/inventory
├─ receiving/            → @afenda/receiving
├─ fulfillment/          → @afenda/fulfillment
├─ receivables/          → @afenda/receivables
├─ payables/             → @afenda/payables
├─ payments/             → @afenda/payments
└─ accounting/           → @afenda/accounting
```

These packages complete two essential chains:

```text
Sales
→ Inventory
→ Fulfillment
→ Receivables
→ Payments
→ Accounting
```

and:

```text
Purchasing
→ Receiving
→ Inventory
→ Payables
→ Payments
→ Accounting
```

## P1 — commercial and supply-chain depth

```text
pricing
returns
tax
logistics
traceability
replenishment
landed-cost
reconciliation
credit-control
period-close
```

## P2 — manufacturing and operational control

```text
bom
production-planning
production
production-costing
quality
nonconformance
capa
maintenance
recall
fixed-assets
budgeting
treasury
projects
```

These should remain independent packages, but appear under their catalog category.

---

# 7. Do not put every ERP package under one generic catalog heading

Inside the README, group ERP modules by business capability while keeping them physically under `packages/erp/`.

For example:

## ERP backbone

```text
master-data
```

## Commercial

```text
sales
purchasing
pricing
returns
```

## Supply chain

```text
inventory
receiving
fulfillment
logistics
traceability
replenishment
landed-cost
```

## Finance

```text
receivables
payables
payments
accounting
reconciliation
credit-control
period-close
```

## Manufacturing

```text
bom
production-planning
production
production-costing
```

## Operational control

```text
quality
nonconformance
capa
maintenance
recall
```

The physical grouping does not need to repeat all these levels:

```text
packages/erp/commercial/sales
```

would be one level too deep.

Prefer:

```text
packages/erp/sales
```

and let metadata/catalog assign:

```text
category: commercial
```

That remains easier for junior engineers.

---

# 8. Canonical module manifest

Every ERP package should contain:

```text
src/module.ts
```

or:

```text
module.manifest.ts
```

with a uniform contract.

```ts
export interface AfendaModuleManifest {
  readonly id: string;
  readonly category:
    | "commercial"
    | "supply-chain"
    | "finance"
    | "manufacturing"
    | "operations"
    | "projects";

  readonly packageName: `@afenda/${string}`;
  readonly rank: 1;

  readonly owns: {
    readonly tables: readonly string[];
    readonly aggregates: readonly string[];
    readonly commandPrefixes: readonly string[];
    readonly eventPrefixes: readonly string[];
  };

  readonly dependencies: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
  };

  readonly application: {
    readonly routeBase: string;
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

Example for Sales:

```ts
export const salesModuleManifest = {
  id: "sales",
  category: "commercial",
  packageName: "@afenda/sales",
  rank: 1,

  owns: {
    tables: ["sales_order", "sales_order_line"],
    aggregates: ["sales_order"],
    commandPrefixes: ["sales.order"],
    eventPrefixes: ["sales.order"],
  },

  dependencies: {
    required: ["master-data", "db", "errors", "audit", "events"],
    optional: ["inventory", "fulfillment", "receivables"],
  },

  application: {
    routeBase: "/commercial/sales",
    permissionPrefix: "sales",
  },

  lifecycle: "active",
} as const;
```

---

# 9. Registers required to stop duplication

The module manifest is package-local. You also need centrally validated registers.

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

Alternatively, generate the registers from module manifests.

The system should reject:

- duplicate module IDs;
- duplicate table owners;
- overlapping command namespaces;
- duplicate event contracts;
- duplicate route roots;
- duplicate permission prefixes;
- undeclared business-package dependencies;
- missing package catalog entries.

Recommended commands:

```bash
pnpm validate:modules
pnpm validate:table-ownership
pnpm validate:commands
pnpm validate:events
pnpm validate:permissions
pnpm validate:routes
pnpm validate:package-dag
pnpm validate:no-cross-domain-writes
```

---

# 10. Revised internal Rank-1 classification

Keep the official rank as Rank 1, but add a **band** or **kind**.

| Band | Kind                | Examples                                  |
| ---- | ------------------- | ----------------------------------------- |
| R1-A | Foundation          | errors, env                               |
| R1-B | Runtime             | logger, http, security, metrics, cache    |
| R1-C | Data plane          | db, audit, events, search, notifications  |
| R1-D | Control plane       | auth, authorization, admin, modules       |
| R1-E | Transaction core    | numbering, idempotency, links, approvals  |
| R1-F | ERP consumer        | master-data, sales, purchasing, inventory |
| R1-X | Optional capability | ai-the-machine                            |

These do not need to become new architectural ranks.

They are dependency and catalog classifications within Rank 1.

This is important because:

```text
@afenda/errors
```

and:

```text
@afenda/sales
```

are both Rank 1, but clearly do not occupy the same dependency position.

---

# 11. Recommended revised catalog structure

Your `packages/README.md` should be organized approximately like this:

```text
## Catalog

### Surfaces — Rank 2
- ui-system
- emails

### Platform Foundation — Rank 1A
- config
- env
- errors

### Runtime Infrastructure — Rank 1B
- logger
- http
- security
- metrics
- openapi
- rate-limit
- cache

### Data Plane — Rank 1C
- db
- audit
- events
- search
- notifications
- jobs

### Identity and Control Plane — Rank 1D
- auth
- authorization
- admin
- modules

### Transaction Core — Rank 1E
- idempotency
- numbering
- document-links
- approvals
- workflow
- attachments

### ERP Backbone — Rank 1F
- master-data

### ERP Commercial
- sales
- purchasing
- pricing
- returns

### ERP Supply Chain
- inventory
- receiving
- fulfillment
- logistics
- traceability

### ERP Finance
- receivables
- payables
- payments
- accounting
- reconciliation

### ERP Manufacturing and Operations
- bom
- production
- quality
- maintenance

### Intelligence — Rank 1X
- ai-the-machine
```

Only list packages that actually exist. Planned packages should appear in a separate roadmap or module register, not as if they are already available.

---

# 12. Package creation standard

Every new module must have:

```text
packages/erp/<module>/
├─ src/
│  ├─ commands/
│  ├─ queries/
│  ├─ domain/
│  ├─ ports/
│  ├─ stores/
│  ├─ schemas/
│  ├─ module.manifest.ts
│  └─ index.ts
├─ tests/
├─ README.md
├─ package.json
├─ tsconfig.json
└─ vitest.config.ts
```

But do not create empty speculative subfolders.

A package is ready to exist only when it has at least:

- one owned aggregate;
- one public command or query;
- one store contract;
- one manifest;
- one real test;
- one README ownership statement.

A module can remain `planned` in the register without an empty workspace package.

---

# 13. Safe migration sequence

## Phase 1 — Classification without moves

First update:

- `packages/README.md`;
- package classifications;
- module register;
- ownership registers;
- DAG documentation.

No folders move yet.

## Phase 2 — Validator enforcement

Add:

```text
module registry validation
table ownership validation
dependency validation
duplicate namespace detection
```

## Phase 3 — Controlled directory migration

Move current packages into one-level categories:

```text
packages/foundation/errors
→ packages/foundation/errors

packages/data-plane/db
→ packages/data-plane/db

packages/control-plane/auth
→ packages/control-plane/auth

packages/erp/master-data
→ packages/erp/master-data

packages/erp/sales
→ packages/erp/sales
```

Package names remain unchanged.

Update in the same mission:

- pnpm workspace globs;
- README links;
- CODEOWNERS;
- CI paths;
- Turbo inputs;
- docs links;
- agent path references;
- package DAG paths.

## Phase 4 — Add the next ERP spine packages

Recommended order:

```text
purchasing
inventory
receiving
fulfillment
receivables
payables
payments
accounting
```

Each is added as an independent, manifest-driven package.

---

# Final recommendation

Your current package set is missing three architectural controls before large ERP expansion:

1. **Explicit internal classification inside Rank 1.**
2. **A module control-plane owner such as `@afenda/modules`.**
3. **Machine-enforced ownership and namespace registers.**

The canonical scalable layout is:

```text
foundation
runtime
data-plane
control-plane
transaction-core
erp
intelligence
surfaces
```

With these rules:

```text
One physical grouping level only.
One capability owner per package.
No category implementation packages.
No category barrels.
Package names remain @afenda/<name>.
Planned modules live in a register, not empty folders.
Every active ERP module has a manifest.
CI rejects duplicate ownership and undeclared dependencies.
```

This preserves the excellent clarity already present in `@afenda/sales`, while making the repository understandable for junior developers and safe to scale into a complete ERP.
