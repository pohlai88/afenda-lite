# runbooks

Operator and agent procedures for Afenda-Lite. Architecture decisions stay in `docs/architecture/`; these docs are **how to run** them.

| Doc | Purpose |
|-----|---------|
| [RB-001](RB-001-multi-org-ops.md) | Multi-org ops — resolve org id, FFT access backfill, tenancy audits, Neon restore pointers |
| [RB-005](RB-005-post-lock-coding-cheat-sheet.md) | Post-lock coding cheat sheet — env, phase entry, Rejected/Deferred flash card |

## Related authority

| Need | Doc |
|------|-----|
| Tenancy model + Decision lock | [ARCH-023](../architecture/turborepo/ARCH-023-multi-tenancy.md) |
| Platform IAM | [ARCH-011](../architecture/ARCH-011-platform-tenancy-rbac.md) |
| FFT ops / flags | [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Neon efficiency ladder | [neon-tenancy-efficiency](../../.cursor/skills/neon-tenancy-efficiency/SKILL.md) |
| Closed product phases | [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

## Rules

1. Prefer named `RB-*` files — do not recreate slug-only aliases (`multi-org-ops.md`, `post-lock-coding-cheatsheet.md`).
2. Do not reopen ARCH-023 Rejected (R*) / Deferred (D*) from a runbook without explicit user approval.
3. Never document secret values; cite env **names** and `npm run` commands only.
