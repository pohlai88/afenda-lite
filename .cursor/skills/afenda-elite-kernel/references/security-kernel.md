# `@afenda/security` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/security` |
| Target | `packages/runtime/security` |
| Kind | Rank-1 framework-neutral runtime leaf |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `security` capability |

## Ownership

Security owns CSP policy and serialization, baseline/strict response-header policy, and explicit-origin CORS resolution and Fetch projections. Applications own framework adaptation and composition. Authentication, authorization, rate limiting, correlation, audit, CSRF storage, and identity trust remain outside this package.

## Permanent surface

- `security.headers.{create,strict,apply}`
- `security.csp.serialize`
- `security.cors.{resolve,project,preflight}`
- framework-neutral `SecurityHeader` entries use `{ name, value }`
- package-root types only; no public subpaths or parallel runtime exports

## Cutover rules

- Reject framework names, imports, and representation types inside the package even when no framework module is imported.
- Keep Next.js `{ key, value }` mapping in `apps/web/next.config.ts`.
- Derive header names, default policies, CSP presets, and CORS defaults from one registry.
- Validate CR/LF and delimiter injection, HSTS/max-age bounds, exact HTTP origins, method tokens, and header-name tokens before projection.
- Reject wildcard CORS and fail closed for unknown origins.
- Delete flat functions/constants and framework-named APIs in the same consumer cutover; do not alias them.

## Verification

```bash
pnpm --filter @afenda/security lint
pnpm --filter @afenda/security typecheck
pnpm --filter @afenda/security test
pnpm check:security-boundary
pnpm test:security-boundary
pnpm --filter @afenda/web typecheck
```

At seal, record the final digest, application adapter evidence, hostile-input tests, dependency state, and working-tree posture below this contract.

## Current seal

```yaml
kernel_seal:
  version: 1
  target: packages/runtime/security
  capability: canonical CSP, CORS, security-header policy, and framework-neutral projections
  owner: "@afenda/security"
  compatibility: breaking
  content_digest: 1d67550b369ab53a5a35526726d5682e9904fa8b4cf922c6b8fe64f75e2326f8
  authority:
    - AGENTS.md
    - packages/runtime/security/CONTRACT.md
    - docs-V2/monorepo/README.md
    - docs-V2/api/middleware-dna.md
  public_contract:
    exports: ["@afenda/security"]
    runtime_capability: security
    production_consumers:
      - apps/web/next.config.ts
      - apps/web/modules/platform/api/route-pipeline.ts
    framework_adapter_owner: apps/web
  gates:
    - name: target lint
      command: pnpm --filter @afenda/security lint
      outcome: PASS
      evidence: 12 files checked without diagnostics
    - name: target type and rejected contract
      command: pnpm --filter @afenda/security typecheck
      outcome: PASS
      evidence: implementation and allowed/rejected facade fixture compiled as expected
    - name: target behavior and hostile input
      command: pnpm --filter @afenda/security test
      outcome: PASS
      evidence: 19 of 19 tests passed, including CSP/header/CORS injection and bound rejection
    - name: repository boundary
      command: pnpm check:security-boundary && pnpm test:security-boundary
      outcome: PASS
      evidence: leaf, root-export, deep-import, legacy-surface, framework-leak, and app-adapter checks passed; 2 of 2 boundary tests passed
    - name: web consumer
      command: pnpm --filter @afenda/web typecheck
      outcome: PASS
      evidence: NextConfig adaptation and route-pipeline consumers compiled without diagnostics
    - name: next config inventory
      command: pnpm exec vitest run apps/web/__tests__/auth-paths.inventory.test.ts apps/web/__tests__/join-accept-invitation.test.ts --config testing/vitest.unit.config.ts --project web
      outcome: PASS
      evidence: selected project executed 6 of 6 inventory tests successfully
    - name: generated documentation
      command: pnpm --filter @afenda/docs generate:package-docs && pnpm --filter @afenda/docs lint:links
      outcome: PASS
      evidence: 35 package pages generated; 42 pages checked with zero link errors
    - name: snapshot
      command: node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/runtime/security
      outcome: PASS
      evidence: 14 files; digest matches this seal
  working_tree:
    state: dirty
    note: security cutover coexists with preserved prior kernel work; no unrelated change was discarded
  sealed_at: 2026-08-01T01:07:44.1351629+08:00
```
