# ERP (R1-F)

**What it is** — A category folder for organization-scoped ERP bounded-context packages under `packages/erp/<name>/`.

**What it does** — Groups sole-mutator domain libraries (`@afenda/sales`, `@afenda/human-resources`, …) that own their mutation tables, expose commands and queries through declared `exports`, and integrate with peers only through registered edges, ports, or domain events.

**What you need** — Node.js `24.x` and pnpm `>=10.33.4` (root `package.json`); familiarity with [SCAFFOLDING.md](./SCAFFOLDING.md) before adding or widening a package.

**Who it's for** — Engineers extending ERP modules, wiring `apps/web` composition roots, or auditing package governance and schema ownership.

`packages/erp/` organizes source code only. It is **not** a package, namespace, dependency boundary, or ownership authority. Published identity is always `@afenda/<name>`.

## Import rules

Do not publish or import:

```text
@afenda/erp
@afenda/erp/*
```

Import every package through its declared public name or approved `exports` subpath:

```ts
import { createSalesOrder } from "@afenda/sales";
```

Catalog band: **Rank 1F**. Module categories below match [MODULE-CATALOG.generated.yaml](../../docs-V2/modules/MODULE-CATALOG.generated.yaml) (`category` and `lifecycle` fields).

## Packages by module category

### Master data (`master-data`) — core

Organization masters and reference data. `activationMode: core`. Transactional document tables stay in their owning packages ([ARCH-006 consumer contract](../../docs-V2/master-data/arch-006-consumer-contract.md)).

| Folder | Published name | Lifecycle | Role |
| ------ | -------------- | --------- | ---- |
| [`master-data`](./master-data/README.md) | `@afenda/master-data` | active | Party · item · item group · warehouse · payment term · tax registration · templates · variants · change requests |

### Commercial (`commercial`)

Order-to-cash and procure-to-pay document owners. `activationMode: organization_toggle`.

| Folder | Published name | Lifecycle | Role |
| ------ | -------------- | --------- | ---- |
| [`sales`](./sales/README.md) | `@afenda/sales` | active | Sales order / line sole mutator |
| [`purchasing`](./purchasing/README.md) | `@afenda/purchasing` | active | Purchase order / line sole mutator |
| [`receivables`](./receivables/README.md) | `@afenda/receivables` | active | Sales invoice · credit note · customer allocation · balance projection |
| [`payables`](./payables/README.md) | `@afenda/payables` | active | Supplier invoice · credit note · allocation · balance projection · three-way match |
| [`payments`](./payments/README.md) | `@afenda/payments` | active | Payment · allocation · reversal (`direction = refund` for refunds) |

### Supply chain (`supply-chain`)

Inventory and logistics document owners. `activationMode: organization_toggle`.

| Folder | Published name | Lifecycle | Role |
| ------ | -------------- | --------- | ---- |
| [`inventory`](./inventory/README.md) | `@afenda/inventory` | active | Stock movement · balance · reservation · ledger entry |
| [`receiving`](./receiving/README.md) | `@afenda/receiving` | active | Goods receipt · line · discrepancy |
| [`fulfillment`](./fulfillment/README.md) | `@afenda/fulfillment` | active | Delivery · pick · pack · proof of delivery |

### Commercial / finance (`commercial/finance`)

General ledger and period control. `activationMode: organization_toggle`.

| Folder | Published name | Lifecycle | Role |
| ------ | -------------- | --------- | ---- |
| [`accounting`](./accounting/README.md) | `@afenda/accounting` | active | CoA · journal · ledger posting · accounting period · posting profiles · source posting links |

### People (`erp`)

Workforce and payroll bounded contexts. `activationMode: organization_toggle`.

| Folder | Published name | Lifecycle | Role |
| ------ | -------------- | --------- | ---- |
| [`human-resources`](./human-resources/README.md) | `@afenda/human-resources` | scaffolded | Employee · employment · recruitment · lifecycle · time · leave · performance · talent · learning · compensation (`hr_*`) |
| [`payroll`](./payroll/README.md) | `@afenda/payroll` | active | Payroll setup · inputs · runs · statutory · payslips · reconciliation (`payroll_*`) |

## Boundaries

ERP packages are independent bounded contexts. Physical placement in `packages/erp/` does not grant peer dependency rights.

Peer collaboration is allowed only through:

- application-injected ports at the `apps/web` composition root;
- registered domain events via `@afenda/events`;
- approved projections or query contracts;
- explicitly registered dual-control edges.

Every workspace dependency must be declared in both the consuming package manifest and the [workspace edge register](../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

An ERP package may read foreign-owned data only through an approved contract or registered read edge. It must never insert, update, or delete tables owned by another package. Write ownership is defined by the [schema ownership manifest](../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml).

**Allowance and deduction four-way ownership (HR Slice 8.6):** `@afenda/human-resources` entitlement/agreement · `@afenda/payroll` calculation · `@afenda/accounting` posting · `@afenda/payments` disbursement. SSOT: [allowance-deduction-ownership.md](../../docs-V2/_scratch/erp/allowance-deduction-ownership.md).

**Typical registered upstream deps (not peer ERP):** `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/search` (as approved per package). Master-data backbone edges for transactional consumers are registered — not lateral transactional imports by default.

**Tenancy:** All ERP mutations and queries are organization-scoped (`organization_id`) on the shared Neon schema — not multi-DB or project-per-tenant isolation. See [docs-V2/tenancy](../../docs-V2/tenancy/README.md).

## Maintain

Run package-local checks from the repo root:

```bash
pnpm --filter @afenda/<name> lint
pnpm --filter @afenda/<name> typecheck
pnpm --filter @afenda/<name> test
```

Repo-wide governance gates that cover ERP manifests, edges, and ownership:

```bash
pnpm governance:packages
pnpm validate:modules
pnpm audit:tenancy-nulls
```

Regenerate module catalog output after manifest changes:

```bash
pnpm validate:modules:write
```

Per-package consume and maintain detail lives in each child [README](./master-data/README.md) (for example `./sales/README.md`).

## Scaffolding

Theory, folder layout, manifest-first workflow, ports, and new-package checklist:

**[SCAFFOLDING.md](./SCAFFOLDING.md)**

## Adding an ERP package

Do not create a new ERP package without:

1. an approved [module-roadmap](../../docs-V2/modules/MODULE-ROADMAP.yaml) entry;
2. a defined bounded context and write ownership;
3. a package catalog entry (via `module.manifest.ts` → `pnpm validate:modules:write`);
4. registered workspace edges;
5. required governance validation updates;
6. a passing `pnpm governance:packages` gate.

New packages nest under `packages/erp/<name>/` with published name `@afenda/<name>`.

## Authority

- Parent catalog: [packages/README.md](../README.md)
- Package governance: [PACKAGE-GOVERNANCE.md](../../docs-V2/modules/PACKAGE-GOVERNANCE.md)
- Module categories (generated): [MODULE-CATALOG.generated.yaml](../../docs-V2/modules/MODULE-CATALOG.generated.yaml)
- Workspace edges: [WORKSPACE-EDGE-REGISTER.yaml](../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml)
- Schema ownership: [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml)
- Module roadmap: [MODULE-ROADMAP.yaml](../../docs-V2/modules/MODULE-ROADMAP.yaml)
- Monorepo governance: [docs-V2/monorepo](../../docs-V2/monorepo/README.md)
- Agent checkout posture: [AGENTS.md](../../AGENTS.md)
