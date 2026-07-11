# Frontend ADR-001 — Feed Farm Trade module

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-11 |
| **Deciders** | Portal rebuild program |
| **Namespace** | `doc/frontend/adr/` (not Backend ADR-001) |
| **Pair** | [001A architecture](001A-feed-farm-trade-architecture.md) · [001R roadmap](001R-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../../.cursor/skills/feed-farm-trade/SKILL.md) |

```text
LOAD: product locks, access, naming, scope, MVP definition
SKIP: folder/flow detail → 001A · phase checklists / gap IDs → 001R
```

---

## Context

3F operators (feedmills, farmers, Feed · Farm · Food) need a **trade-sales** lane beside Declarations: time-boxed events, orders, allocation, ops handoff — one portal, not a second app, and not an end-customer storefront yet.

The engine is already **Hot Sales**. Product identity and shell drifted (`TradeShell`, `/trade/[locale]`) away from shared AdminCN. We need a durable product decision without renaming ops flags.

## Decision

**Feed Farm Trade** is the product module for B2B feed & farm trade sales inside the operator portal.

| Lock | Choice |
|------|--------|
| UI / nav name | Feed Farm Trade |
| Engine / env / ops docs | Hot Sales — keep `HOT_SALES_*`; living SSOT `docs/hot-sales/` ([RUNTIME](../../../docs/hot-sales/RUNTIME.md), [gate-register](../../../docs/hot-sales/ops/gate-register.md)); rename only via new ADR |
| Actors | Operator sales + ops (not the operator’s end customers) |
| Shell | Shared AdminCN on `/trade/*`; entitlement `feed-farm-trade` |
| Paths | Locale-free `/trade` (no `/trade/[locale]`) |
| Entry | `requireTradeAccess` — org admin alone does **not** grant |
| Permissions | Codes in `modules/trade/domain/rbac-catalog.ts` |
| Domain | `modules/trade` + `app/actions/trade.ts` |
| UI home | `features/trade/*` under AdminCN layout — never mount `TradeShell` / locale switcher |
| Out of scope | Declarations; Neon Auth chrome; ERP as ledger; **customer portal**; pixel polish beyond MVP |

**MVP bar (satisfactory enterprise grade):** P0 + P1 in [001R](001R-feed-farm-trade-roadmap.md).

That is a **working** cycle for entitled staff — not documentation theater, not P2 UI polish, not P3 flag-gated ops. P1 is **not** “events + orders + allocate” alone; it includes engine-backed **priority, supply, custom fields, transfers, order complete, and audit** (001R G1–G6).

## Consequences

**Positive:** Clear product vs engine names; shared shell; hard module gate; Hot Sales domain/RBAC stay valid; MVP matches how allocation sales actually run.

**Costs:** Dual naming until a rename ADR; `/trade` URL stays technical; full AdminCN polish waits for P2; P3 prod flag enable still requires gate-register (ops authority is restored — see 001R G0).

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Separate trade app | Premature; shared auth/DB |
| Keep “Hot Sales” in product UI | Wrong 3F positioning |
| Rename `HOT_SALES_*` now | Breaks gate-register / prod ops |
| Fold into Declarations | Compliance ≠ commercial windows |
| Org admin ⇒ module access | Over-grants sales |
| Restore TradeShell / locale URLs | Breaks AdminCN platform shell |
| Customer portal in same slice | Wrong actor / series branch |
| MVP = events/orders/alloc only | Omits priority/supply/transfer/complete/fields/audit already in engine |

## Follow-up

| Item | Where |
|------|-------|
| Structure, vertical slice, trusted files | [001A](001A-feed-farm-trade-architecture.md) |
| Phases, gaps G0–G9, DoD | [001R](001R-feed-farm-trade-roadmap.md) |
| Code vs arch matrix | [skill completeness](../../../.cursor/skills/feed-farm-trade/completeness.md) |
| Engine ops / flags | [docs/hot-sales/RUNTIME.md](../../../docs/hot-sales/RUNTIME.md) |

## References

- [001A-feed-farm-trade-architecture.md](001A-feed-farm-trade-architecture.md)
- [001R-feed-farm-trade-roadmap.md](001R-feed-farm-trade-roadmap.md)
- [../06-admincn-alignment.md](../06-admincn-alignment.md)
- `docs/hot-sales/RUNTIME.md` · `docs/hot-sales/ops/gate-register.md`
- `modules/platform/shell/access.ts` · `modules/trade/domain/access.ts` · `app/trade/layout.tsx`
- `modules/trade/domain/rbac-catalog.ts` · `app/actions/trade.ts`
- `components-V2/platform-config/navConfig.tsx`
