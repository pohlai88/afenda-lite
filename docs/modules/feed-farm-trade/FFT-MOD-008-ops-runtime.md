# FFT-MOD-008 Ops Runtime

| Field | Value |
|-------|-------|
| ID | FFT-MOD-008 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-008 Ops Runtime |
| Supersedes | MOD-001 Feed Farm Trade Runtime |

**Doc type:** agent RUNTIME — read **first** before any `/fft` or Feed Farm Trade code change.  
**Audience:** IDE agents, engineers, operators.  
**Platform tenancy:** [ARCH-011](../../architecture/ARCH-011-platform-tenancy-rbac.md) · [ARCH-023](../../architecture/turborepo/ARCH-023-multi-tenancy.md) — hard org filters; do not conflate with `FFT_RBAC_ENABLED`.  
**Index:** [FFT-MOD-010](FFT-MOD-010-module-docs-index.md)

## Purpose

Answer in one pass: **Is this change allowed?** **What is production state?** **Where is the code?** **How do I verify?**

## Production state

| Phase | Tag / commit | Status |
|-------|--------------|--------|
| Phase 1 engine | `fft-phase-1` → `1bc1294` | **Closed** |
| Phase 2A RBAC | `fft-phase-2a` → `8e650ff` | **Closed** (immutable — do not retag) |
| Phase 2A ops Gates 1–7 | — | **Closed** 2026-07-10 |
| Phase 2B–2D ADRs | ADR-007…009 | **Accepted** |
| Phase 2B–2D impl | Flag-gated; see Allowed / Forbidden below | Tags `fft-phase-2b`…`2d` when present |

| Item | Value |
|------|-------|
| URL | `https://afenda-lite.vercel.app` |
| Neon branch | `br-tiny-hill-ao82jp6f` only |
| `FFT_RBAC_ENABLED` | `true` on Vercel production |
| Migrations | `013`–`023` Feed Farm Trade lane |
| `FFT_ERP_SYNC_ENABLED` | `false` |

Env flag table and ERP ownership: [FFT-MOD-003](FFT-MOD-003-tech-stack.md). Code map: [FFT-MOD-002](FFT-MOD-002-domain-and-ownership.md).

### Rollback (RBAC only)

```bash
# env.config: FFT_RBAC_ENABLED=false
npm run env:compose && npm run sync:vercel && vercel deploy --prod --yes
```

Gate history, rollout, and readiness: this document (MOD-008). Do not recreate a separate `ops/` tree.

## Immediate checks

```bash
npm run test:unit -- modules/fft
npm run test:e2e:smoke
npm run audit:vercel
npm run env:compose
npm run audit:fft-promotion
```

Production gate smoke: `node scripts/gate-7-production-smoke.mjs`.

## Allowed without reopening scope

- Production-blocking fixes on frozen boundary (merge to `main`, redeploy)
- Reading / debugging existing trade routes
- Test-lane commits (separate from unrelated refactors)

## Forbidden without explicit user approval

- Phase **2D-3 vendor adapter** (until customer integration contract)
- Phase **2C notification sends** when `FFT_NOTIFICATIONS_ENABLED` is false (import dry-run/confirm allowed)
- Writes to 2B tables when deposit/pickup flags are false
- Disabling production RBAC except documented rollback
- Repo normalization mixed into Feed Farm Trade commits
- Guardian Auth / portal atmosphere framed as Feed Farm Trade

## Before coding

1. Read this file.
2. If the task is **2C+ implementation** — confirm slice group is **Approved** (ask user / check MOD-008 production state); else **stop and ask**.
3. Use other spine docs when needed ([FFT-MOD-010](FFT-MOD-010-module-docs-index.md)).

## Test identities

| Account | Role | Feed Farm Trade use |
|---------|------|---------------------|
| `SHARED_ADMIN_EMAIL` | Operator admin | Platform Org Admin → `fft.access` |
| `PREVIEW_CLIENT_EMAIL` | Declaration preview client | **Not** auto in `fft_sales_member` |
| Sales allowlist | `fft_sales_member` row | Ops roster only |

**Expected:** signed-in without `fft.access` → `/fft` → access-denied path — not an RBAC regression.

## Assumptions

1. Closed product phases: [deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).
2. Feed Farm Trade is **not** the default agent mission after 2026-07-10 without explicit reopen.
