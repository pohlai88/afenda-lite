# FFT — verify + AC evidence protocol

**Borrow:** `test-driven-development` (proof) · ecosystem `deliver-acceptance-criteria` (observable Given/When/Then — folded here, not installed).

**Bar:** Enterprise MVP = P0 + P1 (G1–G6) **with recorded evidence**. Wiring alone ≠ done ([001R](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md)).

## Commands

```bash
# Domain + session unit (primary)
npm run test:unit -- modules/fft

# Focused examples
npm run test:unit -- modules/fft/auth/fft-session
npm run test:unit -- modules/fft/domain/rbac
npm run test:unit -- modules/fft/domain/trade
npm run test:unit -- modules/fft/domain/access
npm run test:unit -- modules/fft/domain/trade-action-result
npm run test:unit -- modules/fft/domain/trade-action-error-contract

# Interaction (feature forms)
npm run test:interaction -- features/fft

# E2E
npm run test:e2e:smoke    # trade ingress / auth
npm run test:e2e:journey  # full cycle when creds available — e2e/trade-fft.spec.ts

# Residue guards
rg "FftShell|locale-switcher|trade/\[locale\]" features/fft app/trade

# UI registry Layer A + Layer B (inventory + DNA / surfaces)
npm run check:fft-ui-registry
npm run check:fft-ui-registry:expect-fail   # intentional red demo
npm run test:unit -- features/fft/ui-registry
```

Env: `npm run env:compose` before E2E. Identities: see `AGENTS.md` / RUNTIME — do not conflate `SHARED_ADMIN_EMAIL` with sales allowlist.

## Existing test inventory (map loosely to AC)

| Area | Tests |
|------|-------|
| Session / deny | `modules/fft/auth/fft-session.test.ts` |
| P1 AC permission gates | `modules/fft/auth/trade-p1-ac-gates.test.ts` (G1–G6 / G8–G9 codes) |
| Access | `modules/fft/domain/access.test.ts` |
| RBAC catalog / roles | `modules/fft/domain/rbac.test.ts` · `rbac-audit.test.ts` |
| Core trade domain | `modules/fft/domain/trade.test.ts` |
| Action result shapes | `trade-action-result.test.ts` · `trade-action-error-contract.test.ts` |
| P3 domain (flag lane) | `deposit.test.ts` · `pickup.test.ts` · import/erp/notification `*.test.ts` |
| E2E | `e2e/trade-fft.spec.ts` (`@smoke`, `@journey`) |

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
AC-PRI-01: PASS | modules/fft/domain/….test.ts | 2026-07-11
```

Fill phase-doc **Result** columns when evaluating: [11](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md).

## Claim gates

| Claim | Required |
|-------|----------|
| Slice done | Evidence for every AC in that slice |
| Enterprise MVP | All P0 + P1 AC rows evidenced (incl. G1–G6); residue checks clean |
| P3 ready | Flag-off AC-OPS-01 + gate-register for any prod `true` |

**Forbidden:** marking completeness `Enterprise MVP claimable = done` without evidence block above.

## Evidence log (Enterprise MVP — 2026-07-11)

```text
LOCAL_OPS_COMPLETE: PASS | env:compose all four P3 flags=true; admin setup nav + deposits/pickup/imports/ERP real panels; e2e/fft-ops-local.spec.ts @journey 1/1; modules/fft 185/185; UI registry OK; no Vercel/prod sync | 2026-07-11
LOCAL_OPS_PERMISSION: PASS | hasFftPermission mirrors action guards: RBAC-off admin all; sales deposit.view only; deposit/pickup manage admin-only; fft-session 27/27 | 2026-07-11
P3_TODO_EXECUTE: PASS | processErpSyncJobsAction flag assert + FE wire deposits/pickup/imports/ERP (flag-off placeholder); modules/fft 183/183; check:fft-ui-registry OK; no prod flags | 2026-07-11
AC-OPS-01: PASS | processErpSyncJobsAction erp_sync_disabled before export.finance; deposit/pickup/ERP retry unchanged; FE flag-off placeholders | 2026-07-11
F-OPS-DEP/PICK/IMP/ERP FE: PASS (local wire) | pages mount panels when flag on; placeholder when off (imports always); setup nav links gated | 2026-07-11
UI_REGISTRY: PASS | v3 block upgrade: EVT-LIST pagination+filter DNA; ADM-FORMS+SALES-MEMBER FieldGroup vertical form DNA; surfaces Separator/Card; check:fft-ui-registry + 32 trade unit; expect-fail red OK; no prod flags | 2026-07-11
UI_REGISTRY: PASS | v3 Layer A+B; EVT-LIST→ACN-BLK-DATATABLES-DATATABLE-USER; surfaces events+admin/events; check:fft-ui-registry + ui-registry.test; no prod flags | 2026-07-11
UI_REGISTRY: PASS | v2 catalog ACN-UI 51 + ACN-BLK 153 + FFT-UI 21; ui-registry.test + docs/skills linked; human-only HITL; no prod flags | 2026-07-11
UI_REGISTRY: PASS | ui-registry.json seeded 21 approved; ui-registry.test.ts 9/9; human-only HITL; no prod flags | 2026-07-11
REVIEW_P3 (post-repair): PASS (eval only) | prior ungated ERP retry CLOSED (action+domain); AC-OPS-01 PASS; AC-OPS-02 BLOCKED; F-OPS-* Partial (FE placeholders); focused ERP tests + modules/fft 181/181; audit ok; no prod flags | 2026-07-11
IMPLEMENT_P3_FLAG_GATE: PASS | retryErpSyncJobAction + retrySyncJob gated by FFT_ERP_SYNC_ENABLED; sync.retry preserved; erp-sync-store + retry-erp-sync-job-action tests 6/6; modules/fft 181/181; audit:fft-promotion ok; no prod flags | 2026-07-11
AC-OPS-01: PASS | flag-off erp_sync_disabled + no SQL/audit (action+domain); deposit/pickup asserts unchanged; FE placeholders; no prod enable | 2026-07-11
F-OPS-ERP-02 / F-OPS-ERP-03: PASS (retry gate) | assertFftErpSyncFeatureAction + domain isFftErpSyncEnabled; FE panel still unwired | 2026-07-11
BOOTSTRAP_SYNC_CHECK: APPLIED | doc/skill sync approved — 001R MVP YES + P2 done; mvp-and-gaps; README; agent-workflow; completeness locale shim; phase13 ref; RUNTIME code map → modules/fft | 2026-07-11
BOOTSTRAP_SYNC_CHECK: PASS (inventory) | skill pack 10/10 + ADR/phase/README present; 001R↔11–14 linked; drift list logged (no product code) | 2026-07-11
EVALUATE_P1_MVP: YES | P0+P1 AC rows PASS; trade-p1-ac-gates+session+trade+priority-csv 107/107; residue=redirect-only [locale] shim (no FftShell); P2/P3 not required for MVP claim | 2026-07-11
REVIEW_P3: PASS (eval only) | AC-OPS-01 defaults PASS; AC-OPS-02 BLOCKED; FE ops=TradeOpsPlaceholder; deposit/pickup actions flag-gated; ERP retryErpSyncJobAction ungated vs FFT_ERP_SYNC_ENABLED (FAIL write gap); audit:fft-promotion ok; no prod flags changed | 2026-07-11
CLOSE_AC_EVIDENCE (all P1 TARGET unset→full checklist): PASS | trade-p1-ac-gates+trade+priority-csv+legacy-redirect 85/85; phase-12 AC rows already PASS; remaining unevidenced P1 ACs: none | 2026-07-11
Residue cleanup: PASS | deleted product [locale]/FftShell pages (already absent on disk); added redirect-only app/fft/[locale]/[[...path]] + legacy-locale-redirect tests; fixed import dry-run mock ok:true | 2026-07-11
P2-AC-06: PASS | P1 checklist re-run: modules/fft 173/173; trade-p1-ac-gates+domain+P2 models 102/102; phase-12 AC rows PASS; residue app/fft/[locale] FftShell pre-existing (not P2) | 2026-07-11
P2-AC-05: PASS | trade-form-controls FFT_NATIVE_* + TradeFormCheckbox; P1 forms/filters restyled to Declarations AdminCN Input DNA; deposit/pickup/import left for P3; rbac-catalog unchanged | 2026-07-11
P2-AC-03: PASS | trade-audit-filter-model actor/date filter + TradeAuditPanel controls on setup; audit.view unchanged; no new RBAC | 2026-07-11
P2-AC-02: PASS | paginateItems (pageSize 20) + TradeMyOrdersList + allocation order list pagination (client, no reload) | 2026-07-11
P2-AC-01: PASS | trade-events-list-model sort/filter + TradeEventsList on /fft/events + /fft/admin/events (client-side, no reload) | 2026-07-11
P2-AC-04: PASS | trade-form-feedback (error/pending/empty/skeleton) + setup/allocation empty states + loading.tsx; no RBAC/action changes | 2026-07-11
P3 / AC-OPS gate-register review: PASS (no enable) | audit:fft-promotion ok after modules/platform/env path fix; prod flags unchanged false; FE ops routes placeholder | 2026-07-11
AC-ALC-03 / G9: PASS | allocation.override distinct from preview/run; UI gated; qty cap + reason; manualAdjustTradeOrderAction | 2026-07-11
AC-EVT-05 / G7: PASS | clone→draft editable; buildGp2PigletTemplate seed; canActivateScheduledEvent; clone/ensure UI + admin list; journey clone | 2026-07-11
AC-ADM-01..03 / G8: PASS | export.orders + role.manage gates; sales-member admin form; rbac page gated; export CSV domain + journey | 2026-07-11
AC-AUD-01 / G6: PASS | trade-p1-ac-gates (audit.view + hasTradeEventManagePermission hide/show) + setup TradeAuditPanel + journey Audit heading | 2026-07-11
AC-ORD-05 / G4: PASS | canCompleteOrder + pickup.manage gate + completeTradeOrderAction (admin|pickup path) + journey complete | 2026-07-11
AC-ALC-01..02: PASS | trade-p1-ac-gates (allocation.preview|run) + calculateAllocation / sortOrdersForAllocation + journey run | 2026-07-11
AC-XFR-01..02 / G3: PASS | trade-p1-ac-gates (transfer.request|approve) + canTransferOrder + journey approve path | 2026-07-11
AC-ORD-01..04: PASS | trade-p1-ac-gates (order.create|view_own) + canSubmitOrder window + my-orders salesperson scope | 2026-07-11
AC-PRI-01 / G1: PASS | trade-p1-ac-gates (priority.manage) + priority-csv.test.ts + sortOrdersForAllocation | 2026-07-11
AC-FLD-01 / G5: PASS | trade-p1-ac-gates (custom_field.manage) + sanitizeFieldKey + requiredCustomFields lock + validateOrderAttrs | 2026-07-11
AC-SUP-01 / G2: PASS | modules/fft/auth/trade-p1-ac-gates.test.ts (supply.manage) + trade.test.ts final qty lock + allocation supply cap | 2026-07-11
AC-EVT-02..04 gates: PASS | modules/fft/auth/trade-p1-ac-gates.test.ts (event.create|edit|open_close) | 2026-07-11
AC-EVT open/close domain: PASS | modules/fft/domain/trade.test.ts::canOpenEvent / canCloseEvent | 2026-07-11
AC-G1..G8 cycle: PASS | e2e/trade-fft.spec.ts @journey (3/3) | 2026-07-11
AC permission gates: PASS | modules/fft/auth/trade-p1-ac-gates.test.ts | 2026-07-11
AC transfer/complete domain: PASS | modules/fft/domain/trade.test.ts | 2026-07-11
Unit suite: PASS | npm run test:unit -- modules/fft (138) | 2026-07-11
```

## Quick pre-merge checklist

- [ ] `requireFftPermission` / layout gate on mutations  
- [ ] Zod at action edge; no raw SQL in actions  
- [ ] No FftShell / `[locale]`  
- [ ] P3 actions not newly enabled without flags  
- [ ] Unit and/or journey evidence listed  
- [ ] [completeness.md](completeness.md) updated if needed  
