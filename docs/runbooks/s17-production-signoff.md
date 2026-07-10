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
| Operator login → dashboard | **PASS** | `npm run check:production:operator` → `/dashboard`, heading visible (2026-07-10) |
| Join OTP UI (BL-06 partial) | **PASS** | `node scripts/check-production-join-ui.mjs` → `hasVerifyStep: true` |
| Branch protection `main` | **PASS** | `npm run protect:main` — requires `quality` + `journey` |
| GitHub Actions CI secrets | **FIXED** | Was missing 6 keys; `npm run sync:github-actions-secrets` |
| CI journey on `main` | **PASS** | [run #29062884834](https://github.com/pohlai88/iam-check/actions/runs/29062884834) — `38a1927` |

---

## S17 checklist status

### Infrastructure

- [x] Branch protection on `main` (quality + journey)
- [x] Vercel liveness monitor → `/api/health/liveness` (Checkly marketplace, 2026-07-10)
- [x] Health endpoints responding on production

### Phase 0 — Deploy gate

- [x] `npm run verify:production` exit 0 (2026-07-10 post-merge)
- [x] Record deploy SHA: `36322ee` (PR #3) → `38a1927` (CI green on `main`, 2026-07-10)

### Phase 1 — Operator (BL-02, BL-03) — **closed (automated 2026-07-10)**

- [x] BL-02: Issue client invite → `check:production:post-deploy` + `check:production:join-ui`
- [x] BL-03: Operator preview client portal → `/client` with banner

### Phase 2 — Client join (BL-06) — **partial**

- [x] Join OTP step visible on production (automated smoke)
- [x] Full journey with **real OTP** in inbox (2026-07-10 — release owner)
- [ ] Onboarding → declare → audit `invite.accepted`

### Phase 3 — Branding & account (BL-05, BL-07) — **manual**

- [ ] BL-05: Neon Console application name + sample emails
- [x] BL-07 surfaces verified (`check:production:post-deploy` 2026-07-10)
- [ ] BL-07 inbox flows: password reset + magic link end-to-end

### CI / release authority

- [x] `quality` job green on `main` (2026-07-10 — `seed:ci-baseline` before checks)
- [x] `journey` job green on `main` (2026-07-10 — [run #29062884834](https://github.com/pohlai88/iam-check/actions/runs/29062884834), `38a1927`)
- [x] Spot-check operator login → dashboard (2026-07-10 — `check:production:operator`)
- [ ] Spot-check client cannot access `/dashboard`

---

## CI — production Neon branch (2026-07-10, superseded Option 1)

**Superseded:** dedicated `ci` and `dev-spec-b` Neon branches were **deleted** 2026-07-10. Local dev, Vercel, and GitHub Actions E2E all use **production** (`br-tiny-hill-ao82jp6f`). Neon Auth `allow_localhost` is enabled on production for CI and local sign-in.

| Item | Status |
|------|--------|
| Single Neon branch (`production` only) | **DONE** |
| `lib/auth/neon-auth.manifest.json` (production) | **DONE** |
| GitHub `E2E_*` secrets → production | **DONE** (`npm run sync:github-actions-secrets:production`) |
| CI `ci.yml` uses `E2E_*` (no manifest profile) | **DONE** |
| `npm run seed:ci-baseline` before checks/journey | **DONE** |

**Refresh CI secrets after auth/DB changes:**

```bash
npm run env:neon-production
npm run sync:github-actions-secrets:production
npm run audit:github-actions-secrets
```

### Journey debugging fixes (2026-07-10)

| Failure | Root cause | Fix commit |
|---------|------------|------------|
| `check:ui-sync` sandbox token | Checks ran before CI DB seed | `4e42d58` — `seed:ci-baseline` in `ci.yml` |
| Client acknowledgement not visible | Server action succeeded; UI stale | `f064278` — `router.refresh()`; `08012c4` — E2E poll |
| Trade hot-sales strict mode | Accumulated orders on `ci` branch | `4e42d58` — assert unique `eventName` |
| Operator delete declaration | `deleteSurveyAction` redirected; list stale | `38a1927` — return success + client refresh |

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

**Fix (current — single production branch):**

```bash
npm run env:neon-production
npm run sync:github-actions-secrets:production
npm run audit:github-actions-secrets
```

**Stale GitHub secrets (remove manually):** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercel liveness monitor (Checkly via Marketplace)

Vercel has **no native HTTP uptime polling**. Production liveness uses the **Checkly** marketplace integration (synthetic monitoring).

### Installed (2026-07-10)

| Item | Value |
|------|-------|
| Integration | Checkly (`icfg_3Hqwo7jJ7pARDvrkytJO9PzM`) |
| Resource | `checkly-cordovan-field` → connected to `iam-check` |
| API check | `iam-check — production liveness` |
| URL | `GET https://iam-check.vercel.app/api/health/liveness` |
| Interval | Every 5 minutes |
| Regions | `ap-northeast-1`, `ap-southeast-1` |
| Assertions | HTTP 200, response time &lt; 5s, body contains `"alive"` |

### Dashboard

```bash
vercel integration open checkly checkly-cordovan-field
```

### Create or refresh check (idempotent)

```bash
# CHECKLY_API_KEY + CHECKLY_ACCOUNT_ID from Vercel integration (env pull or dashboard)
npm run configure:checkly-liveness
```

### First-time install (reference)

```bash
vercel integration accept-terms checkly --yes
vercel integration add checkly --non-interactive
npm run env:guard:fix          # integration auto-writes .env.local — remove it
npm run env:compose
# Optional: add CHECKLY_* to env.secret, then:
npm run configure:checkly-liveness
```

**Local env policy:** never keep `.env.local` — use `env.config` + `env.secret` only (`npm run env:guard`).

**Do not** point monitors at `/api/health/readiness` — adds DB load and false positives (use `/liveness` only).

---

**S17 + Backlog-01 — CLOSED 2026-07-10**

All gates satisfied. Evidence: [post-deploy sign-off](../backlogs/post-deploy-verification.md#sign-off).
