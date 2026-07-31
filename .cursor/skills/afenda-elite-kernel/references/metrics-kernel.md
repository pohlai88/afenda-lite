# `@afenda/metrics` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/metrics` |
| Target | `packages/runtime/metrics` |
| Kind | Rank-1 Node runtime leaf |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `metrics` capability |

## Ownership

Metrics owns instrument names, help text, label keys, bounded label values, buckets, service labels, Prometheus registry construction, recording, and exposition. Consumers own only the occurrence facts accepted by a named recording operation. The web application owns scrape authentication, Node Route Handler response construction, and pipeline composition.

## Permanent surface

- `metrics.record.{http,db,cache}`
- `metrics.exposition.{render,contentType}`
- root input/capability types
- `@afenda/metrics/testing` isolated capability and process-state reset only

Prometheus registries, instruments, constructors, definitions, names, label maps, service overrides, and collection options are private.

## Cutover rules

- Derive every instrument from one registry; do not synchronize names, help, labels, or buckets across files.
- Accept facts, not metric definitions or open label maps.
- Reject organization/tenant keys at TypeScript and runtime ingress, including untyped callers.
- Validate low-cardinality routes, HTTP status, duration, operation vocabularies, and table labels centrally.
- Keep the real root Node-only; do not publish an Edge no-op or duplicate implementation.
- Delete old core/node facades, registry bundles, factories, exported constants, and domain-owned metric-name files in the same cutover.
- Repository enforcement must reject direct `prom-client`, known metric-name construction, consumer registry files, prohibited labels, deep imports, and legacy surfaces.

## Verification

```bash
pnpm --filter @afenda/metrics lint
pnpm --filter @afenda/metrics typecheck
pnpm --filter @afenda/metrics test
pnpm check:metrics-boundary
pnpm test:metrics-boundary
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/purchasing typecheck
pnpm --filter @afenda/receiving typecheck
```

At seal, record the final digest, exact consumer evidence, cardinality and prohibited-label tests, dependency state, and working-tree posture below this contract.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/metrics
  capability: canonical metric registry, names, labels, recording, cardinality, and exposition
  owner: "@afenda/metrics"
  compatibility: breaking
  content_digest: fa7a3081a9556164b2eac0213eff85d535b80d1956baeb4f896d5143c12149a2
  authority:
    - AGENTS.md
    - packages/runtime/metrics/CONTRACT.md
    - docs-V2/observability/README.md
    - docs-V2/observability/metrics-dna.md
    - docs-V2/monorepo/README.md
  public_contract:
    exports: ["@afenda/metrics", "@afenda/metrics/testing"]
    runtime_capability: metrics
    production_consumers:
      - apps/web/app/api/metrics/route.ts
      - apps/web/modules/platform/api/route-pipeline.ts
    prohibited_labels: [organizationId, organization_id, orgId, tenantId, tenant_id, labels, metricName]
  gates:
    - name: target lint
      command: pnpm --filter @afenda/metrics lint
      outcome: PASS
      evidence: 14 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/metrics typecheck
      outcome: PASS
      evidence: implementation and rejected organization/open-label/registry/name fixture compiled as expected
    - name: target semantics
      command: pnpm --filter @afenda/metrics test
      outcome: PASS
      evidence: 6 of 6 tests passed, including cardinality, untyped prohibited-label, opaque-registry, recording, and exposition cases
    - name: repository boundary
      command: pnpm check:metrics-boundary && pnpm test:metrics-boundary
      outcome: PASS
      evidence: leaf, exports, deep-import, direct-prom-client, known-name, consumer-registry, prohibited-label, and legacy-surface checks passed; 2 of 2 boundary tests passed
    - name: web consumer
      command: pnpm --filter @afenda/web typecheck
      outcome: PASS
      evidence: scrape route and platform route pipeline compiled without diagnostics
    - name: web scrape behavior
      command: pnpm exec vitest run apps/web/__tests__/api-metrics-route.test.ts --config testing/vitest.unit.config.ts --project web
      outcome: PASS
      evidence: 4 of 4 tests passed
    - name: distributed-name deletion consumers
      command: pnpm --filter @afenda/purchasing typecheck && pnpm --filter @afenda/receiving typecheck
      outcome: PASS
      evidence: both packages compiled after deleting their metric-name files and barrel exports
    - name: generated documentation
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 package pages generated; 42 pages checked with zero link errors
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/metrics
      outcome: PASS
      evidence: 16 files; digest matches this seal
  working_tree:
    state: dirty
    note: metrics cutover coexists with preserved prior kernel work; no unrelated change was discarded
  sealed_at: 2026-08-01T01:31:03.2984735+08:00
```
