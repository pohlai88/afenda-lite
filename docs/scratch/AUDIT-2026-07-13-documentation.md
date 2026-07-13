# Documentation audit — 2026-07-13

| Field | Value |
|-------|-------|
| ID | GUIDE-005 |
| Category | Scratch |
| Version | 1.0.0 |
| Status | Scratch |
| Owner | Platform |
| Updated | 2026-07-13 |

**Triggered by:** `/documentation-audit` + `/using-agent-skills` (Elite overlay: `/using-afenda-elite-skills`).  
**Scope:** `docs/` working tree. Non-authoritative scratch report.

## Summary

| Area | Status |
|------|--------|
| Living layout (`_control` `api` `architecture` `guides` `modules` `runbooks` `scratch`) | **OK** |
| Retired homes on disk (`adr/` `fft/` `frontend/` `backend/` `engineering/`) | **Absent** (good) |
| Git index still tracks deleted ADR/GUIDE trees | **DRIFT** until commit |
| Broken relative links (post-fix) | See validation run |
| Competing SSOTs / duplication | **Violations listed below** |

## Duplication / SSOT violations

### Critical (agents can load the wrong authority)

| Violation | Detail | Fix |
|-----------|--------|-----|
| **Git HEAD vs working tree** | `git` still lists deleted `docs/adr/**`, old GUIDE-007…014, old ARCH-018 path at architecture root | Commit the deletions so agents/CI reading HEAD do not revive stubs |
| **AdminCN triple SSOT** | [ARCH-015](../architecture/frontend/ARCH-015-admincn-alignment.md) (alignment) · [ARCH-018](../architecture/tech-stack/ARCH-018-admincn-customization.md) (playbook) · [ARCH-019](../architecture/tech-stack/ARCH-019-admincn-frontend-preflight.md) (checklist) overlap theme/nav/shell rules | Keep three files but enforce one owner sentence each: 015 = map, 018 = levers, 019 = checklist only — do not restate the others’ tables |
| **Tenancy dual home** | [ARCH-011](../architecture/ARCH-011-platform-tenancy-rbac.md) (IAM) vs [ARCH-023](../architecture/turborepo/ARCH-023-multi-tenancy.md) (Neon + lock) | **Intentional split** — violation only if either re-teaches the other’s Decision lock / seed catalogs |

### High (index / ID drift)

| Violation | Detail | Fix |
|-----------|--------|-----|
| **DOC-003 ID reuse risk** | `docs/README.md` header ID = DOC-003; Elite glossary DOC-003 is a different system under `doc/` (absent here) | Rename index to a non-colliding control ID when registering, or keep provisional and note in REGISTER |
| **REGISTER narrative stale** | REGISTER still says “ADR-010…014 Accepted” in older changelog / intro lines while rows are Superseded | Edit intro paragraph to “absorbed into ARCH-022…027” |
| **How-to-read duplication** | Was: steps 1 and 5 both ARCH-022 | Fixed in this audit |

### Medium (overlap without clear owner)

| Overlap | Docs | Rule |
|---------|------|------|
| FFT locks + architecture | FFT-MOD-001 (absorbed ADR-003/004) | Sole FE product architecture SSOT for `/fft` |
| FFT roadmap / MVP | FFT-MOD-010 (absorbed ADR-005) | Sole roadmap SSOT — do not recreate GUIDE-010…013 |
| Ops gates | FFT-MOD-008 | Sole FFT ops SSOT — do not recreate `ops/RB-*` under modules |
| Env compose vs Target t3-env | AGENTS.md Living compose · ARCH-027 Target `.env.local` | Documented cutover — do not run both; do not teach Target as Living yet |

### Allowed non-duplication (pointers OK)

- Archive stubs ARCH-003 / 020 / 021 pointing at Living docs  
- Deprecation register rows naming deleted paths  
- GUIDE-006 replacement table for GUIDE-007…014  

## Sync fixes applied this audit

1. ARCH-015 → `tech-stack/ARCH-018` · `ARCH-019`  
2. ARCH-018 / ARCH-019 relative paths to frontend + `.cursor` + FFT-MOD-001  
3. FFT-MOD-006 → `tech-stack/ARCH-018`  
4. RB-005 deprecation links (`../../.cursor/...`)  
5. docs/README how-to-read deduped  
6. frontend/README FFT link deduped  

## Remaining intentional broken targets

| Link | Why |
|------|-----|
| `proxy.ts` from frontend ARCH docs | Product tree may be wiped / Target — tracked in GUIDE-004 drift |
| `modules/platform/shell/access.ts` | Same — noted as drift, not Living path invent |

## Checklist

- [x] Documentation files discovered (living tree)  
- [x] Retired homes absent on disk  
- [x] Duplication / SSOT violations listed  
- [x] High-severity broken links in living architecture/runbooks fixed  
- [ ] Commit deletions so git HEAD matches working tree  
- [ ] Optional: tighten ARCH-015/018/019 “one job” prose  
- [ ] Optional: REGISTER intro sync  

## Next steps

1. **Commit** docs consolidation (ADR/GUIDE deletions + merges) so HEAD = working tree.  
2. Do **not** `git checkout` restore `docs/adr`, `docs/fft`, GUIDE-007…014, or FFT depth folders.  
3. Treat this scratch file as evidence only — not Living SSOT.
