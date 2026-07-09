# Fade Owl — dual + morpho variants (Storybook experiment)

Design-review only. **Do not wire into `PortalAuthLayout` or auth routes** without explicit sign-off.

## Variants

| Variant | Asset(s) | Mode behavior |
|---------|----------|---------------|
| `dual` (default) | `public/assets/light-guardian.png` ↔ `night-guardian.png` | 2s opacity cross-fade |
| `morpho` | `public/brand/owls/guardian-dramatic-iso.png` | Single iso; CSS atmosphere + blend/filter |

No `invert()`. Prop: `variant="dual" | "morpho"`.

## Canonical implementation

| Layer | Path |
|-------|------|
| Story | `stories/ui-evaluation/portal-atmosphere-fade-owl.stories.tsx` |
| Fixture | `components/portal-atmosphere/fixtures/fade-owl.fixture.tsx` |
| Styles | `components/portal-atmosphere/styles/portal-atmosphere.fade-owl.css` |
| Asset SSOT | `lib/portal-brand.ts` |

## Stories

| Story | Purpose |
|-------|---------|
| `dual — light` / `dual — night` | Dual PNG static modes |
| `dual — beastmode toggle` | Interactive dual cross-fade |
| `morpho — light` / `morpho — night` | Single morpho static modes |
| `morpho — beastmode toggle` | Interactive morpho mode shift |

## Z-index stack

```txt
z50  beastmode toggle
z40  vault-wrap (glass Access Vault mock)
z30  editorial ("Truth, held quietly.")
z20  night owl (dual only)
z10  light owl (dual) / morpho owl
z0   atmosphere stack
```
