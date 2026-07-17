# Verdict

> **Status:** Scratch improvement critique
> **Authority:** Non-authoritative research material — does **not** replace Living `FFT-MOD-*`
> **Lineage:** [1-fft-architecture.md](1-fft-architecture.md) -> [2-fft-blueprint-oss-scorecard.md](2-fft-blueprint-oss-scorecard.md) -> this file -> [4-fft-reconciliation-and-promotion-map.md](4-fft-reconciliation-and-promotion-map.md) -> [5-fft-relevant-architecture.md](5-fft-relevant-architecture.md) -> [6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md)

The feedback is **directionally strong and worth adopting**, but it should not be accepted as architecture authority exactly as written.

The scorecard correctly identifies that FFT’s real advantage is **not generic CRM, ERP, or farm recordkeeping**. Its defensible value is the combination of:

- Farm and customer commercial context
- Feed trials and technical selling
- Consumption-based demand forecasting
- Tonnage, revenue, margin, freight, and mill-source economics
- Governed feedmill–integrator–farm–dealer collaboration
- Contract-volume and rebate control
- Complaint-to-lot commercial traceability

This is consistent with the original FFT architecture, which deliberately separates FFT-owned commercial capabilities from ERP, MES, WMS, LIMS, finance, formulation, and farm-management systems.

The comparison report is most useful as a **product-pattern benchmark and prioritization input**, not as proof that the proposed architecture is implementation-ready. The report itself correctly states that it is non-authoritative research material and does not assess the current implementation.

---

# 1. What the feedback gets right

## 1.1 It correctly protects FFT from becoming another ERP

The strongest recommendation is:

> integrate mature ERP functions rather than rebuilding them.

That should become an explicit product lock.

FFT should not rebuild:

- General ledger
- Accounts receivable
- Inventory valuation
- Manufacturing execution
- Warehouse management
- Production planning
- Feed formulation
- Laboratory execution
- Complete quality-management workflows
- Complete farm-production management

The scorecard appropriately rates order, delivery, and credit visibility below mature ERP products and recommends an integration-led approach.

### Recommended controlled rule

> **FFT owns commercial intent, commercial evidence, technical conversion, demand intelligence, and trade collaboration. Operational and financial execution remains in the designated systems of record.**

This rule should govern every future feature request.

---

## 1.2 It identifies the right differentiation pillars

The report’s highest-priority capabilities are correct:

| Priority | Capability                      | Recommendation                                     |
| -------- | ------------------------------- | -------------------------------------------------- |
| 1        | Technical sales and feed trials | Make this a first-class bounded context            |
| 2        | Farm-cycle demand forecasting   | Build as an FFT-native planning capability         |
| 3        | Trade Relationship network      | Treat as a governed collaboration model            |
| 4        | Account and Farm 360            | Establish as the commercial domain foundation      |
| 5        | Feed-specific CPQ               | Borrow general CPQ mechanics, retain FFT semantics |

These capabilities are already present in the source blueprint but need stronger implementation contracts.

---

## 1.3 It separates “develop” from “borrow or integrate”

This is one of the most valuable parts of the feedback.

A useful FFT architecture should not classify every feature as custom development. It should classify capabilities into four modes:

| Mode                      | Meaning                                                      |
| ------------------------- | ------------------------------------------------------------ |
| **Own and differentiate** | Native FFT domain capability                                 |
| **Borrow the pattern**    | Reuse proven architectural or UX concepts                    |
| **Integrate**             | Connect to an external system of record                      |
| **Configure**             | Implement through metadata and rules rather than custom code |

The scorecard implicitly follows this structure, but the controlled architecture should make it explicit.

---

# 2. Architecture worth borrowing

The recommendation should be to borrow **patterns**, not codebases or entire data models.

## 2.1 From farmOS: farm asset and activity model

### Worth borrowing

- Assets representing farms, sites, barns, houses, ponds, herds, flocks, equipment, and locations
- Logs representing observations, movements, activities, treatments, measurements, and events
- Quantity and measurement patterns
- Geospatial and map-centered context
- Flexible farm activity records

### Apply to FFT

Borrow the conceptual separation:

```text
Farm Asset
├── Farm Site
├── Barn / House / Pond
├── Herd / Flock / Production Group
├── Delivery Point
└── Equipment or relevant infrastructure

Farm Commercial Observation
├── Capacity assessment
├── Feed-consumption observation
├── Visit finding
├── Trial measurement
├── Competitor-feed observation
└── Complaint evidence
```

### Do not borrow blindly

FFT should not inherit a generic agricultural record model without commercial boundaries. Farm records must be classified as:

- Commercially owned by FFT
- Referenced from a farm-management system
- Shared through a Trade Relationship
- Restricted technical or sensitive data

The scorecard correctly identifies farmOS as the strongest farm-domain reference for Farm 360 and field capture.

---

## 2.2 From LiteFarm: farmer-centered field usability

### Worth borrowing

- Simple field workflows
- Mobile-first forms
- Task-oriented navigation
- Clear farm map interaction
- Progressive disclosure
- Localized terminology
- Low-complexity record capture
- Sustainable and certification evidence organization

### Apply to FFT

Field representatives and farm users should not experience the platform as a conventional enterprise CRM.

A recommended visit workflow is:

```text
Today
→ Select farm
→ See context
→ Start visit
→ Capture observations
→ Record technical/commercial outcome
→ Create next action
→ Sync evidence
```

The user should not need to navigate through multiple administrative modules just to record a visit.

### Important adaptation

FFT needs two field experiences:

1. **Sales and technical field application**
2. **Farm or dealer self-service portal**

They should share domain concepts but not necessarily share identical navigation or permission structures.

---

## 2.3 From Odoo: CRM, CPQ, and workflow discipline

### Worth borrowing

- Configurable pipeline stages
- Stage probability
- Activities and next actions
- Pricelists
- Quote versioning
- Approval workflows
- Product variants
- Contract and recurring commercial concepts
- Multi-company patterns
- Partner and reseller concepts
- Extensible metadata-driven configuration

### Apply to FFT

Borrow the mechanics, but replace generic CRM semantics with feed-specific requirements:

| Generic concept       | FFT-specific form                                          |
| --------------------- | ---------------------------------------------------------- |
| Deal value            | Tons, revenue, gross margin, contribution margin           |
| Product               | Feed SKU, feed form, life stage, species, source mill      |
| Delivery charge       | Freight zone, route, load type, bag/bulk                   |
| Customer site         | Farm, barn, house, pond, delivery point                    |
| Subscription          | Feed commitment, call-off schedule, renewal                |
| Sales qualification   | Capacity, production phase, feed demand and technical need |
| Product demonstration | Feed trial or technical assessment                         |
| Channel partner       | Dealer, integrator, distributor, downstream farm           |

The original blueprint already reflects many of these distinctions.

### Do not borrow

Avoid copying Odoo’s broad module dependency model into FFT. FFT should preserve:

- Strong domain boundaries
- API contracts
- Explicit systems of record
- Event ownership
- Tenant-safe authorization
- Controlled extension points

---

## 2.4 From ERPNext: document lifecycle and integration discipline

### Worth borrowing

- Document status lifecycle
- Draft, submitted, cancelled, amended-style concepts
- Role-based document permissions
- Approval workflows
- Numbering series
- Clear transaction linkage
- Standardized master-to-transaction relationship
- REST-enabled document operations
- Strong order, stock, and financial references

### Apply to FFT

FFT’s important commercial records should have controlled lifecycles.

Example:

```text
Quotation
Draft
→ Pending Technical Review
→ Pending Pricing Approval
→ Approved
→ Issued
→ Accepted / Rejected / Expired
→ Superseded
```

A previously issued quote must never be silently edited. The blueprint already establishes immutability for issued quotes; ERPNext-style document amendment patterns are a strong implementation reference.

### Recommended reusable lifecycle fields

Every governed FFT document should contain:

- Status
- Version
- Previous version reference
- Effective date
- Expiry date
- Owner
- Approval state
- Source system
- External reference
- Tenant and legal entity
- Audit metadata
- Cancellation or supersession reason

---

## 2.5 From mature SaaS architectures: control plane and data plane

The original architecture proposes a tenant control plane and regional deployment cells.

That is worth retaining, but it needs clearer separation.

### Control plane should own

- Tenant registration
- Subscription and entitlements
- Region and cell assignment
- Feature flags
- Identity federation configuration
- Tenant routing
- Connector registrations
- Service-tier configuration
- Tenant lifecycle status

### Data plane should own

- Accounts and farms
- Opportunities and activities
- Trials and assessments
- Quotations and contracts
- Forecasts and targets
- Trade Relationships
- Documents and cases
- Tenant analytics
- Integration execution

### Important rule

The global control plane must not become a convenient store for tenant business data.

---

# 3. What should be improved in the feedback

## 3.1 The scoring appears more precise than the evidence supports

Scores such as `4.8`, `4.7`, and priority `93` or `96` imply a degree of mathematical certainty that the report does not actually establish.

The report acknowledges that the scores are directional and documentation-based, but the decimal precision may still mislead decision-makers.

### Improve it

Use confidence bands:

| Rating          | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| **Leading**     | FFT blueprint materially exceeds the benchmark            |
| **Competitive** | Comparable breadth, with FFT-specific adaptation required |
| **Borrow**      | Benchmark has a mature pattern worth adopting             |
| **Integrate**   | Benchmark or external system is structurally stronger     |
| **Unproven**    | Specification exists but executable evidence is absent    |

Or retain numeric scores but use whole numbers and add:

- Evidence confidence
- Implementation confidence
- Architecture maturity
- Product differentiation

A blueprint can be strong while implementation confidence remains low.

---

## 3.2 It does not distinguish product architecture from implementation architecture enough

The scorecard evaluates capability specification, but some recommendations—tenant isolation, offline sync, integration contracts, and NFR evidence—are implementation architecture concerns.

These should be separated into:

1. Product capability maturity
2. Domain architecture maturity
3. Platform architecture maturity
4. Implementation readiness
5. Operational readiness

Without this separation, a capability may appear “94% complete” even though no schema, API, authorization policy, event contract, or test exists.

### Recommended maturity model

| Level                     | Meaning                                                      |
| ------------------------- | ------------------------------------------------------------ |
| **L0 Concept**            | Capability named                                             |
| **L1 Product definition** | Users, value, and boundary defined                           |
| **L2 Domain contract**    | Entities, commands, states, invariants, events defined       |
| **L3 Technical contract** | APIs, storage, authorization and integration specified       |
| **L4 Implemented**        | Code and migrations exist                                    |
| **L5 Verified**           | Acceptance, security, performance and recovery evidence pass |
| **L6 Operated**           | Production SLOs and incident evidence exist                  |

The current FFT blueprint is mostly L1–L2, with selected L3 requirements. It should not yet be described as 94% implementation-complete.

---

## 3.3 The benchmark set is useful but incomplete

The selected benchmarks are relevant, but the architecture could also borrow patterns from other categories:

- Enterprise CRM and CPQ
- Customer data platforms
- Supply-chain planning
- Field-service applications
- Contract and rebate management
- Multi-party B2B commerce
- Data-sharing and consent platforms
- Workflow and case-management systems

The purpose is not to add more products to the scorecard indefinitely. Instead, benchmark each FFT capability against the most relevant architecture category.

Example:

| FFT capability         | Better benchmark category                   |
| ---------------------- | ------------------------------------------- |
| Technical trials       | Scientific study workflow / agronomy trials |
| Trade Relationship     | B2B network and data-sharing platforms      |
| Consumption forecast   | Demand planning and supply-chain planning   |
| Field visits           | Field service and offline mobile            |
| Rebates                | Channel incentive management                |
| Farm 360               | Asset graph and customer 360                |
| Complaint traceability | Case management plus lot traceability       |

---

## 3.4 “Technical sales and trials” needs stronger scientific governance

The feedback correctly gives this capability the highest priority, but the architecture should go further.

A feed trial cannot be only a configurable form followed by an outcome.

### Add these controls

- Trial objective
- Hypothesis
- Trial design type
- Control and treatment groups
- Inclusion and exclusion criteria
- Baseline period
- Feed product and formula-version reference
- Farm conditions
- Measurement method
- Data source
- Responsible technical owner
- Protocol version
- Deviations
- Missing-data handling
- Success criteria
- Statistical or business evaluation method
- Technical approval
- Customer acknowledgment
- Claim restrictions
- Commercial-conversion outcome

### Important distinction

FFT should support:

1. **Commercial observation**
2. **Structured field evaluation**
3. **Controlled technical trial**
4. **Formal scientific study reference**

These must not all be called “trials,” because their evidence quality differs materially.

---

## 3.5 Forecasting needs an assumption and scenario engine

The feedback identifies forecasting as a key differentiator, but the architecture currently describes forecast types more clearly than forecast mechanics.

### Add a canonical demand equation

At a simplified level:

```text
Expected Feed Demand
=
Population or Stock Count
× Consumption Curve
× Active Days
× Survival / Occupancy Adjustment
× Inclusion or Adoption Rate
× Product Allocation
```

The actual model should support:

- Species
- Breed or production type
- Starting age
- Production phase
- Population
- Mortality or depletion
- Feed-consumption curve
- Feed conversion assumptions
- Product substitution
- Farm utilization
- Seasonality
- Trial conversion probability
- Contract coverage
- Inventory and delivery constraints

### Add forecast provenance

Every forecast line should identify:

- Source
- Assumption set
- Calculation version
- Owner
- Override
- Override reason
- Confidence
- Effective period
- Snapshot
- Reconciliation result

---

## 3.6 Trade Relationship needs a complete shared-record model

The Trade Relationship concept is excellent, but the blueprint currently focuses more on access scope than shared-data ownership.

### Add three categories

#### Tenant-private record

Visible only to the owning tenant.

Examples:

- Internal margin
- Sales strategy
- Credit assessment
- Competitor notes
- Internal technical judgment

#### Shared transaction record

A jointly visible business transaction with controlled fields.

Examples:

- Quote
- Purchase order acknowledgment
- Delivery schedule
- Complaint exchange
- Certificate

#### Referenced external record

Owned by one tenant but referenced by another under a contractual scope.

Examples:

- Farm site
- Delivery point
- Product specification
- Contract reference

### Add shared-record rules

- Who owns the canonical record?
- Who may propose changes?
- Who approves changes?
- What happens after revocation?
- Which historical fields remain visible?
- How are corrections handled?
- Can one party delete its copy?
- What evidence is retained?
- Which tenant’s data-residency policy applies?
- How is a dispute resolved?

---

# 4. What should be improved in the FFT architecture itself

## 4.1 Add formal bounded contexts

The architecture lists modules, but it should declare explicit bounded contexts.

### Recommended FFT bounded contexts

```text
FFT Platform
├── Tenant & Entitlement
├── Identity & Access
├── Party & Farm Graph
├── Territory & Relationship
├── Sales Activity
├── Opportunity & Pipeline
├── Technical Assessment
├── Feed Trial
├── Product Commercialization
├── Pricing & Quotation
├── Contract & Commitment
├── Trade Collaboration
├── Forecast & Demand
├── Target & Performance
├── Customer Case
├── Document & Evidence
├── Integration
├── Audit & Compliance
└── Analytics Semantic Layer
```

This prevents one oversized “sales” module from owning everything.

---

## 4.2 Add aggregates and invariants

For each bounded context, define the transactional aggregate and rules.

Example:

### Opportunity aggregate

Must enforce:

- One tenant owner
- One accountable sales owner
- Valid customer or prospect
- Valid stage transition
- Mandatory next action for open stages
- Probability controlled by stage
- Immutable stage-history records
- Close-date-change reason
- Won evidence
- Lost reason
- Currency and unit consistency

### Quotation aggregate

Must enforce:

- One legal entity
- One customer
- One currency
- Approved price source
- Approved margin calculation
- Valid product applicability
- Freight calculation
- Approval completion
- Immutable issued version
- One accepted version
- Idempotent order-conversion request

---

## 4.3 Add canonical domain events

The feedback correctly asks for integration contracts. This should become a mandatory domain-event catalogue.

### Initial event set

```text
AccountCreated
FarmSiteRegistered
FarmCapacityChanged
OpportunityQualified
OpportunityStageChanged
TechnicalAssessmentCompleted
FeedTrialStarted
FeedTrialResultApproved
QuotationApproved
QuotationIssued
QuotationAccepted
ContractActivated
VolumeCommitmentChanged
DemandForecastPublished
ForecastSnapshotFrozen
TradeRelationshipActivated
TradeRelationshipScopeChanged
TradeRelationshipRevoked
OrderRequestSubmitted
DeliveryStatusReceived
PaymentStatusReceived
ComplaintOpened
ComplaintLinkedToLot
KpiDefinitionActivated
```

Every event should define:

- Owner
- Producer
- Consumers
- Tenant
- Legal entity
- Schema version
- Idempotency key
- Correlation ID
- Business timestamp
- Processing timestamp
- Sensitive-data classification
- Retention
- Replay rules

---

## 4.4 Add command ownership

APIs should distinguish between:

- Commands
- Queries
- Events
- Integration projections

Example:

```text
Command:
IssueQuotation

Query:
GetQuotationCommercialView

Event:
QuotationIssued

Projection:
ERPOrderStatusView
```

This prevents integrations from directly editing FFT’s internal state.

---

## 4.5 Add a master-data and identity-resolution layer

Farm and customer duplication will become a serious operational problem.

The architecture needs explicit rules for:

- Customer matching
- Farm matching
- Delivery-site matching
- Contact matching
- ERP customer mappings
- Dealer-reported downstream farms
- Cross-tenant references
- Duplicate merge
- Historical aliases
- Legal-entity distinction
- Farm ownership changes

### Recommended entity structure

```text
Party
├── Organization
├── Person
└── External Organization Reference

Account
├── Commercial relationship
├── Tenant-specific classification
└── Credit / sales ownership

Operational Site
├── Farm site
├── Feedmill
├── Warehouse
└── Delivery point
```

Do not make `Account`, `Legal Entity`, `Farm`, and `Customer` interchangeable.

---

## 4.6 Add data classification

At minimum:

| Class                     | Examples                                        |
| ------------------------- | ----------------------------------------------- |
| **Public**                | Published product catalog                       |
| **Partner-shared**        | Accepted quote, delivery schedule               |
| **Tenant internal**       | Account strategy, visit note                    |
| **Commercial restricted** | Cost, margin, discount floor                    |
| **Personal confidential** | Contact details and identifiers                 |
| **Technical restricted**  | Trial results, feed performance                 |
| **Security restricted**   | Credentials, access logs, keys                  |
| **Regulated evidence**    | Certificates, complaint records, audit evidence |

Authorization, logging, export, retention, and AI use should depend on classification.

---

## 4.7 Add tenant migration and service-tier transitions

The hybrid tenant model is strong, but the architecture does not fully define moving a tenant between tiers.

Required scenarios include:

- Shared database to dedicated database
- Dedicated database back to pooled infrastructure
- Region migration
- Tenant merger
- Tenant split
- Legal-entity divestiture
- Tenant export and closure
- Disaster recovery into another cell

Each transition needs:

- Identity preservation
- External reference preservation
- Event ordering
- Freeze window
- Delta synchronization
- Validation
- Rollback
- Audit evidence

---

# 5. Revised “borrow, build, integrate” matrix

| Capability                     | Recommended posture                           | Borrow from                                       |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| Tenant organization model      | Build on existing platform kernel             | Enterprise SaaS control-plane patterns            |
| Farm asset graph               | Build FFT adaptation                          | farmOS                                            |
| Field UX                       | Borrow heavily                                | LiteFarm and farmOS                               |
| CRM pipeline                   | Configure and adapt                           | Odoo                                              |
| Activities and next actions    | Borrow                                        | Odoo                                              |
| Document lifecycle             | Borrow                                        | ERPNext                                           |
| Feed technical trials          | Build natively                                | Scientific workflow patterns plus farmOS concepts |
| CPQ mechanics                  | Borrow, then specialize                       | Odoo                                              |
| General order execution        | Integrate                                     | ERPNext, Odoo, existing ERP                       |
| Inventory and production       | Integrate                                     | ERP, MES, WMS                                     |
| Farm production records        | Integrate selectively                         | farmOS, LiteFarm or customer platform             |
| Demand forecasting             | Build natively                                | Supply-chain planning patterns                    |
| Trade Relationship             | Build natively                                | B2B data-sharing and consent patterns             |
| Rebates and channel incentives | Adapt mature patterns                         | Odoo and channel-management systems               |
| Complaint case                 | Build commercial layer                        | Case-management patterns                          |
| Quality and lab workflow       | Integrate                                     | QMS and LIMS                                      |
| Analytics semantic layer       | Build governed FFT layer                      | Modern data-platform patterns                     |
| Offline synchronization        | Borrow protocol patterns, implement carefully | Mature field-service architectures                |
| Audit and evidence             | Build platform-wide                           | ERP document history plus security-audit patterns |

---

# 6. Recommended changes to the controlled FFT architecture

## Critical additions

1. **Bounded-context map**
2. **Canonical entity relationship model**
3. **Aggregate and invariant catalogue**
4. **Command, query, and event catalogue**
5. **Tenant-isolation threat model**
6. **Offline synchronization protocol**
7. **Integration ownership and reconciliation standard**
8. **Trade Relationship shared-record specification**
9. **Forecast assumption and scenario model**
10. **Technical trial evidence classification**
11. **Data-classification and field-authorization matrix**
12. **NFR evidence and test ownership model**

## Important refinements

- Replace vague “Farm 360” wording with a canonical Party–Account–Farm–Site graph.
- Separate technical assessment from controlled trial.
- Separate opportunity forecast from physical consumption forecast.
- Define quote versus contract versus order authority.
- Define shared records instead of only shared fields.
- Define KPI restatement and late-data rules.
- Define tenant tier migration.
- Define regional-cell failure and recovery behavior.
- Define configuration versioning and promotion between environments.
- Define who owns custom fields and whether they are available in APIs and analytics.

---

# 7. Recommended architecture decision

The strongest target posture is:

> **Borrow Odoo and ERPNext’s commercial transaction discipline, farmOS’s farm asset and observation model, and LiteFarm’s field usability—but preserve FFT as the owner of feed-specific technical selling, demand intelligence, governed trade collaboration, and commercial evidence.**

Do **not** attempt to merge these products or mirror their complete schemas.

The FFT architecture becomes more defensible when it follows this boundary:

```text
Commodity functionality
→ Borrow or integrate

Feed-industry commercial semantics
→ Build and own

Operational ledgers
→ Integrate

Tenant governance and evidence
→ Build into the platform kernel
```

## Overall assessment

| Area                       | Verdict                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| Product positioning        | **Strong**                                                       |
| Domain differentiation     | **Very strong**                                                  |
| Systems-of-record boundary | **Strong**                                                       |
| Multi-tenant concept       | **Strong but under-specified**                                   |
| Field and offline model    | **Incomplete**                                                   |
| Trial governance           | **Promising but needs scientific controls**                      |
| Forecast architecture      | **Strong concept, incomplete calculation contract**              |
| Trade Relationship         | **High-value differentiator, requires deeper ownership rules**   |
| Integration architecture   | **Correct patterns, missing canonical contracts**                |
| Enterprise NFRs            | **Ambitious and appropriate, missing executable evidence model** |
| Implementation readiness   | **Not yet enterprise-ready**                                     |

The right next step is **not to add more feature breadth**. It is to convert the current blueprint’s strongest capabilities into precise domain and technical contracts.
