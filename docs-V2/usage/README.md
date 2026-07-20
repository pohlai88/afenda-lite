# Org usage position (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/usage/README.md` |
| Authority | **Scratch** — `@afenda/admin/usage` living SSOT |
| Purpose | Tenant (org) capacity position matrix — not entitlements / module sell |
| Updated | 2026-07-20 |

DNA borrow/reject: [usage-position-dna.md](usage-position-dna.md).

## Living posture

| Need | Surface |
|------|---------|
| Org usage position | [`@afenda/admin/usage`](../../packages/control-plane/admin) — `getOrganizationUsageMetrics` · `buildUsagePosition` |
| Period bounds | `usagePeriodUtcBounds` · `YYYY-MM` UTC half-open |
| Ops kill switches | [`@afenda/env`](../../packages/foundation/env) — see [entitlements](../entitlements/README.md) |
| Prometheus scrape | [`@afenda/metrics`](../../packages/runtime/metrics) — **not** this pack |

## Must not

- Create `@afenda/org-usage` until extract triggers in the DNA fire
- Sell / gate by module SKU or `suggestedTier`
- Invent meters without live counters
- Confuse usage position with progressive-delivery flags or Prometheus

## Verify

```bash
pnpm --filter @afenda/admin test
# expect buildUsagePosition + getOrganizationUsageMetrics matrix shape
```

DAG: [../monorepo/README.md](../monorepo/README.md) · Observability: [../observability/README.md](../observability/README.md).
