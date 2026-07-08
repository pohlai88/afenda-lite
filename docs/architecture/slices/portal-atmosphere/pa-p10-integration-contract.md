# PA-P10 — Auth slot integration contract

**Parent slice:** [pa-p10-auth-integration-readiness.md](./pa-p10-auth-integration-readiness.md)  
**Status:** ready-for-review  
**Deliverable type:** documentation + sample composition only

## Purpose

Define how Neon Auth UI enters the Portal Atmosphere System after PA-P9 static acceptance, without allowing atmosphere components to know authentication logic.

PA-P10 documents the integration contract. Production auth wiring lives in `components/portal-auth-layout.tsx`; E2E and CSS retirement remain follow-up.

## Allowed composition

Production composition uses PA-P8 layout slots on `PortalAtmosphere`:

```tsx
<PortalAtmosphere
  theme={theme}
  layers={<PortalGuardianOwl showOwl />}
  brand={
    <>
      <PortalEditorialHero theme={theme} />
      <PortalSealLine showSeal />
    </>
  }
  accessSlot={<PortalAccessSlot>{children}</PortalAccessSlot>}
/>
```

Optional toolbar/header (when adapter owns chrome):

```tsx
<PortalAtmosphere
  theme={theme}
  header={toolbar}
  layers={<PortalGuardianOwl showOwl />}
  brand={/* hero + seal */}
  accessSlot={<PortalAccessSlot>{children}</PortalAccessSlot>}
/>
```

Fixture authority (PA-P7 / PA-P10 sample):

```tsx
<PortalAtmospherePreview
  theme={theme}
  suppressPageHeading={false}
  accessSlot={children}
/>
```

Background layers render automatically via `PortalAtmosphere` (`withBackgroundLayers` default). Do not mount `PortalBackgroundLayers` twice.

## Forbidden in `components/portal-atmosphere/**`

- `@neondatabase/auth`
- `@neondatabase/auth-ui`
- `@neondatabase/auth/react`
- session hooks
- server auth helpers
- route redirects
- `returnTo` parsing
- credential validation
- submit handlers

## Allowed in adapter

The adapter may:

- import atmosphere components
- pass Neon Auth UI as child of `PortalAccessSlot`
- own route-level heading coordination
- own skip link and toolbar
- preserve existing auth behavior

## Heading coordination

Before auth wiring, atmosphere owns:

```tsx
<h1 className="sr-only">{PORTAL_EDITORIAL_HEADING}</h1>
```

After wiring, choose one pattern only.

| Pattern | Atmosphere                    | Auth card                     |
| ------- | ----------------------------- | ----------------------------- |
| A       | keeps sr-only h1              | auth title uses h2/subheading |
| B       | `suppressPageHeading` enabled | route owns visible h1         |

Duplicate page-level h1 is forbidden.

## Token boundary

| Area                               | Token owner               |
| ---------------------------------- | ------------------------- |
| Atmosphere canvas, owl, hero, seal | `--portal-*`              |
| Auth card, input, button, ring     | shadcn tokens             |
| Auth behavior                      | Neon Auth / route adapter |

Do not move form styling into atmosphere CSS.

## Migration cleanup after follow-up wiring

Deprecated visual rules in `app/globals.css`:

- `.portal-auth-atmosphere`
- `.portal-auth-phantom-*`
- `.portal-hero-*`
- `.portal-auth-seal-line`
- layout-only portal auth grid rules

Keep behavior-specific Neon Auth selectors until a dedicated Neon theming slice owns them.

## Verification

```bash
npm run check:portal-atmosphere
npm run check:portal-atmosphere:auth-boundary
```

Expected:

```txt
Portal atmosphere auth boundary passed.
rg '@neondatabase/auth' components/portal-atmosphere/ → No matches.
```

## Rollback

1. Revert only the auth layout adapter.
2. Keep `components/portal-atmosphere/` intact.
3. Restore prototype CSS only if the first production wiring follow-up requires emergency rollback.
