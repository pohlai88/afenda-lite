# Afenda-Lite — Claude Code

@AGENTS.md

<!-- Cursor's guardrails live in .cursor/hooks/*.mjs; Claude's equivalents are
     enforced in .claude/settings.json. Don't restate them here — hooks fire
     regardless of what this file says. -->

## Environment
- Node `24.x` · pnpm `>=10.33.4`
- Dev: `pnpm --filter @afenda/web dev`
- **Done check:** run `pnpm checks` before calling any task complete, and show the output
- Docs live in `docs/`. `docs-V2/` is retired and removed — never recreate it or cite it as on-disk authority

## Hard stops
- Greenfield only under `apps/web/**` and `packages/*`
- UI: import from `@afenda/ui-system` only
- Config: `import { env } from "@afenda/env"` — never raw `process.env`
- No `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm` mega-packages
- Server Actions return `ActionResult<T>` (`ok: true | false`) — never `{ success, data }`
- Commit or push only when asked. Never print secrets.

## Gotchas
- Verify an export exists in the package's `exports` before importing it — workspace packages are narrower than they look
- DB schema: `db:generate` → `db:check` → `AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate`. Nothing else applies schema.
- `.cursor/**` and `.github/copilot-instructions.md` belong to other agents — ignore unless asked
