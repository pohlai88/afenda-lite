# Payroll Product Requirements — Malaysia and Vietnam

| Field | Value |
|---|---|
| Status | Draft for product, payroll-domain, security, and legal review |
| Document type | Product requirements document (PRD) |
| Product | Afenda-Lite Payroll |
| Initial jurisdictions | Malaysia (MY), Vietnam (VN) |
| Benchmark | Odoo Payroll and Frappe HR / ERPNext Payroll |
| Date | 2026-08-02 |
| Architecture authority | `AGENTS.md`, `packages/erp/payroll`, and this Scratch product pack |
| Intended readers | Product, payroll operations, engineering, security, finance, implementation partners, qualified local counsel |

> This is a Scratch product specification, not legal or tax advice and not a production-compliance approval. Every effective-dated statutory pack requires documented review by a qualified Malaysia or Vietnam payroll professional before production activation.

## 1. Product outcome

Afenda Payroll shall provide a deterministic, auditable payroll control plane for Malaysia and Vietnam. It shall convert approved workforce facts and effective-dated payroll policies into reviewable gross-to-net results, payslips, statutory liabilities, payment instructions, accounting postings, reconciliations, and filing evidence.

The product is launchable only when a payroll operator can answer, for every amount:

1. Which approved source fact caused it?
2. Which effective-dated rule and version calculated it?
3. Which rounding and currency policy was applied?
4. Who approved, finalized, paid, posted, reversed, or corrected it?
5. Which statutory period, return, payment, or employee statement contains it?

## 2. Problem statement

The existing package has strong lifecycle, deterministic snapshot, authorization, persistence, reconciliation, and event foundations. It is not yet a launchable Malaysia/Vietnam payroll product because:

- the only registered statutory calculator is explicitly synthetic and production-blocked;
- the application workforce adapter now carries the approved HR handoff unchanged; HR performs as-of employment and assignment selection and supplies employment status, while recurring allowance/bonus coverage, complete aggregate lineage, and historical contract normalization are not yet proven end to end;
- HR also has a durable payroll-delivery workflow, but Payroll consumes no events and calculation separately pulls workforce facts, leaving two incomplete integration mechanisms instead of one accepted-ingress owner;
- cumulative month-to-date and year-to-date bases required by tax and statutory processes are not complete;
- downstream payment and accounting consumers are not wired to Payroll's finalized projections/events;
- payslip artifact generation, protected delivery, statutory submissions, jurisdiction reports, and operational dashboards are incomplete;
- launch evidence does not yet prove current Malaysia and Vietnam rules across effective-date transitions.

The product must not hide these gaps behind successful compilation or a synthetic calculation.

## 3. Goals

- Deliver production-approved monthly and off-cycle payroll for MYR and VND.
- Preserve one canonical semantic owner for each rule, status, workflow, operation, and projection.
- Normalize approved HR handoffs once at Payroll ingress; consumers must not reinterpret HR payloads.
- Support effective-dated law and policy changes without editing calculation consumers.
- Match the essential operational capability of Odoo and ERPNext while preserving Afenda's stricter tenancy, audit, and deterministic-replay controls.
- Produce evidence suitable for payroll review, finance reconciliation, employee inquiry, statutory filing, and incident investigation.
- Fail closed when facts, approvals, rule versions, production approval, or reconciliation evidence are missing.

## 4. Non-goals

- Reimplementing HR employee, employment, leave, attendance, or benefit ownership inside Payroll.
- Copying Odoo or ERPNext APIs, database models, terminology, or user interface.
- Encoding statutory rates as timeless constants.
- Allowing customer-authored executable code in calculation rules.
- Direct bank transmission or government filing without an approved provider contract, credential boundary, acknowledgement model, and reconciliation path.
- Supporting jurisdictions other than Malaysia and Vietnam in the launch release.

## 5. Users and jobs

| Persona | Required job |
|---|---|
| Payroll administrator | Configure effective-dated pay groups and rules; prepare, calculate, review, finalize, reverse, and correct runs. |
| Payroll reviewer | Compare source facts, variances, exceptions, and statutory liabilities before approval. |
| Finance operator | Reconcile payroll control totals, accounting postings, funding, and payment outcomes. |
| HR operator | Correct source employment, compensation, leave, attendance, and benefit facts through HR ownership. |
| Employee | Retrieve a protected, understandable wage statement and historical payslips for their own employment. |
| Auditor | Reproduce a result from immutable facts, rules, approvals, and calculation evidence. |
| Implementation partner | Configure reviewed jurisdiction packs without changing program code. |
| Support engineer | Diagnose failures through bounded telemetry without exposing payroll or identity data. |

## 6. Product principles and ownership

| Semantic concept | Canonical owner | Permanent consumer surface |
|---|---|---|
| Employment, compensation, benefits, approved leave/time | `@afenda/human-resources` | Versioned `ApprovedPayrollHandoff` integration contract |
| Handoff validation and Payroll normalization | `@afenda/payroll/src/inputs` | Payroll workforce capability carrying an unknown historical payload; normalized internally |
| Payroll operations and permissions | Payroll operation registry | Root `@afenda/payroll` capabilities only |
| Run/period lifecycle | Payroll runs feature | Root run capabilities and canonical lifecycle events |
| Earning/deduction/statutory policy | Payroll setup/statutory registries | Effective-dated, finalized rule capabilities |
| Money, rounding, snapshots, identities | Payroll shared/runs calculation kernel | Deterministic calculator result |
| Payslip, payment, posting projections | Payroll outputs | Finalization events and protected query capabilities |
| Payment execution | `@afenda/payments` | Event consumer with idempotent acknowledgement |
| General-ledger posting | `@afenda/accounting` | Event consumer with idempotent acknowledgement |
| Cross-module transport | `@afenda/events` | Versioned schemas and outbox delivery |

The application composition root may carry a canonical contract and wire capabilities. It may not map overtime types, decide taxability, compute rates, round amounts, or translate payroll outcomes.

## 7. Functional requirements

Priority meanings: **P0** launch blocking; **P1** required for controlled production scale; **P2** post-launch enrichment that must still have an owned design.

### 7.1 Organization and payroll setup

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-SET-001 | P0 | Configure legal entity, jurisdiction, registration identifiers, default currency, timezone, language, and filing contacts. Secrets are references, never payroll table values. |
| PAY-SET-002 | P0 | Configure effective-dated pay groups, calendars, frequencies, cut-offs, pay dates, assignment eligibility, and off-cycle behavior. Overlaps and gaps fail validation. |
| PAY-SET-003 | P0 | Configure versioned earning, deduction, benefit, employer-cost, and statutory rules with finalized lifecycle and immutable historical versions. |
| PAY-SET-004 | P0 | Every rule declares jurisdiction, effective interval, calculation base, tax/statutory disposition, rounding policy, priority, and production-approval evidence. |
| PAY-SET-005 | P0 | A preview shows affected employees and periods before a setup change is finalized. Existing finalized calculations retain their pinned version. |
| PAY-SET-006 | P1 | Provide controlled templates for common MY and VN pay components without creating a second semantic registry. |

### 7.2 Approved workforce inputs

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-IN-001 | P0 | Ingest the entire approved HR handoff through one Payroll normalization boundary. Invalid, cross-tenant, future-version, unapproved, or internally inconsistent payloads fail closed. |
| PAY-IN-002 | P0 | Preserve compensation components, assignment context, source versions, approval evidence, regular/rest-day/public-holiday/night/unpaid minutes, overtime facts, and paid/unpaid leave facts in the immutable calculation snapshot. |
| PAY-IN-003 | P0 | Retrieve approved work facts by employee and payroll period without requiring the Payroll consumer to discover HR record identifiers. |
| PAY-IN-004 | P0 | Never silently discard a payable or deductible approved fact. A fact lacking an applicable finalized rule produces a blocking, actionable payroll exception. |
| PAY-IN-005 | P0 | Accept idempotent manual or imported variable inputs with source identity, approval, effective date, pinned rule version, and supersession history. |
| PAY-IN-006 | P1 | Support batch import with row-level validation, dry run, atomic acceptance policy, duplicate detection, and downloadable rejection evidence. |

### 7.3 Calculation and run lifecycle

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-CALC-001 | P0 | Support regular, off-cycle, correction, and reversal runs with explicit state transitions and authorization. |
| PAY-CALC-002 | P0 | Calculate deterministic gross, taxable bases, employee deductions, employee statutory amounts, employer contributions, net pay, and employer cost from a canonical snapshot. |
| PAY-CALC-003 | P0 | Pin every source version, rule version, jurisdiction-pack version, calculation version, currency, precision, and rounding decision. Same snapshot produces the same normalized result and hash. |
| PAY-CALC-004 | P0 | Maintain period, month-to-date, year-to-date, and prior-employment balances needed by applicable MY/VN rules. Corrections update balances through explicit reversal/replacement lineage. |
| PAY-CALC-005 | P0 | Calculate overtime, night work, rest-day, public-holiday, paid leave, unpaid leave, proration, joiner, leaver, and unpaid absence effects only from approved facts and finalized policies. |
| PAY-CALC-006 | P0 | Block finalization for missing source approval, missing production-approved calculator, negative/invalid bases, currency mismatch, identity failure, unresolved blocking exception, or stale calculation. |
| PAY-CALC-007 | P1 | Provide employee-level and run-level variance analysis against prior comparable periods with configurable review thresholds. |
| PAY-CALC-008 | P1 | Support controlled retroactive recalculation with impacted-period discovery and explainable deltas. |

### 7.4 Malaysia statutory pack

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-MY-001 | P0 | Effective-dated EPF/KWSP eligibility, wage schedule, employee/employer contributions, age/citizenship/residency categories, rounding, caps, and contribution-period evidence. |
| PAY-MY-002 | P0 | Effective-dated SOCSO/PERKESO employment-injury and invalidity contribution categories, wage ceiling, employee/employer shares, and eligibility. |
| PAY-MY-003 | P0 | Effective-dated EIS contribution calculation, eligibility, wage ceiling, employee/employer shares, and contribution evidence. |
| PAY-MY-004 | P0 | Monthly Tax Deduction / PCB calculation with cumulative remuneration, taxable benefits/perquisites, relief/dependent inputs, zakat, prior-employment TP3 facts, additional CP38 deductions, and adjustment/reconciliation behavior. |
| PAY-MY-005 | P0 | Produce operator-reviewed contribution schedules, PCB remittance evidence, employee annual remuneration statement data, and immutable filing/payment acknowledgements. |
| PAY-MY-006 | P0 | Enforce effective-date transitions, including the October 2025 EPF rules and any later gazetted changes, through reviewed rule-pack versions rather than code edits. |
| PAY-MY-007 | P1 | Support employer-specific voluntary excess contributions and approved statutory exceptions without overriding the canonical mandatory policy. |

Malaysia evidence baseline:

- [KWSP mandatory contribution](https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution) documents schedule-based contribution responsibilities and rules effective from October 2025.
- [KWSP non-Malaysian employees](https://www.kwsp.gov.my/en/employer/responsibilities/non-malaysian-citizen-employees) documents the October 2025 category changes.
- [PERKESO contribution rates](https://www.perkeso.gov.my/en/rate-of-contribution.html) and [contribution categories](https://www.perkeso.gov.my/en/uncategorised/778-contributions.html) are the authoritative operational baseline for SOCSO/EIS configuration.
- [HASiL e-services](https://www.hasil.gov.my/en/e-services/) and [PCB payment](https://www.hasil.gov.my/majikan/pembayaran-pcb/) establish employer calculation, submission, payment, and verification workflows.
- [Form TP3 (2026)](https://www.hasil.gov.my/media/aeacr5pp/bi-tp3-form-2026.pdf) establishes prior-employment cumulative inputs relevant to monthly withholding.

### 7.5 Vietnam statutory pack

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-VN-001 | P0 | Effective-dated mandatory social-insurance eligibility, salary base, minimum/maximum base, employee/employer shares, participant category, and contribution evidence. |
| PAY-VN-002 | P0 | Effective-dated health-insurance and unemployment-insurance eligibility, bases, ceilings, shares, exceptions, and contribution evidence. |
| PAY-VN-003 | P0 | Personal income tax supports resident/non-resident classification, taxable/exempt income, mandatory-insurance deductions, family/dependent deductions, progressive/full-rate methods, withholding, finalization, and effective-law transitions. |
| PAY-VN-004 | P0 | The calculation engine supports the Personal Income Tax Law 109/2025/QH15 effective 1 July 2026 while retaining replay of periods under predecessor rules. |
| PAY-VN-005 | P0 | Wage statements disclose wage, overtime, night work, deductions, and reasons; payments support lawful VND and foreign-worker currency behavior and preserve bank/cash evidence. |
| PAY-VN-006 | P0 | Overtime, night work, rest day, and public holiday calculations use effective-dated Labour Code policy and approved minute facts, with no multiplier embedded in the application adapter. |
| PAY-VN-007 | P0 | Produce reviewed monthly/quarterly and annual tax/social-insurance datasets, submission artifacts, acknowledgements, and amendment lineage required for the employer's filing profile. |
| PAY-VN-008 | P1 | Model regional minimum-wage validation and employment-category exceptions as effective-dated compliance policies. |

Vietnam evidence baseline:

- [Social Insurance Law 41/2024/QH15](https://vanban.chinhphu.vn/?classid=1&docid=211199&orggroupid=1&pageid=27160) and [Decree 158/2025/ND-CP](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-158-2025-nd-cp-quy-dinh-ve-bao-hiem-xa-hoi-bat-buoc-119250629171336803.htm) are the current mandatory-social-insurance baseline from 1 July 2025.
- [Labour Code 45/2019/QH14](https://vbpl.moj.gov.vn/bolaodong/Pages/vbpqen-toanvan.aspx?ItemID=11135) establishes wage payment, wage-statement, overtime, night-work, deduction, and currency requirements.
- [Personal Income Tax Law 109/2025/QH15](https://chinhphu.vn/?classid=1&docid=216495&pageid=27160&typegroupid=3) took effect on 1 July 2026. Rule packs must select law by payroll period and preserve predecessor calculations.
- [Official 2025 PIT finalization guidance](https://xaydungchinhsach.chinhphu.vn/huong-dan-quyet-toan-thue-thu-nhap-ca-nhan-doi-voi-thu-nhap-tu-tien-luong-tien-cong-119260306092819051.htm) supplies operational evidence for predecessor-period reconciliation.

### 7.6 Outputs, payslips, payment, and accounting

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-OUT-001 | P0 | Generate an immutable payslip projection containing earning/deduction/statutory/employer lines, period and payment dates, YTD balances, source/rule explanations, and correction lineage. |
| PAY-OUT-002 | P0 | Render protected PDF and accessible web payslips; employee access is self-scoped, audited, revocable, and excludes other employees by construction. |
| PAY-OUT-003 | P0 | Emit idempotent payment instructions only after finalization. Payment consumers return accepted/rejected/settled/reversed evidence; Payroll never calls a peer ERP store. |
| PAY-OUT-004 | P0 | Emit balanced accounting posting instructions with legal entity, cost center, department, account, liability, expense, and clearing dimensions. Accounting returns posting/reversal evidence. |
| PAY-OUT-005 | P0 | Finalized outputs are immutable. Corrections use explicit reversal and replacement, never in-place mutation. |
| PAY-OUT-006 | P1 | Support controlled bank/provider files and statutory files through versioned adapters with checksums, encryption, acknowledgement, and rejection reconciliation. |

### 7.7 Reporting and operational controls

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| PAY-RPT-001 | P0 | Payroll register by run, employee, legal entity, pay group, component, cost center, and jurisdiction, with totals tied to finalized output. |
| PAY-RPT-002 | P0 | Statutory liability, payment, filing, amendment, and outstanding-reconciliation reports for Malaysia and Vietnam. |
| PAY-RPT-003 | P0 | Exception and readiness dashboard showing blocked employees, missing facts, unapproved rules, stale calculations, unacknowledged payments/postings, and filing deadlines. |
| PAY-RPT-004 | P0 | Reconciliation proves employee net totals, payment totals, statutory liabilities, employer costs, and balanced accounting postings. |
| PAY-RPT-005 | P1 | Trend and variance reporting comparable to Odoo payroll analysis and ERPNext payroll reports, without maintaining a separate reporting definition of payroll meaning. |
| PAY-RPT-006 | P1 | Export permission-scoped CSV/XLSX/PDF with redaction, watermarking where appropriate, bounded retention, and audit evidence. |

## 8. Odoo and ERPNext benchmark

Compatibility means comparable business capability and migration mapping, not API or schema imitation.

| Capability | Odoo / ERPNext benchmark | Afenda launch requirement |
|---|---|---|
| Salary structures and components | Rules/structures/components with effective assignment | Versioned setup rules and employee assignments, finalized before use |
| Work entries / timesheets / leave | Work facts feed payroll | Approved HR handoff normalized once; no silent work-fact loss |
| Batch payroll | Payslip batches / payroll entries | Pay group + period + run lifecycle with selective recalculation |
| Payslips | Itemized employee statement | Protected web/PDF statement with statutory and YTD evidence |
| Accounting | Salary posting/journal integration | Event-driven, balanced, idempotent posting acknowledgement |
| Payment | Bank/payment workflows | Finalized payment instructions and settlement reconciliation |
| Localization | Jurisdiction-specific payroll rules | Production-approved MY and VN effective-dated packs |
| Reporting | Payroll analysis, registers, salary reports | Registry-derived operational, statutory, variance, and reconciliation reports |
| Adjustments | Additional salary / inputs | Approved, idempotent, source-linked variable inputs and retro corrections |

Benchmark sources: [Odoo work entries](https://www.odoo.com/documentation/18.0/applications/hr/payroll/work_entries.html), [Odoo payslips](https://www.odoo.com/documentation/18.0/applications/hr/payroll/payslips.html), [Odoo reporting](https://www.odoo.com/documentation/17.0/applications/hr/payroll/reporting.html), [Odoo payroll localizations](https://www.odoo.com/documentation/18.0/applications/hr/payroll/payroll_localizations.html), [Frappe salary structures](https://docs.frappe.io/hr/salary-structure), [Frappe salary slips](https://docs.frappe.io/hr/salary-slip), [Frappe payroll setup](https://docs.frappe.io/hr/payroll-setup), and [Frappe HR reports](https://docs.frappe.io/hr/human-resources-reports).

## 9. Information and interface requirements

### 9.1 Canonical calculation snapshot

For each employee, the snapshot shall contain:

- tenant, employee, employment, assignment, legal entity, location, and pay-group identity;
- period, pay date, run type, and calculation sequence;
- approved compensation and benefit components with source versions;
- approved time, overtime, night/rest/public-holiday, paid/unpaid leave, and absence facts;
- accepted variable inputs and supersession lineage;
- pinned earning, deduction, statutory, rounding, currency, and jurisdiction-pack versions;
- period/MTD/YTD/prior-employment balances used by the calculation;
- approval evidence and a canonical snapshot hash.

The serialized snapshot is internal calculation evidence. It is not a consumer-authored API.

### 9.2 Stable integration contract

The current workforce capability accepts employee, period, effective date, actor, correlation, and tenant context and returns `Result<unknown | null>`. The application adapter carries the HR-produced versioned payload unchanged. Payroll validates the contract, checks tenant/employee/period consistency, and derives calculation projections. HR now resolves employment, assignment, compensation, and employment status as of the requested effective date.

The permanent target is one root Payroll ingress capability that accepts the versioned payload as `unknown`, normalizes current and historical contracts, and seals an immutable accepted record with correction lineage. HR's durable delivery path calls that capability through application composition; runs read the accepted Payroll record rather than pulling HR again. The current calculation-time pull is deleted in the same cutover. Production acceptance also requires recurring allowance/bonus coverage and complete aggregate lineage.

No app or downstream module may switch on overtime type, contribution category, statutory code, or calculation status.

### 9.3 Jurisdiction-pack contract

Each production rule pack shall declare:

- canonical pack ID, jurisdiction, semantic version, legal effective interval, and publication/review evidence;
- supported worker/residency/age/citizenship/employment categories;
- required input facts and validation rules;
- contribution/tax bases, bands/schedules, caps/floors, exemptions, rounding, and allocation;
- forms, returns, payments, due dates, amendment behavior, and projection schemas;
- golden examples, boundary cases, prior-period replay fixtures, and independent approval status.

Only registry entries marked `production_approved` may finalize a run. Approval metadata cannot be asserted by a tenant or request payload.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Tenancy | Every read/write is organization-scoped; cross-tenant IDs fail without disclosure. |
| Authorization | Setup, input, calculation, review, finalization, reversal, reconciliation, filing, export, and payslip-self/all are distinct permissions. |
| Privacy | Payroll data is classified sensitive; logs/telemetry contain no amounts, employee data, tax IDs, bank data, or raw payloads. |
| Determinism | Canonical snapshot + calculator version yields byte-stable normalized output/hash across memory and Drizzle adapters. |
| Precision | Decimal strings and explicit rounding policies; no binary floating-point money. VND zero-decimal presentation and statutory-specific rounding are tested. |
| Reliability | Commands are idempotent; finalization, outbox, audit, posting, and payment persistence are transactionally consistent. |
| Scale | Launch target: 10,000 employees per legal entity, 100,000 per tenant, with bounded batches and restartable orchestration. Exact SLOs require measured performance tests. |
| Observability | Bounded operation name, duration, outcome, canonical error code, and tokenized tenant/actor identifiers. |
| Retention | Configurable lawful retention with legal hold, protected exports, and immutable finalized evidence. |
| Accessibility | Employee/operator web experiences meet WCAG 2.2 AA; payslips have accessible HTML equivalents. |
| Localization | English plus Bahasa Malaysia and Vietnamese labels/templates; statutory meaning derives from canonical codes, not translated text. |

## 11. Security and abuse cases

- Reject actor-supplied organization or employee ownership that conflicts with the authenticated session.
- Reject replay with a changed payload under the same idempotency key.
- Reject unsigned/unapproved provider acknowledgements and duplicate settlement/posting callbacks.
- Prevent spreadsheet-formula injection and sensitive-column leakage in exports.
- Prevent path traversal, active content, and unbounded rendering in payslip artifacts.
- Prevent rule packs from executing tenant-supplied code or overriding canonical production approval.
- Rate-limit sensitive employee/payslip reads and record access facts without logging payloads.
- Require dual control for finalization, payment release, statutory filing, and high-risk setup changes where organizational policy enables it.

## 12. Codebase baseline and development roadmap

### 12.1 Evidence and status vocabulary

This baseline was composed from the living package, its tests, the application composition adapters, and the HR payroll-handoff feature on 2026-08-02. Status means:

- **Implemented:** a root capability and executable contract evidence exist on disk.
- **Partial:** a foundation exists, but the PRD outcome is not complete or production-approved.
- **Not evidenced:** the required product capability is not represented by an executable production path and acceptance evidence.

Passing package gates proves the implemented contracts; it does not upgrade a partial capability to statutory or product readiness.

At this baseline, Payroll lint and typecheck pass; its Vitest project reports 25 passing test files and 180 passing tests with 8 skipped.

| Feature farm | Status | Living evidence | Product gap |
|---|---|---|---|
| Setup | Partial — strong foundation | Calendars, pay groups, effective-dated earning/deduction/statutory rules, version locks, memory/Drizzle parity | Jurisdiction pack publication, review evidence, activation intervals, and operational configuration journeys |
| Assignments | Partial | Employee payroll assignment and recurring earning/deduction creation | Effective-dated change/correction lifecycle, bulk assignment operations, allowance/bonus agreement mapping, and operator review projections |
| Inputs | Partial | Idempotent variable inputs; strict `v1` HR handoff parsing and Payroll-owned normalization | Historical-version/alias ledger, allowance/bonus ingress, unmatched payable-fact blocking, retro and opening-balance inputs |
| Runs | Partial — strong foundation | Period/run lifecycle, deterministic snapshots, calculate/finalize/reverse, exceptions, transaction and replay contracts | Cumulative balances, selective recalculation, retro/off-cycle orchestration, variance approval, and production jurisdiction calculators |
| Statutory | Not production-ready | Calculator registry and fail-closed production approval; `synth.v1` test calculator | Reviewed MY and VN calculators, transition fixtures, liabilities, submissions, amendments, and filing evidence |
| Outputs | Partial | Deterministic finalized payslip view, self/all authorization, payment/posting request events | Rendered multilingual artifacts, protected delivery, registers/variance reports, payment files, posting profiles, and acknowledgements |
| Reconciliation | Partial | Versioned record/resolve/list workflow and finalized-total derivation | Downstream payment/accounting state ingestion, tolerance governance, partial/rejected outcomes, and period-close control dashboards |
| Application integration | Partial | Root-only Payroll composition; app adapter calls HR root handoff and passes the payload unchanged | Payments and Accounting consumers are described but no executable consumer was found; filing/provider composition is absent |
| HR delivery integration | Disconnected | HR has a durable delivery/retry/feedback workflow; Payroll calculates through a separate on-demand workforce port | One root Payroll ingress capability, accepted-handoff ledger and acknowledgement path; deletion of the competing pull after cutover |

### 12.2 Target feature-first package tree

Payroll shall use the uniform ERP feature-first topology proven by Human Resources: one root facade, a package-wide semantic kernel, isolated aggregate composition, business-owned feature capsules, and test-only construction. Payroll feature names derive from Payroll vocabulary; the root topology and dependency direction do not vary by ERP package.

```text
packages/erp/payroll/
├── package.json                         # exports only "."
├── README.md
├── PRODUCTION_READINESS.md
├── __tests__/                           # public, architecture, parity, and product contracts
└── src/
    ├── index.ts                         # permanent @afenda/payroll facade export
    ├── facade/                          # representation-safe commands, queries, contracts
    ├── kernel/                          # package-wide semantic composition and primitives
    │   ├── operations/                  # canonical operation registry and projections
    │   ├── identity/                    # branded identities
    │   ├── money/                       # decimal and rounding invariants
    │   ├── temporal/                    # effective-date primitives
    │   ├── execution/                   # authorization and execution policy
    │   ├── emissions/                   # events and mutation inventory
    │   └── serialization/               # snapshots and wire/version policy
    ├── composition/                     # production/test construction only
    │   ├── production.ts
    │   ├── store/                       # aggregate construction
    │   └── adapters/                    # technology-specific aggregate wiring
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

The tree is a target ownership map, not permission to create empty feature folders. Each implemented feature uses a uniform capsule containing only justified definitions, contracts, schemas, policies, use cases, narrow store contracts, ports, and colocated adapters. Do not add package-wide `schemas/`, `stores/`, `adapters/`, `services/`, `shared/`, `types.ts`, or `ports.ts`. A current `shared/` mechanism moves to the feature that owns its decision or to a specifically named kernel primitive only when it is genuinely package-wide.

Dependency direction is:

```text
consumer -> index -> facade -> composition -> feature adapters
                              |              |
                              +-> kernel <---+
feature -> own contract/store + narrow ports + approved kernel primitives
```

Feature code must not import `facade`, `composition`, `testing`, the aggregate `PayrollStore`, another feature's adapter, or a peer ERP package. A cross-feature operation depends on the smallest named capability it requires. Only composition constructs aggregate adapters. Cross-feature business decisions remain in their semantic owner and are requested through a typed capability; imports are not permission to reinterpret another feature's state.

### 12.3 Semantic cutover contract

| Concern | Canonical owner | Derived or permanent surface | Enforcement |
|---|---|---|---|
| Operations and authorization | Feature definitions composed by `kernel/operations` | module IDs, manifest authorization, root capabilities | Registry uniqueness/reference/parity tests; no parallel command catalog |
| HR transport compatibility | `features/workforce-ingress` version registry | parser, normalizer, canonical serializer | Historical payload fixtures; aliases accepted only at ingress |
| Workforce meaning | HR handoff contract; Payroll `workforce-ingress` normalization | Immutable accepted facts and calculation snapshot | No app-side or run-side raw HR switches |
| Run lifecycle | `features/payroll-runs` transition policy | commands, events, diagnostics | Exhaustive transition and reversal tests |
| Statutory activation | Jurisdiction feature definitions composed by the kernel | calculator resolution, filing projections, readiness evidence | Unknown/unapproved versions fail closed |
| Money and rounding | `kernel/money` | calculation and output projections | Golden, boundary, and adapter-parity tests |
| Persistence | Feature-owned store contracts | `composition/store` aggregate | No feature dependency on `PayrollStore`; adapter parity |
| Consumers | Root `@afenda/payroll` facade | stable `Result` capabilities | Package export and repository deep-import bans |

The structural cutover has an expected external consumer blast radius of zero: package exports and capability signatures remain stable. Any external edit requires a deliberate business-contract change, not a file move. The cutover deletes the shallow business farms, `shared/`, catch-all type/port locations, broad feature dependencies on `PayrollStore`, and superseded files in the same change; it must not leave forwarding files or a second API.

### 12.4 Ordered development roadmap

Each slice is independently production-quality, deletes replaced surfaces in the same cutover, and may start only after its stated predecessor evidence is green.

| Slice | Outcome and principal work | Depends on | Acceptance evidence |
|---|---|---|---|
| **R0 — Uniform feature-first cutover** | Freeze the root facade; inventory consumers; generate a collision-checked move manifest; move facade, kernel, composition, feature, and testing concerns to their canonical owners; replace aggregate-store dependencies with narrow capabilities; delete shallow farms, `shared/`, catch-all type/port paths, and superseded aliases; add recursive boundary checks. | Current package baseline | Export/signature snapshot unchanged; zero production-consumer edits; only justified root surfaces; no feature import of `PayrollStore`, another feature adapter, facade, composition, or testing; memory/Drizzle parity and all package/application boundary gates pass. |
| **R1 — Canonical workforce ingress** | Preserve unchanged payload transport and implemented as-of/status behavior; expose one root Payroll ingest capability; persist immutable accepted handoffs and correction lineage; route HR durable delivery to it; make runs read accepted facts; delete the calculation-time pull; extend the HR-owned contract for reviewed allowances/bonuses and aggregate source versions; add Payroll's historical-version registry; block unpriced payable/deductible facts. | R0 | Current/historical/invalid/future contract fixtures; as-of transitions; tenant/employee/period mismatch; conflicting replay; approval and correction lineage; delivery retry/acknowledgement; allowance/bonus and unmatched-fact tests; deterministic replay; no second workforce-ingress path. |
| **R2 — Balance and operational reporting kernel** | Add immutable opening, prior-employment, period, MTD and YTD balances; selective recalculation and retro lineage; derive payroll register, variance, liability, exception, and close-control projections from canonical results. | R1 | Balance roll-forward/property tests; retro and off-cycle golden cases; report-to-result control totals; unchanged finalized evidence; bounded 10,000-employee batch and restart evidence. |
| **R3 — Malaysia production pack** | Register effective-dated, reviewed EPF, SOCSO, EIS, PCB/CP38 policies; calculate employee/employer liabilities; produce filing/payment datasets and correction semantics. | R2 | Authoritative-source ledger; qualified approval; boundary/transition/golden fixtures; independent parallel-payroll reconciliation; only `production_approved` version can finalize. |
| **R4 — Vietnam production pack** | Register effective-dated, reviewed SI/HI/UI and PIT policies plus reviewed work-premium/deduction rules; produce filing/payment datasets and correction semantics. | R2 | Same evidence class as R3, including VND rounding and law-transition fixtures; independent parallel-payroll reconciliation. |
| **R5 — Protected outputs and employee access** | Generate versioned accessible HTML/PDF payslips, localized labels/templates, registers and protected exports; add artifact retention, access audit, replacement lineage, and safe rendering. | R2 and at least one approved jurisdiction pack | Self/all authorization, tenant isolation, artifact hash/replay, translation-code parity, active-content/formula-injection, retention/legal-hold, and correction-display tests. |
| **R6 — Payment, accounting, and reconciliation closure** | Implement app-saga consumers in Payments and Accounting; map finalized canonical projections to idempotent instructions/postings; ingest acknowledgements and partial/rejected outcomes; reconcile employee, liability, funding, settlement, and ledger totals. | R5 | Event-schema contracts; duplicate/reordered delivery; balanced posting; partial payment; provider rejection; reversal/correction; zero unexplained control variance. |
| **R7 — Filing operations and launch assurance** | Add approved provider/file adapters, acknowledgement/amendment workflows, filing calendar/deadline controls, operational dashboards, recovery procedures, security assessment, performance evidence, and runbooks. | R3 or R4 plus R6 | Filing round-trip and amendment drills; credential/tenant isolation; provider outage recovery; disaster recovery; measured SLOs; two reconciled parallel cycles per launch jurisdiction. |

R3 and R4 may execute in parallel after R2, but neither may borrow the other's statutory semantics. R5 may use the first approved pack while the second pack proceeds; legal-entity activation remains impossible until that entity's own jurisdiction pack and all launch gates pass.

### 12.5 Launch gates

- Package lint, typecheck, unit, contract, property, adapter-parity, integration, and security tests pass.
- Same snapshot produces the same result after process restart and across storage adapters.
- MY and VN packs have current authoritative-source ledgers and signed qualified-review evidence.
- At least two full parallel payroll cycles per jurisdiction reconcile employee, payment, statutory, and accounting totals with zero unexplained variance.
- Reversal, correction, provider rejection, partial payment, filing amendment, and disaster-recovery exercises pass.
- No synthetic calculator, raw HR interpretation, unacknowledged output, unresolved blocking exception, TODO, shim, or parallel API remains in a production path.

## 13. Rollout and rollback

- Enable by legal entity and jurisdiction pack, never globally by code deployment alone.
- Import opening YTD/prior-employment balances with maker-checker evidence and reconcile to the legacy payroll.
- Run parallel calculations without payment/posting authority until variance and legal-review gates pass.
- Activation selects an immutable production-approved pack version for a defined effective interval.
- Rollback disables new run creation/finalization for the affected legal entity and returns operations to the last approved system. Finalized Afenda evidence is never deleted or rewritten.
- A defective rule pack is superseded with corrected effective dating; impacted runs are reversed/replaced through explicit lineage.

## 14. Risks and controls

| Risk | Control |
|---|---|
| Law changes after implementation | Effective-dated registry, authoritative-source watch, qualified review, transition fixtures. |
| Silent source-fact loss | Carry full handoff, normalize once, snapshot all facts, block unmatched payable/deductible facts. |
| Incorrect retro/YTD calculation | Immutable balances, reversal/replacement lineage, golden transition cases. |
| Duplicate payment/posting | Idempotent instructions and acknowledgements, reconciliation state machine. |
| Payroll-data exposure | Narrow permissions, self-scope, encryption, bounded telemetry, export controls. |
| Vendor/government outage | Durable outbox, retry policy, acknowledgement ledger, operator-visible backlog. |
| Benchmark-driven overbuilding | Capability mapping and P0 launch gates; no copied APIs or speculative abstraction. |

## 15. Decisions and open questions

### Decisions

- Malaysia and Vietnam are the only launch jurisdictions.
- Monthly payroll is the launch-default frequency; other frequencies remain supported where configured and legally reviewed.
- HR remains source of approved workforce facts; Payroll owns all payroll interpretation.
- Payroll uses the uniform ERP `facade/kernel/composition/features/testing` topology; package-specific skills may refine feature vocabulary but may not define a competing root layout.
- Production statutory logic is data-driven, effective-dated, versioned, independently reviewed, and fail-closed.
- The first implementation slice is workforce semantic completion because incorrect effective-date, status, agreement, or lineage facts invalidate every later jurisdiction calculation even when transport and snapshot tests pass.

### Open questions requiring named product or domain ownership

- Which legal entities, worker categories, and employee volumes constitute the first MY and VN pilots?
- Which filing/payment channels are required at launch: direct API, approved file upload, or both?
- Which banks/payment providers and accounting chart/dimension contracts are in scope?
- Is dual authorization mandatory for every tenant or configurable by organization policy?
- What statutory artifact retention and data-residency commitments apply to the target customers?
- Which qualified MY and VN payroll reviewers will own pack approval and change monitoring?

## 16. Definition of product-ready

Payroll is product-ready for a legal entity only when a real approved MY or VN rule pack—not the synthetic calculator—can reproduce reviewed source facts into reconciled payslips, liabilities, payments, postings, and filing evidence; the result can be explained and replayed; failures are recoverable; and qualified reviewers have approved the jurisdiction version and effective interval.
