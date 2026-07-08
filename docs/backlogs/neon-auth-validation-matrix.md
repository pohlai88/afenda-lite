# Neon Auth validation matrix (live ↔ manifest ↔ UI)

**Purpose:** Single reference for builders — what Neon Auth is configured to do, what the repo records, and what users see.  
**Live authority:** MCP `plugin-neon-postgres-neon` → `get_neon_auth_config` (Cursor `setup-neon-auth` may 404).  
**Last validated:** 2026-07-08 via MCP + manifest sync.

**Branch:** `production` (`br-tiny-hill-ao82jp6f`) · **Project:** `iam-check` (`young-hat-54755363`)

---

## How to re-validate

```bash
# 1. Live config (MCP or Neon Console)
#    plugin-neon-postgres-neon → get_neon_auth_config

# 2. Materialize repo snapshot
npm run sync:neon-auth-manifest

# 3. Checklist vs manifest
npm run audit:neon-auth-production

# 4. Env ↔ manifest parity
npm run test:unit -- lib/auth/neon-auth.manifest.test.ts
```

**Rule:** If MCP and manifest disagree after sync, treat **MCP as live truth** and fix sync script or re-run sync with correct `NEON_API_KEY` org access.

---

## Integration

| Field | Live (MCP) | Manifest | UI / env |
| --- | --- | --- | --- |
| Base URL | `https://ep-dawn-bird-aofi3f7j.neonauth.../auth` | Same | `NEON_AUTH_BASE_URL` |
| JWKS | Same branch endpoint | Same | Session validation |
| Provider | `better_auth` | `better_auth` | `@neondatabase/auth` |

---

## Trusted origins & localhost

| Field | Live (MCP) | Manifest (post-sync) | UI impact |
| --- | --- | --- | --- |
| Trusted origins | `https://iam-check.vercel.app` | Same | `useNeonAuthUiBaseUrl()` = client origin; server invites use `APP_URL` |
| `allow_localhost` | `false` | Must be `false` after sync | Local `http://localhost:3000` **rejected** on this branch → see BL-09 |

---

## Email / password

| Branch setting | Live | Manifest `ui.features` | User-facing surface |
| --- | --- | --- | --- |
| Enabled | yes | credentials | `/auth/sign-in`, `/org/login` |
| Sign-up allowed | yes | `signUp: true` | `/auth/sign-up`, `/join` step 1 |
| Verify at sign-up (OTP) | yes | `emailOTP`, `emailVerification` | OTP trust notice on sign-up / email-otp |
| Require verification to sign in | **no** | — | `/join` flow not blocked |
| Forgot password | auto | `credentials.forgotPassword` | `/auth/forgot-password`, **link** trust copy |

---

## Email provider

| Setting | Live | Manifest | UX |
| --- | --- | --- | --- |
| Type | `shared` | `shared` | No custom SMTP |
| From address | `auth@mail.myneon.app` | Same | Delivery banner + trust notices |
| From display name | `Neon Auth` | Same | **Differs from** in-app `PORTAL_NAME` → BL-05 |

---

## Plugins

| Plugin | Live | Manifest | UI feature | Primary route |
| --- | --- | --- | --- | --- |
| Organization | on, invite email on | on | `organization: true` | `/join`, operator invite (server) |
| Magic link | on, 15 min, no sign-up | on | `magicLink: true` | `/auth/magic-link` |
| Phone | off | not in UI | — | N/A |

---

## OAuth

| Setting | Live | Manifest | UI |
| --- | --- | --- | --- |
| Google (shared) | on branch | listed | `social: false` — **intentionally hidden** |

---

## NeonAuthUIProvider props (must match manifest `ui.features`)

| Prop | Manifest source | Wired in `PortalAuthProvider` |
| --- | --- | --- |
| `signUp` | `ui.features.signUp` | yes |
| `organization` | `ui.features.organization` | yes |
| `emailOTP` | `ui.features.emailOTP` | yes |
| `emailVerification` | `ui.features.emailVerification` | yes |
| `magicLink` | `ui.features.magicLink` | yes |
| `credentials.forgotPassword` | `ui.features.credentials` | yes |
| `social` | off → omitted | yes |
| `changeEmail` | always false | yes |
| `account.fields` | `["name"]` | yes |
| `basePath` / account base | `/auth`, `/account` | yes |

---

## AuthView paths (SDK) → portal coverage

| Path | Route | Trust notice | In UI registry |
| --- | --- | --- | --- |
| sign-in | `/auth/sign-in` | org/client reason | yes |
| sign-up | `/auth/sign-up` | OTP | yes |
| forgot-password | `/auth/forgot-password` | link | yes |
| reset-password | `/auth/reset-password` | link | yes |
| email-otp | `/auth/email-otp` | OTP | yes |
| magic-link | `/auth/magic-link` | link | yes |
| accept-invitation | `/auth/accept-invitation` | org email | yes (redirect → `/join` when `invitationId` present) |
| org-login | `/auth/sign-in?from=org` | org access denied | yes |
| client-join | `/join?invitationId=` | org email | yes |
| sign-out | `/auth/sign-out` | — | yes |
| callback | `/auth/callback` | — | inactive (social off) |
| two-factor | `/auth/two-factor` | — | N/A (feature off) |
| recover-account | `/auth/recover-account` | — | N/A (feature off) |

**Client entry:** `/join?invitationId=` — canonical; not optional. Registry: `client-join` in `lib/ui-decision-matrix.ts` (BL-08 closed).

**Email branding (BL-05):** `neonAuthUiApplicationName` exports `PORTAL_NAME` for docs/copy only — `NeonAuthUIProvider` has no `applicationName` prop; set display name in Neon Console → Auth → Configuration.

---

## AccountView paths (SDK) → portal exposure

| Path | Exposed | Route |
| --- | --- | --- |
| settings | yes | `/account/settings` |
| security | yes | `/account/security` |
| teams, api-keys, organizations | **no** | product policy |

---

## Server-side org invite (operator email)

| Step | Implementation | Must hold |
| --- | --- | --- |
| Ensure org | `auth.organization.*` SDK | Active org in session |
| Invite member | `neonAuthServerFetch("organization/invite-member")` | Cookie: `__Secure-neon-auth.*` only; header: `x-neon-auth-proxy: nextjs`; Origin: `APP_URL` |
| Audit | `invite.issued` + `emailSent`, `neonAuthStatus` on failure | Traceable |

**Do not** pre-create users at invite (`ensureClientAuthUser` removed).

---

## Known sync pitfalls (accurate implementation)

| Pitfall | Symptom | Fix |
| --- | --- | --- |
| CLI `allow_localhost` missing | Manifest shows `allowLocalhost: true` while live is false | Fixed: `resolveAllowLocalhost()` infers from trusted domains |
| Cursor `setup-neon-auth` 404 | No guided setup | MCP `get_neon_auth_config` + `sync:neon-auth-manifest` |
| Audit reads manifest only | Stale checklist after Console change | Sync manifest first |
| Wrong invite proxy header | 401 on operator invite | Use SDK-aligned `x-neon-auth-proxy` + filtered cookies |

---

## Backlog cross-reference

| Matrix area | Backlog slice |
| --- | --- |
| Sync & audit | [BL-01](./slices/bl-01-config-truth-audit.md) |
| Operator invite email | [BL-02](./slices/bl-02-operator-invite-email.md) |
| Preview impersonation | [BL-03](./slices/bl-03-operator-client-preview.md) |
| Production cutover | [BL-04](./slices/bl-04-production-cutover.md) |
| Email branding | [BL-05](./slices/bl-05-auth-email-branding.md) |
| Client `/join` journey | [BL-06](./slices/bl-06-client-join-journey.md) |
| Account self-service | [BL-07](./slices/bl-07-account-self-service.md) |
| Surface registry | [BL-08](./slices/bl-08-surface-registry.md) |
| Local dev strategy | [BL-09](./slices/bl-09-local-dev-auth.md) |
