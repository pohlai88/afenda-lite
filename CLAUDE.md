# Afenda-Lite — Claude Code instructions

**SSOT:** [AGENTS.md](AGENTS.md). This file is a short pointer — do not duplicate doctrine here.

## Scope (important)

- These instructions are for Claude Code only.
- Do not apply Cursor-, Copilot-, or Codex-specific workflows by default.
- `.cursor/**` (rules, hooks, skills, subagents) is Cursor's own extension surface — read it only if the user explicitly asks to use Cursor rules/skills here; do not auto-load it as if it were Claude Code config.
- `.github/copilot-instructions.md` and `.github/instructions/**` are VS Code Copilot scoped — ignore unless the user asks to use them.

## Quick reference

- **Engines:** Node `24.x` · pnpm `>=10.33.4` (root `package.json`)
- **Stack:** Next.js App Router · React 19 · TypeScript · Turbo · pnpm workspaces · Neon Postgres · Neon Auth · Drizzle
- **Commands:** `pnpm --filter @afenda/web dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm governance:packages` · `pnpm checks`
- **Product entry:** [AGENTS.md](AGENTS.md) skill router
- **Scratch ops:** `docs-V2/` (Living `docs/` absent by design until Docs-lane reopen)
- **Map:** [docs-V2/project-map.md](docs-V2/project-map.md)

## Hard stops

- Greenfield only under `apps/web/**` and `packages/*`
- UI: `import { … } from "@afenda/ui-system"` only
- Env: `import { env } from "@afenda/env"` — never raw `process.env` for product config
- No `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm` mega-packages
- `ActionResult<T>` (`ok: true | false`) from Server Actions — never `{ success, data }`
- Commit/push only when the user asks; never print secrets

## Permission gates (`.claude/settings.json`)

Mirrors the two safety-critical Cursor hooks (`.cursor/hooks/git-no-auto-recover.mjs`,
`.cursor/hooks/no-drizzle-baseline-migrate.mjs`) so the same guardrails apply
regardless of which agent is driving:

- **Git recover/discard** (`restore`, `reset`, `clean`, `revert`, forced
  checkout/switch, stash pop/apply/drop/clear, merge/rebase/cherry-pick
  abort) requires your explicit approval at the prompt — never auto-approved.
- **DB schema mutation** (`db:push`, `db:pull`, raw `drizzle-kit push|migrate`,
  `db:migrate`, `apply-*.mjs`) is denied outright. Canonical path is
  `db:generate` → `db:check` → `AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate`
  (see [AGENTS.md](AGENTS.md) / ARCH-028 S2.2 / N2).

## Cost-efficient defaults

- Keep scope to the stated request and done criteria; avoid unrelated refactors or exploratory sweeps.
- Start a new session when switching to a different feature/domain rather than carrying stale context.
- Read the living file or package `exports` before assuming an API exists.
