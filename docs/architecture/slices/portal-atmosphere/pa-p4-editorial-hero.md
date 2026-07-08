# PA-P4 — Editorial hero and inversion

| Field | Value |
|-------|-------|
| **Status** | ready-for-review |
| **Sequence** | 4 |
| **Depends on** | PA-P3 |
| **Feeds into** | PA-P5–PA-P10 |

## Purpose

Implement `TRUTH / IS / PROTECTED` editorial poster typography with theme-specific single-word inversion and accessible semantic heading.

## Authority

- [ADR §Theme Inversion Rule](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#3-enforce-theme-inversion-as-identity-mechanic)
- [ADR §Accessibility Text Rule](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#accessibility-text-rule)
- Prototype: `portal-auth-layout.tsx` brand panel, `.portal-hero-*` CSS

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Inversion | Dark: PROTECTED inverted only; Light: TRUTH inverted only |
| Typography | `--font-editorial` for hero words; `--font-ui` for connector |
| Semantic | `<h1 className="sr-only">Truth is protected</h1>` |
| Decorative | Visual hero wrapped in `aria-hidden="true"` |
| Tokens | `--portal-hero-truth`, `--portal-hero-protected`, `--portal-hero-is`, `--portal-hero-rule` |
| Copy | Default from `DEFAULT_PORTAL_EDITORIAL_COPY`; no “Sign in” taglines |

## Inputs / outputs

- **Inputs:** PA-P1 contracts; PA-P2/P3 shell; reference PNG hero regions
- **Outputs:** `PortalEditorialHero`, `PortalHeroWord`, `PortalHeroConnector`

## Owned files

- `components/portal-atmosphere/PortalEditorialHero.tsx`
- `components/portal-atmosphere/PortalHeroWord.tsx`
- `components/portal-atmosphere/PortalHeroConnector.tsx`
- `components/portal-atmosphere/styles/portal-atmosphere.hero.css`
- `components/portal-atmosphere/index.ts`

## Do

- Use `clamp()` for responsive hero scale on desktop poster layout.
- Apply `transform: rotate(180deg)` (or equivalent) to exactly one word per theme.
- Fix light-mode inversion to match reference: **TRUTH inverted**, PROTECTED readable (correct prototype drift from `globals.css`).

## Don't

- Invert both TRUTH and PROTECTED in one theme.
- Apply inversion to form UI or seal line.
- Use inverted visual text as accessible name.
- Add seal line (PA-P5) or access slot content in this slice.

## Critical control points

- `PortalInversionMode` drives flip state — not ad-hoc CSS per page
- Hero at z-5; must not collide with access slot region (reserve right column)
- Connector “IS” with horizontal rules per reference mocks

## Failure modes

- Light theme flips PROTECTED instead of TRUTH → contradicts ADR and mock
- Hero readable by screen readers twice (sr-only + visible)
- Hero overlaps access slot on lg breakpoints

## Required tests

- Unit or contract test: inversion mode maps to correct flipped word per theme
- Build passes

## Visual regression

**Required captures:**

- [ ] Dark desktop — TRUTH readable, PROTECTED inverted
- [ ] Light desktop — TRUTH inverted, PROTECTED readable
- [ ] Split-theme comparison (side-by-side or dual story)

## Acceptance proof

- [x] One word inverted per theme only
- [ ] Matches reference PNG inversion intent — visual
- [x] sr-only h1 present; visual hero aria-hidden
- [x] Hero uses editorial font; connector uses UI font
- [x] Token-based colors only
- [x] No auth changes
- [ ] Visual regression captures approved

## Rollback

Remove hero components; revert hero CSS; keep owl and background layers.

## Drift risk

Hero copy hardcoded in components instead of `PortalEditorialCopy` contract.
