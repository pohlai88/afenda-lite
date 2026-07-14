# ARCH-003 Multi-tenant Ecosystem

| Field | Value |
|-------|-------|
| ID | ARCH-003 |
| Category | Architecture |
| Version | 2.1.1 |
| Status | Superseded |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |
| Location | `docs/architecture/archive/` |
| Superseded by | [ARCH-023 Multi-Tenancy + Platform RBAC](../ARCH-023-multi-tenancy.md) |
| Superseded on | 2026-07-13 |

## Deprecation: ARCH-003 Multi-tenant Ecosystem

**Status:** Compulsory — retired as Architecture SSOT 2026-07-13; archived under `docs/architecture/archive/`  
**Replacement:** [ARCH-023](../ARCH-023-multi-tenancy.md) (Living)  
**Removal:** Do not reopen ARCH-003 as living inventory without explicit user approval  
**Reason:** ARCH-023 is the sole Living tenancy + RBAC home; dual SSOTs caused agent drift  
**Forbidden:** Teaching ARCH-003 as current; restoring this stub to `docs/architecture/` root; documenting new tenancy work only against ARCH-003

All binding content (Decision lock / R1–R7 / D4·D5, Neon shared-schema posture, multi-org M1–M4, efficiency pointers, platform IAM) lives in **[ARCH-023](../ARCH-023-multi-tenancy.md)**. Ops: [RB-001](../../runbooks/RB-001-multi-org-ops.md).

Historical body of ARCH-003 is recoverable from git history prior to the stub. Do not restore the full Living body alongside ARCH-023.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 2.1.0 | 2026-07-13 | Nested under `docs/architecture/archive/` |
| 2.0.0 | 2026-07-13 | Superseded by ARCH-023; body retired to stub |
| 1.0.0 | 2026-07-13 | Living multi-tenant ecosystem inventory |
