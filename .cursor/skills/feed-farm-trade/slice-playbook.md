# FFT — slice playbook

**Borrow:** `incremental-implementation` (vertical slice + verify before next) · `test-driven-development` (proof before done).

**SSOT AC:** phase docs [11](../../../doc/frontend/11-feed-farm-trade-phase0-shell.md) · [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md).

## When to use

Any multi-file change under `/trade`, `features/trade`, `app/actions/trade.ts`, or `modules/trade`.

## When to stop

| Situation | Action |
|-----------|--------|
| Task is P2 polish | Stop — need explicit reopen |
| Task enables prod `HOT_SALES_*` flag | Stop — gate-register required |
| Spec vs code conflict | Surface confusion; do not guess |
| AC ID not in phase doc | Ask — do not invent requirements |

## Increment cycle

```text
Pick F-* / AC-*  →  Load action-map + rbac-card  →  Implement  →  Verify  →  Record evidence  →  Next
```

One capability group per increment when possible (e.g. F-PRI-01 alone, not “all of setup”).

## Steps (mandatory)

### 1 — Name the work

```text
Phase: P0 | P1 | P3
IDs: F-… / AC-… / G-… (from phase doc)
Out of scope this PR: …
```

### 2 — Load maps

1. Open matching row in [action-map.md](action-map.md).  
2. Confirm permission codes in [rbac-card.md](rbac-card.md).  
3. If action is marked **P3**, confirm flag + user authorization before writes.  
4. Skim [example-slice.md](example-slice.md) for page/feature pattern.

### 3 — Implement (vertical)

| Layer | Do |
|-------|-----|
| Domain | Prefer existing `modules/trade/domain/*` — no Declarations imports |
| Action | Zod + `requireTradePermission(code)` or existing admin helper — no raw SQL |
| Feature | Client form/panel; use `getTradeActionError`; pass `TRADE_UI_LOCALE` |
| Page | Thin RSC: await params, domain reads, compose features |

### 4 — Verify

Run commands in [verify.md](verify.md) for the touched AC. Fail → fix before expanding scope.

### 5 — Record evidence

Before claiming the slice done, write one evidence line:

```text
AC-XXX: PASS | evidence: path/to/test.ts::describe or e2e tag | date
```

Optional: fill **Result** on the phase-doc evaluation checklist.

### 6 — Update matrix

If wire status changed, update [completeness.md](completeness.md).

## Slice size guardrails

- Prefer ≤1 capability group per PR when AC evidence is the goal.  
- Do not mix P1 AC work with P3 flag enablement.  
- Do not restore `TradeShell` / `[locale]` “for convenience.”

## Done means

1. Code path matches action-map.  
2. Permission code enforced (not role name).  
3. Verify commands green for touched AC.  
4. Evidence recorded.  
5. No forbidden residue.
