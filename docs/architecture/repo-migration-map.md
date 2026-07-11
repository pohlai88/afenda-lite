# Repository migration map

**Status:** closed  
**REPO_LAYOUT_CAMPAIGN_OPEN=false**

Layout campaign finished. Root = bootstrap, L1 = concern, L2 = bounded context.
Canonical layout notes: see `AGENTS.md` and surviving docs under `docs/architecture/`.

| From | To | Notes | Status |
| --- | --- | --- | --- |
| `lib/env/*` | `modules/platform/env/*` | Env manifest + runtime schema | done |
| `lib/governance/*` | `modules/platform/governance/*` | Reliance + UI matrix | done |
| `lib/routing/*` | `modules/platform/routing/*` | Portal routes + nav contract | done |
| `components/` (legacy) | `features/` + `components-V2/` | Hard-delete; no wholesale restore | done |
