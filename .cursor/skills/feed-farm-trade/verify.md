# FFT — verify + AC evidence protocol

**Borrow:** `test-driven-development` (proof) · ecosystem `deliver-acceptance-criteria` (observable Given/When/Then — folded here, not installed).

**Bar:** Enterprise MVP = P0 + P1 (G1–G6) **with recorded evidence**. Wiring alone ≠ done ([001R](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md)).

## Commands

```bash
# Domain + session unit (primary)
npm run test:unit -- modules/trade

# Focused examples
npm run test:unit -- modules/trade/auth/trade-session
npm run test:unit -- modules/trade/domain/rbac
npm run test:unit -- modules/trade/domain/trade
npm run test:unit -- modules/trade/domain/access
npm run test:unit -- modules/trade/domain/trade-action-result
npm run test:unit -- modules/trade/domain/trade-action-error-contract

# Interaction (feature forms)
npm run test:interaction -- features/trade

# E2E
npm run test:e2e:smoke    # trade ingress / auth
npm run test:e2e:journey  # full cycle when creds available — e2e/trade-hot-sales.spec.ts

# Residue guards
rg "TradeShell|locale-switcher|trade/\[locale\]" features/trade app/trade
```

Env: `npm run env:compose` before E2E. Identities: see `AGENTS.md` / RUNTIME — do not conflate `SHARED_ADMIN_EMAIL` with sales allowlist.

## Existing test inventory (map loosely to AC)

| Area | Tests |
|------|-------|
| Session / deny | `modules/trade/auth/trade-session.test.ts` |
| P1 AC permission gates | `modules/trade/auth/trade-p1-ac-gates.test.ts` (G1–G6 / G8–G9 codes) |
| Access | `modules/trade/domain/access.test.ts` |
| RBAC catalog / roles | `modules/trade/domain/rbac.test.ts` · `rbac-audit.test.ts` |
| Core trade domain | `modules/trade/domain/trade.test.ts` |
| Action result shapes | `trade-action-result.test.ts` · `trade-action-error-contract.test.ts` |
| P3 domain (flag lane) | `deposit.test.ts` · `pickup.test.ts` · import/erp/notification `*.test.ts` |
| E2E | `e2e/trade-hot-sales.spec.ts` (`@smoke`, `@journey`) |

If an AC has **no** test: add a unit or journey assertion **before** claiming PASS (TDD). Prefer domain/permission unit tests for deny paths; journey for full cycle.

## Evidence format (required when claiming done)

For each AC touched:

```text
### AC-<id>
Given: <precondition — user, perm, event state>
When: <action — UI or action call>
Then: <observable result>
Evidence: <file::test name> OR e2e @tag OR manual steps + date
Result: PASS | FAIL | BLOCKED
```

Also acceptable one-liner for logs:

```text
AC-PRI-01: PASS | modules/trade/domain/….test.ts | 2026-07-11
```

Fill phase-doc **Result** columns when evaluating: [11](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md).

## Claim gates

| Claim | Required |
|-------|----------|
| Slice done | Evidence for every AC in that slice |
| Enterprise MVP | All P0 + P1 AC rows evidenced (incl. G1–G6); residue checks clean |
| P3 ready | Flag-off AC-OPS-01 + gate-register for any prod `true` |

**Forbidden:** marking completeness `Enterprise MVP claimable = done` without evidence block above.

## Quick pre-merge checklist

- [ ] `requireTradePermission` / layout gate on mutations  
- [ ] Zod at action edge; no raw SQL in actions  
- [ ] No TradeShell / `[locale]`  
- [ ] P3 actions not newly enabled without flags  
- [ ] Unit and/or journey evidence listed  
- [ ] [completeness.md](completeness.md) updated if needed  
