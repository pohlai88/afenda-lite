# G17 — Generator stop boundary

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g17-generator-stop-boundary-contract.md` |
| Role | Explicit stop condition for current Turbo generator roadmap |
| Authority | `turbo/generators/engine/local-repo-governance.ts` + `pnpm generator:check` |
| Mode | Read-only |
| CI | Not required |
| Status | Complete when remaining slice count is zero |

G17 is the local stop boundary for the current generator roadmap. It prevents
silent invention of more G-slices after the agreed local generator closure.

## Stop policy

The local report must state:

1. `remainingSlices` is empty.
2. `nextGeneratorSlice` is `null`.
3. Reopening generator work requires a new explicit contract.
4. Future work must not be smuggled into the completed G-slice sequence.

## What can still happen after G17

- Use the existing local generators.
- Fix defects found by the existing gates.
- Open a new named contract if a new generator capability is required.

## Exclusions

- No G18 by implication.
- No CI coupling.
- No hidden roadmap backlog.
- No claim that unrelated repository blockers are solved.