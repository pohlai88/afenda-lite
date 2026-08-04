# Kernel package PRD index (operative)

Normative governance: [`KERNEL-GOVERNANCE.md`](./KERNEL-GOVERNANCE.md).

**Canonical machine register:** `governance/kernel/package-registry.ts` (`KERNEL_PACKAGES`). This index is a derived projection; drift from the register is a build failure (`pnpm check:kernel-governance`).

Individual PRDs live under admitted packages when present. For `@afenda/errors`, the operative PRD is [`foundation/errors/docs/PRD.md`](./foundation/errors/docs/PRD.md) with sibling `CONTRACT.md` and `ADMISSION.md`.

| No. | Package | Band | Kind | Persistence | Criticality | Admission state | Individual PRD |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `@afenda/config` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | _not authored_ |
| 2 | `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | `ADMITTED` | [`foundation/errors/docs/PRD.md`](./foundation/errors/docs/PRD.md) |
| 3 | `@afenda/env` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | _not authored_ |
| 4 | `@afenda/testing` | `foundation` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | _not authored_ |
| 5 | `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | _not authored_ |
| 6 | `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | _not authored_ |
| 7 | `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | `PLANNED` | _not authored_ |
| 8 | `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | _not authored_ |
| 9 | `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | `PLANNED` | _not authored_ |
| 10 | `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | _not authored_ |
| 11 | `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | `PLANNED` | _not authored_ |
| 12 | `@afenda/logger` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | _not authored_ |
| 13 | `@afenda/http` | `runtime` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | _not authored_ |
| 14 | `@afenda/security` | `runtime` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | _not authored_ |
| 15 | `@afenda/metrics` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | _not authored_ |
| 16 | `@afenda/openapi` | `runtime` | `CLOSED` | `NONE` | C2 | `PROVISIONAL` | _not authored_ |
| 17 | `@afenda/rate-limit` | `runtime` | `CLOSED` | `INJECTED` | C1 | `PROVISIONAL` | _not authored_ |
| 18 | `@afenda/cache` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | _not authored_ |
| 19 | `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | `PLANNED` | _not authored_ |
| 20 | `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | `PLANNED` | _not authored_ |
| 21 | `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PROVISIONAL` | _not authored_ |
| 22 | `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PROVISIONAL` | _not authored_ |
| 23 | `@afenda/events` | `data-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | _not authored_ |
| 24 | `@afenda/search` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | _not authored_ |
| 25 | `@afenda/notifications` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PROVISIONAL` | _not authored_ |
| 26 | `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | `PLANNED` | _not authored_ |
| 27 | `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | `PLANNED` | _not authored_ |
| 28 | `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | `PLANNED` | _not authored_ |
| 29 | `@afenda/auth` | `control-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | _not authored_ |
| 30 | `@afenda/admin` | `control-plane` | `CLOSED` | `NONE` | C1 | `PROVISIONAL` | _not authored_ |

## Errors requirement families

`KRN-ID-*`, `KRN-OWN-*`, `KRN-CTR-*`, `KRN-BND-*`, `KRN-SEC-*`, `KRN-QUA-*`,
`KRN-NFR-*`, `KRN-REL-*`, `KRN-DOC-*`, `KRN-ING-*`, `KRN-PRJ-*`.

`KRN-STO-*` is `NOT_APPLICABLE` for `@afenda/errors` (persistence `NONE`).

## Review order

1. Foundation: errors → ids → temporal → codes → tenancy → authz → money → quantity.
2. Runtime: env → events → observability → idempotency.
3. Data plane: db → audit → outbox → numbering → read-models.
