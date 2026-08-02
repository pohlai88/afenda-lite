# G15 — Local-only generator closure governance

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g15-local-generator-closure-governance-contract.md` |
| Role | Local repository generator closure guard |
| Authority | `turbo/generators/engine/local-repo-governance.ts` + `pnpm generator:check` |
| Mode | Read-only |
| CI | Not required |
| Status | Complete when the local report is emitted by `generator:check` |

G15 deliberately does not add GitHub Actions, CI required checks, deployment
wiring, or remote enforcement. The closure surface is local repository governance
only.

## Contract

`generator:check` must include a local governance section proving:

1. G15 is local-only.
2. CI is not required.
3. `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` are excluded
   from this slice.
4. Local closure is derived from generator-owned code, not a hand-maintained
   checklist.
5. The result is read-only and deterministic.

## Exclusions

- No CI workflow edits.
- No GitHub branch protection changes.
- No required remote status check.
- No release automation.
- No package mutation.