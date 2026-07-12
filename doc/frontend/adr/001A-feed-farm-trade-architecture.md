# Frontend ADR-001A — Feed Farm Trade architecture

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-11 |
| **Mode** | Architecture (structure + boundaries) |
| **Audience** | Engineers + agents implementing `/fft` |
| **Decision locks** | [001-feed-farm-trade.md](001-feed-farm-trade.md) |
| **Roadmap / MVP** | [001R-feed-farm-trade-roadmap.md](001R-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../../.cursor/skills/feed-farm-trade/SKILL.md) |

```text
LOAD: context map, folders, request flow, naming, failure modes
SKIP: product locks → 001 · phase AC / gap IDs → 001R
```

---

## Context

**Platform model:** one SaaS platform, two product modules — **Declarations** and **Feed Farm Trade** — plus shared Platform + Identity. Same deployable, shell, auth, DB, env, proxy, CI. Module boundaries are domain/RBAC/UI homes only; **infra and platform changes are shared and updated together**.

Feed Farm Trade is the **product** module for B2B feed & farm trade sales. The **engine** remains Feed Farm Trade (`FFT_*`, `docs/fft/`). UI uses the shared AdminCN shell under locale-free `/fft/*`.

This document records the durable structure after the Phase A+B gap-close (skill pack + AdminCN P1 wire). It does not reopen Feed Farm Trade 2B–2D flag promotion.

## Responsibilities and boundaries

```mermaid
flowchart LR
  Platform[Platform]
  Identity[Identity]
  Declarations[Declarations]
  Trade[Trade]
  Identity --> Trade
  Identity --> Declarations
  Platform -.-> Trade
  Platform -.-> Declarations
```

| Boundary | Rule |
|----------|------|
| Platform vs modules | Shared Platform/Identity/AdminCN/env/CI — not FFT-only infra |
| Module domains | No domain imports Trade ↔ Declarations; compose at adapter if both needed |
| Product vs engine | UI/nav = **Feed Farm Trade**; flags/ops ADRs/domain slang = **Feed Farm Trade** |
| Shell entitlement | `fft` via `requireFftAccess` → platform `fft.access` (org-scoped); org admin alone does not grant |
| Data tenancy | Hard `organization_id = $org` on FFT tenant roots (ADR-002 / migration `027`) |
| Chrome | `AdminCnShell` only — never `FftShell` or locale switcher |
| Paths | Locale-free `/fft/**` — no live `app/fft/[locale]` |

## Components

| Layer | Path | Responsibility |
|-------|------|----------------|
| Routes | `app/fft/**` | Thin RSC: await `params`; compose only |
| Layout | `app/fft/layout.tsx` | `requireFftAccess` + `AdminCnShell` |
| UI | `features/fft/*` | Forms/panels; no shell chrome |
| Actions | `app/actions/fft.ts` | Zod + session/permission → domain → `ActionResult` |
| Domain | `modules/fft/**` | SQL, allocation rules, RBAC codes |
| Entitlement | `features/portal-chrome/resolve-shell-access.ts` | Nav module visibility |
| Session | `modules/fft/auth/fft-session.ts` | FFT access resolution |
| Nav | `components-V2/platform-config/navConfig.tsx` | `moduleId: feed-farm-trade` |
| Ops SSOT | `docs/fft/` | RUNTIME, gate-register, engine ADRs |
| REST contract | `doc/api/02-rest-resources.md` | Locale-free `/api/fft/...` — contract-only |

### Trusted files

| Concern | Path |
|---------|------|
| Layout gate | `app/fft/layout.tsx` |
| Entitlement | `features/portal-chrome/resolve-shell-access.ts` |
| Session | `modules/fft/auth/fft-session.ts` |
| Permissions | `modules/fft/domain/rbac-catalog.ts` |
| Store / rules | `modules/fft/domain/store.ts` |
| Actions | `app/actions/fft.ts` |
| Default UI locale arg | `features/fft/trade-ui-locale.ts` (`FFT_UI_LOCALE`) |
| Routes helpers | `modules/platform/routing/portal-routes.ts` · `modules/fft/i18n/trade.ts` (`tradeHref`) |

## Data / request flow

```text
app/fft/**/page.tsx          → thin RSC (params await; no business logic)
  → features/fft/*           → UI (NO FftShell / locale switcher)
  → app/actions/fft.ts       → Zod + requireFftAccess / permission
  → modules/fft/domain/*     → SQL / rules
layout: requireFftAccess + AdminCnShell only
```

| Need | Path |
|------|------|
| RSC read | Call `modules/fft` domain directly — never fetch own `/api/fft` |
| Client mutation | Server Action `trade.ts` → Zod → session/perm → domain → `ActionResult` |
| External HTTP | Route Handler per `doc/api` — contract-only until a consumer needs it |

**Locale note:** Actions still accept a `TradeLocale` argument for copy/domain i18n. URL paths are locale-free; pages pass `FFT_UI_LOCALE` from `features/fft/trade-ui-locale.ts`.

## Key decisions

| Decision | Rationale |
|----------|-----------|
| One platform, two modules | SaaS multi-module — Declarations + FFT share infra; do not invent a separate FFT stack |
| AdminCN only | One SaaS shell with Declarations / Account / FFT |
| Kill `/fft/[locale]` + FftShell | Residue fought platform shell; i18n deferred to action arg |
| Actions-first UI | Matches portal BFF decision tree; REST stays contract-only |
| Keep `FFT_*` | Gate-register and prod ops already keyed to those names |
| Permission codes, not role names | Stable **module** RBAC; see `rbac-catalog.ts` |

## Failure modes

| Failure | Expected behavior |
|---------|-------------------|
| No session on `/fft` | Sign-in redirect (proxy + layout) |
| Session without trade permission | Denied; FFT nav hidden |
| Org admin without platform `fft.access` | Declarations OK; `/fft` denied |
| P3 ops flags off | Deposits/pickup/imports/ERP writes blocked; P1 cycle still works |
| Missing permission on mutation | Action returns deny / error — never silent success |

## Operational considerations

- **P3 promotion:** flags + [gate-register](../../../docs/fft/ops/gate-register.md) only — do not invent checklists in FE ADRs.
- **G0:** `docs/fft/` is present (restored). Cite RUNTIME / gate-register as living authority.
- **Verify slice:** `requireFftAccess` / permission · Zod at action edge · no FftShell · update [completeness.md](../../../.cursor/skills/feed-farm-trade/completeness.md) when status changes.
- **Engine lane:** Feed Farm Trade 2B–2D product UI / flag work still requires gate-register + explicit reopen — this architecture doc does not reopen them.

## Known limits / future changes

| Limit | Notes |
|-------|-------|
| P2 UI polish | Closed until explicit reopen — thin AdminCN pages are MVP-OK |
| P3 ops surfaces | Placeholder / flag-gated pages under `/fft/admin/...` |
| Customer portal | Later series branch — wrong actor for this module |
| `FFT_*` / `/fft` rename | Requires new ADR + migration |
| Full e2e AC journey | Recommended before claiming enterprise MVP (see 001R DoD) |

## Related

- [001-feed-farm-trade.md](001-feed-farm-trade.md) — locks
- [001R-feed-farm-trade-roadmap.md](001R-feed-farm-trade-roadmap.md) — P0–P3 + gaps
- [../01-architecture.md](../01-architecture.md) — portal FE layers
- [../03-routes.md](../03-routes.md) — route table
- [../../backend/03-bounded-contexts.md](../../backend/03-bounded-contexts.md) — Trade context
- [docs/fft/architecture/s19-trade-slice.md](../../../docs/fft/architecture/s19-trade-slice.md) — Phase 1 engine slice (historical)
