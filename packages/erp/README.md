# ERP — Rank 1F

Repository category for organization-scoped ERP bounded-context packages.

This folder organizes source code only. It is not a package, namespace, dependency boundary, or ownership authority.

Do not publish or import:

```text
@afenda/erp
@afenda/erp/*
```

Import every package through its declared public name or approved exports subpath:

```ts
import { createSalesOrder } from "@afenda/sales";
```

| Package                                  | Published name        |
| ---------------------------------------- | --------------------- |
| [`master-data`](./master-data/README.md) | `@afenda/master-data` |
| [`sales`](./sales/README.md)             | `@afenda/sales`       |
| [`purchasing`](./purchasing/README.md)   | `@afenda/purchasing`  |
| [`inventory`](./inventory/README.md)     | `@afenda/inventory`   |
| [`receiving`](./receiving/README.md)     | `@afenda/receiving`   |
| [`fulfillment`](./fulfillment/README.md) | `@afenda/fulfillment` |
| [`receivables`](./receivables/README.md) | `@afenda/receivables` |
| [`payables`](./payables/README.md)       | `@afenda/payables`    |
| [`payments`](./payments/README.md)       | `@afenda/payments`    |
| [`accounting`](./accounting/README.md)   | `@afenda/accounting`  |

## Boundaries

ERP packages are independent bounded contexts. Physical placement in this folder does not grant peer dependency rights.

Peer collaboration is allowed only through:

* application-injected ports;
* registered domain events;
* approved projections or query contracts;
* explicitly registered dual-control edges.

Every workspace dependency must be declared in both the consuming package manifest and the workspace edge register.

An ERP package may read foreign-owned data only through an approved contract or registered read edge. It must never insert, update, or delete tables owned by another package. Write ownership is defined by the schema ownership manifest.

## Adding an ERP package

Do not create a new ERP package without:

1. an approved module-roadmap entry;
2. a defined bounded context and write ownership;
3. a package catalog entry;
4. registered workspace edges;
5. required governance validation updates;
6. a passing package-governance gate.

## Authority

* Package catalog: [packages/README.md](../README.md)
* Workspace edges: [WORKSPACE-EDGE-REGISTER.yaml](../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml)
* Schema ownership: [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml)
* Module roadmap: [MODULE-ROADMAP.yaml](../../docs-V2/modules/MODULE-ROADMAP.yaml)
* Monorepo governance: [docs-V2/monorepo](../../docs-V2/monorepo/README.md)
