# Enterprise-readiness assessment

`@afenda/human-resources` has a **strong enterprise domain kernel**: typed commands and queries, Zod contracts, authorization ports, memory and Drizzle adapters, domain events, concurrency controls, failure-injection tests, tenant guards, and broad sub-domain coverage.

However, the supplied structure is not yet evidence of a complete enterprise HR product. It is closer to a **well-engineered modular HR backend with several mature slices—especially Time—plus multiple functionally thin domains and missing cross-cutting platform capabilities**. The directory contains extensive parity and security tests, but no obvious first-class workflow, reporting, notification, privacy-rights, integration-management, or HR service-delivery areas. It also shows some structural duplication that should be reconciled.

Two immediate readiness warnings stand out:

1. The README says **104** hard-tenant roots, while the current verified production audit is **177 roots, 0 skipped**. That documentation/control-plane mismatch must be corrected.
2. The public manifest still reports `lifecycle: scaffolded`. Do not simply change that label; promote it only after a formal readiness gate across all HR sub-domains.

---

# Critical capabilities to develop before an enterprise production claim

## 1. Complete the worker and organizational foundation

The current core visibly contains:

```text
employee
employment
employment-contract
assignment
```

and organization contains:

```text
department
job
position
reporting-line
```

That is a good base, but enterprise Core HR normally also needs an explicit model for:

* person versus worker versus employee;
* employees, contractors, contingent workers, interns and former workers;
* concurrent employments and multiple assignments;
* rehire and service-date continuity;
* personal and preferred names;
* addresses, contact points and emergency contacts;
* dependants and beneficiaries;
* government or statutory identifiers;
* nationality, residency and work-location context;
* standard hours, FTE and worker category;
* legal entity, business unit, location, cost centre and project dimensions;
* matrix, dotted-line and temporary reporting relationships;
* historical organization restructures.

Some of these entities may correctly belong to `@afenda/master-data`. In that case, HR should not duplicate them. It should define **typed, tenant-safe, effective-dated integration contracts** such as:

```ts
interface LegalEntityDirectoryPort {}
interface LocationDirectoryPort {}
interface CostCenterDirectoryPort {}
interface OrganizationAssignmentContextPort {}
```

Every HR record that depends on those dimensions should retain an immutable or effective-dated reference sufficient to reproduce historical decisions.

### Production requirement

An administrator must be able to ask:

> “What was this employee’s legal entity, position, manager, department, location, cost centre and work calendar on a particular date?”

and receive one deterministic answer—even after later transfers and restructures.

---

## 2. Apply effective dating and historical truth across every domain

Time now has unusually strong successor-lineage, policy-version and historical-resolution semantics. The same standard must cover the rest of HR.

Every mutable business definition or assignment should support, where applicable:

* effective start and end dates;
* future-dated changes;
* retroactive corrections;
* predecessor and successor lineage;
* reason codes;
* source and evidence references;
* optimistic concurrency;
* supersession rather than destructive rewriting;
* `asOf` queries;
* prevention of overlaps, gaps and ambiguous branches;
* historical policy resolution.

Priority entities include:

```text
employment
employment contract
assignment
position
reporting line
leave policy
leave entitlement
compensation
benefit enrollment
work eligibility
certification
performance cycle
succession placement
headcount plan
```

A current-state-only HR database is not enterprise-grade because employment disputes, audits, benefits, leave, compliance and workforce reporting all depend on historical truth.

---

## 3. Add field-level and contextual HR authorization

An injected authorization port is an excellent starting point, but broad command permissions are insufficient for highly sensitive HR data.

The authorization model should distinguish:

* employee self-access;
* direct manager;
* matrix manager;
* HR business partner;
* recruiter;
* compensation administrator;
* benefits administrator;
* investigator;
* legal or compliance reviewer;
* learning administrator;
* executive workforce planner;
* system integration identity.

It must support:

* row-level scope by organization, legal entity, department and management hierarchy;
* field-level sensitivity;
* purpose-based access;
* separation of duties;
* self-approval prevention;
* confidential-case segmentation;
* compensation-data restrictions;
* temporary delegated authority;
* break-glass access with reason and audit;
* terminated-user access revocation;
* access-history reporting.

Examples of fields that should not inherit ordinary employee-directory access include:

```text
national identifiers
bank details
medical or accommodation information
compensation values
employee-relations evidence
investigation notes
background-check results
immigration documents
succession ratings
risk-of-loss assessments
```

### Database-level defence

`organization_id NOT NULL` is necessary but not sufficient. Also require:

* tenant-scoped unique constraints;
* tenant-safe composite foreign keys where practical;
* database rejection of cross-organization relationships;
* systematic foreign-reference isolation tests;
* either database row-level security or a documented equivalent defence model;
* tests proving cross-tenant reads and writes fail for every sensitive aggregate.

The 177-root audit proves tenant columns exist and are populated. It does not, by itself, prove that every cross-table relationship is tenant-safe.

---

## 4. Build HR privacy, retention and legal-hold capabilities

HR data has long and sometimes conflicting retention obligations. The package needs a formal privacy lifecycle, not only authorization at command time.

Required capabilities include:

* data classification by field and aggregate;
* configurable retention policies;
* candidate-data expiry;
* former-worker retention;
* legal holds that suspend deletion;
* subject-access export;
* correction and rectification workflow;
* restricted erasure or anonymisation where legally permitted;
* consent and notice records;
* processing-purpose records;
* access-audit export;
* sensitive-value masking;
* encryption or tokenisation policies;
* key rotation support;
* search-index deletion and redaction;
* attachment-retention coordination.

Do not implement unconditional “delete employee” commands. Deletion must resolve retention obligations, active legal holds, dependent business records and audit requirements.

---

## 5. Introduce a reusable workflow, task and approval capability

Several domains contain lifecycle commands, but the tree does not show a common enterprise workflow boundary.

Afenda Lite needs configurable support for:

* multi-step approval chains;
* sequential and parallel approvals;
* role-, hierarchy- and amount-based routing;
* delegation and substitutes;
* authority effective dates;
* workflow-policy snapshots;
* task assignment;
* due dates and SLAs;
* reminders and escalations;
* comments and evidence;
* return-for-correction;
* cancellation and withdrawal;
* immutable decisions;
* reassignment when a manager leaves;
* inbox and queue queries;
* notification events.

This should not become a different hard-coded approval implementation in every sub-domain.

A platform workflow service may own orchestration, while HR owns:

* the business state transition;
* the policy reference or snapshot;
* required evidence;
* the approval outcome;
* the immutable domain event.

Time’s governed approval-chain implementation provides a useful pattern, but it should not be copied file-for-file into eleven separate domains.

---

## 6. Add a real document, evidence and e-signature boundary

The vault-reference approach is a correct HR boundary, but a reference validator alone is not a complete production document capability.

A platform document service should provide:

* encrypted upload and download;
* malware scanning;
* content-type validation;
* immutable document versions;
* checksums;
* tenant isolation;
* document-level ACLs;
* signed, short-lived access;
* retention and legal hold;
* evidence categories;
* document expiry;
* replacement and supersession;
* access logs;
* redaction;
* secure preview;
* e-signature integration;
* deletion or anonymisation coordination.

HR should continue storing only governed references, for example:

```text
vault://organizations/{organizationId}/{kind}/{documentId}?version={version}
```

Relevant HR areas include:

```text
employment contracts
candidate offers
work eligibility
policy acknowledgements
leave evidence
employee-relations evidence
training certificates
performance documents
benefit enrollment evidence
termination documentation
```

The generic storage, scanning and signing infrastructure should remain outside the HR bounded context.

---

## 7. Build production integration and bulk-data capabilities

Enterprise HR systems rarely operate alone. The current package has several useful production ports, but it needs a broader integration framework.

Required platform capabilities include:

* versioned public API contracts;
* inbound and outbound webhooks;
* idempotency keys;
* event replay;
* integration cursors;
* bulk import and export;
* dry-run validation;
* row-level success and rejection results;
* mapping tables;
* external identifier management;
* duplicate detection;
* reconciliation reports;
* retry and dead-letter handling;
* integration ownership and health status;
* scheduled synchronization;
* secure file exchange where required.

Priority integrations are:

* identity and access management;
* joiner/mover/leaver provisioning;
* email and calendar;
* e-signature;
* background screening;
* benefits providers;
* learning content or LMS providers;
* attendance devices or attendance aggregators;
* finance dimensions such as legal entity and cost centre;
* external job boards and career sites.

`createProductionAttendanceSource()` remaining fail-closed is safe engineering, but the Time capability should not be presented as supporting external attendance until at least one production connector—or a stable customer-facing ingestion API—is operational.

---

## 8. Add enterprise reporting, read models and workforce analytics

The current directory is command- and aggregate-oriented. That is appropriate for writes, but enterprise HR also needs optimized read models.

Develop:

* employee directory and organization chart;
* historical headcount snapshots;
* joins, transfers and terminations;
* turnover and retention;
* vacancy and position-control reporting;
* recruitment funnel;
* time-to-hire and offer acceptance;
* leave balances and absence trends;
* attendance exceptions;
* learning compliance;
* expiring certifications and documents;
* performance-cycle completion;
* succession coverage;
* diversity and representation metrics where lawful;
* workforce-plan versus actual;
* audit and compliance exports.

The reporting design must support:

* `asOf` dates;
* legal entity and organization filters;
* permission-aware measures;
* suppression or masking of sensitive small cohorts;
* reproducible metric definitions;
* scheduled exports;
* immutable report parameters;
* source-record drill-through;
* warehouse or analytical projection publishing.

Do not run all reporting directly against transactional aggregates. Use event-driven projections or a reporting store where query volume and complexity justify it.

---

## 9. Deliver actual HR product surfaces

The README correctly says this package does not own UI. That does not remove the product requirement from Afenda Lite.

At minimum, the overall product needs:

### Employee self-service

* personal-information review and change requests;
* documents;
* leave;
* attendance and timesheets;
* goals and reviews;
* learning;
* benefits;
* policy acknowledgements;
* employment letters;
* privacy requests.

### Manager self-service

* team information;
* approvals;
* attendance exceptions;
* leave calendar;
* onboarding and offboarding tasks;
* goals and reviews;
* learning compliance;
* requisitions;
* succession and talent review;
* headcount plan visibility.

### HR administration

* organization and position administration;
* employee lifecycle;
* bulk changes;
* policy administration;
* workflow queues;
* compliance monitoring;
* data-quality queues;
* audit history;
* reporting;
* integration monitoring.

### Candidate experience

* application profile;
* consent and privacy;
* interview scheduling;
* offer acceptance;
* document signing;
* onboarding transition.

All product surfaces need accessibility, localization, timezone correctness, secure error handling and mobile-responsive workflows.

---

## 10. Add production operations and reliability controls

The test surface is strong, but enterprise production readiness also requires operational proof.

Required controls include:

* structured logging with correlation IDs;
* command latency and error metrics;
* outbox lag metrics;
* workflow and integration queue health;
* alerting;
* health checks;
* distributed tracing;
* migration runbooks;
* zero- or low-downtime migration practices;
* retry-safe background jobs;
* dead-letter queues;
* replay and reconciliation tools;
* backup and restore drills;
* disaster-recovery procedures;
* capacity and load tests;
* query-plan and index review;
* large-tenant pagination tests;
* rate and concurrency protection;
* production data repair procedures;
* operational dashboards and SLOs.

The existing concurrency, compensation, event-replay and failure-injection tests are valuable. Extend that discipline to:

```text
bulk imports
workflow retries
outbox publication
document callbacks
identity provisioning
report generation
organization restructures
large employee populations
```

---

# Domain-specific gaps to close

## Core and organization

**Highest priority additions:**

* person/worker abstraction;
* contacts, addresses and emergency contacts;
* dependants;
* contingent-worker support;
* multiple employments and assignments;
* legal entity, location, business unit and cost-centre integration;
* position occupancy and vacancy state;
* FTE and standard-hours history;
* temporary and matrix reporting;
* bulk organization change;
* historical organization chart;
* employee duplicate and merge governance.

---

## Leave and absence

The visible domain contains policy, entitlement and request aggregates. An enterprise leave capability should also cover:

* accrual schedules;
* proration;
* carryover and expiry;
* negative-balance policies;
* waiting periods;
* service-based entitlements;
* retroactive adjustments;
* partial-day and hourly leave;
* concurrent or overlapping request rules;
* public-holiday and work-calendar interaction;
* sickness and medical evidence;
* return-to-work workflows;
* compensatory time;
* leave cancellation after approval;
* delegated approval;
* team availability;
* policy versioning;
* jurisdiction-specific rule packs;
* entitlement reconciliation.

Time must consume approved leave facts, but Leave must remain authoritative for policy, request and balance state.

---

## Compensation and benefits

Payroll remains separate, but HR still needs:

* effective-dated compensation history;
* compensation-change reasons;
* salary review budgets;
* merit and promotion workflows;
* salary-band progression;
* market reference data;
* bonus or incentive recommendations;
* compensation statements;
* benefit eligibility rules;
* coverage tiers;
* dependants and beneficiaries;
* life-event changes;
* open enrollment;
* evidence requirements;
* provider enrollment exports;
* enrollment corrections;
* effective and termination dates;
* confidential-access controls.

HR should provide approved compensation and benefit facts; payroll calculates monetary outcomes.

---

## Recruitment

The visible aggregates cover the basic ATS flow. Enterprise recruitment still requires:

* candidate consent and privacy notices;
* candidate retention and anonymisation;
* duplicate candidate detection and merge;
* sourcing channels;
* referrals;
* agencies;
* interview panels and availability;
* email and calendar scheduling;
* scorecards;
* assessments;
* background screening;
* requisition and offer approval;
* offer versioning;
* e-signature;
* decline and withdrawal reasons;
* talent-community consent;
* candidate-to-employee conversion;
* onboarding handoff;
* reporting and source attribution.

---

## Lifecycle

Onboarding, probation, transfer, termination and offboarding need a shared task model:

* reusable templates;
* task dependencies;
* owners;
* due dates;
* evidence;
* reminders;
* escalations;
* employee and manager tasks;
* equipment and asset coordination;
* account provisioning and deprovisioning;
* policy acknowledgements;
* contract and letter generation;
* probation checkpoints;
* transfer impact analysis;
* termination approval;
* final clearance;
* knowledge-transfer records;
* downstream completion confirmation.

The lifecycle aggregate must not claim “offboarding completed” while required IAM, asset or compliance tasks remain unresolved.

---

## Time

Time is currently the most mature slice. Its remaining enterprise work is narrower:

* dedicated legal-entity scoped Drizzle coverage;
* final §23 evidence reconciliation;
* actual production attendance connector or an explicit manual/API-only scope;
* operator and self-service product workflows;
* operational monitoring for imports, exceptions and handoff;
* final readiness documentation;
* no readiness claim until every exit gate is green.

Advanced rostering, open shifts, bidding, optimization and geofencing may remain later capabilities unless Afenda Lite is positioning Time as a full workforce-management product.

The Time requirements already demonstrate the right engineering bar: authoritative facts, controlled corrections, permissioned transitions, audit/outbox, tenant isolation and identical memory/Drizzle behavior. Apply that same bar to every HR domain.

---

## Performance

Add:

* configurable review templates;
* review participants;
* continuous check-ins;
* feedback;
* 360-degree reviews;
* goal alignment and cascading;
* competency assessment;
* calibration sessions;
* rating moderation;
* locked final ratings;
* employee acknowledgement;
* appeal or dispute;
* review-cycle completion monitoring;
* evidence and audit;
* access restrictions before release.

Calibration is especially important; without it, enterprise rating processes frequently become inconsistent across departments.

---

## Learning

Add:

* learning programs and curricula;
* course versions;
* prerequisites;
* enrollment;
* approval;
* waitlists;
* capacities;
* instructors;
* facilities or virtual links;
* content packages;
* external LMS integration;
* attendance;
* assessments;
* credits;
* costs;
* certification renewal;
* expiry reminders;
* mandatory compliance campaigns;
* equivalent external learning;
* manager and employee learning plans.

---

## Compliance and employee relations

### Compliance

Develop:

* requirement applicability rules;
* policy versioning;
* targeted acknowledgement campaigns;
* reminders and escalation;
* document expiry;
* renewal;
* work-eligibility verification workflow;
* evidence review;
* exception waivers;
* compliance dashboards;
* legal hold;
* regulatory export.

### Employee relations

The current cases/actions/appeals/events structure should be expanded with:

* confidential intake;
* allegation classification;
* involved parties;
* witnesses;
* investigator assignment;
* investigation plan;
* interviews;
* evidence chain of custody;
* findings;
* outcomes;
* disciplinary sanctions;
* grievance procedures;
* union or representative participation;
* retaliation safeguards;
* appeal routing;
* legal hold;
* restricted access;
* case SLAs;
* immutable chronology.

Employee-relations records require stricter access rules than ordinary HR records.

---

## Talent and workforce planning

### Talent

Add:

* critical-role classification;
* talent-review cycles;
* assessment matrices;
* readiness levels;
* risk of loss;
* mobility preference;
* succession slates;
* emergency successors;
* development actions;
* calibration;
* confidential visibility;
* succession coverage reporting.

### Workforce planning

Add:

* plan versions;
* scenarios;
* approval;
* freezes and baselines;
* legal entity, location and cost-centre dimensions;
* position and vacancy linkage;
* planned-versus-actual reconciliation;
* hiring demand;
* attrition assumptions;
* skills supply and gap analysis;
* reservations and release;
* audit of plan changes.

Advanced statistical forecasting can remain later, but plan versioning, approval and actual reconciliation are enterprise essentials.

---

# Cross-cutting capabilities that should remain outside the HR package

Do not turn `@afenda/human-resources` into a platform monolith.

| Capability                   | Recommended owner       | HR responsibility                              |
| ---------------------------- | ----------------------- | ---------------------------------------------- |
| Document storage             | Document platform       | Store governed references and HR metadata      |
| E-signature                  | Integration/platform    | Initiate and consume signed-result events      |
| Workflow engine              | Platform workflow       | Own HR transition rules and resulting facts    |
| Notifications                | Platform communications | Emit domain events and notification intent     |
| Identity provisioning        | IAM platform            | Emit joiner/mover/leaver facts                 |
| Search                       | Platform search         | Publish permission-aware projections           |
| Analytics warehouse          | Data platform           | Publish stable HR facts and metric definitions |
| Legal entity/location master | Master data             | Reference and effective-date the HR assignment |
| Background checks            | External integration    | Store status, consent and governed evidence    |
| LMS content delivery         | Learning platform       | Own assignments, completions and HR records    |

This keeps HR authoritative without duplicating generic infrastructure.

---

# Structural clean-up visible from the supplied directory

These are not all functional blockers, but they should be resolved before formal readiness:

1. **Update tenancy documentation:** `104` must be reconciled with the verified `177`.
2. **Keep `lifecycle: scaffolded` until formal promotion:** do not edit it merely to match implementation confidence.
3. **Resolve work-calendar ownership:** the tree contains:

   * `src/work-calendar.ts`;
   * `src/time/work-calendar.ts`;
   * an empty `src/work-calendar/` directory.
4. **Verify duplicate adapters are intentional:** both root and compliance-specific vault document adapters are visible.
5. **Verify facade duplication:** `store.ts` plus `store/`, and `schemas.ts` plus `schemas/`, should have clearly documented canonical ownership.
6. **Remove or formally document one-off rewrite scripts** once their migration purpose has ended.
7. **Feature-gate unwired production ports:** a fail-closed adapter is correct, but an unavailable capability must not appear enabled.
8. **Add domain-specific subpath exports** where the root barrel becomes too broad or allows accidental cross-domain coupling.

The existing export-parity and coverage tests are useful guards; retain them while simplifying the layout.

---

# Recommended implementation sequence

## Wave 0 — Readiness truth and structural control

* Correct README and tenancy counts.
* Reconcile Scratch roadmaps with production state.
* Build a capability/evidence ledger for every HR domain.
* Resolve duplicate and empty source paths.
* Inventory all fail-closed production ports.
* Define the readiness promotion process for `module.manifest`.

## Wave 1 — Enterprise foundation

* Complete worker/person and organization dimensions.
* Standardize effective dating and historical queries.
* Implement field-level authorization.
* Implement privacy, retention and legal hold.
* Enforce tenant-safe foreign relationships.

## Wave 2 — Shared HR platform boundaries

* Workflow and task integration.
* Document and e-signature integration.
* Notifications.
* Identity provisioning.
* Bulk import/export and reconciliation.
* Reporting projections and secure search.

## Wave 3 — Domain completeness

Prioritize in this order:

1. Core and organization;
2. leave and absence;
3. lifecycle;
4. compliance and employee relations;
5. compensation and benefits;
6. recruitment;
7. performance and learning;
8. talent and workforce planning.

Time can move to closure evidence in parallel because its persistence and parity foundation is already substantially stronger.

## Wave 4 — Product and operational readiness

* Employee, manager, HR and candidate experiences.
* Accessibility and localization.
* Production connectors.
* Operational dashboards and alerts.
* Load and recovery testing.
* Runbooks and incident procedures.
* Formal readiness evidence and lifecycle promotion.

---

# Enterprise definition of done

A domain should not be called production-ready until every material aggregate has:

* authoritative DDL and a reviewed migration;
* tenant-safe constraints and references;
* typed schemas and branded identifiers;
* command and query contracts;
* authorization and subject-scope rules;
* effective-date and historical behavior;
* optimistic concurrency;
* idempotency where retry is possible;
* audit and domain events;
* outbox or transactional publication;
* memory and Drizzle parity;
* cross-tenant denial tests;
* failure-injection tests;
* production composition;
* operational metrics;
* data-retention classification;
* user-facing or integration-facing entry points;
* accurate documentation.

## Bottom line

Afenda Lite should **not add more isolated HR tables as its next move**. Its largest remaining risk is not lack of domain names—the package already covers most HR headings. The critical risk is **breadth without enterprise depth and without shared workflow, privacy, integration, reporting and operational foundations**.

The strongest next milestone is:

> Build the enterprise HR foundation—worker and organization history, privacy and contextual authorization, workflow/tasks, document and integration boundaries, and reporting projections—then deepen each existing domain using the same migration, tenancy, audit, failure-injection and memory/Drizzle parity standard already established by Time.
