# HR-AUD-00 — Cross-cutting baseline

| Field | Value |
|---|---|
| Mission | **HR-AUD-00** |
| Package | `@afenda/human-resources` |
| Lenses | Normalize · Serialize · Stabilize · Standardize · Optimize · Enrich · Repair readiness |
| Findings prefix | `HR-XCUT-{P0|P1|P2|P3}-###` |

Authority map: [`00-authority-map.md`](00-authority-map.md) · Canonical matrix: [`02-canonical-definitions.tsv`](02-canonical-definitions.tsv)

## Executive summary

The HR package has a **mature cross-cutting kernel** (brands, Zod schemas, manifest-backed permissions, audit/outbox ports, Memory/Drizzle compose with compile-time coverage guards, and a machine-enforced effective-truth matrix for **33** temporal tables). Enterprise blockers cluster around **incomplete cross-cut consumption** (privacy port, emission registry, authorization unification) and **authority drift** between Scratch documents and disk counts.

Memory and Drizzle report the **same** `HumanResourcesStore` capability surface at compile time. Product composition (`apps/web`) wires most ports but **not** privacy.

---

## 1. Normalize

**Terminology:** Domain folders (`core`, `organization`, `time`, …) match README farm table and store slices. Worker foundation terminology (`Person → Worker → Employee`) is consistent in `workforce-foundation/` and README.

**Naming:** Command/query IDs follow `human-resources.{aggregate}.{verb}` (`module-ids.ts`). Permissions mirror aggregate vocabulary (`permissions.ts`).

**Domain IDs and brands:** Centralized in `brands.ts` with Zod `.brand<>()` — canonical pattern.

**Nullable vs optional:** Effective dating uses nullable `effectiveTo` on ranges; org-context returns nullable manager and calendar IDs. Assignment `organizationDimensions` null fails closed (`core/org-context.ts`).

**Command/query naming:** 286 commands / 141 queries on disk; stable kebab-case verbs.

**Record/DTO conventions:** Persistence shapes in `types.ts`; input shapes in `schemas/`. Store contracts use explicit `*Record` create types.

### Findings — Normalize

#### HR-XCUT-P1-003

| Field | Value |
|---|---|
| **Paths/symbols** | `docs-V2/_scratch/slice/enterprise.md` · `src/module-ids.ts` · `src/permissions.ts` |
| **Conflicting authorities** | enterprise.md claims 284 commands / 138 queries / 98 permissions vs disk 286 / 141 / 99 |
| **Observed disk** | Counted `export const HUMAN_RESOURCES_COMMAND_*` / `QUERY_*` / `PERMISSION_*` on 2026-07-24 |
| **Expected contract** | Strategy doc counts match generated registers or module-ids |
| **Consequence** | Governance reviews under-count surface area; register drift undetected |
| **Recommendation** | Refresh enterprise.md evidence baseline from disk or `pnpm validate:modules` |
| **Decision** | None |
| **Repair mission** | HR-ENT doc hygiene (Docs lane or Scratch refresh mission) |
| **Verification** | Grep counts match enterprise.md after update |

#### HR-XCUT-P2-004

| Field | Value |
|---|---|
| **Paths/symbols** | `src/schemas/common.ts#humanResourcesTenantContextSchema` |
| **Conflicting authorities** | Deprecated alias vs `humanResourcesMutationContextSchema` |
| **Observed disk** | Both names exported; comment marks tenant alias deprecated |
| **Expected contract** | Single mutation context name at boundaries |
| **Consequence** | New code may import deprecated alias |
| **Recommendation** | Domain-cluster audits flag deprecated imports; remove alias in dedicated hygiene slice |
| **Decision** | None |
| **Repair mission** | HR-XCUT-HYGIENE (future) |
| **Verification** | No `humanResourcesTenantContextSchema` imports outside package |

---

## 2. Serialize

**Dates:** Calendar dates = `isoDateSchema` (`YYYY-MM-DD`). **Timestamps:** `isoDateTimeSchema` with offset for audit/event fields.

**Money:** Decimal strings with up to 4 fractional digits (`schemas/compensation.ts`); not integer minor units.

**JSON/metadata:** Audit `changes` typed as `@afenda/audit` `Change[]`; outbox payload `Record<string, unknown>` validated at `@afenda/events` boundary.

**Enums/status:** Owned per domain in `shared/*-status.ts` + domain schemas.

**Event payloads:** Types in `@afenda/events/schemas`; HR registry maps subset of commands.

**Audit facts:** Normalized through `AuditFactInput` → `createSqlAuditFactPort`.

**Platform/payroll handoffs:** `integrations/platform-facts.ts` for platform; time payroll handoff event in registry.

**Transform chain:** Zod parse at command entry → branded/domain types → store records → Drizzle columns → `Result<T>` out.

### Findings — Serialize

#### HR-XCUT-P1-006

| Field | Value |
|---|---|
| **Paths/symbols** | `src/schemas/compensation.ts#moneyAmountSchema` · `@afenda/payroll` (boundary) |
| **Conflicting authorities** | HR decimal strings vs payroll package money conventions |
| **Observed disk** | HR uses string decimals; payroll handoff via events/commands not audited here |
| **Expected contract** | Single money serialization at ERP boundary |
| **Consequence** | Silent rounding/scale bugs at payroll ingestion |
| **Recommendation** | OPEN-DECISION: document handoff scale in shared ERP contract; cluster C audit must cite payroll consumer |
| **Decision** | **OPEN-DECISION** — payroll minor-units vs HR decimal strings |
| **Repair mission** | HR-AUD-03 + payroll architect review |
| **Verification** | Parity test across HR compensation handoff → payroll input parse |

---

## 3. Stabilize

**Interfaces:** `HumanResourcesStore` fully intersected; coverage types enforce Memory/Drizzle completeness.

**Fallbacks:** Commands fail closed when required ports missing (`command-options.ts` `require*` helpers).

**Fake guarantees:** `effective-truth-adoption.test.ts` proves matrix integrity for **expected** tables only — not all 106 mutation tables.

**Transactions:** Drizzle adapters use per-command transactions (domain-cluster verify); not centralized in cross-cut layer.

**Idempotency:** Widespread store-level idempotency key lookups + `shared/fingerprint.ts`.

**Optimistic concurrency:** `version` field + stale version errors; adoption matrix declares `concurrency: "version"` for temporal rows.

**Audit/outbox:** Mandatory via `MutationPorts`; correlation preserved in `correlation-integrity.test.ts` for registry-listed commands.

**Package composition:** `composeStoreSlices` throws on duplicate method names — stable compose semantics.

### Findings — Stabilize

#### HR-XCUT-P0-002

| Field | Value |
|---|---|
| **Paths/symbols** | `src/effective-truth-adoption.ts#HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES` · `validateEffectiveTruthAdoptionMatrix` · HR-ENT-05 |
| **Conflicting authorities** | enterprise.md Phase 3 / HR-ENT-05 implies package-wide effective truth; validator scopes 33/106 tables |
| **Observed disk** | 33 expected tables classified; 73 mutation tables outside matrix scope; tests pass for scoped set |
| **Expected contract** | Either full 106-table classification or explicit documented scope boundary |
| **Consequence** | Unclassified mutable tables may mutate without shared temporal semantics |
| **Recommendation** | Treat matrix as **authoritative for listed tables**; extend `EXPECTED_TABLES` deliberately per domain-cluster audit |
| **Decision** | **OPEN-DECISION** — expand matrix to all mutable tables vs explicit exclusion register |
| **Repair mission** | HR-ENT-03-EFFECTIVE-TRUTH extension (per domain cluster) |
| **Verification** | `validateEffectiveTruthAdoptionMatrix()` empty AND documented scope equals HR-ENT-05 acceptance |

#### HR-XCUT-P0-003

| Field | Value |
|---|---|
| **Paths/symbols** | `src/mutation-emission-registry.ts` · `src/module-ids.ts` · `__tests__/correlation-integrity.test.ts` |
| **Conflicting authorities** | Registry comment: "Expand as fixtures added" vs production need for complete emission map |
| **Observed disk** | 88 registry entries / 286 commands (~31%) |
| **Expected contract** | Every mutating command declares audit-only vs domain_event (+ event types) |
| **Consequence** | Undocumented commands may omit outbox events or audit correlation tests |
| **Recommendation** | Generate registry from manifest events map or enforce manifest ↔ registry parity gate |
| **Decision** | None |
| **Repair mission** | HR-XCUT-EMISSION-REGISTRY |
| **Verification** | Registry entry count = mutating command count; CI gate |

#### HR-XCUT-P1-007

| Field | Value |
|---|---|
| **Paths/symbols** | `src/resolve-store.ts#cached` |
| **Conflicting authorities** | Module singleton vs request-scoped store injection |
| **Observed disk** | `resolveHumanResourcesStore()` caches Drizzle store at module scope when no override |
| **Expected contract** | Request-safe composition (inject store in tests/production) |
| **Consequence** | Theoretic cross-request state if store implementation becomes stateful; today adapters use DB |
| **Recommendation** | Document "inject store in serverless" rule; avoid stateful fields on store object |
| **Decision** | None |
| **Repair mission** | HR-XCUT-STORE-RESOLVER (optional hardening) |
| **Verification** | Store slices remain stateless except DB/Memory state handles |

---

## 4. Standardize

**Enum/status ownership:** Per-domain `shared/*-status.ts` — consistent.

**Error construction:** `error-codes.ts` + `humanResourcesErrorDetails()` — canonical.

**Permission naming:** `human-resources.*` — matches manifest authorization maps.

**Authorization entry points:** **Not standardized** — four parallel systems (see HR-XCUT-P0-001).

**Store conventions:** Domain store file per folder; methods named `create*` / `find*` / `list*`.

**Adapter conventions:** One Drizzle file per domain folder; Memory mirrors; shared `compose.ts`.

**Package exports:** 10 intentional subpaths (`package.json`).

### Findings — Standardize

#### HR-XCUT-P0-001

| Field | Value |
|---|---|
| **Paths/symbols** | `authorization.ts` · `shared/contextual-authorization.ts` · `employee-relations/case-access-control.ts` · `sensitive-operation-policies.ts` |
| **Conflicting authorities** | HR-ENT-06 calls for unified sensitive policy; disk has parallel entry points |
| **Observed disk** | Manifest guards used broadly; resource-aware port used in compensation + selective leave; ER uses `case-access-control.ts`; sensitive prefixes tested in isolation |
| **Expected contract** | Single authorization facade with plug-in policies |
| **Consequence** | New sensitive commands may implement inconsistent checks |
| **Recommendation** | Standardize on `authorizeHumanResourcesSensitiveResource` + manifest permission; ER case access as specialized policy module |
| **Decision** | **OPEN-DECISION** — unify vs document layered model |
| **Repair mission** | HR-ENT-04-AUTH-PRIVACY |
| **Verification** | Coverage test proves every sensitive command/query hits unified entry |

#### HR-XCUT-P2-005

| Field | Value |
|---|---|
| **Paths/symbols** | `src/store/index.ts` · `src/store/core.ts` · `src/adapters/drizzle/organization.ts` |
| **Conflicting authorities** | Store type lists org methods under Core; adapters split `core` + `organization` |
| **Observed disk** | `HumanResourcesCoreStore` includes department/job/position/reporting methods; separate adapter slice for organization |
| **Expected contract** | Store interface layout matches domain boundaries |
| **Consequence** | Navigation friction; no functional drift if coverage tests green |
| **Recommendation** | Optional `HumanResourcesOrganizationStore` type alias or document "core includes org persistence" |
| **Decision** | None |
| **Repair mission** | HR-XCUT-STORE-TYPES (optional) |
| **Verification** | coverage tests remain green after refactor |

---

## 5. Optimize

**Duplicate utilities:** Effective range/lineage centralized — good. Multiple authorization paths — bad (see P0-001).

**Oversized interfaces:** `HumanResourcesStore` is large but guarded by coverage types — acceptable for ERP module.

**Adapter delegation:** Memory reuses Drizzle `composeStoreSlices` — intentional DRY.

**Compatibility layers:** `DrizzleHumanResourcesStore` deprecated alias; `humanResourcesTenantContextSchema` deprecated.

**Maintenance scripts:** `scripts/fix-shard-imports.mjs`, `rewrite-time-types.mjs`, `shard-time-parity.mjs`, `time-types-fragment.ts.txt` — Time shard tooling.

**Generated artifacts:** `tsconfig.tsbuildinfo` on disk; listed in root `.gitignore` (`*.tsbuildinfo`).

### Findings — Optimize

#### HR-XCUT-P2-008

| Field | Value |
|---|---|
| **Paths/symbols** | `packages/erp/human-resources/scripts/*.mjs` |
| **Conflicting authorities** | None |
| **Observed disk** | Three maintenance scripts + fragment remain after time shard split |
| **Expected contract** | Scripts removed or documented in package README when obsolete |
| **Consequence** | Confusion about whether re-sharding is required |
| **Recommendation** | HR-AUD-02 (Time cluster) decides keep/delete with evidence from `time-slices-roadmap.md` |
| **Decision** | Defer to HR-AUD-02 |
| **Repair mission** | HR-AUD-02 |
| **Verification** | Scripts referenced in README or deleted |

#### HR-XCUT-P3-009

| Field | Value |
|---|---|
| **Paths/symbols** | `src/adapters/drizzle/store.ts#DrizzleHumanResourcesStore` |
| **Observed disk** | Deprecated alias exported |
| **Recommendation** | Remove when zero importers (repo housekeeping) |
| **Repair mission** | afenda-elite-repo-housekeeping |
| **Verification** | Knip/grep zero imports |

---

## 6. Enrich

**Effective truth:** Machine matrix + tests — authoritative for 33 tables (`effective-truth-adoption.ts`).

**Reason codes:** HR semantic codes rich set in `error-codes.ts`.

**Evidence references:** Document vault URIs via `DocumentReferencePort`.

**Historical queries:** `asOf` patterns in org-context, leave, time — domain-specific.

**Privacy:** Retention classifications defined; **port not implemented at app layer**.

**Platform-fact contracts:** `integrations/platform-facts.ts` maps events → workflow/notification/identity/search.

**HR-ENT alignment:** HR-ENT-05 pass is **scoped**; HR-ENT-07 blocked on privacy wiring.

### Findings — Enrich

#### HR-XCUT-P0-004

| Field | Value |
|---|---|
| **Paths/symbols** | `src/privacy.ts#HumanResourcesPrivacyPort` · `command-options.ts#requirePrivacyPort` · `apps/web/lib/erp/human-resources-command-options.ts` |
| **Conflicting authorities** | HR-ENT-07 requires DSAR/retention ports; disk defines port but zero command consumers |
| **Observed disk** | `requirePrivacyPort` defined; not called from any command; apps/web omits `privacy` in command options |
| **Expected contract** | Composition root wires privacy adapter; sensitive export/erase commands require port |
| **Consequence** | Retention/DSAR/hold lifecycle non-functional despite types existing |
| **Recommendation** | Platform-owned adapter in apps/web; HR commands call port for export/anonymize/hold |
| **Decision** | **OPEN-DECISION** — platform package owner for DSAR execution |
| **Repair mission** | HR-ENT-04-AUTH-PRIVACY / HR-ENT-05-PLATFORM privacy slice |
| **Verification** | Integration test: exportSubject invoked with tenant isolation |

#### HR-XCUT-P1-010

| Field | Value |
|---|---|
| **Paths/symbols** | `docs-V2/_scratch/erp/human-resources-implementation-audit.md` |
| **Conflicting authorities** | HR-00 audit vs current disk |
| **Observed disk** | HR-00 claims 43 tables / 2 commands |
| **Expected contract** | Scratch audits labeled superseded when stale |
| **Consequence** | Agents implement against wrong inventory |
| **Recommendation** | Mark HR-00 superseded in authority map (done); do not cite for counts |
| **Repair mission** | HR-AUD-00 (this mission) |
| **Verification** | HR-00 header points to this audit pack |

---

## 7. Repair readiness

**Dependency ordering (cross-cut):**

1. Refresh authority counts (P1-003, P1-010)
2. Privacy port wiring (P0-004) — blocks HR-ENT-07
3. Authorization unification (P0-001) — blocks HR-ENT-06
4. Emission registry completion (P0-003) — blocks event parity gates
5. Effective-truth scope decision (P0-002) — blocks HR-ENT-05 closure claim
6. Domain-cluster deep audits (HR-AUD-01/02/03)

**Architecture decisions isolated:** See [`03-cross-cutting-conflicts.md`](03-cross-cutting-conflicts.md).

**Domain-cluster boundaries:** Locked in [`04-domain-cluster-audit-contract.md`](04-domain-cluster-audit-contract.md).

**Likely first P0/P1 repair (name only, do not implement here):** `HR-ENT-04-AUTH-PRIVACY` (privacy port + authorization unification) — highest cross-cut leverage for HR-ENT-06/07.

---

## Special inspections summary

| Inspection | Verdict |
|---|---|
| `effective-truth-adoption.ts` authoritative? | **Authoritative for 33-table scope**; not full mutation inventory |
| `mutation-emission-registry` ↔ `mutation-tables` | Tables aligned; registry maps **commands** not tables — 88/286 coverage gap |
| Authorization duplication | **Yes** — four mechanisms (HR-XCUT-P0-001) |
| Privacy/sensitive policies consumed? | Sensitive policies tested; **privacy port unused** (HR-XCUT-P0-004) |
| production-ports / resolve-store / adapters same capability? | **Yes** at store method level (coverage guards) |
| Root vs domain store aligned? | **Mostly** — org methods typed under core (HR-XCUT-P2-005) |
| schemas/store/root exports stable? | **Yes** — intentional subpaths; resolve-store internal |
| scripts / fragment necessary? | **Defer** to HR-AUD-02 |
| tsconfig.tsbuildinfo tracked? | **No** — gitignored; local artifact only |
| Memory vs Drizzle coverage same surface? | **Yes** — compile-time `Missing*Methods` = `never` |
| Prior audits vs disk? | **HR-00 superseded**; enterprise.md mostly current with count drift |

---

## Finding index

| ID | Severity | Title |
|---|---|---|
| HR-XCUT-P0-001 | P0 | Parallel authorization entry points |
| HR-XCUT-P0-002 | P0 | Effective-truth matrix scope vs HR-ENT-05 |
| HR-XCUT-P0-003 | P0 | Mutation emission registry incomplete |
| HR-XCUT-P0-004 | P0 | Privacy port unwired and unused |
| HR-XCUT-P1-003 | P1 | enterprise.md count drift |
| HR-XCUT-P1-006 | P1 | Money serialization at payroll boundary |
| HR-XCUT-P1-007 | P1 | Module-scoped store cache |
| HR-XCUT-P1-010 | P1 | HR-00 audit superseded |
| HR-XCUT-P2-004 | P2 | Deprecated tenant context alias |
| HR-XCUT-P2-005 | P2 | Store vs adapter org layout mismatch |
| HR-XCUT-P2-008 | P2 | Time maintenance scripts disposition |
| HR-XCUT-P3-009 | P3 | Deprecated Drizzle store alias |
