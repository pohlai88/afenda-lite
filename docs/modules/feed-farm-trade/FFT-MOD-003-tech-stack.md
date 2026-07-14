# FFT-MOD-003 Tech Stack

| Field             | Value           |
| ----------------- | --------------- |
| **ID**            | FFT-MOD-003     |
| **Category**      | Module          |
| **Version**       | 1.3.0 |
| **Status**        | Living          |
| **Control State** | Closed        |
| **Owner**         | Feed Farm Trade |
| **Updated**       | 2026-07-14      |
| **Spine**         | MOD-003 Tech Stack |

---

# 1. Purpose

Record Feed Farm Trade runtime, framework, data, auth dependencies, and **module feature-flag env keys** (flag table SSOT).

**Audience:** engineers configuring local or production FFT behavior.
**Action enabled:** choose correct runtime defaults and env key names without inventing prefixes.

---

# 2. Scope

## 2.1 In Scope

- Runtime defaults (Node vs Edge)
- Framework / UI / data-access choices
- Auth dependency summary
- `FFT_*` feature-flag table (this document owns the table)

## 2.2 Out of Scope

- Whether a change is allowed in production → [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)
- Platform env compose / sync policy → [ARCH-027](../../architecture/ARCH-027-env-model.md)
- Permission catalog → [FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md)

---

# 3. Tech Stack

## 3.1 Runtime

| Concern | Choice |
|---------|--------|
| Default | Node.js server (Next.js App Router RSC + Server Actions) |
| Edge | Documented exception only — not FFT default |
| Host | Afenda-Lite on Vercel (`afenda-lite`); local `npm run dev` against production Neon branch policy |

## 3.2 Frameworks / UI

| Layer | Choice |
|-------|--------|
| App | Next.js App Router |
| Operator shell | AdminCN (`AdminCnShell`) |
| UI feature code | `features/fft/*` |
| i18n | vi/en trade strings (engine) |

## 3.3 Data access

- Neon Postgres shared schema + hard `organization_id` predicates (platform).
- Domain under `modules/fft/domain/` (Drizzle/SQL via existing app data layer — Turborepo `@afenda/db` is Target).

## 3.4 Auth dependency

- Neon Auth for identity and org membership.
- Platform `fft.access` for module entry.
- Module RBAC when `FFT_RBAC_ENABLED=true` ([FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md)).

## 3.5 Module feature flags / env keys (SSOT)

| Variable | Production | Local | Notes |
|----------|------------|-------|-------|
| `FFT_RBAC_ENABLED` | `true` | `false` | Manifest SSOT |
| `FFT_DEPOSIT_ENABLED` | `false` | `false` | 2B |
| `FFT_PICKUP_OPS_ENABLED` | `false` | `false` | 2B |
| `FFT_NOTIFICATIONS_ENABLED` | `true` | `true` | 2C |
| `FFT_EMAIL_FROM` | set | set | 2C sender |
| `RESEND_API_KEY` | set (Vercel) | set | not via `sync:vercel` |
| `FFT_ERP_SYNC_ENABLED` | `false` | `false` | 2D |
| `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` | unset until tenant pack | unset | `syncOptional` |

Never edit `.env` by hand. Never `vercel env pull`. Platform env model: [ARCH-027](../../architecture/ARCH-027-env-model.md).

## 3.6 Local vs prod

| Concern | Local | Prod |
|---------|-------|------|
| Neon branch | Production branch policy | `br-tiny-hill-ao82jp6f` |
| RBAC flag | often `false` | `true` |
| ERP sync | off unless deliberately enabled | off until 2D-3 ready |

Rollback and promotion gates: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).

## 3.7 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-003-01 | Enterprise Core | CORE-PLATFORM | Core | Supported runtime and dependencies are documented: Node default; Edge only as named exception; local vs prod behavior differs only as tabled. |
| FFT-AC-003-02 | Enterprise Core | CORE-PLATFORM | Core | `FFT_*` flags/env keys match compose/manifest; budgets/constraints for module resources are stated; never hand-edit `.env` or `vercel env pull`. |
| FFT-AC-003-03 | Enterprise Core | CORE-PLATFORM | Conditional | When a Conditional ops/ERP capability is Disabled or Uncontracted, fail-closed behavior is evidenced (otherwise remains `NOT EVIDENCED` on FFT-MOD-009). |
| FFT-AC-003-04 | ERP | ERP-CONFIG-ALM | Core | Configuration is separated from customization; supported versions, environment promotion, feature/config transport, and rollback ownership are documented and reproducible. |
---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-027 | Environment Variable Model | Platform env |
| FFT-MOD-005 | Auth, Tenancy and RBAC | RBAC when flag on |
| FFT-MOD-008 | Ops Runtime | Prod state / rollback |
| FFT-MOD-009 | Verification | Evidence ledger |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-003-01…03 (runtime/flags/conditional). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; flag table confirmed SSOT here. |
| 1.0.1   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-003 Tech Stack — stack + env key table only. Production allow/forbid lives in MOD-008.
