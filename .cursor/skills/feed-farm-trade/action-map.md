# FFT — action map (F-\* ↔ action ↔ route ↔ feature)

**Trusted source for signatures:** `app/actions/fft.ts` · **Permissions:** [rbac-card.md](rbac-card.md) · **AC:** phase [12](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md).

Locale: all actions take `locale` first; UI passes `FFT_UI_LOCALE` from `features/fft/trade-ui-locale.ts`. Paths stay locale-free.

---

## P0 — Shell (no trade actions)

| ID | Concern | Code |
|----|---------|------|
| F-ACC-01..05 | Gate + AdminCN + nav | `app/fft/layout.tsx` · `requireFftAccess` · `navConfig` `fft` · `modules/platform/shell/access.ts` |

---

## P1 — Core cycle (MVP)

| ID / Gap | Action(s) | Gate (typical) | Route | Feature |
|----------|-----------|----------------|-------|---------|
| F-EVT-01 list | domain `listEvents` (RSC) | layout gate | `/fft/events` | page |
| F-EVT-02 create | `createTradeEventAction` | `event.create` | `/fft/admin/events/new` | `trade-admin-forms` |
| F-EVT-03 setup | `saveTradeEventSetupAction` | **`event.edit`** | `/fft/admin/events/[eventId]/setup` | `trade-setup-forms` |
| F-EVT-04 open/close | `openTradeEventAction` · `closeTradeEventAction` | `event.open_close` | setup | `TradeEventStatusActions` |
| F-EVT-06 / G7 | `cloneTradeEventAction` · `ensurePigletTemplateAction` · `activateScheduledTradeEventAction` | admin / `event.open_close` | setup + `/fft/admin/events` | `trade-clone-button` · `TradeEnsureTemplateButton` · status actions |
| F-SUP-01 / G2 | `saveTradeProductAction` (supply fields) | **`supply.manage`** | setup | `TradeProductForm` |
| F-FLD-01 / G5 | `saveTradeFieldDefAction` | **`custom_field.manage`** | setup | `TradeFieldDefForm` |
| F-PRI-01 / G1 | `importPriorityCsvAction` (+ list via RSC) | **`priority.manage`** | setup | `TradePriorityImportForm` |
| F-ORD-01..04 | `submitTradeOrderAction` · RSC lists | `order.create` / view scopes | `/fft/events/[eventId]/order` · `/fft/my-orders` | `trade-order-form` |
| F-ORD-05 / G4 | `completeTradeOrderAction` | admin or `pickup.manage` path — see action body | my-orders / allocation | page forms · `trade-allocation-controls` |
| F-XFR-01 / G3 | `requestTransferAction` | `transfer.request` | `/fft/my-orders` | `trade-transfer-forms` |
| F-XFR-02 / G3 | `approveTransferAction` · `rejectTransferAction` | **`transfer.approve`** | my-orders / admin | `trade-transfer-forms` |
| F-ALC-01..02 | `previewTradeAllocationAction` · `runTradeAllocationAction` | **`allocation.preview`** / **`allocation.run`** | `/fft/admin/events/[eventId]/allocation` | `trade-allocation-controls` |
| F-ALC-03 / G9 | `manualAdjustTradeOrderAction` | **`allocation.override`** (sensitive) | allocation | `trade-allocation-controls` (override form gated) |
| F-AUD-01 / G6 | RSC `listAuditForEvent` | **`audit.view`** (setup panel via `hasTradeEventManagePermission`) | setup | `trade-audit-panel` |
| F-ADM-01 | `addSalesMemberAction` | admin | `/fft/admin/events` | `trade-sales-member-form` |
| F-ADM-02 | `seedTradeRbacCatalogAction` · `createTradeRoleAction` · `setTradeRolePermissionsAction` · `assignTradeRoleAction` · … | **`role.manage`** (sensitive) | rbac | `trade-rbac-admin` |
| F-ADM-03 / G8 | `exportOrdersCsvAction` · `exportEventSummaryCsvAction` · `exportAllocationCsvAction` | **`export.orders`** | setup | `trade-export-panel` |

---

## P3 — Ops (do not mix into P1 MVP PRs)

| Cap | Flag | Action(s) | Gate | Route | Feature |
|-----|------|-----------|------|-------|---------|
| Deposits | `FFT_DEPOSIT_ENABLED` | `listEventDepositsAction` · `recordDepositReceiptAction` · `recordDepositAdjustmentAction` · `updateDepositDetailsAction` | `deposit.view` / **`deposit.manage`** | `.../deposits` | `trade-deposit-forms` |
| Pickup | `FFT_PICKUP_OPS_ENABLED` | `createPickupWindowAction` · `schedulePickupAction` · `recordPickupFulfillmentAction` · `recordPickupExceptionAction` | `pickup.view` / `pickup.manage` | `.../pickup` | `trade-pickup-forms` |
| Imports | (dry-run always; type-gated) | `getImportTemplateAction` · `uploadImportDryRunAction` · `confirmImportBatchAction` · `cancelImportBatchAction` · `getImportBatchDetailAction` | type → perm map in action | `.../imports` | `trade-import-panel` |
| ERP | `FFT_ERP_SYNC_ENABLED` | `retryErpSyncJobAction` · `processErpSyncJobsAction` | **`sync.retry`** / `export.finance` | `/fft/admin/erp-sync` | `trade-erp-sync-panel` |
| Notifications | `FFT_NOTIFICATIONS_ENABLED` | domain send path (not primary FE MVP) | — | — | — |

Placeholders may render when flags are off — **writes must stay blocked**.

---

## Maintenance

When adding an action: update this table + [rbac-card.md](rbac-card.md) if a new code is approved via ADR (do not invent codes here).
