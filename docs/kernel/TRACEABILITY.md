# Kernel PRD Traceability Matrix

| Package | Band | Kind | Persistence | Criticality | Requirement families |
| --- | --- | --- | --- | --- | --- |
| `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/ids` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/money` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/quantity` | `foundation` | `OPEN` | `INJECTED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/temporal` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/codes` | `foundation` | `CLOSED` | `NONE` | C2 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-PRJ-* |
| `@afenda/tenancy` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/authz` | `foundation` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/idempotency` | `runtime` | `CLOSED` | `INJECTED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/events` | `runtime` | `CLOSED` | `NONE` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/observability` | `runtime` | `CLOSED` | `INJECTED` | C2 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/env` | `runtime` | `CLOSED` | `NONE` | C2 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-* |
| `@afenda/db` | `data-plane` | `CLOSED` | `OWNED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-PRJ-*, KRN-STO-* |
| `@afenda/outbox` | `data-plane` | `CLOSED` | `OWNED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/audit` | `data-plane` | `CLOSED` | `OWNED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/numbering` | `data-plane` | `OPEN` | `OWNED` | C1 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |
| `@afenda/read-models` | `data-plane` | `CLOSED` | `INJECTED` | C2 | KRN-ID-*, KRN-OWN-*, KRN-CTR-*, KRN-BND-*, KRN-SEC-*, KRN-QUA-*, KRN-NFR-*, KRN-REL-*, KRN-DOC-*, KRN-ING-*, KRN-STO-* |

## Lifecycle trace

| Lifecycle | PRD evidence |
| --- | --- |
| `SCAFFOLDED` | Admission metadata, exact topology, package/config commands, registry parity, boundary checks, initial green tests, inspector snapshot. |
| `IMPLEMENTED` | Real capability behavior, ingress rejection, projection parity, storage obligations, adapter parity, and consumer compile checks. |
| `VERIFIED` | One evidence-complete CI run for one digest, including quality, budgets, compatibility, security, SBOM, threat model where C1, and internal-refactor demonstration. |
| Seal | Immutable attestation for the verified package/capability/version/commit/content digest; never a mutable lifecycle state. |
