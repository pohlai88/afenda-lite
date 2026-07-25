# Corporate Administration — Technical Specification

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/corporate-administration/corporate-administration.md` |
| Mode | Technical spec (pre-implementation) |
| Audience | Engineers scaffolding `@afenda/corporate-administration` |
| Status | `DRAFT` — awaiting package-name + roadmap approval |
| As of | 2026-07-25 |
| Authority | [packages/erp/SCAFFOLDING.md](../../../packages/erp/SCAFFOLDING.md) · [PACKAGE-GOVERNANCE.md](../../modules/PACKAGE-GOVERNANCE.md) · living references `@afenda/sales` · `@afenda/master-data` |
| Tier | Scratch only — not Living DOC-001 SSOT |

**Action this doc enables:** approve bounded context, aggregates, ownership, and first implementation slice before any package scaffold.

---

## Overview

Tenant organizations need a single ERP bounded context to administer **legal companies and their corporate facts**: incorporation / registration, officers, share capital and shareholders, registered premises, property, non-inventory corporate assets, licences, charges, and statutory documents.

This module is **not** HR, **not** inventory stock, and **not** the GL fixed-asset depreciation engine. It is the company-secretary / corporate-registry spine that other modules may reference by stamped keys or events.

**Proposed package**

| Item | Value |
| ---- | ----- |
| Folder | `packages/erp/corporate-administration/` |
| Published name | `@afenda/corporate-administration` |
| Manifest `id` | `corporate-administration` |
| Category | `governance` (new catalog category; peers stay commercial / supply-chain / erp) |
| Band | `R1-F` |
| Lifecycle (first ship) | `scaffolded` → `active` after slice CA-1 verify |
| `activationMode` | `organization_toggle` |
| Table prefix | `ca_*` |
| Family | Transactional document / register (not master-data backbone) |

---

## Problem

On disk today:

- No `@afenda/*` package owns company registration, shareholders, officers, property, or corporate asset registers.
- `@afenda/master-data` `md_organization_dimension` with `kind: legal_entity` is a **scope key** (id / key / name / effective dates) used by HR and ops — not a company registry.
- `@afenda/inventory` owns **stock** movements and balances — not property titles or corporate fixed-asset registers.
- `@afenda/accounting` owns CoA / journals / periods — not statutory share ledgers.

Without a dedicated context, product paths either overload master-data, invent shadow tables inside other packages, or leave corporate administration unmodeled.

---

## Goals

1. Sole-mutator ownership of tenant corporate-registry aggregates under `ca_*`.
2. Enterprise production command/query surface: Zod boundary · package-internal authz · `Result<T>` · audit + outbox in the mutation UoW.
3. Clear boundary with master-data parties (people/orgs as parties) and legal-entity **dimension keys**.
4. Cover the material corporate-admin elements a multi-entity tenant needs (see aggregates).
5. Incremental slices that each ship end-to-end (schema → package → permissions → Actions → tests) without stubs.

## Non-goals

| Non-goal | Owner / note |
| -------- | ------------ |
| Employee / employment / payroll | `@afenda/human-resources` · `@afenda/payroll` |
| Stock SKU / warehouse balances | `@afenda/inventory` |
| GL depreciation / capitalization journals | `@afenda/accounting` (may consume `ba.asset.*` events later) |
| CRM customer commercial history | `@afenda/sales` / party roles |
| Jurisdiction-specific e-filing adapters (SSM, Companies House, …) | Future integration ports — not CA-1 |
| Document binary storage / OCR | Platform blob + later document service; CA stores metadata + references |
| Expanding Living `docs/` ARCH bodies | Scratch + package README only until Docs-lane reopen |

---

## Constraints

| Constraint | Source |
| ---------- | ------ |
| Greenfield under `packages/*` + `apps/web/**` only | AGENTS.md · Collapse ban |
| Schema DDL in `@afenda/db`; writes only in owning package | SCAFFOLDING §6 · SCHEMA-OWNERSHIP-MANIFEST |
| Hard `organization_id` on every tenant root | tenancy · `hard-tenant-roots.ts` |
| No peer ERP imports unless WORKSPACE-EDGE-REGISTER edge | PACKAGE-GOVERNANCE |
| Default cross-module style = events | SCAFFOLDING §1 |
| New package requires MODULE-ROADMAP row + governance green | SCAFFOLDING §9 |
| Reference parties via `@afenda/master-data` lookup — no `ca_person` shadow | ARCH-006 consumer contract |
| Fail-closed authorization inside every command/query | sales / MD pattern |
| Enterprise production quality bar only | no-mvp-quality-bar |

---

## Proposed design

### Bounded context

```text
Tenant Organization (Neon Auth org)
  └── Legal Company (ca_legal_company)          ← primary aggregate root
        ├── Registration / incorporation facts
        ├── Officers & appointments
        ├── Share classes · allotments · holdings
        ├── Beneficial ownership disclosures
        ├── Registered office & places of business
        ├── Property holdings (real estate)
        ├── Corporate asset register (non-stock)
        ├── Licences & permits
        ├── Charges / encumbrances
        ├── Bank account register (admin facts)
        ├── Group / ownership links
        └── Corporate documents & filings (metadata)
```

**Tenant vs company:** one Neon `organization_id` may administer **many** legal companies (group structures). Every `ca_*` row is org-scoped; company id is the second hard filter after org.

### Relationship to master-data `legal_entity` dimension

| Concern | Owner |
| ------- | ----- |
| Scope key used by HR / calendars / planning (`kind: legal_entity`) | `@afenda/master-data` `md_organization_dimension` |
| Rich company registry (numbers, capital, officers, property, …) | `@afenda/corporate-administration` |

**Binding rule (proposed):**

1. Creating / activating a `ca_legal_company` **requires** an effective `md_organization_dimension` of kind `legal_entity` (lookup by id or key) and stamps `legal_entity_dimension_id`, `legal_entity_key_snapshot`, `legal_entity_name_snapshot`.
2. CA never mutates `md_*`.
3. Dimension rename/supersede does not rewrite historical CA stamps; CA may expose a reconcile command later.
4. HR continues to reference the **dimension**; it does not import CA. Optional later: HR reads company display via events/projection — not CA-1.

### Aggregate inventory

| Aggregate | Table(s) | Purpose |
| --------- | -------- | ------- |
| Legal company | `ca_legal_company` | Registered name, trading names, jurisdiction, company number, incorporation date, status, entity type, fiscal year end, company secretary party ref |
| Registration identifier | `ca_company_identifier` | Multi-jurisdiction ids (company no., tax no., LEI, …) with type + issuing authority |
| Officer appointment | `ca_officer_appointment` | Director / secretary / auditor / other; party FK stamp; appointed/resigned; authority limits |
| Share class | `ca_share_class` | Ordinary / preference / …; par value; currency; authorized quantity |
| Share allotment | `ca_share_allotment` | Issuance events against a class |
| Shareholding | `ca_shareholding` | Current / as-of holding by party (or nominee); class; quantity; certificate refs |
| Beneficial owner | `ca_beneficial_owner` | PSC / UBO disclosures with nature of control |
| Premises | `ca_company_premises` | Registered office, principal place of business, branch; address snapshot + optional party address link |
| Property holding | `ca_property_holding` | Real estate / land / strata; title refs; ownership %; acquisition; tenure |
| Corporate asset | `ca_corporate_asset` | Non-inventory assets: plant, vehicles, IP, equipment, other; category; identifier; custodian; acquisition; disposal |
| Licence / permit | `ca_licence_permit` | Operating licences, industry permits, expiry, renewal |
| Charge / encumbrance | `ca_charge` | Mortgages, debentures, liens against company or property |
| Bank account register | `ca_bank_account` | Admin register of company accounts (not payment execution) |
| Group link | `ca_group_link` | Parent/subsidiary/associate between legal companies in the tenant |
| Corporate document | `ca_corporate_document` | Constitution, resolutions, filings, certificates — metadata + external ref |
| Filing / compliance item | `ca_statutory_filing` | Due / submitted / acknowledged statutory filings calendar |

Statuses (typical): `draft | active | suspended | dissolved | archived` on company; appointment `proposed | active | resigned | removed`; asset `active | disposed | written_off`.

### Package layout (canonical ERP pattern)

Mirror `@afenda/sales` (transactional) with aggregate files like master-data breadth:

```text
packages/erp/corporate-administration/
├── package.json                 # @afenda/corporate-administration
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                 # server-only public barrel
│   ├── module.manifest.ts
│   ├── module-ids.ts
│   ├── permissions.ts
│   ├── authorization.ts
│   ├── command-options.ts
│   ├── ports.ts                 # MutationPorts + MasterLookupPort
│   ├── production-ports.ts
│   ├── store.ts
│   ├── resolve-store.ts
│   ├── memory-store.ts
│   ├── drizzle-store.ts         # or adapters/drizzle/*
│   ├── schemas.ts               # split per aggregate when large
│   ├── parse-input.ts
│   ├── types.ts
│   ├── brands.ts
│   ├── error-codes.ts
│   ├── legal-company.ts
│   ├── officers.ts
│   ├── share-capital.ts
│   ├── premises.ts
│   ├── property.ts
│   ├── corporate-assets.ts
│   ├── licences.ts
│   ├── charges.ts
│   ├── bank-accounts.ts
│   ├── group-structure.ts
│   ├── documents.ts
│   └── filings.ts
└── __tests__/
```

**Exports** (sales-shaped):

- `.` — commands, queries, schemas, permissions, error codes, `CorporateAdministrationCommandOptions`
- `./adapters/drizzle`
- `./testing`
- `./module-manifest`

### Command anatomy

```text
parseBaInput(schema, input)
→ requireBaCommandPermission(commandId, …)
→ resolveCommandDeps(options)   # store, MutationPorts, masters, authorization
→ domain invariants + store mutation (org + company scoped)
→ audit.record + outbox.append (same TX in production)
→ ok(entity) | fail(code, message, details)
```

Every mutation input carries: `organizationId`, `actorUserId`, `correlationId`, optional `idempotencyKey`, and usually `legalCompanyId`.

### Ports

| Port | Role |
| ---- | ---- |
| `MutationPorts.audit` | → `@afenda/audit` |
| `MutationPorts.outbox` | → `@afenda/events` |
| `MasterLookupPort` | Resolve party + legal_entity dimension (read-only public MD API) — **no** SQL into `md_*` |

No `@afenda/admin` imports inside the package. App injects `CorporateAdministrationAuthorizationPort` via `apps/web/lib/erp/corporate-administration-*-port.ts`.

### Permissions (initial namespace)

```text
corporate-administration.company.create|update|activate|dissolve|read|list
corporate-administration.officer.create|update|end|read|list
corporate-administration.shareholding.create|update|transfer|read|list
corporate-administration.beneficial-owner.create|update|end|read|list
corporate-administration.premises.create|update|retire|read|list
corporate-administration.property.create|update|dispose|read|list
corporate-administration.asset.create|update|dispose|read|list
corporate-administration.licence.create|update|renew|revoke|read|list
corporate-administration.charge.create|update|release|read|list
corporate-administration.bank-account.create|update|close|read|list
corporate-administration.group-link.create|update|end|read|list
corporate-administration.document.create|update|retire|read|list
corporate-administration.filing.create|update|submit|read|list
```

Fine codes seed `platform-permission-catalog.ts` via manifest; Actions use the same strings.

### Events (initial emit set)

Namespace `corporate-administration.*` in `@afenda/events`:

| Event id | When |
| -------- | ---- |
| `corporate-administration.company.created.v1` | Company draft/create |
| `corporate-administration.company.activated.v1` | Status → active |
| `corporate-administration.company.dissolved.v1` | Dissolution |
| `corporate-administration.officer.appointed.v1` / `.ended.v1` | Officer lifecycle |
| `corporate-administration.shareholding.changed.v1` | Allot / transfer / cancel |
| `corporate-administration.property.registered.v1` / `.disposed.v1` | Property |
| `corporate-administration.asset.registered.v1` / `.disposed.v1` | Corporate asset |
| `corporate-administration.charge.created.v1` / `.released.v1` | Charges |
| `corporate-administration.filing.submitted.v1` | Statutory filing |

Consumers (optional, later): accounting (asset capitalization hooks), search projectors, compliance dashboards. **CA-1 emits; no required consumers.**

### App composition root

```text
apps/web/lib/erp/corporate-administration-command-options.ts
apps/web/lib/erp/corporate-administration-authorization-port.ts
apps/web/app/actions/*-corporate-administration-*.ts   # or per-aggregate verbs
apps/web/features/corporate-administration/            # RSC shells
```

Actions: `runOperatorPermissionAction` → package command → `mapPackageResult` → `ActionResult`.

---

## Interfaces / dependencies

| Dependency | Edge |
| ---------- | ---- |
| `@afenda/db` | Schema host |
| `@afenda/errors` | `Result` |
| `@afenda/audit` | Production audit port |
| `@afenda/events` | Outbox + event schemas |
| `@afenda/master-data` | Registered workspace edge — party + organization-dimension **reads** only |

**Forbidden edges (CA-1):** human-resources, payroll, inventory, sales, purchasing, accounting (unless a later dual-control ADR adds one).

Manifest:

```yaml
moduleDependencies:
  required: ["master-data"]
optionalIntegratesWith:
  - { moduleId: accounting, style: events }   # future
  - { moduleId: human-resources, style: events }  # future display sync only
```

---

## Delivery slices (enterprise quality each)

Shrink **scope**, not quality. Each slice is shippable end-to-end.

| Slice | Scope | Exit evidence |
| ----- | ----- | ------------- |
| **CA-0** | Roadmap row · package shell · empty manifest · governance hooks · README anti-goals | `pnpm governance:packages` |
| **CA-1** | `ca_legal_company` + identifiers · create/update/activate/list/get · MD legal_entity stamp · permissions · Actions · memory+drizzle tests | package check · web typecheck · tenancy audit |
| **CA-2** | Officers + premises | same gates |
| **CA-3** | Share classes · allotments · holdings · beneficial owners | same gates |
| **CA-4** | Property + corporate assets + charges | same gates |
| **CA-5** | Licences · bank accounts · group links | same gates |
| **CA-6** | Documents + statutory filings | same gates |
| **CA-7** | Search projectors / console UX hardening / optional accounting event consumers | matrix closeout |

---

## Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Collision with inventory “asset” language | Name aggregate `corporate_asset`; table `ca_corporate_asset`; README anti-goal vs stock |
| Overloading MD `legal_entity` dimension | Stamp-only link; rich facts stay in CA |
| Jurisdiction schema explosion | Typed identifier rows + jurisdiction code on company; adapters later |
| Party vs natural person without party | Require `md_party` for officers/shareholders; no free-text-only identity for controlled roles |
| Scope creep into accounting FA | Emit events only; no journal posts in CA |
| Dirty tree / concurrent HR work | Implement CA in a clean branch; do not mix with HR privacy/emission WIP |

---

## Rollout and rollback

**Rollout**

1. Approve this spec (name, category, CA-1 scope).
2. Add MODULE-ROADMAP candidate row.
3. Scaffold package + `ca_*` migration on Neon production branch policy.
4. Seed permissions · wire Actions · feature shell.
5. `pnpm governance:packages` · package tests · `audit:tenancy-nulls`.

**Rollback**

- Feature toggle / org activation off (`organization_toggle`).
- Migration reverse only if no production rows (or follow explicit data migration ADR).
- Permissions remain inert if no UI/Actions call them.

---

## Open questions

Answer these before CA-0/CA-1 coding:

1. **Package name** — confirm `@afenda/corporate-administration` vs shorter `@afenda/corporate` / `@afenda/entity-administration`.
2. **Category label** — confirm `governance` vs nest under `erp` like HR/payroll.
3. **Primary jurisdiction profile for CA-1** — generic multi-jurisdiction fields only, or first-class Malaysia (SSM) / other profile?
4. **Must every legal company map 1:1 to an MD `legal_entity` dimension?** (Spec assumes **yes**.)
5. **Shareholders as parties only**, or allow external unregistered holders with structured name+id until party created?
6. **Property vs corporate asset** — keep separate aggregates (recommended) or one polymorphic asset register?
7. **Should CA-1 include UI feature shell**, or package + Actions only first?

---

## Verification baseline (current disk)

**Story:** Tenant org records company, registration, shareholders, property, and corporate assets via a new ERP module following sales/MD governance.

| Boundary | Status | Evidence |
| -------- | ------ | -------- |
| Package exists | ❌ | No `packages/erp/corporate-administration` |
| MODULE-ROADMAP row | ❌ | `docs-V2/modules/MODULE-ROADMAP.yaml` → `modules: []` |
| Schema / ownership | ❌ | No `ca_*` in SCHEMA-OWNERSHIP-MANIFEST |
| App Actions / features | ❌ | No `apps/web` CA surfaces |
| Closest related surface | ⚠️ | MD `legal_entity` dimension + HR snapshots — scope keys only |

**First broken boundary:** module not on disk. Do not pretend end-to-end UI/API verification until CA-1 ships.

**Preflight (repo):** `.vercel/project.json` present · Turbo/pnpm workspace present · branch `main` with substantial unrelated HR WIP — isolate CA implementation.

---

## SCAFFOLDING §9 checklist (when approved)

| Step | Artifact |
| ---- | -------- |
| 1 | MODULE-ROADMAP.yaml row for `corporate-administration` |
| 2 | `packages/erp/corporate-administration/` + `@afenda/corporate-administration` |
| 3 | `module.manifest.ts` |
| 4 | `@afenda/db` schema + migration + SCHEMA-OWNERSHIP-MANIFEST |
| 5 | WORKSPACE-EDGE-REGISTER + package.json deps |
| 6 | Catalog / validate-modules parity |
| 7 | Permission catalog seeds + authz map |
| 8 | Domain tests + `apps/web` Actions |
| 9 | Package README (consume / maintain / anti-goals) |
| 10 | Green `pnpm governance:packages` + package lint/typecheck/test |

---

## References

- Pattern SSOT: [packages/erp/SCAFFOLDING.md](../../../packages/erp/SCAFFOLDING.md)
- Category map: [packages/erp/README.md](../../../packages/erp/README.md)
- Transactional reference: `packages/erp/sales/src/`
- Master lookup / legal_entity kind: `packages/erp/master-data/src/organization-dimension.ts`
- Consumer contract: [docs-V2/master-data/arch-006-consumer-contract.md](../../master-data/arch-006-consumer-contract.md)
- Governance: [docs-V2/modules/PACKAGE-GOVERNANCE.md](../../modules/PACKAGE-GOVERNANCE.md)
