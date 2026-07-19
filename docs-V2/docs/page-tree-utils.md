# Fumadocs Core — Page Tree Utils (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/page-tree-utils.md` |
| Authority | **Scratch** — upstream [Page Tree Utils](https://fumadocs.dev/docs/headless/utils/page-tree) · [Page Tree definitions](https://fumadocs.dev/docs/headless/page-tree) · disk `@afenda/docs` |
| Status | **Active** — tree via Loader `source.pageTree` · **Outside** hand-rolled `fumadocs-core/page-tree` helpers in app code |
| Audience | Engineers customizing prev/next, breadcrumbs, or multi-root tree walks |
| Updated | 2026-07-19 |

Upstream helpers walk a [Page Tree](https://fumadocs.dev/docs/headless/page-tree) `Root`:

| Helper | Role |
|--------|------|
| `findNeighbour` | Previous / next page for a URL |
| `findSiblings` | Sibling nodes under the same parent |
| `findParent` | Parent folder/node |
| `findPath` | Path to first matching node (matcher) |
| `getPageTreeRoots` | Root folders in the tree |

Lite builds the tree with Fumadocs MDX + `loader()` and passes **`source.pageTree`** to `DocsLayout`. Stock Fumadocs UI consumes that tree for sidebar (and built-in footer nav when enabled). App code does **not** import `fumadocs-core/page-tree` for custom walks.

Authoring / `meta.json`: [page-conventions.md](page-conventions.md). Nav overview: [navigation.md](navigation.md). Layout: [ui-layouts.md](ui-layouts.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Tree SSOT | [`lib/source.ts`](../../apps/docs/lib/source.ts) → `source.pageTree` |
| Layout | [`app/docs/layout.tsx`](../../apps/docs/app/docs/layout.tsx) — `tree={source.pageTree}` |
| No hardcoded tree | Wire rejects `tree={{` — [content-source.md](content-source.md) |
| No app `page-tree` utils | No `findNeighbour` / `findSiblings` / `findParent` / `findPath` / `getPageTreeRoots` under `apps/docs` `lib` · `app` · `components` |
| Graph View “neighbors” | Force-graph adjacency in [`graph-view.tsx`](../../apps/docs/components/graph-view.tsx) — **not** Page Tree Utils |

Wire test enforces Active `source.pageTree` + Page Tree Utils absence.

---

## Why not hand-walk the tree (Lite)

| Need | Lite approach |
|------|----------------|
| Sidebar | `DocsLayout` + `source.pageTree` |
| Page order / groups | `meta.json` — [page-conventions.md](page-conventions.md) |
| Custom prev/next chrome | Outside until named reopen (use stock DocsPage footer if reopened) |
| Breadcrumbs / multi-root tabs | Layout Tabs Outside — [ui-layouts.md](ui-layouts.md) · [navigation.md](navigation.md) |

Duplicating walks in app code drifts from the tree Fumadocs UI already holds.

---

## Upstream ladder (reference only)

```ts
// Upstream — NOT Lite app path
import {
  findNeighbour,
  findSiblings,
  getPageTreeRoots,
  findParent,
  findPath,
  type Root,
} from "fumadocs-core/page-tree";

const pageTree: Root = source.pageTree; // or a custom Root

findNeighbour(pageTree, "/docs/guide");
findSiblings(pageTree, "/docs/guide");
findParent(pageTree, "/docs/guide");
getPageTreeRoots(pageTree);
findPath(pageTree.children, (node) => node.type === "page" && node.url === "/docs/guide");
```

---

## When reopen is allowed

Explicit Docs Page Tree Utils reopen must cover:

1. UI that needs walks beyond stock DocsLayout / DocsPage
2. Still use `source.pageTree` as input — never a parallel hardcoded `Root`
3. URL baseUrl `/docs` parity with loader
4. Interaction with Graph View / Feedback / OpenAPI folders
5. Wire tests updated + [page-conventions.md](page-conventions.md) · [navigation.md](navigation.md) · this chapter

Until then: `source.pageTree` only; no app imports from `fumadocs-core/page-tree`.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| `findNeighbour` (etc.) without reopen | Dual nav logic beside Fumadocs UI |
| Hardcoded `Root` for utils | Diverges from Loader tree — [content-source.md](content-source.md) |
| Confusing Graph View neighbors with Page Tree Utils | Different graphs · different SSOT |
| Treating utils as open backlog | Outside for app code — named reopen only |

---

## Verify

```text
1. docs/layout.tsx: tree={source.pageTree}
2. No fumadocs-core/page-tree imports under apps/docs lib/app/components
3. No findNeighbour · findSiblings · getPageTreeRoots · findParent · findPath calls
4. Wire test: docs-openapi-wire Page Tree Utils lock
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [page-conventions.md](page-conventions.md) · [loader-api.md](loader-api.md) · [navigation.md](navigation.md) · [content-source.md](content-source.md) · [ui-layouts.md](ui-layouts.md) · [README.md](README.md).
