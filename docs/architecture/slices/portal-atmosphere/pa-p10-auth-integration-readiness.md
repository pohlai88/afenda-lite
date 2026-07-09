# PA-P10 — Auth integration readiness

| Field | Value |
|-------|-------|
| **Status** | implemented — production adapter wired; E2E smoke + legacy CSS retirement pending |
| **Deliverable type** | Documentation and sample composition only |
| **Sequence** | 10 |
| **Depends on** | PA-P9 |
| **Feeds into** | Neon Auth closure slices (BL-*), auth route wiring |

## Purpose

Document the access-slot integration contract and provide a sample composition — **without** changing live auth behavior, providers, or production routes in this slice.

**Clarification:** Production wiring ships in `components/portal-auth-layout.tsx` (PA-P8 slots + `PortalAccessSlot` child). Remaining follow-up: E2E smoke on auth routes, visual regression baselines (WP-1), and retiring Storybook-only `.portal-auth-*` phantom CSS after sign-off.

## Authority

- [ADR §Decision Outcome — auth frozen until this phase](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#decision-outcome)
- [ADR §Migration Policy step 8](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md#migration-policy)
- Prototype consumer: `components/portal-auth-layout.tsx`

## Design system compliance

| Rule | Requirement |
|------|-------------|
| Integration | Auth injected as child of `PortalAccessSlot` only |
| Boundaries | `portal-atmosphere/` still has zero `@neondatabase/auth*` imports |
| Layout | `PortalAuthLayout` becomes thin adapter — compose atmosphere + pass Neon view as child |
| Tokens | Auth card continues shadcn form tokens; atmosphere unchanged |
| Motion | Still none unless separate post-PA motion ADR after static sign-off |

## Inputs / outputs

- **Inputs:** Stable PA-P9 atmosphere; `portal-auth-layout.tsx` prototype; Neon Auth UI slot
- **Outputs:** Integration doc; sample code in docs or commented fixture; optional feature flag plan

## Owned files

- `docs/architecture/slices/portal-atmosphere/pa-p10-integration-contract.md` *(this slice creates)*
- `components/portal-atmosphere/fixtures/auth-slot-sample.tsx` (composition example — mock or commented real import)
- Follow-up PR (separate from this slice doc): `components/portal-auth-layout.tsx` wiring

## Do

- Document forbidden imports and allowed child components.
- Specify heading coordination: atmosphere sr-only h1 vs auth card titles.
- Provide sample:

```tsx
<PortalAtmosphere
  theme={theme}
  header={toolbar}
  layers={<PortalGuardianOwl showOwl />}
  brand={
    <>
      <PortalEditorialHero theme={theme} />
      <PortalSealLine showSeal />
    </>
  }
  accessSlot={
    <PortalAccessSlot>
      {/* PA-P10 sample only — production wiring is follow-up PR */}
      <PortalNeonAuthView />
    </PortalAccessSlot>
  }
/>
```

- List rollback: revert layout adapter only; atmosphere package unchanged.

## Don't

- Merge production auth wiring in the same PR as integration doc unless explicitly scoped as “PA-P10 implementation follow-up”.
- Modify credential validation, session, OTP, OAuth, password reset, or routes in the doc-only deliverable.
- Expand `.portal-auth-*` CSS for new visuals — delete migrated rules when wiring lands.

## Critical control points

- Integration PR must be reviewable separately from atmosphere stable tag
- E2E auth journeys must pass after wiring follow-up
- No duplicate semantic headings

## Failure modes

- Auth provider pulled into atmosphere root → boundary violation
- Layout migration breaks skip link or `returnTo` flows
- Visual regression after auth inject — compare to reference PNGs with real card

## Required tests

After **follow-up wiring PR** (not doc-only):

- `npm run test:e2e:smoke` — auth ingress
- `npm run build`
- Visual regression: dark/light with real AuthView in slot

## Visual regression

**Required after production wiring follow-up:**

- [ ] Dark desktop with real auth card in slot vs reference PNG
- [ ] Light desktop with real auth card in slot vs reference PNG
- [ ] Mobile auth usability retained

Doc-only PA-P10: confirm PA-P9 captures still valid.

## Acceptance proof

### Doc deliverable (this slice)

PA-P10 slice status may move to **accepted** when all below are true — **without** production auth wiring:

- [x] Integration contract published (`pa-p10-integration-contract.md`)
- [x] Sample composition documented
- [x] Forbidden coupling list explicit
- [x] Heading ownership rule aligned with PA-P9
- [x] Rollback steps documented

### Wiring follow-up (production adapter)

- [x] `PortalAuthLayout` consumes `PortalAtmosphere` (PA-P8 slots)
- [x] Auth card renders in `PortalAccessSlot`
- [x] No auth logic inside atmosphere components
- [ ] E2E smoke passes — [post-deploy-verification.md](../../../backlogs/post-deploy-verification.md) Phase 0–2
- [ ] Visual regression with real auth approved
- [ ] Migrated unused `.portal-auth-*` / `.portal-hero-*` visual rules removed (legacy phantom CSS retained for Storybook evaluation stories until retired)

## Rollback

Revert layout adapter to prototype `portal-auth-layout.tsx`; atmosphere package remains.

## Drift risk

“Quick fix” auth styling inside `PortalAccessSlot` instead of Neon Auth UI theming.
