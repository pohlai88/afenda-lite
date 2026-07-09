# SPEC-B — local & preview environment guidelines

**Audience:** developers validating Guardian Auth shell + Neon Auth  
**Authority:** [SPEC-B](../architecture/specs/SPEC-B-guardian-auth-canonical-refactor.md) · [ADR-Auth-UI-001](../architecture/adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) · [local-dev-auth.md](./local-dev-auth.md)

Use this runbook so local and preview auth work without missing Neon branch, compose, migrate, or Vercel flag steps.

---

## TL;DR — use the wrapper

| Goal | Command |
|------|---------|
| **Full local ready** (diagnose → repair → migrate) | `npm run bootstrap:spec-b` |
| Auto-repair drift only | `npm run bootstrap:spec-b:repair` |
| Same + seed admin/preview client | `npm run bootstrap:spec-b:seed` |
| Same + seed + start `next dev` | `npm run dev:spec-b` |
| Verify only (no writes) | `npm run bootstrap:spec-b:check` |
| Install **pre-push** hook (runs before GitHub push) | `npm run hooks:install` |
| Env switch only (no migrate) | `npm run env:local-spec-b` |

Prefer the **named scripts** above. Extra flags via `npm run bootstrap:spec-b -- --seed` can be dropped by some npm versions on Windows.

Do **not** hand-edit `.env`. Edit `env.config` / `env.secret`, then compose — or let the bootstrap do it.

---

## Auto-repair

`bootstrap:spec-b` always **diagnoses** first. If anything is wrong, it **repairs** automatically:

| Drift | Repair |
|-------|--------|
| Wrong / missing `NEON_BRANCH_ID` | Rewrite to `dev-spec-b` |
| Wrong auth base URL | Point at `dev-spec-b` Neon Auth host |
| `GUARDIAN_AUTH_SHELL` off / missing | Set `true` |
| Stale / missing `DATABASE_URL` | Fetch pooler URI via `NEON_API_KEY` |
| `.neon` mismatch | Rewrite branch metadata |
| Stale `.env` | `env:compose` |

Flow: **diagnose → repair (if needed) → verify (fail closed) → migrate / seed / dev**.

| Mode | Behavior |
|------|----------|
| `bootstrap:spec-b` | Full refresh (always re-applies pooler URL) + migrate |
| `bootstrap:spec-b:repair` | Diagnose + fix drift only (no migrate) |
| `bootstrap:spec-b:check` | Report only — exit 1 if drifted |
| `bootstrap:spec-b:pre-push` | Repair only when drifted, then verify (used by git hook) |

---

## Trigger before GitHub push

Bootstrap does **not** run on GitHub Actions (CI already has secrets). It runs **locally before push** so your machine is healthy before the remote build.

```bash
npm run hooks:install          # once per clone (also runs on npm install via postinstall)
git push                       # → pre-push runs bootstrap:spec-b:pre-push
git push --no-verify           # skip once
```

What pre-push does:

1. Diagnose local SPEC-B env  
2. Auto-repair if drifted  
3. Soft-validate Neon API  
4. Block the push if repair cannot fix issues  

It does **not** migrate or seed on every push (keeps pushes fast).

---

## Why a wrapper

Manual setup has easy-to-miss steps:

1. Point at **dev-spec-b** (not production) — localhost allowed only there  
2. Refresh **DATABASE_URL** for that branch  
3. Set **GUARDIAN_AUTH_SHELL=true**  
4. **`npm run env:compose`** (`.env` is generated)  
5. Align **`.neon`** with `NEON_BRANCH_ID`  
6. **`db:migrate`** on a fresh branch  
7. Optional **seed** if no users exist yet  

`npm run bootstrap:spec-b` runs those in order, **auto-repairs drift**, and **fails closed** if verification still fails.

---

## Surfaces & URLs

| Surface | URL | Neon branch |
|---------|-----|-------------|
| **Production** | https://iam-check.vercel.app/auth/sign-in | `production` |
| **Local** | http://localhost:3000/auth/sign-in | `dev-spec-b` |
| **Vercel preview** | `https://iam-check-<hash>-jacks-projects-7b3cfe94.vercel.app` | usually production Neon (Vercel env) |

---

## Neon branches (iam-check / `young-hat-54755363`)

| Branch | ID | Localhost | Use |
|--------|-----|-----------|-----|
| `production` | `br-tiny-hill-ao82jp6f` | **Off** (cutover) | Vercel Production |
| `dev-spec-b` | `br-super-hill-aojc9a4p` | **On** | Local `npm run dev` / SPEC-B |

**Never** enable localhost on production for day-to-day work. Local always uses `dev-spec-b` via the bootstrap.

Trusted origins on production Neon Auth include:

- `https://iam-check.vercel.app`
- `https://*.vercel.app` (preview deploys)

---

## Local workflow (canonical)

### First time / after switching away from prod branch

```bash
npm run dev:spec-b
```

What that does:

| Step | Action |
|------|--------|
| 1 | `apply-local-dev-spec-b-env.mjs` → `env.config`, `env.secret`, `.neon` → `dev-spec-b` + `GUARDIAN_AUTH_SHELL=true` |
| 2 | `env:compose` → regenerates `.env` |
| 3 | `validate:neon-env` (optional soft-fail) |
| 4 | Verify branch IDs, auth URL, Guardian flag |
| 5 | `db:migrate` |
| 6 | `--seed` → `seed:admin` + `seed:preview-client` |
| 7 | `--dev` → `npm run dev` |

Open http://localhost:3000/auth/sign-in — Guardian shell with Neon AuthView in the access slot.

### Day-to-day (already bootstrapped)

```bash
npm run bootstrap:spec-b:check   # optional sanity
npm run dev
```

`npm run dev` already runs `env:compose` first.

### Credentials

Use accounts seeded on **dev-spec-b** (`SHARED_ADMIN_*` / `PREVIEW_CLIENT_*` from `env.secret`). Production passwords do not apply unless you copied that branch’s auth store.

`APP_URL` stays `https://iam-check.vercel.app` — org invite emails still use production links (by design).

---

## What the apply script writes

| File | Keys / content |
|------|----------------|
| `env.config` | `NEON_AUTH_BASE_URL`, `NEON_BRANCH_ID`, `GUARDIAN_AUTH_SHELL=true` |
| `env.secret` | `DATABASE_URL` (pooler via `NEON_API_KEY`) |
| `.neon` | `dev-spec-b` project/branch metadata |

Requires `NEON_API_KEY` in `env.secret` for automatic `DATABASE_URL`. Without it, set the pooler URI for `dev-spec-b` manually, then re-run compose.

---

## Vercel preview & production flags

| Variable | Value | Environments |
|----------|--------|--------------|
| `GUARDIAN_AUTH_SHELL` | `true` | Production ✅ · Development ✅ |
| `GUARDIAN_AUTH_SHELL` | `true` | **Preview** — set in Dashboard or from a **non-`main`** branch |

CLI note: when `main` is the production git branch, `vercel env add … preview` may require a feature branch or the Dashboard Preview checkbox.

```bash
# From a feature branch (not main):
vercel env add GUARDIAN_AUTH_SHELL preview --value true --yes
```

After changing env vars, **redeploy** (preview PR or `vercel deploy --prod --yes`).

Preview deploys use Vercel’s Neon credentials (typically production) unless you override `DATABASE_URL` / `NEON_AUTH_BASE_URL` on Preview only. Auth CSRF works because production Neon trusts `https://*.vercel.app`.

**Code vs env:** Guardian UI only appears after SPEC-B code is deployed. Env alone does not change an old deploy’s shell.

---

## Verify checklist

### Local

- [ ] `npm run bootstrap:spec-b:check` passes  
- [ ] Sign-in page shows Guardian layout + Neon email/password  
- [ ] No “invalid domain” / CSRF origin error  
- [ ] Theme toggle syncs night/day with portal theme  

### Auth / Neon (production manifest)

```bash
# Point NEON_BRANCH_ID at production first if you were on dev-spec-b
npm run sync:neon-auth-manifest
npm run audit:neon-auth-production
```

Manifest SSOT is the **production** branch — do not commit a manifest synced from `dev-spec-b` as production truth.

### Smoke

```bash
npm run test:e2e:smoke
```

Journey E2E needs credentials that exist on the Neon branch your `.env` points at.

---

## Rollback

| Layer | Action |
|-------|--------|
| Auth shell | `GUARDIAN_AUTH_SHELL=false` in `env.config` → `npm run env:compose` (or Vercel env → redeploy) |
| Local Neon | Re-point `env.config` / `env.secret` / `.neon` at `production` branch IDs, then compose |
| Preview | Remove stale deploy origins from Neon trusted domains if needed |

---

## npm command map

| Script | Purpose |
|--------|---------|
| `bootstrap:spec-b` | Diagnose → repair → migrate |
| `bootstrap:spec-b:repair` | Diagnose → auto-repair only |
| `bootstrap:spec-b:seed` | Same as bootstrap + admin/preview seeds |
| `bootstrap:spec-b:check` | Diagnose only — no writes |
| `bootstrap:spec-b:pre-push` | Repair-if-needed + verify (git hook) |
| `hooks:install` / `postinstall` | Install `.git/hooks/pre-push` |
| `dev:spec-b` | Bootstrap + seed + `next dev` |
| `env:local-spec-b` | Apply + compose only |
| `env:compose` | Regenerate `.env` |
| `validate:neon-env` | Align `.neon` / config / API (any branch) |
| `db:migrate` | Schema on current `DATABASE_URL` |
| `seed:admin` / `seed:preview-client` | Local users on current branch |
| `sync:neon-auth-manifest` | Refresh tracked production auth snapshot |
| `audit:neon-auth-production` | Production checklist |

---

## Anti-patterns (do not)

- Edit `.env` by hand  
- Run `vercel env pull` (blocked — redacts secrets)  
- Enable localhost on **production** Neon for convenience  
- Sync Neon auth **manifest** while `NEON_BRANCH_ID` still points at `dev-spec-b` and commit it as production  
- Expect production Vercel to show Guardian before SPEC-B is pushed and redeployed  
- Use `/playground` as a client product path (local harness only)

---

## Related

- [AGENTS.md](../../AGENTS.md) — env compose, Neon Auth, Guardian prod exception  
- [local-dev-auth.md](./local-dev-auth.md) — Option A generic `dev-*` workflow  
- [SPEC-B](../architecture/specs/SPEC-B-guardian-auth-canonical-refactor.md)  
- Scripts: `scripts/bootstrap-spec-b-local.mjs`, `scripts/apply-local-dev-spec-b-env.mjs`
