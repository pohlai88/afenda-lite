# `@afenda/ui-system`

Rank-2 Surfaces design system for Afenda-Lite: owned-source shadcn **new-york** / Radix primitives, semantic tokens, and a **flat public barrel**. Product UI imports **only** from this package — never deep `src/` paths, never a second UI gateway, never the retired `@afenda/ui` package.

Use this package from `apps/web` features, shells, and auth chrome when you need buttons, forms, overlays, data display, or `cn`. Tokens land via `@afenda/ui-system/styles.css` (maps to `src/styles/tokens.css`). Maintainers run lint / typecheck / Vitest and add primitives via `ui:add` (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — **flat barrel only**:

```ts
import { Button, Card, cn, Dialog, Input, Label } from "@afenda/ui-system";
```

Tokens (once per app stylesheet — e.g. `apps/web/globals.css`):

```css
@import "@afenda/ui-system/styles.css";
```

**Do not:** `import … from "@afenda/ui-system/src/…"`, product-import `apps/web/shadcn-studio/**`, or restore `@afenda/ui`. Studio DNA stages under `apps/web/shadcn-studio` only — promote into this package (or feature chrome), then prune.

**Living consumers:** `apps/web` (features · portal chrome · auth surfaces). Boundary tests under `apps/web/__tests__/ui-boundary.test.ts` enforce the two allowed specifiers (`.` and `./styles.css`).

## Add a primitive

Product CLI only inside this package (`components.json` here is the product SSOT — **no** `registries` key):

```bash
pnpm --filter @afenda/ui-system ui:add <built-in-shadcn-name>
# → fix generated imports to package-relative / `#` aliases
# → export from src/index.ts (flat barrel)
# → pnpm --filter @afenda/ui-system test
```

Root gate after promote:

```bash
pnpm check:ui-system
```

Shadcn Studio DNA (Method A/B) is **not** `ui:add` into product routes — stage under `apps/web/shadcn-studio`, then promote. Method: [shadcn-ui skill](../../.cursor/skills/shadcn-ui/SKILL.md).

## Maintain

```bash
pnpm --filter @afenda/ui-system lint
pnpm --filter @afenda/ui-system typecheck
pnpm --filter @afenda/ui-system test
pnpm --filter @afenda/ui-system ui:add <name>
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**. Peers: React `≥19`, Tailwind CSS `^4`.

## Exports

| Path | Role |
|------|------|
| `@afenda/ui-system` | Flat barrel — primitives + `cn` (see categories below) |
| `@afenda/ui-system/styles.css` | Semantic design tokens (`src/styles/tokens.css`) |

**Barrel categories** (full inventory: [`src/index.ts`](./src/index.ts)):

| Category | Examples |
|----------|----------|
| Form | `Button` · `Input` · `Label` · `Select` · `Checkbox` · `Field` · `FormField` |
| Display / layout | `Card` · `Badge` · `Separator` · `Skeleton` · `Table` · `DataTable` |
| Overlays / menus | `Dialog` · `Sheet` · `Popover` · `DropdownMenu` · `Tooltip` · `Command` |
| Navigation | `Breadcrumb` · `Tabs` · `Pagination` · `Sidebar` (+ cookie helpers) |
| Feedback / chrome | `Alert` · `Sonner` · `Spinner` · `Empty` · `StatusBadge` · `MetricCard` |
| Utils | `cn` |

Runtime deps include `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `sonner`, `next-themes`, `react-day-picker`, `date-fns` (catalog versions in `package.json`).

## Ownership

| Surface | Owner |
|---------|-------|
| Primitives · tokens · flat barrel · `ui:add` | `@afenda/ui-system` |
| Product compose / recipes / a11y·state·responsive | `apps/web` + farm `afenda-elite-ui-compose` |
| Studio DNA stage tree | `apps/web/shadcn-studio` (stage only — not Living product UI) |
| App global CSS composition | `apps/web/globals.css` |

**Layer:** Rank-2 Surfaces — may import Platform **client-safe** only; must stay free of server-only code and DB calls. Must not import `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md).

## Out of scope

Do not add to this package: paid/external registries on `components.json`, a gateway / `*Contract` layer, Storybook restore, Portal Atmosphere remount, product route pages, or revival of `@afenda/ui`. Do not teach DNA trees as the design system.

## Authority

| Topic | Link |
|-------|------|
| Product UI import rules · `ui:add` verify | [docs-V2/nextjs/ui](../../docs-V2/nextjs/ui.md) |
| Package DAG / Surfaces rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| shadcn CLI · Studio DNA · ADR-010 workflow (Living ADR body dormant) | [shadcn-ui skill](../../.cursor/skills/shadcn-ui/SKILL.md) |
| Agent checkout posture (barrel · tokens · no `@afenda/ui`) | [AGENTS.md](../../AGENTS.md) |
