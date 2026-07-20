# UI consume (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/ui.md` |
| Authority | **Scratch** — frontend-ui-engineering + disk `packages/surfaces/ui-system/**` · `apps/web/features/**` |
| Updated | 2026-07-19 |

Product UI consumes the flat barrel only. Re-probe after barrel export changes.

---

## Imports

| Need | Import |
|------|--------|
| Components | `import { … } from "@afenda/ui-system"` |
| Tokens / base styles | `import "@afenda/ui-system/styles.css"` |

No deep `@afenda/ui-system/src/...`. No parallel UI package. No product import of Shadcn Studio DNA stage trees (`apps/web/shadcn-studio/**` is stage-only when present).

---

## Add primitive workflow

```text
1. pnpm --filter @afenda/ui-system ui:add <component>
2. Fix to relative imports inside packages/surfaces/ui-system
3. Export from package barrel (package.json exports ".")
4. pnpm --filter @afenda/ui-system test
5. Consume from apps/web via barrel only
```

---

## Compose floor (product)

| Rule | Detail |
|------|--------|
| Pages | Thin RSC compose — UI lives in `features/*` |
| Forms | Prefer FormField + `actionFieldMessage` for ActionResult errors |
| A11y | Focusable controls · labels · skip link where auth shells already ship |
| Motion | Intentional hierarchy only — not decorative noise |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Barrel only | One public door; avoids broken deep imports |
| No DNA as product import | Stage → promote → prune; DNA is not the design system |
| No handroll `/playground` trees | Absent by design — do not recreate |
| No second component library | `@afenda/ui-system` is the sole surface |

---

## Verify

```text
1. pnpm --filter @afenda/ui-system test
2. rg "from [\"']@afenda/ui-system/" apps/web --glob "*.{ts,tsx}"   # deep paths = smell
3. rg "from [\"']@afenda/ui-system[\"']" apps/web --glob "*.{ts,tsx}"
4. Disk: packages/surfaces/ui-system/package.json exports · src/index.ts
```

Companion: [README.md](README.md) · [../discipline/README.md](../discipline/README.md) · [folders.md](folders.md).
