# PR: Complete the `@afenda/errors` semantic-control-plane cutover

- **Status:** Complete — repository cutover implemented and kernel sealed
- **Canonical authority:** [CONTRACT.md](./CONTRACT.md)
- **Permanent consumer surface:** package root `@afenda/errors`
- **Protection digest:** [`.protected.sha256`](./.protected.sha256)
- **Date:** 2026-07-31

This file is the cutover record, not a second semantic specification. The
durable contract, code-usage boundary, compatibility policy, and lane design
live in `CONTRACT.md`.

## Architectural outcome

- One modular `ERROR_REGISTRY` owns canonical codes, messages, typed public
  details, HTTP status, retry policy, diagnostics metadata, wire behavior, and
  OpenAPI projections.
- Consumers use the frozen root capabilities `errorResult`, `errorIngress`,
  `errorProject`, `errorWire`, and `errorOpenApi`.
- `Result<T, C>` is the one public Result contract. Trusted domain-only context
  is held in a private `WeakMap`; it is neither enumerable nor serializable.
- Historical aliases are accepted only by wire ingress and normalize
  immediately to canonical codes.
- PostgreSQL and unknown/vendor normalization are centralized and driver-free.
- All former subpaths, `AppError`, common factories, manual serialization
  helpers, retry helpers, and parallel error APIs were deleted in the same
  cutover.

## Consumer blast radius

The repository-wide edit was an unavoidable final removal of already leaked
implementation APIs. It is not the ongoing cost of changing error semantics.
Future registry policy changes flow through the stable root capabilities
without requiring consumers to interpret codes.

Final repository scan:

- 834 canonical consumers
- 0 partial consumers
- 0 manual Result construction findings
- 0 manual serialization findings
- 0 HTTP, retry, operational, infrastructure, PostgreSQL, or wording-map
  findings

## Contract enforcement

- `package.json.exports` contains only `"."`.
- Type fixtures accept the permanent capability signatures and reject dynamic
  public wording, aliases in construction, malformed wire values, and invalid
  projections.
- Typed-AST gates reject imports from removed subpaths and distributed semantic
  interpretation.
- Bundle fixtures prove each named capability remains isolated within its byte
  ceiling.
- Runtime contracts prove hostile values, structural failure lookalikes, raw
  SQL/vendor data, and trusted in-process context cannot leak into public or
  wire projections.

## Verification evidence

| Gate | Outcome |
|------|---------|
| `pnpm --filter @afenda/errors typecheck` | PASS |
| `pnpm --filter @afenda/errors test` | PASS — 8 files / 90 tests |
| `pnpm check:errors-boundary` | PASS |
| `pnpm check:errors-semantics` | PASS — 834 canonical / 0 partial / 0 findings |
| `pnpm check:openapi` | PASS |
| `pnpm --filter @afenda/human-resources typecheck` | PASS |
| Human Resources tests | PASS — 981/982 in the full run plus the corrected classification file 9/9 |
| Web tests | PASS — 126 files / 562 tests |
| Master Data tests | PASS standalone — 37 files / 292 tests |
| Repository lint/typecheck | PASS before the final package-local context addition; affected Errors and HR scopes rerun green |
| Combined repository test workload | One resource-only 5-second dynamic-import timeout in Master Data; the same package is green standalone |
| `pnpm --filter @afenda/errors protect:check` | PASS after final digest refresh |

The combined-workload timeout is recorded as execution-environment evidence,
not waived product behavior: no assertion failed, and the exact package suite
passes outside the saturated all-repository worker pool.

## Deleted surfaces

- `@afenda/errors/result`
- `@afenda/errors/http`
- `@afenda/errors/common`
- `@afenda/errors/adapters/postgres`
- public `AppError`
- legacy factories, safe-details helpers, serializers, retry helpers, and
  adoption/normalization checker generations replaced by the permanent gates

No compatibility shim, deprecated facade, v2 API, or deferred migration
remains.
