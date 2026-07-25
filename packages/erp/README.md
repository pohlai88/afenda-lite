# ERP (R1-F)

Category folder for organization-scoped ERP bounded-context packages.

**On disk:** `packages/erp/<name>/` — one package per folder.  
**Published identity:** `@afenda/<name>` only. This folder organizes source code; it is not a package, namespace, dependency boundary, or ownership authority.

Do not publish or import:

```text
@afenda/erp
@afenda/erp/*
```

Import every package through its declared public name or approved `exports` subpath:

```ts
import { createSalesOrder } from "@afenda/sales";
```

Catalog band: **Rank 1F**. Module categories below match [MODULE-CATALOG.generated.yaml](../../docs-V2/modules/MODULE-CATALOG.generated.yaml) (`category` field).

## Packages by module category

### Master data (`master-data`) — core

Organization masters and reference data. `activationMode: core`. Transactional document tables stay in their owning packages (ARCH-006).

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`master-data`](./master-data/README.md) | `@afenda/master-data` | Party · item · item group · warehouse · payment term · tax registration · templates · variants · change requests |

### Commercial (`commercial`)

Order-to-cash and procure-to-pay document owners. `activationMode: organization_toggle`.

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`sales`](./sales/README.md) | `@afenda/sales` | Sales order / line sole mutator |
| [`purchasing`](./purchasing/README.md) | `@afenda/purchasing` | Purchase order / line sole mutator |
| [`receivables`](./receivables/README.md) | `@afenda/receivables` | Sales invoice · credit note · customer allocation · balance projection |
| [`payables`](./payables/README.md) | `@afenda/payables` | Supplier invoice · credit note · allocation · balance projection · three-way match |
| [`payments`](./payments/README.md) | `@afenda/payments` | Payment · allocation · reversal (`direction = refund` for refunds) |

### Supply chain (`supply-chain`)

Inventory and logistics document owners. `activationMode: organization_toggle`.

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`inventory`](./inventory/README.md) | `@afenda/inventory` | Stock movement · balance · reservation · ledger entry |
| [`receiving`](./receiving/README.md) | `@afenda/receiving` | Goods receipt · line · discrepancy |
| [`fulfillment`](./fulfillment/README.md) | `@afenda/fulfillment` | Delivery · pick · pack · proof of delivery |

### Commercial / finance (`commercial/finance`)

General ledger and period control. `activationMode: organization_toggle`.

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`accounting`](./accounting/README.md) | `@afenda/accounting` | CoA · journal · ledger posting · accounting period · posting profiles · source posting links |

### Corporate administration (`erp`)

Corporate and statutory registers. `activationMode: organization_toggle`.

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`corporate-administration`](./corporate-administration/README.md) | `@afenda/corporate-administration` | Legal companies · governance · ownership · premises · property · licences · documents · filings (`ca_*`) |

### People (`erp`)

Workforce and payroll bounded contexts. `activationMode: organization_toggle`.

| Folder | Published name | Role |
| ------ | -------------- | ---- |
| [`human-resources`](./human-resources/README.md) | `@afenda/human-resources` | Employee · employment · recruitment · lifecycle · time · leave · performance · talent · learning · compensation agreements (`hr_*`) |
| [`payroll`](./payroll/README.md) | `@afenda/payroll` | Payroll setup · inputs · runs · statutory · payslips · reconciliation (`payroll_*`) |

## Boundaries

ERP packages are independent bounded contexts. Physical placement in `packages/erp/` does not grant peer dependency rights.

Peer collaboration is allowed only through:

* application-injected ports;
* registered domain events;
* approved projections or query contracts;
* explicitly registered dual-control edges.

Every workspace dependency must be declared in both the consuming package manifest and the workspace edge register.

An ERP package may read foreign-owned data only through an approved contract or registered read edge. It must never insert, update, or delete tables owned by another package. Write ownership is defined by the schema ownership manifest.

**Typical registered upstream deps (not peer ERP):** `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/search` (as approved per package). Master-data backbone edges for transactional consumers are registered — not lateral transactional imports by default.

## Scaffolding

Theory, folder layout, manifest-first workflow, ports, and new-package checklist:

**[SCAFFOLDING.md](./SCAFFOLDING.md)**

## Adding an ERP package

Do not create a new ERP package without:

1. an approved module-roadmap entry;
2. a defined bounded context and write ownership;
3. a package catalog entry;
4. registered workspace edges;
5. required governance validation updates;
6. a passing package-governance gate.

New packages nest under `packages/erp/<name>/` with published name `@afenda/<name>`.

## Authority

* Package catalog: [packages/README.md](../README.md)
* Module categories (generated): [MODULE-CATALOG.generated.yaml](../../docs-V2/modules/MODULE-CATALOG.generated.yaml)
* Workspace edges: [WORKSPACE-EDGE-REGISTER.yaml](../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml)
* Schema ownership: [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml)
* Module roadmap: [MODULE-ROADMAP.yaml](../../docs-V2/modules/MODULE-ROADMAP.yaml)
* Monorepo governance: [docs-V2/monorepo](../../docs-V2/monorepo/README.md)
