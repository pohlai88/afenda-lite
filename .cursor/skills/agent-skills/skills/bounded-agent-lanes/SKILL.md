---
name: bounded-agent-lanes
description: Executes one bounded agent mission per lane (Ops, Fix, Docs, Test, Normalize) with fixed files, non-goals, checks, and evidence. Use when assigning agent tasks, vibe coding, ops rollout, bug fixes, doc-only updates, test repair, or repo normalization — not open-ended exploration.
---

# Bounded Agent Lanes

## Core rule

Agents should not "explore and improve." Agents should execute one bounded purpose with clear files, non-goals, checks, and evidence.

## Five lanes

Give every agent task **one lane**:

| Lane | Purpose | Agent behavior |
|------|---------|----------------|
| Ops | Rollout, flags, smoke, evidence | No product changes |
| Fix | Bug fix only | Minimal patch |
| Docs | Update docs/cross-links | No code changes |
| Test | Add/repair tests | No feature expansion |
| Normalize | Repo structure cleanup | Separate branch only |

**Lane precedence:** Lane boundaries override generic phase skills. For example, `incremental-implementation` cannot expand Ops into product work; `code-simplification` cannot run in the Ops lane.

## Agent behavior

On every task:

1. **Identify lane** — from the mission prompt or infer from purpose (see Lane selection below).
2. **Refuse lane mixing** — do not combine Ops with Normalize, Docs with Fix, etc. in one commit.
3. **Stay inside target files** — do not wander flat `lib/` or `components/` without explicit paths in the mission.
4. **Run required checks** — commands listed in the mission or lane reference.
5. **Report evidence** — files changed, checks run, risks, commit recommendation.

If the mission lacks a lane or target files, ask once for clarification. Do not default to broad exploration.

## Mission prompt template

Use this format for every agent task:

```markdown
## Purpose
<one sentence>

## Lane
Ops | Fix | Docs | Test | Normalize

## Fixed boundaries
- Do not reopen Phase 2A product scope.
- Do not add 2B–2D.
- Do not add schema/UI/permission expansion.
- Do not touch unrelated layout/lib cleanup in this lane.

## Target files
- <exact files or folders>

## Allowed changes
- <short list>

## Forbidden changes
- <short list>

## Required checks
- <commands>

## Evidence to report
- Files changed
- Tests/checks run
- Any risks
- Commit recommendation
```

Adapt Fixed boundaries, Target files, and checks per lane and task. For repo-specific defaults (current active lane, Hot Sales ops authority), see [reference.md](reference.md).

## Lane selection

```
Task intent
    │
    ├── Rollout, flags, smoke, evidence, enable/rollback? ──→ Ops
    ├── Single bug, minimal patch? ─────────────────────────→ Fix
    ├── Docs, cross-links, ADRs only? ──────────────────────→ Docs
    ├── Add or repair tests only? ──────────────────────────→ Test
    └── lib/ or components/ structure cleanup? ─────────────→ Normalize (separate branch)
```

## Repo navigation

This repo has strong governance in `docs/` but large flat areas in `lib/` and `components/`. Those flat areas are future Normalize-lane work — **not** default exploration targets.

- **Ops / Fix / Test:** Open only files named in the mission or directly required to complete it.
- **Docs:** Stay under `docs/` unless cross-linking requires a one-line pointer elsewhere.
- **Normalize:** Dedicated branch only; see [docs/architecture/repo-layout.md](../../../../docs/architecture/repo-layout.md).

## Evidence report format

End every bounded mission with:

```markdown
## Evidence

### Files changed
- <paths>

### Checks run
- <command>: <pass/fail + brief note>

### Risks
- <none | list>

### Commit recommendation
- <yes/no + suggested message or "do not commit">
```

## Additional resources

- Current active lane and Hot Sales 2A ops defaults: [reference.md](reference.md)
