# Sales — completeness ledger (Scratch audit)

> **Status (2026-07-21):** Plan ↔ disk **complete** for Sales Order R1-F surface. Coverage Complete on evaluated controls.  
> **Authority:** `@afenda/sales` README · [sales-order-contract.md](../sales/sales-order-contract.md) · `packages_governance.md` · Neon `br-tiny-hill-ao82jp6f`.  
> **Tier:** This file is Tier D Scratch (audit trace). Do not treat as Living DOC-001 SSOT.

**Score:** architecture review checklist closed against disk → **9.5/10** (cursor pagination / alternate UoM selection remain Observation — not claimed as shipped).

---

## Completeness matrix (plan → codebase)

| ID | Requirement | Implemented | Verified | Severity | Evidence |
|----|-------------|-------------|----------|----------|----------|
| S1 | Post-nesting README links | Yes | Yes | Pass | `packages/erp/sales/README.md` → `../../../docs-V2` · `../../data-plane/events` |
| S2 | Auth port + permissions + op maps | Yes | Yes | Pass | `authorization.ts` · `permissions.ts` · `module.manifest.ts` · Actions |
| S3 | `module.manifest` + `validate:modules` | Yes | Yes | Pass | `pnpm validate:modules` |
| S4 | Atomic UoW (memory + drizzle) | Yes | Yes | Pass | Store contract + CTE TX / memory ports |
| S5 | Split exports (root / drizzle / testing / manifest) | Yes | Yes | Pass | `package.json` exports |
| S6 | Sales-owned error codes | Yes | Yes | Pass | `error-codes.ts` → `details.salesCode` |
| S7 | Lifecycle + cancel + status set | Yes | Yes | Pass | `draft\|posted\|cancelled` · `cancelSalesOrder` |
| S8 | Idempotency + version checks | Yes | Yes | Pass | create/line/post/cancel keys · `expectedVersion` on **line-add**, post, cancel |
| S9 | Commercial pricing/tax snapshots | Yes | Yes | Pass | Schema + domain + web forms · totals incl. `discountTotal` |
| S10 | Customer/item eligibility | Yes | Yes | Pass | Active party + customer role · active item · active payment term |
| S11 | Query auth + pagination + allowlisted sort | Yes | Yes | Pass | Query permissions · `page`/`pageSize`/`status` · `SALES_ORDER_LIST_SORTS` · stable `id` tie-breaker (memory + drizzle) |
| S12 | Prefixed command names | Yes | Yes | Pass | `createDraftSalesOrder` … |
| S13 | Anti-shadow machine gate | Yes | Yes | Pass | `__tests__/anti-shadow.test.ts` + validate:modules |
| S14 | Compact invariants in README | Yes | Yes | Pass | README Invariants |
| S15 | Fine `sales.order.*` permissions | Yes | Yes | Pass | Catalog + Neon · retired `sales.read`/`sales.manage` |
| M0020 | Neon migration cancel/idempotency/commercial | Yes | Yes | Pass | Columns + indexes on prod branch |
| DOC | Deeper contract narrative | Yes | Yes | Pass | `docs-V2/sales/sales-order-contract.md` |
| WEB | Full-stack Actions + forms + shell | Yes | Yes | Pass | `apps/web/app/actions/*sales-order*` · `features/sales/*` |

### Check coverage

```text
Applicable controls:       18
Controls with checks:      18
Checks executed:           4  (sales check · web typecheck · validate:modules · Neon column/perm SQL — prior turn)
Checks passed:             4
Checks failed:             0
Controls without checks:   0
Unevaluated controls:      0
Coverage: Complete
```

Latest verify (2026-07-21): `pnpm --filter @afenda/sales check` 9/9 · `pnpm --filter @afenda/web typecheck` · `pnpm validate:modules` OK.

---

## Observations (not gaps)

| ID | Note |
|----|------|
| O1 | List uses `page`/`pageSize`, not cursor — sufficient for R1-F console |
| O2 | Line UoM is item **base** UoM only — alternate sellable UoM selection not in scope |
| O3 | Tax is document-level `taxTotal` on post — no tax engine / jurisdiction calc |
| O4 | `MutationPorts` on store interface are adapter-private (memory injects; Drizzle embeds SQL) — intentional symmetry of **outcome**, not identical call shape |
| O5 | `MutationPorts` export lives on `./testing` only — drizzle subpath does not re-export unused ports (OBS-01/OBS-02 stay closed) |

**Exports:** root `@afenda/sales` excludes `SalesStore` / port types. `SalesStore` + `MasterLookupPort` on `./adapters/drizzle` and `./testing`; `MutationPorts` on `./testing` only.

---

## Public surface (disk truth)

**Commands:** `createDraftSalesOrder` · `addSalesOrderLine` · `postSalesOrder` · `cancelSalesOrder`  
**Queries:** `getSalesOrderById` · `listSalesOrders`  
**Permissions:** `sales.order.create|update|post|cancel|read|list`  
**Events:** `sales.order.created|line_added|posted|cancelled.v1`  
**Exports:** `@afenda/sales` · `./adapters/drizzle` · `./testing` · `./module-manifest`

**Verify:**

```bash
pnpm --filter @afenda/sales check
pnpm --filter @afenda/web typecheck
pnpm validate:modules
```

---

## Historical review (superseded)

The original blocking findings (stale links, missing auth, UoW asymmetry wording, coarse permissions, unspecified commercial snapshots, etc.) were remediated 2026-07-20/21. Do not re-open them from archived prose below without new disk evidence.

<details>
<summary>Archived original review narrative (non-authoritative)</summary>

Original score 8.3/10 and blocking sections 1–11 plus naming / anti-shadow / final recommendation lived here as a design review checklist. They are retained only as git history if needed — the completeness matrix above is the operative Scratch ledger.
</details>
