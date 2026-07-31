# `@afenda/openapi` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/openapi` |
| Target | `packages/runtime/openapi` |
| Kind | Rank-1 universal leaf with isolated Node emission |
| Permanent facade | package-root `openapi`; `/node` `openapiNode` projection |

## Ownership

OpenAPI owns the extended Zod instance, schema/security/path registration, `{ data }` success envelopes, operation metadata validation, Afenda document stamping, OAS generation, and deterministic YAML emission. It exposes a narrowed registry capability, never the vendor registry, generator, or definitions array.

`@afenda/errors` owns error codes, bodies, HTTP status, descriptions, response headers, retry policy, and OpenAPI error-response projections. Both packages remain leaves. A repository generator or application composition root may import both and place `errorOpenApi.responses(codes)` directly into an OpenAPI path; neither leaf imports the other.

## Cutover rules

- Keep `@afenda/openapi` free of all `@afenda/*` runtime dependencies.
- Publish one root capability style; isolate filesystem/YAML emission at `/node` using the same style.
- Generate and stamp the document in one operation so consumers cannot omit canonical operation/document metadata.
- Delete raw `OpenAPIRegistry`, `OpenApiGeneratorV3`, flat helper, `/zod`, `/document`, and deep-import surfaces in the same cutover.
- Never register a local `APIErrorBody`, code enum, status map, retry header, or error description in the OpenAPI package or generator.
- Enforce exports, leaf dependency state, vendor bypass, old surfaces, and canonical error composition with a mutation-tested repository boundary gate.

## Verification

```bash
pnpm --filter @afenda/openapi lint
pnpm --filter @afenda/openapi typecheck
pnpm --filter @afenda/openapi test
pnpm check:openapi-boundary
pnpm test:openapi-boundary
pnpm openapi:generate
pnpm check:openapi
```

At seal, record the final target digest, direct consumer evidence, generated-document parity, dependency state, and working-tree posture below this contract.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/openapi
  capability: canonical schema registration, envelope, metadata, document generation, and Node YAML projection
  owner: "@afenda/openapi"
  compatibility: breaking
  content_digest: c9e1c3f0df946eb126d45518a5e7a1cdb4d20b131cb7df527ff3d02a91195c2a
  authority:
    - AGENTS.md
    - packages/runtime/openapi/CONTRACT.md
    - docs-V2/api/README.md
    - docs-V2/monorepo/README.md
  public_contract:
    exports: ["@afenda/openapi", "@afenda/openapi/node"]
    runtime_capability: openapi
    node_capability: openapiNode
    composition_owner: scripts/generate-openapi.mts
    error_projection_owner: "@afenda/errors errorOpenApi"
  gates:
    - name: target lint
      command: pnpm --filter @afenda/openapi lint
      outcome: PASS
      evidence: 11 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/openapi typecheck
      outcome: PASS
      evidence: implementation plus rejected vendor-definition, error-ownership, and unstamped-document fixtures compiled as expected
    - name: target semantics
      command: pnpm --filter @afenda/openapi test
      outcome: PASS
      evidence: 5 of 5 tests passed for extended Zod, frozen facade, envelopes, metadata stamps, validation, and YAML emission
    - name: repository boundary
      command: pnpm check:openapi-boundary && pnpm test:openapi-boundary
      outcome: PASS
      evidence: exports, leaf dependencies, subpaths, vendor bypass, legacy surfaces, and canonical error composition passed; 2 of 2 mutation tests passed
    - name: generated document parity
      command: pnpm openapi:generate && pnpm check:openapi
      outcome: PASS
      evidence: OPEN-001 generated with 3 operations, 3 references, and matching api-now handlers
    - name: web projection behavior
      command: pnpm --filter @afenda/web exec vitest run --config ../../testing/vitest.unit.config.ts --project web __tests__/action-result-contract.test.ts
      outcome: PASS
      evidence: 7 of 7 API error and ActionResult projection tests passed
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/openapi
      outcome: PASS
      evidence: 13 files; digest matches this seal; no @afenda runtime dependency
  working_tree:
    state: dirty
    note: OpenAPI cutover changes are fully enumerated and coexist with preserved prior kernel and HR work; no unrelated change was discarded
  sealed_at: 2026-08-01T01:57:00.3959646+08:00
```
