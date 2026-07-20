# Official docs app — `@afenda/docs` (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/README.md` |
| Authority | **Scratch** — ops pack for `@afenda/docs` · disk `apps/docs` · OpenAPI YAML under `docs-V2/api/` |
| App | `@afenda/docs` · port **3001** |
| Status | **Active** — official human-facing documentation site (enterprise production bar) |
| Audience | Engineers maintaining docs content, Fumadocs UI, and the OpenAPI consumer |
| Updated | 2026-07-20 |

**What it is** — Scratch ops pack for Afenda-Lite’s official docs site (`@afenda/docs` / `apps/docs`): Fumadocs UI, MDX content, and the OpenAPI consumer.

**What it does** — Names Active baseline vs Outside locks, maps disk paths and docs env, and points to chapter runbooks for shell, MDX, loader, UI, OpenAPI, feedback, and gates.

**What you need** — Workspace Node **24.x** · pnpm **≥10.33.4** (root `package.json` `engines`). Docs config via `import { docsEnv } from '@afenda/env/docs'` — never raw `process.env`. Published MDX is the site content surface — not a Living controlled-document register.

**Who it’s for** — Docs maintainers regenerating API pages, editing MDX/UI, or wiring CI/host — not product runtime owners.

Parent Scratch index: [`../README.md`](../README.md). Agent checkout: [`AGENTS.md`](../../AGENTS.md). Sibling packs: [`../api/README.md`](../api/README.md) · [`../monorepo/README.md`](../monorepo/README.md) · [`../deploy/README.md`](../deploy/README.md). Product App Router: [`../nextjs/README.md`](../nextjs/README.md) — **not** this pack.

---

## Authority (why this shape)

| Layer | Role | This pack’s duty |
|-------|------|------------------|
| Scratch `docs-V2/docs/**` | Ops authority for `@afenda/docs` | Chapters = runbooks · Active vs Outside locks |
| Disk `apps/docs/**` | Running Fumadocs app | Wire must match Active chapters |
| Scratch `docs-V2/api/*.yaml` | OpenAPI machine SSOT | Consume only — do not copy into `apps/docs/openapi/` |
| `@afenda/env/docs` | Docs typed env (`docsEnv`) | Site origin + optional GitHub App feedback keys — [feedback.md](feedback.md) · [deploying.md](deploying.md) |
| Published MDX under `apps/docs/content/**` | Human-facing pages | Edit / regenerate — not a register or Accept/Living lifecycle |
| Living `docs/` (ARCH-* · GUIDE-* · MOD-* · control tree) | **Dormant** | Do not recreate; reopen is a separate Docs-lane mission |

Method aids (vendor): `fumadocs-mdx-structure` · `fumadocs-i18n` (structure only). **Not used:** `fumadocs-component-docs` / `fumadocs-registry-integration` (8bitcn / shadcn registry — banned).

---

## Pack structure

| Kind | Convention | Example |
|------|------------|---------|
| Pack entry | `README.md` (this file) | Orient · rules · start path · index |
| Topic chapter | `kebab-case.md` — no `{ID}-` prefix | [automation.md](automation.md) |
| Baseline tag | **Active** = on-disk baseline · **Outside** = locked until named reopen in chat | Topic index column |
| Owning detail | Chapter owns lock/reopen checklist | Do not reopen from this README alone |

Section order here: authority → rules → start path → local how-to → commands → pipeline → disk → topic index → failure modes → hard stops.

---

## Docs project rules (must)

Standing boundary for the active official docs app — not a backlog.

| # | Rule | Why |
|---|------|-----|
| 1 | No `DATABASE_URL` · Neon Auth · `CRON_SECRET` on the docs project | Docs site ≠ product runtime — secrets stay on `@afenda/web` / Vercel product |
| 2 | Docs env only via `@afenda/env/docs` (`docsEnv`) | `DOCS_URL` (default `http://localhost:3001`) · optional `GITHUB_APP_*` for feedback — never raw `process.env` · keys in root `.env.example` |
| 3 | No product Swagger / Scalar under `apps/web` | API UI lives in `@afenda/docs` via `fumadocs-openapi` |
| 4 | OpenAPI machine file stays at [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) | Zod → `pnpm openapi:generate` → `pnpm check:openapi` remains SSOT — never hand-edit YAML to “pass”; fix Zod/source then regenerate |
| 5 | One document id string across `createOpenAPI`, MDX `document=`, and `generate:openapi-docs` | Shared in [`apps/docs/lib/openapi-document-id.ts`](../../apps/docs/lib/openapi-document-id.ts) |
| 6 | English-only content until an explicit i18n slice | See [i18n.md](i18n.md) |
| 7 | No `_reference/` upload / Collapse restore into docs | Anti-contamination |
| 8 | Enterprise production quality only | No reduced-viability / “good enough later” docs bar |
| 9 | Host docs on Vercel project **`afenda-lite-docs`** (Root `apps/docs`, Node) — never product Deploy / Neon secrets | [deploying.md](deploying.md) |

**Owner:** Docs lane for Scratch prose + docs app; product Zod/handlers stay Ops/FE owning modules.

---

## Start here

| Step | File |
|------|------|
| 1 | This README |
| 2 | [next.md](next.md) — Framework Mode shell |
| 2a | [fumadocs-mdx-next.md](fumadocs-mdx-next.md) — `createMDX` · collections |
| 3 | [deploying.md](deploying.md) — Vercel Node host locks |
| 4 | [content.md](content.md) · [practices.md](practices.md) — tree · MDX habits |
| 5 | [openapi.md](openapi.md) · [automation.md](automation.md) — regenerate API pages · CI |
| 6 | [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) — Themes · Navbar · Search UI |
| 7 | [feedback.md](feedback.md) — page/block feedback · GitHub Discussions (App ops opened) |
| 8 | [validate-links.md](validate-links.md) · `pnpm check:docs-app` |

---

## Local development

Engines: Node **24.x** · pnpm **≥10.33.4** (root `package.json`).

```bash
# From repo root — optional DOCS_URL in .env.local (defaults to http://localhost:3001)
pnpm --filter @afenda/docs dev                 # :3001
```

After Zod/handler contract changes that affect the published OAS:

```bash
pnpm openapi:generate && pnpm check:openapi
pnpm --filter @afenda/docs generate:openapi-docs
pnpm check:docs-app                            # generate OpenAPI + package MDX + lint:links
```

Set `GITHUB_APP_*` in `.env.local` (and the docs host) after App install — see [feedback.md](feedback.md) and root `.env.example`.

---

## Commands

```bash
pnpm --filter @afenda/docs dev                 # :3001
pnpm --filter @afenda/docs generate:source
pnpm --filter @afenda/docs generate:openapi-docs
pnpm --filter @afenda/docs generate:package-docs
pnpm --filter @afenda/docs lint:links
pnpm --filter @afenda/docs list:source-pages   # Node inventory (fumadocs-mdx-node.md)
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs typecheck
pnpm --filter @afenda/docs build
pnpm --filter @afenda/docs fd -- -h            # Fumadocs CLI help (pinned)
pnpm openapi:generate && pnpm check:openapi    # product OAS SSOT (repo root)
pnpm check:docs-app                            # lean docs gate (also CI quality)
pnpm checks                                    # includes check:docs-app when apps/docs exists
```

---

## Pipeline

```text
Zod (apps/web modules) → pnpm openapi:generate → docs-V2/api/OPEN-001-openapi.yaml
       → pnpm check:openapi
       → apps/docs createOpenAPI + generateFiles → content/docs/api/*.mdx
       → generate:package-docs → content/docs/packages/*.mdx
       → fumadocs-mdx → .source/
       → typecheck / lint:links / build (:3001)
```

Lean gate: `pnpm check:docs-app` (generate OpenAPI MDX + package MDX + `lint:links`). CI `quality` runs it — [automation.md](automation.md).

**OAS SSOT:** committed YAML must stay generator-aligned with Zod — run `pnpm openapi:generate && pnpm check:openapi` after contract changes; never hand-edit YAML to “pass”. Dual copy `apps/docs/openapi/` remains absent. Product schemas: [`../api/README.md`](../api/README.md).

---

## Disk map

```text
apps/docs/
  cli.json                     # Fumadocs CLI — uiLibrary radix-ui (cli.md)
  source.config.ts             # defineDocs + defineConfig (mdxOptions + lastModified)
  lib/source.ts                # loader + lucideIconsPlugin + openapi.loaderPlugin
  lib/openapi-document-id.ts   # one document id string (README rule 5)
  lib/openapi.server.ts        # createOpenAPI → docs-V2 YAML
  lib/layout.shared.tsx        # Navbar + Layout Links
  lib/get-llm-text.ts          # Processed MDX → Markdown for LLMs
  lib/rss.ts                   # RSS 2.0 builder (rss.md)
  lib/github-feedback.ts       # Discussions actions (feedback.md)
  lib/docs-typescript.ts       # fumadocs-typescript helpers
  lib/build-graph.ts           # docs graph data
  components/mdx.tsx           # fumadocs-ui/mdx + Tabs/Steps/Files/… (ui-components.md)
  components/feedback/         # page + block feedback client (feedback.md)
  components/api-page.tsx      # OpenAPI APIPage wire
  scripts/generate-openapi-docs.mts
  scripts/lint-links.mts
  content/docs/                # MDX + meta.json (EN) — index · guide · api
  app/layout.tsx               # Banner + RootProvider + RSS alternate
  app/global.css               # Themes: neutral + preset (+ openapi) · --fd-layout-width 1400px
  app/api/search/route.ts      # createFromSource · english
  app/rss.xml/                 # RSS 2.0 route (rss.md)
  app/llms.txt/ · llms-full.txt/ · llms.mdx/
  app/og/docs/[...slug]/      # next/og cards
  next.config.mjs              # createMDX · .md rewrite
  vercel.json                  # Vercel Node · filter @afenda/docs · sin1
  app/docs/layout.tsx          # DocsLayout — pageTree · tabs={false}
  app/docs/[[...slug]]/        # DocsPage chrome + OpenAPI preload + Feedback
```

| Concern | Path |
|---------|------|
| App package | `apps/docs` (`@afenda/docs`) |
| Content | `apps/docs/content/docs/**` |
| Docs env schema | `packages/foundation/env/src/docs.ts` · import `@afenda/env/docs` |
| OAS input | `OPENAPI_DOCUMENT_ID` (`../../docs-V2/api/OPEN-001-openapi.yaml`) + absolute `OPENAPI_DOCUMENT_PATH` in `openapi-document-id.ts` |

---

## Topic index

Grouped by job. **Active** = baseline on disk. **Outside** = locked until a named Docs reopen in chat — chapter owns the lock detail.

### Shell · host · navigation

| Topic | File | Baseline |
|-------|------|----------|
| Framework Mode (Next.js) | [next.md](next.md) | Active |
| Deploying (Vercel Node) | [deploying.md](deploying.md) | Active |
| Access control | [access-control.md](access-control.md) | Outside (public) |
| Customize UI | [customize-ui.md](customize-ui.md) | Active |
| Page slugs · meta · tree | [page-conventions.md](page-conventions.md) | Active |
| Page tree utils | [page-tree-utils.md](page-tree-utils.md) | Active `pageTree` · helpers Outside |
| Navigation | [navigation.md](navigation.md) | Active |
| Orama search | [search-orama.md](search-orama.md) | Active |
| Feedback | [feedback.md](feedback.md) | Active UI · App ops opened · `GITHUB_APP_*` required on submit |
| RSS | [rss.md](rss.md) | Active |
| i18n | [i18n.md](i18n.md) | Outside (English-only) |

### Fumadocs MDX · content source

| Topic | File | Baseline |
|-------|------|----------|
| Getting Started (`defineDocs`) | [fumadocs-mdx.md](fumadocs-mdx.md) | Active |
| Next.js (`createMDX`) | [fumadocs-mdx-next.md](fumadocs-mdx-next.md) | Active |
| Global Options | [fumadocs-mdx-global.md](fumadocs-mdx-global.md) | Active |
| Presets | [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) | Active |
| Performance | [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) | Active |
| Entry / Server / Node | [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-server.md](fumadocs-mdx-server.md) · [fumadocs-mdx-node.md](fumadocs-mdx-node.md) | Active |
| Browser / Dynamic entry | [fumadocs-mdx-browser.md](fumadocs-mdx-browser.md) · [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) | Outside |
| Content source | [content-source.md](content-source.md) | Active (Fumadocs MDX) |
| Sanity · Local MD · MDX Remote · Content Collections | [sanity.md](sanity.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [content-collections.md](content-collections.md) | Outside |

### Loader · TOC · last edit

| Topic | File | Baseline |
|-------|------|----------|
| Loader API | [loader-api.md](loader-api.md) | Active |
| Loader source | [loader-source.md](loader-source.md) | Active |
| Loader plugins | [loader-plugins.md](loader-plugins.md) | Active — `lucideIconsPlugin` + `openapi.loaderPlugin` |
| Get TOC | [get-toc.md](get-toc.md) | Active |
| Last modified UI (`getGithubLastEdit`) | [git-last-edit.md](git-last-edit.md) | Outside · RSS uses MDX `lastModified` — [rss.md](rss.md) |

### UI · CLI · TypeScript · Markdown

| Topic | File | Baseline |
|-------|------|----------|
| UI map · layouts · components · CLI | [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md) · [cli.md](cli.md) | Active |
| TypeScript → docs | [typescript.md](typescript.md) | Active |
| Markdown / MDX syntax | [markdown.md](markdown.md) | Active |
| MDX plugins · headings · code · image · structure · LLMs remark | [mdx-plugins.md](mdx-plugins.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) · [remark-structure.md](remark-structure.md) · [remark-llms.md](remark-llms.md) | Active |
| Package Install · Admonition · Files · Steps · TS→JS remark | [package-install.md](package-install.md) · [remark-admonition.md](remark-admonition.md) · [remark-mdx-files.md](remark-mdx-files.md) · [remark-steps.md](remark-steps.md) · [remark-ts2js.md](remark-ts2js.md) | Outside (use JSX / hand Tabs) |
| Content tree · practices | [content.md](content.md) · [practices.md](practices.md) | Active |

### OpenAPI · LLMs · gates

| Topic | File | Baseline |
|-------|------|----------|
| OpenAPI consumer | [openapi.md](openapi.md) · [openapi-server.md](openapi-server.md) · [openapi-generate-files.md](openapi-generate-files.md) · [openapi-api-page.md](openapi-api-page.md) | Active |
| AsyncAPI | [asyncapi.md](asyncapi.md) | Outside (OpenAPI-only) |
| AI & LLMs · negotiation | [llms.md](llms.md) · [negotiation.md](negotiation.md) | Active `.md` / Page Actions · Ask AI & Accept proxy Outside |
| Validate links | [validate-links.md](validate-links.md) | Active |
| next/og | [og-next.md](og-next.md) | Active |
| Automation · CI | [automation.md](automation.md) | Active — CI `quality` → `pnpm check:docs-app` |

API wire shapes: [`../api/README.md`](../api/README.md) · [`../api/rest.md`](../api/rest.md).

---

## Failure modes

| Symptom | Likely cause | First check |
|---------|--------------|-------------|
| Build: missing OpenAPI document | YAML not generated, or SchemaRecord/id drift | `Test-Path docs-V2/api/OPEN-001-openapi.yaml` · `OPENAPI_DOCUMENT_PATH` in `openapi-document-id.ts` (cwd-independent) |
| Prerender: `preloaded` / `bundled` undefined | OpenAPI page without preload provider or empty `docs` | `[[...slug]]/page.tsx` `openApiPage.preloaded` + `OpenAPIPreloadProvider` · assert non-empty preload |
| SSG: `ENOTFOUND api.github.com` | Layout `GithubInfo` fetch during prerender | `components/github-info.tsx` — fail-soft link-only (no fake stars) |
| CSS: unknown utility `-inset-s-*` | Catalog `tailwindcss: ^4` resolved `@tailwindcss/postcss` below 4.3 | `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` (not `catalog:`) |
| Dev 500: Can't resolve `mdast-util-to-markdown` | pnpm no-hoist + fumadocs-openapi / search client graph | Declare `mdast-util-to-markdown` on `@afenda/docs` dependencies; restart `dev` |
| Drift: check:openapi fails | Hand-edited YAML or stale commit after Zod/handler change | Fix Zod / `scripts/generate-openapi.mts` if needed → `pnpm openapi:generate` → commit YAML — never hand-patch YAML |
| Feedback submit throws / missing credentials | `GITHUB_APP_*` unset or App not installed | [feedback.md](feedback.md) · `@afenda/env/docs` · `.env.example` |
| Broken sidebar after new page | `meta.json` not updated | [content.md](content.md) |
| Search dialog empty / 404 | (1) Stale/absent `.source/` · (2) Missing `createFromSource` route | `pnpm --filter @afenda/docs generate:source` · `app/api/search/route.ts` · [search-orama.md](search-orama.md) |

---

## Hard stops

| Stop | Why |
|------|-----|
| Treat published MDX as a Living controlled-document register | Wrong layer — Scratch ops + disk app only until Docs-lane reopen |
| Recreate Living `docs/` or `doc/` from this pack | Dormant by design — named Docs-lane recovery only |
| Copy YAML into `apps/docs/openapi/` | Dual SSOT |
| Swagger under `apps/web/app` | Forbidden by API contract |
| Docs app product secrets / Neon Auth on docs | Docs ≠ product runtime |
| Deploy docs via product `deploy.yml` / product Vercel project | Host lock — [deploying.md](deploying.md) |
| 8bitcn / external registry on docs | Banned |
| Treating Outside topics as open backlog | Named Docs reopen only — see Topic index |
| Provisional / reduced-viability docs quality bar | Enterprise production only |

Outside chapters own reopen checklists (access-control · i18n · Sanity · AsyncAPI · browser/dynamic MDX · CMS alts · deprecated remark plugins · git-last-edit UI · Ask AI · Accept Markdown proxy · feedback App credentials ops).

Companion skills: `/using-afenda-elite-skills` · `afenda-elite-api-contract` · `afenda-readme-diataxis` · vendor `fumadocs-mdx-structure` · `fumadocs-i18n` (when locales reopen).
