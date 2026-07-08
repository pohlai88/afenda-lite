# PA-P10 — Auth slot integration contract

**Parent slice:** [pa-p10-auth-integration-readiness.md](./pa-p10-auth-integration-readiness.md)  
**Authority:** [ADR-Portal-BG-001](../../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md)

## Purpose

Define how authentication UI enters the Portal Atmosphere System after PA-P9 static acceptance — without atmosphere components knowing credential logic.

## Allowed composition

```tsx
<PortalAtmosphere className={themeClass}>
  <header>{/* BrandLogo, PortalThemeToggle — existing toolbar */}</header>
  <PortalBackgroundLayers />
  <PortalGuardianOwl showOwl />
  <section className="brand-column max-lg:hidden">
    <PortalEditorialHero theme={theme} />
    <PortalSealLine showSeal />
  </section>
  <PortalAccessSlot>
    {children /* Neon AuthView, join panel, or account views */}
  </PortalAccessSlot>
</PortalAtmosphere>
```

## Forbidden in `components/portal-atmosphere/**`

- `@neondatabase/auth`, `@neondatabase/auth-ui`, `@neondatabase/auth/react`
- `createAuthClient`, session hooks, server auth helpers
- Route handlers, redirects, `returnTo` parsing
- Form submit handlers, credential validation

## Allowed in adapter (`portal-auth-layout.tsx`)

- Import atmosphere components from `@/components/portal-atmosphere`
- Pass Neon Auth view as `children` of `PortalAccessSlot`
- Skip link, toolbar, footer — layout concerns outside atmosphere core

## Heading coordination

See [PA-P9 heading ownership rule](./pa-p9-accessibility-qa.md#heading-ownership-rule).

**Before wiring:** atmosphere owns page-level h1 (sr-only).

**After wiring — choose one pattern only:**

| Pattern | Atmosphere | Auth card |
|---------|------------|-----------|
| A (default) | sr-only `<h1>Truth is protected</h1>` | Card title as **h2** or AuthView subheading |
| B | `suppressPageHeading` prop disables atmosphere h1 | Route owns visible **h1** |

Duplicate page-level h1 is **not allowed**.

| Element | Responsibility |
|---------|----------------|
| `PortalEditorialHero` | sr-only h1 on auth ingress (unless Pattern B) |
| Neon Auth card title | h2 under Pattern A; h1 under Pattern B only |
| Join / invitation panels | Reuse atmosphere shell; panel titled section inside slot |

## Token boundaries at integration

- Auth form surfaces: shadcn `--card`, `--input`, `--ring`, `--primary`
- Atmosphere shell: `--portal-*` only
- Do not move form styling into atmosphere CSS

## Migration cleanup

When wiring lands, deprecate visual rules in `app/globals.css`:

- `.portal-auth-atmosphere` → `PortalBackgroundLayers`
- `.portal-auth-phantom-*` → `PortalGuardianOwl`
- `.portal-hero-*` → `PortalEditorialHero`
- `.portal-auth-seal-line` → `PortalSealLine`
- Grid/slot layout → `PortalAccessSlot` + layout css

Keep behavior-specific rules (e.g. `.portal-neon-view [data-slot="input-otp"]`) in globals until Neon theming slice owns them.

## Rollback

1. Restore `portal-auth-layout.tsx` to pre-wiring version.
2. Leave `components/portal-atmosphere/` intact.
3. Re-enable prototype CSS if removed — prefer feature flag over delete during first production deploy.

## Verification after wiring

| Check | Command / action |
|-------|------------------|
| Smoke auth | `npm run test:e2e:smoke` |
| Build | `npm run build` |
| Visual | Dark/light desktop screenshots with real AuthView vs reference PNGs |
| Boundary | `rg '@neondatabase/auth' components/portal-atmosphere/` → no matches |
