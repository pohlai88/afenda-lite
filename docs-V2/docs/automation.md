# Docs automation (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/automation.md` |
| Authority | **Scratch** — official `fumadocs-openapi` `generateFiles` · disk `apps/docs/scripts/**` · Xerp-shaped lint (Lite-scoped) |
| Audience | Engineers wiring CI or regenerating API docs |
| Updated | 2026-07-19 |

This guide is the **internal runbook** for the official docs pipeline. It assumes [README.md](README.md) docs project rules.

---

## End-to-end flow

| Stage | Command | Output / gate |
|-------|---------|---------------|
| 1. Zod → OAS | `pnpm openapi:generate` | [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) |
| 2. OAS honesty | `pnpm check:openapi` | Drift + Spectral + api-now `route.ts` on disk |
| 3. OAS → MDX | `pnpm --filter @afenda/docs generate:openapi-docs` | `content/docs/api/*` via `generateFiles` — [openapi-generate-files.md](openapi-generate-files.md) · AsyncAPI Outside — [asyncapi.md](asyncapi.md) |
| 4. MDX → collections | `pnpm --filter @afenda/docs generate:source` | `.source/` (gitignored) |
| 4b. Node inventory | `pnpm --filter @afenda/docs list:source-pages` | Offline `source.getPages()` via `register()` — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) |
| 5. Links | `pnpm --filter @afenda/docs lint:links` | Broken internal links fail — [validate-links.md](validate-links.md) |
| 6. Wire contract | `pnpm --filter @afenda/docs test` | Document id + loader + CSS preset + search route + anti-8bitcn |
| 7. Types / SSG | `typecheck` · `build` | Local or CI job — not every `pnpm checks` |

Search UI: stock `<RootProvider>` dialog (⌘K / Ctrl+K) + `app/api/search/route.ts` → `createFromSource(source)` (bundled Orama — no Cloud). Covered by `typecheck` / `build` / wire `test`. SSOT: [search-orama.md](search-orama.md) · [ui.md](ui.md) Search UI · Themes. Ban scan: `rg -n "8bitcn|ComponentPreview" apps/docs` must exit with no matches (rg exit `1` = clean).

Lean monorepo gate (no full Next build): `pnpm check:docs-app` → generate OpenAPI MDX + lint:links. Link tool SSOT: [validate-links.md](validate-links.md).

---

## Official generator contract

Fumadocs OpenAPI **v10+** requires:

```ts
import { createRequire } from "node:module";
import { openapi } from "../lib/openapi.server.ts";

// CJS require: fumadocs-openapi@11 ESM entry breaks xml-js under Node/tsx.
const { generateFiles } = createRequire(import.meta.url)("fumadocs-openapi");

void generateFiles({
  input: openapi, // server instance — not a path string array
  output: "./content/docs/api",
  per: "operation",
  meta: true,
  addGeneratedComment: true,
});
```

| Rule | Detail |
|------|--------|
| Single `openapi` export | [apps/docs/lib/openapi.server.ts](../../apps/docs/lib/openapi.server.ts) — [openapi-server.md](openapi-server.md) |
| `input: openapi` | Matches [fuma-nama/fumadocs](https://github.com/fuma-nama/fumadocs) docs |
| Hand `api/index.mdx` | Narrative intro — generator must not clobber it |
| Orphan cleanup | After generate, delete `*.mdx` not listed in `meta.json` pages |
| EN only | No locale matrix until [i18n.md](i18n.md) reopens |

Lite script: `apps/docs/scripts/generate-openapi-docs.mts` (`createOpenAPI` → `generateFiles`). OSS samples may use other filenames — do not invent a second generator.

---

## When to run what

| Change | Run |
|--------|-----|
| Handler / Zod / envelope | Stages 1–3 · preferably 5–7 |
| Narrative MDX only | Stage 4 · 5 · spot `dev` |
| Document id / openapi.server.ts | Stages 3–6 |
| Tailwind / fumadocs CSS | Stage 7 `build` |

---

## CI (configured)

| Job | Include |
|-----|---------|
| Fast docs gate | `.github/workflows/ci.yml` `quality` → `pnpm check:docs-app` (`generate:openapi-docs` + `lint:links`) |
| Local lean gate | `pnpm checks` includes `check:docs-app` when `apps/docs` exists |
| Product OAS | `check:openapi` (in `pnpm checks`; not duplicated in CI quality) |
| Docs typecheck / wire test | CI `turbo run typecheck test` covers `@afenda/docs` |
| Docs deploy / PR smoke | `pnpm --filter @afenda/docs build` on docs-touched promote paths |
| Docs host promote | [deploying.md](deploying.md) — Vercel Node · separate docs project · not product `deploy.yml` |

Do **not** require full `@afenda/web` build for docs-only MDX edits.

---

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| `generateFiles({ input: ['./file.yaml'] })` | Pass the **server** instance |
| Second YAML under `apps/docs/openapi/` | Forbidden — SSOT stays docs-V2 |
| Committing `.source/` | Keep gitignored |
| Skipping `check:openapi` after handler change | Docs pages will lie about live HTTP |

---

## Verify

```bash
pnpm check:openapi
pnpm check:docs-app
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs typecheck
pnpm --filter @afenda/docs build
```

Companion: [openapi.md](openapi.md) · [openapi-server.md](openapi-server.md) · [openapi-generate-files.md](openapi-generate-files.md) · [content.md](content.md) · [deploying.md](deploying.md) · skill `afenda-elite-api-contract/openapi.md`.
