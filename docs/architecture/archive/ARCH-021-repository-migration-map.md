# ARCH-021 Repository Migration Map

| Field | Value |
|-------|-------|
| ID | ARCH-021 |
| Category | Architecture |
| Version | 2.0.2 |
| Status | Superseded |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |
| Location | `docs/architecture/archive/` |
| Superseded by | [ARCH-022 System Overview](../ARCH-022-system-overview.md) (Target layout) · [ARCH-017](../ARCH-017-frontend-folder-map.md) (frontend folder map) |
| Superseded on | 2026-07-13 |

## Deprecation: ARCH-021 Repository Migration Map

**Status:** Compulsory — retired 2026-07-13; archived under `docs/architecture/archive/`  
**Campaign:** `REPO_LAYOUT_CAMPAIGN_OPEN=false` (layout campaign finished)  
**Replacement:** Living layout authority is **Target** Turborepo tree in [ARCH-022](../ARCH-022-system-overview.md) + frontend map [ARCH-017](../ARCH-017-frontend-folder-map.md). Historical From→To rows are git history / this stub only.  
**Forbidden:** Teaching ARCH-021 as current layout SSOT; restoring this file to `docs/architecture/` root; reopening the Root/L1/L2 migration campaign without explicit user approval

Closed moves (done): `lib/env|governance|routing` → `modules/platform/*`; legacy `components/` → `features/` + `components-V2/` (hard-delete — no wholesale restore).

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.0.2 | 2026-07-14 | Corrected supersession labels from ARCH-029 residue to ARCH-017 (frontend folder map). |
| 2.0.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 2.0.0 | 2026-07-13 | Superseded; nested under `docs/architecture/archive/` |
| 1.0.0 | 2026-07-13 | Retired closed migration map |
