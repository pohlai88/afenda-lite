# `@afenda/errors` — admission contract (draft)

| Field | Value |
| --- | --- |
| Status | Draft — awaiting named signatories |
| Package | `@afenda/errors` |
| Physical path | `packages/foundation/errors` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Governing authority | [`packages/KERNEL-GOVERNANCE.md`](../../../KERNEL-GOVERNANCE.md) |
| Product PRD | [`PRD.md`](./PRD.md) |
| Semantic SSOT | [`CONTRACT.md`](./CONTRACT.md) |

This record satisfies the admission *shape* required by KERNEL-GOVERNANCE §4.
It is not admission approval until named humans sign and workspace registers
record the same values.

## 1. Admitted capability

Canonical outcome representation, code space, retry semantics, and normalization
of unknown or vendor failures.

## 2. Explicit non-ownership

- Domain-local outcome taxonomies
- Locale translation resources
- Framework HTTP response constructors
- Persistence, audit, outbox, or tenancy policy
- Cross-domain registry of business codes

## 3. Owners (signatories required)

| Role | Named human | Signature / date |
| --- | --- | --- |
| Package owner | _unassigned_ | |
| Architecture owner | _unassigned_ | |
| Security owner (C1) | _unassigned_ | |

## 4. Runtime and entrypoints

| Surface | Value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | None |
| Authorized runtime dependency edges | None |

## 5. Accepted production consumer classes

Exact package names must replace these classes before admission PASS:

- Admitted kernel packages that return `@afenda/errors` outcomes
- ERP / platform packages constructing or normalizing shared failures
- Application composition layers projecting outcomes to transport

Living cutover evidence: 834 canonical consumers (`check:errors-semantics`).

## 6. Admission decisions

| Decision | Result | Notes |
| --- | --- | --- |
| Ownership | PASS (proposed) | Sole owner of the admitted capability |
| Policy neutrality | PASS (proposed) | No org/workflow/legal disposition |
| Jurisdiction portability | PASS (proposed) | Representation only |
| Reuse portability | PASS (proposed) | Pure foundation leaf |

## 7. Applicability triggers

| Family | Result |
| --- | --- |
| Ingress | APPLICABLE |
| Derived projections | APPLICABLE |
| Persistent storage | NOT_APPLICABLE |
| Multi-target isolation | NOT_APPLICABLE |
| C1 threat model | APPLICABLE |

## 8. Compatibility profile

| Dimension | Policy |
| --- | --- |
| Source / TypeScript | Root named capabilities; additive within major |
| Runtime | `pure`; no I/O on default entrypoint |
| Wire | Emit `afenda.failure/v1`; read V1 + retained legacy flat |
| OpenAPI | Registry-derived responses; `{ error: ... }` body wrapper |

## 9. Measurable budgets

Recorded in [`PRD.md`](./PRD.md) §15 (bundle ceilings and `ERROR_LIMITS`).

## 10. Approval

Admission is incomplete until:

1. All three owner rows name distinct humans where dual-control requires it.
2. Exact consumer package list is frozen.
3. Workspace package register and workspace-edge register match this contract.
4. Package owner + architecture owner + security owner record PASS.

## 11. Enforcement profiles

Declared trust mechanisms for `@afenda/errors` (`governance/kernel/enforcement-contracts.ts`):

| Profile | Mechanism | Rationale |
| --- | --- | --- |
| `root-capability` | Root `"."` export only; named capabilities at package boundary | Consumers depend on capabilities, not internal modules |
| `nominal-mint` | Private brand + canonical mint paths for `Failure` / `Result` | Prevents structural forgery of trusted outcomes |
| `runtime-opaque` | WeakMap-backed trust for runtime `Failure` identity | Opaque authority values cannot be reconstructed off-registry |
| `registry-authority` | Frozen `ERROR_REGISTRY` owns canonical codes and retry policy | One semantic owner for code space and projections |
| `projection-boundary` | Wire/OpenAPI/HTTP projections lose mint authority at the boundary | Transport shapes carry data, not construction rights |

Governance gates: `errors-boundary`, `errors-semantics`.
