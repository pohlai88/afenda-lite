# ADR-003 Feed Farm Trade Module

| Field | Value |
|-------|-------|
| ID | ADR-003 |
| Category | ADR |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| **Status** | Accepted (amended 2026-07-12 — Hot Sales / trade identity retired → FFT) |
| **Date** | 2026-07-11 |
| **Amended** | 2026-07-12 |
| **Deciders** | Portal rebuild program |
| **Namespace** | `docs/architecture/frontend/adr/` (not Backend ADR-001) |
| **Pair** | [001A architecture](ADR-004-feed-farm-trade-architecture.md) · [001R roadmap](ADR-005-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../../.cursor/skills/feed-farm-trade/SKILL.md) |

```text
LOAD: product locks, access, naming, scope, MVP definition
SKIP: folder/flow detail → 001A · phase checklists / gap IDs → 001R
```

---

## Context

3F businesses (feedmills, farmers, Feed · Farm · Food — industry operators, **not** organization admins alone) need a **feed & farm sales** module beside Declarations inside **Afenda-Lite** (beta of Afenda ERP): time-boxed events, orders, allocation, ops handoff — one SaaS product, not a second app, and not an end-customer storefront yet.

The engine was historically named **Hot Sales** with technical paths under `/trade`. Module identity is **Feed Farm Trade (FFT)**. Dual naming is retired.

## Decision

**Feed Farm Trade (FFT)** is the module name + engine + path identity on **Afenda-Lite** (Declarations | FFT — shared AdminCN/auth/DB/env/CI; not a second app or infra course). Product name SSOT: Afenda-Lite ([deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md)).

| Lock | Choice |
|------|--------|
| Host product | **Afenda-Lite** (not “Client Declaration Portal”) |
| Platform model | One SaaS · two modules (`declarations` \| `fft`) · infra updated together |
| UI / nav name | Feed Farm Trade |
| Engine / env / ops docs | FFT — `FFT_*` env keys; living SSOT `docs/modules/feed-farm-trade/` ([RUNTIME](../../modules/feed-farm-trade/MOD-001-feed-farm-trade-runtime.md), [gate-register](../../modules/feed-farm-trade/ops/RB-002-feed-farm-trade-gate-register.md)) |
| DB | `fft_*` tables (migration `024_fft_rename_hot_sales_tables.sql`) |
| Actors | Organization-admin sales + ops (not end customers) |
| Shell | Shared AdminCN on `/fft/*`; entitlement `fft` |
| Paths | Locale-free `/fft` (308 redirect from legacy `/trade/*`) |
| Entry | `requireFftAccess` — org admin alone does **not** grant |
| Permissions | Codes in `modules/fft/domain/rbac-catalog.ts` |
| Domain | `modules/fft` + `app/actions/fft.ts` |
| UI home | `features/fft/*` under AdminCN layout — never mount `FftShell` / locale switcher |
| Deprecation | Hot Sales / `/trade` product identity / `FftShell` = **compulsory** retire — [register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |
| Out of scope | Declarations **feature** ownership; Neon Auth chrome; ERP as ledger; **customer portal**; pixel polish beyond MVP |

**Historical tags** (`hot-sales-phase-*`) remain immutable footnotes only — do not retag.

**MVP bar (satisfactory enterprise grade):** P0 + P1 in [001R](ADR-005-feed-farm-trade-roadmap.md).

## Consequences

**Positive:** One name across UI, code, env, DB, and ops docs; clear multi-module SaaS model.

**Costs:** Redirect matrix for `/trade`; Vercel env key migration `HOT_SALES_*` → `FFT_*`; Neon table rename on prod branch.

## Rejected

| Option | Why |
|--------|-----|
| Keep Hot Sales as engine name forever | Confuses agents and ops; product already FFT |
| Keep `/trade` as permanent URL | Technical nickname conflicts with product FFT branding |
| Soft-deprecate Hot Sales / FftShell “for convenience” | Compulsory retire — agents remount soft leftovers |
| Treat FFT as separate infra course from Declarations | Same platform; module domain only |
| `FEED_FARM_TRADE_*` env prefix | Too long; FFT matches existing registry tooling |
| Remount `FftShell` / live `/fft/[locale]` | Breaks AdminCN platform shell |
