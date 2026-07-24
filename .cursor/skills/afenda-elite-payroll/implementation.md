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

Every public function returns `Promise<Result<T>>` from `@afenda/errors/result`.

## Slice landing checklist

Copy and track per aggregate:

```text
Payroll slice:
- [ ] Farm folder chosen (setup | assignments | inputs | runs | statutory | outputs | reconciliation)
- [ ] schemas/<domain>.ts — strict Zod; no tenant injection from client
- [ ] store/<domain>.ts — persistence methods typed
- [ ] adapters/drizzle/<domain>.ts — methods composed via createDrizzlePayrollStore
- [ ] adapters/memory — covered when unit tests need the method
- [ ] <farm>/<aggregate>.ts — command/query
- [ ] module-ids.ts + module.manifest.ts authorization map (if new command id)
- [ ] brands.ts — branded ids at boundary
- [ ] index.ts export (only if public)
- [ ] __tests__ — memory path; drizzle parity when persistence lands
- [ ] pnpm --filter @afenda/payroll check
```

## Import patterns

```ts
// Domain command — narrow store
import type { PayrollRunsStore } from "../store/runs";
import { createPayrollRunInputSchema } from "../schemas/runs";

// Composition root (apps/web)
import { createDrizzlePayrollStore } from "@afenda/payroll/adapters/drizzle";
import type { PayrollCommandOptions } from "@afenda/payroll";

// Tests
import { createMemoryPayrollStore } from "@afenda/payroll/testing";
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
| New root `schemas.ts` / `store.ts` / `drizzle-store.ts` | Use sliced trees under `schemas/`, `store/`, `adapters/` |
| `import … from "@afenda/human-resources"` inside payroll | Inject `PayrollEmployeeQueryPort` at `apps/web` |
| SQL in Server Actions | Call package command; adapters own SQL |
| Insert into `payment` / `journal` | Emit payroll handoff events; app saga / owning packages mutate |
| One command file importing every store slice | Depend on the narrowest `Payroll*Store` |
| Growing `adapters/drizzle/store.ts` with SQL | Keep compose-only; put SQL in domain adapter files |
| `{ success, data }` envelopes | Use `@afenda/errors` `Result`; Actions map to `ActionResult` |

## Structural reference (HR)

When unsure where a file goes, open the matching HR path and mirror the role — not the HR domain names:

| Payroll | HR analogue |
|---------|-------------|
| `schemas/runs.ts` | `schemas/leave.ts` (domain Zod) |
| `store/runs.ts` | `store/leave.ts` (domain store) |
| `adapters/drizzle/runs.ts` | `adapters/drizzle/leave.ts` |
| `adapters/drizzle/store.ts` | `adapters/drizzle/store.ts` (compose only) |
| `adapters/memory/store.ts` | `adapters/memory/store.ts` |
| `runs/payroll-run.ts` | `leave/leave-request.ts` (command) |

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
