# FFT — RBAC card

**SSOT:** `modules/fft/domain/rbac-catalog.ts` — if this file disagrees with the table below, **trust the TypeScript catalog**.

## Hard rule

```text
Authorize with permission codes via requireFftPermission(code)
NEVER: if (roleName === "Sales Manager") …
NEVER: if (templateKey === "sales_executive") … in business logic
Role templates are seed data only.
```

## Session helpers

| Helper | Use |
|--------|-----|
| `requireFftAccess` | Layout / entry — module entitlement |
| `requireFftPermission(code, opts?)` | Mutations — preferred |
| `requireFftAdmin` | Legacy/admin-heavy actions still in `trade.ts` — prefer migrating to codes when touching |

Org admin alone does **not** grant `fft`.

## Permission catalog (product-owned)

| Code | Sensitive | Typical MVP use |
|------|-----------|-----------------|
| `event.view` | | List/detail |
| `event.create` | | Create event |
| `event.edit` | | Setup |
| `event.open_close` | | Open/close/activate |
| `product.manage` | | Products |
| `supply.manage` | | **G2** supply caps |
| `priority.manage` | | **G1** priority CSV |
| `custom_field.manage` | | **G5** field defs |
| `order.create` | | Submit order |
| `order.view_own` | | My orders |
| `order.view_team` | | Team scope |
| `order.view_all` | | All orders |
| `allocation.preview` | | Preview |
| `allocation.run` | | Run allocation |
| `allocation.override` | **yes** | **G9** manual adjust |
| `transfer.request` | | **G3** (default sales_executive includes this) |
| `transfer.approve` | | **G3** approve/reject |
| `deposit.view` | | P3 |
| `deposit.manage` | **yes** | P3 |
| `pickup.view` | | P3 |
| `pickup.manage` | | P3 (+ some complete paths) |
| `export.orders` | | **G8** exports |
| `export.finance` | | P3 ERP process |
| `sync.retry` | **yes** | P3 ERP retry |
| `audit.view` | | **G6** |
| `role.manage` | **yes** | F-ADM-02 |

Sensitive grants require explicit attach + RBAC audit (`isSensitivePermission`).

## Default templates (seed only — not auth ifs)

| templateKey | Notes |
|-------------|-------|
| `super_admin` / `client_admin` | All codes |
| `sales_executive` | Includes `transfer.request`, `order.create`, `order.view_own`, … |
| `sales_supervisor` | + `order.view_team` |
| `sales_manager` | + `order.view_all`, `allocation.preview`, `export.orders` |
| `viewer` | Read-ish codes including `audit.view` |

## Agent checks

- [ ] New mutation calls `requireFftPermission("<code>")` with a catalog code  
- [ ] No new code strings invented in the PR  
- [ ] Sensitive codes called out in PR notes when granted in UI  
- [ ] P3 codes not exercised without flag guards  
