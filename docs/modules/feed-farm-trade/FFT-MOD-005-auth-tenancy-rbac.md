# FFT-MOD-005 Auth, Tenancy and RBAC

| Field             | Value                      |
| ----------------- | -------------------------- |
| **ID**            | FFT-MOD-005                |
| **Category**      | Module                     |
| **Version**       | 1.3.0 |
| **Status**        | Living                     |
| **Control State** | Closed                   |
| **Owner**         | Feed Farm Trade            |
| **Updated**       | 2026-07-14                 |
| **Spine**         | MOD-005 Auth, Tenancy and RBAC |

---

# 1. Purpose

Define Feed Farm Trade identity, org resolution, platform vs module permissions, and route/action gates.

**Audience:** engineers implementing `/fft` authz or diagnosing access denials.
**Action enabled:** distinguish `fft.access`, Trade RBAC, and sales allowlist without inventing permission codes.

---

# 2. Scope

## 2.1 In Scope

- Identity source and org resolution
- Platform entry vs module RBAC vs sales allowlist
- Route / action gate locations
- Deny behavior

## 2.2 Out of Scope

- Production flag values / RBAC rollback → [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)
- Platform Decision lock (Rejected/Deferred) → [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md)
- Product shell locks → [FFT-MOD-001](FFT-MOD-001-module-architecture.md)

---

# 3. Auth, Tenancy and RBAC

## 3.1 Identity source

Neon Auth — session, org membership, invitations. Credential MFA (if any) is Neon-owned, not AdminCN chrome.

## 3.2 Org resolution

Active → slug → sole membership (platform). Hard fail-closed multi-org. Ops stamps use explicit `--organization-id`. See [ARCH-023](../../architecture/ARCH-023-multi-tenancy.md).

## 3.3 Platform vs module permissions

| Layer | Mechanism | Role |
|-------|-----------|------|
| Platform entry | `fft.access` | Org-scoped module SoT |
| Module RBAC | Permission catalog in `modules/fft/domain/rbac-catalog.ts` | Fine-grained trade actions when `FFT_RBAC_ENABLED` |
| Sales allowlist | `fft_sales_member` | Roster only — does **not** auto-promote entry |

Write-time `ensureFftMemberPlatformAccess` on sales upsert / FFT role assign. Backfill: `npm run backfill:fft-access`.

**Key decision:** permission-catalog RBAC — do not hardcode org-chart job titles as enums. Do not invent codes outside `rbac-catalog.ts`.

## 3.4 Route / action gates

| Gate | Location |
|------|----------|
| Session / access | `modules/fft/auth/fft-session.ts` (incl. own-scope `resourceOwnerUserId`) |
| Phase 2B | `modules/fft/auth/trade-phase2b.ts` + deposit/pickup flags ([FFT-MOD-003](FFT-MOD-003-tech-stack.md)) |
| Phase 2D | `modules/fft/auth/trade-phase2d.ts` + `FFT_ERP_SYNC_ENABLED` |
| Control plane | `/fft/admin/rbac` + `org.roles.manage` / `role.manage` as shipped |

## 3.5 Deny behavior

Signed-in user without `fft.access` hitting `/fft` → `/auth/sign-in?reason=fft-access-denied` → session exists → `/client`. Expected — not an RBAC regression.

## 3.6 Enterprise requirements

Single-owner ACs for this role. Evidence: [FFT-MOD-009](FFT-MOD-009-verification.md). Standard: [MOD-002](../MOD-002-modules-index.md).

| AC-ID | Profile | Quality Dimension | Applicability | Criterion |
| --- | --- | --- | --- | --- |
| FFT-AC-005-01 | Enterprise Core | CORE-SECURITY | Core | Platform entry vs module RBAC vs roster are distinct: org-scoped `fft.access` is entry SoT; fine-grained codes only from `rbac-catalog.ts` when RBAC on; `fft_sales_member` is roster only. |
| FFT-AC-005-02 | Enterprise Core | CORE-SECURITY | Core | Multi-org isolation and denial: cross-org resources are denied; signed-in without access follows the documented access-denied flow. |
| FFT-AC-005-03 | Enterprise Core | CORE-SECURITY | Core | Sensitive permission changes are auditable (role/permission admin surfaces honor manage permissions as shipped). |
| FFT-AC-005-04 | Enterprise Core | CORE-SECURITY | Core | Abuse controls: session/own-scope checks and phase gates prevent unauthorized trade mutations. |
| FFT-AC-005-05 | ERP | ERP-SOD-COMPLIANCE | Core | Roles implement least privilege and segregation of duties; conflicting access, emergency access, approvals, and sensitive changes are detectable and auditable. |
---

# 4. References

| ID | Title | Relationship |
| -- | ----- | ------------ |
| DOC-001 | Documentation Control Standard | Governance |
| MOD-002 | Modules Index | Module Enterprise Readiness standard |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org / tenancy SSOT |
| FFT-MOD-001 | Module Architecture | Entry lock |
| FFT-MOD-003 | Tech Stack | Flag names |
| FFT-MOD-008 | Ops Runtime | Prod RBAC state |
| FFT-MOD-009 | Verification | Evidence ledger |

---

# 5. Change Log

| Version | Date       | Summary |
| ------- | ---------- | ------- |
| 1.3.0 | 2026-07-14 | Executable quality contract: profile/dimension mapping and owned ERP benchmark criteria. |
| 1.2.0   | 2026-07-14 | Wave C: enterprise requirements FFT-AC-005-01…04 (tenancy/authz/abuse). |
| 1.1.0   | 2026-07-14 | DOC-003 six-section retrofit; catalog path explicit; prod flags deferred to MOD-008. |
| 1.0.2   | 2026-07-14 | Added mandatory Control State header field (Closed). |
| 1.0.0   | 2026-07-13 | Initial spine |

---

# 6. Notes

**Spine role:** MOD-005 Auth, Tenancy and RBAC — permission model only. `FFT_RBAC_ENABLED` production value lives in MOD-008.
