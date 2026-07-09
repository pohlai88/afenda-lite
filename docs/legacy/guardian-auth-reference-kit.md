# Guardian Auth reference kit (retired)

The folder `_reference/guardian_auth_reusable_components` was a **design seed** for the cinematic auth facade. It is **not** the source of truth for this repository.

## Production SSOT

| Concern | Authority |
| ------- | --------- |
| Auth shell decision | [ADR-Auth-UI-001](../architecture/adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) — Method B |
| Reusable components | [`components/auth/`](../../components/auth/) |
| Sign-in route | [`components/guardian-auth-login-page.tsx`](../../components/guardian-auth-login-page.tsx) → `PortalAuthNeonView` |
| Join route | [`components/guardian-invitation-join-page.tsx`](../../components/guardian-invitation-join-page.tsx) → invitation stepper |
| Editorial copy | [`lib/copy/guardian-editorial-copy.ts`](../../lib/copy/guardian-editorial-copy.ts) |
| Owl assets | [`lib/copy/portal-brand.ts`](../../lib/copy/portal-brand.ts) → `GUARDIAN_AUTH_ASSET_SET` |
| Neon manifest | [`lib/auth/neon-auth.manifest.json`](../../lib/auth/neon-auth.manifest.json) |

## What was absorbed from the kit

- `GuardianAuthFacade`, `OwlScene`, `EditorialPosterCopy`, `ThemeToggle`, `GuardianShield`, `types`, `guardian-auth-facade.css`
- Day/night mode classes (`.guardian-auth--day` / `.guardian-auth--night`)
- State classes (`.guardian-auth--state-*`)

## Production extensions (not in reference kit)

- `leftPanel` slot on `GuardianAuthFacade` (join brand panel)
- `useGuardianNeonAuthState` — maps Neon form activity to `GuardianState`
- Theme sync via portal `useThemeControls` (no orphan local theme store)
- `GUARDIAN_AUTH_SHELL=false` rollback to `PortalAuthLayout`

## Storybook / fixture only

- **`AccessVaultCard`** — mock credentials; **never** mount on `/auth/*` or `/join` in production
- **`ExampleLoginPage`** — superseded by `GuardianAuthLoginPage`

## Asset contract note

The reference kit expected distinct day/night/ghost cutouts under `/public/auth/owls/`. Production uses brand dramatic owl paths from `GUARDIAN_AUTH_ASSET_SET` (day/night may share the same core asset; ghost layers optional). Hero PNG pixel parity is explicitly deferred in ADR-Auth-UI-001.

## Do not

- Re-copy `_reference/guardian_auth_reusable_components` into `components/auth/`
- Follow `AGENT_PROMPT.md` in the retired kit (it predates Method B Neon wiring)
- Mount `AccessVaultCard` on production auth routes
- Treat `/public/auth/owls/PUT_*.txt` placeholders as implementation instructions

## Validation

- Storybook: `stories/ui-evaluation/guardian-auth-facade.stories.tsx`
- Interaction: `components/auth/guardian-auth-facade.interaction.test.tsx`
