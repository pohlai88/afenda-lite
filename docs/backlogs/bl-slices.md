# Backlog-01 — Slice context (BL-01 … BL-09)

**Master backlog:** [backlog-01-neon-auth-closure.md](./backlog-01-neon-auth-closure.md)  
**Status board:** [TRACKING.md](../TRACKING.md)  
**Prod checklists:** [post-deploy-verification.md](./post-deploy-verification.md) only — do not duplicate steps here.

Each section: problem, key files, verify anchor. Checkboxes and deploy steps live in post-deploy.

---

## BL-01 — Configuration truth & audit {#bl-01}

**Priority:** P0 · **Journeys:** J8 · **Status:** Closed

**Problem:** Live Neon Auth, materialized manifest, and UI flags can drift — audits read manifest, not MCP.

**Key workflow:** MCP `get_neon_auth_config` → `npm run sync:neon-auth-manifest` → `npm run audit:neon-auth-production` → [validation matrix](./neon-auth-validation-matrix.md).

**Files:** `lib/auth/neon-auth.manifest.json`, `scripts/sync-neon-auth-manifest.mjs`, `scripts/lib/neon-auth-manifest-build.mjs`, `lib/auth/neon-auth-ui.config.ts`.

**Do:** Sync after every Console change; commit manifest when `syncedAt` changes. **Don't:** Edit `.env` by hand; trust audit without same-day sync.

---

## BL-02 — Operator client invitation email {#bl-02}

**Priority:** P0 · **Journeys:** J1 · **Depends:** BL-01 · **Status:** Code complete → [verify](./post-deploy-verification.md#bl-02--operator-client-invitation-email-j1)

**Problem:** Org invite returned 401 — wrong proxy header and cookie forwarding on server fetch.

**Fix:** `lib/auth/neon-auth-request.ts` — `x-neon-auth-proxy`, Neon auth cookies only, `APP_URL` Origin. Flow: `lib/portal-organization.ts` → `lib/email/send-client-onboarding-email.ts` → `app/actions/client.ts` audit.

**Reference script:** `scripts/live-org-invite.mjs`. **Canonical client URL:** `/join?invitationId=…`.

**Don't:** Pre-create Neon users at invite; use MailerSend for org invites.

---

## BL-03 — Operator client portal preview {#bl-03}

**Priority:** P1 · **Journeys:** J6 · **Depends:** BL-01 · **Status:** Code complete → [verify](./post-deploy-verification.md#bl-03--operator-client-portal-preview-j6)

**Problem:** Preview failed with `session_mismatch` — operator identity persisted after impersonation.

**Files:** `app/actions/admin.ts` (`startClientPreviewAction`, `exitClientPreviewAction`), `lib/preview-client.ts`, `components/portal-preview-banner.tsx`.

**Spec:** [s16-admin-client-preview.md](../architecture/slices/s16-admin-client-preview.md). **Seed:** `npm run seed:preview-client`.

**Don't:** Treat `/playground` iframe as production client flow.

---

## BL-04 — Production auth cutover {#bl-04}

**Priority:** P1 · **Journeys:** J8 · **Depends:** BL-01 · **Status:** Closed on branch

**Problem:** Production must trust only `APP_URL`; manifest lagged behind live `allow_localhost: false`.

**Live:** `allow_localhost: false`, trusted origins = production URL only. **Pair with BL-09** for local dev without re-opening production localhost.

**Verify:** `npm run audit:neon-auth-production` item 6; MCP cross-check.

---

## BL-05 — Auth email branding {#bl-05}

**Priority:** P2 · **Journeys:** J1–J4 · **Depends:** BL-04 · **Status:** Neon Console manual → [verify](./post-deploy-verification.md#bl-05--email-branding-console-not-deploy)

**Problem:** Inbox may show “Neon Auth” while UI says “Client Declaration Portal”.

**Action:** Neon Console → Auth → Application Name = product name. Shared sender stays `auth@mail.myneon.app`.

**Don't:** Custom SMTP for display name only; promise custom from-address on shared provider.

---

## BL-06 — Client invitation join journey {#bl-06}

**Priority:** P0 · **Journeys:** J2, J4 · **Depends:** BL-02 · **Status:** Code complete → [verify](./post-deploy-verification.md#phase-2--client-invitation-join-bl-06)

**Problem:** Multi-step join (invite → register → OTP → accept org → onboarding) breaks easily across plugins and redirects.

| Requirement | Implementation |
| --- | --- |
| Canonical `/join?invitationId=` | `app/join/page.tsx`, `lib/client-invitation-entry.ts` |
| Auth step machine | `lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts` |
| Join UI | `components/portal-invitation-join-page.tsx`, `portal-invitation-join-panel.tsx`, `guardian-invitation-join-page.tsx` |
| Legacy redirect | `app/auth/[path]/page.tsx` → `/join` |

**Spec:** [s6-client-identity.md](../architecture/slices/s6-client-identity.md). **Runbook:** [client-invitation-sign-in-journey.md](../runbooks/client-invitation-sign-in-journey.md).

**Don't:** Require email verification before first sign-in; send clients to operator dashboard.

---

## BL-07 — Account & credential self-service {#bl-07}

**Priority:** P2 · **Journeys:** J3, J5, J7 · **Depends:** BL-01 · **Status:** Code complete → [verify](./post-deploy-verification.md#bl-07--account--credential-self-service-j3-j5-j7)

**Problem:** Users need reset, magic link, name, and password change without org-admin or email-change surfaces.

**Files:** `app/auth/[path]/page.tsx`, `app/account/[path]/page.tsx`, `PORTAL_ACCOUNT_PATHS` (settings + security only), `lib/auth/neon-auth.manifest.test.ts`.

**Policy:** Link copy on reset (not OTP); magic link existing users only; `changeEmail: false`. Use Neon Auth UI forms — not SDK `resetPasswordForEmail`.

---

## BL-08 — Auth surface registry {#bl-08}

**Priority:** P2 · **Journeys:** J8 · **Depends:** BL-01 · **Status:** Closed

**Problem:** Auth routes (`/join`, email-otp, magic-link) were missing from UI surface registry.

**Registry:** `lib/ui-decision-matrix.ts`, `lib/portal-reliance-registry.ts`. **Gate:** `npm run evaluate:ui-matrix` (43 surfaces).

Surfaces added: `client-join`, `auth-email-otp`, `auth-magic-link`, `auth-accept-invitation`, `org-login`.

---

## BL-09 — Local development auth {#bl-09}

**Priority:** P1 · **Journeys:** J8 (dev) · **Depends:** BL-04 · **Status:** Closed

**Problem:** Production branch no longer trusts localhost — developers need an explicit branch strategy.

**Decision (Option A):** Feature dev branches with `neon neon-auth domain allow-localhost` on **dev branch only**; production stays hardened.

**Docs:** [AGENTS.md](../AGENTS.md) · [local-dev-auth.md](../runbooks/local-dev-auth.md) · [spec-b-local-preview-env.md](../runbooks/spec-b-local-preview-env.md).

**Don't:** Re-enable localhost on production; use production DB for destructive experiments.
