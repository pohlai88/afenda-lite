# Fumadocs Framework Mode — Navigation (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/navigation.md` |
| Authority | **Scratch** — upstream [Navigation](https://fumadocs.dev/docs/navigation) · disk `@afenda/docs` |
| Status | **Active** — Layout Links + Page Tree sidebar · no versioning |
| Audience | Engineers changing docs nav chrome or content tree |
| Updated | 2026-07-19 |

Configure navigation in the official docs app. Prop tables for Navbar / Layout Links / Sidebar: [ui-layouts.md](ui-layouts.md). Slugs and `meta.json`: [page-conventions.md](page-conventions.md).

---

## Overview (Lite)

Fumadocs UI navigation has two primary surfaces. Lite uses both on the **Docs** shell only (no `HomeLayout`).

| Surface | Role | Lite |
|---------|------|------|
| **Layout Links** | Frequent top-level destinations in layout chrome | **Shipped** — Guide · API · custom GithubInfo |
| **Sidebar items** | Links to all documentation pages | **Shipped** — from Page Tree (`source.pageTree`) |

```text
baseOptions()                    → nav · links · githubUrl
DocsLayout tree={source.pageTree} → sidebar from content/docs + meta.json
tabs={false}                     → Layout Tabs off (sections = Layout Links)
```

| Disk | Purpose |
|------|---------|
| [`lib/layout.shared.tsx`](../../apps/docs/lib/layout.shared.tsx) | `baseOptions()` — Navbar + Layout Links SSOT |
| [`app/docs/layout.tsx`](../../apps/docs/app/docs/layout.tsx) | `DocsLayout` · `tree` · `sidebar` · `tabs={false}` |
| [`content/docs/**/meta.json`](../../apps/docs/content/docs/meta.json) | Sidebar order / labels |

Do **not** re-declare `nav` / `links` on `DocsLayout` — spread `{...baseOptions()}` only.

---

## Layout Links (configured)

| Link | `url` | `active` | Notes |
|------|-------|----------|-------|
| Guide | `/docs/guide` | `nested-url` | Primary |
| API | `/docs/api` | `nested-url` | Primary |
| GithubInfo | — | — | `type: "custom"` · `secondary: true` |

`githubUrl` on `baseOptions` points at `https://github.com/pohlai88/afenda-lite`. Full options: [ui-layouts.md](ui-layouts.md) Layout Links.

---

## Sidebar / Page Tree (configured)

| Concern | Lite |
|---------|------|
| Tree source | `source.pageTree` from `loader()` — never a hardcoded `tree={{…}}` |
| Order | Root `meta.json` `pages: ["index", "guide", "api"]` |
| Collapsible | `true` |
| Prefetch | `false` |
| Layout Tabs | **Off** — `tabs={false}` · no folder `"root": true` |

After tree edits: `pnpm --filter @afenda/docs generate:source`. Detail: [page-conventions.md](page-conventions.md) · [content.md](content.md). Hand-rolled walks (`findNeighbour`, …): Outside — [page-tree-utils.md](page-tree-utils.md).

---

## Versioning

Upstream documents two patterns. **Both are Outside baseline** for Lite until a named Docs versioning slice.

### Partial versioning (folders)

Separate version trees under folders (e.g. `java-sdk/v1`, `java-sdk/v2`) and optionally show them as Layout Tabs.

| Lite | Rule |
|------|------|
| Folder version trees | **Outside baseline** — not present |
| Layout Tabs for version folders | **Outside baseline** — `tabs={false}` locked |

Do not add `v1`/`v2` content folders or enable Layout Tabs without a named slice (then update this pack + wire tests).

### Full versioning (branch / subdomain)

Ship an entire docs site per version (Git branch + separate deploy / subdomain), optionally cross-link versions from chrome.

| Lite | Rule |
|------|------|
| Version branches as separate docs apps | **Outside baseline** |
| Subdomain version hosts (`v2.…`) | **Outside baseline** |
| Cross-version Layout Links | **Outside baseline** |

Lite publishes one English docs tree on `@afenda/docs`. Product OpenAPI versions stay in the YAML SSOT / operation pages — not as Fumadocs multi-version trees.

---

## Outside baseline (do not add without named slice)

| Pattern | Why |
|---------|-----|
| Layout Tabs / `"root": true` folders | Sections are Layout Links — [ui-layouts.md](ui-layouts.md) |
| Partial version folders (`v1`/`v2`) | Single current docs tree |
| Full version branch + subdomain | One official `@afenda/docs` deploy |
| `HomeLayout` nav / marketing links | Docs shell only — home redirects to `/docs` |
| Hardcoded `tree={{ name, children }}` | Breaks OpenAPI-generated sync |
| Menu-type Layout Links (`NavbarMenu`) | Not in `baseOptions` |

---

## Verify

```text
1. layout.shared.tsx: Guide + API links · GithubInfo · no type:"menu"
2. docs/layout.tsx: tree={source.pageTree} · {...baseOptions()} · tabs={false}
3. content/docs/meta.json: pages index · guide · api — no "root": true
4. No version folder trees under content/docs
5. Wire test: navigation lock
6. Spot-check :3001 — header Guide/API · sidebar from tree
```

Companion: [ui-layouts.md](ui-layouts.md) · [page-conventions.md](page-conventions.md) · [content.md](content.md) · [next.md](next.md).
