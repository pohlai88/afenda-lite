# `@afenda/sales`

`@afenda/sales` is Afenda-Lite's organization-scoped transactional Sales authority. It owns commercial pricing, quotations, sales orders, approvals and holds, release-to-fulfillment projections, and return authorizations.

Master records remain owned by `@afenda/master-data`. Sales copies immutable party, item, UoM, payment-term, currency, address, price, and tax snapshots onto commercial documents; it never writes or shadows `md_*` records. Inventory, tax, credit, fulfillment, receivables, and accounting integrations enter through typed ports or versioned events.

## Package boundaries

- Public server APIs are exported from `@afenda/sales`.
- Production persistence is exported only from `@afenda/sales/adapters/drizzle`.
- Test builders and the memory adapter are exported only from `@afenda/sales/testing`.
- Same-origin reads call package queries from RSC code. UI mutations use Server Actions that map `Result<T>` to `ActionResult<T>`.
- No transactional ERP peer package may be imported by this package.

## Capabilities

| Capability | Responsibility |
|---|---|
| Commercial pricing | Effective price books, condition precedence, deterministic decimal calculations, overrides, and calculation traces |
| Quotation management | Revisioned quotations, approval, sending, acceptance, expiry, cancellation, and idempotent conversion |
| Order management | Versioned order capture, line schedules, immutable snapshots, approval, confirmation, release, fulfillment progress, cancellation, and closure |
| Approvals and holds | Credit, availability, margin, compliance, and manual-review holds independent of document lifecycle |
| Return authorizations | Return intent, reasons, requested disposition, approval, cancellation, and downstream handoff |
| Integration projections | Atomic audit/outbox facts and fulfillment-safe order projections |

## Verify

```powershell
pnpm --filter @afenda/sales lint
pnpm --filter @afenda/sales typecheck
pnpm --filter @afenda/sales test
pnpm validate:modules
```

The implementation specification and traceable requirements live in [`docs-V2/_scratch/erp/sales`](../../../docs-V2/_scratch/erp/sales/README.md).
