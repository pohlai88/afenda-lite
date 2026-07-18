# Pre-Login UI/UX Requirements (Neon MCP + Afenda)

**Posture:** Scratch only — not Living / Target / DOC-002. Inventory derived 2026-07-18 from Neon Auth MCP docs + live branch Auth config + [1A-SL-pre-login.md](1A-SL-pre-login.md) (PL-S2 / PL-S3 / PL-S4 / PL-S12).

**Does not:** Change GUIDE-018 Living status, invent I6 READY, or reopen closed PL slices as product work.

## Sources

| Source | Detail |
| ------ | ------ |
| Neon MCP docs | [UI Components](https://neon.com/docs/auth/reference/ui-components.md) · [Next.js Path A](https://neon.com/docs/auth/quick-start/nextjs-api-only.md) · [Password reset](https://neon.com/docs/auth/guides/password-reset.md) · [Organization invitations](https://neon.com/docs/auth/guides/plugins/organization.md) · [Trusted domains](https://neon.com/docs/auth/guides/configure-domains.md) · [Production checklist](https://neon.com/docs/auth/production-checklist.md) |
| Live Auth config | `get_neon_auth_config` — project `young-hat-54755363`, branch `br-tiny-hill-ao82jp6f` (production) |
| Afenda scratch | [1A-SL-pre-login.md](1A-SL-pre-login.md) · [1-pre-login-hitl.md](1-pre-login-hitl.md) |

Living implementation shape (disk): Path A Afenda forms for login/sign-up; Neon `AuthView` for forgot/reset; `AcceptInvitationCard` on `/join`; Auth SDK via `@afenda/auth`.

```text
/ landing → Sign in CTA → /auth/login (Path A)
                         → Forgot password → /auth/forgot-password (AuthView)
                         → email link → /auth/reset-password (AuthView)
                         → optional → /auth/sign-up (Path A)
/join?invitationId → AcceptInvitationCard → Neon Organization plugin
Protected routes → edge gate → /auth/login
```

---

## A. Live Neon Auth config constraints (UI must honor)

| Setting | Live value | UI/UX implication |
| ------- | ---------- | ----------------- |
| Email/password | enabled | Login + sign-up credential fields required |
| `allow_sign_up` | true | Public `/auth/sign-up` surface stays available |
| `verify_email_on_sign_up` | true (method `otp`) | Sign-up may trigger OTP mail; hard block UI not required while `require_email_verification` is false |
| `verify_email_on_sign_in` | false | No OTP gate on every sign-in |
| `require_email_verification` | false | Unverified users can still proceed (no hard block UI) |
| `auto_sign_in_after_verification` | true | After verify/reset success, expect session + redirect |
| OAuth | Google configured | Optional Google button only if product surfaces `social.providers` |
| Email provider | Zoho SMTP `no-reply@nexuscanon.com` / sender **Afenda-LITE** | Recovery/invite emails provider-owned; app must not send mail |
| Trusted origins | `afenda-lite.vercel.app`, `*.vercel.app`, `nexuscanon.com`, `localhost:3000` | Reset/OAuth/verify redirects must land on allowlisted origins |
| `allow_localhost` | true | Local auth UX works; Neon production checklist still recommends disabling for prod hardening |

---

## B. Neon-platform UI/UX requirements

### B1. Auth surface composition

1. **Two Neon-supported UI modes** (Afenda uses both): Path A custom forms (`signIn` / `signUp` / `signOut`) and prebuilt `@neondatabase/auth-ui` (`NeonAuthUIProvider` + `AuthView`).
2. **Provider wrap:** Auth UI children under `NeonAuthUIProvider` with `authClient` ([`auth-ui-provider.tsx`](../../../apps/web/features/auth/auth-ui-provider.tsx)).
3. **Forgot password via UI components:** SDK reset incomplete — use `AuthView` / forgot+reset forms; `credentials.forgotPassword: true`.
4. **Reset link TTL:** 15 minutes — allow re-request after expiry.
5. **Catch-all pattern:** `app/(public)/auth/[path]` + `dynamicParams = false` + static params; Afenda SSOT `/auth/login` (reject `/auth/sign-in`).
6. **BFF:** `/api/auth/[...path]` proxies Neon handler.
7. **Styling:** Import Tailwind **or** CSS bundle — never both ([`neon-auth-ui.css`](../../../apps/web/app/(public)/auth/neon-auth-ui.css) uses Tailwind path).
8. **Invitation accept:** `AuthView` or custom route for accept-invitation; Afenda → `/join` + `AcceptInvitationCard`.
9. **Trusted domains:** missing allowlist → broken redirects (not a form bug).
10. **Safari local:** HTTPS local for third-party cookie testing.

### B2. Neon production checklist (UX-affecting)

- Custom SMTP (Zoho) for reset/verify mail.
- Application name in emails (sender **Afenda-LITE**).
- Email verification optional-but-recommended (live: verify on sign-up OTP).
- OAuth: surface Google only if product elects `social.providers`.
- Disable localhost allowlist when locking production (ops).

---

## C. Afenda Pre-Login UI/UX requirements (PL slices)

### C1. Landing — PL-S2 (`/`)

- Afenda product identity visible; one dominant Sign in → `AUTH_LOGIN_PATH`.
- No post-login chrome; valid headings; `#main-content` + skip link.
- Mobile usable; no CLS; anonymous `200`; no anonymous DB write.

### C2. Auth island — PL-S3 (`/auth/*`)

Routes: login · forgot-password · reset-password · sign-up · sign-out.

- Thin page; typed contract; unsupported → `notFound()`.
- Afenda shell; provider-owned credentials; loading/error/recovery.
- Safe error copy; a11y labels + focus; meaningful titles.
- Neon Auth UI / SDK only through governed boundaries (`@afenda/auth` + island provider).

### C3. Join — PL-S4 (`/join`)

| State | UI behavior |
| ----- | ----------- |
| No `invitationId` | Invitation-required + link to `/auth/login` |
| Valid-shaped ID | `AcceptInvitationCard` handoff |
| Malformed / provider error / expired | Safe recoverable message |
| `/auth/accept-invitation` | `308` → `/join` preserving query |

No invitation-token logging; no `platform_membership` write.

### C4. Gate UX — PL-S5/S6

- Protected → `/auth/login` without chrome flash.
- `/client/login` → canonical login; preview-unavailable anonymous shell only.

### C5. A11y + perf — PL-S12

Surfaces: `/` · `/auth/login` · `/join` · `/403` · `/client/preview-unavailable`.

Skip link, landmarks, headings, labels, error announcement, focus, titles, contrast, reduced-motion, autocomplete, focus-after-error, decorative hidden. No post-login bundles; scoped auth CSS; CWV budgets.

### C6. Journey PASS definitions — PL-S13

- **A** `/` → Sign in → auth island.
- **C** login → Forgot password → recovery shell (provider mail).
- **D** `/join` without ID → invitation-required.
- **F** `/403` public forbidden shell.

---

## D. Consolidated checklist (UI/UX only)

1. Landing brand + one Sign-in CTA to `/auth/login`
2. Auth island shell wraps all public auth paths
3. Path A labeled email/password forms for login + sign-up (pending + safe errors)
4. Neon `AuthView` forgot/reset with `forgotPassword: true` (15-min link re-request)
5. Sign-up OTP verification UX compatible with live `verify_email_on_sign_up: true`
6. Reject `/auth/sign-in`; keep `/auth/login` SSOT
7. Join states: required / card / safe error; accept-invitation alias → `/join`
8. Direct login link from join empty state
9. Anonymous gate redirect without chrome flash
10. Public `/403` + preview-unavailable shells
11. Skip link, landmarks, labels, focus, titles, contrast, reduced-motion
12. No app-side mail UI; Zoho/Neon owns delivery
13. Redirects only to trusted origins (prod + localhost as configured)
14. Scoped auth CSS; no product-module JS on public routes
15. Optional: Google OAuth button only if product surfaces `social.providers` (config already has Google)

---

## E. Section D verify ledger (ui-compose audit)

Audited 2026-07-18 against disk + inventory tests. Product code not changed in this mission.

| # | Requirement | Status | Evidence |
| - | ----------- | ------ | -------- |
| 1 | Landing brand + Sign-in CTA | PASS | [`the-machine-landing`](../../../apps/web/features/landing/the-machine-landing.tsx) · `SignInButton` → `AUTH_LOGIN_PATH`; `public-landing` tests |
| 2 | Auth island shell | PASS | [`auth-island-layout.tsx`](../../../apps/web/features/auth/auth-island-layout.tsx) + [`auth-path-shell.tsx`](../../../apps/web/features/auth/auth-path-shell.tsx) |
| 3 | Path A login/sign-up forms | PASS | [`afenda-sign-in-form.tsx`](../../../apps/web/features/auth/afenda-sign-in-form.tsx) · [`afenda-sign-up-form.tsx`](../../../apps/web/features/auth/afenda-sign-up-form.tsx) — FormField labels, pending, safe Alert/FormError |
| 4 | AuthView forgot/reset + forgotPassword | PASS | `AuthPathShell` renders `AuthView` for forgot/reset; provider `credentials.forgotPassword: true`; sign-in links `AUTH_FORGOT_PASSWORD_PATH` |
| 5 | Sign-up OTP compatible with live config | PASS (compat) | Live: `verify_email_on_sign_up` OTP + `require_email_verification: false` — Path A creates account then redirects; no hard-block OTP step required. Neon still may send OTP mail. Dedicated OTP UI is **not** mounted on Path A (acceptable while require-verification is false). |
| 6 | Reject `/auth/sign-in` | PASS | `dynamicParams = false` · `REJECTED_AUTH_PATH_ALIASES` · auth-paths / auth-surface tests |
| 7 | Join states + alias | PASS | [`join/page.tsx`](../../../apps/web/app/(public)/join/page.tsx) missing/invalid/present; accept-invitation → `/join` |
| 8 | Login link from join empty | PASS | `SignInButton` footer on missing/invalid states |
| 9 | Anonymous gate no chrome flash | PASS | `proxy.ts` + `session-gate-policy` / anonymous-gate smoke (PL-S5 CLOSED) |
| 10 | `/403` + preview-unavailable | PASS | `(public)/403` · client gate preview shell |
| 11 | A11y floor | PASS | Skip link + `#main-content`; FormField labels; focus-after-error; `ux-a11y-i18n-perf-matrix.inventory` · Playwright a11y matrix (PL-S12 CLOSED) |
| 12 | No app SMTP | PASS | No mail UI in features; Zoho via Neon Auth config |
| 13 | Trusted origins | PASS | Live trusted_origins include prod + localhost; `sanitizeCallbackUrl` / navigateSafe on Auth UI |
| 14 | Scoped auth CSS / no product modules | PASS | Route-scoped `neon-auth-ui.css` + `auth-surface.css`; `prelogin-write-isolation` / compose inventory |
| 15 | Google OAuth optional | PASS (omitted by design) | Google configured in Neon; product does **not** pass `social.providers` — no Google button on Path A island (intentional optional omit) |

### Compose / capability note

| Surface | SCALABILITY | Notes |
| ------- | ----------- | ----- |
| Public landing | CAPABLE | Brand landing + barrel `Button asChild` CTA |
| Auth island Path A | CAPABLE / LOCAL_COMPOSITION_PERMITTED | Afenda forms compose `@afenda/ui-system`; Neon owns identity |
| Auth island forgot/reset | PRODUCT GAP closed by Neon UI | `AuthView` required (SDK reset incomplete) — not a ui-system substitute |
| Join | CAPABLE | Message shell + Neon `AcceptInvitationCard` |

### Verify commands (re-run)

```powershell
pnpm --filter @afenda/web test -- public-landing auth-surface client-paths join accept-invitation ux-a11y-i18n-perf-matrix.inventory session-gate-policy
pnpm --filter @afenda/auth test -- auth-paths
```

| Command | Result | When |
| ------- | ------ | ---- |
| `@afenda/web` fragments above | **45 passed** / 6 files | 2026-07-18 |
| `@afenda/auth` `auth-paths` | **9 passed** / 1 file | 2026-07-18 |

### Verdict

**Section D checklist: PASS** for Pre-Login UI/UX inventory close. Residual optional: Path A OTP step UI if/when `require_email_verification` is flipped true; Google button only if product elects OAuth surface.

---

## F. Neon Auth island-fit matrix (chrome promote mission)

Re-read via Neon MCP `get_neon_auth_config` — project `young-hat-54755363`, branch `br-tiny-hill-ao82jp6f` (2026-07-18).

| Neon setting | Live | Island contract | Disposition |
| ------------ | ---- | --------------- | ----------- |
| `email_password.enabled` | true | Path A email/password | KEEP |
| `allow_sign_up` | true | `/auth/sign-up` + provider `signUp` | KEEP |
| `verify_email_on_sign_up` / `otp` | true | No Path A OTP step UI | KEEP while `require_email_verification` false |
| `require_email_verification` | false | No hard-block OTP UI | KEEP false |
| `verify_email_on_sign_in` | false | No sign-in OTP | KEEP |
| `auto_sign_in_after_verification` | true | Reset/verify → session | KEEP |
| Email Zoho SMTP | set · Afenda-LITE | Forgot/reset provider-owned | KEEP (no SMTP rewrite) |
| OAuth Google | configured | UI omits `social.providers` | KEEP in Neon; do not surface; do not remove |
| `trusted_origins` | prod · `*.vercel.app` · nexuscanon · localhost (+ trailing-slash prod dupe) | Callbacks/reset | KEEP; duplicate slash hygiene deferred (needs explicit configure OK) |
| `allow_localhost` | true | Local island | KEEP this mission |

**Configure:** none this mission (matrix KEEP; no user letter for `remove_trusted_origin`).

### Auth island chrome promote (2026-07-18)

- DNA `AFN-DNA-LOGIN-PAGE-CHROME` → `promoted` at `features/auth/auth-surface-chrome.tsx` (split `lg:grid-cols-2`).
- Right rail: `/lynx/afenda-lynx-pixel.png` via `next/image` (`AUTH_ISLAND_BRAND_ART`; asset under `apps/web/public/lynx/`).
- Path A / Neon `AuthView` / join card unchanged as children; Studio OAuth + credential forms stripped.
- Verify: `pnpm validate:neon-env` 15/0 · `pnpm check:ui-system` green · `auth-surface` 11/11 after lynx rail.

### Compose Score: 92% / 100%

| Dimension | Score | Note |
| --------- | ----- | ---- |
| AUTHORITY | 15/15 | Barrel `Card` + route-scoped `auth-surface.css`; no DNA product import |
| CONSISTENCY | 18/20 | Auth eyebrow + form-column density; brand rail decorative (`aria-hidden`) |
| CORRECT-COMPONENT | 20/20 | `Card`/`CardHeader`/`CardTitle`/`CardContent` from `@afenda/ui-system` |
| SUITABILITY | 14/15 | Auth island recipe; Path A + Neon residual correctly slotted |
| SCALABILITY | 15/15 | LOCAL_COMPOSITION_PERMITTED chrome; Neon AuthView residual not compensated |
| STABILITY | 10/15 | Inventory + check:ui-system green; Playwright CWV/a11y not re-run this mission |

**Path to 100%:** Re-run Playwright a11y + public CWV on `/auth/login` · `/join` after chrome promote; optional `remove_trusted_origin` for trailing-slash dupe with explicit ops OK.
