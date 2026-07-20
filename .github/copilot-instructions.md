# Afenda-Lite — GitHub Copilot instructions

**SSOT for agent doctrine:** [AGENTS.md](../AGENTS.md). Prefer that file over inventing conventions.

## Engines / stack

Node `24.x` · pnpm `>=10.33.4` · Next.js App Router · React 19 · TypeScript · Turborepo · Neon Postgres · Neon Auth · Drizzle (`@afenda/db`) · `@afenda/ui-system` barrel · Biome.

## Commands

`pnpm --filter @afenda/web dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm governance:packages` · `pnpm checks`

## Routing

1. Read [AGENTS.md](../AGENTS.md) (PREFLIGHT · skill router · non-negotiable rules).
2. Product work → `.cursor/skills/using-afenda-elite-skills/SKILL.md`.
3. Scratch architecture → [docs-V2/README.md](../docs-V2/README.md) · [docs-V2/project-map.md](../docs-V2/project-map.md).

## Must follow

- Greenfield under `apps/web/**` and `packages/*` only
- `import { … } from "@afenda/ui-system"` · `import { env } from "@afenda/env"`
- Server Actions: authz + Zod inside; return `ActionResult<T>` (`ok: true | false`) from `@/modules/platform/schemas/action-result` (backed by `@afenda/errors/result`)
- `@afenda/db` hosts schema/migrations — not business write ownership
- Do **not** create `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm`
- Follow [AGENTS.md](../AGENTS.md) non-negotiable rules (enterprise production bar; no shim/stub product paths; no parking or false-delete authority; no Living `docs/` recreate; no Collapse path recovery)
- Commit only when the user asks; never print secrets
