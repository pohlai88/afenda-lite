# afenda-elite-ui-compose — recipes & forbidden patterns

Companion to [SKILL.md](SKILL.md). Recipes use **barrel export names** from `packages/ui-system/src/index.ts`. Confirm the barrel before inventing a local copy.

**Vitest SSOT:** forbidden regexes below must stay in sync with `apps/web/__tests__/compose-redflags.test.ts`.

## Composition recipes → barrel

| Recipe | Compose from barrel | Notes |
|--------|---------------------|-------|
| Settings / profile panel | `Tabs`, `Card` (+ `CardHeader` / `CardTitle` / `CardContent`), `FormField`, `Input`, `Textarea`, `Switch`, `Button`, `Separator` | One density; page title outside tabs |
| CRUD / tabular list | `DataTable`, `Button`, `Input` (filter), `Badge` / `StatusBadge`, `Pagination`, `Empty` | Row actions → `DropdownMenu` or `Button` / `Dialog` |
| Create / edit drawer | `Sheet` (+ sheet parts), `FormField`, `Input`, `NativeSelect` / `Select`, `DatePicker`, `Combobox`, `Button`, `FormError` | Prefer Sheet over Dialog for forms |
| Confirm destructive | `AlertDialog` (+ parts), `Button` `variant="destructive"` | Never custom modal markup |
| Inline notice | `Alert` (+ `AlertTitle` / `AlertDescription`) | Not a bordered `div` |
| Metric strip | `MetricCard`, `KeyValue` | Keep type scale lock |
| App chrome nav | `Sidebar` (+ parts), `Breadcrumb`, `Separator` | Do not handroll nav pills |
| Command palette | `Command`, `Dialog` / command dialog pattern | lucide icons only |
| Dense key/value detail | `KeyValue` / `KeyValueList`, `Badge`, `Separator` | Body = `text-sm` |
| Loading state | `Skeleton`, `Spinner` | Never plain loading copy alone |
| Empty collection | `Empty` | Title uses section type lock |

**Banned when `DataTable` fits:** bordered handrolled `<ul>` with divide-y + border for rows with ≥2 fields or row actions.

Import shape (always):

```tsx
import { Button, Card, FormField, Input } from "@afenda/ui-system";
```

Missing export → ADR-010: `pnpm --filter @afenda/ui-system ui:add <name>` → relative imports → export from `src/index.ts` → `pnpm --filter @afenda/ui-system test`. Never copy into `apps/web`.

## Forbidden patterns (gate source)

Product scope: `apps/web/features/**`, `apps/web/app/**` (exclude auth-island allowlist in the Vitest file).

| ID | Forbidden smell | Required instead | Gate regex hint |
|----|-----------------|------------------|-----------------|
| F1 | Fake primary CTA | `Button` / `Button asChild` + `Link` | `inline-flex` with `h-9` and `bg-primary` outside Button usage |
| F2 | Page shell `p-8` | `p-6` or `p-4` | `\bp-8\b` |
| F3 | Rogue page title | `text-2xl font-semibold tracking-tight` | `text-(3xl\|4xl\|5xl)` or `text-xl font-semibold` |
| F4 | Bordered tabular `<ul>` | `DataTable` | `divide-y` with `rounded-md border` on `<ul>` |
| F5 | Plain loading copy only | `Spinner` / `Skeleton` | loading ellipsis text without Spinner/Skeleton import |
| F6 | Deep / retired UI import | flat barrel | `@afenda/ui-system/` (not styles.css), `@afenda/ui` |
| F7 | Parallel UI tree | never | `apps/web/components/ui/` path exists |
| F8 | Auth CSS leaked | island only | `auth-surface.css` import outside allowlist |

### Allowlist (negative control)

- `apps/web/app/(public)/auth/**`
- `apps/web/app/(public)/join/layout.tsx` (may import auth-surface for join island)
- `apps/web/features/auth/auth-surface-chrome.tsx` and auth shells that only wrap Neon Auth UI
- `apps/web/app/(public)/auth/auth-surface.css`

Do not copy auth-surface patterns into operator or client product layouts.

### Advisory ripgrep (while editing)

```bash
rg -n "inline-flex.*h-9|bg-primary" apps/web/features apps/web/app --glob "*.tsx"
rg -n "\bp-8\b" apps/web/features apps/web/app --glob "*.tsx"
rg -n "divide-y.*border|rounded-md border" apps/web/features apps/web/app --glob "*.tsx"
rg -n "text-(3xl|4xl|5xl)|text-xl font-semibold" apps/web/features apps/web/app --glob "*.tsx"
```

**Done means:** `pnpm check:ui-system` green — not greps alone.
