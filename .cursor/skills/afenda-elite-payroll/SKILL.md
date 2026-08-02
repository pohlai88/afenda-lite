---
name: afenda-elite-payroll
description: >-
  Implements and extends @afenda/payroll using the uniform ERP feature-first
  facade, kernel, composition, features, and testing topology.
  Covers package boundaries, domain invariants, calculation/finalization,
  testing, security, and phased workflow. Use when adding payroll commands,
  Zod schemas, store methods, Drizzle adapters, reconciliation/runs/setup
  slices, architect planning, verifier review, or when the user mentions
  payroll package structure, payroll_* sole mutator, or afenda-elite-payroll.
disable-model-invocation: true
---

# Afenda Elite — payroll package

**Payroll-domain SSOT for `@afenda/payroll`.** The repository-wide topology is
owned by
[`afenda-semantic-registry-cutover`](../afenda-semantic-registry-cutover/SKILL.md).
Each Payroll feature owns its contract, schema, store capability, adapters,
policy, and operations behind one root facade.

```text
LOAD:
  companions: package-tree.md · implementation.md · boundaries.md · domain.md
              · testing.md · security.md · workflow.md
  ../afenda-semantic-registry-cutover/references/feature-first-erp.md
  packages/erp/payroll/** · packages/erp/SCAFFOLDING.md
  docs-V2/_scratch/human-resources/human-resources-prd.md       # HR ownership boundary
  docs-V2/_scratch/payroll/PAYROLL-PRD-MY-VN.md                 # product requirements
SKIP:
  Living docs/payroll/** and Living docs/architecture as required LOAD
  peer import @afenda/human-resources from payroll
  dual-write payroll_* from apps/web
  owning hr_* / inserting payment or journal rows from payroll
  recreating root schemas.ts · store.ts · shared/ · types.ts · ports.ts
  feature imports from facade/ · composition/ · testing/
  feature handlers or adapters that accept the composite Payroll store
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
- Reviewing which Payroll feature owns a capability
- Scaffolding a new aggregate under an existing capability farm
- Planning payroll phases or verifying completed payroll work

## Hard rules

1. **Uniform ERP topology** — production source uses only justified `facade/`, `kernel/`, `composition/`, `features/`, and `testing/` roots plus `index.ts`.
2. **Features own vertical slices** — contracts, schemas, policies, operations, narrow store contracts, and adapters live under `src/features/<feature>/`.
3. **One semantic owner** — feature definitions own business meaning; the kernel composes and validates registries without redefining feature policy.
4. **One-way dependencies** — features may use their own contracts, narrow ports, and approved kernel primitives; they never import `facade`, `composition`, or `testing`.
5. **Composite-store containment** — only composition combines feature adapters. Feature handlers and adapters never name, accept, construct, or import the aggregate Payroll store.
6. **Final deletion cutover** — delete shallow business farms, root `shared/`, generic `types.ts`/`ports.ts`, superseded aliases, and old architecture fixtures after parity; leave no forwarding paths.
7. **No peer ERP import of HR** — workforce facts cross a Payroll-owned capability supplied by application composition.
8. **Sole mutator** — only this package writes `payroll_*` (see the canonical mutation inventory and SCHEMA-OWNERSHIP-MANIFEST).
9. **Events for Payments/Accounting** — emit versioned requests; do not insert payment or journal rows here.
10. **Public API** — the sole root barrel exports durable commands, queries, permissions, result-facing types, and opaque capability factories. Internals stay private.
11. **Quality bar** — enterprise production only; no shim/stub product paths.
12. **Organization scope** — every aggregate, command, query, unique key, and mutation is scoped by `organizationId`.
13. **Money** — never use JavaScript `number` for monetary arithmetic; use lossless decimal values and explicit rounding.
14. **Effective-dated rules** — statutory, earning, and deduction rules are versioned; runs record the exact versions used.
15. **Deterministic calculation** — the same snapshots, rules, calculator version, and rounding policy produce the same result.
16. **Finalized immutability** — corrections use adjustments, off-cycle runs, or compensating reversals; never rewrite finalized lines.
17. **Synthetic fixtures only** — never use real employee, salary, bank, tax, or payslip data in prompts, tests, or commits.

## Quick start (new command)

1. Confirm the owning feature from [package-tree.md](package-tree.md).
2. Add the owned contract and strict validation under `features/<feature>/`; stamp org/actor/correlation at the composition boundary.
3. Add the narrow persistence contract as `features/<feature>/store-contract.ts`.
4. Add memory and Drizzle implementations under `features/<feature>/adapters/` when persistence is required.
5. Implement the use case in the feature — parse → authorize → resolve narrow capabilities → mutate/read → audit/outbox → `Result`.
6. Export from `src/index.ts` only when the surface is public.
7. Verify: `pnpm --filter @afenda/payroll check`.

## Capability cheat sheet

| Feature | Owns | Typical tables |
|------|------|----------------|
| `payroll-setup` | Calendar, pay group, effective-dated rules | `payroll_calendar`, `payroll_pay_group`, `*_rule` |
| `employee-assignments` | Employee assignment and recurring lines | `payroll_employee_assignment`, `payroll_recurring_*` |
| `workforce-ingress` | Accepted HR facts, normalization, correction lineage | Payroll-owned accepted-input records |
| `variable-inputs` | Period inputs, adjustments, opening balances | `payroll_variable_input`, `payroll_adjustment` |
| `payroll-runs` | Period, run lifecycle, finalization, reversal | `payroll_period`, `payroll_run`, `payroll_run_employee`, `payroll_exception` |
| `calculation` | Deterministic gross-to-net and cumulative balances | `payroll_result_line` |
| jurisdiction/statutory features | Contributions, tax, submissions | `payroll_statutory_result` and submission records |
| output features | Payslips and payment/posting projections | `payroll_payslip`; event projections |
| `reconciliation` | Close / match controls | `payroll_reconciliation` |

## Agent operating rules

1. Prefer **extend** the owning feature over new kernel or composition abstractions.
2. If disk layout and this skill disagree — stop and ask (Confusion management).
3. Do not invent `@afenda/payroll` subpackages or nest payroll under HR.
4. App Actions stay thin: Zod at Action, call package command, map to `ActionResult`.
5. Follow [workflow.md](workflow.md) one phase per task; run payroll-verifier before merge.

## Verification

- [ ] New business code landed in one `features/<feature>/` capsule
- [ ] Source root contains only `index.ts` and justified horizontal surfaces
- [ ] No root `schemas`, `store`, `adapters`, `shared`, `types.ts`, or `ports.ts`
- [ ] No feature imports from `facade`, `composition`, or `testing`
- [ ] No feature handler or adapter depends on the composite Payroll store
- [ ] No `@afenda/human-resources` dependency in `packages/erp/payroll/package.json`
- [ ] `pnpm --filter @afenda/payroll check` green
- [ ] Manifest / mutation tables still aligned after table changes (`pnpm validate:modules`)
