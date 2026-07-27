# Corporate Administration — reference

Progressive companion for [SKILL.md](SKILL.md). Full prose lives in Scratch — load slice-specific docs only when executing that slice.

## Scratch pack (operative authority)

| Path | Role |
|------|------|
| `docs-V2/_scratch/erp/corporate-administration/greenfield/README.md` | Pack entry · mission · phase count |
| `greenfield/00-CORPORATE-ADMINISTRATION-AUTHORITY.md` | Mission · greenfield reset · identity · ownership |
| `greenfield/01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md` | Aggregate map · data authority · proposed table inventory |
| `greenfield/02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md` | Layout · deps · command options · ports |
| `greenfield/03-ROADMAP-INDEX.md` | Slice register · status vocabulary |
| `greenfield/90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md` | 14 boundaries · lanes · handoff |
| `greenfield/SOURCE-PLACEMENT.md` | Where new source files land |
| `greenfield/phase/PHASE-<N>-*.md` | Phase execution controls + slice prompts |
| `greenfield/evidence/CA-<X.Y>-EVIDENCE.md` | Per-slice completion evidence |

## Package on disk

| Path | Role |
|------|------|
| `packages/erp/corporate-administration/` | `@afenda/corporate-administration` |
| `packages/erp/corporate-administration/README.md` | **Current slice position** — read before coding |
| `packages/erp/corporate-administration/src/module.manifest.ts` | Governed manifest |
| `packages/erp/corporate-administration/src/mutation-tables.ts` | Sole-mutator registration |
| `packages/data-plane/db/src/schema/corporate-administration.ts` | Drizzle schema host |
| `packages/data-plane/db/drizzle/*corporate*` | Migrations |

## App composition

| Path | Role |
|------|------|
| `apps/web/lib/erp/corporate-administration-runtime.ts` | Model B composition root |
| `apps/web/lib/erp/corporate-administration-command-options.ts` | Future request context factory; add with first command slice |
| `apps/web/lib/erp/corporate-administration-action-schemas.ts` | Future Action input schemas; add with first Action |
| `apps/web/lib/erp/corporate-administration-authorization-port.ts` | Future authz injection; add with first live permission |
| `apps/web/app/actions/*legal-company*` · `*corporate-administration*` | Future business Server Actions |
| `apps/web/features/corporate-administration/` | Future UI panels · forms · shell |
| `apps/web/app/(client)/client/(workspace)/corporate-administration/` | Future client route |
| `apps/web/app/(operator)/admin/corporate-administration/` | Future operator route |

## Phase map (47 slices)

| Phase | Name | Slices |
|------:|------|--------|
| 0 | Architecture and Foundation | CA-0.1 … CA-0.4 |
| 1 | Legal Company and Establishments | CA-1.1 … CA-1.5 |
| 2 | Governance and Statutory Offices | CA-2.1 … CA-2.5 |
| 3 | Authority, Approvals and Company Seal | CA-3.1 … CA-3.4 |
| 4 | Capital, Ownership and Beneficial Control | CA-4.1 … CA-4.6 |
| 5 | Assets, Licences, Insurance, Charges and Banking | CA-5.1 … CA-5.6 |
| 6 | Group Structure, Agreements and Corporate Actions | CA-6.1 … CA-6.5 |
| 7 | Documents, Statutory Registers, Compliance and Filings | CA-7.1 … CA-7.6 |
| 8 | Operational Services and Enterprise Activation | CA-8.1 … CA-8.6 |

Full register: scratch `03-ROADMAP-INDEX.md` § Slice register.

## Status vocabulary

| Status | Meaning |
|--------|---------|
| `OPEN` | Approved; not started |
| `IN_PROGRESS` | Active work — not completion evidence |
| `DONE` | All deliverables + lanes + boundaries evidenced |
| `PARTIAL` | Some implementation; boundary incomplete |
| `BLOCKED` | Required external lane unavailable |
| `NOT_APPLICABLE` | Phase explicitly excludes boundary |

**Drift rule:** `03-ROADMAP-INDEX`, phase docs, package README, and evidence may disagree during parallel work. Before editing, read package README + run tests; treat evidence files as slice-close truth.

## Target subdomain folders (scratch `02-*`)

When a slice introduces behavior, land code under the owning subdomain — not the package root:

`company/` · `establishments/` · `governance/` · `officers/` · `authority/` · `capital/` · `ownership/` · `beneficial-ownership/` · `distributions/` · `assets/` · `compliance-instruments/` · `banking/` · `group/` · `agreements/` · `corporate-actions/` · `documents/` · `registers/` · `compliance-rules/` · `filings/` · `operations/`

Adapters: `adapters/drizzle/<subdomain>.ts` composed from `adapters/drizzle/index.ts`.

## Execution model — Model B

- Package exports contracts + domain; validates runtime shape.
- App builds `CorporateAdministrationRuntimePorts` once via `createCorporateAdministrationRuntime`.
- Per command: `CorporateAdministrationCommandOptions` (org, actor, correlation, idempotency, authorization).
- No optional production adapter resolution inside the package.
- Sibling ERP packages may use Model A; CA does not maintain both.

## Pre-greenfield retirement

Migration `0050_drop_corporate_administration_module.sql` defined the forward
retirement of legacy `ca_*`. The current dirty worktree has removed the earlier
migration chain, including 0050; do not reconstruct it from legacy history.
Fresh/upgrade verification remains blocked until the owning DB lane resolves
that pre-existing migration-chain change.

## Related program docs

`docs-V2/_scratch/00.hrm.md` tracks cross-program HR + CA phase status when coordinating with Human Resources workstreams.
