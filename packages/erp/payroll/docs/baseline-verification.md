# Payroll Same-Revision Baseline Verification

| Field | Value |
| --- | --- |
| Status | Recorded for HR ↔ Payroll closure Tasks 1–8 engineering slices |
| Target | `packages/erp/payroll` |
| Date | 2026-08-05 |
| Branch | `feat/hr-payroll-closure` |
| Package lifecycle | `scaffolded` |
| Overall outcome | **Engineering gates green for closed items; Neon ingress parity and A2–A4 remain open** |

> Package-local verification record. Not a kernel seal, deployment record, or
> lifecycle promotion.

## 1. Decision enabled

Payroll may continue under `scaffolded` with honest coupling to HR. Closed items
(A1, C2, C9, B2, B4, B1 docs/`./testing`, B5 lane scaffolding) do not authorize
`active` lifecycle, production statutory calculators, or enterprise seal while
A2–A4 and B6 remain open ([hr-payroll-decisions.md](./hr-payroll-decisions.md)).

## 2. Verification matrix

| Gate | Command | Outcome | Notes |
| --- | --- | --- | --- |
| Package lint | `pnpm --filter @afenda/payroll lint` | PASS | Biome on package tree |
| Package typecheck | `pnpm --filter @afenda/payroll typecheck` | PASS | `tsc --noEmit` |
| Inner unit loop | `pnpm check:payroll` / `pnpm test:payroll:unit` | PASS | Memory unit project |
| Governance fixtures | `governance-fixtures.test.ts` | PASS | public-contract, registry-projection, consumer-inventory, architecture-debt |
| Manifest / emission parity | `manifest.test.ts` | PASS | Registry ↔ manifest ↔ lifecycle builders |
| Lifecycle coupling | `pnpm governance:lifecycle-coupling` | PASS | Active module may not require scaffolded |
| Module validate | `pnpm validate:modules` | SKIP | No module roadmap after `docs-V2` removal |
| Outer parity (finalize) | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` | PARTIAL | Finalize atomicity green when Neon gated; workforce-ingress Neon skips without `payroll_accepted_handoff` on target |

## 3. Contract surfaces

| Surface | Path |
| --- | --- |
| Public contract fixture | `__tests__/fixtures/public-contract.fixture.json` |
| Registry projection fixture | `__tests__/fixtures/registry-projection.fixture.json` |
| Consumer inventory fixture | `__tests__/fixtures/consumer-inventory.fixture.json` |
| Architecture debt fixture | `__tests__/fixtures/architecture-debt.fixture.json` |
| Emission registry | `src/kernel/emissions/emission-registry.ts` |
| Testing entrypoint | `@afenda/payroll/testing` → `src/testing/index.ts` |

## 4. Reproduce

```powershell
pnpm check:payroll
pnpm governance:lifecycle-coupling
pnpm --filter @afenda/payroll exec vitest run __tests__/governance-fixtures.test.ts __tests__/manifest.test.ts --config ../../testing/vitest.unit.config.ts
$env:REQUIRE_DATABASE_TESTS = "1"
pnpm test:payroll:parity
```
