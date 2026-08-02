# Afenda living package generator architecture — PRD

| Field | Value |
| --- | --- |
| Surface | `docs-V2/monorepo/generator-architecture-prd.md` |
| Status | Draft Scratch PRD |
| Owner | Platform Architecture |
| Updated | 2026-08-02 |
| Revision | Architecture review incorporated; implementation contract tightened before coding |
| Product | Afenda-Lite and Afenda-Elite package engineering |
| Audience | Platform architects, package maintainers, and implementation reviewers |
| Runtime | Development-time only; no product runtime package |
| Turborepo baseline | `2.10.5` verified on disk |
| Target generators | `kernel-generator` and `erp-generator` |
| Decision enabled | Implement the two-family generator system without creating another governance owner |
| Delivery posture | Complete target contract delivered through authority-closing vertical slices |

This PRD is the requirements authority for implementing the generator system. Once
shipped, the typed generator contracts become the executable structural SSOT. This
PRD remains the rationale, operating guide, and acceptance contract; generated
trees and tables in this document must then be rendered from those contracts.

---

## 1. Executive decision

Afenda will implement exactly two living Turborepo generator families:

1. `kernel-generator` for reusable foundation, runtime, data-plane, and
   control-plane capability packages.
2. `erp-generator` for feature-first ERP bounded-context packages.

"Exactly two" means exactly two **family registrations and normative family
contracts**. It does not mean two oversized executable files. A shared engine may
contain multiple command handlers and filesystem operations, but it is not a third
generator family and may not own kernel or ERP policy.

Each family is one versioned executable definition that performs the complete
lifecycle:

```text
define → create → diagnose → plan → reconcile → upgrade → project → verify
```

The generator contract must drive:

- package discovery and classification;
- package, folder, and filename structure;
- generated and patched files;
- package scripts and Turborepo task participation;
- public entrypoint dispositions;
- module manifests and repository registers;
- architecture and recurrence tests;
- deterministic package locks;
- versioned repository-wide upgrades;
- diagnostics and automated treatments;
- scaffolding and package documentation;
- CI enforcement.

There will be no separately maintained package inventory, scaffold template,
layout validator, migration framework, documentation checklist, or package-local
copy of the same structural rules.

The complete operating model is mandatory, but it is not implemented as one
unbounded coding mission. Each implementation slice must remove one current
repository failure, prove replacement parity, and delete the superseded authority
before that slice closes. Sequencing is a risk-control mechanism, not permission to
park requirements, preserve parallel validators, or ship a reduced-quality tier.

## 2. Problem statement

Afenda migrations have repeatedly failed because one architectural decision was
copied into multiple representations. The copies changed at different speeds and
eventually contradicted one another.

Current disk evidence includes:

- `scripts/validate-modules/checks.mjs` manually lists ERP packages.
- `scripts/validate-modules.mjs` assumes manifests live at
  `src/module.manifest.ts`.
- feature-first Human Resources, Payroll, and Corporate Administration place the
  manifest at `src/composition/module.manifest.ts`.
- `pnpm validate:modules` currently stops on the missing historical HR path.
- Human Resources, Payroll, and Corporate Administration maintain separate
  `feature-first-layout.mjs` implementations.
- CI maintains another explicit package list for adopted Biome packages.
- local `pnpm checks` and CI compose governance differently.
- generated registers, package hashes, hooks, package scripts, documentation, and
  public export rules do not share one lifecycle contract.

The problem is not insufficient automation. It is automation with multiple owners.

## 3. Product vision

Changing a generator family definition once must immediately produce all of the
following outcomes:

1. New packages use the new definition.
2. Existing packages report their exact delta from it.
3. Mechanical deltas receive a deterministic treatment plan.
4. Versioned migrations upgrade every compatible package.
5. Semantic decisions that cannot be inferred stop with a precise blocker.
6. Generated projections and documentation update from the same contract.
7. Turborepo invalidates affected governance task caches.
8. CI rejects packages on an obsolete or divergent generator contract.

Success means the repository converges when the definition changes. It does not
mean a generator silently invents business meaning.

## 4. Goals and non-goals

### 4.1 Goals

- One executable structural SSOT per package family.
- Repository-wide diagnosis and treatment without hand-maintained package lists.
- Exact folder and filename conventions.
- Idempotent create, reconcile, and upgrade behavior.
- Generated projections from package-owned semantic registries.
- One permanent root consumer facade per package.
- Automatic recurrence tests for prohibited layouts and imports.
- Cache-correct package verification through `turbo run`.
- Machine-readable diagnostics suitable for humans, CI, and agents.
- Safe adoption of current packages without parallel public APIs.
- Enterprise-production quality from the first generated package.

### 4.2 Non-goals

- No runtime `@afenda/kernel`, `@afenda/registry`, `@afenda/shared`, or
  `@afenda/generator` business dependency.
- No inference of permissions, transaction policy, privacy, audit, emissions, or
  tenancy behavior from filenames.
- No package-specific template forks or unrestricted exception files.
- No v1/v2 consumer facades or compatibility shims.
- No automatic lifecycle promotion, module-readiness claim, deployment approval,
  or security certification.
- No claim that a repository-wide filesystem mutation is globally atomic.
- No use of hooks or hashes as substitutes for semantic verification.

## 5. Definitions

| Term | Definition |
| --- | --- |
| Family contract | Typed, versioned registry defining one generator family’s structural rules, modes, projections, diagnostics, and migrations. |
| Family registration | Thin `@turbo/gen` registration for one family; delegates all mechanics to the shared engine and all policy to its family contract. |
| Profile | Approved disposition within a family; not a copied template or package exception. |
| Semantic adapter | Stable typed reader that exposes package-owned or architecture-owned canonical meaning to a family policy without making the engine its owner. |
| Canonical file | Human-authored semantic owner that the generator validates but does not invent or overwrite. |
| Managed file | Fully generator-owned file whose manual edits are rejected. |
| Projected file | Generated representation derived from canonical semantic inputs. |
| Patched file | File in which the generator owns a declared set of keys or AST nodes. |
| Unmanaged file | File outside generator ownership but still subject to repository rules. |
| Package lock | Deterministic record of family/profile version, family-contract digest, engine compatibility, managed files, normalized projection inputs, and normative projections. |
| Normative projection | Generated artifact whose exact normalized output participates in compliance and CI. |
| Informational projection | Regenerable explanatory artifact that does not become a byte-matched semantic authority. |
| Projection-input digest | Digest of the normalized semantic view that produced a projection; not a raw source-file hash. |
| Diagnostic | Stable code describing actual state, expected state, ownership, and treatment. |
| Treatment | Deterministic repair, migration, regeneration, or explicit semantic blocker. |
| Reconcile | Restore a package to its already-applied contract version without changing its semantic contract. |
| Upgrade | Apply ordered migrations from an older family-contract version to the current version. |

## 6. Semantic ownership model

The generator owns structural policy. Domain and kernel packages retain business
semantic ownership. The architecture has four explicit layers:

```text
1. Family contracts
   typed data: profiles · paths · dispositions · diagnostics · migrations

2. Shared engine
   mechanics: discovery · hashing · planning · collisions · staging · journaling

3. Family policies
   kernel/ERP rules: topology · dependencies · entrypoints · projections

4. Semantic adapters
   package/architecture meaning: operations · module identity · public API
   permissions · dependency authorization · audit · transaction · tenancy

                         ↓

Generated projections
   manifests · unions · maps · machine registers · tests · barrels · docs
```

The generator may require a semantic field to exist and validate its disposition.
It must not choose the field’s business value.

The engine must consume family-neutral interfaces. ERP policy consumes one stable
semantic view equivalent to:

```ts
type ErpPackageSemanticInput = {
	readonly module: ModuleDefinition;
	readonly operations: OperationRegistry;
	readonly publicApi: PublicApiInventory;
	readonly dependencyAuthorization: DependencyAuthorizationView;
};
```

The concrete types belong to their package or architecture owner; this interface
is the generator reading boundary, not a new registry. For ERP packages, the
canonical ownership chain is:

```text
src/features/<feature-id>/definition.ts
  exports one canonical featureDefinition fragment
                         ↓
src/kernel/operations/registry.ts
  explicitly composes the package operation registry

src/composition/module-definition.ts
  owns module identity · activation · lifecycle · dependencies · tenancy

src/facade/public-api.ts
  owns the intentional public API inventory

docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml
  authorizes cross-workspace dependency intent
                         ↓
semantic adapter
                         ↓
src/composition/module.manifest.ts · src/index.ts · package.json edges
  are projections or bounded patches
```

`package.json` proves that an edge exists; it cannot explain or authorize the
edge. The generator must reconcile it against the canonical workspace-edge
authorization and must never generate authorization by observing `package.json`.
Replacing the YAML authority with a typed registry requires a separate accepted
architecture decision and a same-cutover projection migration.

## 7. Turborepo capability adoption

Afenda will use Turborepo’s supported generator surface rather than a parallel
command framework:

- root `turbo/generators/config.ts`;
- TypeScript generator definitions through `@turbo/gen`;
- automatic generator discovery;
- named generator invocation through `turbo gen <name>`;
- non-interactive prompt answers through `--args`;
- custom actions for discovery, planning, diagnosis, and treatment;
- package tasks through `turbo run generator:check`;
- `--affected` and `--filter` for focused verification;
- task inputs containing the generator contracts so contract changes invalidate
  every governed package check.

Turborepo documents a current limitation for ESM dependencies inside custom
generators. Therefore `config.ts` must be a thin registration adapter. If required,
it invokes the single local engine in a Node subprocess. The adapter may translate
arguments and exit status only; it must not duplicate a contract rule.

Official references:

- [Generating code](https://turborepo.dev/docs/guides/generating-code)
- [`turbo generate`](https://turborepo.dev/docs/reference/generate)
- [`@turbo/gen`](https://turborepo.dev/docs/reference/turbo-gen)
- [`@turbo/codemod`](https://turborepo.dev/docs/reference/turbo-codemod)
- [Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)

## 8. Required repository structure

```text
turbo/
└── generators/
    ├── config.ts
    ├── engine/
    │   ├── execute.mts
    │   ├── commands/
    │   │   ├── create.mts
    │   │   ├── add-feature.mts
    │   │   ├── doctor.mts
    │   │   ├── verify.mts
    │   │   ├── plan-upgrade.mts
    │   │   ├── reconcile.mts
    │   │   ├── upgrade.mts
    │   │   └── project.mts
    │   ├── discover-workspaces.mts
    │   ├── build-plan.mts
    │   ├── apply-plan.mts
    │   ├── collision-check.mts
    │   ├── managed-files.mts
    │   ├── package-lock.mts
    │   ├── diagnostics.mts
    │   ├── report.mts
    │   └── types.ts
    ├── kernel-generator/
    │   ├── registration.ts
    │   ├── contract.ts
    │   ├── profiles.ts
    │   ├── semantic-adapter.ts
    │   ├── projections.ts
    │   ├── diagnostics.ts
    │   ├── templates/
    │   │   ├── package.json.hbs
    │   │   ├── tsconfig.json.hbs
    │   │   ├── index.ts.hbs
    │   │   ├── readme.md.hbs
    │   │   └── package-contract.test.ts.hbs
    │   ├── migrations/
    │   │   ├── index.ts
    │   │   └── v0001-initial-contract.ts
    │   └── __tests__/
    └── erp-generator/
        ├── registration.ts
        ├── contract.ts
        ├── feature-capsule.ts
        ├── semantic-adapter.ts
        ├── package-specification.ts
        ├── projections.ts
        ├── diagnostics.ts
        ├── templates/
        │   ├── package.json.hbs
        │   ├── tsconfig.json.hbs
        │   ├── index.ts.hbs
        │   ├── feature-definition.ts.hbs
        │   ├── feature-contract.ts.hbs
        │   ├── feature-schema.ts.hbs
        │   ├── feature-policy.ts.hbs
        │   ├── feature-store-contract.ts.hbs
        │   ├── feature-memory-adapter.ts.hbs
        │   ├── feature-drizzle-adapter.ts.hbs
        │   └── architecture-contract.test.ts.hbs
        ├── migrations/
        │   ├── index.ts
        │   └── v0001-feature-first-contract.ts
        └── __tests__/
```

No other generator folder may define kernel or ERP structural policy.

`config.ts` registers only the two `registration.ts` adapters. Command files are
engine mechanics, and `semantic-adapter.ts` files translate canonical owner data
into family inputs. Neither surface may duplicate family rules.

## 9. Family contract requirements

Each family contract must be a typed const registry from which prompts,
diagnostics, verification, migrations, and documentation are derived.

```ts
type GeneratorFamilyContract = {
	readonly family: "kernel" | "erp";
	readonly version: number;
	readonly engineCompatibility: number;
	readonly modes: readonly GeneratorModeDefinition[];
	readonly profiles: readonly GeneratorProfile[];
	readonly semanticInput: SemanticInputDefinition;
	readonly pathPolicy: PathPolicy;
	readonly filePolicy: readonly FileDisposition[];
	readonly namingPolicy: NamingPolicy;
	readonly entrypointPolicy: EntrypointPolicy;
	readonly dependencyPolicy: DependencyPolicy;
	readonly taskPolicy: TaskPolicy;
	readonly projections: readonly ProjectionDefinition[];
	readonly diagnostics: readonly DiagnosticDefinition[];
	readonly migrations: readonly MigrationDefinition[];
};
```

The contract loader must fail closed on:

- duplicate family/profile/diagnostic/migration identifiers;
- non-contiguous migration versions;
- managed paths with two owners;
- a generated file without a canonical input;
- a projection without an explicit `normative` or `informational` compliance class;
- a diagnostic without a treatment disposition;
- a required file lacking a template or projection;
- an auxiliary entrypoint without an isolation class;
- a task without declared inputs and output behavior;
- a relaxation or tightening without a version increment.

## 10. Kernel generator definition

### 10.1 Scope

`kernel-generator` governs reusable packages in:

- `packages/foundation/*`;
- `packages/runtime/*`;
- `packages/data-plane/*`;
- `packages/control-plane/*`.

It does not create a generic kernel package. Every generated target owns one
bounded capability.

### 10.2 Profiles

| Profile | Intended package | Default workspace dependencies |
| --- | --- | --- |
| `foundation-leaf` | Pure definitions/configuration/errors/testing primitives | None unless the registered contract permits a dev-only edge |
| `runtime-leaf` | HTTP, logger, security, metrics, OpenAPI-style neutral runtime | No `@afenda/*` runtime dependency |
| `runtime-configured` | Cache/rate-limit-style runtime using registered env/errors capabilities | Exact profile allowlist only |
| `data-plane` | DB/audit/events/search/notifications-style persistence capability | Exact registered lower/equal-rank edges |
| `control-plane` | Auth/admin-style identity and administration capability | Exact registered dependencies and runtime-context isolation |

Adding a profile requires a family-contract change, fixtures, documentation
projection, and versioned migration when it affects existing packages.

### 10.3 Kernel package topology

```text
packages/<band>/<package>/
├── .afenda-generator.lock.json
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── contract/
│   ├── capabilities/
│   ├── ingress/
│   ├── internal/
│   └── adapters/
├── __tests__/
└── scripts/
```

Only `src/index.ts` is mandatory for all profiles. Other directories are created
only when the selected capability dispositions require real files. Empty folder
and placeholder generation is forbidden.

### 10.4 Kernel invariants

- exactly one package-root capability style;
- root-only business entrypoint by default;
- aliases remain private ingress data;
- external input begins as `unknown`;
- projections derive from the canonical registry;
- adapters and vendor objects remain private;
- isolated Node/browser/edge/testing entrypoints require a declared profile
  disposition and accepted consumer class;
- internal representation upgrades require zero production-consumer edits;
- package-local lint, typecheck, tests, boundary tests, and consumer evidence.

## 11. ERP generator definition

### 11.1 Scope

`erp-generator` governs `packages/erp/*` as bounded contexts in the modular
monolith. It must never generate `@afenda/erp` or peer-service topology.

### 11.2 ERP package topology

```text
packages/erp/<module-id>/
├── .afenda-generator.lock.json
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── facade/
│   │   └── public-api.ts
│   ├── kernel/
│   │   └── operations/
│   │       └── registry.ts
│   ├── composition/
│   │   ├── module-definition.ts
│   │   └── module.manifest.ts
│   ├── features/
│   └── testing/
├── __tests__/
└── scripts/
```

The allowed source-root names are exactly:

```text
index.ts · facade · kernel · composition · features · testing
```

`testing` is optional and must correspond to an isolated `./testing` export.
No root `adapters`, `schemas`, `store`, `shared`, `commands`, `queries`,
`services`, `models`, `ports.ts`, or `types.ts` is permitted.

### 11.3 ERP feature capsule

```text
src/features/<feature-id>/
├── index.ts
├── definition.ts
├── contract.ts
├── schema.ts
├── policy.ts
├── <use-case>.ts
├── store-contract.ts
├── ports.ts
├── adapters/
│   ├── memory.ts
│   └── drizzle.ts
└── __tests__/
```

Capsule files are disposition-driven, not automatically mandatory. The generator
creates only files selected by real feature requirements. It must refuse an empty
`definition.ts`, stub adapter, throw-TODO use case, or placeholder test.

A separate semantic file is required only when that responsibility changes
independently, is consumed independently, or needs independent verification. A
query-only feature without an external port or independent policy must not receive
ceremonial `ports.ts` or `policy.ts` files. Conversely, two independently owned
semantics must not be collapsed merely to shorten the tree.

### 11.4 ERP dependency direction

```text
consumer → index → facade → composition → feature adapters
                         │                  │
                         └──── kernel ──────┘
```

The generated recurrence gate scans every feature file, including adapters and
colocated tests, and rejects imports from `composition`, `facade`, or `testing`.
Feature handlers and adapters must not name, accept, import, or construct the
composite package store.

### 11.5 ERP projections

Package-owned feature definitions compose explicitly in
`src/kernel/operations/registry.ts`. Package identity and lifecycle remain in
`src/composition/module-definition.ts`; intentional root exposure remains in
`src/facade/public-api.ts`; dependency authorization remains in the workspace-edge
owner. The semantic adapter combines these owners without merging them. From that
view, the generator derives or validates:

- command/query identifier unions;
- authorization maps;
- permission inventory;
- event and emission coverage;
- audit/transaction/idempotency/privacy dispositions;
- mutation-table projection;
- `src/composition/module.manifest.ts`;
- repository generated YAML registers;
- projected root barrel from the canonical public API inventory;
- architecture fixtures and documentation.

## 12. Filename and directory conventions

### 12.1 General

| Surface | Convention |
| --- | --- |
| Directories | lowercase kebab-case |
| TypeScript source | lowercase kebab-case `.ts` or `.tsx` |
| Unit test | `<subject>.test.ts` |
| Type contract fixture | `<subject>.types.ts` |
| Database parity test | `<subject>.parity.test.ts` |
| Generated TypeScript | `<subject>.generated.ts` |
| Generated YAML | `<SUBJECT>.generated.yaml` when an existing external register convention requires uppercase |
| Templates | `<target-name>.<extension>.hbs` |
| Migrations | `v<four-digit-version>-<kebab-description>.ts` |
| Family registration | `registration.ts` |
| Family semantic adapter | `semantic-adapter.ts` |
| Package lock | `.afenda-generator.lock.json` |
| Package root facade | `src/index.ts` |
| Canonical public API inventory | `src/facade/public-api.ts` |
| ERP operation registry | `src/kernel/operations/registry.ts` |
| ERP module definition | `src/composition/module-definition.ts` |
| ERP module manifest | `src/composition/module.manifest.ts` |
| ERP package creation input | `<module-id>.erp-package-spec.yaml` |
| ERP feature creation input | `<feature-id>.erp-feature-spec.yaml` |

Names containing `common`, `shared`, `misc`, `helpers`, `utils`, `legacy`, `v2`,
`new`, or `temp` must be rejected unless the word is part of an approved external
standard and the family contract explicitly permits it.

### 12.2 Semantic files

| Filename | Sole disposition |
| --- | --- |
| `definition.ts` | Canonical feature operation/status/policy declarations |
| `contract.ts` | Feature-owned inputs, outputs, values, and invariants |
| `schema.ts` | Ingress parsing and normalization derived from the contract |
| `policy.ts` | Feature-owned authorization/privacy/workflow behavior |
| `store-contract.ts` | Narrow feature persistence capability |
| `ports.ts` | Narrow external or cross-feature capabilities |
| `memory.ts` | Semantic-parity in-memory adapter |
| `drizzle.ts` | Production persistence adapter |

A file may not carry two independently changing ownership dispositions merely to
reduce file count. Files must not be split when no independent semantic owner,
consumer, or verification boundary exists.

## 13. Managed-file dispositions

| Disposition | Generator permission | Manual-edit policy |
| --- | --- | --- |
| `managed` | Create and replace complete file | Rejected; reconcile restores generated content |
| `projected` | Render from named canonical inputs | Rejected; regenerate from owner |
| `patched` | Modify declared JSON keys or AST nodes only | Edits outside owned region preserved |
| `canonical` | Validate structure and references only | Human/package owner edits through normal semantic workflow |
| `unmanaged` | No mutation | Still subject to repository-wide rules |

Every path touched by a generator must have exactly one disposition. Globally
declared catch-all write access is prohibited.

Initial target dispositions:

| Path | Disposition |
| --- | --- |
| `.afenda-generator.lock.json` | managed |
| `tsconfig.json` | managed |
| `package.json` identity, exports, required scripts | patched |
| `src/facade/public-api.ts` | canonical public API inventory |
| `src/index.ts` | projected from `src/facade/public-api.ts` |
| `src/kernel/operations/registry.ts` | canonical explicit composition of feature definitions |
| `src/composition/module-definition.ts` | canonical module identity, activation, lifecycle, dependencies, and tenancy |
| `src/composition/module.manifest.ts` | projected for ERP |
| architecture contract tests | managed |
| structural and inventory registers | projected |
| dependency authorization register | canonical; never inferred from discovered edges |
| feature/kernel semantic definitions | canonical |
| command/query implementations | canonical |
| package README contract tables | projected |

## 14. Package lock contract

Each governed package must contain a deterministic lock:

```json
{
  "schema": "afenda.generator-lock/v1",
  "family": "erp",
  "profile": "feature-first-erp",
  "contractVersion": 1,
  "familyContractDigest": "sha256:<digest>",
  "engineCompatibility": 1,
  "managedFiles": {
    "tsconfig.json": "sha256:<digest>",
    "__tests__/architecture-contract.test.ts": "sha256:<digest>"
  },
  "projectionInputs": {
    "operationRegistry": {
      "source": "src/kernel/operations/registry.ts#operationRegistry",
      "normalizedDigest": "sha256:<digest>"
    }
  },
  "projections": {
    "src/composition/module.manifest.ts": "sha256:<digest>",
    "src/index.ts": "sha256:<digest>"
  }
}
```

Lock requirements:

- keys and paths sorted deterministically;
- repository-relative POSIX paths;
- no timestamps, usernames, machine paths, environment values, or secrets;
- one family and profile;
- `familyContractDigest` covers normalized normative family data, not engine
  implementation lines or module import order;
- `engineCompatibility` changes only when the engine/family protocol changes;
- projection-input digests cover normalized semantic views only when needed to
  prove projection freshness; comments and formatting that do not change the
  normalized view must not invalidate a lock;
- Turbo cache inputs may include the complete engine even though package compliance
  does not hash every engine implementation detail;
- lock update is the final generator mutation after verification;
- lock is not a readiness seal or security approval.

## 15. Generator command contract

### 15.1 Interactive commands

```bash
pnpm exec turbo gen kernel-generator
pnpm exec turbo gen erp-generator
```

### 15.2 Non-interactive commands

```bash
# Create
pnpm exec turbo gen kernel-generator --args create @afenda/<name> <profile>
pnpm exec turbo gen erp-generator --args create --spec <erp-package-spec.yaml>

# Extend
pnpm exec turbo gen erp-generator --args add-feature <module-id> --spec <erp-feature-spec.yaml>

# Read-only diagnosis and plan
pnpm exec turbo gen kernel-generator --args doctor all
pnpm exec turbo gen erp-generator --args doctor all
pnpm exec turbo gen erp-generator --args plan-upgrade all

# Mutating treatment
pnpm exec turbo gen kernel-generator --args reconcile @afenda/<name>
pnpm exec turbo gen erp-generator --args upgrade all

# Projection and verification
pnpm exec turbo gen kernel-generator --args project all
pnpm exec turbo gen erp-generator --args verify all
```

The exact positional `--args` sequence must be generated into CLI help and this
document from the family contracts.

### 15.3 Modes

| Mode | Writes | Meaning |
| --- | --- | --- |
| `create` | Yes | Create a complete package from schema-validated explicit semantic input after authority and collision checks. |
| `add-feature` | Yes | Add one real ERP vertical feature slice from schema-validated explicit semantic input. |
| `doctor` | No | Discover and classify every structural, version, projection, and lock delta. |
| `plan-upgrade` | No | Produce the exact ordered migration and file-operation plan. |
| `reconcile` | Yes | Repair drift against the already-applied contract version. |
| `upgrade` | Yes | Execute ordered migrations to the current version. |
| `project` | Yes | Regenerate derived files from canonical owners. |
| `verify` | No | Fail unless package, lock, projections, tests, and contract version match. |

Every mutating mode must run its read-only preflight internally. There is no
`--force` mode that bypasses collisions, semantic blockers, or ownership checks.

### 15.4 ERP creation specification

`erp-generator create` must not create a semantically empty bounded context and
must not invent business meaning. It requires a schema-versioned author-supplied
specification equivalent to:

```ts
type ErpPackageSpecification = {
	readonly schema: "afenda.erp-package-spec/v1";
	readonly module: {
		readonly id: string;
		readonly displayName: string;
		readonly activation: ModuleActivation;
		readonly lifecycle: ModuleLifecycle;
		readonly tenancy: TenancyDisposition;
	};
	readonly initialFeature: {
		readonly id: string;
		readonly operations: readonly {
			readonly id: string;
			readonly kind: "command" | "query";
			readonly permission: string;
			readonly transaction: "required" | "forbidden" | "not-applicable";
			readonly idempotency: "required" | "forbidden" | "not-applicable";
			readonly audit: "required" | "forbidden" | "not-applicable";
			readonly privacy: PrivacyDisposition;
			readonly emissions: readonly string[];
		}[];
	};
	readonly requestedDependencies: readonly string[];
};
```

Every field is explicit; absence is not interpreted as `false` or
`not-applicable`. Requested dependencies must already be authorized by the
workspace-edge owner or the command blocks before writing. The accepted
specification is transient creation input: after successful creation, the
package-owned definition, operation registry, module definition, and public API
inventory become canonical. The specification must not remain as a second
semantic registry.

The family may materialize only approved executable feature patterns. If the
requested behavior requires business logic that cannot be represented without
invention, `create` or `add-feature` must block and name the missing semantic
decision. Successful output must contain a real compiling and tested vertical
slice, never empty directories, TODO throws, fake adapters, or placeholder tests.

## 16. Diagnostics and treatments

Diagnostic output must support `text` and versioned `json` formats.

```ts
type GeneratorDiagnostic = {
	readonly code: string;
	readonly severity: "info" | "warning" | "error" | "blocked";
	readonly family: "kernel" | "erp";
	readonly package: string;
	readonly actual: unknown;
	readonly expected: unknown;
	readonly owner: string;
	readonly treatment:
		| "auto-reconcile"
		| "auto-upgrade"
		| "auto-regenerate"
		| "remove-superseded"
		| "semantic-decision-required"
		| "collision"
		| "unsupported";
	readonly paths: readonly string[];
};
```

Required initial diagnostic catalogue:

| Code | Condition | Treatment |
| --- | --- | --- |
| `AFG-GEN-001` | Family contract version or digest stale | `auto-upgrade` |
| `AFG-GEN-002` | Managed file changed manually | `auto-reconcile` |
| `AFG-GEN-003` | Generated projection stale | `auto-regenerate` |
| `AFG-GEN-004` | Required path missing | `auto-reconcile` |
| `AFG-GEN-005` | Forbidden root path present | `remove-superseded` after collision/parity proof |
| `AFG-GEN-006` | Path destination collision | `collision` |
| `AFG-GEN-007` | Undeclared auxiliary entrypoint | `semantic-decision-required` |
| `AFG-GEN-008` | Canonical owner missing or duplicated | `semantic-decision-required` |
| `AFG-GEN-009` | Feature imports upward | automatic rewrite only when resolution is exact; otherwise blocked |
| `AFG-GEN-010` | Composite store used by a feature | `semantic-decision-required` |
| `AFG-GEN-011` | Manifest location obsolete | `auto-upgrade` |
| `AFG-GEN-012` | Manual registry duplicates derived projection | `remove-superseded` after semantic parity |
| `AFG-GEN-013` | Package absent from hand-maintained legacy inventory | remove the legacy inventory; never add another row |
| `AFG-GEN-014` | Realized workspace edge lacks canonical authorization | `semantic-decision-required` |
| `AFG-GEN-015` | Root export is absent from the canonical public API inventory | `semantic-decision-required` |
| `AFG-GEN-016` | Creation specification is missing, invalid, or semantically incomplete | `semantic-decision-required` |

Severity and exit behavior are normative:

| Severity | `doctor` | `verify` / CI |
| --- | --- | --- |
| `info` | Pass | Pass |
| `warning` | Pass | Pass; promotion to failure requires a versioned contract change |
| `error` | Fail with drift | Fail with drift |
| `blocked` | Fail with semantic blocker | Fail with semantic blocker |

| Exit | Meaning |
| ---: | --- |
| `0` | Clean, information, or warnings only |
| `10` | Mechanical or structural drift |
| `20` | Semantic decision or collision blocker |
| `30` | Invalid family contract, registration, or migration chain |
| `40` | Engine, filesystem, or unexpected execution failure |

When multiple outcomes occur, execution failure takes precedence, followed by
invalid contract, semantic blocker, and drift. Package-local configuration cannot
downgrade a severity or remap an exit code.

## 17. Versioned migration contract

Every normative tightening or loosening increments the integer family version and
adds a contiguous migration when existing packages require acknowledgement or
mutation.

```ts
type GeneratorMigration = {
	readonly id: `v${string}`;
	readonly from: number;
	readonly to: number;
	readonly compatibility: "internal" | "additive" | "breaking";
	readonly describe: string;
	plan(context: MigrationContext): MigrationPlan;
	apply(plan: AcceptedMigrationPlan): Promise<void>;
	verify(context: MigrationContext): Promise<VerificationResult>;
};
```

Migration invariants:

- exactly one path from every supported version to current;
- no skipped or reversible-in-name versions;
- second execution produces zero file changes;
- plan contains every move, add, patch, generation, and deletion;
- filesystem moves and module-import rewrites are separate operations;
- filesystem-reading fixture paths are rewritten separately from imports;
- deletion occurs only after structural and behavioral parity;
- public compatibility is classified before mutation;
- breaking migrations name every affected consumer;
- semantic ambiguity blocks before the first write.

Afenda borrows the ordered, dry-run, printable-transform behavior of
`@turbo/codemod`; it does not use Turbo’s own configuration codemods as the Afenda
semantic owner.

## 18. Mutation safety and recovery

A repository-wide mutation cannot honestly be globally atomic. The required model
is staged, package-atomic, and resumable:

1. Discover the complete target set.
2. Build and validate all package plans without writes.
3. Reject all collisions and semantic blockers before treatment begins.
4. Materialize proposed managed/projected files in a temporary workspace.
5. Verify generated structure and resolution in that workspace.
6. Apply one package plan at a time using explicit path operations.
7. Record completed package/version steps in a deterministic run journal.
8. Stop on the first failed package; never continue into dependent packages.
9. Resume only after `doctor` confirms the recorded state.
10. Delete the journal after the entire accepted plan verifies.

The generator must not call `git reset`, `git restore`, or `git clean`. It must not
depend on a clean worktree, but it must refuse to overwrite unrelated dirty paths.

## 19. Projection pipeline

### 19.1 Kernel

```text
canonical registry
  → public types
  → runtime capabilities
  → ingress/serialization projections
  → boundary fixtures
  → canonical public API inventory
  → package documentation
```

### 19.2 ERP

```text
feature definitions
  → composed operation registry
  → permission/authorization projections
  → event/audit/transaction projections
  → module.manifest.ts
  → MODULE/COMMAND/QUERY/EVENT/PERMISSION/TABLE generated registers
  → projected root barrel from the canonical public API inventory
  → architecture tests
  → scaffolding/package documentation
```

Generated files must carry:

```text
GENERATED — DO NOT EDIT
Canonical source: <repository-relative path and exported symbol>
Generator: <family>@<version>
Regenerate: <exact command>
```

### 19.3 Projection compliance classes

Generated output has one declared compliance class:

| Class | Examples | Compliance behavior |
| --- | --- | --- |
| Normative | module manifest, package lock, architecture tests, machine-readable registers, `src/index.ts`, generated contract tables | Normalized bytes must match projection output; drift fails `verify` and CI. |
| Informational | explanatory diagrams, examples, non-contract narrative | May be regenerated, but prose differences do not establish or fail semantic compliance. |

Generated README contract tables are normative and live inside explicit
generator-owned regions. Human narrative outside those regions is unmanaged or
canonical, never silently overwritten. Informational output must link to its
canonical sources and must not duplicate a normative checklist. Every projection
definition declares its class; there is no implicit default.

## 20. Turborepo task integration

Each governed package receives a generator-managed script:

```json
{
  "scripts": {
    "generator:check": "node ../../../turbo/generators/engine/execute.mts verify ."
  }
}
```

Root `turbo.json` adds:

```json
{
  "tasks": {
    "generator:check": {
      "inputs": [
        "$TURBO_DEFAULT$",
        "$TURBO_ROOT$/turbo/generators/**"
      ],
      "outputs": []
    }
  }
}
```

Required commands:

```bash
pnpm exec turbo run generator:check
pnpm exec turbo run generator:check --affected
pnpm exec turbo run generator:check --filter=@afenda/<package>
```

Changing either family contract must invalidate `generator:check` for every
package governed by that family. Mutating generator modes are never Turbo tasks
and never run in parallel.

## 21. Hooks and CI

### 21.1 Local feedback

- after-file-edit hooks may invoke package-local `doctor` for managed files;
- pre-commit may run `generator:check --affected`;
- pre-push runs affected generator checks plus current Neon environment checks;
- hooks remain bypassable convenience, never authority.

### 21.2 CI authority

CI must run:

```bash
pnpm exec turbo run generator:check
```

The gate must fail on:

- obsolete contract version or digest;
- generator lock drift;
- generated projection differences;
- forbidden path/name/import topology;
- undocumented auxiliary entrypoint;
- hand-maintained package inventory covered by discovery;
- a migration whose idempotency fixture fails;
- scaffolding documentation different from generator output.

Existing governance logic is absorbed into the generators before the superseded
scripts and copied validators are deleted. CI must not retain both paths.

## 22. Customization guide

### 22.1 Tighten a rule

Example: prohibit root `schemas/` in all ERP packages.

1. Edit `erp-generator/contract.ts` once.
2. Increment the ERP contract version.
3. Add a migration that moves each owned schema to its feature capsule using an
   explicit collision-checked manifest.
4. Add positive, negative, and idempotency fixtures.
5. Regenerate documentation and diagnostic catalogue.
6. Run `doctor all`, then `plan-upgrade all`.
7. Resolve semantic blockers before `upgrade all`.
8. Run package and consumer verification.
9. Delete superseded layout scripts and old roots in the same cutover.

### 22.2 Loosen a rule

Example: permit a `/testing` entrypoint for a kernel profile.

1. Add the isolation disposition and accepted consumer class to the profile.
2. Increment the family version even if no files move.
3. Add validation proving it cannot export a second business facade.
4. Add a migration that acknowledges the new contract and refreshes locks.
5. Regenerate docs and verify all governed packages.

### 22.3 Add a kernel profile

1. Prove existing profiles cannot express the runtime/security context.
2. Define exact dependency, entrypoint, folder, task, and test dispositions.
3. Add create/doctor/reconcile/verify fixtures.
4. Add the profile to the contract registry.
5. Regenerate CLI prompts and documentation.

### 22.4 Add an ERP feature disposition

1. Name the semantic capability that requires it.
2. Extend `feature-capsule.ts`; do not fork the ERP template.
3. Define filename, owner, allowed imports, projections, and tests.
4. Add a migration only if existing features require the disposition.
5. Verify no generic layer directory is introduced.

### 22.5 Handle a package exception request

Allowed outcomes are:

- express the requirement as an existing profile/capability disposition;
- promote a reusable, tested rule into the family contract;
- reject the divergence;
- block pending an architectural decision.

Free-form ignore lists, permanent package-specific template forks, and
`skipValidation` flags are prohibited.

## 23. Security and integrity requirements

- Generator inputs are untrusted and schema-validated.
- Package IDs and paths reject traversal, absolute paths, reserved names, control
  characters, and case-collision variants.
- File writes remain inside verified repository roots.
- Symlink/junction destinations are rejected unless explicitly supported and tested.
- No secrets or environment values enter templates, locks, diagnostics, or reports.
- Diagnostics bound file content and never print `.env.local` values.
- Generated code uses no `eval`, dynamic remote templates, or unpinned network input.
- Remote `turbo gen workspace --copy` is not used for Afenda package generation.
- Templates and migrations are repository-versioned and reviewed.
- Generated public wording and error behavior must still use canonical package owners.

## 24. Performance and observability

### 24.1 Performance targets

| Operation | Target |
| --- | --- |
| One-package doctor | ≤ 2 seconds excluding package tests |
| Repository doctor | ≤ 30 seconds on the supported developer machine before cache |
| Cached `generator:check` | Turbo cache hit when package and family contract inputs are unchanged |
| Create/reconcile second run | Zero diff |
| Diagnostic memory | Bounded by discovered package/file inventory; no full file-content retention when hashes suffice |

### 24.2 Run summary

Every execution reports:

- family and contract version/digest;
- mode and target packages;
- clean, repairable, upgrade-required, and blocked counts;
- planned/applied file operations;
- generated projections;
- consumer checks selected;
- exact failures and exit code;
- final package lock digests.

No telemetry may include source content, business data, identifiers from runtime
records, or secrets.

## 25. Existing-repository cutover

The cutover is one complete program with bounded, verifiable authority closures.
No gate reduces the final requirements in this PRD. A gate may sequence a
capability, but it cannot leave an old and new owner permanently active.

For every gate:

1. define the exact old authority being replaced;
2. prove replacement parity with positive, negative, and hostile fixtures;
3. enable the new check for the covered scope;
4. delete the superseded list, validator, projection, or template in the same
   closure change;
5. prove a second run produces zero diff;
6. record blockers explicitly rather than installing an ignore.

### G0 — Read-only generator foundation

- install `@turbo/gen` as root development tooling;
- implement and validate both thin family registrations and contracts;
- implement shared workspace discovery, family/profile classification, stable
  diagnostics, JSON report schema, and exit-code policy;
- implement genuinely read-only `doctor` and `verify` for the contract portions
  declared by each family;
- add the cache-correct package `generator:check` task and prove family-contract
  invalidation;
- add read-only and hostile-path fixtures;
- perform no repository-wide package mutation.

G0 is a non-authoritative foundation and must not merge as an abandoned parallel
checker. Its first mergeable authority cutover is G0 + G1. A family registration
must not expose a mode that is a stub.

### G1 — ERP manifest authority: first production cutover

- derive every `packages/erp/*` workspace from disk truth;
- implement the exact feature definition → operation registry plus module
  definition → manifest ownership chain;
- diagnose historical and canonical manifest locations;
- use `inventory`, `human-resources`, and `corporate-administration` as the
  representative proof cohort for historical, feature-first, and divergent shapes;
- project manifests byte-stably for the cohort, then cover every compatible ERP
  package before closure;
- keep all existing public exports and endpoint outcomes unchanged;
- delete `LIVING_ERP_MANIFEST_PACKAGES` and its obsolete path assumption in the
  same closure;
- make the new manifest verification authoritative in CI.

The cohort is validation evidence, not a permanent pilot tier. G1 does not close
with mixed manifest owners.

### G2 — ERP layout convergence

- absorb all package-local feature-first layout rules into the ERP family contract;
- diagnose every ERP package, including root names, upward imports, composite
  stores, and public API inventory;
- migrate mechanically compatible packages with explicit collision-checked plans;
- block semantic exceptions instead of adding package skips;
- delete superseded package-local layout scripts immediately after parity;
- make the single ERP layout policy authoritative in CI.

### G3 — Projection, lock, and reconciliation authority

- implement normative versus informational projection classes;
- project public barrels, architecture tests, machine registers, and contract
  documentation from named owners;
- implement normalized projection-input digests, deterministic package locks, and
  current-version `reconcile`;
- absorb existing projection parity checks;
- delete superseded projection scripts and manual structural inventories after
  byte parity.

### G4 — Explicit-spec ERP creation and extension

- implement schema-validated ERP package and feature specifications;
- prove `create` and `add-feature` generate one real compiling, linting, tested
  vertical slice without invented semantics or placeholders;
- reject unauthorized dependencies and undeclared public exports;
- prove path hostility, case collision, idempotency, and consumer isolation.

### G5 — Versioned treatment and recovery

- implement `plan-upgrade`, contiguous migrations, staging, package-atomic apply,
  deterministic journaling, and resume verification;
- prove one real migration from historical manifest location to the canonical
  composition location, including imports and filesystem-reading fixtures;
- prove interruption recovery and a zero-diff second execution;
- remove the superseded migration mechanism in the same closure.

### G6 — Kernel adoption

- classify every registered reusable kernel into an approved profile;
- adopt semantic adapters, public API inventories, locks, and generator checks
  without changing consumer behavior;
- absorb repeated boundary/scaffold structure while preserving owner-specific
  semantic contract tests and readiness seals;
- delete replaced kernel scaffold/validation owners after package-by-package parity.

### G7 — Repository and documentation convergence

- replace remaining hard-coded CI package lists with Turbo workspace discovery;
- make `generator:check` required for all governed packages;
- generate normative scaffold tables and CLI help from family contracts;
- tighten one harmless structural rule and run repository-wide doctor, plan,
  upgrade, project, and verify;
- prove Windows/Linux normalization, cache invalidation, documentation parity, and
  consumer containment;
- remove every remaining parallel governance entrypoint;
- persist evidence without claiming module enterprise readiness.

### 25.1 First coding mission contract

The first coding mission is G0 + G1 and is complete only when:

- [ ] both family registrations and typed contracts validate without stubs;
- [ ] all ERP workspaces are discovered without a maintained package list;
- [ ] `doctor` is proven read-only by before/after workspace hashing;
- [ ] text and JSON diagnostics are stable and obey the exit-code contract;
- [ ] historical and canonical manifest locations are diagnosed correctly;
- [ ] the ERP manifest has the exact four-owner semantic input boundary;
- [ ] the representative cohort regenerates byte-stably;
- [ ] all compatible ERP packages use the canonical manifest projection;
- [ ] `turbo run generator:check` has cache-correct family inputs;
- [ ] existing public exports remain unchanged;
- [ ] the hard-coded manifest inventory and obsolete path assumption are deleted;
- [ ] a second projection and verification run produces zero diff.

## 26. Functional requirements

| ID | Requirement |
| --- | --- |
| `GEN-FR-001` | The repository exposes exactly two package-family registrations and normative contracts: `kernel-generator` and `erp-generator`; shared command handlers do not constitute more families. |
| `GEN-FR-002` | Each family has one typed, versioned contract registry. |
| `GEN-FR-003` | Workspace discovery replaces manual governed-package inventories. |
| `GEN-FR-004` | Create mode requires schema-validated explicit semantic input and produces a complete compiling/testable vertical slice, never an empty package or placeholders. |
| `GEN-FR-005` | Doctor mode is read-only and reports stable diagnostic codes. |
| `GEN-FR-006` | Reconcile repairs current-version mechanical drift. |
| `GEN-FR-007` | Upgrade executes contiguous, idempotent version migrations. |
| `GEN-FR-008` | Verify fails on contract, lock, topology, projection, or entrypoint drift. |
| `GEN-FR-009` | Every generator-touched path has one managed-file disposition. |
| `GEN-FR-010` | Managed/projected files identify their generator and canonical source. |
| `GEN-FR-011` | Semantic ambiguity blocks before mutation. |
| `GEN-FR-012` | Package locks separate family-contract digest, engine compatibility, normalized projection-input digests, and projection hashes; they contain no timestamps or secrets. |
| `GEN-FR-013` | ERP manifests derive from the operation registry plus module definition; public barrels derive from the public API inventory; neither is inferred from filesystem presence. |
| `GEN-FR-014` | Generated architecture tests reject forbidden paths and dependency inversions. |
| `GEN-FR-015` | Generator contract changes invalidate Turbo package-check caches. |
| `GEN-FR-016` | Repository-wide treatment is staged, collision-checked, package-atomic, and resumable. |
| `GEN-FR-017` | A second create/reconcile/upgrade/project execution produces zero diff. |
| `GEN-FR-018` | CI runs the same generator verification used locally. |
| `GEN-FR-019` | Superseded validators, inventories, templates, and layout scripts are deleted after parity. |
| `GEN-FR-020` | Scaffolding documentation is rendered from generator contracts. |
| `GEN-FR-021` | The engine consumes family-neutral semantic adapters and contains no ERP or kernel business policy. |
| `GEN-FR-022` | Realized workspace dependencies reconcile against canonical authorization; discovery cannot authorize a dependency. |
| `GEN-FR-023` | Diagnostic severity and exit codes follow the fixed `0/10/20/30/40` policy and cannot be downgraded per package. |
| `GEN-FR-024` | Every projection declares `normative` or `informational`; only normative normalized output establishes compliance. |
| `GEN-FR-025` | Root API exposure is intentional through a canonical public API inventory and projected `src/index.ts`. |
| `GEN-FR-026` | Each cutover gate deletes its superseded authority after parity; a pilot cohort cannot become a permanent partial-adoption tier. |

## 27. Non-functional requirements

| ID | Requirement |
| --- | --- |
| `GEN-NFR-001` | Deterministic output across Windows and CI Linux, including line endings and path normalization. |
| `GEN-NFR-002` | No network dependency during normal create, doctor, reconcile, upgrade, project, or verify. |
| `GEN-NFR-003` | No writes outside verified workspace targets. |
| `GEN-NFR-004` | No destructive overwrite of unrelated dirty files. |
| `GEN-NFR-005` | Machine-readable reports use a versioned schema. |
| `GEN-NFR-006` | Contract and migration fixtures cover success, hostility, collision, interruption, and idempotency. |
| `GEN-NFR-007` | Errors identify owner, expected state, actual state, paths, and treatment. |
| `GEN-NFR-008` | Generator implementation remains development-time and absent from product bundles. |
| `GEN-NFR-009` | Root generator adapter contains no duplicated family rules. |
| `GEN-NFR-010` | Focused verification runs before affected consumers and broad repository gates. |
| `GEN-NFR-011` | Formatting or comments that leave a normalized semantic projection unchanged do not create package-lock drift. |

## 28. Acceptance criteria

The architecture is accepted only when all are true:

- [ ] `pnpm exec turbo gen` discovers both Afenda generators.
- [ ] Both contracts validate from one typed registry each.
- [ ] Both registrations are thin adapters; command handlers remain shared mechanics,
      not additional generator families.
- [ ] `doctor all` discovers every applicable package without a manual package list.
- [ ] Every applicable package has a valid deterministic generator lock.
- [ ] Kernel and ERP create fixtures compile, lint, and pass their generated tests.
- [ ] ERP create/add-feature rejects missing semantics and produces a non-empty
      vertical slice from an explicit schema-valid specification.
- [ ] ERP feature-first rules include filenames, root folders, feature imports,
      composite-store prohibition, facade, manifest, and projection parity.
- [ ] Kernel profiles enforce dependency and runtime-context isolation.
- [ ] Managed-file edits and stale projections are detected and treatable.
- [ ] Public root exports derive only from the canonical public API inventory.
- [ ] Realized dependencies without canonical workspace-edge authorization fail.
- [ ] Normative projections byte-match; informational prose cannot become a
      compliance authority accidentally.
- [ ] Formatting-only canonical-source edits that preserve the normalized semantic
      view do not change the package lock.
- [ ] Diagnostics obey the fixed severity and `0/10/20/30/40` exit policy.
- [ ] A deliberately ambiguous semantic change blocks before any write.
- [ ] A repository-wide mechanical upgrade completes and reruns with zero diff.
- [ ] Windows and Linux fixture outputs are byte-equivalent after normalization.
- [ ] `turbo run generator:check --affected` selects changed packages and dependants.
- [ ] Changing a family contract invalidates every governed package check for that family.
- [ ] CI fails on an obsolete lock, forbidden path, manual generated edit, and duplicate owner.
- [ ] The old hard-coded ERP package list is deleted.
- [ ] Package-local duplicate layout scripts are deleted after replacement parity.
- [ ] Existing generated registers match the new projections before old generation code is deleted.
- [ ] Public package facades and accepted consumers remain unchanged for internal migrations.
- [ ] The kernel and ERP scaffolding guides are generator-rendered and byte-matched in CI.
- [ ] No shim, stub, parallel generator, compatibility path, or deferred cleanup remains.

## 29. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Generator becomes a new business semantic owner | Limit contracts to structural policy; require package-owned canonical inputs for business projections. |
| Shared engine becomes a hidden third family | Keep registrations thin, mechanics family-neutral, and all normative policy in exactly two contracts. |
| Initial scope becomes an unfinished repository platform | Treat G0 as non-authoritative and merge G0 + G1 only when the first broken manifest authority is replaced and deleted. |
| Repository-wide upgrade causes partial changes | Preflight all targets, stage outputs, apply package-atomically, persist resumable journal, stop on first failure. |
| Package exception recreates drift | No free-form ignores; promote reusable disposition or block. |
| Managed files erase human work | Exact per-path dispositions and collision checks; canonical files are never overwritten. |
| Custom generator ESM limitation | Thin Turbo adapter invokes the single local engine; no rule duplication. |
| Turbo cache hides a changed contract | Include family contract and engine paths in task inputs; add invalidation fixture. |
| Hashes create false confidence or noisy drift | Locks prove generator parity only; hash normalized projection views, separate engine compatibility, and retain semantic tests and kernel seals. |
| Generated barrel exposes symbols accidentally | Require canonical public API inventory and project `src/index.ts`; never infer exposure from file presence. |
| Dependency discovery reverses authorization | Keep the workspace-edge owner canonical; reconcile observed `package.json` edges against it. |
| Generator migration masks breaking API change | Compatibility classification and direct-consumer evidence are required before mutation. |
| Docs become a second checklist | Generate normative structures and tables from contracts; retain PRD only for rationale and acceptance. |

## 30. References

- [Monorepo boundaries](./README.md)
- [Reusable kernel package scaffold draft](../../packages/KERNEL-SCAFFOLDING.md)
- [ERP semantic-registry method](../../.cursor/skills/afenda-semantic-registry-cutover/SKILL.md)
- [Feature-first ERP reference](../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md)
- [Kernel lifecycle](../../.cursor/skills/afenda-elite-kernel/SKILL.md)
- [Package governance](../modules/PACKAGE-GOVERNANCE.md)
- [Workspace edge register](../modules/WORKSPACE-EDGE-REGISTER.yaml)
- [Schema ownership manifest](../modules/SCHEMA-OWNERSHIP-MANIFEST.yaml)
- [Turborepo generator guide](https://turborepo.dev/docs/guides/generating-code)
- [Turborepo generator reference](https://turborepo.dev/docs/reference/generate)
- [Turborepo codemod reference](https://turborepo.dev/docs/reference/turbo-codemod)
