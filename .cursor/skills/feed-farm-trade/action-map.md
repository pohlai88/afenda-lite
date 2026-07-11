# FFT — action map (F-\* ↔ action ↔ route ↔ feature)

**Trusted source for signatures:** `app/actions/trade.ts` · **Permissions:** [rbac-card.md](rbac-card.md) · **AC:** phase [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md).

Locale: all actions take `locale` first; UI passes `TRADE_UI_LOCALE` from `features/trade/trade-ui-locale.ts`. Paths stay locale-free.

---

## P0 — Shell (no trade actions)

| ID | Concern | Code |
|----|---------|------|
| F-ACC-01..05 | Gate + AdminCN + nav | `app/trade/layout.tsx` · `requireTradeAccess` · `navConfig` `feed-farm-trade` · `modules/platform/shell/access.ts` |

---

## P1 — Core cycle (MVP)

| ID / Gap | Action(s) | Gate (typical) | Route | Feature |
|----------|-----------|----------------|-------|---------|
| F-EVT-01 list | domain `listEvents` (RSC) | layout gate | `/trade/events` | page |
| F-EVT-02 create | `createTradeEventAction` | `event.create` | `/trade/admin/events/new` | `trade-admin-forms` |
| F-EVT-03 setup | `saveTradeEventSetupAction` | admin / setup | `/trade/admin/events/[eventId]/setup` | `trade-setup-forms` |
| F-EVT-04 open/close | `openTradeEventAction` · `closeTradeEventAction` | `event.open_close` | setup | `TradeEventStatusActions` |
| F-EVT-06 / G7 | `cloneTradeEventAction` · `ensurePigletTemplateAction` · `activateScheduledTradeEventAction` | admin / `event.open_close` | setup / admin | `trade-clone-button` · setup forms |
| F-SUP-01 / G2 | `saveTradeProductAction` (supply fields) | admin + `supply.manage` intent | setup | `TradeProductForm` |
| F-FLD-01 / G5 | `saveTradeFieldDefAction` | admin | setup | `TradeFieldDefForm` |
| F-PRI-01 / G1 | `importPriorityCsvAction` (+ list via RSC) | admin / `priority.manage` | setup | `TradePriorityImportForm` |
| F-ORD-01..04 | `submitTradeOrderAction` · RSC lists | `order.create` / view scopes | `/trade/events/[eventId]/order` · `/trade/my-orders` | `trade-order-form` |
| F-ORD-05 / G4 | `completeTradeOrderAction` | admin or `pickup.manage` path — see action body | my-orders / allocation | page forms · `trade-allocation-controls` |
| F-XFR-01 / G3 | `requestTransferAction` | `transfer.request` | `/trade/my-orders` | `trade-transfer-forms` |
| F-XFR-02 / G3 | `approveTransferAction` · `rejectTransferAction` | admin | my-orders / admin | `trade-transfer-forms` |
| F-ALC-01..02 | `previewTradeAllocationAction` · `runTradeAllocationAction` | admin / `allocation.run` | `/trade/admin/events/[eventId]/allocation` | `trade-allocation-controls` |
| F-ALC-03 / G9 | `manualAdjustTradeOrderAction` | **`allocation.override`** (sensitive) | allocation | `trade-allocation-controls` |
| F-AUD-01 / G6 | RSC `listAuditForEvent` | `audit.view` (enforce in UI/action if wrapped) | setup | audit section on setup page |
| F-ADM-01 | `addSalesMemberAction` | admin | `/trade/admin/rbac` | `trade-sales-member-form` |
| F-ADM-02 | `seedTradeRbacCatalogAction` · `createTradeRoleAction` · `setTradeRolePermissionsAction` · `assignTradeRoleAction` · … | **`role.manage`** (sensitive) | rbac | `trade-rbac-admin` |
| F-ADM-03 / G8 | `exportOrdersCsvAction` · `exportEventSummaryCsvAction` · `exportAllocationCsvAction` | admin / `export.orders` | setup | `trade-export-panel` |

---

## P3 — Ops (do not mix into P1 MVP PRs)

| Cap | Flag | Action(s) | Gate | Route | Feature |
|-----|------|-----------|------|-------|---------|
| Deposits | `HOT_SALES_DEPOSIT_ENABLED` | `listEventDepositsAction` · `recordDepositReceiptAction` · `recordDepositAdjustmentAction` · `updateDepositDetailsAction` | `deposit.view` / **`deposit.manage`** | `.../deposits` | `trade-deposit-forms` |
| Pickup | `HOT_SALES_PICKUP_OPS_ENABLED` | `createPickupWindowAction` · `schedulePickupAction` · `recordPickupFulfillmentAction` · `recordPickupExceptionAction` | `pickup.view` / `pickup.manage` | `.../pickup` | `trade-pickup-forms` |
| Imports | (dry-run always; type-gated) | `getImportTemplateAction` · `uploadImportDryRunAction` · `confirmImportBatchAction` · `cancelImportBatchAction` · `getImportBatchDetailAction` | type → perm map in action | `.../imports` | `trade-import-panel` |
| ERP | `HOT_SALES_ERP_SYNC_ENABLED` | `retryErpSyncJobAction` · `processErpSyncJobsAction` | **`sync.retry`** / `export.finance` | `/trade/admin/erp-sync` | `trade-erp-sync-panel` |
| Notifications | `HOT_SALES_NOTIFICATIONS_ENABLED` | domain send path (not primary FE MVP) | — | — | — |

Placeholders may render when flags are off — **writes must stay blocked**.

---

## Maintenance

When adding an action: update this table + [rbac-card.md](rbac-card.md) if a new code is approved via ADR (do not invent codes here).
