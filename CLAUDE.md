# Afenda-Lite — Claude Code instructions

**SSOT for agent doctrine:** [AGENTS.md](AGENTS.md). Prefer that file over inventing conventions.

## Product

| Edition | Role |
|---------|------|
| **Afenda-Lite** | This checkout — multi-module SaaS |
| **Afenda-Elite** | Same DOC-001 control shape; not a second stack |

**Hosting:** GitHub `pohlai88/afenda-lite` · Vercel `afenda-lite` · `APP_URL=https://www.nexuscanon.com`

## Engines / tech stack

- **Engines:** Node `24.x` · pnpm `>=10.33.4` (root `package.json`)
- Next.js App Router (`apps/web`) · React 19 · TypeScript · Turborepo
- Neon Postgres (shared schema, hard `organization_id`) · Neon Auth · Drizzle in `@afenda/db`
- UI: owned-source `@afenda/ui-system` (flat barrel)
- Lint/format: Biome + `@afenda/config`

## Commands

```bash
pnpm install
cp .env.example .env.local   # fill DATABASE_URL, NEON_AUTH_*, APP_URL
pnpm validate:neon-env
pnpm --filter @afenda/web dev

pnpm lint
pnpm typecheck
pnpm test
pnpm governance:packages
pnpm checks
```

## How to work here

1. Open [AGENTS.md](AGENTS.md) — PREFLIGHT, skill router, non-negotiable rules.
2. Product work: route via `.cursor/skills/using-afenda-elite-skills/SKILL.md`.
3. Architecture day-to-day: [docs-V2/README.md](docs-V2/README.md) · condensed [docs-V2/project-map.md](docs-V2/project-map.md).
4. Always-apply Cursor rules under `.cursor/rules/` still apply as project law when editing code.
5. One mission per chat; verify with pasted command evidence; commit only when asked.

## Boundaries

- Greenfield under `apps/web/**` and `packages/*` only — no Collapse/legacy path recovery
- Living controlled `docs/` absent by design — do not recreate; use `docs-V2/`
- Follow [AGENTS.md](AGENTS.md) non-negotiable rules (enterprise production bar; no shim/stub product paths; no parking or false-delete authority)
- `@afenda/db` = schema + connectivity only; domain writes stay in owning packages
- Do not create `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm`
