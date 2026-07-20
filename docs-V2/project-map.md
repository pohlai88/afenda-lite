# Project map (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/project-map.md` |
| Authority | **Scratch** — condensed navigation index (not a second SSOT) |
| Updated | 2026-07-21 |

One screen for “where do I start?” Full packs stay under [README.md](README.md). Agent doctrine: [AGENTS.md](../AGENTS.md).

---

## For agents

1. [AGENTS.md](../AGENTS.md) — PREFLIGHT · skill router · non-negotiable rules · patterns · confusion/planning templates
2. [`.cursor/skills/using-afenda-elite-skills/SKILL.md`](../.cursor/skills/using-afenda-elite-skills/SKILL.md) — sole product farm entry (same path in `.cursorrules` · `CLAUDE.md` · `.windsurfrules` · Copilot instructions)
3. This tree — day-to-day architecture (Living `docs/` absent by design)

Cross-tool pointers: [`.cursorrules`](../.cursorrules) · [`CLAUDE.md`](../CLAUDE.md) · [`.windsurfrules`](../.windsurfrules) · [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

## For humans

1. [README.md](../README.md) — local development
2. [system/README.md](system/README.md) — what ships
3. Official docs site — [`apps/docs`](../apps/docs) (`@afenda/docs`)

---

## Key paths

| Area | Path | Notes |
|------|------|-------|
| App (product) | `apps/web` | Sole Vercel product deployable · `proxy.ts` edge gate |
| App domains | `apps/web/modules/{platform,identity}` | Server domain adapters |
| App UI features | `apps/web/features/*` | Feature shells · forms |
| App Actions | `apps/web/app/actions/*` | `"use server"` · `ActionResult` |
| Packages | `packages/<category>/<name>` | Identity stays `@afenda/<name>` |
| Package catalog | [packages/README.md](../packages/README.md) | Bands · DAG summary |
| Schema / migrations | `packages/data-plane/db` | DDL host — not business write owner |
| Tests | package `__tests__` · `apps/web/__tests__` · `testing/` · `e2e/` | Factory SSOT = `testing/` |
| Scratch packs | `docs-V2/**` | This tree |
| Always-apply rules | `.cursor/rules/*.mdc` | PREFLIGHT · coding-discipline · bans |
| Skills | `.cursor/skills/**` | Elite farms + vendor method library |

## Critical authority files

| File | Role |
|------|------|
| [AGENTS.md](../AGENTS.md) | Agent checkout doctrine |
| [monorepo/README.md](monorepo/README.md) · [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) | Import / layer DAG |
| [modules/WORKSPACE-EDGE-REGISTER.yaml](modules/WORKSPACE-EDGE-REGISTER.yaml) | Authorized `@afenda/*` edges |
| [modules/SCHEMA-OWNERSHIP-MANIFEST.yaml](modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) | Table `writeOwner` sole mutator |
| [tenancy/README.md](tenancy/README.md) | Shared schema · hard `organization_id` |
| [data/README.md](data/README.md) | Drizzle · `withOrg` · migrate guards |
| [api/README.md](api/README.md) | ActionResult · RH envelopes · OpenAPI |

## Package bands (disk)

| Band | Folder | Examples |
|------|--------|----------|
| R1-A Foundation | `packages/foundation/` | `config` · `env` · `errors` |
| R1-B Runtime | `packages/runtime/` | `logger` · `http` · `cache` · `metrics` |
| R1-C Data plane | `packages/data-plane/` | `db` · `audit` · `events` · `search` · `notifications` |
| R1-D Control | `packages/control-plane/` | `auth` · `admin` |
| R1-F ERP | `packages/erp/` | `master-data` · `sales` · … · `accounting` |
| R1-X Intelligence | `packages/intelligence/` | `ai-the-machine` |
| R2 Surfaces | `packages/surfaces/` | `ui-system` · `emails` |

`@afenda/db` = schema + connectivity. Domain repositories stay in their owning packages. Do not invent `@afenda/repositories` · `@afenda/data-access` · `@afenda/orm`.

## Verify (common)

```bash
pnpm governance:packages
pnpm lint
pnpm typecheck
pnpm test
pnpm check:docs-trunk-ban
```

E2E pack read order: [README.md § E2E read order](README.md#e2e-read-order-skill-sequence).
