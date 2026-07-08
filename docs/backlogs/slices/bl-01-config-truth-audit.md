# BL-01 — Configuration truth & audit pipeline

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P0  
**Journeys:** J8  
**Status:** **Closed** — re-run MCP + sync after every Console change

**Validation matrix:** [neon-auth-validation-matrix.md](../neon-auth-validation-matrix.md)

---

## Problem

Live Neon Auth branch configuration and the committed materialized manifest can drift apart. Automated production checklists read the manifest, not live MCP — producing false passes when sync is stale or CLI omits fields (e.g. `allow_localhost`).

Operators and agents lack a single repeatable workflow when the Cursor `setup-neon-auth` command fails.

---

## Issues to close

- ~~Manifest listed localhost while live branch had disabled it~~ → fixed sync inference (`resolveAllowLocalhost`).
- Audit script must treat “no localhost in trusted domains” as cutover pass.
- No documented replacement for broken `setup-neon-auth` Cursor command.
- Three sources must stay aligned: **MCP live**, **manifest**, **UI feature flags**.

---

## Expectation

Anyone can answer: **what is live on the production auth branch, what the repo records, and whether they match** — before advising on email, invites, or cutover.

---

## Do

- Use MCP `get_neon_auth_config` as **live authority** when Cursor plugin 404s.
- Run `npm run sync:neon-auth-manifest` after any Neon Console or CLI auth change.
- Run `npm run audit:neon-auth-production` immediately after sync.
- Cross-check [validation matrix](../neon-auth-validation-matrix.md) before closing auth slices.
- Commit manifest when `syncedAt` changes.

## Don't

- Edit `.env` by hand for auth URLs — use `env:compose`.
- Trust audit output without same-day manifest sync.
- Assume CLI `neon-auth status` includes every field MCP returns.
- Pull Vercel env into local files.

---

## Definition of done

- [x] `npm run sync:neon-auth-manifest` succeeds; trusted domains match MCP.
- [x] `allowLocalhost: false` in manifest when live MCP says false.
- [x] `npm run audit:neon-auth-production` — item 6 pass (localhost disabled).
- [x] Validation matrix document committed.
- [x] `NEON_AUTH_BASE_URL` matches manifest when env is composed (`neon-auth.manifest.test.ts`).
- [x] AGENTS.md documents MCP + sync workflow.

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| L0 | `npm run test:unit -- lib/auth/neon-auth-manifest-build.test.ts` | `resolveAllowLocalhost` tests pass |
| L0 | `npm run test:unit -- lib/auth/neon-auth.manifest.test.ts` | Manifest/env alignment |
| Registry | `npm run audit:neon-auth-production` | Checklist matches post-sync manifest |
| Live | MCP `get_neon_auth_config` vs manifest | Policy fields match matrix |
| Env | `npm run audit:vercel` | Canonical Neon auth keys on Vercel |

---

## Accurate implementation notes

| Source | Role |
| --- | --- |
| MCP `get_neon_auth_config` | Live branch truth |
| `npm run sync:neon-auth-manifest` | Writes `config/neon-auth.manifest.json` |
| `lib/auth/neon-auth-ui.config.ts` | UI features read manifest (not MCP at runtime) |
| `scripts/lib/neon-auth-manifest-build.mjs` | `resolveAllowLocalhost()` — infers from trusted domains when CLI omits flag |
