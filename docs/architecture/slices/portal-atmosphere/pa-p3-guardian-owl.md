# PA-P3 — Guardian owl layer

| Field | Value |
|-------|-------|
| **Status** | ready-for-review |
| **Sequence** | 3 |
| **Depends on** | PA-P2 |
| **Feeds into** | PA-P4–PA-P10 |

## Purpose

Add the ghost owl as a governed background authority object at z-2 — placement, opacity, blend mode, and scrim — without editorial text or auth UI.

## Authority

- [ADR §Ghost Owl Guardian Layer](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#b-ghost-owl-guardian-layer)
- Prototype: `components/portal-auth-brand-scene.tsx`, `lib/portal-brand.ts`, `.portal-auth-phantom-*` CSS

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Asset | Reuse `BRAND_DRAMATIC_OWL_BACKGROUND_PATH` from `lib/portal-brand.ts` |
| A11y | `aria-hidden="true"` on owl container and image; empty `alt=""` |
| Interaction | `pointer-events-none` |
| Theme | Dark: moonlit `mix-blend-mode: screen`; Light: embossed watermark (lower opacity) |
| Tokens | `--portal-owl-line`, `--portal-owl-shadow`, `--portal-owl-highlight` |

## Inputs / outputs

- **Inputs:** PA-P2 shell; owl asset path; prototype CSS tuning
- **Outputs:** `PortalGuardianOwl`; keylight/scrim via CSS pseudos on the layer root

## Owned files

- `components/portal-atmosphere/PortalGuardianOwl.tsx`
- `components/portal-atmosphere/styles/portal-atmosphere.owl.css` (or section in base css)
- `components/portal-atmosphere/index.ts`

## Do

- Place owl behind typography (z-2) per ADR layer table.
- Scale with `clamp()` / viewport rules; desktop poster composition first.
- Include cinematic scrim if needed for access-slot readability (z-3 max, still below hero).

## Don't

- Make owl interactive or animated.
- Use owl as logo/mascot treatment (no cute styling, sharp NFT look).
- Block access-slot contrast (verify against placeholder card in PA-P6).
- Import auth components.

## Critical control points

- Owl must not receive focus or screen reader announcement
- Dark/light opacity and blend differ per reference PNGs
- Mobile scale reduction without destroying desktop composition

## Failure modes

- Owl dominates form area → usability failure at PA-P6
- Wrong blend mode in light theme → muddy or oversharpened illustration
- Image path duplicated instead of using `lib/portal-brand.ts`

## Required tests

- Build passes
- Manual: owl visible in Storybook on top of PA-P2 background

## Visual regression

**Required captures:**

- [ ] Dark desktop — owl moonlit treatment
- [ ] Light desktop — owl embossed watermark

Compare owl scale, opacity, and position to reference PNGs.

## Acceptance proof

- [x] Owl does not block UI interaction
- [x] `aria-hidden` on all owl decorative nodes
- [ ] Dark mode feels moonlit; light mode feels embossed — visual
- [x] Tokens drive glow/scrim colors where applicable
- [ ] Consistent at 1280px and 1440px width — visual
- [x] No auth imports
- [ ] Visual regression captures approved

## Rollback

Remove `PortalGuardianOwl` from exports and stories; delete owl-specific CSS.

## Drift risk

Owl tuning continues in `.portal-auth-phantom-*` instead of atmosphere-owned CSS.
