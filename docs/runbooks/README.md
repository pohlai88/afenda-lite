# runbooks

Operator and agent procedures for Afenda-Lite **platform** ops. Architecture and contract documents do **not** replace operational procedures — see [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md).

| Doc | Purpose | Status |
|-----|---------|--------|
| [RB-001](RB-001-multi-org-ops.md) | Multi-org ops — resolve org id, FFT access backfill, tenancy audits, Neon restore/perf, N15 Auth domains + deploy health | Living |
| [RB-005](RB-005-post-lock-coding-cheat-sheet.md) | Post-lock coding cheat sheet — env, phase entry, Rejected/Deferred flash card, weekly pack | Living |

**API-pack runbooks** (OpenAPI drift, API incident, contract rollback) live under [`docs/api/runbooks/`](../api/runbooks/README.md) so the API pack stays standalone — [RB-006](../api/runbooks/RB-006-openapi-drift-detection-recovery.md) · [RB-007](../api/runbooks/RB-007-api-incident-response.md) · [RB-008](../api/runbooks/RB-008-api-contract-rollback.md).

**Reserved (not created):** `RB-009` Webhook Replay and Recovery — create only when webhooks exist (under `docs/api/runbooks/` when opened).

**ID collisions avoided:** Candidate labels “RB-001…004” for OpenAPI/incident/rollback/webhook were remapped to **RB-006…009** because RB-001/005 are platform runbooks and RB-002…004 are FFT module ops.

## Related authority

| Need | Doc |
|------|-----|
| Interface / API architecture | [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) |
| Tenancy + platform RBAC + Decision lock | [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) |
| FFT ops / flags | [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| OpenAPI governance | [OPEN-001](../api/OPEN-001-openapi.md) |
| OpenAPI generate recipes | [GUIDE-011](../api/guides/GUIDE-011-generating-and-validating-openapi.md) (Draft) |
| Neon efficiency ladder | [neon-tenancy-efficiency](../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) |
| Closed product phases | [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

## Rules

1. Prefer named `RB-*` files — do not recreate slug-only aliases (`multi-org-ops.md`, `post-lock-coding-cheatsheet.md`).
2. Do not reopen ARCH-023 Rejected (R*) / Deferred (D*) from a runbook without explicit user approval.
3. Never document secret values; cite env **names** and `pnpm` commands only.
4. Do not reuse RB IDs already assigned to platform, API-pack, or module runbooks.
5. Platform runbooks stay under `docs/runbooks/`; API-pack runbooks stay under `docs/api/runbooks/` (DOC-001 exception).
