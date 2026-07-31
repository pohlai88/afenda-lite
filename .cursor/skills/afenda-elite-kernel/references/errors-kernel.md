# `@afenda/errors` kernel

Use this reference when changing `packages/foundation/errors` or applying its
public contract at an approved consumer boundary.

## Authority and state

| Field | Contract |
|-------|----------|
| Package | `@afenda/errors` |
| Target | `packages/foundation/errors` |
| Layer | Rank-1 foundation leaf; no `@afenda/*` runtime dependencies |
| Semantic authority | `packages/foundation/errors/CONTRACT.md` |
| Living contract | Root barrel, registry, capability facades, tests, `package.json`, README |
| Integrity record | `packages/foundation/errors/.protected.sha256` |
| Contract marker | `afenda.errors/v1` in every package TypeScript source and test |
| Owning farms | `afenda-elite-api-contract` and `afenda-elite-monorepo-discipline` |

Read `CONTRACT.md` first and obey its current migration lock. Package-local capability
completion does not authorize consumer conversion, subpath deletion, or
protection refresh.

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
12. Keep the package a runtime leaf and preserve protection headers.

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

During the migration, run the living repository checks named by root
`package.json` and `CONTRACT.md`; do not invent final command names early. At the
authorized final cutover, require the two permanent boundary/semantic gates,
all affected consumers, generated docs/OpenAPI, and the full repository suite.

Run `protect:check` to report current integrity state. Run `protect:update` only
as the final operation after every cutover, consumer, documentation, governance,
and repository gate is green. Never refresh protection for package-local
progress alone.

## Completion

Report package capability work as `VERIFIED`, not `SEALED`, while consumer
cutover, permanent governance, protection, or a durable seal record remains
open. A green package suite proves the named package capability only.
