# Portal Atmosphere — design review baselines (PA-P7 / PA-P8)

Storybook authority: `stories/ui-evaluation/portal-atmosphere.stories.tsx`

Composition authority: `components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture.tsx`

Responsive CSS authority: `components/portal-atmosphere/styles/portal-atmosphere.responsive.css`

## Fixture rule

Stories must render production `PortalAtmosphere` via `PortalAtmospherePreview`. Only the access slot content may be mocked (`AccessSlotPlaceholder`). Do not recreate owl, hero, seal, background, or slot layout outside `PortalAtmosphere`.

## Mobile composition (PA-P8)

On viewports below 1024px the layout order is **access-first**:

1. Header / toolbar (grid region; may be empty in fixtures)
2. Access slot
3. Reduced editorial brand (hero + seal)
4. Decorative owl (background layer only)

## Capture workflow

**Quality benchmark (required reading):** [`docs/architecture/slices/portal-atmosphere/pa-hero-quality-benchmark.md`](../../architecture/slices/portal-atmosphere/pa-hero-quality-benchmark.md)

## Storybook experiment index

| Story | Status | Notes |
|-------|--------|-------|
| `Portal Atmosphere / Design Review` (`portal-atmosphere.stories.tsx`) | **Authority** | Production `PortalAtmosphere` via preview fixture |
| `Portal Atmosphere / Guardian Auth Facade` | **Prod shell** | `/auth/*` via `GuardianAuthLoginPage` + Neon (ADR-Auth-UI-001); mock `AccessVaultCard` Storybook-only |
| `Portal Atmosphere / Comp Laptop` | Active experiment | Storybook only — CSS not in prod globals |
| `Portal Atmosphere / Fade Owl` | Active experiment | Storybook only |
| `Portal Atmosphere / Dual Guardian Facade` | Active experiment | Storybook only |
| `UI Evaluation / Auth Brand Scene` | Legacy | Pre-PA `PortalAuthPhantomOwl` path |
| `UI Evaluation / Owl Dramatic Scene` | Legacy | Dramatic mockup review |

Comp-aligned laptop hero stories: `stories/ui-evaluation/portal-atmosphere-comp-laptop.stories.tsx` — compare `ReferenceComparisonDark` / `ReferenceComparisonLight` at 1024px against `public/brand/heroes/auth-hero-*.png`.

Fade Owl (Storybook only): `stories/ui-evaluation/portal-atmosphere-fade-owl.stories.tsx` — variants `dual` (light/night PNG cross-fade) and `morpho` (single `guardian-dramatic-iso.png`); no prod wiring.

1. Run `npm run storybook`
2. Open **Portal Atmosphere / Design Review**
3. Capture each story at the viewport below
4. Save files in this directory using dated basenames

| Story | Viewport | Filename pattern |
|-------|----------|------------------|
| `DarkDesktop` | 1440×900 | `YYYY-MM-DD-dark-desktop-baseline.png` |
| `LightDesktop` | 1440×900 | `YYYY-MM-DD-light-desktop-baseline.png` |
| `SplitTheme` | 1440×900 | `YYYY-MM-DD-split-theme-baseline.png` |
| `TabletDark` | 768×1024 | `YYYY-MM-DD-tablet-dark-baseline.png` |
| `TabletLight` | 768×1024 | `YYYY-MM-DD-tablet-light-baseline.png` |
| `MobileDark` | 390×844 | `YYYY-MM-DD-mobile-dark-baseline.png` |
| `MobileLight` | 390×844 | `YYYY-MM-DD-mobile-light-baseline.png` |
| `SmallMobileSmoke` | 320×568 | `YYYY-MM-DD-mobile-320-smoke.png` |
| `Laptop1024Dark` | 1024×768 | `YYYY-MM-DD-laptop-1024-baseline.png` (optional) |
| `Desktop1280Dark` | 1280×900 | `YYYY-MM-DD-desktop-1280-baseline.png` (optional) |
| `Wide1920Dark` | 1920×1080 | `YYYY-MM-DD-wide-1920-baseline.png` (optional) |

Replace baselines only with a new dated filename. Do not overwrite an approved baseline without design sign-off.

## Acceptance commands (PA-P8)

```bash
npm run build
npm run check:portal-atmosphere
npm run storybook
```

Manual viewport matrix: 320, 390, 768, 1024, 1280, 1440, 1920.

## Auth boundary

Forbidden in `stories/ui-evaluation/**` and `components/portal-atmosphere/fixtures/**`:

- `@neondatabase/*`
- `AuthView`, `createAuthClient`, `createNeonAuth`
- `requireAdminSession`, `requireClientSession`
- `@/app/actions/*`
- `PortalAuthLayout`, `portal-auth-neon-view`

Guard: `npm run check:storybook-auth-boundary`

Auth wiring remains frozen until **PA-P10**.
