# Hot Sales — documentation index

**Status (2026-07-10):** Phase 2A closed. Phase 2B **implemented** (flags default off). Phase 2C–2D **Proposed**.

**Agents — read order:**

1. **[RUNTIME.md](./RUNTIME.md)** — production state, code map, allowed/forbidden (start here)
2. Depth doc by type (table below) only when behavior or gate evidence is needed

Also: [AGENTS.md](../../AGENTS.md) § Hot Sales · [TRACKING.md](../TRACKING.md) § Hot Sales

---

## Document types (standard taxonomy)

Use the **type** to pick the right doc. Do not read the whole tree for every task.

| Type | Purpose | When to read |
|------|---------|--------------|
| **RUNTIME** | Agent SSOT — phase, prod config, code map, verify commands | **Always first** for trade work |
| **OPS** | Rollout gates, checklists, promotion order, evidence | Production changes, rollback, SQL checks |
| **SPEC** | Build contracts — what was shipped per phase | Implementing or changing product behavior |
| **ADR** | Material decisions + alternatives | RBAC, future 2B+ decisions |
| **ARCHITECTURE** | Slice brief — scope, acceptance, code boundaries | S19 trade engine orientation |
| **ARCHIVE** | Vision, planning, superseded lists | **Planning only** — does not authorize 2B+ code |

---

## Catalog

### RUNTIME

| Doc | Role |
|-----|------|
| [RUNTIME.md](./RUNTIME.md) | **Agent entry point** |

### OPS (operational)

| Doc | Role |
|-----|------|
| [ops/gate-register.md](./ops/gate-register.md) | Gate 1–7 SSOT, drift rules, SQL matrices |
| [ops/rollout.md](./ops/rollout.md) | Rollout checklist + evidence template |
| [ops/release-readiness.md](./ops/release-readiness.md) | Promotion order + pre-enable smoke matrix |

### SPEC (build contracts)

| Doc | Role |
|-----|------|
| [spec/phase-1-prd.md](./spec/phase-1-prd.md) | Phase 1 trade engine (**closed**) |
| [spec/phase-2a-prd.md](./spec/phase-2a-prd.md) | Phase 2A RBAC contract (**closed**) |
| [spec/phase-2a-slices.md](./spec/phase-2a-slices.md) | Phase 2A slice plan (**closed**) |
| [spec/phase-2bcd-slices.md](./spec/phase-2bcd-slices.md) | Phase 2B–2D slice plan (**Proposed**) |

### ADR (decisions)

| Doc | Role |
|-----|------|
| [adr/001-rbac.md](./adr/001-rbac.md) | Phase 2A RBAC (**Accepted**) |
| [adr/002-finance-deposit-pickup-ops.md](./adr/002-finance-deposit-pickup-ops.md) | Phase 2B finance + pickup (**Accepted**) |
| [adr/003-imports-notifications.md](./adr/003-imports-notifications.md) | Phase 2C Excel + mail (**Accepted**) |
| [adr/004-erp-sync.md](./adr/004-erp-sync.md) | Phase 2D ERP sync (**Accepted**) |

### ARCHITECTURE (slice)

| Doc | Role |
|-----|------|
| [architecture/s19-trade-slice.md](./architecture/s19-trade-slice.md) | S19 trade engine slice (Phase 1 acceptance) |

### ARCHIVE (planning — not authorization)

| Doc | Role |
|-----|------|
| [archive/vision.md](./archive/vision.md) | Original vision PRD |
| [archive/phase-2-feedback.md](./archive/phase-2-feedback.md) | Phase 2 planning direction |
| [archive/phase-2-scoping.md](./archive/phase-2-scoping.md) | Historical candidate list (**superseded**) |
| [archive/gp2-template.md](./archive/gp2-template.md) | GP2 piglet template copy (data only) |

---

## Frozen boundaries

| Item | Value |
|------|-------|
| Phase 1 tag | `hot-sales-phase-1` → `1bc1294` |
| Phase 2A tag | `hot-sales-phase-2a` → `8e650ff` |
| Production RBAC | `HOT_SALES_RBAC_ENABLED=true` |
| Production DB | `br-tiny-hill-ao82jp6f` |

Detail: [RUNTIME.md](./RUNTIME.md) · Gates: [ops/gate-register.md](./ops/gate-register.md)

---

## Directory layout

```txt
docs/hot-sales/
  README.md          ← this index + doc types
  RUNTIME.md         ← agent SSOT (read first)
  ops/               ← OPS type
  spec/              ← SPEC type
  adr/               ← ADR type
  architecture/      ← ARCHITECTURE type
  archive/           ← ARCHIVE type (planning only)
```
