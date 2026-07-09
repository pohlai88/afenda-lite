# BL-04 — Production auth cutover readiness

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P1  
**Journeys:** J8  
**Depends on:** BL-01  
**Status:** **Complete on branch** — manifest synced; BL-09 required for local dev

**Validation matrix:** [neon-auth-validation-matrix.md](../neon-auth-validation-matrix.md)

---

## Problem

Production auth branch must trust only real app origins. Cutover was applied on the branch but manifest/audit lagged, causing false “localhost still enabled” guidance.

---

## Live state (MCP-validated)

| Check | Live | Manifest (synced) |
| --- | --- | --- |
| `allow_localhost` | `false` | `false` |
| Trusted origins | `https://iam-check.vercel.app` only | Same |
| Audit item 6 | — | **Pass** |

---

## Expectation

Production Neon Auth accepts redirects/CSRF only from `APP_URL`. Release owner signs checklist with synced manifest evidence.

---

## Do

- Keep manifest synced after any trusted-origin change.
- Add custom domains via `npm run configure:neon-auth-production -- --add-trusted-origin <url>` before launch.
- Complete **BL-09** so developers know how to auth locally without production localhost.

## Don't

- Re-add localhost to production branch without explicit decision.
- Add wildcard trusted origins.

---

## Definition of done

- [x] Live MCP: `allow_localhost: false`.
- [x] Trusted origins include `APP_URL`.
- [x] Manifest synced; audit items 1 and 6 pass.
- [ ] Release owner sign-off recorded — [post-deploy-verification.md](../post-deploy-verification.md#phase-4--program-closure-backlog-01).
- [x] BL-09 local dev strategy documented.

---

## Test & verification

| Layer | Action | Pass criteria |
| --- | --- | --- |
| MCP | `get_neon_auth_config` | Matches matrix |
| Script | `npm run audit:neon-auth-production` | Item 6 pass |
| Manual | Sign-in on production URL | No invalid domain |
