# `@afenda/rate-limit` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/rate-limit` |
| Target | `packages/runtime/rate-limit` |
| Kind | Rank-1 universal runtime kernel |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `rateLimit`; isolated `/testing` fixture capability |

## Ownership

Rate-limit owns bucket quota policies, structured identity-to-key policy, key normalization and bounds, opaque decisions, backend resolution, memory fallback policy, Upstash response normalization, quota bounds, and retry timing inputs.

Errors owns `RATE_LIMITED` / `SERVICE_UNAVAILABLE`, public HTTP error projection, retryability, and `Retry-After`. HTTP owns `X-RateLimit-*` names, value validation, and serialization. Rate-limit produces a transport-neutral quota projection structurally accepted by HTTP; this composition must not add a rate-limit → HTTP dependency.

## Cutover rules

- Accept bucket-specific identity facts; never accept consumer-built raw keys, limits, windows, prefixes, or timing.
- Expose only `decision.ok`; keep quota, retry, backend, and vendor state behind private decision metadata.
- Require consumers to request `failure`, `quota`, and `diagnostics` projections from the owner.
- Treat vendor output as untrusted: validate shape, ignore vendor limit authority, clamp remaining/reset, derive bounded retry timing, and fail closed on malformed results.
- Keep production fail-closed without working Upstash credentials; memory fallback is non-production only.
- Delete flat checks/mappers, public registries/stores/backend resolution, raw result types, and consumer quota interpretation in the same cutover.
- Provide opaque fixtures only through `/testing`; do not weaken the production decision contract for mocks.
- Enforce exports, dependencies, subpaths, raw keys, private-state interpretation, vendor bypass, and deleted surfaces with a mutation-tested repository gate.

## Verification

```bash
pnpm --filter @afenda/rate-limit lint
pnpm --filter @afenda/rate-limit typecheck
pnpm --filter @afenda/rate-limit test
pnpm check:rate-limit-boundary
pnpm test:rate-limit-boundary
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test
```

At seal, record the final target digest, exact consumer set, hostile Upstash normalization evidence, dependency state, and working-tree posture below this contract.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/rate-limit
  capability: canonical quota result, structured key policy, bounded timing, Upstash normalization, and projections
  owner: "@afenda/rate-limit"
  compatibility: breaking
  content_digest: b2f431a716b45296a2b1aef666fe430b09ae6923436628ddd9677ad3dbc6f72a
  authority:
    - AGENTS.md
    - packages/runtime/rate-limit/CONTRACT.md
    - docs-V2/auth/README.md
    - docs-V2/api/middleware-dna.md
    - docs-V2/monorepo/README.md
  public_contract:
    exports: ["@afenda/rate-limit", "@afenda/rate-limit/testing"]
    runtime_capability: rateLimit
    production_consumers:
      - packages/control-plane/auth/src/api-handler.ts
      - apps/web/app/actions/auth-credentials.ts
      - apps/web/app/actions/dev-login.ts
      - apps/web/app/api/ai/chat/route.ts
    projection_owners:
      error_and_retry: "@afenda/errors"
      rate_limit_headers: "@afenda/http"
  gates:
    - name: target lint
      command: pnpm --filter @afenda/rate-limit lint
      outcome: PASS
      evidence: 16 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/rate-limit typecheck
      outcome: PASS
      evidence: implementation plus rejected raw-key, metadata, registry, and legacy-mapper fixtures compiled as expected
    - name: target semantics and hostile vendor normalization
      command: pnpm --filter @afenda/rate-limit test
      outcome: PASS
      evidence: 4 of 4 tests passed for key policy, opaque projections, bounded hostile Upstash data, memory quota, and production fail-closed behavior
    - name: repository boundary
      command: pnpm check:rate-limit-boundary && pnpm test:rate-limit-boundary
      outcome: PASS
      evidence: exports, dependencies, subpaths, raw keys, private state, vendor bypass, and deleted surfaces passed; 2 of 2 mutation tests passed
    - name: auth compile and behavior
      command: pnpm --filter @afenda/auth typecheck && pnpm --filter @afenda/auth test
      outcome: PASS
      evidence: auth compiled; 17 files and 145 tests passed including BFF quota/failure/header composition
    - name: web consumer behavior
      command: pnpm --filter @afenda/web exec vitest run --config ../../testing/vitest.unit.config.ts --project web __tests__/auth-sign-in-rate-limit.test.ts __tests__/api-ai-chat-route.test.ts
      outcome: PASS
      evidence: 2 files and 7 tests passed with opaque testing decisions
    - name: neighboring semantic owners
      command: pnpm check:errors-semantics && pnpm check:http-boundary
      outcome: PASS
      evidence: strict errors report had zero findings; HTTP header ownership boundary passed
    - name: generated package docs
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 pages generated; 42 pages checked with zero link errors
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/rate-limit
      outcome: PASS
      evidence: 18 files; digest matches this seal; only env/errors workspace runtime dependencies
  working_tree:
    state: dirty
    note: rate-limit cutover coexists with preserved prior kernel and HR work; every target change belongs to this mission and no unrelated change was discarded
  sealed_at: 2026-08-01T02:24:41.8498313+08:00
```
