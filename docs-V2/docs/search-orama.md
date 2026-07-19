# Fumadocs Framework Mode — Orama search (default) (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/search-orama.md` |
| Authority | **Scratch** — upstream [Orama (default)](https://fumadocs.dev/docs/search/orama) · disk `@afenda/docs` |
| Status | **Active** — server `createFromSource` · stock fetch client · English |
| Audience | Engineers changing docs search index or dialog |
| Updated | 2026-07-19 |

Default search engine for Lite. Dialog / `RootProvider` chrome props: [ui.md](ui.md) Search UI. Framework Mode install: [next.md](next.md).

---

## Overview (Lite)

Fumadocs wires [Orama](https://docs.orama.com/) out of the box. Two upstream modes:

| Mode | How it works | Lite |
|------|--------------|------|
| **fetch (default)** | API route on the server; stock dialog fetches it | **Shipped** |
| **static** | Cached JSON + client-side `@orama/orama` | **Outside baseline** |

Lite uses **fetch mode** only — no Static Export search client, no custom `components/search.tsx`.

```text
Stock SearchDialog (RootProvider default)
       │  GET /api/search?…
       ▼
createFromSource(source, { language: "english" })
       │
       ▼
source (MDX page tree · public)
```

---

## Configured disk

| Path | Role |
|------|------|
| [`app/api/search/route.ts`](../../apps/docs/app/api/search/route.ts) | Orama index via `createFromSource` |
| [`app/layout.tsx`](../../apps/docs/app/layout.tsx) | Bare `<RootProvider>` — stock dialog (no `search` prop) |
| [`lib/source.ts`](../../apps/docs/lib/source.ts) | Indexed `source` |

```ts
// apps/docs/app/api/search/route.ts
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
});
```

| Knob | Lite |
|------|------|
| Backend | Bundled Orama via `createFromSource` (not Orama Cloud / Algolia / Typesense) |
| Language | `"english"` — matches English-only content lock |
| Client | Stock dialog → `/api/search` (default fetch client) |
| Direct `@orama/orama` dependency | **Not declared** — only needed for static mode |

After content changes: `pnpm --filter @afenda/docs generate:source` so the index rebuilds from `.source/`.

Document structure extract (default `remarkStructure` → search blocks): [remark-structure.md](remark-structure.md).

---

## Setup — fetch (default) vs static

### Fetch (Lite — shipped)

Upstream: stock UI is already configured; optional recreate of `components/search.tsx` with `useDocsSearch` + `fetchClient`.

| Lite | Rule |
|------|------|
| Stock dialog | **Shipped** — do not pass `search={{ SearchDialog }}` |
| Custom `components/search.tsx` | **Outside baseline** |
| `fetchClient({ locale })` | Outside baseline — English-only i18n lock — [i18n.md](i18n.md) |

### Static (Outside baseline)

Upstream Static Export path: install `@orama/orama`, `oramaStaticClient`, `initOrama` with `language: 'english'`, and static mode on the search server.

Do **not** add without a named Docs Static Export / search slice:

- `pnpm add @orama/orama` on `@afenda/docs`
- `components/search.tsx` with `oramaStaticClient`
- `RootProvider search={{ SearchDialog }}`
- Static JSON export of the search index

---

## Replace Search Dialog

Upstream replaces the dialog from `<RootProvider search={{ SearchDialog }}>` (often via a client `Provider` wrapper).

| Lite | Rule |
|------|------|
| Bare `<RootProvider>{children}</RootProvider>` | **Shipped** |
| Custom `SearchDialog` / client Provider | **Outside baseline** — [ui.md](ui.md) |

---

## Tag Filter

Upstream optional UI (`TagsList` / `TagsListItem`) + server tag filter + `fetchClient({ tag })`.

| Lite | Rule |
|------|------|
| Tag filter server config | **Outside baseline** |
| `TagsList` in a custom dialog | **Outside baseline** |

Single public index over the whole English tree — no Guide/API tag chips until a named slice.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Static Orama client / `@orama/orama` direct dep | Fetch mode only · no Static Export |
| Custom `components/search.tsx` | Stock dialog |
| `RootProvider search={{…}}` | Stock dialog props — [ui.md](ui.md) |
| Tag filter UI + server tags | Single untagged index |
| Orama Cloud / Algolia / Typesense | Bundled Orama only |
| Multi-locale `fetchClient({ locale })` | English-only — [i18n.md](i18n.md) |
| Gated / filtered search source | Public docs — [access-control.md](access-control.md) |

---

## Verify

```text
1. app/api/search/route.ts: createFromSource(source, { language: "english" })
2. app/layout.tsx: bare RootProvider — no search= · no SearchDialog
3. No apps/docs/components/search.tsx
4. package.json: no direct @orama/orama dependency
5. Route / layout: no oramaStaticClient · TagsList · tag filter
6. Wire test: Orama lock
7. Spot-check :3001 — ⌘K / Ctrl+K hits /api/search
```

Companion: [ui.md](ui.md) Search UI · [next.md](next.md) · [automation.md](automation.md) · [access-control.md](access-control.md).
