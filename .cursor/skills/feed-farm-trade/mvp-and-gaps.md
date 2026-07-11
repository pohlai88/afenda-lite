# Feed Farm Trade — MVP and gaps

**SSOT:** [doc/frontend/adr/001R-feed-farm-trade-roadmap.md](../../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md)

Locks: [001](../../../doc/frontend/adr/001-feed-farm-trade.md) · Architecture: [001A](../../../doc/frontend/adr/001A-feed-farm-trade-architecture.md)

**Coding / verify:** [slice-playbook.md](slice-playbook.md) · [action-map.md](action-map.md) · [verify.md](verify.md) · phase [12](../../../doc/frontend/12-feed-farm-trade-phase1-core-mvp.md)

## Enterprise MVP

**P0 + P1** (including G1–G6) + AC evidence. Not P2 polish. Not P3 flag-gated ops.

### P0 Shell — done

F-ACC-01..05 · AC-ACC · AC-SH — AdminCN + trade gate + FFT nav · locale-free `/trade` · no `[locale]` tree

### P1 Core (must exit) — FE wired; AC evidence pending

| Group | IDs |
|-------|-----|
| Events | F-EVT-01..06 |
| Supply | F-SUP-01 (**G2**) |
| Fields | F-FLD-01 (**G5**) |
| Priority | F-PRI-01 (**G1**) |
| Orders | F-ORD-01..05 (**G4** complete) |
| Transfer | F-XFR-01..02 (**G3**) |
| Allocation | F-ALC-01..03 (**G9**) |
| Audit | F-AUD-01 (**G6**) |
| Admin | F-ADM-01..03 (**G8** exports) |

### Not MVP

| Phase | Content |
|-------|---------|
| P2 | UI polish reopen |
| P3 | Deposits / pickup / imports / ERP — flags + gate-register |
| Later | Customer portal, locale URLs, `HOT_SALES_*` rename, 2D-3 packs |

### Gap tags (001R)

| ID | Tag |
|----|-----|
| G0 | Ops docs tree — **resolved** (restored) |
| G1–G6 | In P1 — FE surfaces wired |
| G7–G9 | AC tighten |
| Industry booth/ERP/VFD | Keep out |
