# `@afenda/payroll` package tree

Structural SSOT for agents implementing Payroll. Use the repository-wide ERP
feature-first topology from
[`feature-first-erp.md`](../afenda-semantic-registry-cutover/references/feature-first-erp.md).
Payroll owns the feature names and domain boundaries below; it does not define an
alternate root layout.

## Canonical target

```text
packages/erp/payroll/
├── package.json                         # one public entrypoint: "."
├── README.md
├── PRODUCTION_READINESS.md
├── __tests__/                           # public, architecture, parity, product contracts
└── src/
    ├── index.ts                         # permanent @afenda/payroll facade export
    ├── facade/                          # representation-safe commands, queries, contracts
    ├── kernel/                          # package-wide semantic composition and primitives
    │   ├── operations/                  # composed operation registry and projections
    │   ├── identity/                    # package-wide branded identities
    │   ├── money/                       # decimal and rounding invariants
    │   ├── temporal/                    # effective-date primitives
    │   ├── execution/                   # authorization and execution policy
    │   ├── emissions/                   # event catalogue and mutation inventory
    │   └── serialization/               # canonical snapshot/wire serialization policy
    ├── composition/                     # production/test construction; no business meaning
    │   ├── production.ts
    │   ├── store/                       # aggregate construction only
    │   └── adapters/                    # technology-specific aggregate wiring only
    ├── features/                        # primary business ownership axis
    │   ├── payroll-setup/
    │   ├── employee-assignments/
    │   ├── workforce-ingress/
    │   ├── variable-inputs/
    │   ├── payroll-runs/
    │   ├── calculation/
    │   ├── statutory-rules/
    │   ├── malaysia-statutory/
    │   ├── vietnam-statutory/
    │   ├── payslips/
    │   ├── payment-instructions/
    │   ├── accounting-postings/
    │   ├── reconciliation/
    │   ├── statutory-filings/
    │   └── reporting/
    └── testing/                         # isolated package test composition only
```

The tree is a target inventory, not permission to create empty folders or
placeholder files. Create a feature only with production behavior and acceptance
evidence. Large features may use named business subfeatures, never generic
`commands/`, `queries/`, `services/`, `models/`, `schemas/`, or `adapters/`
layers spanning multiple features.

## Uniform feature capsule

Use only the files justified by the feature:

```text
features/<feature>/
├── index.ts                  # internal projection only when composition needs it
├── definition.ts             # canonical operation/status/policy definitions
├── contract.ts               # domain inputs, outputs, and values
├── schema.ts                 # validation derived from the owned contract
├── policy.ts                 # feature authorization/privacy/workflow policy
├── <use-case>.ts             # command, query, or domain behavior
├── store-contract.ts         # smallest persistence capability
├── ports.ts                  # explicit peer/external capabilities when required
├── adapters/
│   ├── memory.ts
│   └── drizzle.ts
└── __tests__/                # colocated contracts when tooling supports them
```

## Ownership rules

| Concern | Canonical home | Forbidden |
|---|---|---|
| Feature contract and validation | `features/<feature>/contract.ts` and `schema.ts` | Root `types.ts`, `ports.ts`, or package-wide `schemas/` |
| Feature policy and definitions | `features/<feature>/definition.ts` or named registry | Parallel command/status/permission maps |
| Feature persistence | `store-contract.ts` plus feature adapters | Feature dependency on the composite Payroll store |
| Cross-feature workflow | Narrow capability in the owning feature's `ports.ts` | Importing peer adapters or interpreting peer state |
| Package-wide registry composition | `kernel/operations/` or another named kernel owner | Moving feature meaning into the kernel |
| Aggregate construction | `composition/` | Business policy, validation, or feature re-export barrels |
| Public capabilities | `facade/` and root `index.ts` | Business subpaths or a second capability style |
| Test construction | `testing/` | Production imports from testing |

## Dependency direction

```text
consumer -> index -> facade -> composition -> feature adapters
                              |              |
                              +-> kernel <---+
feature -> own contract/store + narrow ports + approved kernel primitives
```

Features never import `composition`, `facade`, or `testing`. Feature handlers and
adapters never name, accept, construct, or import the composite Payroll store.
Only composition combines feature adapters. Adapter-neutral composition helpers
must not live under a technology-specific directory.

## Public export

`@afenda/payroll` resolves only to `src/index.ts`. Stores, schemas, adapters,
brands, registries, calculators, SQL, and testing mechanisms remain private.
Internal moves require zero production-consumer edits unless the business contract
deliberately changes.

## Final cutover requirements

The current shallow farms are migration sources, not a second accepted topology.
The structural cutover must:

1. freeze root exports and accepted consumers;
2. use an explicit collision-checked old-to-new manifest;
3. move files before resolver-aware import rewriting;
4. replace broad `PayrollStore` and package-wide memory-state dependencies with
   feature-owned contracts;
5. delete root `shared/`, generic `types.ts`/`ports.ts`, shallow business farms,
   superseded aliases, and old architecture fixtures in the same cutover;
6. add recursive dependency guards covering feature adapters and colocated tests;
7. prove facade, behavior, authorization, serialization, adapter, transaction,
   tenancy, and affected-consumer parity.

Do not leave forwarding files, compatibility folders, parallel APIs, or an empty
copy of a superseded directory.
