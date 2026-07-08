# PA-P1 — OKLCH token foundation

| Field | Value |
|-------|-------|
| **Status** | implemented |
| **Sequence** | 1 |
| **Depends on** | PA-P0 |
| **Feeds into** | PA-P2–PA-P10 |

## Purpose

Create the single visual token authority for the Portal Atmosphere System — OKLCH variables, theme classes, and typed contracts — with no component rendering yet.

**Doctrine:** PA-P1 = token authority only. No rendering. No owl. No hero. No auth. No migration of existing visual CSS yet.

## Authority

- [ADR-Portal-BG-001 §Token families](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#token-families-atmosphere-owned)
- [ADR §Token Ownership Rules](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#token-ownership-rules)
- [PA-P0 next slice gate](./pa-p0-adr-doctrine.md#next-slice-gate)
- Prototype values (reference only): `app/globals.css` (`.portal-auth-*`, `.portal-hero-*`, vault vars)

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Color format | Color tokens use OKLCH only |
| Non-color tokens | Fonts, radius, spacing, and timing tokens may use semantic CSS values |
| Namespace | All atmosphere semantics under `--portal-*` |
| shadcn boundary | Map generic surfaces to `--background` / `--card` only; never encode owl or hero meaning in shadcn tokens |
| Closed set | Token list matches ADR; no ad-hoc `--brand-*` or duplicate aliases |
| Distribution | Import atmosphere CSS from one entry (`portal-atmosphere.css`) consumed by `app/globals.css` |

## Token implementation

**CSS is runtime authority; TypeScript is token-name contract.** Do not duplicate color values in TS unless there is a clear reason.

```ts
export const PORTAL_ATMOSPHERE_TOKEN_NAMES = [
  "--portal-bg",
  "--portal-fg",
  "--portal-card-adjacent",
  "--portal-muted",
  "--portal-border",
  "--portal-ring",
  "--portal-owl-line",
  "--portal-owl-shadow",
  "--portal-owl-highlight",
  "--portal-hero-truth",
  "--portal-hero-protected",
  "--portal-hero-is",
  "--portal-hero-rule",
  "--portal-glow-primary",
  "--portal-glow-soft",
] as const;

export type PortalAtmosphereTokenName =
  (typeof PORTAL_ATMOSPHERE_TOKEN_NAMES)[number];
```

## Inputs / outputs

- **Inputs:** ADR token families; prototype OKLCH from `globals.css`; `app/fonts.ts` font variables
- **Outputs:** Token TS + CSS files; dark/light theme classes; contracts; zero hardcoded colors in new components

## Owned files

```txt
components/portal-atmosphere/
  tokens/
    portal-atmosphere.tokens.ts
    portal-atmosphere.tokens.test.ts
    portal-atmosphere.css
    portal-atmosphere.dark.css
    portal-atmosphere.light.css
  contracts/
    portal-theme.contract.ts
    portal-atmosphere.contract.ts
    portal-editorial.contract.ts
    portal-editorial.contract.test.ts
  index.ts

app/globals.css   # @import atmosphere tokens only — no new .portal-auth-* rules
```

## Do

- Define dark (midnight vault) and light (archival ivory) token values per ADR Appendix B.
- Export `PortalAtmosphereTheme`, `PortalInversionMode`, `PortalEditorialCopy`, `DEFAULT_PORTAL_EDITORIAL_COPY`.
- Document shadcn mapping table in token file comments where `--portal-bg` references `--background`.

## Don't

- Add React layout or owl/hero components in this slice.
- Hardcode hex/rgb in TS or TSX.
- Add atmosphere-specific keys to shadcn `:root` block.
- Modify auth providers, routes, or Neon Auth wiring.
- Add layout, positioning, z-index, gradient layer, owl, hero, card, or control styling classes; PA-P1 defines tokens only.
- Delete or migrate existing `.portal-auth-*` rendering CSS in this slice; extraction begins only after token authority is established.

## Critical control points

- Every ADR-listed `--portal-*` family has a defined value in both themes.
- Dark and light token files expose the same token keys.
- Typography variables: `--font-editorial`, `--font-ui` reference existing font setup.
- Theme selectors are isolated to the Portal Atmosphere System and do not depend directly on global `.dark` / `.light` behavior unless explicitly mapped.

## Failure modes

- Tokens split across `globals.css` and package → dual authority
- shadcn tokens polluted with `--portal-owl-*` semantics
- Missing dark/light parity → contrast regressions in PA-P2+
- Color values duplicated in TS and CSS → drift between authorities
- Premature `.portal-auth-*` deletion before PA-P2+ extraction → broken auth ingress

## Required tests

- Contract tests: `PortalAtmosphereTheme`, `PortalInversionMode`, `PortalEditorialCopy`, and `DEFAULT_PORTAL_EDITORIAL_COPY` satisfy exported interfaces.
- Token parity test: dark and light token sources define the same `--portal-*` keys.
- Token namespace test: no `--brand-*`, `--owl-*`, or atmosphere-specific shadcn token additions are introduced.
- Build: `npm run build` passes with token import wired.

## Visual regression

Token swatch fixture optional (Storybook or static HTML). **First mandatory visual gate is PA-P2.**

Capture if produced:

- Dark token preview panel
- Light token preview panel

## Acceptance proof

- [x] All ADR `--portal-*` families defined in OKLCH for dark and light
- [x] Dark/light CSS files share identical token key sets
- [x] No hardcoded colors in `components/portal-atmosphere/**` TS/TSX
- [x] CSS owns runtime color values; TS owns names/contracts only
- [x] Token ownership documented; shadcn tokens unchanged in meaning
- [x] Contracts exported from `components/portal-atmosphere/index.ts`
- [x] Contract and token parity tests pass
- [x] `app/globals.css` imports atmosphere token CSS only
- [x] No new `.portal-auth-*` rules added (slice-scoped — package does not expand them)
- [x] No `.portal-auth-*` rendering CSS deleted or migrated (deferred to PA-P10 wiring)
- [x] Build passes
- [x] No auth file changes

## Next slice gate

PA-P2 may begin only after PA-P1 acceptance proof is complete.

PA-P2 must render background layers only. It must not add owl, hero, seal, access slot, or auth wiring.

## Rollback

Remove atmosphere token imports from `globals.css`; delete `components/portal-atmosphere/tokens/` and contracts added in this slice.

## Drift risk

New atmosphere colors added inline in PA-P2+ instead of extending token files first.
