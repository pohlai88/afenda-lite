# Local development auth (Neon)

**Audience:** developers  
**Purpose:** Sign in locally after production auth hardening (`allow_localhost: false` on the production branch).

**Decision:** **Option A** — dedicated dev Neon branch with localhost allowed. Never enable localhost on production.

Runbook cross-links: [preview-branch-setup.md](./preview-branch-setup.md) (CI/preview branch topology) · [BL-09](../backlogs/slices/bl-09-local-dev-auth.md)

---

## Branch roles

| Branch | Localhost | Local `npm run dev` |
|--------|-----------|---------------------|
| `production` | **Off** | Do not use |
| `preview` | On (Vercel preview / CI) | Optional; see preview runbook |
| `dev-*` | **On** (per branch) | **Default for feature work** |

Each Neon branch has its own `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and auth user store.

---

## Setup (first time or new feature)

### 1. Link and checkout a dev branch

```bash
neon link                              # once per workspace
neon checkout dev-<feature-name>       # e.g. dev-add-invite-banner
```

`checkout` updates `.neon` only. This repo composes env from `env.config` + `env.secret` — not from Neon’s auto-pulled `.env`.

### 2. Point local env at the dev branch

From Neon Console (branch **dev-…** → Connection details / Auth) or CLI:

```bash
neon neon-auth status -o json
```

Update gitignored files:

| File | Keys |
|------|------|
| `env.secret` | `DATABASE_URL` (pooler URI for the dev branch) |
| `env.config` | `NEON_AUTH_BASE_URL`, `NEON_BRANCH_ID` |

Ensure `.neon` `branchId` matches `NEON_BRANCH_ID` in `env.config`.

### 3. Allow localhost on the dev branch only

With `.neon` pointing at your dev branch:

```bash
neon neon-auth domain allow-localhost
neon neon-auth domain list
```

Confirm `allow_localhost` is enabled on **this** branch. Do **not** run this against production.

### 4. Compose env and seed (if fresh branch)

```bash
npm run env:compose
npm run db:migrate
npm run seed:admin          # optional: local operator credentials
npm run dev
```

---

## Verify sign-in

1. Open `http://localhost:3000/auth/sign-in`.
2. Sign in with credentials seeded on the **dev** branch (not production operators unless you copied data).
3. Pass: session loads; no **invalid domain** or CSRF origin error.

Optional: `npm run validate:neon-env` — confirms `.neon`, `env.config`, and Neon API access align.

---

## Expectations

- **`APP_URL`** in `env.config` stays the production URL. Org-invite emails from local server actions still link to production — by design (`lib/auth/neon-auth-request.ts`).
- **Production cutover** scripts (`npm run configure:neon-auth-production -- --disable-localhost`) target whatever branch `NEON_BRANCH_ID` points at — never point local env at production when running those commands.
- **Auth config changes** on a dev branch: run `npm run sync:neon-auth-manifest` only when updating the tracked production manifest; dev branches are not the manifest source of truth.

---

## Related

- [AGENTS.md](../../AGENTS.md) — Neon Auth · Local development auth
- [preview-branch-setup.md](./preview-branch-setup.md) — preview branch for Vercel/CI (not the same as personal `dev-*` branches)
- [neon-auth-validation-matrix.md](../backlogs/neon-auth-validation-matrix.md) — production branch audit (not duplicated here)
