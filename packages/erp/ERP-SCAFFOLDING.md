# ERP package scaffolding requirements

| Field | Value |
| --- | --- |
| Surface | `packages/erp/SCAFFOLDING.md` |
| Status | Draft internal guide |
| Applies to | New or structurally reworked `packages/erp/<bounded-context>` packages |
| Does not authorize | A new package, peer ERP dependency, schema ownership, module activation, or lifecycle promotion |
| Method | Feature-first modular monolith + semantic registry cutover |

## 1. Required outcome

An ERP package is one bounded context inside the Afenda modular monolith. It owns
its business vocabulary and mutations, exposes one permanent root facade, and
keeps implementation changes invisible to production consumers.

It must have:

- one named feature owner for every business term, status, workflow, operation,
  schema, and policy;
- domain registries composed into one authoritative package semantic contract;
- types, validation, authorization, emissions, serialization, manifests, and
  documentation inventories derived from those owners;
- feature-owned narrow persistence and capability ports;
- application-owned cross-package composition;
- one root facade returning canonical `@afenda/errors` `Result` values;
- atomic, tenant-safe mutation behavior and deterministic permanence guards.

`packages/erp/` is a category folder, never an `@afenda/erp` package. Do not split
a bounded context merely because it is large or create a runtime registry package.

## 2. Admission contract

Freeze and verify this before scaffolding:

```yaml
erp_package_mission:
  target: packages/erp/<module-id>
  package_name: "@afenda/<module-id>"
  bounded_context: <business boundary and explicit non-goals>
  canonical_owners: <feature registries/policy owners>
  permanent_facade: "@afenda/<module-id>"
  features: <business capability inventory>
  operations: <commands, queries, owners, permissions, policies>
  normalization_boundary: <feature-owned schemas/ingress>
  projections: <manifest, authorization, events, serialization, docs>
  persistence: <mutation roots and atomic effect plans>
  tenant_lineage: <organization-owned roots and relationships>
  integrations: <events, narrow ports, or app-owned sagas>
  dependencies: <authorized workspace edges>
  consumers: <verified intended direct consumers>
  acceptance: <focused commands and outcomes>
```

Required prior authority:

- approved module-roadmap/package intent;
- package owner, bounded-context boundary, lifecycle, and activation intent;
- dependency edges authorized in both the workspace-edge register and `package.json`;
- mutation ownership in the schema-ownership manifest before production writes.

Stop on ambiguous feature ownership, peer-module responsibility, facade, or
persistence ownership. High fan-out is an ownership finding, not permission to
move business contracts into `shared` or `kernel`.

## 3. Mandatory feature-first topology

```text
packages/erp/<module-id>/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # sole production entrypoint; explicit exports
│   ├── facade/               # stable representation-safe capabilities
│   ├── kernel/               # package-wide registry composition and primitives
│   ├── composition/          # aggregate adapter construction and runtime wiring
│   ├── features/             # primary business-ownership axis
│   └── testing/              # isolated memory/parity capabilities when justified
├── __tests__/                # facade, architecture, behavior, and parity contracts
└── scripts/                  # deterministic layout/governance checks when required
```

Horizontal directories are permissions, not empty-folder requirements. The source
root must not contain package-wide `adapters/`, `schemas/`, `store/`, `shared/`,
`types.ts`, or `ports.ts` business layers.

### Uniform feature capsule

```text
features/<feature>/
├── index.ts                  # private projection when composition needs it
├── definition.ts             # canonical operations/statuses/policy dispositions
├── contract.ts               # owned inputs, outputs, values, and invariants
├── schema.ts                 # ingress validation derived from owned contracts
├── policy.ts                 # authorization/privacy/workflow policy
├── <use-case>.ts             # commands, queries, and domain behavior
├── store-contract.ts         # smallest persistence capability
├── ports.ts                  # explicit peer/external capabilities when required
├── adapters/
│   ├── memory.ts             # semantic-parity adapter
│   └── drizzle.ts            # production persistence adapter
└── __tests__/                # colocated feature contracts when justified
```

Omit files without real semantic content. Large features may use named business
subfeatures; they may not recreate generic layer farms.

## 4. Ownership and dependency direction

```text
consumer → package root → facade → composition → feature adapters
                                  │              │
                                  └── kernel ────┘
```

- Features use their own contracts, approved lower packages, package-wide kernel
  primitives, and explicit narrow ports.
- No file under `features/**`, including adapters and colocated tests, imports
  `composition`, `facade`, or `testing`.
- A feature adapter implements its feature store contract; it never names,
  accepts, constructs, or imports the composite package store.
- Composition constructs aggregates and exposes capabilities, not a barrel of
  feature adapters.
- Adapter-neutral helpers have a neutral composition owner; memory does not depend
  on Drizzle-specific composition or the reverse.
- Cross-feature workflows use explicit capabilities, never peer implementations.
- Peer ERP imports are denied by default. Cross-module behavior is event-first; an
  approved narrow port needs dual-control authorization; multi-package sagas live
  in `apps/web` or another approved application host.

## 5. Canonical operation and module contract

Each public operation has exactly one feature-owned definition. Add fields only
when they drive a real invariant or projection:

```ts
type OperationDefinition = {
	readonly id: string;
	readonly kind: "command" | "query";
	readonly owner: string;
	readonly permission: string;
	readonly authorizationPolicy: string;
	readonly privacyPolicy: string | "none";
	readonly transaction: "required" | "supported" | "none";
	readonly idempotency: "required" | "supported" | "none";
	readonly audit: "required" | "conditional" | "none";
	readonly emission: "required" | "conditional" | "none";
	readonly publicProjection: string | "none";
	readonly observabilityClass: string;
};
```

The kernel composes feature definitions, validates uniqueness and references, and
derives package projections. It fails closed on missing owners, permissions,
policies, transaction/idempotency/privacy dispositions, audit/event declarations,
or contradictory metadata.

`module.manifest.ts`, authorization and permission inventories, event coverage,
mutation-table coverage, operation types, and documentation inventories must be
composed or generated from canonical feature definitions. They are not parallel
hand-maintained sources. Tool-required YAML is a deterministic projection.

## 6. Permanent public facade

`src/index.ts` is the only production-consumer entrypoint and begins with
`import "server-only"` for a Node-only ERP package.

The root may expose explicit commands/queries, representation-safe domain types
and schemas, canonical declarations needed by callers, an opaque execution
context or stable options factory, and `Promise<Result<T, C>>` outcomes.

It must not expose stores, composite contexts, raw ports, adapter factories,
Drizzle/SQL constructors, database handles, transactions, implementation classes,
framework types, manual wire envelopes, or registry storage shapes.

An auxiliary `/testing` or `/composition` export requires a proved isolation need
and accepted consumer class. It cannot become a second business API. Internal
refactors require zero production-consumer edits.

## 7. Ingress, errors, and security

- External input starts as `unknown` and is parsed by a feature-owned Zod schema.
- Organization, actor, and correlation identity are trusted context stamped at
  application composition; reject tenant-field injection from user input.
- Historical aliases stay beside ingress, normalize immediately, and never appear
  in new construction or output.
- Reuse existing branded IDs; do not create parallel representations.
- Unknown, database, and vendor failures normalize once through `@afenda/errors`.
- Every public command and scoped query enforces its derived permission through an
  injected port. Route checks alone are insufficient; missing authorization fails closed.
- Sensitive projections follow canonical privacy dispositions. Logs, events,
  diagnostics, and errors never leak secrets, vendor payloads, or protected data.

## 8. Persistence, tenancy, audit, and events

`@afenda/db` hosts DDL and connectivity; the ERP package is the sole business
mutator of its registered tables.

For every `transaction: "required"` command, derive one execution plan:

```text
authoritative state
  + required history/consistency rows
  + required audit fact
  + required outbox event
  = one commit or no commit
```

- The registry owns required effects; adapters own SQL and transaction mechanics.
- Never commit state and then call audit/outbox, compensate partial success, or
  perform an external call as if transactionally atomic.
- External effects begin from the committed outbox.
- Every hard tenant root has non-null `organization_id` and is registered in the
  canonical hard-tenant-root registry.
- Every read, join, update, delete, idempotency check, relationship, history row,
  and supersession link proves same-organization lineage. Primary-row scope alone
  or globally unique IDs are insufficient.
- Memory and Drizzle adapters implement the same semantic outcome contract.

Cross-module masters use owner APIs or approved read ports plus FKs/snapshots. Do
not create shadow master tables or write another module's tables.

## 9. Package and governance artifacts

Required artifacts:

- private ESM `package.json` with `@afenda/<module-id>`, explicit root export,
  declared `workspace:*` dependencies, catalogued externals, and local scripts;
- repository-derived `tsconfig.json`;
- README covering boundary, facade, ownership/non-ownership, composition,
  security/tenancy, maintenance, and verification;
- canonical feature definitions and composed module manifest;
- schema/migration and schema-ownership registration when persistence applies;
- workspace-edge registration exactly matching `package.json`;
- permission catalog projection and operation authorization parity;
- event catalog schemas and exhaustive emission dispositions;
- feature, facade, adapter-parity, architecture, consumer, and hostile-input tests.

Do not claim `lifecycle: active` because the directory compiles. Scaffolded,
implemented, verified, sealed, activated, and enterprise-ready are distinct.

## 10. Required verification matrix

| Gate | Required proof |
| --- | --- |
| Layout | Only justified root surfaces; no layer-first roots; every feature has one owner. |
| Import graph | Recursive scan includes adapters/tests; no upward feature edge or package cycle. |
| Registry | Unique operations and exact permission/policy/audit/emission/transaction/idempotency/privacy coverage. |
| Projections | Manifest, types, auth, events, serializers, and docs match canonical definitions. |
| Facade | Root is the sole business API; auxiliary entrypoints remain isolated. |
| Ingress | Hostile inputs and aliases fail closed or normalize canonically. |
| Authorization | Every command and scoped query is denied without its permission. |
| Atomicity | State/audit/outbox/derived rows commit together; injected failures roll back all. |
| Tenancy | Same-tenant success and cross-tenant/missing-root rejection with no writes. |
| Adapter parity | Memory and database adapters produce equivalent semantic results. |
| Ownership | Mutation tables match schema ownership; no peer or app dual-write. |
| Consumers | Smallest affected application/worker contract checks pass. |
| Permanence | Guards reject deep imports, duplicate interpretation, broad stores, layer roots, and post-commit effects. |

Minimum focused commands:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/erp/<module-id>
node .cursor/skills/afenda-semantic-registry-cutover/scripts/inspect-semantic-surface.mjs packages/erp/<module-id>
pnpm --filter @afenda/<module-id> lint
pnpm --filter @afenda/<module-id> typecheck
pnpm --filter @afenda/<module-id> test
pnpm validate:modules
pnpm governance:packages
pnpm audit:tenancy-nulls     # when tenant roots change
```

Add live-database rollback and tenant-isolation evidence when correctness depends
on database semantics. A grep/source-pattern test is a guard, not behavior proof.

## 11. Scaffold exit checklist

- [ ] Approved boundary, identity, owner, lifecycle, activation intent, and non-goals.
- [ ] One root facade; auxiliary exports justified or absent.
- [ ] Feature inventory and one semantic owner per vocabulary.
- [ ] Uniform feature-first topology with no root layer farms.
- [ ] Feature definitions compose one validated package contract and all projections.
- [ ] Narrow stores/ports; no composite store in feature code.
- [ ] Authorized DAG; no package-to-app or unapproved peer ERP edge.
- [ ] Schema, mutation ownership, tenant roots, permissions, and events registered.
- [ ] Atomic execution and tenant-lineage policies are executable and tested.
- [ ] Facade, parity, hostile-input, auth, architecture, and consumer tests pass.
- [ ] README and final inspector snapshot match disk.
- [ ] No shim, stub, placeholder, parallel API, TODO runtime path, or deferred deletion.

## 12. Rejected designs

- Root `adapters/`, `schemas/`, `store/`, `shared/`, `types.ts`, or `ports.ts` layers.
- `@afenda/erp`, `@afenda/registry`, `@afenda/shared`, or domain-kit mega-packages.
- Feature meaning moved to `kernel` because it has many consumers.
- Composition barrels that republish feature adapters.
- Feature code depending on a composite store or constructing its own aggregate.
- Peer ERP imports used instead of events, approved ports, or app sagas.
- Manual copies of operation IDs, permissions, events, statuses, manifests, or serializers.
- Consumer-owned status, auth, retry, HTTP, wording, privacy, or event interpretation.
- Post-commit audit/outbox, compensation presented as atomicity, or cross-tenant ID trust.
- v1/v2 facades, deprecated alternatives, shims, or implementation subpaths.

## 13. References

- [Reusable kernel package requirements](../KERNEL-SCAFFOLDING.md)
- [`afenda-semantic-registry-cutover`](../../.cursor/skills/afenda-semantic-registry-cutover/SKILL.md)
- [Feature-first ERP architecture](../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md)
- [Human Resources exemplar](./human-resources/README.md)
