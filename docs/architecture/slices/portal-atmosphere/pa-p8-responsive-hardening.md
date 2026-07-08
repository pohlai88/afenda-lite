# PA-P8 — Responsive hardening

| Field | Value |
|-------|-------|
| **Status** | implemented — visual captures pending |
| **Sequence** | 8 |
| **Depends on** | PA-P7 |
| **Feeds into** | PA-P9–PA-P10 |

## Purpose

Stabilize atmosphere layout across desktop, laptop, tablet, and mobile — hero scale, owl repositioning, access slot stacking — without auth integration.

## Authority

- [ADR Phase 8 roadmap](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#phased-roadmap)
- Prototype mobile rules: `@media (max-width: 1023px)` in `.portal-auth-phantom-*`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Layout | Mobile-first fixes in atmosphere CSS only |
| Typography | Reduce hero scale with `clamp()` — no fixed px-only poster |
| Owl | Reposition/crop on small viewports; reduce opacity if needed |
| Overflow | No horizontal scroll at 320px–1920px |
| Viewport | Prefer `100svh` (or `min-h-dvh`) over `100vh` where full-height shell is needed |
| Motion | Still prohibited |

## Mobile composition decision

On mobile, the portal is **access-first**, not poster-first.

**Default mobile order:**

1. Header / toolbar
2. Access slot
3. Reduced editorial atmosphere, if shown
4. Decorative owl background only

The access slot must appear **before** decorative editorial content on small screens to protect usability. The owl and hero may remain atmospheric but must not push the access card too far down the viewport.

## Inputs / outputs

- **Inputs:** PA-P7 fixtures; reference PNG desktop composition; device breakpoints
- **Outputs:** `portal-atmosphere.responsive.css`; updated stories for tablet/mobile; documented mobile order

## Owned files

- `components/portal-atmosphere/styles/portal-atmosphere.responsive.css`
- `stories/ui-evaluation/portal-atmosphere.stories.tsx` (tablet/mobile variants)
- `components/portal-atmosphere/PortalAtmosphere.tsx` (layout props if needed)

## Do

- Test breakpoints: 320, 390, 768, 1024, 1280, 1440.
- Implement mobile order per **Mobile composition decision** above.
- Hide or compress editorial hero on small screens if needed — but preserve sr-only heading.

## Don't

- Ship broken desktop layout while fixing mobile.
- Hide access slot on mobile (must remain usable with placeholder).
- Place editorial hero above access slot on mobile.
- Add parallax or motion “fixes”.
- Use `100vh` alone for full-screen shell when mobile browser chrome causes jump/scroll.

## Critical control points

- Access slot remains tappable/readable on mobile and appears before decorative editorial content
- Use modern viewport units such as `100svh` where needed to avoid mobile browser chrome overflow
- Owl does not destroy placeholder contrast on narrow screens
- Hero does not cause horizontal overflow

## Failure modes

- Mobile feels like cropped desktop poster
- Hero visible and colliding with slot on md breakpoint
- Access card pushed below fold by owl/hero on small screens
- Owl glow causes GPU/overdraw jank on low-end mobile
- `100vh` overflow on iOS Safari / mobile Chrome

## Required tests

- Manual viewport matrix in Storybook or browser devtools
- Build passes

## Visual regression

**Required captures:**

- [ ] Tablet (768px) — dark and light
- [ ] Mobile (390px) — dark and light; access slot visible without excessive scroll
- [ ] Small mobile (320px) — smoke check

Re-compare desktop captures if responsive CSS touches shared rules.

## Acceptance proof

- [x] Empty layout slots omitted from DOM; grid areas adapt via `data-portal-layout-*` attributes
- [x] Access slot usable on mobile with placeholder; grid places access before brand
- [x] Owl repositioned via `portal-guardian-owl__frame`; readability preserved
- [x] Viewport units avoid mobile chrome overflow (`100svh` on layout shell)
- [x] Storybook tablet/mobile stories updated (`TabletDark/Light`, `MobileDark/Light`, `SmallMobileSmoke`)
- [x] `npm run build` passes
- [x] `npm run check:portal-atmosphere` passes (unit tests + auth boundary)
- [ ] No horizontal overflow 320px–1920px — manual Storybook matrix
- [ ] Visual regression captures approved

## Next slice gate

PA-P9 may begin only after PA-P8 acceptance proof is complete.

PA-P9 must validate accessibility and static QA only — no motion, no auth wiring.

## Rollback

Revert responsive CSS; restore PA-P7 desktop-only behavior.

## Drift risk

Responsive rules added to `.portal-auth-*` instead of atmosphere package.
