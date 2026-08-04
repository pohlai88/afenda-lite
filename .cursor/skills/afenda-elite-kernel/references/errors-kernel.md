# `@afenda/errors` kernel

Use this reference when changing `packages/foundation/errors` or applying its
public contract at an approved consumer boundary.

## Authority and state

| Field | Contract |
|-------|----------|
| Package | `@afenda/errors` |
| Target | `packages/foundation/errors` |
| Layer | Rank-1 foundation leaf; no `@afenda/*` runtime dependencies |
| Semantic authority | `packages/foundation/errors/docs/CONTRACT.md` |
| Living contract | Root barrel, registry, capability facades, tests, `package.json`, README |
| Integrity record | cutover evidence in `packages/foundation/errors/docs/CONTRACT.md` |
| Contract marker | `afenda.errors/v1` in every package TypeScript source and test |
| Owning farms | `afenda-elite-api-contract` and `afenda-elite-monorepo-discipline` |

Read `docs/CONTRACT.md` first and obey its current migration lock. Package-local
capability completion does not authorize consumer conversion or subpath
deletion.

## Permanent consumer surface

The final consumer API is the package root with five frozen named capability
objects and registry-derived public types:

| Capability | Owned operations |
|------------|------------------|
| `errorResult` | `ok`, `fail`, `retryAfterSeconds`, trusted in-process `context` / `withContext` |
| `errorIngress` | `code`, `unknown`, `postgres` |
| `errorProject` | `result`, `http`, `diagnostics`, `retry` |
| `errorWire` | `serialize`, `deserialize` |
| `errorOpenApi` | `responses` |

Consumers must not import constructors, implementation modules, policy maps,
sanitizers, alias ledgers, SQLSTATE tables, or versioned wire helpers. The final
`package.json.exports` contains only `"."`. Existing compatibility exports and
subpaths remain migration data until the single authorized cutover deletes
them; never present them as an alternative capability style.

## Invariants

1. Author shared meaning once in the modular `ERROR_REGISTRY`; derive codes,
   messages, details, HTTP, retry, operations, OpenAPI, lifecycle, and types.
2. Accept canonical codes for new construction. Normalize historical names only
   through the internal alias ledger at wire ingress.
3. Keep `Result<T, C>` discriminated by `ok` and preserve its exact code union.
4. Keep `Failure<C>` opaque and trusted only through the package-private
   `WeakMap`. Reject structural lookalikes.
5. Build public Result, HTTP, wire, and OpenAPI payloads from the same
   `PublicErrorData<C>` contract.
6. Derive retryability exhaustively from the registry. Permit only the branded,
   bounded occurrence timing authorized by a code's retry policy.
7. Keep HTTP projection atomic and framework-neutral. Do not import Next.js.
8. Keep PostgreSQL ingress explicit, total, driver-free, and restricted to its
   closed result-code union.
9. Exclude raw errors, causes, stacks, SQL, credentials, vendor payloads,
   private context, and unrestricted diagnostics from public projections.
10. Keep capability files as frozen composition redirects. Put behavior in its
    owning registry, ingress, result, project, wire, or OpenAPI module.
11. Keep all four capability bundle gates and their frozen byte ceilings. Move
    maintainer-only validation out of consumer bundles instead of raising a
    ceiling.
12. Keep the package a runtime leaf and preserve `afenda.errors/v1` contract headers.

## Mission routing

| Change | Mode | Required impact |
|--------|------|-----------------|
| Internal representation with identical public behavior | `upgrade` / `internal` | Package contract, security, bundle, and digest evidence |
| Add a capability method within the accepted root style | `upgrade` / `additive` | Facade, types, runtime fixtures, README, bundles |
| Add or change a canonical code or policy | `upgrade` / contract-impacting | Registry projections, exhaustive tests, OpenAPI, consumers |
| Change Result, HTTP, wire, or OpenAPI shape | `upgrade` / `breaking` | Explicit repository cutover authority and all consumers |
| Convert one consumer after migration unlock | `apply` | Boundary classification plus focused consumer evidence |
| Delete compatibility exports or subpaths | `upgrade` / `breaking` | Same atomic cutover as every accepted consumer |

The contract is now cut over and sealed. Consumer work may use only the root
capabilities; removed subpaths and implementation APIs must never be restored.

## Final-cutover method and learned constraints

The successful errors migration established a reusable semantic-cutover
sequence. Apply it to future shared concepts; do not copy its implementation
mechanically into unrelated domains.

### 1. Freeze meaning before migration

Count the consumer graph and classify every legacy surface before codemodding.
Freeze `ERROR_REGISTRY`, the five root capabilities, canonical `Result<T, C>`,
ingress aliases, wire version, and the allowed/rejected consumer contract first.
An internal representation change should upgrade consumers automatically. Only
a deliberate public-contract cutover authorizes consumer edits.

### 2. Use a two-pass codemod

The first pass may rewrite imports and calls whose meaning is structurally
equivalent. The second pass must classify dynamic messages, details, causes,
vendor payloads, persistence data, and assertion patterns. Never map these to a
new API by position alone.

If one mechanical rewrite causes failures across many domain tests, stop. That
fan-out is evidence that the old call carried a domain-owned fact. Centralize
the missing boundary once instead of weakening or editing hundreds of tests.

### 3. Separate public meaning from private domain context

| Data | Owner and permitted path |
|------|--------------------------|
| Canonical code, message key, safe wording, safe details, HTTP, retry, diagnostics, wire, OpenAPI | `ERROR_REGISTRY` and derived errors capabilities |
| Domain outcome needed by trusted in-process code | Domain owner, attached through `errorResult.withContext` and read with `errorResult.context` |
| Historical code or wire alias | Internal ingress ledger; normalize immediately |
| Raw cause, stack, SQL, credentials, vendor object | Never public or wire; normalize at the owning ingress boundary |

The context channel is package-private storage backed by `WeakMap`: it is not
enumerable, structural, serializable, or a second failure contract. Persistence
or normalization code that reconstructs a failure must deliberately preserve
approved in-process context with `withContext`; public, HTTP, diagnostics, wire,
and OpenAPI projections must never expose it.

Consumers may narrow canonical codes and test their own domain context. They
must not assert centrally owned public wording, reconstruct public details, or
derive status, retry, diagnostics, serialization, or post-normalization shared
behavior.

### 4. Delete and enforce in the same cutover

Delete subpaths, `AppError`, versioned helpers, manual serializers, compatibility
facades, and consumer-owned policy maps with the migration. Permanent checks
must cover:

- root-only imports and exact capability signatures;
- allowed and rejected TypeScript fixtures;
- canonical marker presence and forbidden semantic interpretation;
- hostile structural lookalikes and unknown/vendor input;
- registry parity across Result, HTTP, retry, diagnostics, wire, and OpenAPI;
- bundle isolation and byte ceilings for each capability;
- absence of superseded exports and implementation dependencies.

Bundle checks protect responsibility boundaries, not historical implementation
assumptions. When a legitimate owned capability changes implementation (as the
trusted Result context did), update the gate to express what must not leak; do
not disable it or preserve a stale ban that contradicts the accepted contract.

### 5. Verify without hiding runner failures

Run errors package lint, typecheck, and tests first; then affected domain tests,
semantic/boundary/OpenAPI checks, and finally the required repository suite. A
broad parallel timeout with a green isolated package is an execution finding,
not proof of either product failure or success. Record both outcomes exactly,
inspect only task-owned processes, and never label the timed-out command green.

`docs/CONTRACT.md` remains semantic authority and cutover evidence; do not
create a parallel cutover record.

## Consumer boundary after unlock

| Boundary | Capability |
|----------|------------|
| Public operation outcome | `errorResult` |
| Known contextual failure | `errorIngress.code` |
| Unknown catch | `errorIngress.unknown` |
| PostgreSQL catch | `errorIngress.postgres` |
| Opaque failure to public Result | `errorProject.result` |
| HTTP/BFF | `errorProject.http` |
| Structured operational logging | `errorProject.diagnostics` |
| Worker scheduling | `errorProject.retry` |
| Process or persistence boundary | `errorWire` |
| Endpoint error declaration | `errorOpenApi.responses` |

Reject raw `Error.message`, direct failure serialization, manual wire objects,
code-to-status/message/retry maps, post-normalization business interpretation,
and automatic PostgreSQL guessing in generic unknown normalization.

## Verification

Snapshot before and after:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/foundation/errors
```

Run package gates once the bounded implementation is complete:

```bash
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
```

Run the living repository checks named by root `package.json` and
`docs/CONTRACT.md`; do not invent final command names. Require the two permanent
boundary/semantic gates, affected consumers, generated docs/OpenAPI, and the
focused verification suite for the changed surface.

## Completion

Report package capability work as `VERIFIED`, not `SEALED`, while consumer
cutover, permanent governance, or a KERNEL digest seal remains open. A green
package suite proves the named package capability only.
