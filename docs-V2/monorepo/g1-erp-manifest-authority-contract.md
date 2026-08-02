# G1 ERP Manifest Authority Contract

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g1-erp-manifest-authority-contract.md` |
| Authority | Scratch pre-implementation contract |
| Owner | Platform Architecture |
| Updated | 2026-08-02 |
| Scope | G1 only: ERP manifest authority cutover |
| Prerequisite | GEN-0.1 through GEN-0.5 sealed; G1 not started |

This file freezes the narrow G1 boundary before implementation. It is not a
second generator authority. Once implemented, the typed ERP generator contract and
tests own the executable rules.

## Phase Exit Matrix

| Phase | Status | Evidence |
|-------|--------|----------|
| GEN-0.1 | DONE | `turbo/generators/evidence/gen-0.1-closure.json` |
| GEN-0.2 | DONE | `054dcf84 feat(generator): add governed discovery` |
| GEN-0.3 | DONE | `6c2e46a6 feat(generator): add diagnostic protocol` |
| GEN-0.4 | DONE | `0201d0fb test(generator): prove doctors are read-only`; `turbo/generators/evidence/gen-0.4-closure.json` |
| GEN-0.5 | DONE | `45f965d6 feat(generator): add cacheable generator check` |
| G1 | NOT STARTED | This contract only; no G1 implementation files changed |

G1 may begin only while every prerequisite row above remains DONE and the
generator remains non-authoritative until the manifest authority cutover closes.

## 1. Generated Artifact

G1 covers exactly one generated artifact family:

```text
packages/erp/<module-id>/src/composition/module.manifest.ts
```

For historical ERP packages that still use:

```text
packages/erp/<module-id>/src/module.manifest.ts
```

G1 may diagnose and project a canonical equivalent, but closure requires one
manifest owner per compatible ERP package. A permanent mixed manifest-location
tier is not allowed.

The representative proof cohort is:

| Package | Current shape | G1 purpose |
|---------|---------------|------------|
| `@afenda/inventory` | Historical root manifest | Proves historical path diagnosis and canonical projection compatibility |
| `@afenda/human-resources` | Feature-first composition manifest | Proves feature-first semantic input chain |
| `@afenda/corporate-administration` | Divergent feature-first package under active development | Proves non-pilot divergence handling |

The cohort is evidence only. G1 closure must cover every compatible
`packages/erp/*` workspace discovered from disk.

## 2. Canonical Inputs

The ERP manifest projection must derive from these canonical inputs:

| Input | Owner | Rule |
|-------|-------|------|
| Workspace identity | Disk workspace discovery from `pnpm-workspace.yaml` and package `package.json` | Discovery finds candidates; it does not authorize dependencies or business meaning |
| Module definition | `src/composition/module-definition.ts` when present, or current manifest fields during compatibility read | Owns module identity, lifecycle, dependencies, tenancy, and persistence declaration |
| Operation registry | `src/kernel/operations/registry.ts` or package-owned operation registries composed into that boundary | Owns command, query, permission, and event operation projections |
| Public API inventory | `src/facade/public-api.ts` when present, or an explicit package-owned compatibility reader | Owns intentional root exposure; never inferred from file presence |
| Workspace edge authorization | `docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml` | Authorizes dependency intent; `package.json` only realizes the edge |

G1 must not infer permissions, persistence ownership, emitted events, public
exports, or dependency authorization from filenames alone.

## 3. Allowed Filesystem Mutations

G1 may mutate only these paths:

```text
turbo/generators/**
scripts/validate-modules.mjs
scripts/validate-modules/checks.mjs
scripts/validate-modules/negative-fixtures.mjs
scripts/validate-modules/generate-registers.mjs
packages/erp/*/src/composition/module.manifest.ts
packages/erp/*/src/module.manifest.ts
packages/erp/*/__tests__/**/*.test.ts
docs-V2/modules/*.yaml
docs-V2/monorepo/g1-erp-manifest-authority-contract.md
```

`package.json`, `turbo.json`, and `pnpm-lock.yaml` may change only if the G1
generator verification task itself must be wired differently. They must not be
used to clean up unrelated pre-existing worktree deltas.

## 4. Repeat Run And Idempotency

G1 implementation must prove:

- first projection run produces the expected manifest and validator cutover;
- second projection run produces zero filesystem delta;
- second verification run produces the same diagnostic report and exit code;
- generated manifest content is byte-stable after path and line-ending normalization;
- unsupported or ambiguous semantic input fails before mutation.

## 5. Collision And Existing File Policy

G1 must fail closed before mutation when:

- both historical and canonical manifest paths exist with different semantic content;
- the canonical output path exists and is not generator-owned or projection-equal;
- an operation id, permission code, event id, mutation table, or module dependency is duplicated after normalization;
- a package has no unambiguous module identity or manifest export;
- a discovered `packages/erp/*` workspace is not compatible with the manifest input contract.

Compatibility aliases may be read at ingress, but they cannot become second
public construction paths or permanent package exceptions.

## 6. Dry-Run And Diagnostics

Before any write mode is exposed, G1 must provide a read-only diagnostic path
that reports:

- discovered ERP package count and exact package paths;
- manifest location classification: historical, canonical, missing, duplicate, or blocked;
- canonical input availability for each package;
- planned projection target;
- superseded authority targeted for deletion;
- fixed exit-code outcome using the existing generator diagnostic protocol.

Any mutating projection must have a dry-run plan that can be compared to the
applied result.

## 7. Verification And Closure Evidence

G1 closes only when all are true:

- all ERP workspaces are discovered without `LIVING_ERP_MANIFEST_PACKAGES`;
- historical and canonical manifest locations are diagnosed correctly;
- the representative cohort regenerates byte-stably;
- every compatible ERP package uses the canonical manifest projection;
- `scripts/validate-modules.mjs` no longer assumes `src/module.manifest.ts`;
- the hard-coded manifest inventory is deleted or reduced to a generated projection owned by the ERP generator contract;
- existing public exports remain unchanged;
- existing endpoint outcomes remain unchanged;
- `pnpm exec vitest run --config testing/vitest.unit.config.ts --project repo-tooling` passes;
- `pnpm exec biome check turbo/generators` passes;
- `pnpm exec turbo run //#generator:check --force` passes;
- `pnpm validate:modules` passes or reports only pre-existing non-G1 blockers that are explicitly named and not caused by the cutover;
- a second projection and verification run produces zero diff;
- closure evidence records committed files, commands, and any excluded unrelated worktree deltas.

## 8. Explicit Exclusions

G1 must not:

- implement G2 layout convergence;
- move ERP feature folders, stores, schemas, adapters, or public facades except where a manifest import path must be updated;
- clean up unrelated `package.json` changes;
- change package public APIs or endpoint behavior;
- introduce `@afenda/erp`, `@afenda/shared`, `@afenda/generator`, or a runtime registry package;
- replace `WORKSPACE-EDGE-REGISTER.yaml` with a new dependency authority;
- claim Module Enterprise Readiness;
- push, deploy, or change CI required checks unless explicitly requested.

## G1 Implementation Entry

The first G1 coding slice should start with read-only diagnosis:

```text
G1.1: ERP manifest discovery and classification
```

It should add no mutating mode until the diagnostic report can name every ERP
workspace, classify manifest location, and prove the old hard-coded manifest list
can be replaced without losing validation coverage.
