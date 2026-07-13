# GUIDE-012 Feed Farm Trade Phase 2 UI Polish

| Field | Value |
|-------|-------|
| ID | GUIDE-012 |
| Category | Guide |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| **Doc type** | Technical spec (phase-scoped) — write-first, evaluation baseline |
| **Phase** | P2 — UI reopen, not MVP, per [001R](../adr/frontend/ADR-005-feed-farm-trade-roadmap.md) |
| **Build authorization** | **Reopened 2026-07-11** (user: “P2 polish (reopen only)”). Implementation still requires an explicit per-slice task (e.g. P2-AC-01) + Plan→approve for visual work — this reopen alone does not ship polish code. |
| **Decision locks** | [001-feed-farm-trade.md](../adr/frontend/ADR-003-feed-farm-trade-module.md) |
| **Architecture** | [001A-feed-farm-trade-architecture.md](../adr/frontend/ADR-004-feed-farm-trade-architecture.md) |
| **Roadmap / gaps** | [001R-feed-farm-trade-roadmap.md](../adr/frontend/ADR-005-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../.cursor/skills/feed-farm-trade/SKILL.md) |
| **Precondition** | [12-feed-farm-trade-phase1-core-mvp.md](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md) AC all green |

> **How to use this document:** Written independent of current implementation status, so it can serve as a fixed evaluation baseline. Fill in the **Evaluation checklist** at the end against the live codebase — do not edit the requirement rows to match what exists; record findings only in the **Result** column. **Phase reopened 2026-07-11** — implement only when the user names a candidate AC (P2-AC-01..06); visual slices still use Plan → approval → implement.

---

## Purpose

Elevate the thin AdminCN pages shipped in P1 into full-fidelity operator screens — richer tables, forms, and states — without adding new domain capability, new permission codes, or new routes. P2 is a **visual/UX layer** on top of an already-correct P1, not a re-architecture.

## Scope

**In (candidate, pending reopen):**

- Data tables with sorting/filtering/pagination for events, orders, and audit trail
- Richer setup forms (grouped sections, inline validation feedback, empty states)
- Loading/error/empty states matching AdminCN conventions already used by Declarations/Account
- Event creation from template as a first-class flow (template remains **data**, not code)
- Responsive layout parity with the rest of the AdminCN shell

**Out (hard bans — do not reopen implicitly by working on P2):**

- Any new permission code in `modules/fft/domain/rbac-catalog.ts`
- Any new domain capability beyond what P1 already exposes
- `FftShell`, locale switcher, or any `/fft/[locale]` segment
- Customer portal work
- P3 surfaces (deposits, pickup, imports, ERP sync, notifications)
- Regressing any P1 AC row (see [12](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md))

## Preconditions

- All P1 AC rows in [12-feed-farm-trade-phase1-core-mvp.md](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md) have recorded evidence and pass.
- Explicit user reopen of P2 in this repo (see `AGENTS.md` · `/using-afenda-elite-skills` · [closed-scope-register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md)) before any code changes — this document alone is not that reopen.

## Design guidance

| Concern | Direction |
|---------|-----------|
| Components | Reuse `components-V2/platform-components/ui/*` primitives — do not introduce a parallel UI kit |
| Layout | Follow the AdminCN `(pages)` route-group pattern already used by Declarations/Account (see [06-admincn-alignment.md](../architecture/frontend/ARCH-015-admincn-alignment.md)) |
| Copy | **Feed Farm Trade** only — never "Feed Farm Trade" in visible UI |
| Templates | Treat as data (seeded rows / JSON), never as code branches per template |
| Chrome | `AdminCnShell` only — reaffirm, do not relax, the P0 shell rule |

## Candidate acceptance criteria (proposed — not yet ratified in 001R)

These are **proposed** for when P2 is reopened. They are not authoritative until added to [001R](../adr/frontend/ADR-005-feed-farm-trade-roadmap.md) by an explicit roadmap update; listed here so evaluation has something concrete to check against once P2 starts.

| Candidate AC | Pass when |
|--------------|-----------|
| P2-AC-01 | Events list supports sort/filter without a full page reload regression, and P1 AC-EVT rows still pass |
| P2-AC-02 | My-orders and admin order lists support pagination at realistic operator volume |
| P2-AC-03 | Audit trail is readable with filtering by actor/date without new permission codes |
| P2-AC-04 | Every P1 form (setup, priority import, transfer, allocation) has an explicit empty/loading/error state |
| P2-AC-05 | Visual review against the target AdminCN comp shows no unstyled/default-browser form controls |
| P2-AC-06 | No P1 AC row (see [12](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md)) regresses as a result of P2 changes |

## Verification plan (for when reopened)

| Check | Method |
|-------|--------|
| P1 regression | Re-run the full P1 evaluation checklist from [12](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md) — all rows must still pass |
| Visual comp match | Side-by-side screenshot review against agreed AdminCN reference screens, per the portal's visual-work protocol (Plan mode → approval → implement) |
| Component reuse | `rg` for any new UI primitive introduced outside `components-V2/platform-components/ui` |
| No RBAC drift | Diff `modules/fft/domain/rbac-catalog.ts` — must be unchanged by a P2-only PR |

## Evaluation checklist

Until a named P2-AC slice is tasked after reopen, expect every row to evaluate as **Not started**. Do not backfill a "Pass" based on P1 polish that happened incidentally — confirm intentional P2 slice scope first.

| Candidate AC | Requirement | Expected evidence | Result |
|--------------|-------------|--------------------|--------|
| P2-AC-01 | Sortable/filterable events list | Table component with sort/filter controls | **PASS** — `TradeEventsList` client sort/filter on admin + sales lists (2026-07-11) |
| P2-AC-02 | Paginated order lists | Pagination control on my-orders / admin orders | **PASS** — `paginateItems` + my-orders + allocation order pages (2026-07-11) |
| P2-AC-03 | Filterable audit trail | Actor/date filter on audit panel | **PASS** — `trade-audit-filter-model` + actor/from/to on `TradeAuditPanel` (setup); no new RBAC (2026-07-11) |
| P2-AC-04 | Explicit empty/loading/error states | Skeletons + empty-state components per P1 form | **PASS** — `trade-form-feedback` + setup/allocation empty + route `loading.tsx` (2026-07-11) |
| P2-AC-05 | Visual comp parity | Screenshot diff review recorded | **PASS** — Declarations AdminCN form DNA: `trade-form-controls` (Input-parity native fields + `TradeFormCheckbox`); P1 surfaces (setup/order/transfer/events/audit/allocation/rbac); P3 panels skipped (2026-07-11) |
| P2-AC-06 | No P1 regression | P1 evaluation checklist re-run, all pass | **PASS** — `modules/fft` unit 173/173; focused gates+P2 models 102/102; P1 AC rows re-verified in phase 12; no RBAC drift. Pre-existing `[locale]`/FftShell residue noted, not P2-caused (2026-07-11) |

## Risks and open questions

- **Reopen trigger is undefined:** this document does not define what "explicit reopen" looks like procedurally — confirm with the user before treating any P2 work as authorized.
- **Design asset gap:** no AdminCN/Figma reference screens for Feed Farm Trade are cited in the ADR trio; visual work needs an agreed comp before implementation, per the portal's atmosphere/visual-work protocol.
- **Scope-creep risk:** "polish" is easy to stretch into new domain features — every P2 PR should diff-check that `rbac-catalog.ts` and `app/actions/fft.ts` domain calls are unchanged.

## References

- [001-feed-farm-trade.md](../adr/frontend/ADR-003-feed-farm-trade-module.md) — decision locks (P2 polish complete 2026-07-11; further polish needs named AC)
- [001A-feed-farm-trade-architecture.md](../adr/frontend/ADR-004-feed-farm-trade-architecture.md) — architecture detail
- [001R-feed-farm-trade-roadmap.md](../adr/frontend/ADR-005-feed-farm-trade-roadmap.md) — P2 section
- [12-feed-farm-trade-phase1-core-mvp.md](GUIDE-011-feed-farm-trade-phase-1-core-mvp.md) — precondition phase
- [06-admincn-alignment.md](../architecture/frontend/ARCH-015-admincn-alignment.md) — AdminCN template mapping
