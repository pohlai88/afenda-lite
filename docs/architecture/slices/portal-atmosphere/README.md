# Portal Atmosphere slices (PA-P0–PA-P10)

Execution briefs for [ADR-Portal-BG-001: Portal Atmosphere System](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md).

**Rule:** One slice = one primary purpose. Production auth adapter (`PortalAuthLayout`) is wired; E2E smoke and legacy CSS retirement remain. Visual phases require screenshot or Storybook capture per ADR [Visual Regression Requirement](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#visual-regression-requirement).

**Design references:** [`public/brand/heroes/auth-hero-dark.png`](../../../../public/brand/heroes/auth-hero-dark.png) · [`public/brand/heroes/auth-hero-light.png`](../../../../public/brand/heroes/auth-hero-light.png)

**Rejected experiments:** [`pa-rejected-approaches.md`](./pa-rejected-approaches.md) — agents must not reintroduce listed approaches.

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
PA-P10 Auth integration readiness (adapter wired — E2E + CSS purge pending)
```

## Slice index

| Slice | Title | Status |
|-------|-------|--------|
| [PA-P0](./pa-p0-adr-doctrine.md) | ADR and doctrine approval | **accepted** |
| [PA-P1](./pa-p1-token-foundation.md) | OKLCH token foundation | **implemented** |
| [PA-P2](./pa-p2-background-layers.md) | Static background layers | **implemented** |
| [PA-P3](./pa-p3-guardian-owl.md) | Guardian owl layer | **ready-for-review** |
| [PA-P4](./pa-p4-editorial-hero.md) | Editorial hero and inversion | **ready-for-review** |
| [PA-P5](./pa-p5-seal-line.md) | Seal line | **ready-for-review** |
| [PA-P6](./pa-p6-access-slot.md) | Access slot layout | **ready-for-review** |
| [PA-P7](./pa-p7-preview-fixtures.md) | Preview fixtures | **implemented** |
| [PA-P8](./pa-p8-responsive-hardening.md) | Responsive hardening | **implemented** (captures pending) |
| [PA-P9](./pa-p9-accessibility-qa.md) | Accessibility and QA | **implemented** (manual QA pending) |
| [PA-P10](./pa-p10-auth-integration-readiness.md) | Auth integration readiness | **implemented** — adapter wired; E2E + CSS purge pending |

**Status discipline:** Code for PA-P1–P9 exists under `components/portal-atmosphere/`. Slices marked **ready-for-review** await visual regression sign-off. PA-P10 adapter is wired in `PortalAuthLayout`; PNG baselines and legacy CSS retirement remain open per [pa-closure-register.md](./pa-closure-register.md).

**Remaining gaps (no omission):** [pa-closure-register.md](./pa-closure-register.md) — canonical inventory of open visual, manual, doc, migration, perf, and DX items; Stability-First work packages WP-0–WP-4.

**Guardian Auth (ADR-Auth-UI-001):** [pa-guardian-auth-reference-gaps.md](./pa-guardian-auth-reference-gaps.md) · **[pa-guardian-module-remaining.md](./pa-guardian-module-remaining.md)** — post-merge completion checklist (design sign-off, viewport tests, Lane C stash).

## Public API vs fixtures

| Import path | Purpose |
|-------------|---------|
| `@/components/portal-atmosphere` | Production components + serializable contracts |
| `@/components/portal-atmosphere/fixtures/*` | Storybook / design-review fixtures only |

Fixtures must not be re-exported from the production barrel.

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
