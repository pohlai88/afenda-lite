---
name: afenda-test
description: Canonical portal test command — orchestrates afenda-test-engineer for L0–L4 gap analysis, Prove-It specs, surface/options-popout placement, Vitest interaction, and Playwright @smoke/@journey. Use for /afenda-test, missing tests, coverage review, auth spine E2E planning, or changes under **/*.{test,spec}.{ts,tsx}, testing/**, and e2e/**.
disable-model-invocation: true
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "**/*.interaction.test.tsx"
  - testing/**
  - e2e/**
---

# Afenda Test (`/afenda-test`)

**Canonical command.** Pairs with [`.agents/subagents/afenda-test-engineer.md`](../../subagents/afenda-test-engineer.md) only.

## Decomposition (what lives where)

| Concern | Owner | Path |
| --- | --- | --- |
| Orchestration, scope, spawn, exit criteria | **This command** | `.agents/skills/afenda-test/SKILL.md` |
| Analysis method, pyramid, report template | **Persona** | `.agents/subagents/afenda-test-engineer.md` |
| L4 Playwright, spine declarations, spec patterns | **Reference** | `.agents/skills/afenda-test/reference/` |
| Runtime commands, exports | **Factory README** | `testing/README.md` |

Do not add parallel test personas or a third native test skill — consolidate here.

## When to use

- `/afenda-test` or test/coverage questions on the current change
- Prove-It analysis for a bug
- Playwright `@smoke` or auth spine planning
- Surface + options popout layer placement
- Authoring/reviewing `*.test.ts(x)`, `*.interaction.test.tsx`, `*.spec.ts`, or `e2e/**`

## Workflow

### 1. Scope

```bash
git diff --name-only
git diff
```

### 2. Load persona (single authority for analysis)

Read [`.agents/subagents/afenda-test-engineer.md`](../../subagents/afenda-test-engineer.md).

The persona lists mandatory supporting reads and the output template. Do not duplicate that list in this command.

**On-demand references** (Read when diff touches auth ingress or Playwright):

- [reference/l4-playwright.md](reference/l4-playwright.md)
- [reference/portal-auth-spine.md](reference/portal-auth-spine.md)
- [reference/l4-spec-patterns.md](reference/l4-spec-patterns.md)

### 3. Spawn one persona

Single Task:

- Load prompt from `.agents/subagents/afenda-test-engineer.md`
- `readonly: true`
- Include diff + instruction: Prove-It, surface/options-popout columns, minimum gates only

### 4. Output

Post the test engineer report **verbatim**.

Optional verification (user request only):

```bash
pnpm test:unit
pnpm test:interaction
pnpm test:e2e:smoke
pnpm exec turbo run lint typecheck test
```

## Rules

1. One persona — `afenda-test-engineer`
2. Personas do not call personas
3. L2 before L4 for options popout unless full navigation is the claim
4. Minimum gate per changed area — not `npm test` unless release scope
5. Reject Cypress and Jest as new runners

## Verification

Command complete when:

1. Scope determined
2. Persona file Read; auth/L4 refs Read when applicable
3. Single `afenda-test-engineer` Task spawned with diff
4. Report posted verbatim
