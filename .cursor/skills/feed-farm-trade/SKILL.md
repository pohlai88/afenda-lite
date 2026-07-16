---
name: feed-farm-trade
description: >-
  Feed Farm Trade (FFT) enterprise delivery skill for /fft on AdminCN +
  modules/fft + app/actions/fft. Use when coding, verifying, or evaluating
  Feed Farm Trade / Feed Farm Trade engine work, trade RBAC, events/orders/allocation,
  P0–P3 slices, G1–G6 MVP gaps, or AC evidence for enterprise MVP claims.
---

# Feed Farm Trade

**Product module:** Feed Farm Trade · **Host product:** Afenda-Lite · **Shell id:** `fft` · **Engine:** Feed Farm Trade (`FFT_*`)  
**Platform:** one Afenda-Lite SaaS · two modules (`declarations` | `fft`) · shared infra — do not invent a separate FFT stack

## Borrowed workflows (do not re-invent)

| Need | Borrow from | FFT adaptation |
|------|-------------|----------------|
| Thin vertical slices | `incremental-implementation` | One capability (F-\*) per cycle — see [slice-playbook.md](slice-playbook.md) |
| Proof before done | `test-driven-development` | AC evidence required — see [verify.md](verify.md) |
| Right context | `context-engineering` | Load card below — max focused files |
| Adapter / ActionResult | `afenda-elite-api-contract` | Trade returns `TradeActionResult` + `getTradeActionError` |
| Route / UI homes | `afenda-elite-frontend-scaffold` + `@afenda/ui-system` barrel (ADR-010); AdminCN chrome authority [ARCH-018](../../../docs/architecture/ARCH-018-admincn-customization.md) | Thin `app/fft` + `features/fft` |
| Modules / ports | `afenda-elite-backend-modules` | Domain under `modules/fft` — never `modules/trade` |

External ecosystem (`deliver-acceptance-criteria`) patterns are **folded into** [verify.md](verify.md) — do not install a second skill for AC.

## SSOT

| Need | Path |
|------|------|
| Locks | [docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md](../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| Architecture | [docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md](../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| Roadmap | [docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| Phase specs (evaluation) | [P0](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) · [P1](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) · [P2](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) · [P3](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Slice playbook | [slice-playbook.md](slice-playbook.md) |
| F-\* → action map | [action-map.md](action-map.md) |
| Permission codes | [rbac-card.md](rbac-card.md) |
| Verify + AC evidence | [verify.md](verify.md) |
| Worked example | [example-slice.md](example-slice.md) |
| Completeness matrix | [completeness.md](completeness.md) |
| Copy-paste command sheet | [command-sheet.md](command-sheet.md) (post-MVP A–J) · [command-sheet-V2.md](command-sheet-V2.md) (P3 ops series) |
| UI registry (HITL IDs) | [ui-registry.md](ui-registry.md) · [ui-registry.json](ui-registry.json) — Layer A inventory + Layer B DNA; `npm run check:fft-ui-registry` |
| Ops flags | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Module docs index | [FFT-MOD-010](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| 10-MOD guideline | [MOD-002](../../../docs/modules/MOD-002-modules-index.md) |

## Load card (coding)

| Task | Load first |
|------|------------|
| Locks / naming | **001 only** |
| Structure | **001A** + [architecture.md](architecture.md) |
| Coding a P0 gate | Phase [11](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) + [verify.md](verify.md) |
| Coding a P1 capability | Phase [12](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) + [action-map.md](action-map.md) + [rbac-card.md](rbac-card.md) + [example-slice.md](example-slice.md) |
| Claiming MVP done | [verify.md](verify.md) AC evidence protocol — **required** |
| P2 polish | **Complete 2026-07-11** (AC-01..06) — further polish only with named P2-AC + Plan for visual ([13](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md)) |
| P3 ops / flags | [14](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) + [FFT-MOD-008](../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) — **no prod flag without MOD-008 gate checklist** |

```text
DO NOT: FftShell, /fft/[locale], customer portal, invent permission codes,
  rename FFT_*, org-admin⇒trade, cross-module domain imports (Trade↔Declarations),
  treat FFT infra/auth/deploy as a different course from Declarations,
  soft-deprecate Hot Sales / /trade / FftShell (compulsory retire — deprecation register),
  claim enterprise MVP without AC evidence, mix P3 writes into P1 PRs
MVP = P0 + P1 including G1–G6 + recorded AC evidence
```

## Mandatory coding workflow

Copy and track:

```text
FFT slice:
- [ ] 1. Name phase (P0 | P1 | P2 | P3) + F-* / AC-* / P2-AC-* IDs from phase doc
- [ ] 2. Load action-map row + rbac-card codes (never role names)
- [ ] 3. Confirm P3? → flag + permission; P2? → named P2-AC only (no new domain/RBAC); else stay on P1 actions only
- [ ] 4. Implement vertical slice (page → feature → action → domain) — P2: UI only
- [ ] 5. Run verify.md commands for touched AC
- [ ] 6. Record evidence (test path or journey) before claiming done
- [ ] 7. Update completeness.md if status changed
```

Full steps: [slice-playbook.md](slice-playbook.md).

## Architecture (one screen)

```text
Platform (shared) + Identity (shared)
  ├── Declarations module
  └── Trade / FFT module (modules/fft) — module domain only; no Declarations imports
Shell: AdminCnShell · entitlement fft via requireFftAccess · nav moduleId feed-farm-trade
Infra/env/CI/deploy: same as Declarations — update together
```

| Layer | Path |
|-------|------|
| Routes | `app/fft/**` thin RSC, locale-free |
| UI | `features/fft/*` |
| Actions | `app/actions/fft.ts` |
| Domain | `modules/fft/**` |
| RBAC | `modules/fft/domain/rbac-catalog.ts` |
| Session | `requireFftAccess` / `requireFftPermission` |

## Vertical slice

```text
RSC read?        → modules/fft domain (never fetch own /api)
Client mutation? → trade.ts → Zod → requireFftPermission(code) → domain → TradeActionResult
HTTP external?   → Route Handler per docs/api (contract-only)
```

## FE / BE / API rules

1. Thin `page.tsx` — await `params`; no business logic  
2. AdminCN from `app/fft/layout.tsx` only  
3. Never mount `FftShell` / locale switcher  
4. Copy: **Feed Farm Trade**; paths locale-free; pass `FFT_UI_LOCALE`  
5. Domain SQL only in `modules/fft`; parameterized queries  
6. Authorize with **permission codes** via `requireFftPermission`  
7. Portal UI → Actions first; branded ids align route + Zod  

## Forbidden

- Customer portal in FFT PRs  
- Org admin alone grants trade  
- Inventing RBAC codes  
- Renaming `FFT_*` without new ADR  
- P3 prod enable without gate-register  
- Claiming enterprise MVP without P0+P1 AC evidence (G1–G6)  
- Wiring deposit/pickup/ERP/notification **writes** into a P1-only PR  

## Cross-skills

- [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)  
- [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md)  
- [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md)  
- UI primitives: `@afenda/ui-system` barrel — [ADR-010](../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md); AdminCN chrome authority [ARCH-018](../../../docs/architecture/ARCH-018-admincn-customization.md)  
- [incremental-implementation](../agent-skills/skills/incremental-implementation/SKILL.md)  
- [test-driven-development](../agent-skills/skills/test-driven-development/SKILL.md)  
- [api-and-interface-design](../agent-skills/skills/api-and-interface-design/SKILL.md)  
