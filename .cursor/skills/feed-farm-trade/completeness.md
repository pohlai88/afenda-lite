# Feed Farm Trade — completeness (architecture vs codebase)

**Updated:** 2026-07-11 (skill upgraded to enterprise delivery pack)

**SSOT trio:** [001](../../../doc/frontend/adr/001-feed-farm-trade.md) · [001A](../../../doc/frontend/adr/001A-feed-farm-trade-architecture.md) · [001R](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md)

**Per-phase evaluation:** [P0](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [P1](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md) · [P2](../../../doc/frontend/13-feed-farm-trade-phase2-ui-polish.md) · [P3](../../../doc/frontend/14-feed-farm-trade-phase3-ops-flags.md)

**Skill delivery pack:** [slice-playbook](slice-playbook.md) · [action-map](action-map.md) · [rbac-card](rbac-card.md) · [verify](verify.md) · [example-slice](example-slice.md)

Legend: `done` · `partial` · `missing` · `residue`

| Area | Status | Notes |
|------|--------|-------|
| P0 AdminCN + `requireFftAccess` | done | `app/fft/layout.tsx` |
| P0 nav `fft` | done | `navConfig.tsx` |
| Locale-free `/fft` routes | done | Product paths locale-free; redirect-only shim `app/fft/[locale]/[[...path]]` (no FftShell) |
| `docs/fft/` G0 | done | Restored |
| Domain + `app/actions/fft.ts` | done | Engine present |
| P1 FE wire (events/setup/order/alloc) | done | Thin pages → `features/fft` |
| G1–G6 FE surfaces | done | Wired; permission codes on mutations; audit.view on setup panel |
| F-ADM-01..03 / G8 | done | Sales-member admin form; `role.manage` rbac page; `export.orders` panel + gates |
| F-EVT-06 / G7 | done | Clone→draft; piglet template ensure; activate scheduled; admin + setup UI |
| F-ALC-03 / G9 | done | `allocation.override` distinct from preview/run; override form gated on allocation page |
| P2 UI polish | done | P2-AC-01..06 evidenced; legacy `/fft/{vi\|en}/**` → locale-free redirect shim (no FftShell) |
| P3 ops flags (code behind flags) | partial | Local smoke may use flags on; **prod promotion Closed (registered)** — [closed-scope-register](../../../doc/architecture/closed-scope-register.md) · [gate-register](../../../docs/fft/ops/gate-register.md) |
| FftShell / locale switcher | done | Do not remount |
| API catalog locale-free | done | `doc/api/02-rest-resources.md` |
| Skill pack (guardrails only) | superseded | Replaced by delivery pack below |
| Skill pack (enterprise delivery) | done | playbook + action-map + rbac + verify + example |
| UI registry governance | done | v2: 51 `ACN-UI-*` + 153 `ACN-BLK-*` + 21 `FFT-UI-*`; Vitest fail-fast; human HITL; ≠ visual quality |
| P3 deposits/pickup/imports/ERP surfaces | partial | Flag-gated UI OK; **prod flag enablement Closed (registered)** |
| Enterprise MVP claimable | done | Unit AC gates + `@journey` G1–G8 green (2026-07-11); team/all order scopes still later |

Actions still accept `TradeLocale` (`FFT_UI_LOCALE`); paths are locale-free.

**Note:** `docs/fft/RUNTIME.md` code map updated 2026-07-11 to `modules/fft` + locale-free `/fft` (legacy trees called out as non-entry).
