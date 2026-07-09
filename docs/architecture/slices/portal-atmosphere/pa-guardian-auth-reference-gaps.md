# Guardian Auth — reference kit gap register (morpho final)

| Field | Value |
|-------|-------|
| **Status** | Accepted omissions documented |
| **Reference** | `_reference/guardian_auth_reusable_components/` |
| **Production** | `components/auth/` + `GuardianAuthLoginPage` / `GuardianInvitationJoinPage` |
| **Owl decision** | **Morpho** — single `public/brand/owls/guardian-dramatic-iso.png`, CSS day/night presentation |

Authority: [ADR-Auth-UI-001](../../adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) · [pa-hero-quality-benchmark.md](./pa-hero-quality-benchmark.md)

---

## Production owl strategy (final)

Production Guardian Auth uses **one painterly iso PNG** (`guardian-dramatic-iso.png`, 524×561). Day/night modes cross-fade via `.owl-scene__owl--morpho` CSS filters and `mix-blend-mode` — not separate day/night cutout images.

```ts
// lib/copy/portal-brand.ts
GUARDIAN_AUTH_ASSET_SET = {
  owlDay: "/brand/owls/guardian-dramatic-iso.png",
  owlNight: "/brand/owls/guardian-dramatic-iso.png",
};
```

`OwlScene` renders a single `<img class="owl-scene__owl--morpho">` sourced from `assets.owlNight`.

Dual PNG cross-fade from the reference kit and Fade Owl `dual` variant remain **Storybook experiments only**.

---

## Implemented (reference parity)

| Item | Status |
|------|--------|
| `GuardianAuthFacade` zone architecture (editorial \| owl \| threshold \| access) | Present |
| `OwlScene`, `EditorialPosterCopy`, `ThemeToggle`, `GuardianShield` | Present |
| `AccessVaultCard` | Present — Storybook/mock only (ADR) |
| Day/night via `.guardian-auth--day` / `--night` | Present |
| States via `.guardian-auth--state-*` (7 values) | Present + Neon DOM bridge |
| Reduced motion + responsive breakpoints (980px, 620px) | Present |
| `/auth/*` + `/join` route wiring | Present |
| `ExampleLoginPage` pattern | Replaced by `guardian-auth-facade.fixture.tsx` + Storybook |

---

## Accepted omissions (not shipping)

These are **intentionally omitted** from production. Do not restore without explicit user approval.

| Reference item | Production status | Rationale |
|----------------|-------------------|-----------|
| Dual owl PNG cross-fade (`owl-scene__owl--day` + `--night`) | **Omitted** | Morpho final; dual stays Fade Owl / reference kit only |
| `public/auth/owls/owl-*-cutout.png` | On disk, **unwired** | Legacy reference paths; prod uses `/brand/owls/guardian-dramatic-iso.png` |
| Ghost owl layers (`owlDayGhost`, `owlNightGhost`) | **Night fade-ghost** | `owlNightGhost` = same morpho PNG; offset larger frame (`.owl-scene__ghost--night`) visible at night (~.2), fades to ~.05 in day |
| Texture PNGs (`marble-veil`, `starfield-noise`) | **Omitted** | Never in reference code; atmosphere is CSS gradients |
| Emblem PNG (`shield-keyhole-gold.png`, `assets.shield`) | **Omitted** | `GuardianShield` is CSS-only |
| `AccessVaultCard` on prod routes | **Replaced** | Neon `AuthView` per ADR-Auth-UI-001 |
| Mock Google SSO in vault | **Replaced** | Neon manifest `social: false` |
| Hero comp pixel parity @1024px | **Open** | Human sign-off via Storybook `ReferenceComparisonNight/Day`; ADR defers parity |

---

## Open follow-ups (non-blocking)

| Item | Owner | Notes |
|------|-------|-------|
| Hero benchmark sign-off | Design | `stories/ui-evaluation/guardian-auth-facade.stories.tsx` side-by-side vs `auth-hero-*.png` |
| Viewport containment sign-off | Design | `guardian-auth-viewport-containment.stories.tsx` at 100% zoom |
| Morpho owl position tuning | Design | Desktop `left: 36%` vs reference kit `28%` — tune only after comp review |
| Orphan `public/auth/owls/*-cutout.png` | Ops | Safe to delete or keep as reference archive |

---

## Storybook experiment map

| Variant | Asset strategy | Prod wiring |
|---------|----------------|-------------|
| Guardian Auth Facade (prod) | Morpho iso | `/auth/*`, `/join` |
| Fade Owl `morpho` | Same iso | None |
| Fade Owl `dual` | Light + night PNG cross-fade | None |
| Dual Guardian Facade | `owl-variants/allowed-base/*` | None |
| Reference kit | Dual cutouts under `/auth/owls/` | `_reference/` only |
