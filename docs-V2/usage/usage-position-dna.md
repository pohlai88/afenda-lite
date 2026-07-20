# Usage-position DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/usage/usage-position-dna.md` |
| Authority | **Scratch** — monorepo-discipline · `@afenda/admin/usage` |
| Source DNA | `_reference/packages/saas` (`@vierp/saas`) — UsageSummary / alerts / pure check only |
| Updated | 2026-07-20 |

Borrow/reject for org capacity **position** (Afenda does not sell by module). Operator path: [README.md](README.md).

---

## Verdict

**Enrich `@afenda/admin/usage`** — do not create `@afenda/org-usage` or `@afenda/entitlements` for this concern. Absorb the reference’s usage-summary matrix shape; reject pricing, tiers, modules, proration, MRR, and `canPerformAction` / `suggestedTier`.

| Concern | Owner (today) |
|---------|----------------|
| Living counts + ops bands | [`@afenda/admin/usage`](../../packages/control-plane/admin) |
| Ops kill switches | [`@afenda/env`](../../packages/foundation/env) |
| Plan/module SKU gates | **Absent** — not product model |
| Prometheus instruments | [`@afenda/metrics`](../../packages/runtime/metrics) |

---

## Absorb (DNA → living)

| Idea | Afenda shape |
|------|----------------|
| `UsageSummary` metric cells | `{ current, band }` per living key |
| Alert ladder (75/90/exceeded) | Without SKU limits: `heavy` → `warning`, `critical` → `critical` |
| Pure sync check separate from I/O | `buildUsagePosition({ orgId, period, counts })` |
| Typed metric union | `activeMembers` · `rbacAuditEvents` · `activeRoleAssignments` only |
| Period `yyyy-MM` | Existing `usagePeriodSchema` / `usagePeriodUtcBounds` |

---

## Reject (do not port)

| Pattern | Why |
|---------|-----|
| `PRICING_PLANS` / tiers / modules | Afenda does not sell by module |
| `canPerformAction` + `suggestedTier` | Paywall DNA |
| Cell `limit` / `percentage` / `-1` unlimited | No softLimit SSOT yet — do not fake % |
| Hardcoded EN/VI strings in domain | UI owns copy; return `band` + `level` |
| Vierp meters (`orders`, `products`, …) | Wrong product; no placeholders |
| Billing / VAT / MRR / provision / temp passwords | Wrong package |
| Rename `_reference` → `@afenda/*` | Greenfield / enrich living only |

---

## Enrich-now / extract-later

| Stage | Gate | Surface |
|-------|------|---------|
| Position matrix | Living | `@afenda/admin/usage` |
| Soft-limit policy | Ops ceiling SSOT exists | Still admin **or** extract |
| Extract `@afenda/org-usage` | Any: many new meters · soft-limit must not pull Neon Auth org-console · non-admin consumers | New Rank-1 package + full cutover (no shim) |

---

## Hard stops

| Stop | Why |
|------|-----|
| No empty `@afenda/org-usage` ahead of extract trigger | Enterprise bar — no stub packages |
| No module feature catalog as usage rows | Wrong commercial model |
| No client-trusted orgId | Session-stamped via Actions / active-org gate |
| No `_reference` upload to `@afenda/docs` | Official docs must not ship historical trees |

---

## Verify

```text
1. packages/control-plane/admin/src/usage-position.ts + usage-bands.ts on disk
2. organizationUsageMetricsSchema has metrics.* + alerts (not flat counts)
3. Test-Path packages/org-usage → False
4. rg "suggestedTier|PRICING_PLANS" packages/control-plane/admin — expect no product port
```

Companion: [README.md](README.md) · [../entitlements/entitlements-dna.md](../entitlements/entitlements-dna.md) · [../observability/README.md](../observability/README.md).
