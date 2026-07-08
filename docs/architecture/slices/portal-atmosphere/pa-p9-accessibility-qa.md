# PA-P9 — Accessibility and QA

| Field | Value |
|-------|-------|
| **Status** | implemented — manual QA + captures pending |
| **Sequence** | 9 |
| **Depends on** | PA-P8 |
| **Feeds into** | PA-P10 |

## Purpose

Validate contrast, screen reader structure, reduced motion, and keyboard-safe layout for the full static atmosphere — last gate before motion is allowed and before auth integration planning.

## Authority

- [ADR §Accessibility Text Rule](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#accessibility-text-rule)
- [ADR §Motion policy](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#appendix-c--motion-policy-post-static-only)
- [ADR §Visual Regression Requirement](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#visual-regression-requirement)

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Semantic heading | sr-only `Truth is protected` — single h1 in atmosphere |
| Decorative | Owl, visual hero, seal marked `aria-hidden` where appropriate |
| Contrast | Placeholder slot inputs meet internal threshold vs card background |
| Motion | `prefers-reduced-motion: reduce` rules present on `.portal-atmosphere` |
| Focus | Skip link pattern preserved when integrated (document for PA-P10) |

## Inputs / outputs

- **Inputs:** Full composed atmosphere; PA-P7/P8 captures
- **Outputs:** A11y checklist sign-off; reduced-motion CSS; optional interaction test

## Owned files

- `components/portal-atmosphere/styles/portal-atmosphere.a11y.css` (or base css block)
- `components/portal-atmosphere/PortalEditorialHero.tsx` (a11y audit fixes)
- `components/portal-atmosphere/PortalGuardianOwl.tsx` (a11y audit fixes)
- Optional: `components/portal-atmosphere/portal-atmosphere.a11y.test.tsx`

## Do

- Verify screen reader announces sr-only heading once; decorative layers silent.
- Run contrast check on placeholder labels/inputs in both themes.
- Apply reduced-motion media query per ADR Appendix C.
- Document keyboard tab order expectation for PA-P10 (slot receives focusable auth controls later).

## Heading ownership rule

Before PA-P10 wiring, the atmosphere owns the page-level **h1** (sr-only `Truth is protected`).

After real auth integration, the adapter must choose **one** of two valid patterns:

1. Atmosphere keeps sr-only h1 and auth card uses **h2** (or AuthView default subheading).
2. Auth route owns visible h1 and atmosphere sr-only h1 is disabled through an explicit prop (e.g. `suppressPageHeading`).

**Duplicate page-level h1 is not allowed.** Coordinate in [pa-p10-integration-contract.md](./pa-p10-integration-contract.md).

## Don't

- Rely on inverted visual words for accessible name.
- Enable motion animations in this slice (static acceptance only).
- Change auth behavior or add real form fields.

## Critical control points

- Inverted text never sole accessible statement
- Owl not in accessibility tree
- Reduced-motion disables transitions on atmosphere subtree

## Failure modes

- Duplicate h1 when auth card adds its own title later (document coordination in PA-P10)
- Decorative seal announced as critical content
- Contrast pass on desktop fails on mobile scrim

## Required tests

- Manual screen reader smoke (VoiceOver/NVDA): heading once, no owl announcement
- Automated a11y smoke: axe or Testing Library a11y check where available (recommended, not blocking if tooling absent)
- Optional: `npm run test:interaction` if a11y interaction test added
- Build passes

## Visual regression

**Required captures:**

- [ ] Full regression set from PA-P7 re-verified after a11y CSS
- [ ] Reduced-motion mode screenshot (devtools emulation) where transitions exist

## Acceptance proof

- [x] sr-only h1 present; visual hero aria-hidden — `portal-atmosphere.a11y.test.tsx`
- [x] Owl not announced — decorative `aria-hidden` on owl subtree
- [x] Seal does not pollute screen reader output — always `aria-hidden`
- [ ] Contrast review passed for placeholder slot — manual
- [x] `prefers-reduced-motion` rule applied — `portal-atmosphere.a11y.css`
- [ ] All PA-P7/P8 visual captures still approved — manual Storybook
- [x] Heading ownership rule documented for PA-P10 adapter — `suppressPageHeading` + pa-p10-integration-contract
- [x] Static acceptance complete — no motion enablement in PA-P9
- [x] No auth changes — `check:storybook-auth-boundary` pass

## Rollback

Revert a11y-specific CSS/markup changes; re-open PA-P8 if layout fixes required.

## Drift risk

Auth card adds visible h1 without removing duplicate — PA-P10 must coordinate heading level.
