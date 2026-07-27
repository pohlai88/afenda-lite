# Corporate Administration — Package Architecture and Contracts

## 1. Current Phase 0 source layout

```text
packages/erp/corporate-administration/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── module.manifest.ts
│   ├── module-ids.ts
│   ├── permissions.ts
│   ├── authorization.ts
│   ├── command-options.ts
│   ├── command-identity.ts
│   ├── domain-events.ts
│   ├── event-types.ts
│   ├── idempotency.ts
│   ├── parse-input.ts
│   ├── ports.ts
│   ├── production-ports.ts
│   ├── error-codes.ts
│   ├── mutation-tables.ts
│   ├── kernel/
│   │   ├── brands.ts
│   │   ├── canonical-json.ts
│   │   ├── dates.ts
│   │   ├── decimals.ts
│   │   ├── effective-range.ts
│   │   ├── normalization.ts
│   │   └── pagination.ts
│   ├── internal/
│   │   └── safe-field-path.ts
│   ├── adapters/
│   │   └── drizzle/
│   │       ├── audit.ts
│   │       ├── dependencies.ts
│   │       ├── errors.ts
│   │       ├── idempotency.ts
│   │       ├── index.ts
│   │       ├── outbox.ts
│   │       └── transaction.ts
└── __tests__/
    ├── *.test.ts
    └── helpers/
        ├── fixed-clock.ts
        ├── inline-transaction.ts
        ├── memory-audit.ts
        ├── memory-idempotency.ts
        ├── memory-outbox.ts
        ├── neon-cleanup.ts
        └── neon-parity.ts
```

Later governed business slices add only the owning subdomain folders they
actually implement: `company/`, `establishments/`, `governance/`,
`officers/`, `authority/`, `capital/`, `ownership/`,
`beneficial-ownership/`, `distributions/`, `assets/`,
`compliance-instruments/`, `banking/`, `group/`, `agreements/`,
`corporate-actions/`, `documents/`, `registers/`, `compliance-rules/`,
`filings/`, and `operations/`. These directories are not placeholders and
must remain absent until their owning slice ships executable behavior.

### 1.1 Decomposition rules

- Each subdomain owns its schemas, types, rules and store contract.
- CA-0.4 is infrastructure-only: do not create `src/company/**`, legal-company tables, legal-establishment tables, business commands, business queries, permissions, business events, Actions, API routes or UI in this slice.
- The root store composes narrow domain stores; it does not become a giant interface.
- `kernel/` contains only invariant primitives shared by three or more subdomains.
- Never create generic `common`, `utils`, `repository` or ORM dumping grounds.
- Never place subdomain behavior, Drizzle adapters or memory test helpers as root `src/*.ts` files. Examples that must not reappear: `src/legal-company.ts`, `src/drizzle-legal-company-store.ts`, `src/drizzle-idempotency.ts`, `src/memory-legal-company-store.ts`.
- Drizzle remains behind the adapters subpath.
- Drizzle table definitions are owned only by the repository-authoritative `@afenda/db` schema structure. In this checkout that location is `packages/data-plane/db/src/schema/**`; do not define tables under `packages/erp/corporate-administration`.
- Testing helpers stay under package tests or behind an explicit testing subpath only when package governance permits.
- The root barrel does not export application Actions, UI components, test helpers or raw persistence details.

## 2. Package dependencies

### 2.1 CA-0.1 runtime dependencies

```text
@afenda/db
@afenda/errors
zod
server-only
```

CA-0.4 additionally uses `@afenda/audit` for the shared platform audit adapter. Audit remains platform-owned; Corporate Administration must not create a duplicate CA audit table.

Later slices add `@afenda/events`, `@afenda/search`, `@afenda/master-data`, or other peer edges only when the consuming command/query, manifest dependency, adapter, and tests are introduced together. Physical proximity under `packages/erp/` grants no peer access.

### 2.2 Forbidden dependencies

The package must not import:

- `apps/*`;
- Next.js;
- UI packages;
- peer ERP `/src` paths;
- raw tables owned by Master Data, Payments, Accounting, HR or other bounded contexts;
- browser-only libraries;
- generic workflow implementations;
- binary-storage credentials.

### 2.3 Lifecycle position

The module manifest must remain:

```ts
lifecycle: "scaffolded",
activationMode: "organization_toggle",
```

CA-0.4 durable infrastructure and Drizzle infrastructure adapters do not make Corporate Administration active business capability. CA-0.4 must not add command/query declarations, permissions, business events, legal-company tables, Actions, API routes or UI.

Forbidden lifecycle values before governed final activation:

```text
active
preview
beta
production
```

### 2.4 Export surface

Public root export:

```text
@afenda/corporate-administration
```

The root export publishes contracts, brands, schemas, runtime contracts and infrastructure-safe helpers only. CA-0.4 publishes no command/query functions or domain aggregate types.

Approved adapter export:

```text
@afenda/corporate-administration/adapters/drizzle
```

Application composition roots consume Drizzle adapters from this subpath. Do not export Drizzle adapters, memory stores or test helpers from the public package root.

## 3. Command options

Every command receives trusted request context separately from user input.

```ts
export interface CorporateAdministrationCommandOptions {
  readonly organizationId: OrganizationId;
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly causationId?: CausationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly authorization: CorporateAdministrationAuthorizationContext;
}
```

Rules:

- `organizationId` and `actorUserId` are not accepted inside command payload schemas.
- High-risk commands declare whether an approval is required only when an approval-governed slice introduces that behavior.
- The canonical command fingerprint excludes transport-only correlation data. Business fields and legal targets are introduced only with a governed behavioral slice.
- Query options include organization, authorization and pagination. CA-0.4 has no business query IDs.

## 4. Integration ports

CA-0.1 publishes no integration ports. Add each port only with the command/query slice that consumes it and proves the boundary. Clock, reference, approval, document, accounting, payments, search, reminder, signature, and compliance contracts are future slice work.

CA-0.4 repository decision: audit facts and outbox delivery use shared platform infrastructure where needed; Corporate Administration must not create duplicate `ca_audit_fact` or `ca_outbox_event` tables. CA generic future event envelopes append to `platform_domain_event` using `deduplication_key = eventId`, `type = eventType`, `organization_id`, actor/correlation/causation, canonical JSON `payload`, and aggregate facts in `metadata`. Publication status, attempt count, last error, processed timestamp, and created timestamp remain platform-owned. No compatible shared idempotency facility exists, so CA-0.4 may own the organization-scoped `ca_mutation_receipt` infrastructure table and its Drizzle adapter only.

The durable idempotency receipt must record organization, command identity, idempotency key, fingerprint, status, reservation token, reserved/completed timestamps, canonical JSON replay payload, record version, and created/updated timestamps. Its closed status set is `in_progress`, `completed`, and `released`; do not add `failed` or `expired` until an approved lifecycle requires them. Uniqueness is over `(organization_id, command_id, idempotency_key)`, never `idempotency_key` alone. Completion must match scope, fingerprint, active reservation token, and `in_progress` status. Replay payloads are stored only as canonical JSON strings validated by CA idempotency contracts.

CA-0.4 adds no actual Corporate Administration event types. Payloads must be validated through the event envelope constructor, canonical JSON compatible, free of unsupported JavaScript values or arbitrary prototypes, and bounded before append.

CA-0.4 transaction semantics are explicit. Work returns a governed `Result` plus `commit` or `rollback`; adapters must not infer rollback from `result.ok`. Use `rollback` for ordinary command failure that must leave no writes, and use `commit` for deliberate infrastructure state such as idempotency release. Nested transactions are prohibited and must throw instead of opening an independent transaction or savepoint. The public package boundary exposes only package-neutral transaction context and must not leak Drizzle transaction types.

## 5. Store topology

Future governed business slices may use narrow contracts such as:

```text
LegalCompanyStore
EstablishmentStore
GovernanceStore
OfficerStore
AuthorityStore
CapitalStore
OwnershipStore
BeneficialOwnershipStore
DistributionStore
AssetStore
ComplianceInstrumentStore
BankingAdministrationStore
GroupStore
AgreementStore
CorporateActionStore
DocumentStore
RegisterStore
ComplianceRuleStore
FilingStore
CorporateOperationsStore
```

A resolved composition object may expose these stores to commands. Do not require every command to depend on one oversized all-domain store.

### 5.1 Production atomicity

Production commands call a transaction-scoped Drizzle composition. In this checkout, CA uses the repository Neon HTTP transaction facility via `@afenda/db` `runNeonHttpTransaction`; interactive `db.transaction` is not available on the product Drizzle client. The transaction context must provide package-neutral enlistment for:

- domain store methods;
- mutation receipt operations;
- platform audit append;
- platform outbox append;
- approval-binding persistence;
- deterministic lock helpers.

Memory implementations emulate the same all-or-nothing behavior for parity tests but are never production fallback.

CA-0.4 has no production business command using this topology. Its tests cover infrastructure ports, idempotency behavior, and composition boundaries only.

## 6. Result and semantic error model

All operations return `@afenda/errors` `Result` values.

Minimum error catalog:

```text
CORPORATE_ADMINISTRATION_VALIDATION_FAILED
CORPORATE_ADMINISTRATION_NOT_FOUND
CORPORATE_ADMINISTRATION_FORBIDDEN
CORPORATE_ADMINISTRATION_REFERENCE_INVALID
CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE
CORPORATE_ADMINISTRATION_CONFLICT
CORPORATE_ADMINISTRATION_STALE_VERSION
CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT
CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP
CORPORATE_ADMINISTRATION_INVALID_TRANSITION
CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID
CORPORATE_ADMINISTRATION_LEDGER_UNBALANCED
CORPORATE_ADMINISTRATION_INSUFFICIENT_HOLDING
CORPORATE_ADMINISTRATION_GRAPH_CYCLE
CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED
CORPORATE_ADMINISTRATION_APPROVAL_INVALID
CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES
CORPORATE_ADMINISTRATION_SENSITIVE_DATA_REJECTED
CORPORATE_ADMINISTRATION_RULE_PACK_INVALID
CORPORATE_ADMINISTRATION_RECONCILIATION_FAILED
CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE
```

Do not encode HTTP status in the package.

## 7. Permission model

CA-0.1 through CA-0.4 ship no runtime permissions. The normalized future catalog lives in `FUTURE-PERMISSION-CATALOG.md` and must stay design-only until a command or query activates an exact permission.

Every command/query must appear in a machine-checkable permission coverage test.

## 8. Event contract

Event names use:

```text
corporate_administration.<aggregate>.<past-tense-action>.v<version>
```

Future examples:

```text
corporate_administration.legal_company.created.v1
corporate_administration.officer.appointed.v1
corporate_administration.resolution.adopted.v1
corporate_administration.authority_policy.published.v1
corporate_administration.capital_transaction.posted.v1
corporate_administration.beneficial_owner.attested.v1
corporate_administration.licence.renewed.v1
corporate_administration.corporate_action.effect_recorded.v1
corporate_administration.filing_submission.acknowledged.v1
```

Every event schema declares:

- event version;
- organization and legal company;
- aggregate type and ID;
- occurred/recorded timestamps;
- actor/correlation/causation;
- non-sensitive summary fields;
- no unrestricted document URL or protected identity payload.

Event catalog coverage must reconcile emitted names with registered schemas.

## 9. Query conventions

- `get*` returns one tenant-safe result.
- `list*` uses deterministic cursor pagination; page size is bounded.
- `find*AsOf` accepts effective date.
- Audit-sensitive queries may also accept `knownAt`.
- `resolve*` performs decision-oriented evaluation such as current signing authority.
- Query outputs are read models, not persistence entities.
- Current views include source/version metadata so clients can detect staleness.

Examples:

```text
getLegalCompany
listLegalCompanies
getLegalCompanyHistory
findLegalNameAsOf
listOfficersAsOf
resolveSigningAuthority
getShareholdingsAsOf
resolveBeneficialControl
listExpiringLicences
listDueFilings
getCorporateEntityHealth
```

## 10. Application composition and web boundary

Future route family:

```text
/o/[organizationSlug]/corporate
/o/[organizationSlug]/corporate/companies
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/overview
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/identity
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/establishments
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/governance
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/authority
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/capital
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/ownership
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/assets
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/compliance
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/banking
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/agreements
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/actions
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/documents
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/filings
/o/[organizationSlug]/corporate/health
/o/[organizationSlug]/corporate/imports
/o/[organizationSlug]/corporate/exports
```

Server Actions:

- resolve session and permission context;
- parse browser input;
- call package commands/queries;
- translate `Result` to the application `ActionResult`;
- revalidate only affected routes/tags;
- never import Drizzle tables;
- never trust organization/actor from form data.

CA-0.4 must not add Corporate Administration Server Actions, API routes, route entries, or UI.

## 11. User-experience states

Every operator workflow must implement:

- loading;
- empty;
- forbidden;
- validation failure;
- reference unavailable;
- stale version;
- natural-key conflict;
- approval required/rejected/expired;
- successful idempotent replay;
- server/dependency failure;
- destructive/high-risk confirmation;
- accessible status announcement;
- persisted reload.

Read-only and operator views must not expose inert tabs.

## 12. Test architecture

### 12.1 Required lanes

| Lane | Purpose |
|---|---|
| Domain unit | Pure rule, state transition, chronology and calculation tests |
| Contract | Zod inputs/outputs, public exports, permissions and event schemas |
| Memory | Fast command/query behavior |
| Memory/Drizzle parity | Same scenario and semantic result across adapters |
| Fresh schema | Migration from empty database |
| Upgrade migration | Expand/backfill/contract from supported prior version |
| Neon integration | Real persistence and transaction behavior |
| Concurrency | Simultaneous writes and deterministic outcomes |
| Failure injection | Rollback at each mutation-fact stage |
| Security | Cross-tenant, authorization, approval and sensitive-data leakage |
| Action | Session stamping, permission mapping and result translation |
| Interaction/accessibility | Forms, dialogs, focus, keyboard and announcements |
| Authenticated journey | Production composition and persisted reload |
| Performance | Representative data volume and query plans |
| Recovery | Projector replay, reconciliation, retry and outbox lag recovery |

### 12.2 Shared adapter parity

Every domain store must be exercised by a common test suite. Adapter-specific tests may add SQL or constraint evidence but cannot replace shared semantic parity.

## 13. Migration posture

Greenfield does not mean production migration can be ignored.

Each schema phase must include:

- forward-only migration metadata;
- fresh-schema test;
- compatibility with deployed application during rollout;
- expand/migrate/contract approach for later changes;
- idempotent backfill;
- duplicate and invalid-row quarantine;
- rollback or forward-repair runbook;
- schema ownership and tenancy registration;
- production-like migration rehearsal before activation.

## 14. Observability

Minimum metrics and diagnostics:

- command success/error by semantic code;
- stale-version and natural-key conflict rate;
- approval rejection/mismatch rate;
- transaction rollback/failure-injection checkpoints;
- outbox lag and failed event publication;
- projector checkpoint lag;
- reminder dispatch backlog;
- import validation/apply failures;
- reconciliation finding counts/severity;
- overdue filing and expiring licence counts;
- database query latency and lock wait;
- authenticated journey health.

Logs must remain structured and redacted.
