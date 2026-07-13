# Feed Farm Trade — MVP and gaps

**SSOT:** [docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md)

Locks: [001](../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · Architecture: [001A](../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md)

**Coding / verify:** [slice-playbook.md](slice-playbook.md) · [action-map.md](action-map.md) · [verify.md](verify.md) · phase [12](../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md)

## Enterprise MVP

**P0 + P1** (including G1–G6) + AC evidence. Not P2 polish. Not P3 flag-gated ops.

**Status (2026-07-11):** **Claimable** — unit AC gates + `@journey` evidence in [verify.md](verify.md) (`EVALUATE_P1_MVP: YES`).

### P0 Shell — done

F-ACC-01..05 · AC-ACC · AC-SH — AdminCN + trade gate + FFT nav · locale-free `/fft` · redirect-only legacy `[locale]` shim (no FftShell)

### P1 Core (must exit) — FE wired; AC evidence recorded

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

### Not MVP (optional / later)

| Phase | Content |
|-------|---------|
| P2 | UI polish — **done** (AC-01..06); further polish needs named AC |
| P3 | Deposits / pickup / imports / ERP — flags + gate-register |
| Later | Customer portal, locale URLs, `FFT_*` rename, 2D-3 packs |

### Gap tags (001R)

See 001R critical gap register (G0–G9). G1–G9 FE surfaces wired with permission-code evidence.
