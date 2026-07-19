# Fumadocs Framework Mode — Customize UI (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/customize-ui.md` |
| Authority | **Scratch** — upstream [Customize UI](https://fumadocs.dev/docs/guides/customize-ui) · disk `@afenda/docs` |
| Status | **Active** — Lite ladder locked: **props → CSS tokens → CLI customize (named slice only)** |
| Audience | Engineers (and agents) changing docs shell UI |
| Updated | 2026-07-19 |

Upstream treats Fumadocs UI as a middleground between full local UI ownership and an opinionated package. Lite follows the same ladder and **stops at props + theme tokens** unless a named Docs slice opens CLI `customize`.

Layouts detail: [ui-layouts.md](ui-layouts.md). Themes / Search: [ui.md](ui.md). CLI install of MDX components: [cli.md](cli.md) (`add` ≠ `customize`).

---

## Ladder (configured)

| Step | Upstream | Lite |
|------|----------|------|
| 1 · **Props** | `DocsLayout` / `DocsPage` options · JSX in slots | **Shipped** — prefer this first |
| 2 · **CSS** | Target stable `#nd-*` / `data-*` only; avoid deep child selectors | **Shipped** — theme CSS + `--fd-layout-width` only |
| 3 · **CLI customize** | `cli customize` · layout / slots into local files | **Outside baseline** — no `apps/docs/layouts/**` fork |

Feed this ladder to agents before editing docs UI.

---

## Step 1 — Props (preferred)

Disk: [`apps/docs/app/docs/layout.tsx`](../../apps/docs/app/docs/layout.tsx) · [`lib/layout.shared.tsx`](../../apps/docs/lib/layout.shared.tsx) · page chrome in `[[...slug]]/page.tsx`.

```tsx
<DocsLayout
  tree={source.pageTree}
  {...baseOptions()}
  sidebar={{
    enabled: true,
    collapsible: true,
    prefetch: false,
  }}
  tabs={false}
>
  {children}
</DocsLayout>
```

| Pattern | Lite |
|---------|------|
| Sidebar / tabs / nav via props | **Shipped** — [ui-layouts.md](ui-layouts.md) |
| JSX in `links` / custom items | **Shipped** — GithubInfo custom link |
| `containerProps={{ className }}` | Outside baseline — not set |
| Layout `slots` | Outside baseline — not set |
| `sidebar={{ enabled: false }}` | Outside baseline — sidebar stays on |

Most needs (TOC footer, sidebar banner, extra nav) should be new props / `baseOptions()` items — not CSS forks or layout customize.

---

## Step 2 — CSS (careful)

Disk: [`apps/docs/app/global.css`](../../apps/docs/app/global.css).

| Allowed | Lite |
|---------|------|
| Theme imports | `fumadocs-ui/css/neutral.css` + `preset.css` (+ OpenAPI) |
| Layout width token | `--fd-layout-width: 1400px` |
| Component-owned CSS | `image-zoom.css` (CLI Image Zoom) |

| Avoid | Why |
|-------|-----|
| `#nd-docs-layout #nd-subnav { … }` style overrides | Fragile vs UI upgrades |
| `[data-toc-popover] > div` (deep child) | Upstream “bad example” — DOM not versioned |
| Parallel layout grids fighting `#nd-docs-layout` variables | Breaks sidebar / header / TOC |

Prefer props. If CSS is required, target only documented `id` / `data-*` attributes — never presume child structure.

---

## Step 3 — CLI customize (Outside baseline)

```bash
pnpm --filter @afenda/docs fd:customize
```

| Fact | Lite |
|------|------|
| Script | `fd:customize` → `cli customize` |
| `cli.json` `layoutDir` | `./layouts` |
| Forked layouts on disk | **Absent** — keep `import { DocsLayout } from "fumadocs-ui/layouts/docs"` |
| Types after customize | Would switch to local `@/layouts/…` types — only after named slice |

Costs (upstream): no automatic UI updates for forked files; re-install can wipe edits; CLI tracks latest Core/UI.

**Do not run `fd:customize` without a named Docs slice** that updates [ui-layouts.md](ui-layouts.md) + wire tests + import paths.

Contrast: `fd:add` / `fd:add:silent` for **MDX UI components** under `components/` is **Active** — that is not layout customize — [cli.md](cli.md) · [ui-components.md](ui-components.md).

---

## Ground truth

```text
apps/docs/
  app/docs/layout.tsx          # DocsLayout from fumadocs-ui (props)
  app/global.css               # Themes + --fd-layout-width (no invasive #nd overrides)
  lib/layout.shared.tsx        # nav / links props
  layouts/                     # ABSENT — customize Outside baseline
  components/*.tsx             # CLI add (MDX UI) — not layout customize
```

---

## Hard stops

| Stop | Why |
|------|-----|
| `fd:customize` without named slice + Scratch update | Layout fork undocumented |
| Invasive CSS on `#nd-*` children | Breaks on Fumadocs UI upgrades |
| Importing DocsLayout from `@/layouts` while package layout still claimed | Dual source |
| Treating customize as default path for small tweaks | Use props first |

---

## Verify

```text
1. app/docs/layout.tsx imports fumadocs-ui/layouts/docs (not @/layouts)
2. apps/docs/layouts absent (or empty of DocsLayout fork)
3. global.css: no #nd-subnav / [data-toc-popover] > overrides
4. Wire test: customize-ui lock
5. pnpm --filter @afenda/docs typecheck · test -- docs-openapi-wire
```

Companion: [ui-layouts.md](ui-layouts.md) · [ui.md](ui.md) · [cli.md](cli.md) · [ui-components.md](ui-components.md).
