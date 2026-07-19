# Docs automation (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/automation.md` |
| Authority | **Scratch** — official `fumadocs-openapi` `generateFiles` · disk `apps/docs/scripts/**` · Xerp-shaped lint (Lite-scoped) |
| Audience | Engineers wiring CI or regenerating API docs |
| Updated | 2026-07-19 |

This guide is the **internal runbook** for the Day-1 docs pipeline. It assumes [README.md](README.md) Day-1 rules.

---

## End-to-end flow

| Stage | Command | Output / gate |
|-------|---------|---------------|
| 1. Zod → OAS | `pnpm openapi:generate` | [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) |
| 2. OAS honesty | `pnpm check:openapi` | Drift + Spectral + api-now `route.ts` on disk |
| 3. OAS → MDX | `pnpm --filter @afenda/docs generate:openapi-docs` | `content/docs/api/*` via `generateFiles({ input: openapi })` |
| 4. MDX → collections | `pnpm --filter @afenda/docs generate:source` | `.source/` (gitignored) |
| 5. Links | `pnpm --filter @afenda/docs lint:links` | Broken internal links fail |
| 6. Wire contract | `pnpm --filter @afenda/docs test` | Document id + loader + CSS preset + search route + anti-8bitcn |
| 7. Types / SSG | `typecheck` · `build` | Local or CI job — not every `pnpm checks` |

Stock search: `app/api/search/route.ts` exports `GET` from `createFromSource(source)` (bundled Orama — no Cloud). No separate step; covered by `typecheck` / `build` / wire `test`. UI config map (search · theme · RootProvider): [ui.md](ui.md). Ban scan: `rg -n "8bitcn|ComponentPreview" apps/docs` must exit with no matches (rg exit `1` = clean).

Lean monorepo gate (no full Next build): `pnpm check:docs-app` → generate OpenAPI MDX + lint:links.

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
| Single `openapi` export | [apps/docs/lib/openapi.server.ts](../../apps/docs/lib/openapi.server.ts) |
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

## CI recommendation

| Job | Include |
|-----|---------|
| Fast docs gate (`pnpm checks` / `check:docs-app`) | `generate:openapi-docs` + `lint:links` (+ wire `test` when cheap) |
| Product OAS | `check:openapi` (already in `pnpm checks`) |
| Docs deploy / PR smoke | `pnpm --filter @afenda/docs typecheck` · `build` on docs-touched PRs |

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

Companion: [openapi.md](openapi.md) · [content.md](content.md) · skill `afenda-elite-api-contract/openapi.md`.
