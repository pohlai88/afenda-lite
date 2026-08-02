# Human Resources Product Requirements

| Field | Value |
|---|---|
| Status | Approved Scratch product requirements; launch profile and release evidence remain open |
| Document type | Product requirements document (PRD) |
| Product | Afenda-Lite Human Resources |
| Benchmark | Odoo 19 Human Resources and Frappe HR / ERPNext |
| Date | 2026-08-02 |
| Audience | Product owners, HR operations, engineering, security, privacy, payroll, finance, and implementation partners |
| Engineering authority | `AGENTS.md`, `packages/erp/human-resources`, `packages/erp/payroll`, and the applicable package farms |
| Planning disposition | Product vision, domain ownership, HR–Payroll boundary, feature-first direction, and immediate delivery sequence approved; structural cutover and launch authorization remain gated |
| Verification basis | HR-0.1–HR-0.6 dirty-working-tree evidence on 2026-08-02; HR package digest `0c93d8d5e8e1ffbfcc9bde5acbb3acb55417ec3cd40596e5511675c98cd63cbf`; the [same-revision baseline](baseline-verification.md) is recorded but blocked; not commit, merge, deployment, or release evidence |

> This is a Scratch product specification. It records intended capability and implementation sequencing, but it is not a controlled Living document, legal advice, statutory approval, security certification, or release authorization.

## 1. Product outcome

Afenda Human Resources shall be the canonical workforce system of record for the employment lifecycle: workforce identity, organization assignment, recruitment, hire conversion, employment changes, leave, approved work time, compensation agreements, benefits, performance, learning, talent, compliance, employee relations, planning, privacy, and approved downstream facts.

The product succeeds when an authorized user can explain every workforce decision through effective-dated source facts, policy versions, approvals, actor and tenant evidence, while Payroll and other consumers receive stable capabilities without learning HR storage or workflow internals.

Compatibility with Odoo and Frappe HR / ERPNext means comparable business outcomes and a practical migration map. It does not mean copying their APIs, database models, UI, workflows, or placing Payroll, Expenses, Fleet, Documents, Accounting, or Payments inside HR.

## 2. Problem

The current package has broad locally implemented coverage across 20 feature capsules, a canonical operation/permission/emission kernel, effective-dated records, privacy controls, Memory/Drizzle adapters, and an approved payroll handoff. It is not yet an enterprise product release because:

- the package manifest remains `scaffolded`, and local green tests are not lifecycle or production approval;
- the working tree has moved retired layer-first roots into `facade`, `kernel`, `composition`, `features`, and `testing`, but the proposed final shallow cutover remains incomplete because some feature adapters still know the composite `HumanResourcesStore` or reach upward into composition;
- several benchmark user journeys are incomplete: external candidate experience, interview self-scheduling, referrals, physical attendance channels, leave mandatory-day/encashment flows, continuous feedback/recognition, equipment linkage, and mobile-first operations;
- employee expenses, advances, fleet, document signing, payment, accounting, and payroll calculation need explicit neighboring owners rather than expansion of the HR package;
- operational scale, live-database parity, recovery drills, privacy review, and external/legal validation remain required evidence.
- the recorded repository-integration failures have been repaired, focused Memory/Drizzle reporting parity passes, the retained deterministic Neon validator now passes 15/15 checks, and read-only aggregate probes find no existing-data conflicts with the four data-sensitive pending migrations; complete fail-closed live parity remains blocked because the database ledger still has 12 pending governed migrations and the first live cohort reproduced schema drift.

## 3. Goals

- Provide production-quality hire-to-retire workforce management for multi-organization ERP tenants.
- Establish one canonical semantic owner for every HR status, workflow, policy, operation, permission, event, and projection.
- Preserve one root `@afenda/human-resources` business facade and isolate the test-only entrypoint.
- Make internal schema, adapter, persistence, and feature refactors invisible to production consumers.
- Integrate with Payroll through one versioned approved-facts contract without peer ERP imports or duplicated payroll interpretation.
- Reach business-capability parity with the relevant Odoo and Frappe HR / ERPNext workflows while retaining Afenda tenancy, privacy, audit, deterministic replay, and failure-closed controls.
- Support effective-dated policy and workforce changes without rewriting historical facts.
- Make employee, manager, HR operator, payroll, auditor, and integration journeys observable and recoverable.

## 4. Non-goals

- Gross-to-net calculation, statutory tax/contribution logic, payroll runs, payslips, or payroll reconciliation.
- Employee-expense accounting, reimbursement execution, payment entries, journals, or bank transmission.
- Fleet, equipment inventory, document bytes, e-signature, email/SMS delivery, identity-provider, or calendar-provider ownership.
- A generic workflow engine, rules scripting language, `@afenda/shared` package, or runtime registry package.
- Direct package imports between `@afenda/human-resources` and `@afenda/payroll`.
- Odoo or ERPNext API/schema compatibility, parallel v1/v2 facades, or maintained migration shims.
- Claiming production readiness from package-local compilation and tests.

## 5. Users and jobs

| Persona | Required job |
|---|---|
| Employee | Maintain permitted personal data; request leave, time corrections, learning, and career actions; view own status and approvals. |
| Manager | Manage team assignments, attendance exceptions, leave, goals, feedback, development, and staffing within authorized scope. |
| Recruiter | Plan requisitions, publish openings, manage candidates, interviews, offers, consent, and hiring conversion. |
| HR operator | Maintain effective-dated workforce, organization, policy, compensation, benefits, lifecycle, compliance, and cases. |
| HR leader | Review workforce plans, succession, mobility, skills, diversity, risk, and capacity without bypassing privacy policy. |
| Payroll operator | Receive approved, versioned HR facts; never repair or reinterpret HR source records in Payroll. |
| Auditor/privacy officer | Reconstruct decisions, access, changes, retention, deletion, corrections, and downstream delivery. |
| Implementation partner | Configure policies and integrations through governed capabilities, not source edits or direct table writes. |

## 6. Semantic ownership and integration boundaries

| Concept | Canonical owner | Permanent consumer boundary |
|---|---|---|
| Person, worker, employee, employment, contract, assignment | HR `workforce-records` | Root HR commands and effective-dated queries |
| Department, job, position, reporting line | HR `organization` | Root HR organization capabilities |
| Requisition through accepted offer | HR `recruitment` | Root recruitment capabilities |
| Accepted-offer conversion | HR `hire-to-employee` | Idempotent hire capability |
| Onboarding, transfer, probation, termination, offboarding | HR `employment-lifecycle` | Root lifecycle capabilities |
| Leave policy, entitlement, request, approval, approved leave fact | HR `leave` | Root leave capabilities and approved handoff projection |
| Calendar, shift, attendance, timesheet, overtime approval | HR `time` | Root time capabilities and approved handoff projection |
| Compensation agreement, allowance entitlement, benefit terms | HR `compensation-benefits` | Root HR capabilities and approved compensation facts |
| Gross-to-net, statutory deductions, payroll outputs | `@afenda/payroll` | Root Payroll facade only |
| HR→Payroll wire shape | `@afenda/events/schemas` transport schema | `ApprovedPayrollHandoff`; HR emits current canonical form, Payroll validates/normalizes ingress |
| Cross-package HR→Payroll orchestration | `apps/web` composition root | Adapter calls both package roots and carries the sealed payload unchanged |
| Expense claim and employee advance | Future approved Expenses/Finance owner | HR supplies worker/manager eligibility through a narrow app-wired query port |
| Payment and reimbursement execution | `@afenda/payments` | Versioned events and acknowledgements |
| Accounting posting | `@afenda/accounting` | Versioned events and acknowledgements |
| Equipment/fleet asset truth | Approved asset/fleet owner | HR carries assignment references only |
| Document bytes and signatures | Approved document/sign owner | HR stores immutable `vault://` references and verification evidence only |

### 6.1 HR-to-Payroll contract

The existing integration baseline is the required permanent shape:

1. HR assembles `hr.payroll-handoff.v1` from approved compensation, assignment, leave, time, overtime, source versions, and approval evidence.
2. `apps/web/lib/erp/payroll-workforce-port.ts` calls the HR root facade and carries the returned payload without switching on component, leave, time, or overtime semantics.
3. Payroll accepts the value as an external boundary payload, validates it from `unknown`, normalizes it once, verifies tenant/employee/effective-period consistency, and snapshots every approved fact used by calculation.
4. Payroll owns pay-group assignment, earning/deduction/statutory rules, calculation, rounding, exceptions, results, payslips, payment/posting instructions, and reconciliation.
5. HR and Payroll never import one another; application composition is the only direct caller of both packages.

Historical contract values may be accepted only in a Payroll-owned ingress alias/version ledger. HR emits only the current canonical contract. No application or downstream consumer may interpret overtime types, contribution categories, taxability, payroll status, or monetary rounding.

The contract has three distinct completion classes:

| Classification | Verified position |
|---|---|
| **Implemented baseline** | HR selects compensation and benefit enrollment as of the requested effective date, emits the effective HR employment status, and assembles approved leave/time/overtime facts server-side. The application carries the payload without business interpretation. Payroll validates from `unknown`, checks tenant/employee/effective-period and timesheet lineage, snapshots accepted facts, and fails closed for represented approved overtime, unpaid time, and employee/employer benefit components that lack finalized Payroll rules. |
| **Incomplete semantic coverage** | Effective-dated recurring allowance agreements and bonus eligibility/agreement facts are not represented as first-class handoff facts. Aggregate lineage is not yet complete for employment, assignment, compensation, benefits, allowances and bonuses. Payroll has no explicit historical-contract/version ingress ledger. New approved payable or deductible fact kinds must extend the existing fail-closed pricing invariant rather than bypass it. |
| **Release evidence outstanding** | Same-revision live Memory/Drizzle parity, transactional fault injection, operational recovery, scale evidence, migration rehearsal and independent security/privacy/payroll assurance remain required. |

Delivery actions accept only employee/period intent and assemble approved facts server-side; callers cannot author a trusted handoff payload. Completing semantic coverage must not redesign the current transport into a parallel API or introduce a second maintained handoff facade.

## 7. Functional requirements

Priority: **P0** permanent product/release invariant; **P1** required for controlled enterprise scale; **P2** competitive enrichment with an owned design. The approved launch profile separately classifies each P1/P2 capability as launch-required or assigned to a named subsequent release cohort. That classification changes sequencing, not ownership, quality, or the requirement for a complete implementation before its phase closes.

### 7.1 Workforce records and organization

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-WRK-001 | P0 | Model Person → Worker → optional Employee specialization without deleting the person when participation ends. Worker type and status are explicit and transition-validated. |
| HR-WRK-002 | P0 | Employment, contract, assignment, manager, department, job, position, legal entity, location, grade, and calendar changes are effective-dated and preserve supersession lineage. |
| HR-WRK-003 | P0 | Every read, write, unique key, relation traversal, and history query proves `organizationId`; cross-tenant identifiers fail without disclosure. |
| HR-WRK-004 | P0 | Employee numbers and business identifiers are unique in their declared scope and allocated concurrency-safely. |
| HR-WRK-005 | P0 | Sensitive identity, demographic, contact, emergency, bank-reference, statutory-reference, and work-eligibility fields have purpose, access, masking, retention, and audit dispositions. |
| HR-WRK-006 | P1 | Support contingent workers, interns, multiple concurrent employments, rehiring, international assignments, and matrix reporting without creating shadow person records. |
| HR-ORG-001 | P0 | Maintain effective-dated department, job, position, reporting-line, vacancy, and organizational hierarchy records with cycle prevention. |
| HR-ORG-002 | P0 | Position occupancy and headcount availability reconcile against approved workforce plans and active assignments. |
| HR-ORG-003 | P1 | Provide historical and as-of organization charts, vacancy analysis, span-of-control, and manager-scope projections derived from canonical records. |

### 7.2 Workforce planning and recruitment

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-PLAN-001 | P0 | Create versioned headcount plans by legal entity, organization unit, job/position, period, quantity, budget reference, and approval state. |
| HR-PLAN-002 | P0 | Requisitions reserve approved headcount atomically; offer approval and hire conversion cannot exceed the reservation without an authorized exception. |
| HR-REC-001 | P0 | Manage requisition, opening, candidate, application, stage, interview, structured feedback, offer, consent, duplicate detection, and disposition as one auditable pipeline. |
| HR-REC-002 | P0 | Candidate privacy supports purpose-specific consent, retention, access, correction, export, erasure evaluation, and legal-hold exceptions. |
| HR-REC-003 | P0 | Accepted offers convert idempotently into canonical workforce records; compensation proposals remain proposals until HR approval and never become Payroll rules. |
| HR-REC-004 | P1 | Publish permissioned job openings to a career surface, accept accessible applications, and provide candidate status/withdrawal without exposing internal notes. |
| HR-REC-005 | P1 | Support interviewer and candidate self-scheduling through an injected calendar capability with timezone, availability, reschedule, cancellation, reminder, and no-show evidence. |
| HR-REC-006 | P1 | Support employee referrals, duplicate/referral attribution, reward eligibility facts, and source/time-to-fill/conversion analytics. Reward payment remains outside HR. |
| HR-REC-007 | P1 | Provide structured interview kits, scorecards, bias-aware access separation, mandatory feedback, conflict-of-interest declarations, and decision evidence. |

### 7.3 Hire-to-retire lifecycle

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-LIFE-001 | P0 | Configure effective onboarding/offboarding templates with required activities, owner role, due offset, dependency, evidence, and completion policy. |
| HR-LIFE-002 | P0 | Track onboarding, probation, confirmation, transfer, promotion, contract renewal, suspension, termination, resignation, retirement, and rehire with explicit transitions. |
| HR-LIFE-003 | P0 | Termination/offboarding coordinates access-revocation, clearance, asset-reference return, final approved Payroll facts, document retention, and downstream acknowledgements without direct peer writes. |
| HR-LIFE-004 | P0 | Final actions require reason, actor, effective date, approvals, idempotency, and audit/outbox facts in the same durable boundary where policy marks them required. |
| HR-LIFE-005 | P1 | Provide lifecycle checklists and exception dashboards for employees, managers, HR, IT, facilities, and payroll while each owner completes only its assigned capability. |

### 7.4 Leave, schedules, attendance, and time

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-LEV-001 | P0 | Configure effective-dated leave types, eligibility, allocation, accrual, carryover, caps, negative balance, expiry, documents, approval, and payroll disposition. |
| HR-LEV-002 | P0 | Requests support days/hours, partial days, segments, holidays, work calendars, overlap prevention, delegation, cancellation, return-to-work, and recalculation. |
| HR-LEV-003 | P0 | Approved balances derive from one entitlement/transaction model and reconcile under backdated policy or employment changes. |
| HR-LEV-004 | P1 | Mandatory working days block incompatible leave by organization unit and effective date, with authorized exception evidence. |
| HR-LEV-005 | P1 | Leave encashment produces an approved entitlement/quantity fact for Payroll; HR never calculates taxable pay, net pay, or disbursement. |
| HR-TIME-001 | P0 | Configure effective-dated work calendars, shifts, breaks, tolerances, overtime eligibility, location/timezone, rotations, and assignment precedence. |
| HR-TIME-002 | P0 | Attendance ingestion is idempotent, source-ordered, correction-aware, timezone-safe, and produces explainable sessions and exceptions. |
| HR-TIME-003 | P0 | Timesheets and overtime support submit, approve, reject, actual-minute confirmation, payroll verification, locking, correction, and immutable handoff evidence. |
| HR-TIME-004 | P0 | Legal minute allocation distinguishes regular, rest-day, public-holiday, night, unpaid, paid-leave, unpaid-leave, and approved overtime facts without calculating payroll rates. |
| HR-TIME-005 | P1 | Support kiosk, badge/barcode, RFID, biometric-provider, mobile/geolocation, and device connectors through authenticated adapters; raw vendor identity and device policy never enter the HR domain facade. |
| HR-TIME-006 | P1 | Provide attendance, lateness, early-exit, absenteeism, overtime, missing-event, and leave-conflict dashboards with correction workflows. |

### 7.5 Compensation and benefits

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-COMP-001 | P0 | Maintain effective-dated grades, salary bands, currencies, compensation agreements, allowance entitlements, bonus eligibility, and benefit plans/enrollments. |
| HR-COMP-002 | P0 | Compensation review cycles enforce budget, eligibility, proposal, calibration, approval, effective-date, and immutable decision evidence. |
| HR-COMP-003 | P0 | HR publishes approved base/component terms and benefit contribution terms with source/version evidence; Payroll alone converts them into pay-period result lines. |
| HR-COMP-004 | P1 | Model total-reward statements as derived projections linking HR agreement, Payroll result, and approved external benefit facts without copying those sources. |
| HR-COMP-005 | P1 | Support compensation change previews and retroactive impact discovery while actual retro calculation remains Payroll-owned. |

### 7.6 Performance, learning, talent, and engagement

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-PERF-001 | P0 | Configure cycles, templates, participants, goals, measures, self/manager reviews, calibration, ratings, acknowledgements, appeals, and improvement plans. |
| HR-PERF-002 | P1 | Support 360 feedback, continuous check-ins, feedback requests, private-note policy, goal hierarchy, and skills-evolution projections with purpose-limited visibility. |
| HR-LRN-001 | P0 | Manage course, session, enrollment/assignment, attendance, assessment, completion, certification, expiry, renewal, and mandatory-training compliance. |
| HR-TAL-001 | P0 | Maintain skills/competencies, talent profiles, pools, career plans, mobility preferences, critical roles, successors, readiness, and risk. |
| HR-TAL-002 | P1 | Provide badge/recognition facts with a governed catalog, grant/revoke evidence, and reporting; monetary rewards route to an external approved owner. |
| HR-TAL-003 | P1 | Talent and performance decisions expose explainable criteria and human approval; automated recommendations cannot silently change employment outcomes. |

### 7.7 Compliance, employee relations, privacy, and documents

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-CPL-001 | P0 | Configure effective document/work-eligibility/policy requirements by worker category, jurisdiction, role, and effective interval. |
| HR-CPL-002 | P0 | Track document references, immutable versions, verification, expiry, reminders, acknowledgement, and exception approvals without storing document bytes. |
| HR-ER-001 | P0 | Manage confidential cases, allegations/issues, participants, evidence references, investigation actions, outcomes, corrective actions, grievances, and appeals with contextual ACLs. |
| HR-ER-002 | P0 | Segregate case access, subject access, investigators, decision makers, and ordinary managers; list queries apply the same row/field policy as detail queries. |
| HR-PRV-001 | P0 | Every sensitive field and operation declares purpose, audience, retention, export, deletion, masking, audit, and observability disposition. |
| HR-PRV-002 | P0 | Subject access/export/deletion workflows inventory HR data and downstream references, respect legal holds, and preserve non-erasable audit evidence. |

### 7.8 Self-service, reporting, bulk operations, and reliability

| ID | Priority | Requirement and acceptance evidence |
|---|---:|---|
| HR-EXP-001 | P0 | Employee and manager experiences use the same root package capabilities, enforce self/team scope server-side, and never rely on UI visibility for authorization. |
| HR-EXP-002 | P1 | Key workflows are responsive and mobile-usable, accessible to WCAG 2.2 AA, localized, timezone-safe, and provide actionable status/history. |
| HR-RPT-001 | P0 | Produce reconciled as-of workforce, headcount, turnover, leave, attendance, recruitment, lifecycle, compensation, performance, learning, talent, compliance, and case projections. |
| HR-RPT-002 | P0 | Reports derive from canonical registries/read models; a report may not become a second status, permission, or calculation owner. |
| HR-BULK-001 | P0 | Imports provide schema/version, dry run, row validation, duplicate/idempotency policy, bounded atomicity, resumability, and rejection evidence. |
| HR-BULK-002 | P0 | Exports are field-allowlisted, permission- and purpose-bound, formula-injection safe, redacted, retained, and audited. |
| HR-REL-001 | P0 | Durable jobs use claims, leases, acknowledgements, bounded retries, dead letters, recovery controls, and operator-visible correlation. |
| HR-REL-002 | P0 | Required state, audit, outbox, history, and consistency rows commit atomically; external effects begin from the committed outbox. |

## 8. Odoo and Frappe HR / ERPNext benchmark

| Capability | Benchmark evidence | Afenda disposition |
|---|---|---|
| Employee records, departments, learning, certifications, skills, onboarding/offboarding | Odoo Employees | Covered locally; close composition debt, user-journey evidence, and production gates. |
| Leave requests, balances, allocations, accrual, public holidays, mandatory days, reporting | Odoo Time Off; Frappe HR leave | Core covered; mandatory days and encashment projection are P1 gaps. |
| Attendance kiosk/badge/RFID, approvals, overtime, reporting | Odoo Attendances; Frappe HR Attendance | Domain/time foundation covered; physical/mobile connectors and operator UX are gaps. |
| Appraisals, self-assessment, manager/360 feedback, goals, skill evolution | Odoo Appraisals | Cycles/goals/reviews covered; continuous/360 experience and benchmark analytics need closure. |
| Requisition, career portal, applicant pipeline, interview scheduling/feedback, offer | Odoo Recruitment; Frappe HR Recruitment | Internal pipeline covered; external career/candidate experience, self-scheduling, and analytics are gaps. |
| Employee referrals and reward analysis | Odoo Referrals; Frappe employee referral links | Referral attribution/reward eligibility requires a bounded recruitment slice; payment stays outside HR. |
| Expenses, advances, multicurrency claims, approval, accounting/payment | Odoo Expenses; Frappe HR Expense Claim/Employee Advance | Explicitly not HR ownership. Requires a separate approved bounded context using HR eligibility ports. |
| Equipment/fleet assignment | Odoo Employees/Fleet; Frappe HR reports | HR may carry assignment references; asset/fleet truth remains external. |
| Payroll work entries and approved source facts | Odoo Payroll work entries; Frappe Payroll | Existing HR→Payroll handoff is stronger: versioned, tenant-checked, approval-backed, normalized once, and snapshotted. |

Benchmark sources:

- [Odoo 19 Human Resources](https://www.odoo.com/documentation/19.0/applications/hr.html)
- [Odoo Employees](https://www.odoo.com/documentation/19.0/applications/hr/employees.html)
- [Odoo Time Off](https://www.odoo.com/documentation/19.0/applications/hr/time_off.html)
- [Odoo Appraisals](https://www.odoo.com/documentation/19.0/applications/hr/appraisals.html)
- [Odoo recruitment flow](https://www.odoo.com/documentation/19.0/applications/hr/recruitment/recruitment-flow.html)
- [Odoo interview scheduling](https://www.odoo.com/documentation/19.0/applications/hr/recruitment/schedule_interviews.html)
- [Odoo Expenses](https://www.odoo.com/documentation/19.0/applications/finance/expenses.html)
- [Odoo payroll work entries](https://www.odoo.com/documentation/19.0/applications/hr/payroll/work_entries.html)
- [Frappe HR Job Opening](https://docs.frappe.io/hr/job-opening), [Job Applicant](https://docs.frappe.io/hr/job-applicant), and [Interview](https://docs.frappe.io/hr/interview)
- [Frappe HR Employee Onboarding](https://docs.frappe.io/hr/employee-onboarding)
- [Frappe HR Attendance](https://docs.frappe.io/hr/attendance)
- [Frappe HR Expense Claim](https://docs.frappe.io/hr/expense-claim) and [Employee Advance](https://docs.frappe.io/hr/employee-advance)
- [Frappe HR reports](https://docs.frappe.io/hr/human-resources-reports)

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Tenancy | Shared schema with hard organization predicates on every tenant root, relation, mutation, history, and lookup. No multi-database-isolation claim. |
| Authorization | Every public operation declares one permission/policy disposition; self, manager, HR, investigator, payroll, and auditor scopes are distinct. |
| Privacy | Data minimization, field projection, masking, purpose limitation, retention, legal hold, access evidence, and safe diagnostics are mandatory. |
| Correctness | External data is `unknown` until validated; state machines are exhaustive; invalid transitions and inconsistent effective dates fail closed. |
| Reliability | Idempotency, optimistic concurrency, atomic audit/outbox policy, replay, recovery, and deterministic projections are required. |
| Performance | Target 100,000 workers per tenant and 10,000 per legal entity with bounded paging/batches; release SLOs require measured load evidence. |
| Observability | Record bounded operation, outcome, latency, canonical error, correlation, and tokenized tenant/actor references; never log sensitive payloads. |
| Accessibility | Employee, manager, candidate, and operator experiences meet WCAG 2.2 AA and support keyboard/screen-reader workflows. |
| Localization | Locale/timezone/calendar presentation is separate from canonical codes and effective-dated business meaning. |
| Compatibility | Internal representation changes require zero production-consumer edits; deliberate root-contract changes name every affected consumer. |

## 10. Security and abuse cases

- Reject actor-supplied organization, worker, employee, manager, or case scope that conflicts with the authenticated session and authorization context.
- Reject cross-tenant relationship IDs, stale versions, overlapping effective truth, replay with changed payload, and forged approval evidence.
- Prevent manager/self-service APIs from escalating into compensation, case, investigation, or all-employee access.
- Prevent candidate/employee uploads from introducing active content, path traversal, malware, oversized payloads, or unbounded retention; store only approved object references.
- Prevent attendance spoofing through signed connector identity, source ordering, device policy, geolocation minimization, and correction evidence.
- Prevent spreadsheet formula injection and hidden sensitive columns in bulk exports.
- Prevent algorithmic ranking, performance, talent, or disciplinary recommendations from becoming employment decisions without explainable human approval.
- Ensure Payroll receives the sealed handoff only; application adapters cannot omit, rewrite, price, tax, or round approved facts.

## 11. Launch profile gate

Capability implementation may continue, but launch-scope closure and lifecycle promotion are blocked until an approved HR Launch Profile names the first operating cohort and its evidence obligations.

| Profile field | Required decision | Current state |
|---|---|---|
| Launch countries | Malaysia and Vietnam, with responsible jurisdiction reviewers | Selected: Malaysia and Vietnam; legal review and sign-off owners remain open |
| Legal entities | Named first-cohort entities and organizations | Open |
| Worker categories | Employees, interns, contingent workers and other included categories | Open |
| Languages | Supported UI and official-document languages | Open |
| Calendars/timezones | Supported calendars, holidays, work weeks and timezones | Open |
| Attendance channels | Web, kiosk, badge/RFID, approved biometric provider and/or mobile | Open |
| Payroll integration | Approved `ApprovedPayrollHandoff` contract version and Payroll owner | Implemented candidate: `hr.payroll-handoff.v1`; launch approval and named Payroll sign-off remain open |
| Sensitive-data classes | Launch inventory, purpose, field access, masking and diagnostic rules | Open |
| Retention | Candidate, employee, case, attendance and audit retention decisions | Open |
| Scale | Worker, legal-entity, event, import/export and concurrency volumes | Open |
| SLOs | Latency, availability, RTO and RPO targets | Open |
| Independent sign-offs | Security, privacy, employment-law/localization, accessibility, operations and Payroll owners | Open |

The profile remains a Scratch approval gate while Living `docs/` is dormant. It must not be described as a controlled Living document or registered with an invented ID. Controlled promotion requires an explicit Docs-lane reopen and the repository documentation-control process.

### 11.1 Completeness classifications

| Classification | Meaning |
|---|---|
| Product baseline | The permanent semantic model, owner and stable capability boundary exist without requiring future redesign. |
| Launch-required | The capability and its operating evidence must pass for the approved first cohort. |
| Subsequent approved release cohort | The capability retains a named owner, contract, acceptance criteria and delivery phase but is not part of the first cohort's lifecycle decision. It is not considered implemented, complete or safely removable. |

No classification lowers the enterprise quality bar, permits a stub/shim, or turns an open requirement into completed work.

## 12. Delivery sequence

Each mission lands one complete enterprise-quality slice and leaves no parallel API.

0. **HR-ARCH-00 — contract and evidence freeze (P0).** Freeze root exports/signatures, consumers, entrypoint disposition, registry projections, feature dependency evidence, Memory/Drizzle parity status, affected web checks and package lifecycle. Reconcile this PRD and the package README with living evidence.
1. **Feature-first semantic containment (P0).** Remove feature→composition imports and composite-store dependencies, replace peer implementation knowledge with narrow consumed capabilities, break every feature cycle, and enforce approved directional edges. Use one feature pair per bounded closure slice.
2. **Final shallow structural cutover (P0).** Only after Phase 1 reaches zero upward imports, zero aggregate-store references and zero cycles, move once into `src/<feature>/<file>`, delete superseded paths, and prohibit third-level production directories. Export cleanup is not part of this cutover.
3. **Workforce and organization effective truth (P0).** Prove person/worker/employment variants, concurrent employment, rehire, international assignments, matrix reporting, organization history, tenancy and privacy dispositions.
4. **Compensation and HR-to-Payroll semantic completion (P0).** Preserve the implemented handoff baseline; add allowance/bonus agreements, complete per-source lineage and a Payroll-owned historical-version ingress ledger; extend fail-closed pricing to every new approved fact.
5. **Recruitment and hire experience parity (P0/P1).** Career publishing/application, candidate consent/status, structured interview kits, self-scheduling port, referral attribution, funnel/time-to-fill projections and idempotent accepted-offer conversion.
6. **Leave, time and attendance operations parity (P0/P1).** Mandatory days, encashment entitlement handoff, connector security contract, approved kiosk/badge/RFID/biometric/mobile adapters, and attendance/leave conflict resolution.
7. **Lifecycle, compliance, relations, privacy and external references (P0/P1).** Complete sensitive hire-to-retire workflows and equipment/document/sign/calendar acknowledgements through narrow ports without pulling external ownership into HR.
8. **Performance, learning, talent and engagement (P1/P2).** 360/continuous feedback, recognition/badges, skills evolution, calibrated analytics, privacy separation, learning compliance and accessible self/manager journeys.
9. **Reporting, bulk, reliability, scale and recovery (P0).** Reconciled read models, durable scheduled bulk workers, live Drizzle parity, tenant-hostility/fault injection, performance evidence, recovery drills and operational controls.
10. **Application journeys and independent release assurance (P0).** Validate launch-profile journeys, accessibility, migration rehearsal, security/privacy/legal/localization review, production SLO evidence and the explicit module-lifecycle decision.

Employee expenses/advances require a separately approved package/architecture mission. They are not silently added to HR during these phases.

Current HR-ARCH-00 status: HR-0.1 public-contract freeze, HR-0.2 consumer inventory, HR-0.3 registry projections, HR-0.4 reporting-only architecture debt, and HR-0.5 documentation reconciliation are closed. HR-0.6 has repaired and verified the web, module, generator, audit, deleted-Scratch, parity-governance, Neon-environment, migration-status projection, DDL-probe registry, migration-writer ownership, and pending-migration data-compatibility blockers recorded in the [same-revision baseline verification record](baseline-verification.md). Phase 0 remains open until the governed database ledger has zero pending, unknown, divergent, or out-of-order identities and the complete fail-closed live matrix passes on that revision. See the [Human Resources Development Roadmap](development-roadmap.md) for sequencing.

## 13. Acceptance and permanence gates

- One canonical operation/status/policy/event owner; all projections derive from it.
- Package root remains the sole production business facade; testing remains isolated and product-import forbidden.
- No feature imports `composition`, `facade`, or `testing`, including adapters and colocated tests.
- No feature handler or adapter accepts, constructs, or names the composite `HumanResourcesStore` without an explicitly approved architectural reason.
- A feature-owned store covers one cohesive transactional aggregate or an explicitly approved collection sharing one atomic consistency boundary; broad features use descriptive aggregate store/adapter files rather than a feature-wide internal monolith.
- Root exports contain no adapter, store, composition constructor or internal persistence record; the only package entrypoints are `.` and `./testing`.
- Cross-feature edges are allowlisted, acyclic and restricted to owner contracts or narrow consumed capabilities.
- HR and Payroll contain no peer package dependency or deep import; the app composition adapter carries the handoff unchanged.
- Payroll validates the handoff from `unknown`, preserves all approved work facts in its immutable calculation snapshot, and owns all interpretation.
- Required state, audit, outbox, history, and derived consistency rows pass rollback/fault-injection tests.
- Memory/Drizzle behavior, tenant hostility, authorization, privacy, idempotency, concurrency, and effective-date boundaries pass focused tests.
- Every current query declares its effective-date policy, every as-of query fails deterministically on overlap, supersession lineage is preserved, and finalized historical facts are not overwritten.
- Odoo/Frappe benchmark requirements are mapped to implemented, external-owner, or explicitly open evidence; no “compatible” claim relies only on names or scaffolding.
- Package lint, typecheck, full focused tests, affected web consumer tests, module governance, and required live-database gates pass on the same revision.
- README and this PRD match the public facade and ownership boundaries; superseded Scratch links are removed rather than recreated.

## 14. Rollout and rollback

- Activate HR capabilities by organization and approved capability set, not by database presence alone.
- Import through dry-run and reconciliation; preserve source identity, source version, mapping evidence, and rejection records.
- Run legacy and Afenda workflows in controlled comparison only where duplicate mutation is prevented; one system remains the named writer for each fact.
- Promote feature slices only after authorization, privacy, tenant, adapter parity, recovery, and affected-consumer evidence passes.
- Rollback disables new commands or connector ingestion for the affected capability, preserves committed evidence, drains/reconciles outbox work, and returns operations to the last approved writer.
- Correct effective-dated or finalized facts through supersession, reversal, or correction lineage; never rewrite history to make reconciliation pass.

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| HR grows into payroll/expenses/assets/documents | Ownership matrix, peer-package ban, narrow ports/events, package-root contract tests. |
| Feature-first tree hides upward dependencies | Recursive import/store guards including adapters/tests; narrow feature contracts; composition-only construction. |
| Historical facts change after policy edits | Effective-dated versioning, immutable approvals, supersession lineage, as-of queries, replay tests. |
| Sensitive employee/candidate/case data leaks | Field projection, contextual ACL, data minimization, redaction, purpose-bound exports, hostile tests. |
| Device/vendor attendance data is trusted | Authenticated connectors, schema/version validation, ordering/idempotency, quarantine, correction evidence. |
| Payroll silently loses source facts | Sealed payload carry, Payroll-owned normalization, immutable full-fact snapshot, blocking mismatch tests. |
| Benchmark parity becomes copied complexity | Outcome-based requirement map, named external owners, phased evidence, no API/schema imitation. |
| Local tests are mistaken for release readiness | Separate package evidence from live parity, security/privacy review, performance, migration, and lifecycle approval. |

## 16. Decisions and open questions

### Decisions

- HR owns approved workforce meaning; Payroll owns payroll interpretation and outputs.
- `@afenda/events/schemas` owns the versioned transport shape, not HR or Payroll business policy.
- Cross-package orchestration stays in `apps/web`; no HR↔Payroll dependency is approved.
- Expenses/advances, Payments, Accounting, assets/fleet, and document/signing remain separate owners.
- Malaysia and Vietnam are the selected first-launch jurisdictions; named legal entities, localization obligations, and independent jurisdiction approvals remain open.
- HR-0.6 database-revision and live-evidence closure is the remaining HR-ARCH-00 mission; feature-first semantic containment is not eligible until the governed migration ledger and same-revision matrix are green.
- The structural cutover is blocked until architecture evidence proves zero feature→composition imports, zero feature adapter dependencies on `HumanResourcesStore`, and zero feature dependency cycles.

### Open questions requiring named ownership

The launch-specific questions below must be resolved through the Launch Profile; external bounded-context/provider ownership requires a separate named architecture decision where no owner is approved.

- Which legal entities, worker categories, languages, calendars, statutory/localization obligations, and data-residency commitments define the first Malaysia-and-Vietnam launch cohort?
- Is the first recruitment surface public, authenticated candidate self-service, or both, and which calendar/message providers are approved?
- Which attendance channels are launch-required, and what biometric/geolocation privacy constraints apply per jurisdiction?
- Which expense/advance bounded context will own reimbursement and accounting integration?
- Which asset/fleet/document/sign providers and immutable-reference contracts are approved?
- What workforce scale, latency, recovery-time, recovery-point, retention, and audit-export SLOs must be demonstrated for launch?
- Who owns independent HR security/privacy, employment-law, accessibility, and migration acceptance?

## 17. Definitions of ready

**Product-complete** means every requirement assigned to the product is implemented through its canonical owner and stable capability boundary, including requirements allocated to subsequent approved release cohorts. An external bounded context may own execution, but a named external owner is not evidence that the HR-side requirement is implemented.

**Launch-ready for an approved cohort** means the named launch journeys operate through one stable root facade; effective-dated workforce facts, approvals, privacy, tenancy, audit and recovery evidence are reproducible; launch-required HR-to-Payroll facts are complete and interpreted only by Payroll; live adapter, scale, migration and failure drills pass against the approved profile; and every named independent authority approves the same revision.

The package remains ineligible for lifecycle promotion while the Launch Profile is open, the structural cutover is not semantically contained, or any launch-critical verification finding remains unresolved.
