# Kernel package PRD index (operative)

Normative governance: [`KERNEL-GOVERNANCE.md`](./KERNEL-GOVERNANCE.md).

Individual PRDs live beside admitted packages when present. The integrated kit
under `docs/kernel/` remains a review copy and may drift until Docs-lane reopen
allows sync of `docs/kernel/package-specs/**`.

| No. | Package | Band | Kind | Persistence | Criticality | Individual PRD |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | [`foundation/errors/PRD.md`](./foundation/errors/PRD.md) |
| 2 | `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 3 | `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 4 | `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | _not authored_ |
| 5 | `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 6 | `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | _not authored_ |
| 7 | `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 8 | `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 9 | `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | _not authored_ |
| 10 | `@afenda/events` | `runtime` | `CLOSED` | `NONE` | C1 | _not authored_ |
| 11 | `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | _not authored_ |
| 12 | `@afenda/env` | `runtime` | `CLOSED` | `NONE` | C2 | _not authored_ |
| 13 | `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | _not authored_ |
| 14 | `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | _not authored_ |
| 15 | `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | _not authored_ |
| 16 | `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | _not authored_ |
| 17 | `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | _not authored_ |

## Errors requirement families

`KRN-ID-*`, `KRN-OWN-*`, `KRN-CTR-*`, `KRN-BND-*`, `KRN-SEC-*`, `KRN-QUA-*`,
`KRN-NFR-*`, `KRN-REL-*`, `KRN-DOC-*`, `KRN-ING-*`, `KRN-PRJ-*`.

`KRN-STO-*` is `NOT_APPLICABLE` for `@afenda/errors` (persistence `NONE`).

## Review order

1. Foundation: errors → ids → temporal → codes → tenancy → authz → money → quantity.
2. Runtime: env → events → observability → idempotency.
3. Data plane: db → audit → outbox → numbering → read-models.
