# Fumadocs Framework Mode — Validate Links (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/validate-links.md` |
| Authority | **Scratch** — upstream [Validate Links](https://fumadocs.dev/docs/integrations/validate-links) · disk `@afenda/docs` |
| Status | **Active** — `next-validate-link` via `tsx` · content walk (not Bun MDX loader) |
| Audience | Engineers changing MDX links or the docs link gate |
| Updated | 2026-07-19 |

Ensure internal links in docs content resolve. Pipeline stage: [automation.md](automation.md). Relative link habits: [practices.md](practices.md) · [markdown.md](markdown.md).

---

## Lite lock (configured)

| Concern | Lite |
|---------|------|
| Package | `next-validate-link` on `@afenda/docs` |
| Script | [`scripts/lint-links.mts`](../../apps/docs/scripts/lint-links.mts) |
| Command | `pnpm --filter @afenda/docs lint:links` (`tsx`) |
| Framework preset | `next` |
| Route populate | `docs/[[...slug]]` from `content/docs/**/*.mdx` |
| Component attrs | `Card` → `href` |
| Relative paths | `checkRelativePaths: "as-url"` |
| Monorepo gate | `pnpm check:docs-app` includes `lint:links` |

Upstream sample imports `source` and runs under **Bun** + Fumadocs MDX Loader. Lite **cannot** load `source` under `tsx` today (`.source/server.ts` top-level await / CJS transform). Configured substitute: walk `content/docs`, derive slugs/URLs, extract heading hashes from raw MDX, then `scanURLs` + `validateFiles`.

```text
content/docs/**/*.mdx
       │  walk + slug + heading hashes
       ▼
scanURLs({ preset: "next", populate: { "docs/[[...slug]]": … } })
       │
       ▼
validateFiles(…, { Card href · checkRelativePaths: "as-url" })
       │
       ▼
printErrors(…, true)  → exit non-zero on broken links
```

---

## Setup (configured)

```bash
pnpm --filter @afenda/docs lint:links
```

`package.json`:

```json
"lint:links": "pnpm exec tsx scripts/lint-links.mts"
```

Script highlights (Lite, not a Bun `source` import):

```ts
const scanned = await scanURLs({
  preset: "next",
  cwd: appRoot,
  populate: {
    "docs/[[...slug]]": pages.map((page) => ({
      value: { slug: [...page.slug] },
      hashes: extractHeadingHashes(page.content),
    })),
  },
});

printErrors(
  await validateFiles(files, {
    scanned,
    markdown: {
      components: {
        Card: { attributes: ["href"] },
      },
    },
    checkRelativePaths: "as-url",
  }),
  true,
);
```

| Upstream | Lite |
|----------|------|
| `source.getPages()` | `walkMdx(content/docs)` |
| `page.data.toc` hashes | Regex heading → slug hashes — TOC SSOT [get-toc.md](get-toc.md) |
| `page.data.getText('raw')` | `readFileSync` / `readFileFromPath` |
| `bun ./scripts/lint.ts` | `tsx scripts/lint-links.mts` |
| Bun Fumadocs MDX Loader | **Outside baseline** — see below |
| Node `register()` inventory | **Active** for page list — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) · link lint still uses content walk (not Bun) |

English-only tree (no `[lang]` segment) — [i18n.md](i18n.md).

---

## Running lint

| When | Run |
|------|-----|
| After narrative MDX / `meta.json` edits | `generate:source` (if needed) · `lint:links` |
| After OpenAPI regenerate | `generate:openapi-docs` · `lint:links` |
| Lean monorepo gate | `pnpm check:docs-app` |

Do not skip `lint:links` when adding Card `href`s or relative MDX links (`[…](./api/index.mdx)`).

---

## Outside baseline

| Pattern | Why |
|---------|-----|
| Bun + Fumadocs MDX Loader for lint | Lite runner is `tsx` |
| Importing `source` inside `lint-links.mts` | Breaks under current `tsx` + `.source` TLA |
| Renaming to upstream `scripts/lint.ts` only | Lite name `lint-links.mts` is the SSOT script |
| External URL crawl / linkcheck SaaS | Internal MDX graph only |
| Validating Living `docs/` | Dormant / absent — content is `apps/docs/content/docs` |

Reopen Bun/source-based lint only with a named Docs slice after `source` loads cleanly outside the Next runtime.

---

## Disk map

```text
apps/docs/
  scripts/lint-links.mts
  package.json                 # lint:links · next-validate-link
  content/docs/**/*.mdx        # validated corpus
```

Root: `package.json` → `check:docs-app` runs generate OpenAPI MDX + `lint:links`.

---

## Verify

```text
1. package.json: lint:links → tsx scripts/lint-links.mts · next-validate-link dep
2. lint-links.mts: preset next · Card href · checkRelativePaths as-url · no source import
3. pnpm --filter @afenda/docs lint:links → OK
4. Wire test: validate-links lock
5. check:docs-app still includes lint:links
```

Companion: [automation.md](automation.md) · [content.md](content.md) · [practices.md](practices.md) · [page-conventions.md](page-conventions.md).
