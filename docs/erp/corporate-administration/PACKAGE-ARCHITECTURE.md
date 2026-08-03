Corporate Administration — Complete Package Architecture

Authority: docs/erp/corporate-administration/corporate-administration-architecture.md

Package: packages/erp/corporate-administration

packages/erp/corporate-administration/
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── index.ts
│   │
│   ├── facade/
│   │
│   ├── kernel/
│   │   ├── authorization/
│   │   ├── execution/
│   │   ├── operations/
│   │   ├── emissions/
│   │   ├── tenancy/
│   │   ├── privacy/
│   │   ├── validation/
│   │   └── internal/
│   │
│   ├── composition/
│   │   └── module.manifest.ts
│   │
│   ├── features/
│   │   ├── entity-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── company/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── company.memory.ts
│   │   │   │   │   └── company.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── establishments/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── establishments.memory.ts
│   │   │   │   │   └── establishments.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── group-structure/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── group-structure.memory.ts
│   │   │       │   └── group-structure.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   ├── governance-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── governance-bodies/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── governance-bodies.memory.ts
│   │   │   │   │   └── governance-bodies.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── officers/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── officers.memory.ts
│   │   │   │   │   └── officers.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── meetings/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── meetings.memory.ts
│   │   │   │   │   └── meetings.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── resolutions/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── resolutions.memory.ts
│   │   │   │   │   └── resolutions.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── authority/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── authority.memory.ts
│   │   │       │   └── authority.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   ├── compliance-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── obligations-calendar/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── obligations-calendar.memory.ts
│   │   │   │   │   └── obligations-calendar.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── statutory-filings/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── statutory-filings.memory.ts
│   │   │   │   │   └── statutory-filings.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── licences-permits/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── licences-permits.memory.ts
│   │   │   │   │   └── licences-permits.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── compliance-assurance/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── compliance-assurance.memory.ts
│   │   │       │   └── compliance-assurance.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   ├── agreement-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── administrative-agreements/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── administrative-agreements.memory.ts
│   │   │   │   │   └── administrative-agreements.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── service-subscriptions/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── service-subscriptions.memory.ts
│   │   │   │   │   └── service-subscriptions.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── insurance/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── insurance.memory.ts
│   │   │   │   │   └── insurance.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── legal-instruments/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── legal-instruments.memory.ts
│   │   │       │   └── legal-instruments.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   ├── resource-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── administrative-assets/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── administrative-assets.memory.ts
│   │   │   │   │   └── administrative-assets.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── resource-assignments/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── resource-assignments.memory.ts
│   │   │   │   │   └── resource-assignments.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── access-resources/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── access-resources.memory.ts
│   │   │   │   │   └── access-resources.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── physical-verification/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── physical-verification.memory.ts
│   │   │       │   └── physical-verification.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   ├── premises-administration/
│   │   │   ├── group.definition.ts
│   │   │   ├── premises/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── premises.memory.ts
│   │   │   │   │   └── premises.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── occupancy/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── occupancy.memory.ts
│   │   │   │   │   └── occupancy.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   ├── facility-services/
│   │   │   │   ├── index.ts
│   │   │   │   ├── operation-registry.ts
│   │   │   │   ├── run-operation.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── guards.ts
│   │   │   │   ├── store-contract.ts
│   │   │   │   ├── <business-noun>.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── facility-services.memory.ts
│   │   │   │   │   └── facility-services.drizzle.ts
│   │   │   │   └── __tests__/
│   │   │   └── premises-access/
│   │   │       ├── index.ts
│   │   │       ├── operation-registry.ts
│   │   │       ├── run-operation.ts
│   │   │       ├── schema.ts
│   │   │       ├── policy.ts
│   │   │       ├── guards.ts
│   │   │       ├── store-contract.ts
│   │   │       ├── <business-noun>.ts
│   │   │       ├── adapters/
│   │   │       │   ├── premises-access.memory.ts
│   │   │       │   └── premises-access.drizzle.ts
│   │   │       └── __tests__/
│   │   │
│   │   └── records-administration/
│   │       ├── group.definition.ts
│   │       ├── controlled-records/
│   │       │   ├── index.ts
│   │       │   ├── operation-registry.ts
│   │       │   ├── run-operation.ts
│   │       │   ├── schema.ts
│   │       │   ├── policy.ts
│   │       │   ├── guards.ts
│   │       │   ├── store-contract.ts
│   │       │   ├── <business-noun>.ts
│   │       │   ├── adapters/
│   │       │   │   ├── controlled-records.memory.ts
│   │       │   │   └── controlled-records.drizzle.ts
│   │       │   └── __tests__/
│   │       ├── document-register/
│   │       │   ├── index.ts
│   │       │   ├── operation-registry.ts
│   │       │   ├── run-operation.ts
│   │       │   ├── schema.ts
│   │       │   ├── policy.ts
│   │       │   ├── guards.ts
│   │       │   ├── store-contract.ts
│   │       │   ├── <business-noun>.ts
│   │       │   ├── adapters/
│   │       │   │   ├── document-register.memory.ts
│   │       │   │   └── document-register.drizzle.ts
│   │       │   └── __tests__/
│   │       ├── retention-disposal/
│   │       │   ├── index.ts
│   │       │   ├── operation-registry.ts
│   │       │   ├── run-operation.ts
│   │       │   ├── schema.ts
│   │       │   ├── policy.ts
│   │       │   ├── guards.ts
│   │       │   ├── store-contract.ts
│   │       │   ├── <business-noun>.ts
│   │       │   ├── adapters/
│   │       │   │   ├── retention-disposal.memory.ts
│   │       │   │   └── retention-disposal.drizzle.ts
│   │       │   └── __tests__/
│   │       └── evidence-packs/
│   │           ├── index.ts
│   │           ├── operation-registry.ts
│   │           ├── run-operation.ts
│   │           ├── schema.ts
│   │           ├── policy.ts
│   │           ├── guards.ts
│   │           ├── store-contract.ts
│   │           ├── <business-noun>.ts
│   │           ├── adapters/
│   │           │   ├── evidence-packs.memory.ts
│   │           │   └── evidence-packs.drizzle.ts
│   │           └── __tests__/
│   │
│   └── testing/
│
├── __tests__/
│   ├── architecture/
│   ├── facade/
│   ├── registry/
│   ├── authorization/
│   ├── tenancy/
│   ├── privacy/
│   ├── atomicity/
│   ├── idempotency/
│   ├── emissions/
│   ├── adapter-parity/
│   └── consumer-contracts/
│
└── scripts/

Permanent structural rules

src/features/<feature-group>/<feature>/<files>

feature-group is classification only.

Each feature owns its own business meaning, operations, schemas, rules, lifecycle, store contract, adapters, and tests.

operation-registry.ts is the canonical feature operation owner.

run-operation.ts is the feature execution entrypoint.

Production persistence adapter naming is <feature>.drizzle.ts.

Memory adapter naming is <feature>.memory.ts.

@afenda/db owns schema and migrations; they do not live in this package.

Consumers import only from @afenda/corporate-administration.

src/index.ts begins with import "server-only";.

Prohibited structures

commands/
queries/
definition.ts
operations.ts
relational.ts
<feature>.relational.ts
package-local schema/
package-local migrations/
feature PRDs inside src/
local layout/deep-import/ownership checker scripts

Important source-bound qualification

The architecture defines the directories under facade/, kernel/, composition/, testing/, root __tests__/, and scripts/, but it does not enumerate every internal filename for those areas. Therefore this document does not invent any such filenames.

The feature capsule filenames above are taken directly from the architecture’s standard feature capsule. <business-noun>.ts remains a placeholder because the architecture deliberately requires a business-semantic filename rather than a generic filename.
