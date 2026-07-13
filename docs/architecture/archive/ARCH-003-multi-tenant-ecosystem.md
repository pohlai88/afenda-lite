# ARCH-003 Multi-tenant Ecosystem

| Field | Value |
|-------|-------|
| ID | ARCH-003 |
| Category | Architecture |
| Version | 2.1.0 |
| Status | Superseded |
| Owner | Platform |
| Updated | 2026-07-13 |
| Location | `docs/architecture/archive/` |
| Superseded by | [ARCH-023 Multi-Tenancy Model](../turborepo/ARCH-023-multi-tenancy.md) |
| Superseded on | 2026-07-13 |

## Deprecation: ARCH-003 Multi-tenant Ecosystem

**Status:** Compulsory — retired as Architecture SSOT 2026-07-13; archived under `docs/architecture/archive/`  
**Replacement:** [ARCH-023](../turborepo/ARCH-023-multi-tenancy.md) (Living)  
**Removal:** Do not reopen ARCH-003 as living inventory without explicit user/ADR decision  
**Reason:** Day-1 Turborepo plan names ARCH-023 as the tenancy Architecture home; dual SSOTs caused agent drift  
**Forbidden:** Teaching ARCH-003 as current; restoring this stub to `docs/architecture/` root; documenting new tenancy work only against ARCH-003

All binding content (Decision lock / R1–R7 / D4·D5, Neon shared-schema posture, multi-org M1–M4, efficiency pointers) lives in **ARCH-023**. Ops: [RB-001](../../runbooks/RB-001-multi-org-ops.md). Platform IAM: [ARCH-011](../ARCH-011-platform-tenancy-rbac.md). Shared-schema decision: [ARCH-023](../../architecture/turborepo/ARCH-023-multi-tenancy.md) § Shared-schema (former ADR-012).

Historical body of ARCH-003 is recoverable from git history prior to the stub. Do not restore the full Living body alongside ARCH-023.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.1.0 | 2026-07-13 | Nested under `docs/architecture/archive/` |
| 2.0.0 | 2026-07-13 | Superseded by ARCH-023; body retired to stub |
| 1.0.0 | 2026-07-13 | Living multi-tenant ecosystem inventory |
