# ARCH-021 Repository Migration Map

| Field | Value |
|-------|-------|
| ID | ARCH-021 |
| Category | Architecture |
| Version | 2.0.0 |
| Status | Superseded |
| Owner | Platform |
| Updated | 2026-07-13 |
| Location | `docs/architecture/archive/` |
| Superseded by | [ARCH-022 System Overview](../turborepo/ARCH-022-system-overview.md) (Target layout) · [ARCH-029](../../architecture/frontend/ARCH-029-frontend-folder-map.md) (frontend folder map) |
| Superseded on | 2026-07-13 |

## Deprecation: ARCH-021 Repository Migration Map

**Status:** Compulsory — retired 2026-07-13; archived under `docs/architecture/archive/`  
**Campaign:** `REPO_LAYOUT_CAMPAIGN_OPEN=false` (layout campaign finished)  
**Replacement:** Living layout authority is **Target** Turborepo tree in [ARCH-022](../turborepo/ARCH-022-system-overview.md) + frontend map [ARCH-029](../../architecture/frontend/ARCH-029-frontend-folder-map.md). Historical From→To rows are git history / this stub only.  
**Forbidden:** Teaching ARCH-021 as current layout SSOT; restoring this file to `docs/architecture/` root; reopening the Root/L1/L2 migration campaign without explicit user approval

Closed moves (done): `lib/env|governance|routing` → `modules/platform/*`; legacy `components/` → `features/` + `components-V2/` (hard-delete — no wholesale restore).

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.0.0 | 2026-07-13 | Superseded; nested under `docs/architecture/archive/` |
| 1.0.0 | 2026-07-13 | Retired closed migration map |
