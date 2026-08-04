# AGENTS.md — `@afenda/human-resources`

Package-local deltas for agents. Root [`AGENTS.md`](../../../AGENTS.md) wins for
checkout-wide doctrine. This file wins only for **conflicts inside this package**.

## Package

| Field | Value |
| --- | --- |
| Name | `@afenda/human-resources` |
| Path | `packages/erp/human-resources` |
| Primary command | `pnpm --filter @afenda/human-resources check` |
| Method | `afenda-semantic-registry-cutover` (feature-first ERP) · rule `hr-enterprise-mission` |

## Deltas (only)

- Sole mutator of `hr_*`. Do not dual-write HR tables from `apps/web`.
- Keep module lifecycle `scaffolded` and `activationMode: "organization_toggle"`
  until an explicit enterprise-activation mission changes the manifest.
- Do not import `@afenda/payroll` or peer ERP packages from production HR source.
  Never calculate gross-to-net, statutory deductions, net pay, or payslips here.
- Payroll receives approved immutable handoff facts only; Payroll owns calculation
  and historical-version ingress.
- Keep uniform ERP roots: `facade/`, `kernel/`, `composition/`, `features/`,
  `testing/`, plus root `index.ts`. Do not restore root `shared/`, `schemas/`,
  `store/`, or `adapters/`. Features never import `facade`, `composition`, or
  `testing`.
- `./testing` is test-only — never import it from product code.
- Treat workforce PII, compensation, and privacy workflows as highly sensitive;
  use synthetic fixtures only.
- One mission per chat for HR enterprise work: declare objective, allowed paths,
  acceptance, and verify commands before editing (`hr-enterprise-mission`).

## Verify

```bash
pnpm --filter @afenda/human-resources check
```

Prefer package-local `lint|typecheck|test` over broad root suites.

| Loop | Command |
| --- | --- |
| Inner (memory) | `pnpm test:hr:unit` / `pnpm check:hr` |
| Outer (Neon) | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` |

After manifest or register changes: `pnpm validate:modules` and
`pnpm governance:packages`.

## Authority

| Topic | Link |
| --- | --- |
| Package README | [`README.md`](./README.md) |
| Package docs | [`docs/`](./docs/) |
| Feature-first method | [`.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md`](../../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md) |
| Root agents | [`AGENTS.md`](../../../AGENTS.md) |
