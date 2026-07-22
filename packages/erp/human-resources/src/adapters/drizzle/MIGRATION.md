# Apply the HR Drizzle adapter refactor

## Target layout

```text
src/adapters/drizzle/
├── index.ts
├── store.ts
├── coverage.ts
├── core.ts
├── organization.ts
├── recruitment.ts
├── lifecycle.ts
├── leave.ts
├── compensation.ts
├── performance.ts
├── learning.ts
├── workforce-planning.ts
├── compliance.ts
└── employee-relations.ts
```

`store.ts` becomes the only composition root. The former `core.ts` class is replaced by three attachable domain adapters:

- `core.ts` — employee, employment, employment contract, work assignment
- `organization.ts` — department, job, position, reporting line, organization tree
- `recruitment.ts` — requisition, candidate, application, interview, offer

## PowerShell

Run from the repository root after extracting this folder:

```powershell
$source = ".\hr-drizzle-refactor"
$target = ".\packages\erp\human-resources\src\adapters\drizzle"

Copy-Item "$target" "$target.backup" -Recurse -Force
Copy-Item "$source\*.ts" $target -Force

pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
```

Remove the backup only after parity, transaction, and package tests pass.

## Required checks

```powershell
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources lint
```

Also run the repository's Drizzle schema or Neon parity test command when it is separate from the package test suite.

## Expected compiler signal

Inspect `MissingDrizzleHumanResourcesMethods` in `coverage.ts`. Any non-`never` members are authoritative `HumanResourcesStore` methods not owned by the composed Drizzle adapter. Based on the supplied package tree, the expected unimplemented domains are `time` and `talent`.

Do not silence this inventory with `Record<string, unknown>`, empty adapters, or additional factory casts. Implement those domains only when their store contracts and database tables are available.
