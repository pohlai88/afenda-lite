# URL + origin contract (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tenancy/urls.md` |
| Authority | **Scratch** — `@afenda/env` · `@afenda/auth` disk + Neon/Vercel MCP |
| Updated | 2026-07-19 |
| Live prod probe | `GET /api/health/liveness` on `https://afenda-lite.vercel.app` → 200 (2026-07-19) |

---

## Canonical production origin

| Constant / env | Value (non-secret) |
|----------------|--------------------|
| `PRODUCTION_APP_ORIGIN` (`packages/env`) | `https://afenda-lite.vercel.app` |
| Production `APP_URL` | Must equal that origin on Vercel production |
| Approved non-prod hosts | `localhost` · `127.0.0.1` · `afenda-lite.vercel.app` |

**Coupling rule:** any change to the production browser origin must update **both** Vercel project production domain **and** Neon Auth `trusted_origins` (and re-run `pnpm validate:neon-env` / trusted-domain audit). Class A only — do not widen allowlists “for convenience.”

---

## Two origin helpers (do not merge)

| Helper | File | Use | Must not |
|--------|------|-----|----------|
| `requireAppOrigin()` / `buildInviteJoinUrl` | `packages/auth/src/join-paths.ts` | Invitation accept links → absolute `/join?invitationId=…` under **production** `APP_URL` | Mint invites from localhost/preview when prod `APP_URL` is set |
| `resolveAuthUiOrigin()` | `packages/auth/src/auth-ui-origin.ts` | Neon Auth UI `baseURL` for password-reset / callback — prefer live `x-forwarded-host` / `host` | Drive invite email links |

Join path constant: `JOIN_PATH = "/join"`. Neon may land on `/auth/accept-invitation`; product redirects to `/join` with `invitationId` preserved.

---

## Proxy vs Platforms (Class B contrast)

| Surface | Afenda (this checkout) | Vercel Platforms (contrast only) |
|---------|------------------------|----------------------------------|
| Edge file | `apps/web/proxy.ts` (not `middleware.ts`) | Often `middleware.ts` host parse |
| Job | Session gate + correlation + pathname stamp | Resolve tenant from subdomain / custom domain |
| Tenant key | Session active org → `organization_id` | Host → tenant id header / rewrite |
| Domains | One product project origin + previews | Per-tenant custom domains / wildcards |

**Do not implement** host→tenant on `proxy.ts`. Class B stays documentation contrast.

---

## Operator checklist (Class A)

1. Production `APP_URL` = `https://afenda-lite.vercel.app`.
2. Neon Auth `trusted_origins` includes that origin (trailing-slash duplicate **removed** — N1).
3. Invite emails use `buildInviteJoinUrl` only.
4. Local / preview password-reset may use `resolveAuthUiOrigin`; keep those hosts in Neon trusted list (`localhost` · `https://*.vercel.app` as evidenced).
5. Adding a custom apex (e.g. brand domain) is a **named** Class A change: Vercel domain + Neon trusted + `APPROVED_APP_HOSTS` / env contract — not Platforms tenant routing.

## Verify

```text
pnpm validate:neon-env
Live: GET https://afenda-lite.vercel.app/api/health/liveness
```
