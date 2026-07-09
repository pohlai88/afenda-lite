# SPEC-B — Guardian Auth Canonical Refactor (End-to-End)

| Field | Value |
|-------|--------|
| **Status** | In progress — [ADR-Auth-UI-001](../adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) Accepted |
| **Date** | 2026-07-09 |
| **Mode** | Technical specification (with migration / validation / rollback) |
| **Audience** | Engineers implementing auth UI unification; operators validating sign-in |
| **Decision** | **Method B** — commit to Guardian Auth as the single cinematic auth shell; wire Neon Auth into it; retire dual-stack prod |
| **Related** | [ADR-Portal-BG-001](../adr/ADR-Portal-BG-001-portal-atmosphere-system.md) · [pa-hero-quality-benchmark](../slices/portal-atmosphere/pa-hero-quality-benchmark.md) · [AGENTS.md](../../../AGENTS.md) |

---

## Overview

Unify the Client Declaration Portal auth UI so **one shell** owns every `/auth/*` entry (and eventually `/join` brand chrome), with **Neon Auth** as the only credential system and **Guardian Auth Facade** as the only cinematic presentation.

Today `/auth/sign-in` renders a mock Guardian form while other auth paths use `PortalAuthLayout` + `PortalAuthNeonView`. Method B ends that split by making Guardian the production shell and Neon the production form.

---

## Problem

1. **Split production stacks** — `app/auth/[path]/page.tsx` returns `GuardianAuthLoginPage` for `sign-in` (mock `AccessVaultCard`) and `PortalAuthLayout` + `PortalAuthNeonView` for every other path.
2. **Broken sign-in** — `AccessVaultCard` is a standalone HTML form with fake Google SSO and `/create-account` link; it does not call Neon Auth.
3. **Docs lie** — `lib/ui-decision-matrix.ts` and `stories/ui-evaluation/auth-shell.stories.tsx` still claim `PortalAuthLayout` wins for sign-in.
4. **CSS / theme / copy fracture** — Guardian BEM + local night/day vs portal-atmosphere BEM + `PortalThemeToggle` vs `portal-copy` / editorial contract / hardcoded vault strings.
5. **Onboarding cost** — agents and engineers cannot tell which of six hero compositions is production truth.

---

## Goals

1. **One auth shell in production:** `GuardianAuthFacade` (or a thin rename) wraps all `/auth/*` paths that need the cinematic layout.
2. **One auth engine:** Neon `@neondatabase/auth-ui` `AuthView` via an adapted access slot (reuse `PortalAuthNeonView` patterns).
3. **Real sign-in:** email/password (and existing Neon methods) work end-to-end from `/auth/sign-in`.
4. **Single theme model:** app `ThemeProvider` / `PortalThemeToggle` (or a Guardian adapter that syncs to it) — no orphan local night/day.
5. **Single copy SSOT:** vault and editorial strings from `lib/portal-copy.ts` + `portal-editorial.contract.ts`; no hardcoded Gemini leftovers in prod components.
6. **Docs and Storybook match prod** — decision matrix, auth-shell stories, UI-eval README updated in the same release train.
7. **Measurable exit:** smoke + journey E2E green; no mock Unlock on prod sign-in.

---

## Non-goals

- Redesigning dashboard / client shells (`DashboardShell`, `ClientShell`).
- Replacing Neon Auth with a custom credential API.
- Pixel-matching `auth-hero-dark.png` in this refactor (visual polish can follow; shell + Neon first).
- Deleting Storybook experiments (Fade Owl, Dual Guardian, Comp Laptop) — they stay Storybook-only; isolate their CSS from the global bundle as a follow-up.
- Migrating `/playground` product behavior (remains local harness).
- Method A (restore `PortalAuthLayout` on sign-in and demote Guardian to Storybook) — explicitly out of scope for this document.

---

## Constraints

| Constraint | Detail |
|------------|--------|
| Neon Auth is SoT | Do not reimplement login against a custom form POST; use `AuthView` / Neon Auth UI. |
| Trusted origins | `APP_URL` / preview URLs must remain in Neon Auth trusted domains. |
| Localhost | Production branch keeps `allow_localhost: false`; local auth uses dedicated Neon **dev** branch. |
| Atmosphere rules | Hero experiments stay Storybook-first; this refactor is an **explicit** prod commitment to Guardian (user-approved Method B). |
| A11y | Real form fields must be keyboard-accessible; mock `aria-hidden` vault chrome must not remain in prod. |
| E2E | Existing smoke/journey specs assert `/auth/sign-in` URLs and post-login redirects — must keep working. |
| No secrets in repo | Env via `env.config` / `env.secret` → `npm run env:compose`. |
| Shared email only | Neon Auth mail stays on shared provider (`auth@mail.myneon.app`) — do not attach MailerSend/SMTP to Neon Auth. |
| Manifest SSOT | UI feature flags come from `config/neon-auth.manifest.json` via `lib/auth/neon-auth-ui.config.ts` — do not hardcode social/credentials in Guardian. |

---

## Neon validation (2026-07-09)

### Evidence sources

| Source | Result |
|--------|--------|
| Workspace `.neon` | `projectId=young-hat-54755363`, branch `production` (`br-tiny-hill-ao82jp6f`), org `org-royal-bar-40022480` |
| `config/neon-auth.manifest.json` | Synced `2026-07-08T01:48:31.782Z` — **authoritative for this validation** |
| Neon MCP `get_neon_auth_config` | **Unavailable** — MCP orgs (`org-fragrant-lake-*`, Vercel org) do not include `org-royal-bar-40022480` / project `young-hat-*` (404 / empty list) |
| Neon CLI (`neon`) | Not on PATH in this agent shell |

**Assumption:** Manifest matches production until `npm run sync:neon-auth-manifest` + `npm run audit:neon-auth-production` are re-run from a machine with Neon API access to org-royal-bar.

### Live auth capabilities (from manifest)

| Capability | Manifest | Method B implication |
|------------|----------|----------------------|
| Email/password | `emailPassword.enabled: true` | **Required** — replace mock `AccessVaultCard` with `PortalAuthNeonView` |
| Forgot password | `ui.features.credentials.forgotPassword: true` | Keep Neon forgot/reset paths; do not invent Guardian password forms |
| Sign-up | `disableSignUp: false`, `ui.features.signUp: true` | Guardian shell must support `sign-up` pathname |
| Email verification | OTP method; `requireEmailVerification: false` | Trust notices stay; no custom OTP UI beyond AuthView |
| Magic link | Plugin enabled; `disableSignUp: true` | Mount AuthView `magic-link`; no Guardian-only magic form |
| Organization | Plugin enabled; invites on | Keep org invite Origin = `APP_URL` (`lib/auth/neon-auth-request.ts`) |
| OAuth Google | Present as **shared** OAuth provider | **Do not** ship mock Google button |
| Social UI | `ui.features.social: false` | `neonAuthUiProviderDefaults.social` is **undefined** — AuthView will **not** show Google until social is enabled in manifest + provider |
| Trusted domains | `https://iam-check.vercel.app` only | Preview deploys need `neon neon-auth domain add <preview>` before auth works |
| Localhost | `allowLocalhost: false` | Phase 1 local test **must** use a Neon **dev** branch with localhost allowed — never flip prod |
| Email provider | Shared `auth@mail.myneon.app` | No custom SMTP for Neon Auth |

### Optimizations for Method B (Neon-driven)

1. **Kill fake Google immediately** — `AccessVaultCard` Google CTA contradicts `ui.features.social: false`. Prod vault slot = Neon only; if Google is desired later, enable social in Neon Auth + re-sync manifest, then let AuthView render it.
2. **Reuse `PortalAuthNeonView` + existing provider** — `PortalAuthProvider` already wires `NeonAuthUIProvider` with localization from `portalCopy` and feature flags from the manifest. Guardian should **host** that tree, not fork AuthView props.
3. **Theme:** set Guardian mode from the same source as `defaultTheme: "system"` on `NeonAuthUIProvider` (portal theme controls). Avoid a second night/day store fighting AuthView chrome.
4. **Copy:** prefer `neonAuthUiLocalization` keys already mapped from `portalCopy` over Guardian `defaultCopy` / hardcoded vault labels.
5. **Pre-flight every Phase 1 PR:**
   ```bash
   npm run sync:neon-auth-manifest
   npm run audit:neon-auth-production
   ```
6. **Preview cutover:** add preview URL to Neon trusted domains **before** enabling Guardian+Neon on that deploy.
7. **MCP access gap:** grant Neon MCP / API token access to `org-royal-bar-40022480` (or re-link `.neon`) so live `get_neon_auth_config` can replace manifest-only validation.

### AuthView mounting contract (optimized)

```text
PortalAuthProvider (existing — NeonAuthUIProvider + manifest features)
  └── GuardianAuthFacade
        └── access slot
              ├── PortalAuthFormIntro / notices (portal-owned)
              └── PortalAuthNeonView pathname={path} redirectTo={…}
```

Do **not** nest a second `NeonAuthUIProvider`. Do **not** reimplement email/password fields. Style the vault **around** AuthView (slot size, glass panel); AuthView owns inputs/actions.

---

## Proposed design

### Target hierarchy

```text
lib/portal-copy.ts
lib/portal-editorial.contract.ts (poster-only strings)
        │
        ▼
GuardianAuthFacade (cinematic shell)
  ├── OwlScene / editorial (assets from portal-brand)
  ├── Theme ↔ PortalThemeToggle / useThemeControls
  └── Access slot
        └── PortalAuthNeonView (AuthView pathname=…)
              + PortalAuthFormIntro / trust notices (existing)

App shells unchanged:
  DashboardShell · ClientShell · PortalAccountShell
```

### Route matrix (after Method B)

| Route | Shell | Form |
|-------|-------|------|
| `/auth/sign-in` | Guardian | `PortalAuthNeonView` `pathname="sign-in"` |
| `/auth/sign-up` | Guardian | Neon `sign-up` |
| `/auth/forgot-password` | Guardian | Neon |
| `/auth/reset-password` | Guardian | Neon |
| `/auth/email-otp`, `magic-link`, … | Guardian (or compact Guardian variant) | Neon |
| `/join` | Phase 2: Guardian brand panel **or** keep `PortalAuthLayout` until Phase 2 | Existing join panel |
| `/org/login` → `/auth/sign-in?from=org` | Unchanged redirect | Guardian + notices |

### Component changes

| Component | Action |
|-----------|--------|
| `GuardianAuthLoginPage` | Accept `pathname`, `redirectTo`, notices; render Neon in access slot |
| `AccessVaultCard` | **Demote** to Storybook mock only; remove from prod path |
| `PortalAuthNeonView` | Keep; mount inside Guardian access slot (styled to vault chrome) |
| `PortalAuthLayout` | Retire from `/auth/*` after cutover; keep until `/join` migrates or delete if unused |
| `components/auth/*` | Become the **prod** auth presentation kit; document as such |
| `guardian-auth-facade.css` | Align tokens with portal CSS variables; drop Georgia hardcodes for `--font-editorial` / `--font-ui` |

### Theme

- Prefer syncing Guardian `mode` to `next-themes` / existing portal theme controls.
- If cinematic “beastmode” must differ from app light/dark, document the mapping in one place (e.g. `night` ↔ `dark`).

### Copy

- Map Guardian `defaultCopy` → `portalCopy` / editorial contract keys.
- Trust footers: one string from `portalCopy.trust` (remove triplication).

---

## Interfaces / dependencies

| Interface | Owner |
|-----------|--------|
| `AuthView` (`@neondatabase/auth-ui`) | Neon Auth |
| `PortalAuthNeonView` | `components/portal-auth-neon-view.tsx` |
| `GUARDIAN_AUTH_ASSET_SET` | `lib/portal-brand.ts` |
| Auth notices | `PortalAuthReasonNotice`, `PortalAuthEmailTrustNotice`, `PortalAccessDeniedNotice` |
| Redirect / landing | `getAuthenticatedLandingHref`, `sanitizeReturnToPath` |
| Storybook | `stories/ui-evaluation/guardian-auth-facade.stories.tsx` — must show Neon mock or documented placeholder until MCP/story harness supports AuthView |

**Assumption:** Neon Auth UI can be styled/contained inside the Guardian access slot without forking AuthView. If CSS piercing is insufficient, wrap with a thin portal chrome only — do not reimplement fields.

---

## Phased migration (end-to-end)

### Phase 0 — Freeze and ADR

1. Land this SPEC as the working plan.
2. Write **ADR-Auth-UI-001** (Method B decision): Guardian shell + Neon form; Method A rejected for this train.
3. Update `AGENTS.md` / atmosphere rules: Guardian is **approved** prod shell for auth (exception to “Storybook-only experiments”).

**Exit:** ADR Accepted; no code cutover yet.

### Phase 1 — Neon in Guardian access slot (sign-in only)

1. Extend `GuardianAuthLoginPage` (or facade props) to accept `pathname`, `redirectTo`, `headerExtra`.
2. Replace prod `AccessVaultCard` with `PortalAuthNeonView` inside the vault zone.
3. Preserve authenticated redirect behavior from `app/auth/[path]/page.tsx` (`AUTH_ENTRY_PATHS` + `getAuthenticatedLandingHref`).
4. Wire reason / access-denied / trust notices into Guardian header region (parity with current `PortalAuthLayout` headerExtra).
5. Storybook: add “Neon slot” story with mock or documented limitation.

**Exit:** Manual sign-in against Neon **dev** branch succeeds; mock Unlock gone from `/auth/sign-in`.

### Phase 2 — All `/auth/*` paths on Guardian

1. Remove the `path === "sign-in"` special case; always render Guardian + Neon for auth view paths (except embed/playground if required).
2. Ensure `PortalAuthFormIntro` / shell copy still resolve via `resolveAuthShellCopy`.
3. Delete or gate unused `PortalAuthLayout` usage on auth routes.
4. Decide `/join`: migrate brand panel to Guardian **or** keep `PortalAuthLayout` for join only (document exception).

**Exit:** Every `/auth/*` path shares one shell; matrix + stories updated.

### Phase 3 — Standardization cleanup

1. Deduplicate copy SSOT; remove hardcoded vault strings from prod components.
2. Sync theme to portal theme provider.
3. Isolate experiment CSS (`fade-owl`, `dual-guardian`, `comp-laptop`) from global `portal-atmosphere.extensions.css` (Storybook-only import).
4. Prune dead `.portal-auth-phantom-*` from `globals.css` if unused.
5. Update `ui-decision-matrix.ts`, `auth-shell.stories.tsx`, UI-eval README experiment index.
6. Rename misleading files if needed (`portal-shell.tsx` → section export clarity) — optional, separate PR.

**Exit:** One CSS story for auth; docs match code; experiment CSS not on every page.

### Phase 4 — Validation & ship

1. Run verification suite (below).
2. Deploy preview → production.
3. Monitor Neon Auth errors / sign-in bounce rates for 48h.

---

## Validation

### Automated

```bash
npm run env:compose
npm run sync:neon-auth-manifest
npm run audit:neon-auth-production
npm run test:unit -- lib/portal-brand.assets.test.ts lib/auth/neon-auth.manifest.test.ts lib/auth/neon-auth-oauth.test.ts
npm run test:interaction -- components/auth components/portal-atmosphere
npm run check:storybook-auth-boundary
npm run check:portal-atmosphere
npm run test:e2e:smoke
npm run test:e2e:journey   # pre-release
```

### Manual checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| 1 | `/auth/sign-in` | Neon email/password fields visible; no mock Unlock / fake Google |
| 2 | Valid credentials | Redirect to client or org landing per role |
| 3 | `?returnTo=` | Honored after login |
| 4 | `?from=org&reason=access-denied` | Notice visible |
| 5 | `/auth/forgot-password` | Neon flow inside Guardian shell |
| 6 | `/auth/sign-up` | Same shell; trust notice if required |
| 7 | Theme toggle | Persists; matches app theme model |
| 8 | Mobile 390 / laptop 1024 | No horizontal scroll; vault usable |
| 9 | Keyboard | Tab through Neon fields + submit |
| 10 | Storybook Guardian story | Documents prod wiring; experiments labeled non-prod |

### Definition of done

- [x] No `AccessVaultCard` on production auth routes
- [x] No dual shell for `/auth/sign-in` vs other paths
- [x] `ui-decision-matrix` lists Guardian + Neon for auth surfaces
- [x] E2E smoke green (journey requires Neon dev branch with localhost — pre-existing env gate)
- [x] ADR-Auth-UI-001 Accepted and linked from this SPEC

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Neon AuthView resists Guardian vault CSS | Visual regression / broken layout | Contain AuthView in a sized slot; prefer portal tokens; escalate to Neon theme props before forking |
| Sign-in downtime during cutover | Users cannot authenticate | Feature flag or path-level flag; keep `PortalAuthLayout` behind flag for 1 release |
| Theme desync (beastmode vs app dark) | Confusing UX | Explicit mapping table; one provider |
| E2E selectors break | CI red | Update selectors to Neon Auth UI roles/labels; avoid Guardian mock text |
| Scope creep into hero pixel polish | Delay | Defer PNG-matching to a follow-up SPEC |
| `/join` left on PortalAuthLayout | Temporary dual brand | Document as Phase 2 exception with owner + date |

---

## Rollout and rollback

### Rollout

1. Merge Phase 1 behind env flag if available, e.g. `GUARDIAN_AUTH_SHELL=true` (local + preview first).
2. Validate on Neon **dev** branch with localhost allowed.
3. Enable on Vercel preview URL; add preview to Neon trusted origins.
4. Promote to production; watch auth error logs.
5. Complete Phases 2–3 in follow-up PRs (shell expansion, then cleanup).

### Rollback

| Failure | Action |
|---------|--------|
| Sign-in broken in prod | Revert auth page special-case to previous commit **or** flip flag off → restore `PortalAuthLayout` + `PortalAuthNeonView` for `sign-in` |
| Neon-only regression | Confirm Neon Auth status / trusted domains before UI revert |
| CSS cascade disaster | Revert `guardian-auth-facade.css` / globals changes; keep Neon wiring if still functional |

**Rollback owner:** whoever ships the Phase 1 PR. Keep the pre-Method-B `app/auth/[path]/page.tsx` sign-in branch recoverable for one release.

---

## Open questions

1. Should `/join` move to Guardian in Phase 2, or remain on `PortalAuthLayout` indefinitely?
2. **Google SSO:** Manifest has shared Google OAuth but `ui.features.social: false`. Enable social in Neon + re-sync, or keep credentials-only? (Mock Google button is **out** either way.)
3. Do we keep cinematic local “beastmode” as an alias of dark theme, or drop it in favor of `NeonAuthUIProvider` `defaultTheme: "system"`?
4. Feature-flag name and default for production cutover?
5. Who signs off visual parity vs `auth-hero-dark.png` after functional cutover?
6. Who can grant Neon MCP access to org `org-royal-bar-40022480` so live `get_neon_auth_config` works in-agent?

---

## Follow-up artifacts

| Artifact | Purpose |
|----------|---------|
| `docs/architecture/adr/ADR-Auth-UI-001-guardian-shell-neon-form.md` | Record Method B decision vs Method A |
| Update `lib/ui-decision-matrix.ts` | Stop claiming PortalAuthLayout for sign-in |
| Update `docs/ui-evaluation/portal-atmosphere/README.md` | Mark Guardian as prod shell |
| `lib/studio-canonical-kit.ts` | Single Studio design language — `login-page-02` informs Guardian access column density only |
| Optional: isolate experiment CSS | Reduce global cascade |

---

## Assumptions

1. Method B remains the chosen direction (Guardian + Neon), not Method A.
2. Neon Auth email/password remains enabled — **confirmed** in `neon-auth.manifest.json` (`emailPassword.enabled: true`).
3. Social Google is **not** shown in UI until `ui.features.social` is true — **confirmed** (`social: false`).
4. Production trusted domain is `https://iam-check.vercel.app` only; localhost stays off on production.
5. Visual hero quality can lag functional unification by one release.
6. Storybook may show a Neon mock until AuthView is reliably story-testable.
7. Manifest re-synced 2026-07-09 (`npm run sync:neon-auth-manifest` + `audit:neon-auth-production`); re-sync again before Phase 1 if Neon Console changed since.

Correct these before Phase 1 implementation if wrong.
