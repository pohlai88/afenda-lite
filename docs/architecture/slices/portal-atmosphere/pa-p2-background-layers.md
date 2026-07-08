# PA-P2 — Static background layers

| Field | Value |
|-------|-------|
| **Status** | approved for implementation |
| **Sequence** | 2 |
| **Depends on** | PA-P1 |
| **Feeds into** | PA-P3–PA-P10 |

## Purpose

Render base canvas, radial gradients, and glow fields as a static atmosphere shell — no owl, hero, seal, or auth.

## Authority

- [ADR §Layering system](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#5-define-fixed-visual-layers) — z-0 canvas, z-1 gradients
- Prototype: `app/globals.css` `.portal-auth-atmosphere`, `.portal-auth-gridlines`, `.dark .portal-auth-vault`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Colors | `var(--portal-*)` and mapped shadcn vars only |
| Layers | z-0 base, z-1 atmospheric gradients; `pointer-events-none` on decorative layers |
| CSS ownership | `portal-atmosphere.base.css` may define shell and background-layer classes only; no auth, card, owl, hero, seal, or form selectors |
| Theme selectors | Use `.portal-atmosphere[data-theme="dark"]` / `.portal-atmosphere[data-theme="light"]` or PA-P1-approved equivalent |
| Motion | None |
| API | `PortalBackgroundLayers` + root `PortalAtmosphere` shell (minimal — theme class + children slot) |

## Inputs / outputs

- **Inputs:** PA-P1 tokens; reference PNG backgrounds
- **Outputs:** `PortalAtmosphere`, `PortalBackgroundLayers`; static full-viewport atmosphere

## Owned files

- `components/portal-atmosphere/PortalAtmosphere.tsx`
- `components/portal-atmosphere/PortalBackgroundLayers.tsx`
- `components/portal-atmosphere/styles/portal-atmosphere.base.css` (layer rules)
- `components/portal-atmosphere/index.ts` (component exports)

## Do

- Match midnight vault (dark) and archival ivory (light) direction from reference PNGs.
- Use `isolate` / stacking context on root shell.
- Keep component free of auth, owl, and typography.

## Don't

- Import Neon Auth or session modules.
- Add owl image, editorial text, or access card.
- Expand `.portal-auth-*` in `globals.css` for new gradient logic.
- Add animation or parallax.
- Add poster grid, access-slot positioning, header placement, or final page layout logic.

PA-P2 must stay **background only**. It must not quietly become the root layout slice.

## Critical control points

- Gradients read from `--portal-glow-primary`, `--portal-glow-soft`, `--portal-bg`
- No layout shift on load; full viewport coverage without horizontal scroll

## Failure modes

- Gradients hardcoded in JSX → token bypass
- Gridlines or blueprint layer oversaturates light theme
- z-index conflicts with future owl (z-2) or hero (z-5)
- PA-P2 absorbs poster grid or access-slot layout → scope creep into PA-P6/PA-P8

## Required tests

- Build passes
- Optional: Storybook smoke story mounting `PortalAtmosphere` + `PortalBackgroundLayers` only

## Visual regression

**Required captures (compare to reference PNG background regions):**

- [ ] Dark desktop — full viewport
- [ ] Light desktop — full viewport

Optional this phase: tablet, mobile (formal gate in PA-P8).

## Acceptance proof

- [ ] Dark background matches midnight vault direction
- [ ] Light background matches archival ivory direction
- [ ] Layers use token variables only
- [ ] No auth dependency
- [ ] No interactive behavior
- [ ] No horizontal overflow at 1280px and 1440px
- [ ] Visual regression captures attached or in Storybook
- [ ] No poster grid, header placement, or access-slot layout in PA-P2 files

## Next slice gate

PA-P3 may begin only after PA-P2 acceptance proof is complete.

PA-P3 must add owl layer only. It must not add editorial hero, seal, access slot, or auth wiring.

## Rollback

Remove PA-P2 components; revert atmosphere CSS layer rules; keep PA-P1 tokens.

## Drift risk

Copying remaining gradient logic into `portal-auth-atmosphere` instead of migrating into `PortalBackgroundLayers`.
