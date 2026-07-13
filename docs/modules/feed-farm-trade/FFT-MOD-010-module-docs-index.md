# FFT-MOD-010 Module Docs Index

| Field | Value |
|-------|-------|
| ID | FFT-MOD-010 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-010 Module Docs Index |
| Supersedes | MOD-003 Feed Farm Trade Docs Index |

**Status:** Phase 2A closed. 2B–2D ADRs Accepted; flag-gated implementation — see [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).

**Product module:** Feed Farm Trade · shell `fft` · skill [`.cursor/skills/feed-farm-trade`](../../../.cursor/skills/feed-farm-trade/SKILL.md).

**FE SSOT:** [ADR-003](../../adr/frontend/ADR-003-feed-farm-trade-module.md) · [ADR-004](../../adr/frontend/ADR-004-feed-farm-trade-architecture.md) · [ADR-005](../../adr/frontend/ADR-005-feed-farm-trade-roadmap.md).

## Agent read order

1. **[FFT-MOD-008](FFT-MOD-008-ops-runtime.md)** — production state, allowed/forbidden, verify (ops / engine work)
2. **[FFT-MOD-001](FFT-MOD-001-module-architecture.md)** — structure before large changes
3. FE ADR trio for `/fft` product UI / MVP locks
4. Depth doc (`adr/` `ops/` `spec/`) only when behavior or gate evidence is needed

Also: [AGENTS.md](../../../AGENTS.md) · [RB-002](ops/RB-002-feed-farm-trade-gate-register.md) · [deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) · [10-MOD guideline](../MOD-002-modules-index.md)

## Spine catalog (MOD-001…009)

| Spine | Doc |
|-------|-----|
| MOD-001 Architecture | [FFT-MOD-001](FFT-MOD-001-module-architecture.md) |
| MOD-002 Domain | [FFT-MOD-002](FFT-MOD-002-domain-and-ownership.md) |
| MOD-003 Tech stack | [FFT-MOD-003](FFT-MOD-003-tech-stack.md) |
| MOD-004 Data model | [FFT-MOD-004](FFT-MOD-004-data-model.md) |
| MOD-005 Auth / RBAC | [FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md) |
| MOD-006 Surfaces | [FFT-MOD-006](FFT-MOD-006-surfaces-and-routes.md) |
| MOD-007 API / adapters | [FFT-MOD-007](FFT-MOD-007-api-and-adapters.md) |
| MOD-008 Ops runtime | [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) |
| MOD-009 Verification | [FFT-MOD-009](FFT-MOD-009-verification.md) |

## Depth catalog

### OPS

| Doc | Role |
|-----|------|
| [ops/RB-002](ops/RB-002-feed-farm-trade-gate-register.md) | Gate 1–7 SSOT |
| [ops/RB-004](ops/RB-004-feed-farm-trade-ops-rollout.md) | Rollout checklist |
| [ops/RB-003](ops/RB-003-feed-farm-trade-release-readiness.md) | Promotion order |

### SPEC

| Doc | Role |
|-----|------|
| [spec/GUIDE-015](spec/GUIDE-015-feed-farm-trade-phase-1-prd.md) | Phase 1 (**closed**) |
| [spec/GUIDE-016](spec/GUIDE-016-feed-farm-trade-phase-2a-prd.md) | Phase 2A (**closed**) |
| [spec/GUIDE-017](spec/GUIDE-017-feed-farm-trade-phase-2a-slices.md) | Phase 2A slices (**closed**) |
| [spec/GUIDE-018](spec/GUIDE-018-feed-farm-trade-phase-2b-2d-slices.md) | Phase 2B–2D slices |

### ADR

| Doc | Role |
|-----|------|
| [adr/ADR-006](adr/ADR-006-feed-farm-trade-rbac.md) | RBAC (**Accepted**) |
| [adr/ADR-007](adr/ADR-007-feed-farm-trade-finance-deposit-pickup-ops.md) | Finance + pickup (**Accepted**) |
| [adr/ADR-008](adr/ADR-008-feed-farm-trade-imports-notifications.md) | Imports + mail (**Accepted**) |
| [adr/ADR-009](adr/ADR-009-feed-farm-trade-erp-sync.md) | ERP sync (**Accepted**) |

### ARCHITECTURE / INTEGRATIONS / ARCHIVE

| Doc | Role |
|-----|------|
| [architecture/ARCH-017](architecture/ARCH-017-feed-farm-trade-event-engine.md) | S19 event engine slice |
| [integrations/MOD-004](integrations/MOD-004-feed-farm-trade-erp-generic-stub.md) | ERP generic stub |
| [integrations/MOD-005](integrations/MOD-005-http-rest-erp-vendor-pack.md) | HTTP REST vendor pack |
| [archive/](archive/) | Planning only — does not authorize code |

## Frozen boundaries

| Item | Value |
|------|-------|
| Phase 1 tag | `fft-phase-1` → `1bc1294` |
| Phase 2A tag | `fft-phase-2a` → `8e650ff` |
| Production RBAC | `FFT_RBAC_ENABLED=true` |
| Production DB | `br-tiny-hill-ao82jp6f` |

## Directory layout

```text
docs/modules/feed-farm-trade/
  FFT-MOD-001 … FFT-MOD-010   ← spine
  architecture/ adr/ ops/ spec/ integrations/ archive/   ← depth
```
