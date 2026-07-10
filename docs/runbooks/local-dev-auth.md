# Local development auth (Neon)

**Audience:** developers  
**Purpose:** Sign in locally against the **production** Neon branch — single-branch policy, no branch switching.

---

## Quick start

```bash
npm run env:neon-production   # align env.config, env.secret, .neon → production
npm run env:compose
npm run dev                   # http://localhost:3000
```

Optional first-time setup on a fresh machine:

```bash
npm run db:migrate
npm run seed:admin
npm run seed:preview-client
```

---

## Branch policy

| Surface | Neon branch | Localhost auth |
|---------|-------------|----------------|
| Local `npm run dev` | `production` (`br-tiny-hill-ao82jp6f`) | Enabled on Neon Auth |
| Vercel production | `production` | Off (trusted origins only) |
| GitHub Actions E2E | `production` (`E2E_*` secrets) | `APP_URL=http://localhost:3000` in CI |

There is **no** separate dev or CI Neon branch. If env drifts, run `npm run env:neon-production` again.

---

## Verify sign-in

1. Open `http://localhost:3000/auth/sign-in`.
2. Sign in with `SHARED_ADMIN_*` or `PREVIEW_CLIENT_*` from `env.secret` (seeded on production).
3. Pass: session loads; no **invalid domain** or CSRF origin error.

Optional: `npm run validate:neon-env` — confirms `.neon`, `env.config`, and Neon API access align.

---

## Expectations

- **`APP_URL`** in `env.config` stays the production URL. Org-invite emails from local server actions still link to production — by design (`lib/auth/neon-auth-request.ts`).
- **Auth manifest:** `npm run sync:neon-auth-manifest` refreshes `lib/auth/neon-auth.manifest.json` from production.
- **GitHub CI secrets:** `npm run sync:github-actions-secrets:production` after env or auth URL changes.

---

## Related

- [AGENTS.md](../../AGENTS.md) — Neon Auth · Local development auth
- [neon-auth-validation-matrix.md](../backlogs/neon-auth-validation-matrix.md) — production checklist
