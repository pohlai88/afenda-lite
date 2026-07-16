# N4 — Neon DB performance baseline (discovery card)

**Program:** Neon Auth optimisation · Wave 0 · `SLICE_ID: N4`  
**State:** SCORED (implementer) — not Living SSOT; Living = ARCH-023 · ARCH-025 · RB-001 §3.7b  
**Previous APPROVED:** N3 · **Do not start:** N5

## Objective

Ship CU/suspend guardrails + performance evidence (pooler, latency probe, concurrency, slow-query, org-index inventory). No capacity/schema/workload change.

## Acceptance (audit checklist)

| # | Criterion | Expect |
|---|-----------|--------|
| A1 | Product `-pooler` fail-closed | `@afenda/db` / `@afenda/env` tests green |
| A2 | Live CU min/max/suspend | 0.25 / 2 / 0 via validate or named drift |
| A3 | Latency baseline | `validate:neon-env` `latencyMs` (not public health expansion) |
| A4 | Concurrency snapshot | `max_connections` + activity (redacted) in RB-001 |
| A5 | Slow-query top-N | Redacted ms summary; no tenant SQL text in docs |
| A6 | Org-index inventory | Declarations/FFT/platform roots |
| A7 | No CU/connection/retention raise | Diff + API unchanged |
| A8 | Timeout/retry honesty | ARCH-025 HTTP limits — no fake Pool |
| A9 | Alerts | Hourly GitHub monitor opens/updates an issue on failure and closes it on recovery |
| A10 | Floor verify + Neon Slice Score | Implementer STOP; independent audit |

## Floor verify

```text
pnpm validate:neon-env
pnpm monitor:neon-performance
pnpm --filter @afenda/env test
pnpm --filter @afenda/db test
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test
pnpm check:docs-naming
pnpm exec turbo run typecheck test
```

## Hard stops

No CU/suspend/retention/connection-limit/schema/index/extension changes · no prod soak · no secrets/SQL/params/tenant data/URLs in output · no N5.
