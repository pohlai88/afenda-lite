# FFT-MOD-002 Domain and Ownership

| Field             | Value                    |
| ----------------- | ------------------------ |
| **ID**            | FFT-MOD-002              |
| **Category**      | Module                   |
| **Version**       | 1.3.0 |
| **Status**        | Living                   |
| **Control State** | Closed                 |
| **Owner**         | Feed Farm Trade          |
| **Updated**       | 2026-07-14               |
| **Spine**         | MOD-002 Domain and Ownership |


---

# 1. Purpose

Define the Feed Farm Trade bounded context, ubiquitous language, and code/doc ownership map.

**Audience:** engineers and agents locating the correct path or document.
**Action enabled:** map a concern to a single owner path or spine doc without inventing parallel stacks.

---

# 2. Scope

## 2.1 In Scope

- Bounded context summary
- Ubiquitous language
- Code and document ownership maps
- Forbidden ownership moves

## 2.2 Out of Scope

- Product locks / shell architecture → [FFT-MOD-001](FFT-MOD-001-module-architecture.md)
- Schema / migration detail → [FFT-MOD-004](FFT-MOD-004-data-model.md)
- Production flags → [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)

---

# 3. Domain and Ownership

## 3.1 Bounded context

**Feed Farm Trade** — B2B feed & farm trade sales events: catalog setup, sales orders, priority/FCFS allocation, deposits/pickup ops, Excel import, outbound mail, optional ERP push.

| Fact | Value |
|------|-------|
| Host product | Afenda-Lite |
| Shell id | `fft` |
| Engine env prefix | `FFT_*` |

## 3.2 Ubiquitous language

| Term | Meaning |
|------|---------|
| Event | Trade sales event (`fft_event` and children) |
| Allowlist | `fft_sales_member` roster (not module entry SoT) |
| Module entry | Platform permission `fft.access` (org-scoped) |
| Trade RBAC | Module permission catalog ([FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md)) when `FFT_RBAC_ENABLED` |
| Depth docs | **Forbidden** under module home — do not recreate `adr/` `ops/` `spec/` |

## 3.3 Code ownership map

| Area | Path | Notes |
|------|------|-------|
| Routes | `app/fft/**` | Locale-free; legacy locale shim is redirect-only |
| UI | `features/fft/*` | Under `AdminCnShell` — **no** `FftShell` |
| Domain | `modules/fft/domain/` | Store, allocation, ERP, etc. |
| Auth / gates | `modules/fft/auth/` | `fft-session`, phase2b/2d |
| Actions | `app/actions/fft.ts` | Server Actions entry |
| Schema | `db/migrations/013_*` … trade lane | See [FFT-MOD-004](FFT-MOD-004-data-model.md) |
| E2E | `e2e/trade-fft.spec.ts` | `@smoke` / `@journey` |

## 3.4 Doc ownership

| Concern | Doc |
|---------|-----|
| Spine + navigation / MVP | [FFT-MOD-010](FFT-MOD-010-module-docs-index.md) |
| Ops / prod | [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) |
| Auth / RBAC | [FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md) |
| FE product locks | [FFT-MOD-001](FFT-MOD-001-module-architecture.md) |
| Skill | `.cursor/skills/feed-farm-trade` |

## 3.5 Forbidden

- Inventing `modules/trade` or a separate FFT stack
- Restoring `FftShell` / locale-switcher product UI
- Teaching soft SQL tenancy or first-org stamp as current
- Mixing declaration / atmosphere work into FFT commits

## 3.6 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-002-01 | Enterprise Core | CORE-PROCESS | Core | Business journey is owned end-to-end: event setup → open window → order → transfer → allocation → completion → audit/export (actors and capability ownership named). |
| FFT-AC-002-02 | Enterprise Core | CORE-PROCESS | Core | Code/doc ownership maps are exclusive: `app/fft`, `features/fft`, `modules/fft`, `app/actions/fft.ts`; no parallel `modules/trade` / depth-folder SSOT under the module home. |
| FFT-AC-002-03 | ERP | ERP-PROCESS-CONTROLS | Core | Approval, exception, reversal, and period-control responsibilities are explicit for material trade transactions; every override is attributable and auditable. |
| FFT-AC-002-04 | ERP | ERP-REPORTING | Core | Operational and management reports have named owners, reconciliation rules, cut-off semantics, and traceability back to source transactions. |

---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| FFT-MOD-001 | Module Architecture | Product locks |
| FFT-MOD-004 | Data Model | Schema lane |
| FFT-MOD-005 | Auth, Tenancy and RBAC | Permission catalog |
| FFT-MOD-008 | Ops Runtime | Production |
| FFT-MOD-009 | Verification | Evidence ledger |
| FFT-MOD-010 | Module Docs Index and Roadmap | Index / claims |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-002-01…02 (journey + ownership). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; compact ownership map. |
| 1.0.2   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-002 Domain and Ownership — language and path map only.
