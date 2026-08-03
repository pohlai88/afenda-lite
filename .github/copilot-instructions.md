# Afenda-Lite — GitHub Copilot instructions

**SSOT for agent doctrine:** [AGENTS.md](../AGENTS.md). Prefer that file over inventing conventions.

## VS Code scope (important)

- These instructions are for GitHub Copilot in VS Code only.
- Do not apply Cursor- or Claude-specific workflows by default.
- Ignore `.cursor/**`, `CLAUDE.md`, and `.windsurfrules` unless the user explicitly asks to use them.

## Preflight block (VS Code Copilot)

When a task uses repository rules or external tools, start with this compact preflight header:

```text
### PREFLIGHT
- Engaging: rules | tools (list what applies)
- Rules: copilot-instructions | none
- Tools: list tool names | none
- Output: short statement of intended result
```

Skip preflight for pure casual chat or one-line answers with no tools and no repo policy impact.

## Engines / stack

Node `24.x` · pnpm `>=10.33.4` · Next.js App Router · React 19 · TypeScript · Turborepo · Neon Postgres · Neon Auth · Drizzle (`@afenda/db`) · `@afenda/ui-system` barrel · Biome.

## Commands

`pnpm --filter @afenda/web dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm governance:packages` · `pnpm checks`

## Cost-efficient Copilot defaults (VS Code)

- Use auto model selection by default.
- Keep reasoning effort at regular by default; increase only for complex architecture/debugging tasks.
- Avoid switching model, reasoning level, or toolset mid-session to preserve cache efficiency.
- Start a new chat when switching to a different problem area.
- Prompt with clear scope: goal, files/paths, constraints, and explicit done criteria.
- Prefer focused implementation tasks over broad exploratory edits in one run.
- Keep deterministic guardrails in the loop (`pnpm lint`, `pnpm typecheck`, targeted tests) before finalizing changes.

## VS Code workspace optimization baseline

- Keep `AGENTS.md` enabled and nested AGENTS discovery disabled (`chat.useAgentsMdFile: true`, `chat.useNestedAgentsMdFiles: false`).
- Disable Claude instruction/session loading in this workspace (`chat.useClaudeMdFile: false`, `github.copilot.chat.claudeAgent.enabled: false`).
- Load workspace instruction files only from `.github/instructions` and disable user-profile instruction folders for this repo.
- Keep `chat.includeApplyingInstructions: true` and `chat.includeReferencedInstructions: false` for lower context overhead.
- Keep organization-level instructions disabled in this workspace unless explicitly required.

## One-time manual setup (per developer)

- In Copilot Chat model selector, keep model on `Auto` by default.
- Keep reasoning at regular/default, and only raise for hard debugging or architecture tasks.
- Do not change model, reasoning, or enabled toolsets in the middle of an active task.

## Routing

1. Read [AGENTS.md](../AGENTS.md) (PREFLIGHT · skill router · non-negotiable rules).
2. Product work in VS Code: follow this file first, then apply repo conventions from [AGENTS.md](../AGENTS.md) as needed.

## Must follow

- Greenfield under `apps/web/**` and `packages/*` only
- `import { … } from "@afenda/ui-system"` · `import { env } from "@afenda/env"`
- Server Actions: authz + Zod inside; return `ActionResult<T>` (`ok: true | false`) from `@/modules/platform/schemas/action-result` (backed by `@afenda/errors/result`)
- `@afenda/db` hosts schema/migrations — not business write ownership
- Do **not** create `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm`
- Follow [AGENTS.md](../AGENTS.md) non-negotiable rules (enterprise production bar; no shim/stub product paths; no parking or false-delete authority; no Living `docs/` recreate; no Collapse path recovery)
- Commit only when the user asks; never print secrets
