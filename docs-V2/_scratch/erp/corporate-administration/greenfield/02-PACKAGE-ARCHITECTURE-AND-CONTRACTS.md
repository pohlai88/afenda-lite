# Corporate Administration — Package Architecture and Contracts

## 1. Target source layout

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
│   ├── ports.ts
│   ├── production-ports.ts
│   ├── resolve-store.ts
│   ├── error-codes.ts
│   ├── mutation-tables.ts
│   ├── types.ts
│   ├── kernel/
│   │   ├── brands.ts
│   │   ├── dates.ts
│   │   ├── decimals.ts
│   │   ├── effective-range.ts
│   │   ├── bitemporal.ts
│   │   ├── fingerprint.ts
│   │   ├── normalization.ts
│   │   ├── pagination.ts
│   │   ├── transaction.ts
│   │   └── validation.ts
│   ├── company/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── schemas.ts
│   │   ├── types.ts
│   │   ├── rules.ts
│   │   ├── store.ts
│   │   └── index.ts
│   ├── establishments/
│   ├── governance/
│   ├── officers/
│   ├── authority/
│   ├── capital/
│   ├── ownership/
│   ├── beneficial-ownership/
│   ├── distributions/
│   ├── assets/
│   ├── compliance-instruments/
│   ├── banking/
│   ├── group/
│   ├── agreements/
│   ├── corporate-actions/
│   ├── documents/
│   ├── registers/
│   ├── compliance-rules/
│   ├── filings/
│   ├── operations/
│   ├── adapters/
│   │   └── drizzle/
│   │       ├── index.ts
│   │       ├── transaction-context.ts
│   │       ├── company.ts
│   │       ├── governance.ts
│   │       ├── authority.ts
│   │       ├── capital.ts
│   │       ├── assets.ts
│   │       ├── compliance.ts
│   │       ├── group.ts
│   │       ├── documents.ts
│   │       ├── filings.ts
│   │       └── operations.ts
│   └── testing/
│       ├── index.ts
│       ├── memory-store.ts
│       ├── fixtures.ts
│       ├── parity-harness.ts
│       ├── failure-injection.ts
│       └── test-options.ts
└── __tests__/
    ├── contract/
    ├── domain/
    ├── parity/
    ├── database/
    ├── concurrency/
    ├── failure-injection/
    ├── security/
    └── integration/
```

### 1.1 Decomposition rules

- Each subdomain owns its schemas, types, rules and store contract.
- The root store composes narrow domain stores; it does not become a giant interface.
- `kernel/` contains only invariant primitives shared by three or more subdomains.
- Never create generic `common`, `utils`, `repository` or ORM dumping grounds.
- Drizzle remains behind the adapters subpath.
- Testing exports remain behind an explicit testing subpath when package governance permits.
- The root barrel does not export application Actions, UI components or raw persistence details.

## 2. Package dependencies

### 2.1 Expected platform dependencies

```text
@afenda/db
@afenda/errors
@afenda/audit
@afenda/events
@afenda/search              # only if approved for projections
@afenda/master-data
zod
server-only
```

The implementation must confirm actual allowed edges through Afenda’s module manifest and workspace-edge register. Physical proximity under `packages/erp/` grants no peer access.

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

## 3. Command options

Every command receives trusted request context separately from user input.

```ts
export interface CorporateAdministrationCommandOptions {
  readonly organizationId: OrganizationId;
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly idempotencyKey: string;
  readonly requestInstant: Date;
  readonly authorization: CorporateAdministrationAuthorizationContext;
  readonly approvalDecisionId?: string;
}
```

Rules:

- `organizationId` and `actorUserId` are not accepted inside command payload schemas.
- High-risk commands declare whether an approval is required.
- The canonical command fingerprint excludes transport-only correlation data but includes every business-relevant field and the legal target.
- Query options include organization, authorization, pagination and an injected clock where due-state calculation is required.

## 4. Required ports

| Port | Purpose | Constraint |
|---|---|---|
| `PartyReferencePort` | Resolve person/organization parties, roles, merge state and effective validity | Public Master Data contract only |
| `TaxRegistrationReadPort` | Read effective tax registrations for display/reconciliation | No tax dual-write |
| `ReferenceDataPort` | Countries, currencies, languages, timezones and other approved references | Read-only |
| `ProtectedIdentityPort` | Resolve authorized filing-safe identity attributes | Optional, strict field-level authorization |
| `ApprovalDecisionPort` | Verify approved maker-checker decision and segregation | Generic approval owner remains external |
| `DocumentObjectPort` | Validate object reference, checksum, malware/availability status | No binary in CA |
| `SearchProjectionPort` | Upsert/delete/rebuild redacted search documents | Search never authorizes |
| `ReminderDispatchPort` | Handoff deterministic reminder payloads | Scheduling/delivery remains external |
| `AccountingReferencePort` | Validate journal/asset references and consume legal-asset events | No accounting writes |
| `PaymentsReferencePort` | Validate payment-account/payment references for distributions or banking | No money movement |
| `SignatureEnvelopePort` | Optional e-signature envelope status/reference | No core dependency on vendor |
| `ComplianceRuleSourcePort` | Import/verify signed jurisdiction rule packs | Core can operate with tenant-authored packs |
| `ClockPort` | Deterministic current instant/date | Required for due/overdue and expiry behavior |

## 5. Store topology

Use narrow contracts such as:

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

Production commands call a transaction-scoped Drizzle composition. The transaction context must provide:

- domain store methods;
- mutation receipt operations;
- platform audit append;
- platform outbox append;
- approval-binding persistence;
- deterministic lock helpers.

Memory implementations emulate the same all-or-nothing behavior for parity tests but are never production fallback.

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

Use stable, explicit permission IDs. A recommended catalog:

### 7.1 General and company

```text
corporate_administration.access
corporate_administration.company.read
corporate_administration.company.manage
corporate_administration.company.activate
corporate_administration.company.dissolve
corporate_administration.establishment.manage
```

### 7.2 Governance and authority

```text
corporate_administration.governance.read
corporate_administration.governance.manage
corporate_administration.officer.manage
corporate_administration.meeting.manage
corporate_administration.resolution.manage
corporate_administration.authority.read
corporate_administration.authority.manage
corporate_administration.authority.publish
corporate_administration.seal.manage
```

### 7.3 Capital and ownership

```text
corporate_administration.capital.read
corporate_administration.capital.configure
corporate_administration.capital.post
corporate_administration.capital.reverse
corporate_administration.ownership.read
corporate_administration.ownership.manage
corporate_administration.ubo.read
corporate_administration.ubo.manage
corporate_administration.ubo.attest
corporate_administration.distribution.declare
```

### 7.4 Assets, compliance and banking

```text
corporate_administration.assets.read
corporate_administration.assets.manage
corporate_administration.licence.manage
corporate_administration.charge.manage
corporate_administration.banking.read
corporate_administration.banking.manage
corporate_administration.bank_mandate.manage
```

### 7.5 Group, agreements, actions, documents and filings

```text
corporate_administration.group.read
corporate_administration.group.manage
corporate_administration.related_party.manage
corporate_administration.agreement.manage
corporate_administration.corporate_action.manage
corporate_administration.corporate_action.approve_effect
corporate_administration.document.read
corporate_administration.document.manage
corporate_administration.register.certify
corporate_administration.compliance_rule.manage
corporate_administration.filing.read
corporate_administration.filing.manage
corporate_administration.filing.waive
```

### 7.6 Operations and administration

```text
corporate_administration.import.prepare
corporate_administration.import.approve
corporate_administration.import.apply
corporate_administration.export
corporate_administration.reconcile
corporate_administration.sensitive_export
corporate_administration.module_admin
```

Every command/query must appear in a machine-checkable permission coverage test.

## 8. Event contract

Event names use:

```text
corporate_administration.<aggregate>.<past-tense-action>.v<version>
```

Examples:

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

Recommended route family:

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
