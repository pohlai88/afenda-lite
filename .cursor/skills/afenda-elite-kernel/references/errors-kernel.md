# `@afenda/errors` kernel

Apply this contract when changing `packages/foundation/errors` or integrating its public vocabulary at a consumer boundary.

## Contents

- [Identity and authority](#identity-and-authority)
- [Public import paths](#public-import-paths)
- [Kernel invariants](#kernel-invariants)
- [Apply to a consumer](#apply-to-a-consumer)
- [Implement or upgrade the kernel](#implement-or-upgrade-the-kernel)
- [Verification order](#verification-order)
- [Error-kernel seal](#error-kernel-seal)

## Identity and authority

| Field | Contract |
|-------|----------|
| Package | `@afenda/errors` |
| Target | `packages/foundation/errors` |
| Layer | Rank-1 Platform leaf; no `@afenda/*` runtime dependencies |
| Contract marker | `afenda.errors/v1` in every TypeScript source and test header |
| Integrity record | `packages/foundation/errors/.protected.sha256` |
| Primary authority | Package barrel, subpath barrels, tests, `package.json`, and README on disk |
| Owning farms | `afenda-elite-api-contract` for shared error wire; `afenda-elite-monorepo-discipline` for exports and dependency edges |

Read `package.json`, `src/index.ts`, every exported subpath, affected tests, the package README, and direct consumers before accepting a contract change. Use repository adoption checks instead of maintaining a consumer list in this skill.

## Public import paths

| Import path | Owned contract |
|-------------|----------------|
| `@afenda/errors` | `AppError`, closed codes, normalization, safe details, safe diagnostics, serialization, common factories |
| `@afenda/errors/result` | `Result<T>`, `ok`, `fail`, `failFromAppError`, `failFromUnknown` |
| `@afenda/errors/http` | Atomic HTTP status/body/Retry-After projection plus compatibility primitives |
| `@afenda/errors/common` | Stable `AppError` factories |
| `@afenda/errors/adapters/postgres` | Duck-typed SQLSTATE discovery and explicit PostgreSQL-to-`AppError` mapping |

Import only declared package paths. Preserve the root and compatibility exports unless a breaking mission updates every accepted consumer and public contract in the same cutover.

## Kernel invariants

1. Keep `ERROR_CODES` closed and transport-neutral. Map domain-specific reasons at adapters rather than adding domain vocabulary.
2. Keep `Result<T>` discriminated by `ok: true | false`; never introduce another shared result envelope.
3. Preserve `AppError.cause` for diagnostics but exclude cause, stack, raw driver data, SQL, and unsafe details from public serialization.
4. Treat `AppError` identity as runtime-owned. Never accept structural lookalikes, native errors, or third-party objects as trusted kernel failures.
5. Sanitize all public details through the bounded safe-detail policy. `INTERNAL_ERROR` always emits the fixed generic message and no public details. Treat hostile getters, proxies, cycles, oversized structures, blocked keys, and SQL-like strings as untrusted input.
6. Keep `normalizeUnknown` infrastructure-agnostic. Its optional context is a bounded diagnostic operation, never a public fallback message.
7. Keep PostgreSQL mapping explicit, total, typed for retryability, and driver-free; do not add `pg`, Drizzle, Prisma, or database imports.
8. Keep HTTP projection transport-only and atomic. Do not add `NextResponse`, route handlers, or framework policy.
9. Keep retry policy in consumers. This package owns typed retryability, bounded retry vocabulary, and extraction only.
10. Keep the package a runtime-dependency leaf and preserve package protection headers and digest controls.

## Apply to a consumer

Use `mode: apply` and identify the exact boundary:

| Boundary | Required shape |
|----------|----------------|
| Public package command/query | Return `Result<T>` or map an accepted domain outcome before it crosses the package |
| Unknown catch | Use `normalizeUnknown` or `failFromUnknown`; pass only a safe diagnostic operation label when useful |
| Existing `AppError` | Use `serializeAppError` or `failFromAppError` |
| PostgreSQL catch | Call total `normalizePostgresUnknown`; do not add a second generic fallback branch |
| HTTP/BFF projection | Use `projectHttpError` once, then construct the framework response from its status, body, and optional Retry-After |
| Pure domain code | Keep domain-local outcomes and map them at the command, repository, worker, or transport edge |

Reject raw `Error.message` in public output, direct serialization of error instances, duplicate code/status registries, and automatic database guessing inside generic normalization.

## Implement or upgrade the kernel

Before editing:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/foundation/errors
pnpm --filter @afenda/errors protect:check
```

Classify impact using this matrix:

| Change | Minimum classification | Required impact review |
|--------|------------------------|------------------------|
| Internal implementation with identical observable behavior | `internal` | Target tests and protection digest |
| New factory or additive export using existing codes/wire | `additive` | Barrel, README, direct consumers, adoption gates |
| New error code | Contract-impacting; prove `additive` or classify `breaking` | Code guards, HTTP map, OpenAPI, exhaustive switches, factories, consumers |
| Result or serialized wire change | `breaking` | All package, job, Action, HTTP, and OpenAPI consumers |
| Rename/removal of an export or compatibility alias | `breaking` | Repository-wide import and contract cutover |
| New infrastructure adapter | `additive` when isolated | New explicit subpath, safe mapping tests, dependency-leaf proof |
| Safe-detail or normalization policy change | Contract-impacting | Security cases, serialization, Result, HTTP, and consumer expectations |

Use the local protected-edit token only through `.env.local`; never print or commit it. Refresh the protection digest only after implementation and all required gates pass.

## Verification order

Run focused gates in this order:

```bash
pnpm --filter @afenda/errors protect:check
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
pnpm run check:errors-consumption
pnpm run check:errors-adoption -- --strict
pnpm run check:errors-normalization -- --strict
```

For a package implementation change, then run:

```bash
pnpm --filter @afenda/errors protect:update
pnpm --filter @afenda/errors protect:check
```

Also run focused tests or typechecks for directly affected consumers. Do not run `protect:update` for a consumer-only application mission.

## Error-kernel seal

The protection digest proves package-file integrity; it does not replace the general kernel seal record. Seal only when:

- all general gates in the kernel seal contract pass;
- the final inspector digest and `.protected.sha256` are recorded;
- package protection is green after any implementation change;
- strict adoption and normalization are green;
- affected consumer evidence is green;
- the full seal record is persisted in an owner-approved evidence surface.

Reopen the seal when codes, result/serialization wire, public details policy, HTTP mapping, retry bounds, PostgreSQL mapping, exports, protection controls, consumer mandates, or governing API contracts change.
