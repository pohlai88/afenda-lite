# @afenda/payroll — repository alignment report

| Field | Value |
|-------|-------|
| **Phase** | 0 — repository alignment (read-only) |
| **Date** | 2026-07-24 |
| **Status** | Draft — pending human review |
| **Authority** | [afenda-elite-payroll/SKILL.md](../../../.cursor/skills/afenda-elite-payroll/SKILL.md) · [IMPLEMENTATION_PLAN.md](../payroll-cursor-agent-pack/docs/payroll/IMPLEMENTATION_PLAN.md) · [human-resource.md](../erp/human-resource.md) |
| **Agent** | payroll-architect (Prompt 00) |

## Executive summary

`@afenda/payroll` is **already scaffolded** on disk (sliced `schemas/` · `store/` · `adapters/`, domain farm folders, manifest, permissions, ports). Phase 0 re-baselines against live repo patterns — **not** greenfield.

**Phase 1 scope (next):** complete the **public compile-time contract** — populate command/query IDs, authorization maps, expanded tests, and app composition stubs. Domain command bodies and full DDL remain Phase 3+ / Phase 2.

**Verify baseline (2026-07-24):**

| Command | Result |
|---------|--------|
| `pnpm --filter @afenda/payroll check` | PASS (typecheck + 2 manifest tests) |
| `pnpm validate:modules` | PASS (`payroll` in manifest register; 21 negative fixtures proven) |
| `pnpm governance:packages` | PASS (`payroll` listed in module manifests) |

---

## 1. Canonical files to copy

Per discovery checklist — cite these paths when implementing Phase 1+.

### 1.1 Module manifest and lifecycle

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Manifest shape | [`packages/erp/sales/src/module.manifest.ts`](../../../packages/erp/sales/src/module.manifest.ts) L29–81 | Smaller R1-F `active` reference — payroll stays `scaffolded` until Phase 1 exit |
| HR manifest (full) | [`packages/erp/human-resources/src/module.manifest.ts`](../../../packages/erp/human-resources/src/module.manifest.ts) | Events, deps, `authorization.commands` / `queries` maps |
| Payroll manifest (current) | [`packages/erp/payroll/src/module.manifest.ts`](../../../packages/erp/payroll/src/module.manifest.ts) L16–63 | `lifecycle: "scaffolded"`; auth maps empty L51–54 |
| Module register type | [`packages/data-plane/db/src/module-manifest.ts`](../../../packages/data-plane/db/src/module-manifest.ts) | `AfendaModuleManifest` satisfies |

### 1.2 Exports and TypeScript project references

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Package exports | [`packages/erp/payroll/package.json`](../../../packages/erp/payroll/package.json) L6–42 | Subpaths: `.`, `adapters/drizzle`, `schemas`, `store`, `testing`, `module-manifest` |
| HR exports (reference) | [`packages/erp/human-resources/package.json`](../../../packages/erp/human-resources/package.json) | Mirror export discipline; no deep `@afenda/payroll/src/*` |
| Root barrel | [`packages/erp/payroll/src/index.ts`](../../../packages/erp/payroll/src/index.ts) | Types + permissions + ports; no command exports yet |
| tsconfig | [`packages/erp/payroll/tsconfig.json`](../../../packages/erp/payroll/tsconfig.json) | Extends `@afenda/config` |

### 1.3 Schema and migration ownership

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Scaffold DDL | [`packages/data-plane/db/src/schema/scaffold-table.ts`](../../../packages/data-plane/db/src/schema/scaffold-table.ts) | Minimal tenant root: id, organization_id, timestamps |
| Payroll tables | [`packages/data-plane/db/src/schema/payroll.ts`](../../../packages/data-plane/db/src/schema/payroll.ts) | 19 `createErpScaffoldTable` exports — **Phase 2** adds columns |
| Mutation SSOT | [`packages/erp/payroll/src/mutation-tables.ts`](../../../packages/erp/payroll/src/mutation-tables.ts) | 19 tables + 29 aggregate names |
| Ownership register | `pnpm validate:modules` | Payroll included in manifest list |

### 1.4 Store, memory, and Drizzle adapters

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Store composition | [`packages/erp/payroll/src/store/index.ts`](../../../packages/erp/payroll/src/store/index.ts) | Intersection of 7 domain slices |
| Domain store contract | [`packages/erp/payroll/src/store/setup.ts`](../../../packages/erp/payroll/src/store/setup.ts) | Brand marker type — methods added Phase 3 |
| Drizzle compose | [`packages/erp/payroll/src/adapters/drizzle/store.ts`](../../../packages/erp/payroll/src/adapters/drizzle/store.ts) | `createDrizzlePayrollStore` — compose only |
| Domain drizzle slice | [`packages/erp/payroll/src/adapters/drizzle/setup.ts`](../../../packages/erp/payroll/src/adapters/drizzle/setup.ts) | Empty `{}` until Phase 3 |
| HR structural mirror | [`packages/erp/human-resources/src/adapters/drizzle/store.ts`](../../../packages/erp/human-resources/src/adapters/drizzle/store.ts) | Same compose-per-domain pattern |
| Default store resolver | [`packages/erp/payroll/src/resolve-store.ts`](../../../packages/erp/payroll/src/resolve-store.ts) | Defaults to memory store for tests |
| Memory factory | [`packages/erp/payroll/src/adapters/memory/store.ts`](../../../packages/erp/payroll/src/adapters/memory/store.ts) | Re-exported via `@afenda/payroll/testing` |

### 1.5 IDs, money, dates, validation, errors

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Command IDs (simple) | [`packages/erp/sales/src/module-ids.ts`](../../../packages/erp/sales/src/module-ids.ts) | Namespace + verb pattern |
| Command IDs (complex) | [`packages/erp/human-resources/src/module-ids.ts`](../../../packages/erp/human-resources/src/module-ids.ts) | Large registry + manifest auth sync |
| Payroll IDs (gap) | [`packages/erp/payroll/src/module-ids.ts`](../../../packages/erp/payroll/src/module-ids.ts) | **Empty arrays** — Phase 1 fill |
| Brands | [`packages/erp/payroll/src/brands.ts`](../../../packages/erp/payroll/src/brands.ts) | Only `PayrollRunId` today — expand per aggregate Phase 3+ |
| Mutation context Zod | [`packages/erp/payroll/src/schemas/common.ts`](../../../packages/erp/payroll/src/schemas/common.ts) | org/actor/correlation/idempotency/version |
| Parse helper | [`packages/erp/payroll/src/parse-input.ts`](../../../packages/erp/payroll/src/parse-input.ts) | `parsePayrollInput` → `Result` |
| Error codes | [`packages/erp/payroll/src/error-codes.ts`](../../../packages/erp/payroll/src/error-codes.ts) | Only `payroll.validation` — expand with domain codes Phase 3+ |
| Money in port DTO | [`packages/erp/payroll/src/ports.ts`](../../../packages/erp/payroll/src/ports.ts) L14–23 | `baseCompensation: string` — see decision PAY-DEC-003 |

### 1.6 Authorization and command metadata

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Permission codes | [`packages/erp/payroll/src/permissions.ts`](../../../packages/erp/payroll/src/permissions.ts) | 10 codes declared; aligned with PLATFORM_PERMISSION_V1 |
| require* helpers | [`packages/erp/payroll/src/authorization.ts`](../../../packages/erp/payroll/src/authorization.ts) | Uses manifest auth map — blocked until IDs populated |
| Command anatomy | [`packages/erp/human-resources/src/leave/leave-request.ts`](../../../packages/erp/human-resources/src/leave/leave-request.ts) L1–45 | parse → authorize → store → audit/outbox → `Result` |
| Command options | [`packages/erp/payroll/src/command-options.ts`](../../../packages/erp/payroll/src/command-options.ts) | `resolveCommandDeps` wires store/ports/auth/employees |

### 1.7 Events and transactional outbox

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Event constants + Zod | [`packages/data-plane/events/src/schemas/payroll.events.ts`](../../../packages/data-plane/events/src/schemas/payroll.events.ts) | 7 events; `payrollEntityPayloadSchema` |
| Production outbox | [`packages/erp/payroll/src/production-ports.ts`](../../../packages/erp/payroll/src/production-ports.ts) | `createSqlAuditFactPort` + `createSqlOutboxPort` via `@afenda/audit` / `@afenda/events` |
| Manifest emits | [`packages/erp/payroll/src/module.manifest.ts`](../../../packages/erp/payroll/src/module.manifest.ts) L34–45 | Lists all 7 payroll events |

### 1.8 Ports and app composition

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Port definitions | [`packages/erp/payroll/src/ports.ts`](../../../packages/erp/payroll/src/ports.ts) | `PayrollEmployeeQueryPort`, `MutationPorts` |
| HR app composition | [`apps/web/lib/erp/human-resources-command-options.ts`](../../../apps/web/lib/erp/human-resources-command-options.ts) | **Missing:** `payroll-command-options.ts` |
| Payroll auth adapter | [`apps/web/lib/erp/payroll-authorization-port.ts`](../../../apps/web/lib/erp/payroll-authorization-port.ts) | Wired to `hasPermission` |
| HR query port adapter (pattern) | [`apps/web/lib/erp/human-resources-approved-leave-query-port.ts`](../../../apps/web/lib/erp/human-resources-approved-leave-query-port.ts) | Template for `payroll-employee-query-port.ts` |
| Scratch port contract | [`docs-V2/_scratch/erp/human-resource.md`](../erp/human-resource.md) L704–724 | `PayrollEmployeeQueryPort` SSOT shape |

### 1.9 Tests and architecture checks

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Manifest tests | [`packages/erp/payroll/__tests__/manifest.test.ts`](../../../packages/erp/payroll/__tests__/manifest.test.ts) | 2 tests — expand like HR |
| HR manifest parity | [`packages/erp/human-resources/__tests__/manifest.test.ts`](../../../packages/erp/human-resources/__tests__/manifest.test.ts) L77–134 | Auth map alignment tests |
| Security boundary | [`packages/erp/human-resources/__tests__/security-boundary.test.ts`](../../../packages/erp/human-resources/__tests__/security-boundary.test.ts) | Org isolation pattern for Phase 3+ |
| Vitest project | [`testing/vitest.config.ts`](../../../testing/vitest.config.ts) | `--project payroll` |

### 1.10 Boundaries and mutation ownership

| Pattern | Canonical file | Payroll apply |
|---------|----------------|---------------|
| Skill boundaries | [`.cursor/skills/afenda-elite-payroll/boundaries.md`](../../../.cursor/skills/afenda-elite-payroll/boundaries.md) | No HR/payment/journal mutation |
| Path rules | [`.cursor/rules/payroll-boundaries.mdc`](../../../.cursor/rules/payroll-boundaries.mdc) | Auto-attach on `packages/erp/payroll/**` |
| Peer import ban | [`packages/erp/payroll/__tests__/manifest.test.ts`](../../../packages/erp/payroll/__tests__/manifest.test.ts) L31–36 | No `@afenda/human-resources` dependency |
| Scratch ownership | [`docs-V2/_scratch/erp/human-resource.md`](../erp/human-resource.md) §5–6 | Sole mutator for `payroll_*` |

---

## 2. Conventions to follow

| Topic | Convention | Authority |
|-------|------------|-----------|
| Outcomes | `Promise<Result<T>>` from `@afenda/errors/result` at package boundary; `ActionResult` at app Actions | [`implementation.md`](../../../.cursor/skills/afenda-elite-payroll/implementation.md) |
| Input validation | Zod strict schemas in `schemas/<domain>.ts`; `parsePayrollInput` at command entry | [`parse-input.ts`](../../../packages/erp/payroll/src/parse-input.ts) |
| Tenant stamping | `organizationId`, `actorUserId`, `correlationId` from session at composition root — never from client | [`schemas/common.ts`](../../../packages/erp/payroll/src/schemas/common.ts) |
| Mutations | Same-TX audit + outbox via `MutationPorts` | [`production-ports.ts`](../../../packages/erp/payroll/src/production-ports.ts) |
| Layout | Sliced farms — **reject** scratch pack root `schemas.ts` / `store.ts` / `drizzle-store.ts` | [`package-tree.md`](../../../.cursor/skills/afenda-elite-payroll/package-tree.md) |
| HR integration | `PayrollEmployeeQueryPort` injected at `apps/web` — **no** `@afenda/human-resources` import in payroll package | [`boundaries.md`](../../../.cursor/skills/afenda-elite-payroll/boundaries.md) |
| Payments/Accounting | Emit `payroll.payment-requested.v1` / `payroll.posting-requested.v1` — no direct `payment` / `journal` inserts | [`domain.md`](../../../.cursor/skills/afenda-elite-payroll/domain.md) |
| Money | No JavaScript `number` for amounts; lossless string decimal at boundaries until branded money type decided | PAY-DEC-003 |
| Tests | Synthetic fixtures only | [`security.md`](../../../.cursor/skills/afenda-elite-payroll/security.md) |
| Lifecycle | `scaffolded` → `active` only after Phase 1 exit gate | PAY-DEC-002 |

---

## 3. Dependencies available

### Workspace dependencies (`packages/erp/payroll/package.json`)

| Package | Role |
|---------|------|
| `@afenda/db` | Schema host; module manifest types |
| `@afenda/errors` | `Result` / `fail` / `ok` |
| `@afenda/events` | Outbox publish + payroll event schemas |
| `@afenda/audit` | Audit fact writes |
| `zod` | Boundary validation |
| `server-only` | Package server boundary |

### Confirmed absent (required)

- `@afenda/human-resources` — **not** in dependencies (test enforced)

### App-level (`apps/web/package.json`)

- `@afenda/payroll` workspace dependency declared
- `@afenda/human-resources` available for **adapter** wiring only (app composition root)

### No new dependencies anticipated for Phase 1

---

## 4. Proposed walking-skeleton files — disk delta for Phase 1

### Already on disk (keep as-is)

```text
packages/erp/payroll/src/
  module.manifest.ts · permissions.ts · authorization.ts · command-options.ts
  ports.ts · production-ports.ts · resolve-store.ts · parse-input.ts
  brands.ts · error-codes.ts · types.ts · mutation-tables.ts
  schemas/** · store/** · adapters/** · {setup,assignments,inputs,runs,statutory,outputs,reconciliation}/**
packages/data-plane/db/src/schema/payroll.ts   # scaffold tables
apps/web/lib/erp/payroll-authorization-port.ts
```

### Phase 1 must add or fill

| File | Action |
|------|--------|
| `src/module-ids.ts` | Populate walking-skeleton command/query IDs (see §4.1) |
| `src/module.manifest.ts` | Wire `authorization.commands` / `queries`; update `owns.commands` / `queries` |
| `__tests__/manifest.test.ts` | Add auth-map alignment + permission uniqueness + event parity tests (mirror HR) |
| `__tests__/export-surface.test.ts` | New — assert root barrel exports only intentional symbols |
| `apps/web/lib/erp/payroll-command-options.ts` | New — composition root factory |
| `apps/web/lib/erp/payroll-employee-query-port.ts` | New — HR-backed read adapter (no payroll→HR package import) |

### Phase 1 must NOT add

- Root monolith `schemas.ts`, `store.ts`, `drizzle-store.ts`, `memory-store.ts`
- Real command function bodies (remain aggregate markers)
- Full column migrations (Phase 2)
- Calculation / finalization logic (Phase 5–8)

### 4.1 Proposed walking-skeleton command/query IDs (Phase 1 contract)

Register IDs in Phase 1; implement commands in Phase 3+ slices.

**Setup (Phase 3 slice)**

| ID | Permission |
|----|------------|
| `payroll.setup.calendar.create` | `payroll.setup.manage` |
| `payroll.setup.calendar.update` | `payroll.setup.manage` |
| `payroll.setup.pay-group.create` | `payroll.setup.manage` |
| `payroll.setup.earning-rule.create` | `payroll.setup.manage` |
| `payroll.setup.deduction-rule.create` | `payroll.setup.manage` |
| `payroll.setup.statutory-rule.create` | `payroll.setup.manage` |

**Assignments + inputs (Phase 4–5)**

| ID | Permission |
|----|------------|
| `payroll.assignment.create` | `payroll.setup.manage` |
| `payroll.input.variable.create` | `payroll.input.manage` |

**Runs (Phase 5–8)**

| ID | Permission |
|----|------------|
| `payroll.run.create` | `payroll.run.create` |
| `payroll.run.calculate` | `payroll.run.calculate` |
| `payroll.run.review` | `payroll.run.review` |
| `payroll.run.finalize` | `payroll.run.finalize` |
| `payroll.run.reverse` | `payroll.run.reverse` |

**Queries (minimal read contract)**

| ID | Permission |
|----|------------|
| `payroll.run.get` | `payroll.run.review` |
| `payroll.run.list` | `payroll.run.review` |
| `payroll.payslip.get-own` | `payroll.payslip.read-own` |
| `payroll.payslip.get` | `payroll.payslip.read-all` |

---

## 5. Risks and open decisions

| ID | Topic | Risk | Resolution path |
|----|-------|------|-----------------|
| PAY-DEC-001 | HR14 / `PayrollEmployeeQueryPort` adapter timing | Phase 4 assignment slice blocked without HR read DTO | Phase 1 stub adapter in `apps/web`; HR query commands per roadmap HR14 |
| PAY-DEC-002 | `lifecycle: scaffolded` → `active` | Premature `active` claims module readiness | Promote only after Phase 1 exit gate + `pnpm validate:modules` |
| PAY-DEC-003 | Money canonical type | Inconsistent arithmetic if mixed number/string | Accept string decimal at port boundary (matches scratch + current `ports.ts`); branded money type Phase 2+ |
| PAY-DEC-004 | Statutory jurisdiction scope | False production-readiness claims | Explicit non-goal until domain specialist sign-off |

Full decision records (Scratch — not Living ADR tree):

- [PAY-DEC-001-hr-port-adapter.md](PAY-DEC-001-hr-port-adapter.md)
- [PAY-DEC-002-lifecycle-promotion.md](PAY-DEC-002-lifecycle-promotion.md)
- [PAY-DEC-003-money-decimal-string.md](PAY-DEC-003-money-decimal-string.md) (accepted)
- [PAY-DEC-004-statutory-jurisdiction-scope.md](PAY-DEC-004-statutory-jurisdiction-scope.md) (accepted)

---

## 6. Commit-by-commit plan for Phase 1

| # | Commit focus | Files |
|---|--------------|-------|
| 1 | Command/query ID registry | `module-ids.ts`, `module.manifest.ts` (`owns` + `authorization`) |
| 2 | Manifest test parity | `__tests__/manifest.test.ts` — auth map, events, permission uniqueness |
| 3 | Export surface guard | `__tests__/export-surface.test.ts` |
| 4 | App composition stubs | `apps/web/lib/erp/payroll-command-options.ts`, `payroll-employee-query-port.ts` |
| 5 | Verify + lifecycle note | README lifecycle note; run `pnpm --filter @afenda/payroll check` + `pnpm validate:modules` |

**Phase 1 exit gate:** typecheck + expanded tests green; auth maps complete; no peer HR import; **no** real domain command bodies.

---

## 7. Explicit non-goals

- Living `docs/payroll/` tree
- Full DDL / column design (Phase 2 — `SCHEMA_DESIGN.md` in Scratch)
- Gross-to-net calculation engine (Phase 7)
- Transactional finalization + outbox behavior (Phase 8)
- Payslip UI / server actions
- Statutory production readiness for any jurisdiction
- Promoting `lifecycle` to `active` before Phase 1 exit gate
- Recreating root monolith modules from scratch pack layout diagram in [`human-resource.md`](../erp/human-resource.md) §5 (superseded by sliced disk layout)

---

## Phase 0 exit gate checklist

- [x] `REPOSITORY_ALIGNMENT.md` written under `docs-V2/_scratch/payroll/`
- [x] Phase 1 abstractions map to cited canonical files or Scratch decision entries
- [x] Gap list confirms sliced layout; no root monolith proposal
- [x] Peer ERP / mutation boundary risks documented
- [ ] Human review of open decisions (PAY-DEC-001 through PAY-DEC-004)
- [ ] Optional payroll-verifier pass on this report (see below)

---

## Verifier note (Phase 0)

Read-only payroll-verifier review of this alignment artifact:

| Severity | Finding |
|----------|---------|
| — | No BLOCKER — report complete for Phase 0 scope |
| MEDIUM | Phase 1 command ID table is a proposal — human must confirm before commit 1 |
| MEDIUM | HR14 dependency may delay Phase 4; Phase 1 adapter can stub with `null` until HR queries ship |
| LOW | Expand `error-codes.ts` when first real commands land (Phase 3) |

**Verdict:** `PASS WITH FOLLOW-UPS` — proceed to Phase 1 after human confirms PAY-DEC-001–004.
