# Fumadocs Core — Package Install (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/package-install.md` |
| Authority | **Scratch** — upstream [Package Install](https://fumadocs.dev/docs/headless/mdx/install) · [remark-npm](https://fumadocs.dev/docs/headless/mdx/remark-npm) · disk `@afenda/docs` |
| Status | **Outside baseline** (upstream **Deprecated**) — no `fumadocs-docgen` / `remarkInstall` |
| Audience | Engineers adding multi-package-manager install tabs in MDX |
| Updated | 2026-07-19 |

Upstream Package Install (`fumadocs-docgen` → `remarkInstall` → `` ```package-install `` fences) is **deprecated** for Fumadocs MDX. Defaults already cover package-manager tabs via [`remarkNpm`](https://fumadocs.dev/docs/headless/mdx/remark-npm).

Lite does **not** install `fumadocs-docgen` or wire `remarkInstall`. Prefer:

| Active | Role |
|--------|------|
| Fumadocs MDX default `remark-npm` | Package-manager fences without `fumadocs-docgen` |
| JSX `<Tabs>` / `<Tab>` | Already in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) |
| Prose | Prefer **`pnpm`** examples in Lite docs — [pnpm/README.md](../pnpm/README.md) |

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| No `fumadocs-docgen` | `@afenda/docs` `package.json` |
| No `remarkInstall` | [`source.config.ts`](../../apps/docs/source.config.ts) — `remarkBlockId` only |
| Tabs components | **Shipped** — `Tab` / `Tabs` in MDX registry (for hand-authored tabs · default npm plugin output) |
| No `persist` install options | Not configured |
| Deprecated path | Documented here — do not revive without reopen |

Wire test enforces `fumadocs-docgen` / `remarkInstall` absence (MDX Plugins lock).

---

## Upstream ladder (reference only — deprecated)

Do **not** paste into Lite.

```bash
# Upstream — NOT Lite
pnpm add fumadocs-docgen
```

```ts
// Upstream — NOT Lite
import { remarkInstall } from "fumadocs-docgen";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall],
    // or [[remarkInstall, { persist: { id: "some-id" } }]]
  },
});
```

````mdx
```package-install
my-package
```
````

Upstream expands to `<Tabs items={['npm','pnpm','yarn','bun']}>…`. Persistence wraps with `groupId` + `persist`.

---

## Active alternatives (Lite)

1. **Default remark-npm** (Fumadocs MDX) — see upstream [remark-npm](https://fumadocs.dev/docs/headless/mdx/remark-npm); no extra package.
2. **Hand-authored Tabs** when you need a custom set:

```mdx
<Tabs items={["pnpm", "npm"]}>
  <Tab value="pnpm">```bash
pnpm add my-package
```</Tab>
  <Tab value="npm">```bash
npm install my-package
```</Tab>
</Tabs>
```

(Exact fence nesting follows [markdown.md](markdown.md) / Fumadocs Tabs patterns.)

---

## When reopen is allowed

Explicit Docs Package Install reopen must cover:

1. Why deprecated `fumadocs-docgen` beats default `remark-npm` / JSX Tabs
2. Conflict with Active `remarkBlockId`-only explicit list — [mdx-plugins.md](mdx-plugins.md)
3. Persist / `groupId` UX vs stock Tabs
4. Wire tests flipped + this chapter + [markdown.md](markdown.md)

Until then: no `fumadocs-docgen`.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `fumadocs-docgen` install | Deprecated path · dual install-tab pipelines |
| `remarkInstall` beside defaults | Unneeded; upstream points at remark-npm |
| Treating Package Install as open backlog | Outside / deprecated — named reopen only |

---

## Verify

```text
1. package.json: no fumadocs-docgen
2. source.config.ts: no remarkInstall
3. mdx.tsx: Tab · Tabs present
4. Wire test: docs-openapi-wire MDX Plugins (docgen ban)
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · [remark-ts2js.md](remark-ts2js.md) (also Outside · needs `fumadocs-docgen`) · [ui-components.md](ui-components.md) · [../pnpm/README.md](../pnpm/README.md) · [README.md](README.md).
