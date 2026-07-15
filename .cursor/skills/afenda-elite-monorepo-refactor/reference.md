# Elite monorepo refactor — types and gates

Local Elite refactor types and scoped gates.

## Refactor types

| Type | When | Slice pattern |
|------|------|---------------|
| `extract` | Shared by 2+ packages | A surface → B impl → C consumers → D delete duplicate |
| `move` | Wrong package, legal DAG | A add target → B consumers → C remove source |
| `rename-export` | Public API rename | A new export → B consumers → D remove old |
| `split-package` | Mixed concerns | Multi-slice extract + move |
| `layer-fix` | Illegal import direction | extract/move to lower layer + consumer-migration |
| `consumer-migration` | Contract stable, call sites stale | C only |
| `removal` | Housekeeping unused-* | Slice D only after classify |

**Direction:** code flows to the **lowest valid** `@afenda/*` layer that may own the behavior. `apps/web` (and future `apps/*`) never imported by packages. See [`afenda-elite-monorepo-discipline`](../afenda-elite-monorepo-discipline/LAYERS.md).

## Gate matrix

| Situation | Gates |
|-----------|-------|
| Single package touch | `pnpm --filter <pkg> typecheck` · package tests |
| Cross-package move | + consumer typecheck · cycles check when available |
| package.json deps change | + lockfile consistent · export surface check when available |
| Docs app touch | Confirm no DB/Auth/`CRON_SECRET` env; no `_reference` publish |
| Glossary-related | Edit YAML/seed only; run `glossary:sync` when present |
| Pre-scaffold Lite tree | Scoped `tsc --noEmit` · relevant `vitest` · no full-repo format write |

## Impact table template

```markdown
| Package | Role | Imports source? | In this slice? |
|---------|------|-----------------|----------------|
| @afenda/… | source / target / consumer | yes/no | yes/no |
```
