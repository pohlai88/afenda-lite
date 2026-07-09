# S17 — Production sign-off evidence log

| Field | Value |
|-------|-------|
| **Date** | 2026-07-10 |
| **Production URL** | https://iam-check.vercel.app |
| **Checklist** | [post-deploy-verification.md](../backlogs/post-deploy-verification.md) |
| **Human summary** | [HUMAN-CHECKLIST.md](../HUMAN-CHECKLIST.md) |

---

## Automated evidence (2026-07-10)

| Check | Result | Command / source |
|-------|--------|------------------|
| Liveness | **PASS** | `GET /api/health/liveness` → `status: alive` |
| Readiness | **PASS** | `GET /api/health/readiness` → `status: ready` |
| Production probe | **PASS** | `npm run verify:production` exit 0 |
| Join OTP UI (BL-06 partial) | **PASS** | `node scripts/check-production-join-ui.mjs` → `hasVerifyStep: true` |
| Branch protection `main` | **PASS** | `npm run protect:main` — requires `quality` + `journey` |
| GitHub Actions CI secrets | **FIXED** | Was missing 6 keys; `npm run sync:github-actions-secrets` |
| CI journey on `main` | **PENDING** | Re-run after push; prior failures: empty `NEON_AUTH_*` secrets |

---

## S17 checklist status

### Infrastructure

- [x] Branch protection on `main` (quality + journey)
- [ ] Vercel uptime monitor → `/api/health/liveness` (**manual** — Vercel Dashboard → Project → Monitoring)
- [x] Health endpoints responding on production

### Phase 0 — Deploy gate

- [x] `npm run verify:production` exit 0
- [ ] Record deploy SHA after next promotion: _______________

### Phase 1 — Operator (BL-02, BL-03) — **manual**

- [ ] BL-02: Issue client invite → email arrives → `/join?invitationId=…`
- [ ] BL-03: Operator preview client portal → `/client` with banner

### Phase 2 — Client join (BL-06) — **partial**

- [x] Join OTP step visible on production (automated smoke)
- [ ] Full journey with **real OTP** in inbox (not script-only)
- [ ] Onboarding → declare → audit `invite.accepted`

### Phase 3 — Branding & account (BL-05, BL-07) — **manual**

- [ ] BL-05: Neon Console application name + sample emails
- [ ] BL-07: Password reset, magic link, `/account/settings`, `/account/security`

### CI / release authority

- [ ] `quality` job green on `main` (after secrets sync + push)
- [ ] `journey` job green on `main`
- [ ] Spot-check operator login → dashboard
- [ ] Spot-check client cannot access `/dashboard`

---

## Root cause — CI failures (resolved 2026-07-10)

GitHub Actions had **6 missing secrets**:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `PREVIEW_CLIENT_EMAIL`
- `PREVIEW_CLIENT_PASSWORD`
- `E2E_SURVEY_SLUG`
- `E2E_INVITE_TOKEN`

Build failed with `Invalid server environment` during `next build`. Journey job never reached Playwright.

**Fix:**

```bash
# Local dev env is dev-spec-b — use production profile for CI:
$env:CI_PRODUCTION_DATABASE_URL="<production pooler URL from Neon Console>"
npm run sync:github-actions-secrets:production

# Or align env.config + env.secret to production branch first, then:
npm run sync:github-actions-secrets:production
```

**Do not** use `npm run sync:github-actions-secrets` alone when `env.config` points at `dev-spec-b` — it overwrites GitHub with dev Neon Auth and breaks manifest validation.

**Stale GitHub secrets (remove manually):** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercel liveness monitor (manual setup)

1. Vercel Dashboard → **iam-check** project → **Monitoring** (or Integrations → Uptime)
2. Create HTTP check: `GET https://iam-check.vercel.app/api/health/liveness`
3. Expect 200 and body contains `"alive"`
4. Alert channel: email or Slack per team policy

---

## Sign-off gate

**S17 + Backlog-01 close when:**

1. All manual Phase 1–3 boxes checked above
2. CI `quality` + `journey` green on `main`
3. Vercel monitor configured
4. Update [TRACKING.md](../TRACKING.md) and [HUMAN-CHECKLIST.md](../HUMAN-CHECKLIST.md)
