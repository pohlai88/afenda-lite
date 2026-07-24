# HR-AUD-01 — Domain findings (Cluster A)

| Field | Value |
|---|---|
| Mission | **HR-AUD-01** |
| Finding prefix | `HR-COREORG-P{0|1|2|3}-###` |
| Cross-cut reuse | `HR-XCUT-*`, `OPEN-DECISION-*` from HR-AUD-00 |

Scope: [`00-cluster-scope.md`](00-cluster-scope.md) · Matrix: [`02-aggregate-matrix.tsv`](02-aggregate-matrix.tsv)

---

## 1. Normalize

**Assessment:** Person → Worker → Employee terminology is consistent in `workforce-foundation/` and README. Organization commands live under `src/organization/**` but persistence contract is `HumanResourcesCoreStore` — naming/ownership split is intentional but increases navigation cost.

### HR-COREORG-P2-001

| Field | Value |
|---|---|
| **paths/symbols** | `src/organization/**` · `src/store/core.ts` · `src/schemas/organization.ts` · `src/core/assignment.ts` |
| **conflicting authorities** | Organization domain folder vs core store type vs assignment command location |
| **observed disk behavior** | Department/job/position/reporting commands import from `organization/`; assignment command in `core/`; assignment Zod in `schemas/organization.ts` |
| **expected contract** | Single discoverable ownership per aggregate |
| **production or maintenance consequence** | Agents and engineers mis-route fixes; adapter split (`core` + `organization` slices) mirrors folder not store type |
| **canonical recommendation** | Document split in package README; long-term align store type name with folder or extract `HumanResourcesOrganizationStore` |
| **required decision** | None (structural, not blocking) |
| **owning repair mission** | HR-COREORG-STRUCTURE-ALIGN |
| **verification needed for closure** | README + store index document the split; no duplicate store methods |

### HR-COREORG-P1-001

| Field | Value |
|---|---|
| **paths/symbols** | `src/types.ts#Candidate` · `src/schemas/recruitment.ts#createCandidateInputSchema` · `packages/data-plane/db/src/schema/human-resources.ts#hrCandidate` |
| **conflicting authorities** | Domain `Candidate` type includes consent/retention fields; DDL `hr_candidate` has no consent columns |
| **observed disk behavior** | Type requires `consentPolicyVersion`, `consentCapturedAt`, `consentSource`, `retentionUntil`, `consentWithdrawnAt`; table stops at `normalized_email` |
| **expected contract** | Single canonical Candidate shape across schema, DDL, adapters |
| **production or maintenance consequence** | Typecheck failure; recruitment adapter cannot map rows; HR-ENT-07 privacy gap for candidates |
| **canonical recommendation** | Add migration columns + adapter mapping to match the domain type and Zod schema |
| **required decision** | **OPEN-DECISION** — consent columns in `hr_candidate` vs application-only retention |
| **owning repair mission** | HR-COREORG-CANDIDATE-CONSENT-ALIGN |
| **verification needed for closure** | `pnpm --filter @afenda/human-resources typecheck` green; recruitment tests seed consent |

---

## 2. Serialize

**Assessment:** Calendar dates use `isoDateSchema`; timestamps use offset datetime. Assignment dimension snapshots persist key/name snapshots on `hr_work_assignment`. Transfer movement timestamps at the public boundary are ISO datetime strings on Memory and Drizzle (**CLOSED** Slice 1.2).

### HR-COREORG-P2-002 — **CLOSED** (Slice 1.2 · 2026-07-24)

| Field | Value |
|---|---|
| **status** | **CLOSED** — do not reopen |
| **paths/symbols** | `__tests__/human-resources.lifecycle.parity.test.ts` · `adapters/drizzle/lifecycle.ts#mapMovement` · `adapters/memory/lifecycle.ts#transferAssignment` |
| **conflicting authorities** | Memory replay vs Drizzle row mapping for `EmploymentMovement.createdAt/updatedAt` |
| **observed disk behavior (pre-close)** | Parity test `expect(replay).toEqual(transfer)` failed on timestamp representation drift |
| **expected contract** | Memory/Drizzle observable parity — ISO datetime strings at public store boundary |
| **closure evidence** | `toIsoDateTime` in Drizzle `mapMovement`; Memory emits `now.toISOString()`; `isoDateTimeSchema` + replay equality green |
| **owning repair mission** | HR-COREORG-LIFECYCLE-SERIALIZE-PARITY (**CLOSED**) |
| **verification** | `pnpm --filter @afenda/human-resources test -- human-resources.lifecycle.parity` exit 0 |

---

## 3. Stabilize

**Assessment:** Idempotency keys and optimistic concurrency are widespread. Transfer and offer-accept use `runNeonHttpTransaction` CTE chains (atomic). Memory adapters mirror semantics. `createEmployment` blocks second open employment (Memory + DB unique index).

### HR-COREORG-P0-001

| Field | Value |
|---|---|
| **paths/symbols** | `src/adapters/drizzle/recruitment.ts` · `src/adapters/memory/recruitment.ts` · `__tests__/human-resources.recruitment.test.ts` |
| **conflicting authorities** | Zod requires consent fields; tests omit them; adapter typecheck fails |
| **observed disk behavior** | All 9 recruitment unit tests fail at `createCandidate`; 4 parity tests fail same; typecheck exit 2 on recruitment adapter |
| **expected contract** | Green typecheck + passing unit/parity for recruitment slice |
| **production or maintenance consequence** | Entire recruitment pipeline blocked from automated verification |
| **canonical recommendation** | Align candidate consent contract end-to-end (see HR-COREORG-P1-001) then fix test fixtures |
| **required decision** | Same as HR-COREORG-P1-001 |
| **owning repair mission** | HR-COREORG-CANDIDATE-CONSENT-ALIGN |
| **verification needed for closure** | Recruitment test file 11/11 pass; parity 4/4 pass |

**Positive evidence:** `transferAssignment` Drizzle path uses single transaction ending assignment + creating assignment + movement + audit + outbox (`adapters/drizzle/lifecycle.ts`). Offer accept uses multi-CTE transaction (offer, application, outbox, headcount reservation).

---

## 4. Standardize

**Assessment:** Commands use `runCoreCommand` / `runLifecycleCommand` / `runRecruitmentCommand` with manifest permission guards. Error codes include `REHIRE_REQUIRES_ENDED_EMPLOYMENT` but it is never emitted.

### HR-COREORG-P1-002

| Field | Value |
|---|---|
| **paths/symbols** | `src/error-codes.ts#HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT` · `adapters/memory/core.ts#createEmployment` |
| **conflicting authorities** | Semantic error code registered vs generic `CONFLICT` for open employment |
| **observed disk behavior** | `createEmployment` returns `"Employee already has an open employment"` with `HUMAN_RESOURCES_ERROR_CONFLICT`; rehire-specific code never emitted |
| **expected contract** | Rehire after termination uses explicit semantic error when prior employment not ended |
| **production or maintenance consequence** | Callers cannot distinguish rehire violation from other conflicts; no test for rehire path |
| **canonical recommendation** | Emit `REHIRE_REQUIRES_ENDED_EMPLOYMENT` when creating employment while a non-terminated row exists |
| **owning repair mission** | HR-COREORG-REHIRE-SEMANTICS |
| **verification needed for closure** | Unit test: terminated employee can get new employment; active employee cannot; error code asserted |

### HR-COREORG-P0-002 (consumes HR-XCUT-P0-003)

| Field | Value |
|---|---|
| **paths/symbols** | `src/mutation-emission-registry.ts` · Cluster A commands in `module-ids.ts` |
| **conflicting authorities** | HR-XCUT-P0-003 package-wide; Cluster A subset measured here |
| **observed disk behavior** | **6 / 71** cluster commands in emission registry (~8.5%). Lifecycle, organization, recruitment, employment mutations emit audit only (where implemented) without registry-listed outbox types |
| **expected contract** | Registry covers all production-meaningful cluster mutations or explicit exclusion register |
| **production or maintenance consequence** | Downstream platform facts, search projections, payroll handoffs miss lifecycle/recruitment events |
| **canonical recommendation** | Extend registry for transfer, termination, offer accept, requisition approve, assignment create — priority order in [`04-repair-readiness.md`](04-repair-readiness.md) |
| **required decision** | **OPEN-DECISION-01** (effective-truth scope) applies to event coverage too |
| **owning repair mission** | HR-XCUT-EMISSION-REGISTRY (cluster A tranche) |
| **verification needed for closure** | `correlation-integrity.test.ts` includes cluster commands; registry count documented |

---

## 5. Optimize

**Assessment:** No dead cluster scripts identified. Duplicate idempotency check in `acceptOffer` command and Drizzle adapter (defensive, acceptable).

No P2+ findings requiring action.

---

## 6. Enrich

**Assessment:** Effective-truth matrix covers worker, employment, contract, assignment, reporting line, dept/job/position. Person, lifecycle, recruitment tables absent. Org-context query now resolves full dimension keys when assignment snapshot present (contradicts stale enterprise.md null cost-centre claim).

### HR-COREORG-P1-003

| Field | Value |
|---|---|
| **paths/symbols** | `src/effective-truth-adoption.ts` · `hr_person` · lifecycle/recruitment tables |
| **conflicting authorities** | OPEN-DECISION-01; HR-ENT-05 package-wide wording |
| **observed disk behavior** | `hr_person` not in `HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES`; onboarding/termination/offer tables also absent |
| **expected contract** | Explicit adoption decision per mutable table or documented exclusion |
| **canonical recommendation** | Add `hr_person` as `versioned-current`; classify lifecycle/recruitment as operational vs temporal in exclusion register |
| **owning repair mission** | HR-ENT-03-EFFECTIVE-TRUTH (cluster A tranche) |
| **verification needed for closure** | Matrix validator includes new rows or exclusions documented |

### HR-COREORG-P1-004

| Field | Value |
|---|---|
| **paths/symbols** | `src/core/org-context.ts` · `docs-V2/_scratch/slice/enterprise.md` HR-ENT-04 |
| **conflicting authorities** | enterprise.md: `costCentreKey` always null; disk: returns `resolvedDimensions.cost_centre.key` |
| **observed disk behavior** | Query fails closed when `organizationDimensions === null`; otherwise returns all five dimension keys + work calendar |
| **expected contract** | Historical org context deterministic when assignment has dimension snapshot |
| **production or maintenance consequence** | Strategy doc understates progress; assignments without dimensions still block Time/Leave consumers |
| **canonical recommendation** | Refresh enterprise.md HR-ENT-04 evidence; enforce dimension snapshot on assignment create (already required in command) |
| **required decision** | **OPEN-DECISION-04** for directory owner — partially implemented via `human-resources-organization-dimension-port.ts` |
| **owning repair mission** | HR-ENT-02-ORG-CONTEXT |
| **verification needed for closure** | `human-resources.foundation.parity.test.ts` org-context cases green with real dimensions |

### HR-COREORG-P1-005

| Field | Value |
|---|---|
| **paths/symbols** | `src/recruitment/offer.ts#acceptOffer` · `src/types.ts#OfferAcceptanceHandoff` |
| **conflicting authorities** | Mission priority: candidate-to-worker conversion |
| **observed disk behavior** | Handoff returns offer + application IDs only; no person/worker/employee creation |
| **expected contract** | Documented orchestration contract for hire flow (manual or workflow command chain) |
| **production or maintenance consequence** | Product must compose person→employee→employment→worker after accept; no single atomic hire command |
| **canonical recommendation** | Add explicit `HireFromOffer` orchestration command or document required command sequence in recruitment README |
| **required decision** | **OPEN-DECISION** — atomic hire vs staged orchestration |
| **owning repair mission** | HR-COREORG-HIRE-ORCHESTRATION |
| **verification needed for closure** | Integration test: accept → person → employee → employment → worker linkage |

---

## 7. Repair readiness

See [`04-repair-readiness.md`](04-repair-readiness.md) for ordered repair mission names.

**Cluster verdict:** Workforce foundation (person/worker) and organization structure are **production-backed** with parity evidence. Core employment/assignment **Partial** (emission + some DB gaps). Recruitment slice **Gap** (consent/DDL drift blocks all tests). Lifecycle **Partial** (atomic transfer/termination in Drizzle; emission and timestamp parity gaps).
