# `@afenda/errors` — Product Requirements Document

| Field | Value |
| --- | --- |
| Document type | Individual kernel package PRD |
| Status | Capability implemented and package-cutover sealed; KERNEL-GOVERNANCE formalization open |
| Package | `@afenda/errors` |
| Physical path | `packages/foundation/errors` |
| Band | `foundation` |
| Kernel kind | `CLOSED` |
| Persistence mode | `NONE` |
| Criticality | `C1` |
| Runtime target | `pure` |
| Governing authority | [`packages/KERNEL-GOVERNANCE.md`](../../../KERNEL-GOVERNANCE.md) |
| Semantic control-plane SSOT | [`CONTRACT.md`](./CONTRACT.md) |
| Consumer entry | [`../README.md`](../README.md) |
| Admission draft | [`ADMISSION.md`](./ADMISSION.md) |
| Inspector | `node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/foundation/errors` |
| Capability owner | Package Owner role; named human recorded in the admission contract |
| Architecture owner | Architecture Owner role; named human recorded in the admission contract |
| Security owner | Required for C1 admission, verification, and seal |

> This PRD defines one package capability. It does not override KERNEL-GOVERNANCE, the workspace package register, the frozen admission contract, the workspace-edge register, or the machine-readable requirement register. Living package semantics remain owned by `CONTRACT.md`; this PRD maps product behavior, topology, and governance closure to that sealed contract.

**Placement.** This file is the operative individual kernel package PRD under `packages/foundation/errors/docs/`. Kernel doctrine projections are `packages/KERNEL-GOVERNANCE.md` and `packages/KERNEL-PRD-INDEX.md`; the machine register is `governance/kernel/`. Do not restore a dual package-root `PRD.md` or recreate retired `docs/kernel/**` kit paths.

**Authority stack**

1. `packages/KERNEL-GOVERNANCE.md` — requirement semantics and lifecycle.
2. Frozen admission contract + workspace registers — identity, owners, consumers, edges, budgets.
3. `CONTRACT.md` + disk — semantic control plane.
4. This PRD — product behavior, slices, definition of done.
5. Package README — consumer/maintainer explanation only.

Package cutover is recorded in `CONTRACT.md` and living gates; it is not a KERNEL-GOVERNANCE digest-bound seal and is not Module Enterprise Readiness.

---

## 1. Product/capability statement

**Admitted capability:** Canonical outcome representation, code space, retry semantics, and normalization of unknown or vendor failures.

**Problem.** Without one outcome kernel, packages invent incompatible error codes, leak vendor diagnostics, disagree on retryability, and force consumers to branch on transport-specific exceptions or implementation constructors.

**Living state.** The repository cutover is complete: one modular `ERROR_REGISTRY`, five named root capabilities, opaque `Failure` identity, derived Result/HTTP/diagnostics/wire/OpenAPI projections, root-only `package.json.exports`, and permanent boundary/semantic gates. Historical subpaths and `AppError` are deleted.

## 2. Goals

1. One logically singular, physically modular semantic registry for shared failure meaning.
2. One root entrypoint with tree-shakeable named capability objects.
3. Code-narrowable `Result<T, C>` and opaque in-process `Failure<C>`.
4. Canonical-only construction; historical aliases only at owned ingress.
5. Exhaustive per-code retry policy; only approved bounded timing varies per occurrence.
6. Derived public payload (`PublicErrorData<C>`) shared by Result, HTTP, wire, and OpenAPI.
7. Permanent typed-AST boundary and semantic governance so internal hardening does not become a repository migration.

## 3. Explicit non-goals and non-ownership

- Domain-local outcome unions that never cross an owned public boundary.
- Translation resources or locale selection (registry owns `messageKey` + English fallback only).
- Next.js / framework response constructors inside this Rank-1 leaf.
- Runtime dependencies on Drizzle, `pg`, Prisma, Zod, or other `@afenda/*` packages.
- Consumer-selected `/v1` or `/v2` APIs, deprecated facades, or parallel Result types.
- Logging platforms, incident management, or UI copy catalogs.
- Organization-specific, workflow-specific, legal, tax, or accounting dispositions.

**Not non-goals:** registry-derived HTTP status/body/header projection, OpenAPI response projection, and versioned wire serialization. Those are owned projections of the admitted capability. Route handlers apply projections; they do not reinterpret codes.

## 4. Consumers and jobs to be done

**Candidate production consumer classes** — exact package names freeze in the admission contract:

- Other admitted kernel packages that return representable failures.
- ERP and platform packages that construct or normalize shared failures.
- Application composition / BFF layers that project outcomes to transport.

Living scan evidence (cutover): 834 canonical consumers; 0 partial consumers; 0 prohibited interpretation findings (`check:errors-semantics`).

Consumer jobs:

1. Import only `@afenda/errors` (root).
2. Construct successes/failures through `errorResult`.
3. Normalize unknown/PostgreSQL/wire input through `errorIngress` / `errorWire`.
4. Request approved projections through `errorProject` / `errorOpenApi`.
5. Carry and declare canonical codes; never derive shared HTTP, retry, wording, or operational classification from codes.

## 5. Admission decisions

| Decision | Required result | Package-specific interpretation |
| --- | --- | --- |
| Ownership | PASS | Sole owner of shared failure codes, retry, public wording policy, typed public details, and derived projections within the admitted capability. |
| Policy neutrality | PASS | No org-, customer-, or workflow-specific disposition; domain packages normalize owned outcomes at their boundary. |
| Jurisdiction portability | PASS | Codes and messages are universal representation; legal/tax/eligibility conclusions stay outside. |
| Reuse portability | PASS | Pure foundation leaf; no app/framework coupling; reusable across registered consumers. |

## 6. Runtime and dependency contract

| Surface | Admission value |
| --- | --- |
| Permitted runtime targets | `pure` |
| Default entrypoint | `.` |
| Auxiliary entrypoints | None |
| Authorized dependency edges | None (runtime). Dev-only: `@afenda/config`, TypeScript, Vitest, Vite, `@types/node` |
| `package.json` | `private: true`, `type: "module"`, `sideEffects: false`, exports only `"."` |

## 7. Canonical records and public types

Canonical owner: modular definitions under `src/contract/definitions/*` composed into `ERROR_REGISTRY`.

Derived public types (not hand-maintained parallel unions):

| Type | Role |
| --- | --- |
| `CanonicalErrorCode` | Exhaustive shared code set |
| `Result<T, C>` / `ResultSuccess` / `ResultFailure` | Public operation outcome |
| `Failure<C>` | Opaque trusted in-process identity |
| `PublicErrorData<C>` | Shared public payload |
| `MessageKeyFor<C>` | Registry message key |
| `RetryDisposition<C>` | Package-produced retry projection |
| `RetryAfterSeconds` | Branded bounded timing |
| `PublicFieldErrors` | Validation details shape |
| `SerializedFailureEnvelope<C>` | Wire `afenda.failure/v1` |
| `OpenApiResponsesProjection<C>` | Declared endpoint error responses |
| `FailureContext` / `FailureInput` / `ResultFailureInput` | Construction inputs |

Do not root-export: alias ledgers, `AppError`, registry definition objects, sanitation helpers, SQLSTATE tables, or serializer internals.

### 7.1 Canonical codes

| Code | HTTP | Retryable | Message policy | Public details |
| --- | ---: | --- | --- | --- |
| `BAD_REQUEST` | 400 | No | `sanitized-override` | none |
| `UNAUTHORIZED` | 401 | No | `fixed` | none |
| `FORBIDDEN` | 403 | No | `fixed` | none |
| `NOT_FOUND` | 404 | No | `sanitized-override` | none |
| `CONFLICT` | 409 | No | `sanitized-override` | none |
| `CONCURRENCY_CONFLICT` | 409 | Yes | `fixed` | none |
| `VALIDATION_ERROR` | 422 | No | `sanitized-override` | `fieldErrors` only |
| `RATE_LIMITED` | 429 | Yes | `fixed` | optional `retryAfterSeconds` |
| `INTERNAL_ERROR` | 500 | No | `fixed` | optional `correlationId` |
| `SERVICE_UNAVAILABLE` | 503 | Yes | `fixed` | none |

## 8. Functional operations

Permanent consumer surface (named capability objects only):

| Capability | Operations |
| --- | --- |
| `errorResult` | `ok`, `fail`, `retryAfterSeconds`, `withContext`, `context` |
| `errorIngress` | `code`, `unknown`, `postgres` |
| `errorProject` | `result`, `http`, `diagnostics`, `retry` |
| `errorWire` | `serialize`, `deserialize` |
| `errorOpenApi` | `responses` |

| No. | Required behavior |
| ---: | --- |
| 01 | `errorResult.ok(data)` returns `{ ok: true, data }`. |
| 02 | `errorResult.fail(code, input?)` constructs typed `ResultFailure` with registry message/details policy. |
| 03 | `errorResult.retryAfterSeconds(n)` brands integers in `[1, 86400]` or throws `RangeError`. |
| 04 | `errorResult.withContext` / `context` attach/read private in-process domain context (never public/wire). |
| 05 | `errorIngress.code` creates opaque `Failure` with required operation context. |
| 06 | `errorIngress.unknown` is total over `unknown`; trusted same-instance `Failure` passes through. |
| 07 | `errorIngress.postgres` returns only `CONFLICT` \| `CONCURRENCY_CONFLICT` \| `SERVICE_UNAVAILABLE` \| `INTERNAL_ERROR`. |
| 08 | `errorProject.result` / `http` / `diagnostics` / `retry` derive solely from registry + approved occurrence data. |
| 09 | `errorWire.serialize` emits `{ schema: "afenda.failure/v1", error }`; deserialize accepts V1 + retained flat historical shape. |
| 10 | `errorOpenApi.responses(codes)` groups by status with deterministic `oneOf` for shared statuses. |

## 9. Normative package invariants

| Invariant ID | Requirement | Primary `KRN-*` |
| --- | --- | --- |
| ERRORS-INV-001 | Public failures never expose causes, stacks, secrets, SQL, vendor payloads, or private diagnostics. | KRN-SEC-001/002 |
| ERRORS-INV-002 | Every canonical code has exactly one retry classification; consumers cannot override it. | KRN-OWN-001 |
| ERRORS-INV-003 | Unknown/hostile ingress never escapes as an unhandled throw from package normalization paths. | KRN-ING-006 |
| ERRORS-INV-004 | Public discriminants and payload keys remain stable within a major version. | KRN-CTR-006 |
| ERRORS-INV-005 | New construction accepts canonical codes only; aliases normalize at ingress and are never emitted. | KRN-ING-003/004/005 |
| ERRORS-INV-006 | `PublicErrorData<C>` is the single public payload shape across Result, HTTP, wire, and OpenAPI. | KRN-PRJ-001 |
| ERRORS-INV-007 | `Failure` trust is private-map identity, not structural branding. | KRN-SEC-008 |
| ERRORS-INV-008 | Public message overrides resolve to static source text; runtime sanitation is defense in depth. | KRN-SEC-001, KRN-QUA-001 |
| ERRORS-INV-009 | Capability methods are not rebinding/escape hatches; AST gates reject extraction and dynamic wording. | KRN-CTR-003 |
| ERRORS-INV-010 | Foundation default entrypoint performs no I/O and has no ambient runtime dependency. | KRN-BND-004 |

## 10. Failure and outcome model

- Public outcomes use `Result<T, C>` discriminated by `ok`.
- Opaque boundary failures use `Failure<C>` with private `WeakMap` records.
- Normalization fallback is `INTERNAL_ERROR` with fixed public wording.
- Invalid public detail shapes fail closed (type fixtures + runtime bounds); no silent widening.
- Domain context attached via `withContext` is never enumerable, serializable, or public.

## 11. Ingress and normalization

Triggered paths under `src/ingress/` and wire deserialize:

| Path | Input | Outcome |
| --- | --- | --- |
| `errorIngress.code` | Canonical code + `FailureInput` | Opaque `Failure` |
| `errorIngress.unknown` | `unknown` + context | Trusted pass-through or `INTERNAL_ERROR` |
| `errorIngress.postgres` | `unknown` + context | Closed `PostgresFailureCode` union |
| `errorWire.deserialize` | `unknown` envelope | Opaque `Failure`; hostile → safe `INTERNAL_ERROR` |

Aliases live in the private historical ledger; they normalize immediately and never appear in new construction or emission. Wire and structured payloads enforce `ERROR_LIMITS` (depth, keys, bytes, field windows).

## 12. Persistence and transaction model

Not applicable. Persistence mode is `NONE`.

- No store contract, schema ownership, or persistence adapter.
- `KRN-STO-*` evaluates to `NOT_APPLICABLE` with false trigger.

## 13. Events, integrations, and composition

- BFF/app layers apply `errorProject.http` to framework responses; this package does not import Next.js/React.
- OpenAPI document generation consumes `errorOpenApi.responses`.
- Workers consume `errorProject.retry` and apply their own attempt/backoff configuration.
- Cross-process boundaries use `errorWire` only.

No `apps/*` imports, undeclared internal-path consumption, or process-global tenant/request singletons.

## 14. Tenancy, privacy, and security

- Private diagnostics and causes remain unreachable from public projections.
- Field-error keys reject `__proto__`, `constructor`, and `prototype`.
- Correlation IDs use one normalizer; invalid values are omitted, never truncated into public output.
- C1 before KERNEL `VERIFIED`: approved threat-model review, SBOM, high+ vulnerability gate, negative-path security tests.

## 15. Non-functional requirements

| Budget | Value | Evidence owner |
| --- | --- | --- |
| Result-only bundle (UTF-8, unminified) | ≤ 40,960 bytes | `test:bundle` |
| Retry-only bundle | ≤ 40,960 bytes | `test:bundle` |
| Wire-only bundle | ≤ 53,248 bytes | `test:bundle` |
| OpenAPI-only bundle | ≤ 49,152 bytes | `test:bundle` |
| Public message | ≤ 500 chars / 2000 UTF-8 bytes | `ERROR_LIMITS` |
| Public details | ≤ 16,384 UTF-8 bytes | `ERROR_LIMITS` |
| Wire envelope | depth ≤ 6, keys ≤ 64, ≤ 32,768 bytes | `ERROR_LIMITS` |
| Retry-after seconds | integer 1…86,400 | `errorResult.retryAfterSeconds` |

Additional NFR rules:

- Pure determinism for identical explicit classification input.
- Default entrypoint has no network, filesystem, database, env, or process-global I/O.
- Compatibility dimensions: source, runtime, wire (`afenda.failure/v1` + retained flat historical deserialize), generated OpenAPI consumer docs.

## 16. Conditional applicability resolution

| Trigger family | Result | Reason |
| --- | --- | --- |
| Ingress (`KRN-ING-*`) | APPLICABLE | Unknown, vendor, alias, and wire input accepted |
| Derived projections (`KRN-PRJ-*`) | APPLICABLE | Derived types, maps, schemas, OpenAPI/wire projections (no `src/generated/` required) |
| Persistent storage (`KRN-STO-*`) | NOT_APPLICABLE | Persistence mode `NONE` |
| Multi-target isolation (`KRN-BND-007`) | NOT_APPLICABLE | Single target `pure` |
| Auxiliary entrypoints (`KRN-CTR-002`) | NOT_APPLICABLE | None declared |
| C1 threat model (`KRN-SEC-007`) | APPLICABLE | Criticality C1 |
| Mutation testing (`KRN-QUA-010`) | APPLICABLE | C1 retry/parser/normalize/state paths |

`NOT_APPLICABLE` is valid only when the machine-readable requirement register evaluates the trigger as false.

## 17. Architecture tree

Living topology (create modules only with complete implementation — no decorative directories):

```text
packages/foundation/errors/
├── README.md
├── docs/
│   ├── README.md
│   ├── PRD.md
│   ├── CONTRACT.md
│   └── ADMISSION.md
├── package.json
├── src/
│   ├── index.ts
│   ├── public-types.ts
│   ├── capabilities/          # result, ingress, project, wire, openapi
│   ├── contract/              # define-error, registry, definitions/*, aliases, bounds, details, invariants, openapi-metadata
│   ├── failure/               # types, identity, create, context
│   ├── result/                # ok, fail, context
│   ├── ingress/               # code, unknown, postgres
│   ├── project/               # result, retry, http, diagnostics, public-data
│   ├── openapi/               # types, responses
│   ├── wire/                  # types, schema, serialize, deserialize, historical
│   ├── security/              # normalize
│   └── internal/              # object, public-error-data
├── __tests__/                 # contract, failure, ingress, projections, wire, type-fixtures, bundle-fixtures, ast-fixtures
└── scripts/                   # check-contract, check-boundary, check-semantics
```

### 17.1 File responsibility register (summary)

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Explicit named public exports only |
| `src/contract/definitions/*` | Authored canonical definitions by category |
| `src/contract/registry.ts` | Compose/freeze `ERROR_REGISTRY` |
| `src/capabilities/*` | Thin frozen capability facades |
| `src/failure/*` | Opaque identity and internal records |
| `src/ingress/*` | Boundary normalization |
| `src/project/*` | Derived projections |
| `src/wire/*` | Versioned serialize/deserialize |
| `src/openapi/*` | OpenAPI response projection |
| `docs/PRD.md` | Individual kernel package PRD (this document) |
| `scripts/check-*.ts` | Package contract, bundle, and semantic checks |

### 17.2 Facade rules

- `"."` is the sole business entrypoint; no auxiliary business surfaces.
- No raw clients, mutable adapters, internal registries, or SQL objects exported.
- Consumers import `@afenda/errors` only.
- Capability files contain composition redirects; policy lives in registry/owning modules.

## 18. Test and evidence contract

### 18.1 Requirement families

`KRN-ID-*`, `KRN-OWN-*`, `KRN-CTR-*`, `KRN-BND-*`, `KRN-SEC-*`, `KRN-QUA-*`, `KRN-NFR-*`, `KRN-REL-*`, `KRN-DOC-*`, `KRN-ING-*`, `KRN-PRJ-*`.

Not applicable: `KRN-STO-*`.

### 18.2 Living gates (already green at package cutover)

| Gate | Command / artifact |
| --- | --- |
| Lint / typecheck | `pnpm --filter @afenda/errors lint` · `typecheck` |
| Contract + runtime + semantics + bundle | `pnpm --filter @afenda/errors test` |
| Repository boundary | `pnpm check:errors-boundary` |
| Repository semantics | `pnpm check:errors-semantics` |
| OpenAPI | `pnpm check:openapi` |
| Inspector | `inspect-target.mjs packages/foundation/errors` |

### 18.3 KERNEL `VERIFIED` gaps (enterprise launch blockers for governance seal)

These block KERNEL-GOVERNANCE `VERIFIED` / digest-bound seal. They do not reopen the semantic cutover.

| Gap | Required evidence |
| --- | --- |
| G1 Formal admission contract | Named owners, exact consumers, budgets, four PASS decisions, compatibility windows |
| G2 Workspace package + edge registers | Registered identity and zero runtime dependency edges |
| G3 Machine-readable requirement register | Every applicable `KRN-*` ID → gate → evidence kind |
| G4 Coverage ≥ 90% branch | `test:coverage` (or equivalent recorded CI) |
| G5 Mutation ≥ 70% on C1 paths | `test:mutation` for retry/parser/normalize |
| G6 SBOM + high+ vuln scan | Security gate artifacts |
| G7 C1 threat-model approval | Controlled inspection record |
| G8 Budgets / compatibility / entrypoint isolation under governance names | Mapped to living bundle gates or new verify scripts |
| G9 Evidence completeness + kernel seal | `governance:kernel-evidence` / `governance:kernel-seal` when tooling exists |
| G10 `KRN-CTR-005` demo | Internal representation change with zero production-consumer edits |

A skipped, timed-out, killed, resource-starved, or unrecorded applicable gate is `FAIL`.

## 19. Implementation slices

Historical Lanes 1–7 in `CONTRACT.md` are **complete cutover evidence**. Remaining slices close KERNEL formalization; they do not rewrite the sealed facade.

| Slice | Coherent outcome | Gate to advance |
| --- | --- | --- |
| ERRORS-PRD-1 | Operative individual PRD under `docs/PRD.md`; kit dual-body pending Docs-lane sync | Doc parity vs CONTRACT + living exports |
| ERRORS-ADM-1 | Frozen admission contract with named signatories and measurable budgets | KRN-ID-* / §21 checklist |
| ERRORS-REG-1 | Workspace package + edge register entries for `@afenda/errors` | Registry/dependency gates |
| ERRORS-EVD-1 | Requirement→gate→evidence matrix for every applicable `KRN-*` | No orphan/duplicate IDs |
| ERRORS-VER-1 | One evidence-complete CI run closes G4–G10 for one content digest | KERNEL `VERIFIED` |
| ERRORS-SEAL-1 | Digest-bound KERNEL seal with C1 dual-control signatures | Seal record `VALID` |

Slices are sequential. No later slice begins while an earlier slice is non-green. No shim, stub, or deferred deletion remains in product source.

## 20. Acceptance criteria and definition of done

**Capability / package cutover (achieved):**

- Root-only named capabilities; registry owns shared semantics.
- Consumers compile through `@afenda/errors`; superseded surfaces deleted.
- Permanent boundary/semantic gates green; cutover recorded in `CONTRACT.md`.

**KERNEL `IMPLEMENTED` (capability behavior):** satisfied by living package relative to admitted capability, pending formal register/admission artifacts (G1–G3).

**KERNEL `VERIFIED`:** only when one evidence-complete CI run proves all applicable mandatory `KRN-*` requirements for one digest, including G4–G10.

**KERNEL seal:** immutable attestation for one capability, commit, and content digest after `VERIFIED`. Not release, deployment, data migration, or statutory approval.

## 21. Required admission records before claiming governance admission complete

1. Named owners and signatories (C1 includes security owner).
2. Exact accepted production consumers.
3. Exact runtime targets and confirmation of no auxiliary entrypoints.
4. Exact dependency edges in `package.json` and the workspace-edge register (empty runtime set).
5. Compatibility support windows (source/runtime/wire/OpenAPI).
6. Machine-resolved requirement applicability expressions.
7. Measurable non-functional budgets (include §15 ceilings).
8. Four admission decisions recorded as PASS.

Production source already exists from the sealed cutover; this checklist still governs KERNEL admission formalization and prevents claiming `SCAFFOLDED`/`VERIFIED` without registers.

## 22. Rejected designs

- Generic `shared` / `common` / `utils` / `core` / `types` / `registry` / umbrella `@afenda/kernel` packages.
- Public subpaths (`./result`, `./http`, `./common`, `./adapters/postgres`) or `AppError`.
- Parallel consumer Result types or code-to-status/retry/message maps.
- Wildcard exports or internal-path consumption.
- Mutable request/tenant/transaction/clock/adapter singleton.
- App/framework dependency inside the foundation leaf.
- Manually synchronized projection maps.
- Mutable lifecycle value `SEALED` (seal is attestation only).
- Treating package cutover evidence alone as KERNEL seal or Module Enterprise Readiness.
- Treating partial, skipped, or undocumented evidence as success.
- Reintroducing kit-draft APIs (`normalizeUnknown`, `isFailure`, HTTP-as-non-goal) as competing contracts.
- Dual PRD SSOT (package-root `PRD.md` beside `docs/PRD.md`) or retired Scratch trees as documentation authority.

## SEMANTIC REGISTRY RESULT

```text
SEMANTIC REGISTRY RESULT: VERIFIED (package cutover) | BLOCKED (KERNEL formalization)
Target: packages/foundation/errors
Concept: shared failure semantics / ERROR_REGISTRY
Canonical owner: src/contract/registry.ts + definitions/*
Permanent facade: package root "." (errorResult, errorIngress, errorProject, errorWire, errorOpenApi)
Compatibility: internal (docs placement only; no public API change)
Before digest: re-run inspector after docs cutover
After digest: re-run inspector (embedding digests inside protected docs races the hash)
Contract changes: operative PRD moved to docs/PRD.md; stale root PRD deleted; CONTRACT/README/ADMISSION pointers normalized
Auxiliary entrypoints: none
Derived projections: PublicErrorData, Result, HTTP, retry, diagnostics, wire, OpenAPI
Persistence boundary: not-applicable
Tenant lineage: not-applicable
Deleted surfaces: packages/foundation/errors/PRD.md (superseded by docs/PRD.md)
Consumer blast radius: 0 (documentation/governance only)
Consumers checked: n/a for docs-only
Evidence: docs/PRD.md parity vs CONTRACT + src/index.ts; pointer retarget
Remaining conditions: G1–G10 KERNEL VERIFIED gaps
```
