# PA-P7 — Preview fixtures

| Field | Value |
|-------|-------|
| **Status** | pending |
| **Sequence** | 7 |
| **Depends on** | PA-P6 |
| **Feeds into** | PA-P8–PA-P10 |

## Purpose

Publish design-review fixtures — Storybook stories and optional static fixtures — so atmosphere can be approved without Neon Auth or credentials.

## Authority

- [ADR §Ship review fixtures](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#7-ship-review-fixtures-before-auth-integration)
- [ADR §Visual Regression Requirement](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#visual-regression-requirement)
- Repo convention: `stories/ui-evaluation/**`, Storybook MCP per `AGENTS.md`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Storybook | CSF3; `parameters.layout: 'fullscreen'` for shell stories |
| Themes | Explicit dark, light, and split-theme stories |
| Auth | Fixtures use placeholder slot only — never mount `AuthView` |
| Imports | `app/globals.css` via `.storybook/preview.ts` |
| MCP | Query component docs before adding props not in codebase |

## Inputs / outputs

- **Inputs:** Composed `PortalAtmosphere` from PA-P6; reference PNGs
- **Outputs:** Storybook stories; optional `fixtures/dark.fixture.tsx`, `light.fixture.tsx`, `split-theme.fixture.tsx`

## Owned files

- `stories/ui-evaluation/portal-atmosphere.stories.tsx`
- `components/portal-atmosphere/fixtures/dark.fixture.tsx`
- `components/portal-atmosphere/fixtures/light.fixture.tsx`
- `components/portal-atmosphere/fixtures/split-theme.fixture.tsx`

## Do

- Stories: `DarkDesktop`, `LightDesktop`, `SplitTheme`, `PlaceholderAccessSlot`.
- Document how to capture screenshots for design sign-off.
- Enable theme toggle in story where it helps comparison (visual-only shell).

## Don't

- Require `npm run dev` + login for design review.
- Embed E2E auth credentials in stories.
- Add Playwright visual tests in this slice (optional follow-up in PA-P9).

## Critical control points

- Stories render without Neon env secrets
- Split story makes inversion difference obvious at a glance

## Failure modes

- Stories import auth provider → broken Storybook offline
- Fixtures drift from production atmosphere composition
- Missing dark/light parity in stories

## Required tests

- `npm run storybook` — stories load without error
- Optional: Storybook MCP `run-story-tests` when configured

## Visual regression

**Required captures (baseline set for all later phases):**

- [ ] Dark desktop (Storybook screenshot)
- [ ] Light desktop
- [ ] Split-theme comparison
- [ ] Tablet viewport (768px)
- [ ] Mobile viewport (390px)

Store captures in design review channel or `docs/ui-evaluation/` if team maintains screenshot archive.

## Acceptance proof

- [ ] Design reviewable without auth
- [ ] Dark and light visually comparable in Storybook
- [ ] Inversion rule obvious in split story
- [ ] Screenshot checklist documented in story descriptions or README
- [ ] No auth provider in story tree
- [ ] Visual regression baseline captured

## Rollback

Remove portal-atmosphere stories; keep components.

## Drift risk

Stories compose old `PortalAuthLayout` instead of `PortalAtmosphere` — false-positive design approval.
