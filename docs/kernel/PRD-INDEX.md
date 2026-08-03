# AFENDA Kernel Package PRD Index

This kit decomposes the normative kernel governance registry into **17 individual package PRDs**, one for each admitted bounded reusable capability.

| No. | Package | Band | Kind | Persistence | Criticality | Individual PRD |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | [errors PRD](package-specs/foundation/errors/PRD.md) |
| 2 | `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | [ids PRD](package-specs/foundation/ids/PRD.md) |
| 3 | `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | [money PRD](package-specs/foundation/money/PRD.md) |
| 4 | `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | [quantity PRD](package-specs/foundation/quantity/PRD.md) |
| 5 | `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | [temporal PRD](package-specs/foundation/temporal/PRD.md) |
| 6 | `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | [codes PRD](package-specs/foundation/codes/PRD.md) |
| 7 | `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | [tenancy PRD](package-specs/foundation/tenancy/PRD.md) |
| 8 | `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | [authz PRD](package-specs/foundation/authz/PRD.md) |
| 9 | `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | [idempotency PRD](package-specs/runtime/idempotency/PRD.md) |
| 10 | `@afenda/events` | `runtime` | `CLOSED` | `NONE` | C1 | [events PRD](package-specs/runtime/events/PRD.md) |
| 11 | `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | [observability PRD](package-specs/runtime/observability/PRD.md) |
| 12 | `@afenda/env` | `runtime` | `CLOSED` | `NONE` | C2 | [env PRD](package-specs/runtime/env/PRD.md) |
| 13 | `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | [db PRD](package-specs/data-plane/db/PRD.md) |
| 14 | `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | [outbox PRD](package-specs/data-plane/outbox/PRD.md) |
| 15 | `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | [audit PRD](package-specs/data-plane/audit/PRD.md) |
| 16 | `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | [numbering PRD](package-specs/data-plane/numbering/PRD.md) |
| 17 | `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | [read-models PRD](package-specs/data-plane/read-models/PRD.md) |

## Authority model

1. `sources/KERNEL-GOVERNANCE.md` remains the normative governance source.
2. These PRDs define package-specific product behavior, architecture trees, tests, and sequential implementation slices.
3. Workspace registers and frozen admission contracts must supply named owners, exact consumers, final dependency edges, compatibility windows, and measurable budgets.
4. A PRD does not create authority to implement a package absent from the admission registry.

## Documentation placement

```text
docs/kernel/package-specs/<band>/<package>/PRD.md
```

Production source mirrors the admitted band/package identity:

```text
packages/<band>/<package>/
```

## Review order

1. Foundation semantics: errors → ids → temporal → codes → tenancy → authz → money → quantity.
2. Runtime mechanisms: env → events → observability → idempotency.
3. Data plane: db → audit → outbox → numbering → read-models.

The order is a delivery proposal, not a dependency-edge authority. The final workspace-edge register controls admissible edges.
