# Payroll Same-Revision Baseline Verification

| Field | Value |
| --- | --- |
| Status | Recorded for HR ↔ Payroll closure Tasks 1–8 engineering slices |
| Target | `packages/erp/payroll` |
| Date | 2026-08-05 |
| Branch | `feat/hr-payroll-closure` |
| Package lifecycle | `scaffolded` |
| Overall outcome | **Engineering gates green including B5 Neon parity, B6 outbox drain, and D2 settlement ingress; A2 remains open** |

> Package-local verification record. Not a kernel seal, deployment record, or
> lifecycle promotion.

## 1. Decision enabled

Payroll may continue under `scaffolded` with honest coupling to HR. Closed items
(A1, A3, A4, C2, C9, B1–B7) do not authorize `active` lifecycle, production
statutory calculators, or enterprise seal while A2 remains open
([hr-payroll-decisions.md](./hr-payroll-decisions.md)).

## 2. Verification matrix

| Gate | Command | Outcome | Notes |
| --- | --- | --- | --- |
| Package lint | `pnpm --filter @afenda/payroll lint` | PASS | Biome on package tree |
| Package typecheck | `pnpm --filter @afenda/payroll typecheck` | PASS | `tsc --noEmit` |
| Inner unit loop | `pnpm check:payroll` / `pnpm test:payroll:unit` | PASS | Memory unit project |
| Governance fixtures | `governance-fixtures.test.ts` | PASS | public-contract, registry-projection, consumer-inventory, architecture-debt |
| Manifest / emission parity | `manifest.test.ts` | PASS | Registry ↔ manifest ↔ lifecycle builders; dispatchers registered |
| Emission drain governance | `pnpm governance:emission-drain` | PASS | All payroll emissions declare platform dispatcher |
| Lifecycle coupling | `pnpm governance:lifecycle-coupling` | PASS | Active module may not require scaffolded |
| Module validate | `pnpm validate:modules` | SKIP | No module roadmap after `docs-V2` removal |
| Outer parity | `REQUIRE_DATABASE_TESTS=1 AFENDA_DATABASE_TEST_TARGET=preview pnpm test:payroll:parity` | PASS | 7/7 including workforce-ingress races on preview with `payroll_accepted_handoff` |

### Audit-failure atomicity (B5 case 2) — proven by construction on drizzle

The bridging-doc B5 case "audit insert fails → command fails closed, nothing
persisted" is covered behaviorally on the memory adapter and **structurally on
drizzle**: `updateRunWithVersion` commits the run transition, audit fact, and
outbox facts inside a single SQL statement (`runs.drizzle.ts` CTE), so a failed
audit insert fails the entire statement — no injectable seam exists in which
audit can fail independently while the run row persists. A port-level failure
injection here would mock a seam production does not have and prove nothing;
the single-statement shape is the stronger guarantee and is the reviewed
evidence for this case.

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
