# PA-P7 — Preview fixtures

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Sequence** | 7 |
| **Depends on** | PA-P6 |
| **Feeds into** | PA-P8–PA-P10 |

## Purpose

Publish design-review fixtures — Storybook stories and optional static fixtures — so atmosphere can be approved without Neon Auth or credentials.

## Authority

- [ADR §Ship review fixtures](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#7-ship-review-fixtures-before-auth-integration)
- [ADR §Visual Regression Requirement](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#visual-regression-requirement)
- Repo convention: `stories/ui-evaluation/**`, Storybook MCP per `AGENTS.md`
- Screenshot workflow: [`docs/ui-evaluation/portal-atmosphere/README.md`](../../../ui-evaluation/portal-atmosphere/README.md)

## Fixture authority

Storybook fixtures must import and render the same `PortalAtmosphere` component used by the production auth surface (via `PortalAtmospherePreview`).

Fixtures may replace only the access slot with inert placeholder content (`AccessSlotPlaceholder`).

Fixtures must not:

- Recreate atmosphere layers manually in PA-P7 authority stories
- Import `PortalAuthLayout` (legacy — not PA atmosphere authority)
- Mount Neon Auth, `AuthView`, auth providers, session providers, or server actions
- Duplicate owl, seal line, editorial hero, background, or access-slot layout outside `PortalAtmosphere`

The fixture is valid only if visual structure comes from production atmosphere composition.

**Composition SSOT:** `components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture.tsx`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Storybook | CSF3; `parameters.layout: 'fullscreen'` for shell stories |
| Themes | Explicit dark, light, and split-theme stories |
| Auth | Fixtures use placeholder slot only — never mount `AuthView` |
| Imports | `app/globals.css` via `.storybook/preview.ts` |
| MCP | Query component docs before adding props not in codebase |
| Drift guard | `npm run check:storybook-auth-boundary` |

## Inputs / outputs

- **Inputs:** Composed `PortalAtmosphere` from PA-P6; reference PNGs
- **Outputs:** `stories/ui-evaluation/portal-atmosphere.stories.tsx`; `portal-atmosphere-preview.fixture.tsx`

## Owned files

- `stories/ui-evaluation/portal-atmosphere.stories.tsx`
- `components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture.tsx`
- `components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture.test.ts`
- `scripts/check-storybook-auth-boundary.mjs`
- `docs/ui-evaluation/portal-atmosphere/README.md`

## Do

- Stories: `DarkDesktop`, `LightDesktop`, `SplitTheme`, `PlaceholderAccessSlot`, `ResponsiveMatrix`.
- Document how to capture screenshots for design sign-off.
- Route slice-specific stories (PA-P3–P6) through `PortalAtmospherePreview` where they show full composition.

## Don't

- Require `npm run dev` + login for design review.
- Embed E2E auth credentials in stories.
- Add Playwright visual tests in this slice (optional follow-up in PA-P9).
- Fork layout outside `PortalAtmosphere` in authority stories.

## Critical control points

- Stories render without Neon env secrets
- Split story makes inversion difference obvious at a glance
- `check:storybook-auth-boundary` passes in CI/local gates

## Failure modes

- Stories import auth provider → broken Storybook offline
- Fixtures drift from production atmosphere composition
- Missing dark/light parity in stories

## Required tests

- `npm run storybook` — stories load without error
- `npm run check:storybook-auth-boundary`
- `portal-atmosphere-preview.fixture.test.ts`

## Visual regression

**Required captures (baseline set for all later phases):**

- [ ] Dark desktop (Storybook screenshot)
- [ ] Light desktop
- [ ] Split-theme comparison
- [ ] Tablet viewport (768px)
- [ ] Mobile viewport (390px)

Store captures in `docs/ui-evaluation/portal-atmosphere/` using dated filenames (see README).

## Acceptance proof

- [ ] `npm run storybook` loads `portal-atmosphere.stories.tsx` without error — local/operator
- [x] `DarkDesktop` renders production `PortalAtmosphere` with placeholder access slot
- [x] `LightDesktop` renders production `PortalAtmosphere` with placeholder access slot
- [x] `SplitTheme` makes dark/light inversion composition available without manual layer duplication
- [x] No `AuthView`, Neon provider, session provider, server action, or auth credential imported into story tree
- [x] Screenshot capture instructions documented in story description or README
- [ ] Baseline captures completed for dark desktop, light desktop, split, tablet 768px, and mobile 390px
- [ ] Captures stored in `docs/ui-evaluation/portal-atmosphere/` or approved design-review channel
- [x] `npm run check:storybook-auth-boundary` passes

## Rollback

Remove portal-atmosphere PA-P7 stories and fixture; keep components.

## Drift risk

Stories compose old `PortalAuthLayout` instead of `PortalAtmosphere` — false-positive design approval. Mitigated by fixture authority + boundary check script.
