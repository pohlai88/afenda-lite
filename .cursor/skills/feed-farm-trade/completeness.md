# Feed Farm Trade — completeness (architecture vs codebase)

**Updated:** 2026-07-11 (skill upgraded to enterprise delivery pack)

**SSOT trio:** [001](../../../doc/frontend/adr/001-feed-farm-trade.md) · [001A](../../../doc/frontend/adr/001A-feed-farm-trade-architecture.md) · [001R](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md)

**Per-phase evaluation:** [P0](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [P1](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md) · [P2](../../../doc/frontend/13-feed-farm-trade-phase2-ui-polish.md) · [P3](../../../doc/frontend/14-feed-farm-trade-phase3-ops-flags.md)

**Skill delivery pack:** [slice-playbook](slice-playbook.md) · [action-map](action-map.md) · [rbac-card](rbac-card.md) · [verify](verify.md) · [example-slice](example-slice.md)

Legend: `done` · `partial` · `missing` · `residue`

| Area | Status | Notes |
|------|--------|-------|
| P0 AdminCN + `requireTradeAccess` | done | `app/trade/layout.tsx` |
| P0 nav `feed-farm-trade` | done | `navConfig.tsx` |
| Locale-free `/trade` routes | done | No live `app/trade/[locale]` |
| `docs/hot-sales/` G0 | done | Restored |
| Domain + `app/actions/trade.ts` | done | Engine present |
| P1 FE wire (events/setup/order/alloc) | done | Thin pages → `features/trade` |
| G1–G6 FE surfaces | done | Wired; permission codes on mutations; audit.view on setup panel |
| TradeShell / locale switcher | done | Do not remount |
| API catalog locale-free | done | `doc/api/02-rest-resources.md` |
| Skill pack (guardrails only) | superseded | Replaced by delivery pack below |
| Skill pack (enterprise delivery) | done | playbook + action-map + rbac + verify + example |
| P3 deposits/pickup/imports/ERP | partial | Placeholder; flag-gated |
| Enterprise MVP claimable | done | Unit AC gates + `@journey` G1–G8 green (2026-07-11); team/all order scopes still later |

Actions still accept `TradeLocale` (`TRADE_UI_LOCALE`); paths are locale-free.

**Note:** `docs/hot-sales/RUNTIME.md` code map may still cite legacy `[locale]` / `TradeShell` / `lib/domain/trade` paths — prefer this skill + 001A for FE/module paths; raise RUNTIME drift to Hot Sales ops lane separately.
