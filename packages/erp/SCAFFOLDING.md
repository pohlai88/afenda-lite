# ERP package scaffolding — theory and guidelines

| Field | Value |
| ----- | ----- |
| Surface | `packages/erp/SCAFFOLDING.md` |
| Mode | Internal guide |
| Audience | Engineers adding or extending `@afenda/*` ERP packages |
| Action enabled | Scaffold a new bounded context without breaking sole-mutator, tenancy, or peer-import rules |
| Parents | [README.md](./README.md) · [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [PACKAGE-GOVERNANCE.md](../../docs-V2/modules/PACKAGE-GOVERNANCE.md) |

---

## 1. Theory — what an ERP package is

An ERP package under `packages/erp/<name>/` is a **bounded context** with three simultaneous identities:

| Identity | Meaning |
| -------- | ------- |
| **Published library** | Consumers import `@afenda/<name>` (or declared `exports` subpaths only). |
| **Sole mutator** | Only this package may INSERT/UPDATE/DELETE its `mutationTables` (see manifest + schema ownership manifest). |
| **Governed module** | `module.manifest.ts` is machine-checked; generated registers and CI gates derive from it. |

`packages/erp/` is a **category folder** — not a package. Never publish `@afenda/erp` or `@afenda/erp/*`.

### Layer placement

```text
Rank 3  apps/web          composition root (Actions, features, auth ports)
          │
          ▼ injects ports / passes org + actor
Rank 1F packages/erp/*    commands · queries · domain rules · store adapters
          │
          ▼ registered edges only
Rank 1C @afenda/db       schema + connectivity (DDL host, not business owner)
Rank 1C @afenda/events   outbox SSOT (append via injected port)
Rank 1C @afenda/audit    audit SSOT (record via injected port)
```

Imports flow **down**. ERP packages never import `apps/*`. Peer ERP packages do not import each other by default.

### Two scaffold families

| Family | Examples | `activationMode` | Notes |
| ------ | -------- | ---------------- | ----- |
| **Master-data backbone** | `@afenda/master-data` | `core` | Owns `md_*` / `ref_*` masters. No transactional document tables here. |
| **Transactional document** | sales, purchasing, inventory, … | `organization_toggle` | Owns module-specific `*_order`, `journal`, `stock_movement`, etc. |

Transactional modules **reference** masters (FK + stamped codes) per [ARCH-006 consumer contract](../../docs-V2/master-data/arch-006-consumer-contract.md). They must not create shadow customer/product/vendor tables.

### Integration styles (peer modules)

| Style | When | Example |
| ----- | ---- | ------- |
| **Events** | Default cross-module coupling | Sales emits `sales.order.posted.v1`; Receivables consumes |
| **Ports** | Registered dual-control edge only | Receiving → Inventory stock mutation via approved port |
| **App saga** | Multi-step orchestration at composition root | `apps/web` Action coordinates two packages — not package imports |

Manifest field `optionalIntegratesWith` documents intent; **workspace edges** authorize compile-time imports.

---

## 2. Physical scaffold

Target path: `packages/erp/<module-id>/` where `<module-id>` matches manifest `id` (kebab-case).

### Minimal transactional layout (reference: `@afenda/sales`)

```text
packages/erp/<module-id>/
├── package.json              # name: @afenda/<module-id>; workspace deps only via register
├── tsconfig.json
├── README.md                 # consume / maintain / ownership (Diátaxis package README)
├── src/
│   ├── index.ts              # public API only; `import "server-only"` at top
│   ├── module.manifest.ts    # AfendaModuleManifest — governance SSOT for this module
│   ├── module-ids.ts         # command + query id constants (typed unions)
│   ├── permissions.ts        # permission code constants
│   ├── authorization.ts      # *AuthorizationPort + require*Permission helpers
│   ├── command-options.ts    # *CommandOptions + resolve* deps (store, ports, auth)
│   ├── ports.ts              # MutationPorts, lookup ports — no app imports
│   ├── production-ports.ts     # wires @afenda/audit + @afenda/events for production
│   ├── store.ts              # Store interface (persistence abstraction)
│   ├── resolve-store.ts        # production store vs test override
│   ├── drizzle-store.ts        # Neon/Drizzle implementation (when applicable)
│   ├── memory-store.ts         # in-memory store for unit/domain tests
│   ├── adapters/drizzle/       # optional: split adapter modules when store grows
│   ├── schemas.ts              # Zod input schemas for public commands/queries
│   ├── parse-input.ts          # safeParse → Result (VALIDATION_ERROR)
│   ├── types.ts                # domain types + status unions
│   ├── brands.ts               # branded id schemas (API-003 at boundary)
│   ├── error-codes.ts          # stable module error codes + details helper
│   ├── shared/                 # pure helpers (code normalize, money, lifecycle)
│   └── <aggregate>.ts          # command/query implementations (e.g. order.ts)
└── __tests__/                  # domain tests; may use memory store + test ports
```

Not every file is mandatory on day one, but **manifest + authorization + Result-shaped public API** are non-negotiable before claiming `lifecycle: active`.

### Master-data additions

`@afenda/master-data` adds merge/import/change-request flows, search projectors, and more mutation tables. Same port and manifest discipline applies; difference is breadth of aggregates and `activationMode: core`.

---

## 3. Manifest — control plane first

Author `src/module.manifest.ts` **before** widening the public surface. It must satisfy `AfendaModuleManifest` from `@afenda/db/module-manifest`.

### Required manifest sections

| Section | Purpose |
| ------- | ------- |
| `id`, `category`, `packageName`, `band`, `lifecycle`, `activationMode` | Catalog alignment ([MODULE-CATALOG.generated.yaml](../../docs-V2/modules/MODULE-CATALOG.generated.yaml)) |
| `owns` | Aggregates, command/query namespaces and id lists |
| `persistence.mutationTables` | Sole-mutator tables — must match SCHEMA-OWNERSHIP-MANIFEST |
| `events.emits` / `consumes` | Event contract ids from `@afenda/events/schemas` |
| `permissions.codes` | Seeds platform permission catalog |
| `authorization.commands` / `queries` | Maps every command/query id → permission code |
| `moduleDependencies` | Logical requires (e.g. `master-data`) — not automatic import rights |
| `optionalIntegratesWith` | Documented peer integration style |

After manifest edits:

```bash
pnpm validate:modules --write   # regenerate MODULE-*.generated.yaml when needed
pnpm governance:packages
```

### Command and query ids

Use stable dotted ids aligned with namespace:

```text
<module>.<aggregate>.<verb>     # e.g. sales.order.create
<module>.<aggregate>.<query>    # e.g. sales.order.list
```

Define ids once in `module-ids.ts`; reference them in manifest, authorization, and tests.

---

## 4. Public API shape

### Export surface (`src/index.ts`)

- Top of file: `import "server-only";` for Node ERP packages.
- Export **commands**, **queries**, **types**, **schemas**, **permissions**, **error codes**, **command options type** — not internal store/drizzle files.
- Every public function returns `Promise<Result<T>>` from `@afenda/errors/result`.

### Command anatomy (pattern)

```text
1. parseSalesInput(schema, input)     → Result (Zod at boundary)
2. requireSalesCommandPermission(...)  → Result (manifest-driven)
3. resolveCommandDeps(options)         → store, ports, masters, authorization
4. Domain invariants + store mutation  → Result
5. ports.audit.record + ports.outbox.append (same transaction when production)
6. return ok(domainEntity)
```

Queries follow the same permission gate via `require*QueryPermission`.

### Input schemas

- Zod schemas in `schemas.ts` include **tenant context**: `organizationId`, `actorUserId`, `correlationId` on mutations.
- Optional fields use `.nullable()` at the package boundary when the command schema expects `string | null`, not `undefined` — align Actions with `?? null` where needed.
- Pagination: if the command schema requires `page` and `pageSize`, Actions must supply defaults — do not rely on Zod defaults through an optional Action input layer.

---

## 5. Ports and composition root

### Inside the package (`ports.ts`)

| Port | Role |
| ---- | ---- |
| `MutationPorts.audit` | Same-TX audit facts → `platform_audit_log` |
| `MutationPorts.outbox` | Domain events → `platform_domain_event` |
| `MasterLookupPort` (when needed) | Read masters via `@afenda/master-data` public API — never SQL dual-write into `md_*` |

Packages define **interfaces** only. They do not import `@afenda/admin` for RBAC.

### Authorization port (`authorization.ts`)

```ts
export type SalesAuthorizationPort = {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: SalesPermission;
  }): Promise<boolean>;
};
```

`require*Permission` reads `salesModuleManifest.authorization.commands[commandId]`. Missing port → `UNAUTHORIZED` (fail closed).

### Outside the package (`apps/web`)

Composition root wires production adapters:

```text
apps/web/lib/erp/<module>-command-options.ts   → create*CommandOptions()
apps/web/lib/erp/<module>-authorization-port.ts → session → can()
apps/web/app/actions/<verb>-<entity>.ts        → runOperatorPermissionAction + mapPackageResult
apps/web/features/<module>/                    → RSC shells + forms (no SQL)
```

Actions stay thin: validate form → call package command → `ActionResult` envelope → `revalidatePath`.

---

## 6. Persistence scaffold

### Store interface

- `store.ts` defines the persistence contract (load, save, list, optimistic version checks).
- `resolve-store.ts` picks `drizzle-store` in production and allows injection in tests.
- `memory-store.ts` supports fast domain tests without Neon.

### Schema ownership

- Table DDL lives in `@afenda/db` under the appropriate schema file.
- Register `writeOwner: @afenda/<module>` in [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml).
- Duplicate manifest `mutationTables` and ownership manifest — CI enforces parity.

### Tenancy

- Every hard tenant root: non-null `organization_id`.
- Lookups by id **also** constrain `organization_id` — never fetch by primary key alone.
- Register new roots in `packages/data-plane/db/src/hard-tenant-roots.ts` and `pnpm audit:tenancy-nulls`.

---

## 7. Events and permissions

### Events

1. Add schema constants in `@afenda/events` (owned catalog).
2. List emits in manifest `events.emits`.
3. Append via `OutboxPort` inside the mutation transaction.
4. Regenerate event register when instructed by validate-modules.

### Permissions

1. Add codes to `permissions.ts` and manifest `permissions.codes`.
2. Map every command/query in `authorization.commands` / `authorization.queries`.
3. Seed catalog: `pnpm --filter @afenda/db db:ensure-permission-catalog`.
4. Wire operator Action permission string to match catalog (e.g. `sales.order.create`).

---

## 8. Cross-module rules (ARCH-006)

Binding rules for transactional consumers:

1. **Reference masters** by FK + stamp `code` (and key display fields) at create/post — do not re-read mutable master fields as historical truth.
2. **No shadow tables** (`sales_customer`, `inventory_product`, etc.).
3. **Lookup** through master-data public commands or injected lookup port.
4. **No peer ERP imports** unless dual-control edge exists in WORKSPACE-EDGE-REGISTER.

Verify on every consumer PR:

```bash
rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" packages apps --glob "!**/node_modules/**"
# Expect: zero product shadow tables
```

---

## 9. New package checklist

Do not scaffold a new ERP package without:

| Step | Artifact |
| ---- | -------- |
| 1 | Approved row in [MODULE-ROADMAP.yaml](../../docs-V2/modules/MODULE-ROADMAP.yaml) |
| 2 | Folder `packages/erp/<id>/` + `package.json` name `@afenda/<id>` |
| 3 | `module.manifest.ts` complete |
| 4 | Schema + migration in `@afenda/db` + ownership manifest row |
| 5 | WORKSPACE-EDGE-REGISTER.yaml edges + consumer `package.json` deps |
| 6 | `CATALOG_EXPECTED_PACKAGES` / validate-modules catalog parity |
| 7 | Permission catalog seeds + manifest authorization map |
| 8 | Domain tests (`__tests__`) + Action wiring in `apps/web` |
| 9 | Package README (consume / maintain / anti-goals) |
| 10 | Green `pnpm governance:packages` and package `lint typecheck test` |

---

## 10. Anti-patterns

| Do not | Why |
| ------ | --- |
| Import another ERP package's `src/` or schemas | Peer coupling — use events or registered ports |
| Put business mutations in `@afenda/db` | Schema host only |
| Authorize only in middleware/layout | Commands must enforce permissions internally |
| Return `{ success, data }` from packages | Use `Result<T>` / `ActionResult` at app boundary |
| Create `/edge` no-op observability shims | False evidence — add real runtime adapters when needed |
| Add transactional tables to master-data | ARCH-006 violation |
| Skip manifest updates when adding commands | Generated registers and CI will drift |

---

## 11. Reference implementations

| Concern | Living reference |
| ------- | ---------------- |
| Transactional CRUD + manifest | `packages/erp/sales/src/` |
| Large ledger / period control | `packages/erp/accounting/src/` |
| Master backbone | `packages/erp/master-data/src/` |
| Composition root | `apps/web/lib/erp/sales-command-options.ts` |
| Server Action | `apps/web/app/actions/create-sales-order.ts` |
| Manifest contract type | `packages/data-plane/db/src/module-manifest-contract.ts` |
| Consumer contract | [docs-V2/master-data/arch-006-consumer-contract.md](../../docs-V2/master-data/arch-006-consumer-contract.md) |

---

## 12. Verify

```bash
pnpm --filter @afenda/<module> lint typecheck test
pnpm governance:packages
pnpm audit:tenancy-nulls          # after new tenant roots
```

For app wiring:

```bash
pnpm --filter @afenda/web typecheck
pnpm test -- apps/web/__tests__/*<module>*
```
