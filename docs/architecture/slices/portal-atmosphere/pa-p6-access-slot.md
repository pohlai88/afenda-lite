# PA-P6 — Access slot layout

| Field | Value |
|-------|-------|
| **Status** | pending |
| **Sequence** | 6 |
| **Depends on** | PA-P5 |
| **Feeds into** | PA-P7–PA-P10 |

## Purpose

Reserve right-side layout position for the future auth chamber using a placeholder card — positioning and z-index only, no real auth.

## Authority

- [ADR §Access slot](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#6-start-in-repo-graduate-later) — z-20
- Prototype: `.portal-auth-neon-slot`, `.portal-auth-grid` in `globals.css`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Slot API | `PortalAccessSlot` accepts `children` only |
| Placeholder | Static card using shadcn `Card` or neutral div — “Access Vault” mock label allowed |
| Auth boundary | No `@neondatabase/auth*`, no `AuthView`, no form fields with real submit |
| Tokens | `--portal-card-adjacent` for slot environment; form primitives use shadcn `--card`, `--border` |
| Layout | Desktop: right column; mobile: stack order documented for PA-P8 |

## Inputs / outputs

- **Inputs:** Full atmosphere stack PA-P2–P5; grid layout from prototype
- **Outputs:** `PortalAccessSlot`; composed `PortalAtmosphere` with placeholder child

## Owned files

- `components/portal-atmosphere/PortalAccessSlot.tsx`
- `components/portal-atmosphere/styles/portal-atmosphere.layout.css`
- `components/portal-atmosphere/fixtures/access-slot-placeholder.tsx` (static mock card)
- `components/portal-atmosphere/index.ts`

## Do

- Align slot with reference PNG “Access Vault” card position on desktop.
- Verify owl scrim + hero do not reduce placeholder input contrast.
- Export composed shell ready for Storybook full-layout story.

## Don't

- Wire Neon Auth, OAuth, or password fields.
- Import `portal-auth-neon-view` or session providers.
- Implement real unlock/submit behavior on placeholder.

## Critical control points

- z-20 isolation for slot content
- Placeholder max-width consistent with reference (~`max-w-sm` region)
- Slot remains usable when hero visible on lg+

## Failure modes

- Placeholder accidentally imports auth UI → violates auth freeze
- Slot centered on desktop → breaks poster layout
- Contrast failure on dark vault background

## Required tests

- Build passes
- Manual contrast check: placeholder inputs vs `--portal-card-adjacent` / `--card`

## Visual regression

**Required captures:**

- [ ] Dark desktop — full layout with placeholder card
- [ ] Light desktop — full layout with placeholder card

Compare card position and atmosphere balance to reference PNGs.

## Acceptance proof

- [ ] Accepts placeholder child; no auth imports
- [ ] Desktop right alignment matches mock direction
- [ ] Placeholder readable on both themes
- [ ] Composed atmosphere (layers + owl + hero + seal + slot) renders
- [ ] No credential or session code touched
- [ ] Visual regression captures approved

## Rollback

Remove access slot and placeholder; keep atmosphere decorative stack.

## Drift risk

Engineers wire real `AuthView` early “just to preview” — bypasses PA-P10 gate.
