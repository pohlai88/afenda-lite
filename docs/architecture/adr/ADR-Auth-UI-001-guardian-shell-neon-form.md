# ADR-Auth-UI-001: Guardian Shell + Neon Form (Method B)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Accepted** | 2026-07-09 |
| **Owners** | Engineering / Design System |
| **Scope** | Production auth UI shell and credential presentation |
| **Out of scope** | Neon Auth backend, dashboard/client shells, hero PNG pixel parity |

**Related:** [SPEC-B](../specs/SPEC-B-guardian-auth-canonical-refactor.md) · [ADR-Portal-BG-001](./ADR-Portal-BG-001-portal-atmosphere-system.md) · [lib/studio-canonical-kit.ts](../../../lib/studio-canonical-kit.ts)

---

## Context

Production auth had a split stack:

- `/auth/sign-in` → `GuardianAuthLoginPage` with mock `AccessVaultCard` (no Neon)
- Other `/auth/*` → `PortalAuthLayout` + `PortalAuthNeonView`

The mock vault contradicted Neon manifest (`ui.features.social: false`) and broke real sign-in. E2E and docs assumed Neon AuthView on sign-in.

Two methods were considered:

| Method | Description |
|--------|-------------|
| **A** | Restore `PortalAuthLayout` on sign-in; demote Guardian to Storybook |
| **B** | Commit to Guardian as cinematic shell; wire Neon AuthView into access slot |

---

## Decision

**Method B is accepted for this train.**

1. **One production auth shell:** `GuardianAuthFacade` (via `GuardianAuthLoginPage`) wraps all `/auth/*` paths that need the cinematic layout.
2. **One credential engine:** Neon `@neondatabase/auth-ui` `AuthView` via `PortalAuthNeonView` inside the Guardian access slot.
3. **No mock credentials:** `AccessVaultCard` is Storybook/fixture only — never mounted on production auth routes.
4. **Rollback:** `GUARDIAN_AUTH_SHELL=false` restores `PortalAuthLayout` + Neon for sign-in for one release.
5. **Theme:** Guardian `night`/`day` syncs to portal `useThemeControls` (`dark`/`light`); no orphan local theme store.
6. **`/join` exception:** `PortalAuthLayout` remains on `/join` through Phase 2; documented until a follow-up migrates brand chrome.
7. **Atmosphere experiments:** Fade Owl, Dual Guardian, Comp Laptop stay Storybook-only (ADR-Portal-BG-001 boundary preserved).

### AuthView mounting contract

```text
PortalAuthProvider (NeonAuthUIProvider + manifest features)
  └── GuardianAuthFacade
        └── access slot
              ├── PortalAuthFormIntro / notices (portal-owned)
              └── PortalAuthNeonView pathname={path} redirectTo={…}
```

Do **not** nest a second `NeonAuthUIProvider`. Do **not** reimplement email/password fields.

---

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Method A (PortalAuthLayout on sign-in) | Abandons approved cinematic Guardian direction; dual brand on auth ingress |
| Custom credential form POST | Violates Neon Auth as SoT |
| Studio `login-page-02` LoginForm in prod | Replaces Neon; layout reference only per studio-canonical-kit |
| Mock Google SSO in vault | Contradicts manifest `ui.features.social: false` |

---

## Consequences

### Positive

- Single auth shell and engine; E2E and docs align with prod
- Real sign-in from `/auth/sign-in`; fake Unlock removed
- Guardian kit (`components/auth/*`) becomes documented prod presentation layer
- Rollback flag limits cutover risk

### Negative / trade-offs

- Temporary dual brand: `/join` on `PortalAuthLayout` until migrated
- Visual hero PNG parity deferred to follow-up work
- Guardian CSS + portal-atmosphere experiment CSS require cleanup (Phase 3)
- Storybook may use Neon mock until AuthView is reliably story-testable

---

## Compliance

- Neon trusted origins and localhost policy unchanged (production branch `allow_localhost: false`)
- Shared email provider only for Neon Auth mail
- Manifest SSOT via `config/neon-auth.manifest.json` + `lib/auth/neon-auth-ui.config.ts`

---

## References

- Implementation plan: [SPEC-B](../specs/SPEC-B-guardian-auth-canonical-refactor.md)
- Studio layout density: `login-page-02` in [lib/studio-canonical-kit.ts](../../../lib/studio-canonical-kit.ts)
