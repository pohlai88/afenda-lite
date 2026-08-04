# AGENTS.md — `@afenda/payroll`

Package-local deltas for agents. Root [`AGENTS.md`](../../../AGENTS.md) wins for
checkout-wide doctrine. This file wins only for **conflicts inside this package**.

## Package

| Field | Value |
| --- | --- |
| Name | `@afenda/payroll` |
| Path | `packages/erp/payroll` |
| Primary command | `pnpm --filter @afenda/payroll check` |
| Farm | `afenda-elite-payroll` |

## Deltas (only)

- Sole mutator of `payroll_*`. Do not dual-write payroll tables from `apps/web`.
- Do not import `@afenda/human-resources` or peer ERP packages. Workforce facts
  cross `PayrollWorkforceCapability` supplied by the app composition root.
- Do not insert or update `payment*`, `journal*`, or `hr_*` tables from this package.
- Keep uniform ERP roots only: `facade/`, `kernel/`, `composition/`, `features/`,
  `testing/`, plus root `index.ts`. Features never import `facade`, `composition`,
  or `testing`, and never accept the composite `PayrollStore`.
- Treat compensation, tax, deductions, payslips, and statutory identifiers as
  highly sensitive. Use synthetic fixtures only; keep
  `payroll.payslip.read-own` and `payroll.payslip.read-all` distinct.
- Bundled `synth.v1` statutory calculator is test-only — not a jurisdiction approval.
- Always-apply companions when editing this tree: `payroll-boundaries`,
  `payroll-domain`, `payroll-security`, `payroll-testing`.

## Verify

| Loop | Command |
| --- | --- |
| Inner | `pnpm check:payroll` (lint + typecheck + unit) |
| Package | `pnpm --filter @afenda/payroll test` |
| Outer (Neon) | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` |

Prefer package-local gates over broad root suites. After manifest or register
changes: `pnpm validate:modules` and `pnpm governance:packages`.

## Authority

| Topic | Link |
| --- | --- |
| Package README | [`README.md`](./README.md) |
| Package docs | [`docs/`](./docs/) |
| Production readiness | [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) |
| Payroll farm | [`.cursor/skills/afenda-elite-payroll/SKILL.md`](../../../.cursor/skills/afenda-elite-payroll/SKILL.md) |
| Root agents | [`AGENTS.md`](../../../AGENTS.md) |
