# G8 — Generator phase-exit convergence and read-only governance seal

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g8-generator-phase-exit-convergence-contract.md` |
| Role | Canonical phase-exit matrix for G0-G8 generator governance |
| Authority | G7 executable governance convergence check + `pnpm generator:check` |
| Mode | Read-only |
| Status | In progress until G1-G8 are committed and closure gates are recorded |

G8 reconciles implemented generator work, contract documents, executable gates,
documentation authority, and Git state into one defensible phase-exit record. It
does not add generator mutation capability.

## Phase matrix

| Slice | Contract | Implementation | Tests | Executable gate | Docs aligned | Commit | Status |
|-------|----------|----------------|-------|-----------------|--------------|--------|--------|
| `G0.x` | Present | Complete | Passing | Present | Aligned | Committed | Sealed |
| `G1` | Present | Complete | Present | Governed | Aligned | Committed | Sealed |
| `G2` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| `G3` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| `G4` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| `G5` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| `G6` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| `G7` | Present | Complete | Present | Authority | Aligned | Uncommitted | Pending seal |
| `G8` | Present | Read-only | Required | Phase-exit gate | Required | Separate | In progress |

The matrix distinguishes implemented, verified, committed, sealed, blocked, and
superseded states. Do not collapse them into a single ambiguous done marker.

## Retired authority policy

ERP manifest package authority is derived from the generator-owned manifest
authority projection. `LIVING_ERP_MANIFEST_PACKAGES` is retired and must not be
reintroduced as an implementation or validation authority.

Historical references may remain only when they explicitly describe retired
authority or migration history. Current governance instructions must identify
the generator-owned authority.

## G8 exclusions

- No generator write or apply mode.
- No repository mutation command.
- No automatic package correction.
- No kernel package adoption fixes.
- No expansion of ERP family scope.
- No new generator feature family.
- No remediation of unrelated root TypeScript defects.
- No mandatory independent worker audit unless a separate governance contract
  requires it.

## Exit criteria

G8 is sealed only when:

1. G0-G8 status is accurately recorded in this matrix.
2. G7 governance convergence validates this matrix from disk.
3. `pnpm generator:check` fails on governance drift and passes on the current
   governed surface.
4. No live implementation treats `LIVING_ERP_MANIFEST_PACKAGES` as authority.
5. Current governance docs identify the generator-owned manifest authority.
6. Required contracts, authority files, root gates, docs, and `__tests__` files
   are proven present.
7. `pnpm exec vitest run turbo/generators/__tests__` passes.
8. `pnpm exec tsc --noEmit --pretty false` passes or records only a proven
   non-generator pre-existing blocker.
9. `pnpm validate:modules` passes.
10. `pnpm check:docs-trunk-ban` passes.
11. `git diff --check` passes.
12. G1-G8 worktree changes are committed or explicitly classified.
