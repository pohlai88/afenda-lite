# `@afenda/logger` kernel

## Identity

| Field | Contract |
|-------|----------|
| Package | `@afenda/logger` |
| Target | `packages/runtime/logger` |
| Kind | Rank-1 runtime leaf |
| Registry | `src/semantic-registry.ts` |
| Projections | Root Node/Pino and isolated `./edge` JSON console |

## Permanent surface

- `logger.event(entry, options?)`
- `logger.redactFieldValue(name, value)`
- `StructuredLogEvent`, `StructuredLogFields`, `LogLevel`, `LogEventOptions`, and `LoggerCapability` types

Both entrypoints export the same capability shape. The entrypoint chooses the sink; consumers do not interpret projection policy.

## Ownership

The logger registry owns required/optional structured fields. Its redaction policy owns sensitive-name normalization, censor text, and derived Pino paths. Runtime projections own timestamps, default/override service fields, string levels, and sink dispatch.

`@afenda/http` owns correlation creation, validation, and headers. Calling domains own event names, canonical codes, domain context values, and emission decisions. Logger remains independent of errors, env, auth, apps, Next.js, surfaces, APM, and OpenTelemetry.

## Allowed and rejected use

Allowed:

- direct `logger.event` calls through a declared package export;
- closed canonical fields with mandatory correlation;
- explicit service projection for non-web runtimes;
- `logger.redactFieldValue` at an ingress/diagnostic boundary;
- `@afenda/logger/edge` when the runtime cannot load Pino or Node code.

Rejected:

- constructors or exposing the Pino `Logger` type;
- standalone or parallel event functions and app-local forwarding facades;
- open metadata, request bodies, SQL, stacks, tokens, secrets, or vendor objects;
- consumer-owned sensitive-name/censor maps;
- direct Pino imports outside the package;
- `@afenda/*` runtime dependencies;
- Pino or `node:` imports reachable from `./edge`.

## Cutover and verification

The final cutover deletes the former Node/edge constructors, standalone product-event function, public redact paths, and app-local re-export. Run:

```bash
pnpm --filter @afenda/logger lint
pnpm --filter @afenda/logger typecheck
pnpm --filter @afenda/logger typecheck:contract
pnpm --filter @afenda/logger test
pnpm check:logger-boundary
pnpm test:logger-boundary
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test
```

At seal, record the final target digest, affected consumer evidence, and working-tree state below the contract without changing the target afterward.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/logger
  capability: canonical structured logging fields, redaction, correlation carriage, and Node/edge projections
  owner: "@afenda/logger"
  compatibility: breaking
  content_digest: 26f124f35756c0407c5e0995e6e27a875581c8b4fc0d589616c2bbd822a77d0e
  authority:
    - AGENTS.md
    - packages/runtime/logger/CONTRACT.md
    - docs-V2/observability/README.md
    - docs-V2/monorepo/README.md
  public_contract:
    exports: ["@afenda/logger", "@afenda/logger/edge"]
    consumers: [packages/control-plane/auth, apps/web]
  gates:
    - name: target lint
      command: pnpm --filter @afenda/logger lint
      outcome: PASS
      evidence: 11 files checked
    - name: target typecheck
      command: pnpm --filter @afenda/logger typecheck
      outcome: PASS
      evidence: tsc completed without diagnostics
    - name: rejected and allowed type contract
      command: pnpm --filter @afenda/logger typecheck:contract
      outcome: PASS
      evidence: mandatory correlation and closed metadata fixture compiled as expected
    - name: behavior and projection parity
      command: pnpm --filter @afenda/logger test
      outcome: PASS
      evidence: 10 of 10 tests passed
    - name: repository boundary
      command: pnpm check:logger-boundary && pnpm test:logger-boundary
      outcome: PASS
      evidence: leaf, legacy-surface, direct-Pino, and edge-isolation checks passed; 3 of 3 negative tests passed
    - name: auth consumer
      command: pnpm --filter @afenda/auth typecheck && pnpm --filter @afenda/auth test && pnpm --filter @afenda/auth lint
      outcome: PASS
      evidence: typecheck and lint passed; 146 of 146 tests passed
    - name: web consumer
      command: pnpm --filter @afenda/web typecheck; focused Vitest for five affected files; pnpm --filter @afenda/web lint
      outcome: PASS
      evidence: typecheck and lint passed; 19 of 19 focused tests passed
    - name: generated documentation
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 package pages generated; 42 pages checked with zero link errors
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/logger
      outcome: PASS
      evidence: 13 files; digest matches this seal
  working_tree:
    state: dirty
    target_changes:
      - packages/runtime/logger/CONTRACT.md
      - packages/runtime/logger/README.md
      - packages/runtime/logger/package.json
      - packages/runtime/logger/tsconfig.contract.json
      - packages/runtime/logger/__tests__/contract.fixture.ts
      - packages/runtime/logger/__tests__/logger.test.ts
      - packages/runtime/logger/__tests__/create-logger.test.ts (deleted)
      - packages/runtime/logger/__tests__/product-log.test.ts (deleted)
      - packages/runtime/logger/src/index.ts
      - packages/runtime/logger/src/edge.ts
      - packages/runtime/logger/src/node-projection.ts
      - packages/runtime/logger/src/policy.ts
      - packages/runtime/logger/src/semantic-registry.ts
      - packages/runtime/logger/src/types.ts
      - packages/runtime/logger/src/create-logger.ts (deleted)
      - packages/runtime/logger/src/emit-console.ts (deleted)
      - packages/runtime/logger/src/product-fields.ts (deleted)
      - packages/runtime/logger/src/product-log.ts (deleted)
      - packages/runtime/logger/src/redact-paths.ts (deleted)
  sealed_at: 2026-08-01T00:35:47.7929085+08:00
```
