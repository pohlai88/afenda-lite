# Payroll implementation checklist

## Command anatomy

```text
1. parsePayrollInput(schema, input)     → Result (Zod at package boundary)
2. requirePayroll*Permission(...)       → Result (manifest-driven; fail closed)
3. resolveCommandDeps(options)          → store, ports, authorization, employees
4. Domain invariants + store mutation   → Result
5. ports.audit.record + ports.outbox.append
6. return ok(domainEntity)
```

Every public function returns `Promise<Result<T>>` from root `@afenda/errors`.

## Slice landing checklist

Copy and track per aggregate:

```text
Payroll slice:
- [ ] Semantic owner chosen under `features/<feature>/`
- [ ] `contract.ts` and `schema.ts` — owned values and strict validation; no tenant injection from client
- [ ] `store-contract.ts` — narrow persistence capability
- [ ] `adapters/drizzle.ts` — production implementation
- [ ] `adapters/memory.ts` — parity implementation when persistence is used
- [ ] `<use-case>.ts` — command, query, or domain behavior
- [ ] `definition.ts` or named feature registry updated once; kernel projections remain derived
- [ ] package-wide identity added to `kernel/identity/` only when multiple features genuinely share it
- [ ] index.ts export (only if public)
- [ ] __tests__ — memory path; drizzle parity when persistence lands
- [ ] recursive architecture guards cover the feature and its adapters
- [ ] pnpm --filter @afenda/payroll check
```

## Import patterns

```ts
// Feature use case — narrow owned contract
import type { PayrollReconciliationStore } from "./store-contract";
import { reconcilePayrollInputSchema } from "./schema";

// Composition root (apps/web) — consume only the opaque root facade
import {
	createPayrollCalendar,
	createPayrollCapabilityOptions,
} from "@afenda/payroll";

// Package tests use relative internal imports; no testing subpath is published.
```

## Ports (do not bypass)

| Port | Role |
|------|------|
| `MutationPorts.audit` | Same-TX audit facts |
| `MutationPorts.outbox` | Domain events |
| `PayrollEmployeeQueryPort` | Workforce facts from app-wired HR adapter |
| `PayrollAuthorizationPort` | Permission checks — never Neon role display names |

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| Layer-first schema/store/adapter files for a new capability | Place contracts, behavior, and adapters inside the owning `features/<feature>/` capsule |
| `import … from "@afenda/human-resources"` inside payroll | Inject `PayrollEmployeeQueryPort` at `apps/web` |
| SQL in Server Actions | Call package command; adapters own SQL |
| Insert into `payment` / `journal` | Emit payroll handoff events; app saga / owning packages mutate |
| Feature handler or adapter importing the aggregate Payroll store | Depend on the feature store contract or an explicit narrow port |
| Feature importing `composition`, `facade`, or `testing` | Reverse the dependency and inject a narrow capability from composition |
| Growing a shared composition file with SQL | Keep composition construction-only; put SQL in the feature's Drizzle adapter |
| Root `shared/`, `types.ts`, or `ports.ts` | Assign meaning to a feature or a specifically named kernel owner |
| `{ success, data }` envelopes | Use `@afenda/errors` `Result`; Actions map to `ActionResult` |

## Structural reference

Use
[`feature-first-erp.md`](../afenda-semantic-registry-cutover/references/feature-first-erp.md)
for the uniform capsule and dependency rules. Use Human Resources only as a
structural reference; derive Payroll feature names from Payroll vocabulary.

## Verify commands

```bash
pnpm --filter @afenda/payroll lint
pnpm --filter @afenda/payroll typecheck
pnpm --filter @afenda/payroll test
pnpm --filter @afenda/payroll check
pnpm validate:modules
pnpm governance:packages
```

## See also

- [boundaries.md](boundaries.md) · [domain.md](domain.md) · [testing.md](testing.md) · [security.md](security.md)
- [workflow.md](workflow.md) · [decision-log.md](decision-log.md)
