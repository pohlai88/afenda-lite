# PA-P5 — Seal line

| Field | Value |
|-------|-------|
| **Status** | ready-for-review |
| **Sequence** | 5 |
| **Depends on** | PA-P4 |
| **Feeds into** | PA-P6–PA-P10 |

## Purpose

Add minimal institutional seal microcopy (`SECURE · CONFIDENTIAL · VERIFIED`) below the editorial hero — optional, single instance, non-competing with hero.

## Authority

- [ADR §Design Doctrine — seal line](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#2-adopt-the-design-doctrine)
- Prototype: `.portal-auth-seal-line` in `globals.css`, shield icon in `portal-auth-layout.tsx`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Copy | From `PortalEditorialCopy.seal` or default constant |
| Typography | `--font-ui`; uppercase; controlled letter-spacing |
| Layer | z-10; decorative — may use `aria-hidden` if redundant with sr-only h1 context |
| Icon | Reuse lucide `ShieldCheckIcon` or portal brand icon pattern; token `--portal-*` for color |
| Density | Single seal line only — no decorative metadata clutter |

## Inputs / outputs

- **Inputs:** PA-P4 hero layout; seal copy contract
- **Outputs:** `PortalSealLine` component with optional `showSeal`; preview fixture may forward `showSeal` — not a prop on `PortalAtmosphere`

## Owned files

- `components/portal-atmosphere/PortalSealLine.tsx`
- `components/portal-atmosphere/styles/portal-atmosphere.seal.css` (or hero css extension)
- `components/portal-atmosphere/index.ts`

## Do

- Position below hero stack with spacing from tokens/clamp.
- Support `showSeal={false}` for minimal previews.
- Match reference PNG seal placement and shield + text pairing.

## Don't

- Add multiple seal variants or random cyber microcopy.
- Compete visually with TRUTH / PROTECTED scale.
- Include auth or form labels in this component.

## Critical control points

- Only one seal line in the composed atmosphere
- Seal readable but subordinate to hero hierarchy

## Failure modes

- Seal duplicated in auth card and atmosphere
- Letter-spacing too wide on mobile → broken layout
- Seal color not tokenized

## Required tests

- Build passes
- Storybook: hero + seal composed story

## Visual regression

**Required captures:**

- [ ] Dark desktop — seal below hero
- [ ] Light desktop — seal below hero

## Acceptance proof

- [x] Single seal line component
- [x] Optional rendering via prop (`showSeal` on `PortalSealLine`)
- [x] Copy from contract default (`resolvePortalSealText`)
- [ ] Does not compete with hero — visual
- [x] Token-based color
- [x] No auth changes
- [ ] Visual regression captures approved

## Rollback

Remove `PortalSealLine`; hide seal in composed stories.

## Drift risk

Seal copy hardcoded as “Sign in securely” or similar banned taglines.
