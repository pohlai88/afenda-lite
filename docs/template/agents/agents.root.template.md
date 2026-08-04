# AGENTS.md

Instructions for AI coding agents (Cursor, Claude Code, Codex, GitHub Copilot) in this
Afenda-Lite checkout. Package-local `AGENTS.md` files list **deltas only** and win on
conflict for that package. Do not fork root doctrine into package files.

This file is a **shape reference**. Diff it against the living root `AGENTS.md` before
any hand-copy. Prefer short deltas over restating the full agent operating contract.
Never replace living root `AGENTS.md` from this template without an explicit order.

## Scope

- This file: monorepo-wide truth for agents in this checkout
- Package / app `AGENTS.md`: local deltas only
- Product farm entry: `/using-afenda-elite-skills`

## Engines

- Node `{{ENGINES_NODE}}`
- pnpm `{{ENGINES_PNPM}}`

## Hard stops (keep aligned with living root)

- Greenfield only under `apps/web/**` and `packages/*`
- UI: `import { … } from "@afenda/ui-system"` only
- Env: `import { env } from "@afenda/env"` — never raw `process.env` for product config
- Lint/format: Biome + `@afenda/config` — not Prettier/ESLint ad-hoc stacks
- Enterprise production quality bar only — no MVP framing
- No shim/stub/TODO-throw product paths
- No Collapse/legacy path recovery without a named approval this turn
- Commit/push only when the user asks; never print secrets

## PREFLIGHT

When the turn uses skills, MCP, or project rules, open with the PREFLIGHT block from
living root `AGENTS.md` / `.cursor/rules/agent-authority-preflight.mdc`.

## Verify

Prefer focused package gates. Broad root verification only when justified
(`afenda-focused-verification` / `focused-verification-lane`).

## Authority

| Surface | Role |
| --- | --- |
| Living root `AGENTS.md` | Agent operating contract |
| `docs/` | Live documentation trunk |
| `governance/kernel/` | Kernel package register + `pnpm check:kernel-governance` |
