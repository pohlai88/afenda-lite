# BL-09 — Local development auth strategy

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P1  
**Journeys:** J8 (developer workflow)  
**Depends on:** BL-04  
**Status:** **Closed** — Option A documented (dev branch + localhost on dev only)

**Validation matrix:** [neon-auth-validation-matrix.md](../neon-auth-validation-matrix.md)

---

## Problem

Production auth branch **no longer trusts localhost**. Developers running `npm run dev` on `http://localhost:3000` against the **production** Neon Auth branch will hit **invalid domain** on sign-in unless a separate strategy is documented and adopted.

---

## Issues to close

- Manifest previously listed `http://localhost:3000` while live branch removed it.
- No runbook section stating which Neon branch local dev should use post-cutover.
- Operator invite from localhost with production `APP_URL` was a known Origin edge case (server-side fetch forces APP_URL — document expectation).

---

## Expectation

Every developer knows which Neon branch and trusted origins to use locally, without breaking production auth policy or accidentally testing against live client data.

---

## Do

- Document one of: (A) dedicated dev Neon branch with localhost allowed, (B) local-only env pointing at preview branch, or (C) production branch + tunnel/preview URL only.
- Run `neon link` / `neon checkout` for feature work per AGENTS.md branch-first flow.
- Sync manifest after any dev-branch auth config change.
- Use Storybook or `/playground` embed for layout-only UI review when auth not needed.

## Don't

- Re-enable localhost on **production** auth branch for convenience.
- Share production operator credentials in dev docs.
- Use production auth branch for destructive seed experiments without branch isolation.

---

## Definition of done

- [x] Written decision in runbook or AGENTS.md: local dev auth branch strategy (A/B/C).
- [x] `.neon` / env docs state which branch `DATABASE_URL` and `NEON_AUTH_BASE_URL` target for default local dev.
- [x] Developer smoke test documented: local sign-in succeeds under chosen strategy.
- [x] BL-04 cutover marked compatible with chosen dev strategy.

---

## Test & verification

| Layer | Action | Pass criteria |
| --- | --- | --- |
| Manual | Fresh clone → `env:compose` → `npm run dev` → sign-in | Auth succeeds per strategy |
| Manual | Operator invite from local (if applicable) | Email links use `APP_URL` |
| Doc | `preview-branch-setup.md` cross-link | Consistent with decision |

---

## Decision record (fill on close)

| Option | Chosen? | Notes |
| --- | --- | --- |
| A — Dev branch, localhost allowed | **Yes** | Branch-first `neon checkout dev-*`; localhost on dev branch only; production stays hardened |
| B — Preview branch for local auth | No | Preview reserved for Vercel/CI — see [preview-branch-setup.md](../../runbooks/preview-branch-setup.md) |
| C — Production branch + hosted preview only | No | Blocked: production has `allow_localhost: false` |

**Docs:** [AGENTS.md](../../../AGENTS.md) (Local development auth) · [local-dev-auth.md](../../runbooks/local-dev-auth.md)

---

## Related runbooks

- [local-dev-auth.md](../../runbooks/local-dev-auth.md)
- [preview-branch-setup.md](../../runbooks/preview-branch-setup.md)
- [production-go-live.md](../../runbooks/production-go-live.md)
