---
name: afenda-elite-payroll
description: >-
  Implements and extends @afenda/payroll using HR-style domain folder
  boundaries (schemas, store, drizzle/memory adapters, capability farms).
  Covers package boundaries, domain invariants, calculation/finalization,
  testing, security, and phased workflow. Use when adding payroll commands,
  Zod schemas, store methods, Drizzle adapters, reconciliation/runs/setup
  slices, architect planning, verifier review, or when the user mentions
  payroll package structure, payroll_* sole mutator, or afenda-elite-payroll.
disable-model-invocation: true
---

# Afenda Elite — payroll package

**SSOT for `@afenda/payroll` implementation shape.** Mirror `@afenda/human-resources` folder discipline so schemas, store contracts, and adapters do not collapse into root monoliths.

```text
LOAD:
  companions: package-tree.md · implementation.md · boundaries.md · domain.md
              · testing.md · security.md · workflow.md
  packages/erp/payroll/** · packages/erp/SCAFFOLDING.md
  packages/erp/human-resources/src/{schemas,store,adapters}/**   # structural reference
  docs-V2/_scratch/erp/human-resource.md                         # payroll ownership facts
  docs-V2/_scratch/payroll-cursor-agent-pack/docs/payroll/     # progressive phase plan
SKIP:
  Living docs/payroll/** and Living docs/architecture as required LOAD
  peer import @afenda/human-resources from payroll
  dual-write payroll_* from apps/web
  owning hr_* / inserting payment or journal rows from payroll
  recreating root schemas.ts · store.ts · drizzle-store.ts · memory-store.ts
VERIFY:
  pnpm --filter @afenda/payroll check
  pnpm validate:modules
```

| Doc | Purpose |
|-----|---------|
| [package-tree.md](package-tree.md) | Folder / file / export boundaries |
| [implementation.md](implementation.md) | Command anatomy · slice checklist · anti-patterns |
| [boundaries.md](boundaries.md) | Mutation ownership · peer imports · events |
| [domain.md](domain.md) | Invariants · money · effective dates · immutability |
| [testing.md](testing.md) | Fixtures · golden calcs · phase exit gates |
| [security.md](security.md) | Sensitive data · auth · audit |
| [workflow.md](workflow.md) | Phased prompts 00–11 · subagent handoff |
| [decision-log.md](decision-log.md) | Architecture decision template |
| Package README | Consume / maintain / ownership |
| [afenda-elite-monorepo-discipline](../afenda-elite-monorepo-discipline/SKILL.md) | DAG / exports |
| [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) | Brands · Result · ActionResult at app boundary |

## Subagents

| When | Agent |
|------|-------|
| Plan Mode / repository discovery / schema design | [payroll-architect](../../agents/payroll-architect.md) (read-only) |
| After each phase / before merge | [payroll-verifier](../../agents/payroll-verifier.md) (read-only) |

## When to use

- Implementing any payroll command, query, schema, or store method
- Growing Drizzle or memory adapters
- Reviewing whether a change belongs in `setup` vs `runs` vs `outputs`
- Scaffolding a new aggregate under an existing capability farm
- Planning payroll phases or verifying completed payroll work

## Hard rules

1. **Domain farms own commands** — put command files under `src/{setup,assignments,inputs,runs,statutory,outputs,reconciliation}/`.
2. **Schemas stay sliced** — Zod lives in `src/schemas/<domain>.ts`; `common.ts` is primitives + mutation context only.
3. **Store stays sliced** — persistence methods on `src/store/<domain>.ts`; compose in `store/index.ts` as `PayrollStore`.
4. **Adapters stay sliced** — Drizzle methods in `adapters/drizzle/<domain>.ts`; compose with `createDrizzlePayrollStore` only in `adapters/drizzle/store.ts`. Memory factory in `adapters/memory/store.ts`, re-exported from `@afenda/payroll/testing`.
5. **No peer ERP import of HR** — workforce reads via injected `PayrollEmployeeQueryPort` at `apps/web`.
6. **Sole mutator** — only this package writes `payroll_*` (see `mutation-tables.ts` + SCHEMA-OWNERSHIP-MANIFEST).
7. **Events for Payments/Accounting** — emit `payroll.payment-requested.v1` / `payroll.posting-requested.v1`; do not insert payment/journal rows here.
8. **Public API** — root barrel exports commands/types/schemas/permissions/ports; not raw SQL, Drizzle tables, or Next.js types.
9. **Quality bar** — enterprise production only; no shim/stub product paths.
10. **Organization scope** — every aggregate, command, query, unique key, and mutation scoped by `organizationId`.
11. **Money** — never JavaScript `number` for monetary arithmetic; use canonical decimal/money types; explicit rounding.
12. **Effective-dated rules** — statutory/earning/deduction rules versioned; runs record exact rule versions used.
13. **Deterministic calculation** — same snapshots + rule versions + rounding policy → same result; snapshot HR facts at calc time.
14. **Finalized immutability** — corrections via adjustments, off-cycle runs, or compensating reversals; never rewrite finalized lines.
15. **Synthetic fixtures only** — never real employee, salary, bank, tax, or payslip data in prompts, tests, or commits.

## Quick start (new command)

1. Confirm aggregate farm from [package-tree.md](package-tree.md).
2. Add Zod input in `schemas/<domain>.ts` (strict; stamp org/actor/correlation at composition root).
3. Extend `store/<domain>.ts` with persistence methods.
4. Implement methods in `adapters/drizzle/<domain>.ts` and memory path if tests need them.
5. Implement command in `<farm>/<aggregate>.ts` — parse → authorize → resolve deps → mutate → audit/outbox → `Result`.
6. Export from `src/index.ts` only when the surface is public.
7. Verify: `pnpm --filter @afenda/payroll check`.

## Capability cheat sheet

| Farm | Owns | Typical tables |
|------|------|----------------|
| `setup` | Calendar, pay group, rules | `payroll_calendar`, `payroll_pay_group`, `*_rule` |
| `assignments` | Employee assignment, recurring lines | `payroll_employee_assignment`, `payroll_recurring_*` |
| `inputs` | Period inputs / adjustments | `payroll_variable_input`, `payroll_adjustment` |
| `runs` | Period, run lifecycle, calc, reverse | `payroll_period`, `payroll_run`, `payroll_run_employee`, `payroll_exception` |
| `statutory` | Contributions, tax, submissions | `payroll_statutory_result` (+ submission aggregates) |
| `outputs` | Results, payslips, handoff instructions | `payroll_result_line`, `payroll_payslip` |
| `reconciliation` | Close / match controls | `payroll_reconciliation` |

## Agent operating rules

1. Prefer **extend** existing farm files over new root modules.
2. If disk layout and this skill disagree — stop and ask (Confusion management).
3. Do not invent `@afenda/payroll` subpackages or nest payroll under HR.
4. App Actions stay thin: Zod at Action, call package command, map to `ActionResult`.
5. Follow [workflow.md](workflow.md) one phase per task; run payroll-verifier before merge.

## Verification

- [ ] New code landed in the correct farm / schemas / store / adapter file
- [ ] No new root monolith (`schemas.ts`, `store.ts`, `drizzle-store.ts`, `memory-store.ts`)
- [ ] No `@afenda/human-resources` dependency in `packages/erp/payroll/package.json`
- [ ] `pnpm --filter @afenda/payroll check` green
- [ ] Manifest / mutation tables still aligned after table changes (`pnpm validate:modules`)
