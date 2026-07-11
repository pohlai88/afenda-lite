---
name: feed-farm-trade
description: >-
  Feed Farm Trade (FFT) enterprise delivery skill for /trade on AdminCN +
  modules/trade + app/actions/trade. Use when coding, verifying, or evaluating
  Feed Farm Trade / Hot Sales engine work, trade RBAC, events/orders/allocation,
  P0–P3 slices, G1–G6 MVP gaps, or AC evidence for enterprise MVP claims.
---

# Feed Farm Trade

**Product:** Feed Farm Trade · **Shell id:** `feed-farm-trade` · **Engine:** Hot Sales (`HOT_SALES_*`)

## Borrowed workflows (do not re-invent)

| Need | Borrow from | FFT adaptation |
|------|-------------|----------------|
| Thin vertical slices | `incremental-implementation` | One capability (F-\*) per cycle — see [slice-playbook.md](slice-playbook.md) |
| Proof before done | `test-driven-development` | AC evidence required — see [verify.md](verify.md) |
| Right context | `context-engineering` | Load card below — max focused files |
| Adapter / ActionResult | `portal-api-contract` | Trade returns `TradeActionResult` + `getTradeActionError` |
| Route / UI homes | `portal-frontend-scaffold` + `admincn-customization` | Thin `app/trade` + `features/trade` |

External ecosystem (`deliver-acceptance-criteria`) patterns are **folded into** [verify.md](verify.md) — do not install a second skill for AC.

## SSOT

| Need | Path |
|------|------|
| Locks | [doc/frontend/adr/001-feed-farm-trade.md](../../../doc/frontend/adr/001-feed-farm-trade.md) |
| Architecture | [doc/frontend/adr/001A-feed-farm-trade-architecture.md](../../../doc/frontend/adr/001A-feed-farm-trade-architecture.md) |
| Roadmap | [doc/frontend/adr/001R-feed-farm-trade-roadmap.md](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md) |
| Phase specs (evaluation) | [P0](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [P1](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md) · [P2](../../../doc/frontend/13-feed-farm-trade-phase2-ui-polish.md) · [P3](../../../doc/frontend/14-feed-farm-trade-phase3-ops-flags.md) |
| Slice playbook | [slice-playbook.md](slice-playbook.md) |
| F-\* → action map | [action-map.md](action-map.md) |
| Permission codes | [rbac-card.md](rbac-card.md) |
| Verify + AC evidence | [verify.md](verify.md) |
| Worked example | [example-slice.md](example-slice.md) |
| Completeness matrix | [completeness.md](completeness.md) |
| Copy-paste command sheet | [command-sheet.md](command-sheet.md) |
| UI registry (HITL IDs) | [ui-registry.md](ui-registry.md) · [ui-registry.json](ui-registry.json) · rule [`fft-ui-registry.mdc`](../../rules/fft-ui-registry.mdc) — **compulsory** `ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` |
| Ops flags | [docs/hot-sales/RUNTIME.md](../../../docs/hot-sales/RUNTIME.md) · gate-register |

## Load card (coding)

| Task | Load first |
|------|------------|
| Locks / naming | **001 only** |
| Structure | **001A** + [architecture.md](architecture.md) |
| Coding a P0 gate | Phase [11](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) + [verify.md](verify.md) |
| Coding a P1 capability | Phase [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md) + [action-map.md](action-map.md) + [rbac-card.md](rbac-card.md) + [example-slice.md](example-slice.md) |
| Claiming MVP done | [verify.md](verify.md) AC evidence protocol — **required** |
| P2 polish | **Complete 2026-07-11** (AC-01..06) — further polish only with named P2-AC + Plan for visual ([13](../../../doc/frontend/13-feed-farm-trade-phase2-ui-polish.md)) |
| P3 ops / flags | [14](../../../doc/frontend/14-feed-farm-trade-phase3-ops-flags.md) + RUNTIME — **no prod flag without gate-register** |

```text
DO NOT: TradeShell, /trade/[locale], customer portal, invent permission codes,
  rename HOT_SALES_*, org-admin⇒trade, Trade↛Declarations imports,
  claim enterprise MVP without AC evidence, mix P3 writes into P1 PRs
MVP = P0 + P1 including G1–G6 + recorded AC evidence
```

## Mandatory coding workflow

Copy and track:

```text
FFT slice:
- [ ] 1. Name phase (P0 | P1 | P2 | P3) + F-* / AC-* / P2-AC-* IDs from phase doc
- [ ] 2. Load action-map row + rbac-card codes (never role names)
- [ ] 3. Confirm P3? → flag + permission; P2? → named P2-AC only (no new domain/RBAC); else stay on P1 actions only
- [ ] 4. Implement vertical slice (page → feature → action → domain) — P2: UI only
- [ ] 5. Run verify.md commands for touched AC
- [ ] 6. Record evidence (test path or journey) before claiming done
- [ ] 7. Update completeness.md if status changed
```

Full steps: [slice-playbook.md](slice-playbook.md).

## Architecture (one screen)

```text
Identity ──► Trade (modules/trade)     Trade ↛ Declarations
Platform shell: feed-farm-trade via requireTradeAccess
UI chrome: AdminCnShell only · nav moduleId feed-farm-trade
```

| Layer | Path |
|-------|------|
| Routes | `app/trade/**` thin RSC, locale-free |
| UI | `features/trade/*` |
| Actions | `app/actions/trade.ts` |
| Domain | `modules/trade/**` |
| RBAC | `modules/trade/domain/rbac-catalog.ts` |
| Session | `requireTradeAccess` / `requireTradePermission` |

## Vertical slice

```text
RSC read?        → modules/trade domain (never fetch own /api)
Client mutation? → trade.ts → Zod → requireTradePermission(code) → domain → TradeActionResult
HTTP external?   → Route Handler per doc/api (contract-only)
```

## FE / BE / API rules

1. Thin `page.tsx` — await `params`; no business logic  
2. AdminCN from `app/trade/layout.tsx` only  
3. Never mount `TradeShell` / locale switcher  
4. Copy: **Feed Farm Trade**; paths locale-free; pass `TRADE_UI_LOCALE`  
5. Domain SQL only in `modules/trade`; parameterized queries  
6. Authorize with **permission codes** via `requireTradePermission`  
7. Portal UI → Actions first; branded ids align route + Zod  

## Forbidden

- Customer portal in FFT PRs  
- Org admin alone grants trade  
- Inventing RBAC codes  
- Renaming `HOT_SALES_*` without new ADR  
- P3 prod enable without gate-register  
- Claiming enterprise MVP without P0+P1 AC evidence (G1–G6)  
- Wiring deposit/pickup/ERP/notification **writes** into a P1-only PR  

## Cross-skills

- [portal-frontend-scaffold](../portal-frontend-scaffold/SKILL.md)  
- [portal-api-contract](../portal-api-contract/SKILL.md)  
- [portal-lib-ownership](../portal-lib-ownership/SKILL.md)  
- [admincn-customization](../admincn-customization/SKILL.md)  
- [incremental-implementation](../agent-skills/skills/incremental-implementation/SKILL.md)  
- [test-driven-development](../agent-skills/skills/test-driven-development/SKILL.md)  
- [api-and-interface-design](../agent-skills/skills/api-and-interface-design/SKILL.md)  
