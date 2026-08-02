# G7 — Repo Documentation and Governance Convergence Contract

## Boundary

G7 owns read-only convergence checks across generator architecture documents,
generator authority source files, generator tests, and dormant Living docs
posture.

It does not restore Living `docs/`, create DOC-002 register rows, mutate package
code, or claim controlled-document acceptance. Scratch `docs-V2` remains the
operative engineering surface for this generator phase.

## Semantic owner

`turbo/generators/engine/governance-convergence.ts`

## Schema

`afenda.generator-governance-convergence/v1`

## Inputs

- `docs-V2/monorepo/README.md`
- G1–G7 generator contract docs under `docs-V2/monorepo`
- generator authority source files under `turbo/generators`
- generator tests under `turbo/generators/__tests__`
- repository posture for banned/dormant documentation trunks

## Required convergence

- Living `docs/` remains absent unless a Docs-lane reopen explicitly restores
  it.
- Legacy `doc/` remains absent.
- `docs-V2/monorepo/README.md` links the generator PRD and every G1–G7 contract.
- Every generator authority file has a matching `__tests__` file where the slice
  added executable behavior.
- Generator tests stay under `turbo/generators/__tests__`.
- Governance checks are deterministic and read-only.

## Diagnostics

G7 emits report issues, not generator runtime diagnostics. Runtime diagnostics
remain owned by family-specific authorities.

| Code | Severity | Meaning |
| --- | --- | --- |
| `AFG-GOV-001` | blocked | dormant Living `docs/` trunk exists |
| `AFG-GOV-002` | blocked | forbidden legacy `doc/` trunk exists |
| `AFG-GOV-003` | warning | required generator contract doc is missing |
| `AFG-GOV-004` | warning | monorepo README does not link a required contract |
| `AFG-GOV-005` | warning | required generator authority source is missing |
| `AFG-GOV-006` | warning | required generator test is missing |
| `AFG-GOV-007` | blocked | generator test is outside `__tests__` |

## Closure evidence

- G7 convergence report is deterministic.
- Required G1–G7 docs are present and linked.
- Required generator authority sources and tests are present.
- No Living `docs/` or legacy `doc/` trunk is created.
- Tests live under `turbo/generators/__tests__`.
- Generator tests, Biome, TypeScript, `generator:check`, module validation,
  docs trunk ban, and diff hygiene pass.

