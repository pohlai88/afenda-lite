# `@afenda/http` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/http` |
| Target | `packages/runtime/http` |
| Kind | Rank-1 framework-neutral runtime leaf |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `http` capability |

## Ownership

HTTP owns correlation UUID/header behavior, bounded `{ limit, offset }` transport pagination, Fetch middleware/context/response mechanics, and validated attachment of caller-supplied Retry-After, rate-limit, and Server-Timing values.

Errors owns error-to-status/body projection, public wording, retryability, and error-derived Retry-After. Calling domains own sorting/filtering, retry/quota decisions, and timing metric selection. HTTP must not import errors, domain packages, Next.js, or another `@afenda/*` runtime dependency.

## Permanent surface

- `http.correlation.{header,create,is,resolve,createContext}`
- `http.pagination.{defaultLimit,maxLimit,extract}`
- `http.headers.{applyRetryAfter,applyRateLimit,applyServerTiming}`
- `http.pipeline.{compose,withContext}`
- `http.response.stamp`
- package-root types only; no public subpaths or parallel runtime exports

## Cutover rules

- Remove stale runtime workspace edges before calling the leaf sealed.
- Delete flat exported constants/functions in the same cutover; consumers use `http`.
- Delete duplicated consumer correlation constants and resolvers.
- Do not migrate domain sorting policy into generic pagination.
- Generic Retry-After accepts validated seconds only; it never accepts an error or derives retry policy.
- Preserve protocol declarations in independent leaves when importing HTTP would create a forbidden edge; do not ban every interoperable header literal globally.

## Verification

```bash
pnpm --filter @afenda/http lint
pnpm --filter @afenda/http typecheck
pnpm --filter @afenda/http test
pnpm check:http-boundary
pnpm test:http-boundary
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web typecheck
```

At seal, record the final target digest, exact dependency/consumer evidence, working-tree state, and authority split below this contract. Any later target edit invalidates that digest-scoped seal.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/http
  capability: canonical correlation, transport pagination, Fetch pipeline, and validated response-header mechanics
  owner: "@afenda/http"
  compatibility: breaking
  content_digest: dfaf68d4ede42af4790afe91e6078d477ddd11883cc3e4263e0cf025ad6d5cfe
  authority:
    - AGENTS.md
    - packages/runtime/http/CONTRACT.md
    - docs-V2/monorepo/README.md
    - docs-V2/observability/README.md
  public_contract:
    exports: ["@afenda/http"]
    runtime_capability: http
    direct_source_consumers: 52
    error_projection_owner: "@afenda/errors"
  gates:
    - name: target lint
      command: pnpm --filter @afenda/http lint
      outcome: PASS
      evidence: 21 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/http typecheck
      outcome: PASS
      evidence: implementation and allowed/rejected facade fixture compiled as expected
    - name: target behavior
      command: pnpm --filter @afenda/http test
      outcome: PASS
      evidence: 18 of 18 tests passed
    - name: repository boundary
      command: pnpm check:http-boundary && pnpm test:http-boundary
      outcome: PASS
      evidence: leaf dependency, root export, deep-import, and deleted-surface checks passed; 2 of 2 boundary tests passed
    - name: auth consumer
      command: pnpm --filter @afenda/auth typecheck && pnpm --filter @afenda/auth test
      outcome: PASS
      evidence: typecheck passed; 145 of 145 tests passed
    - name: web consumer
      command: pnpm --filter @afenda/web typecheck; focused Vitest for four representative affected files
      outcome: PASS
      evidence: typecheck passed; 20 of 20 focused tests passed
    - name: generated documentation
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 package pages generated; 42 pages checked with zero link errors
    - name: lockfile edge
      command: pnpm install --lockfile-only
      outcome: PASS
      evidence: packages/runtime/http importer has no runtime dependencies
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/http
      outcome: PASS
      evidence: 23 files; digest matches this seal
  working_tree:
    state: dirty
    note: HTTP cutover coexists with preserved config and logger kernel work; no unrelated change was discarded
  sealed_at: 2026-08-01T00:55:02.8233269+08:00
```
