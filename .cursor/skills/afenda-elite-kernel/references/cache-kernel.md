# `@afenda/cache` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/cache` |
| Target | `packages/runtime/cache` |
| Kind | Rank-1 universal runtime kernel |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `cache`; isolated `/testing` capability |

## Ownership

Cache owns semantic namespaces, structured opaque keys, per-namespace TTL, organization/user invalidation tags, L1/L2 resolution, JSON serialization parity, private Upstash prefixing, bounded L1 storage, diagnostics, and backend failure normalization.

Environment owns validated Upstash credentials and production detection. Errors owns `VALIDATION_ERROR` and `SERVICE_UNAVAILABLE`. Rate-limit shares only the Upstash vendor instance: it must not share cache prefixes, registries, stores, or runtime dependencies.

## Cutover rules

- Accept identity facts through named key capabilities; never accept consumer-built raw keys, tags, prefixes, TTLs, or backend options.
- Derive namespace, TTL, logical key shape, and tags from one registry.
- Apply one JSON round-trip to L1 and L2 so backend selection cannot change value semantics.
- Preserve loader errors; normalize only invalid cache inputs and cache backend failures.
- Use L1+L2 with Upstash, explicit L1-only outside production without credentials, and production fail-closed without Upstash.
- Keep `@afenda/cache:v1:` private; prefix deletion only, never Redis-wide flush.
- Delete public managers, stores, backend resolvers, raw key/TTL tables, patterns, and unrelated helpers in the same cutover.
- Enforce exports, dependencies, raw keys, prefixes, flushes, subpaths, and deleted surfaces with a mutation-tested repository gate.

## Verification

```bash
pnpm --filter @afenda/cache lint
pnpm --filter @afenda/cache typecheck
pnpm --filter @afenda/cache test
pnpm check:cache-boundary
pnpm test:cache-boundary
pnpm check:rate-limit-boundary
```

At seal, record the final digest, registry/projection evidence, serialization parity, production failure behavior, exact consumer set, dependency separation from rate-limit, and working-tree posture below this contract.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/cache
  capability: canonical L1/L2 policy, opaque key namespace, serialization, invalidation, and failure behavior
  owner: "@afenda/cache"
  compatibility: breaking
  content_digest: 28eeed5ff9ceb5fc208f4439ce79d49e5c9b8018024d44e5b997f7e4f9aeb4ee
  authority:
    - AGENTS.md
    - packages/runtime/cache/CONTRACT.md
    - docs-V2/monorepo/README.md
  public_contract:
    exports: ["@afenda/cache", "@afenda/cache/testing"]
    runtime_capability: cache
    production_consumers: []
    namespaces: [organization_config, organization_features, permission_catalog, user_permissions, user_session]
    failure_owner: "@afenda/errors"
    shared_vendor_only: "@afenda/rate-limit"
  gates:
    - name: target lint
      command: pnpm --filter @afenda/cache lint
      outcome: PASS
      evidence: 15 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/cache typecheck
      outcome: PASS
      evidence: implementation plus rejected raw-key, arbitrary-namespace, TTL, and backend fixtures compiled as expected
    - name: target semantics
      command: pnpm --filter @afenda/cache test
      outcome: PASS
      evidence: 4 tests passed for JSON parity, L2 warming, semantic invalidation, strategies, loader-error preservation, validation, and production fail-closed behavior
    - name: repository boundary
      command: pnpm check:cache-boundary && pnpm test:cache-boundary
      outcome: PASS
      evidence: exports, dependencies, raw keys, prefixes, Redis-wide flush, subpaths, and deleted surfaces passed; 2 mutation tests passed
    - name: neighboring rate-limit separation
      command: pnpm check:rate-limit-boundary
      outcome: PASS
      evidence: cache and rate-limit share no semantic or package dependency edge
    - name: canonical error integration
      command: pnpm check:errors-semantics
      outcome: PASS
      evidence: strict repository report contained zero findings
    - name: generated package docs
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 pages generated; 42 pages checked with zero link errors
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/cache
      outcome: PASS
      evidence: 17 files; digest matches this seal; only env/errors workspace runtime dependencies
  working_tree:
    state: dirty
    note: cache cutover coexists with preserved prior kernel and HR work; no unrelated change was discarded
  sealed_at: 2026-08-01T02:41:47.2729149+08:00
```
