# FFT-MOD-008 Ops Runtime

| Field             | Value           |
| ----------------- | --------------- |
| **ID**            | FFT-MOD-008     |
| **Category**      | Module          |
| **Version**       | 1.3.0 |
| **Status**        | Living          |
| **Control State** | Closed        |
| **Owner**         | Feed Farm Trade |
| **Updated**       | 2026-07-14      |
| **Spine**         | MOD-008 Ops Runtime |
| **Supersedes**    | MOD-001 Feed Farm Trade Runtime |

---

# 1. Purpose

Agent **runtime** procedure: decide whether a `/fft` change is allowed, what production state is, and how to verify — before coding.

**Audience:** IDE agents, engineers, operators.
**Action enabled:** allow / forbid / rollback FFT work without recreating a separate `ops/` tree.

**Platform tenancy:** [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md) — hard org filters; do not conflate with `FFT_RBAC_ENABLED`.
**Index:** [FFT-MOD-010](FFT-MOD-010-module-docs-index.md).

---

# 2. Scope

## 2.1 In Scope

- Production state and frozen tags
- Immediate checks and RBAC rollback
- Allowed / forbidden coding without reopen
- Test identities

## 2.2 Out of Scope

- Env key catalogue (names/defaults) → [FFT-MOD-003](FFT-MOD-003-tech-stack.md)
- MVP / gap register → [FFT-MOD-010](FFT-MOD-010-module-docs-index.md)
- Verification command pyramid detail → [FFT-MOD-009](FFT-MOD-009-verification.md)
- Recreating `docs/modules/feed-farm-trade/ops/`

---

# 3. Ops Runtime Procedure

## 3.1 Signals — production state

| Phase | Tag / commit | Status |
|-------|--------------|--------|
| Phase 1 engine | `fft-phase-1` → `1bc1294` | **Closed** |
| Phase 2A RBAC | `fft-phase-2a` → `8e650ff` | **Closed** (immutable — do not retag) |
| Phase 2A ops Gates 1–7 | — | **Closed** 2026-07-10 |
| Phase 2B–2D decisions | Absorbed into spine ([FFT-MOD-010](FFT-MOD-010-module-docs-index.md)) | **Accepted** — impl still blocked |
| Phase 2B–2D impl | Flag-gated; see Allowed / Forbidden | Tags `fft-phase-2b`…`2d` when present |

| Item | Value |
|------|-------|
| URL | `https://afenda-lite.vercel.app` |
| Neon branch | `br-tiny-hill-ao82jp6f` only |
| `FFT_RBAC_ENABLED` | `true` on Vercel production |
| Migrations | `013`–`023` Feed Farm Trade lane |
| `FFT_ERP_SYNC_ENABLED` | `false` |

Flag name table: [FFT-MOD-003](FFT-MOD-003-tech-stack.md). Code map: [FFT-MOD-002](FFT-MOD-002-domain-and-ownership.md).

## 3.2 Immediate checks

```bash
npm run test:unit -- modules/fft
npm run test:e2e:smoke
npm run audit:vercel
npm run env:compose
npm run audit:fft-promotion
```

Production gate smoke: `node scripts/gate-7-production-smoke.mjs`.

## 3.3 Standard operating procedure — before coding

1. Read this file.
2. If the task is **2C+ implementation** — confirm slice group is **Approved** (ask user / check production state above); else **stop and ask**.
3. Use other spine docs when needed ([FFT-MOD-010](FFT-MOD-010-module-docs-index.md)).

### Allowed without reopening scope

- Production-blocking fixes on frozen boundary (merge to `main`, redeploy)
- Reading / debugging existing trade routes
- Test-lane commits (separate from unrelated refactors)

### Forbidden without explicit user approval

- Phase **2D-3 vendor adapter** (until customer integration contract)
- Phase **2C notification sends** when `FFT_NOTIFICATIONS_ENABLED` is false (import dry-run/confirm allowed)
- Writes to 2B tables when deposit/pickup flags are false
- Disabling production RBAC except documented rollback
- Repo normalization mixed into Feed Farm Trade commits
- Guardian Auth / portal atmosphere framed as Feed Farm Trade

## 3.4 Escalation / identities

| Account | Role | Feed Farm Trade use |
|---------|------|---------------------|
| `SHARED_ADMIN_EMAIL` | Operator admin | Platform Org Admin → `fft.access` |
| `PREVIEW_CLIENT_EMAIL` | Declaration preview client | **Not** auto in `fft_sales_member` |
| Sales allowlist | `fft_sales_member` row | Ops roster only |

**Expected:** signed-in without `fft.access` → `/fft` → access-denied path — not an RBAC regression.

## 3.5 Rollback / recovery (RBAC only)

```bash
# env.config: FFT_RBAC_ENABLED=false
npm run env:compose && npm run sync:vercel && vercel deploy --prod --yes
```

Gate history, rollout, and readiness stay in this document. Do not recreate a separate `ops/` tree.

## 3.6 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-008-01 | Enterprise Core | CORE-OPERATIONS | Core | Correlation and operational signals: production state and verify commands yield actionable check outcomes for FFT incidents. |
| FFT-AC-008-02 | Enterprise Core | CORE-OPERATIONS | Core | Incident/data recovery and rollback paths for RBAC/flags are documented and operable without a separate `ops/` tree. |
| FFT-AC-008-03 | Enterprise Core | CORE-OPERATIONS | Core | Release/deploy evidence: production flags match the Living state table; identities are not conflated (admin ≠ sales allowlist). |
| FFT-AC-008-04 | Enterprise Core | CORE-OPERATIONS | Conditional | When Conditional capabilities remain Disabled, fail-closed ops behavior is evidenced; enabling requires this document’s allow checklist. |
| FFT-AC-008-05 | ERP | ERP-CUTOVER-OPERATIONS | Core | Cutover includes rehearsed migration and reconciliation, go/no-go authority, rollback, continuity, hypercare, support ownership, and measurable transition exit criteria. |
---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org filters |
| FFT-MOD-002 | Domain and Ownership | Code map |
| FFT-MOD-003 | Tech Stack | Flag table |
| FFT-MOD-009 | Verification | Evidence ledger |
| FFT-MOD-010 | Module Docs Index and Roadmap | Readiness claims / roadmap |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-008-01…04 (ops/SLO/recovery/conditional). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; runbook-shaped ops procedure. |
| 1.0.2   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine (supersedes former runtime MOD-001 path) |

---

# 6. Notes

**Assumptions:** Closed product phases — [deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md). Feed Farm Trade is **not** the default agent mission after 2026-07-10 without explicit reopen.

**Spine role:** MOD-008 Ops Runtime — read **first** before `/fft` code changes.
