# `@afenda/corporate-administration`

Organization-scoped **Corporate Administration and Statutory Registers** for Afenda-Lite — legal companies, registration history, governance and delegated authority, share capital (immutable ledger + derived holdings), premises, property and non-stock corporate assets, licences, bank-account registrations, group control, documents, and statutory filings. Commands and queries return `@afenda/errors` `Result` types; material mutations commit audit facts and outbox events in the same transaction.

**Who it's for:** `apps/web` server actions and composition-root ports that need typed CA mutations — not UI shells, HTTP handlers, GL depreciation, payment execution, or HR workforce records.

**Requires:** Node 24.x · pnpm ≥10.33.4 (root `package.json` engines).

**Manifest:** `id: corporate-administration` · `category: erp` · `band: R1-F` · `lifecycle: scaffolded` · table prefix `ca_*` (**34** hard-tenant roots in `packages/data-plane/db/src/hard-tenant-roots.ts`). Slice status and completeness ledger: [integrated implementation authority](../../../docs-V2/_scratch/erp/corporate-administration/corporate-administration-integrated-implementation-authority.md).

## Consume

Workspace import from the root barrel:

```ts
import {
	createLegalCompany,
	listLegalCompanies,
	getLegalCompanyAsOf,
	appointOfficer,
	createShareTransaction,
	registerProperty,
	type CorporateAdministrationCommandOptions,
	type CaLegalCompany,
} from "@afenda/corporate-administration";
```

Wire authorization and master lookups at the app composition root (`apps/web/lib/erp/corporate-administration-command-options.ts`). Production Actions call `createCorporateAdministrationCommandOptions()`; the store defaults to Drizzle (`@afenda/corporate-administration/adapters/drizzle`). Inject the Memory store from `@afenda/corporate-administration/testing` in Vitest.

| Domain surface | Responsibility |
|----------------|----------------|
| Legal company | Create / update / activate / suspend / dissolve / archive; names; identifiers; status history; as-of reads |
| Governance | Bodies, memberships, officers, authority mandates, premises, meetings, resolutions (+ lifecycle + as-of) |
| Share capital | Share classes, immutable share transactions, certificates, beneficial-owner disclosures, derived holdings |
| Property & assets | Property holdings, corporate assets, IP, insurance, charges (+ renewals / variations / receipts) |
| Licences & banking | Licences/permits, bank-account registrations, bank mandates, group-control relationships, material agreements |
| Documents & filings | Corporate documents, filing obligations, filing submissions |
| Search & compliance | Corporate-record search; due / overdue filings |

**Security:** Commands and org-scoped queries require an injected `CorporateAdministrationAuthorizationPort`. Session stamps `organizationId`, `actorUserId`, and `correlationId` at the Action composition root — input schemas must not accept tenant-field injection.

**Tenancy:** Shared Neon schema with organization-scoped rows (`organization_id` NOT NULL on **34** `ca_*` hard-tenant roots). Not multi-DB isolation — see [docs-V2/tenancy](../../../docs-V2/tenancy/README.md).

**Permissions:** Namespace `corporate-administration.*` (codes in `src/permissions.ts` / `CA_PERMISSION_CODES`). Route-level checks in `apps/web` are not sufficient — every public command/query enforces its declared permission through the injected port.

**Living consumers:** thin Actions under `apps/web/app/actions/*` (legal company, governance, share capital, property-assets) + `apps/web/features/corporate-administration/*`.

## Public surfaces

| Subpath | Role |
|---------|------|
| `@afenda/corporate-administration` | Domain commands, queries, schemas/types, permission codes, port types, `canonicalSerialize` + request fingerprint helpers |
| `@afenda/corporate-administration/adapters/drizzle` | `createDrizzleCorporateAdministrationStore` |
| `@afenda/corporate-administration/testing` | `createMemoryCorporateAdministrationStore` and memory store types (Vitest) |
| `@afenda/corporate-administration/module-manifest` | Module manifest (`band: R1-F`, `lifecycle: scaffolded`) |

The root barrel does not export raw Drizzle tables, SQL builders, database handles, Next.js types, or HTTP / `ActionResult` envelopes.

## Maintain

```bash
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check
```

After manifest or register changes:

```bash
pnpm validate:modules
pnpm governance:packages
```

See [`testing/README.md`](../../../testing/README.md) for workspace Vitest layout. Package tests live under `__tests__/` (domain, parity, concurrency, failure-injection, anti-shadow, manifest parity).

## Boundaries

| Owns | Does not own |
|------|----------------|
| Sole mutation authority for `ca_*` tables | Physical schema host (`@afenda/db` — `writeOwner` in SCHEMA-OWNERSHIP-MANIFEST) |
| CA domain rules, Zod contracts, store adapters (Drizzle + memory), permissions, error codes | Legal-entity dimension, parties, tax registrations (`@afenda/master-data` — lookup only; no direct `md_*` writes) |
| Bank-account **registration** and mandate register (masked legal/admin facts) | Operational payment accounts and money movement (`@afenda/payments`) |
| Immutable share-transaction ledger + derived as-of holdings | Editable shareholding source rows; GL depreciation; inventory stock; HR workforce |

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/master-data`, `@afenda/audit`.

**Approved edges:** `@afenda/corporate-administration` → those packages must remain listed in [WORKSPACE-EDGE-REGISTER.yaml](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

Must not import Surfaces, `apps/*`, or Next.js. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: shadow party/bank tables, `md_*` mutations, HR/payroll ownership, inventory stock, payment execution, Next.js handlers, tutorial `{ success, data }` envelopes, or a second tenancy model (shared schema · hard `organization_id` only). Hard deletion of activated statutory facts is forbidden — correct by supersession, end dating, reversal, dissolution, release, cancellation, or archival.

## Authority

| Topic | Link |
|-------|------|
| Integrated implementation authority (Scratch) | [corporate-administration-integrated-implementation-authority.md](../../../docs-V2/_scratch/erp/corporate-administration/corporate-administration-integrated-implementation-authority.md) |
| ERP scaffold rules | [SCAFFOLDING.md](../SCAFFOLDING.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Events catalog | [docs-V2/events](../../../docs-V2/events/README.md) · [`@afenda/events`](../../data-plane/events/README.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
