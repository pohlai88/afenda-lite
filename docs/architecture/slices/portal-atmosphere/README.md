# Portal Atmosphere slices (PA-P0–PA-P10)

Execution briefs for [ADR-Portal-BG-001: Portal Atmosphere System](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md).

**Rule:** One slice = one primary purpose. No auth behavior changes until **PA-P10**. Visual phases require screenshot or Storybook capture per ADR [Visual Regression Requirement](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#visual-regression-requirement).

**Design references:** [`public/landing-design/dark-theme.png`](../../../../public/landing-design/dark-theme.png) · [`public/landing-design/light-theme.png`](../../../../public/landing-design/light-theme.png)

## Dependency order

```txt
PA-P0  ADR / doctrine (accepted)
   ↓
PA-P1  Token foundation
   ↓
PA-P2  Background layers
   ↓
PA-P3  Guardian owl
   ↓
PA-P4  Editorial hero + inversion
   ↓
PA-P5  Seal line
   ↓
PA-P6  Access slot
   ↓
PA-P7  Preview fixtures
   ↓
PA-P8  Responsive hardening
   ↓
PA-P9  Accessibility and QA
   ↓
PA-P10 Auth integration readiness
```

## Slice index

| Slice | Title | Status |
|-------|-------|--------|
| [PA-P0](./pa-p0-adr-doctrine.md) | ADR and doctrine approval | **accepted** |
| [PA-P1](./pa-p1-token-foundation.md) | OKLCH token foundation | **approved for implementation** |
| [PA-P2](./pa-p2-background-layers.md) | Static background layers | **approved for implementation** |
| [PA-P3](./pa-p3-guardian-owl.md) | Guardian owl layer | pending |
| [PA-P4](./pa-p4-editorial-hero.md) | Editorial hero and inversion | pending |
| [PA-P5](./pa-p5-seal-line.md) | Seal line | pending |
| [PA-P6](./pa-p6-access-slot.md) | Access slot layout | pending |
| [PA-P7](./pa-p7-preview-fixtures.md) | Preview fixtures | pending |
| [PA-P8](./pa-p8-responsive-hardening.md) | Responsive hardening | pending |
| [PA-P9](./pa-p9-accessibility-qa.md) | Accessibility and QA | pending |
| [PA-P10](./pa-p10-auth-integration-readiness.md) | Auth integration readiness | pending |

**Status discipline:** Implement strictly in order. PA-P0 accepted; PA-P1 and PA-P2 approved for implementation; PA-P3+ are future slice briefs until prior slice acceptance proof is complete.

## Shared design system compliance

All PA slices inherit these rules (CDP presentation layer; aligned with Afenda OKLCH / semantic-token doctrine):

| Rule | Requirement |
|------|-------------|
| Color authority | OKLCH CSS variables only; no hex/rgb in components |
| Token namespace | `--portal-*` owns atmosphere; shadcn `--background`, `--foreground`, `--card`, `--border`, `--input`, `--ring` own generic UI |
| Typography | `--font-editorial` (Cormorant Garamond), `--font-ui` (Inter) via `app/fonts.ts` |
| Layer z-index | Fixed stack per ADR (canvas 0 → header 30) |
| Auth boundary | No `@neondatabase/auth*`, session, or credential imports in `components/portal-atmosphere/` |
| Motion | Prohibited until PA-P9 acceptance |
| Prototype source | `.portal-auth-*` in `globals.css` is migration reference only — do not expand |

## Slice document shape

Every PA slice uses the same sections: Purpose → Authority → Design system compliance → Inputs/outputs → Owned files → Do/Don't → Control points → Failure modes → Tests → Visual regression → Acceptance proof → Rollback → Drift risk.

Update slice **Status** in this index when acceptance proof is complete.
