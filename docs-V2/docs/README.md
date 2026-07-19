# Fumadocs Day-1 mirror (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/README.md` |
| Authority | **Scratch** — `using-afenda-elite-skills` Day-1 rules · disk `apps/docs` · OpenAPI SSOT under `docs-V2/api/` |
| App | `@afenda/docs` · port **3001** |
| Audience | Engineers maintaining the docs app + OpenAPI consumer |
| Updated | 2026-07-19 |

Fumadocs is a **documentation mirror**, not Controlled DOC-001 authority. Product contracts stay under Scratch `docs-V2/**`. Living controlled `docs/` (incl. `_control`) is **absent by design** until an explicit Docs-lane reopen — do not treat MDX pages or a restored Living tree as SSOT for API, auth, or tenancy.

Method aids (vendor): `fumadocs-mdx-structure` · `fumadocs-i18n` (structure only). **Not used here:** `fumadocs-component-docs` / `fumadocs-registry-integration` (8bitcn / shadcn registry — out of scope for Lite docs).

---

## What this pack enables

| Decision / action | Use |
|-------------------|-----|
| Full Fumadocs UI configuration map | [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md) |
| Change docs app layout / MDX habits | [practices.md](practices.md) · [content.md](content.md) · [ui-layouts.md](ui-layouts.md) |
| Stock search / nav / MDX UI | [ui.md](ui.md) · `app/api/search/route.ts` · `lib/layout.shared.tsx` · `components/mdx.tsx` · `/docs/guide` |
| Change api-now HTTP or regenerate API pages | [openapi.md](openapi.md) · [automation.md](automation.md) |
| Add CI / local gates for docs | [automation.md](automation.md) |
| Plan multi-locale later | [i18n.md](i18n.md) (not shipped) |

**Owner:** Docs lane for Scratch prose; product Zod/handlers stay Ops/FE owning modules. `@afenda/docs` must not grow product secrets.

---

## Day-1 rules (must)

| # | Rule | Why |
|---|------|-----|
| 1 | No `DATABASE_URL` · Neon Auth · `CRON_SECRET` on the docs project | Mirror only — secrets stay on `@afenda/web` / Vercel product |
| 2 | No product Swagger / Scalar under `apps/web` | API UI lives in `@afenda/docs` via `fumadocs-openapi` |
| 3 | OpenAPI machine file stays at [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) | Zod → `pnpm openapi:generate` → `pnpm check:openapi` remains SSOT |
| 4 | One document id string across `createOpenAPI`, MDX `document=`, and `generate:openapi-docs` | Prevents preload / generator drift |
| 5 | English-only content until an explicit i18n slice | See [i18n.md](i18n.md) |
| 6 | No `_reference/` upload / Collapse restore into docs | Anti-contamination |

---

## Pipeline (mental model)

```text
Zod (apps/web modules) → pnpm openapi:generate → docs-V2/api/OPEN-001-openapi.yaml
       → pnpm check:openapi
       → apps/docs createOpenAPI + generateFiles → content/docs/api/*.mdx
       → fumadocs-mdx → .source/
       → typecheck / lint:links / build (:3001)
```

Detail: [automation.md](automation.md).

---

## Disk map

```text
apps/docs/
  source.config.ts          # fumadocs-mdx defineDocs + providerImportSource
  lib/source.ts             # loader + openapi.loaderPlugin()
  lib/openapi.server.ts     # createOpenAPI → docs-V2 YAML
  lib/layout.shared.tsx     # BaseLayoutProps — nav · githubUrl · Guide/API links
  components/mdx.tsx        # fumadocs-ui/mdx + Tabs/Steps/Files/… (see ui-components.md)
  scripts/generate-openapi-docs.mts   # fumadocs-openapi generateFiles
  scripts/lint-links.mts              # next-validate-link
  content/docs/             # MDX + meta.json (EN) — index · guide · api
  app/layout.tsx            # RootProvider
  app/global.css            # fumadocs-ui neutral + preset (+ openapi preset)
  app/api/search/route.ts   # createFromSource (stock Orama)
  app/docs/layout.tsx       # DocsLayout + pageTree
  app/docs/[[...slug]]/     # DocsPage chrome + OpenAPI preload
```

| Concern | Path |
|---------|------|
| App package | `apps/docs` (`@afenda/docs`) |
| Content | `apps/docs/content/docs/**` |
| OAS input | `../../docs-V2/api/OPEN-001-openapi.yaml` (from apps/docs cwd) |
| Product App Router | [`../nextjs/README.md`](../nextjs/README.md) — **not** this pack |

---

## Reading order

| Step | File |
|------|------|
| 1 | This README |
| 2 | [automation.md](automation.md) — generate · lint · CI |
| 3 | [ui.md](ui.md) — Fumadocs UI configuration map (theme · search · CLI) |
| 4 | [ui-layouts.md](ui-layouts.md) — RootProvider · DocsLayout · nav · deferred layouts |
| 5 | [ui-components.md](ui-components.md) — MDX component catalog + status |
| 6 | [practices.md](practices.md) — MDX frontmatter / body habits |
| 7 | [content.md](content.md) — tree, meta.json, hand vs generated |
| 8 | [openapi.md](openapi.md) — Fumadocs OpenAPI consumer |
| 9 | [i18n.md](i18n.md) — forward multi-locale (not shipped) |

API wire shapes: [`../api/README.md`](../api/README.md) · [`../api/rest.md`](../api/rest.md). Workspace DAG: [`../monorepo/README.md`](../monorepo/README.md).

---

## Commands

```bash
pnpm --filter @afenda/docs dev                 # :3001
pnpm --filter @afenda/docs generate:source
pnpm --filter @afenda/docs generate:openapi-docs
pnpm --filter @afenda/docs lint:links
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs typecheck
pnpm --filter @afenda/docs build
pnpm openapi:generate && pnpm check:openapi    # product OAS SSOT (repo root)
pnpm check:docs-app                            # lean docs gate (generate + lint:links)
```

---

## Failure modes

| Symptom | Likely cause | First check |
|---------|--------------|-------------|
| Build: missing OpenAPI document | Wrong cwd or YAML not generated | `Test-Path docs-V2/api/OPEN-001-openapi.yaml` · document id string |
| Prerender: `preloaded` / `bundled` undefined | OpenAPI page without preload provider | `[[...slug]]/page.tsx` + `OpenAPIPreloadProvider` |
| CSS: unknown utility `-inset-s-*` | Catalog `tailwindcss: ^4` resolved `@tailwindcss/postcss` below 4.3 | `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` (not `catalog:`) |
| Dev 500: Can't resolve `mdast-util-to-markdown` | pnpm no-hoist + fumadocs-openapi / search client graph | Declare `mdast-util-to-markdown` on `@afenda/docs` dependencies; restart `dev` |
| Drift: check:openapi fails | Hand-edited YAML or stale commit | `pnpm openapi:generate` then commit YAML |
| Broken sidebar after new page | `meta.json` not updated | [content.md](content.md) |
| Search dialog empty / 404 | Missing `createFromSource` route | `app/api/search/route.ts` · `generate:source` |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Fumadocs-as-authority | Breaks DOC-001 / Scratch split |
| Copy YAML into `apps/docs/openapi/` | Dual SSOT |
| Swagger under `apps/web/app` | Forbidden by API contract |
| Docs app product secrets | Day-1 mirror boundary |
| 8bitcn / external registry on docs | Not Lite docs scope |

Companion skills: `/using-afenda-elite-skills` · `afenda-elite-api-contract` · vendor `fumadocs-mdx-structure` · `fumadocs-i18n` (when locales reopen).
