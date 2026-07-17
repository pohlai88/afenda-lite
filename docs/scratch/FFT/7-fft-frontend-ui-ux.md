# FFT UI/UX Frontend Architecture

## Next.js App Router — Pages, URLs, Features, and Components

## 1. Recommended frontend position

FFT should use a **single governed AdminCN application surface under `/fft/**`\*\*, composed inside the existing application shell rather than introducing a separate FFT shell.

The current approved baseline remains:

```text
Event setup
→ Order capture
→ Allocation
→ Completion
→ Audit and export
```

The wider commercial experience—Farm 360, opportunities, technical assessments, trials, quotations, forecasts, Trade Relationships, and complaint cases—should be treated as **target routes** activated only after the relevant domain contracts and program gates are approved.

FFT should own:

- Commercial intent
- Feed-specific sales activities
- Technical conversion
- Demand intelligence
- Governed collaboration
- Commercial evidence

It should display or reference ERP, MES, WMS, finance, LIMS, QMS, and formulation information without recreating their operational ledgers.

---

# 2. UX design principles

## 2.1 One commercial job per page

Each route should have one dominant user objective.

Examples:

| Page               | Primary job                                         |
| ------------------ | --------------------------------------------------- |
| Event detail       | Configure and operate one sales event               |
| Order entry        | Submit demand during an open order window           |
| Allocation run     | Allocate available supply fairly and visibly        |
| Farm 360           | Understand one farm’s commercial situation          |
| Opportunity detail | Move one opportunity toward a controlled outcome    |
| Assessment         | Capture technical and commercial findings           |
| Trial detail       | Govern evidence from baseline to approved result    |
| Quote detail       | Build, approve, issue, and revise a quotation       |
| Forecast workspace | Review, adjust, and freeze demand                   |
| Complaint case     | Connect commercial impact to order and lot evidence |

Avoid “mega dashboards” that mix all workflows into one page.

---

## 2.2 Server-first, interaction where necessary

Use:

- **React Server Components** for route pages, layouts, authorization checks, data loading, tables, summaries, and read views.
- **Client Components** only for interactive islands such as boards, editable grids, charts, map controls, form repeaters, drag-and-drop, and offline indicators.
- **Server Actions** for governed internal mutations.
- **Route Handlers** for public APIs, webhooks, file delivery, exports, and integration callbacks.

Page files should remain thin. Domain workflows belong in feature modules and backend application services.

---

## 2.3 Context must always be visible

The top application context should show:

```text
Organization
· Legal entity
· Business unit
· Territory or feedmill
· Active event, where relevant
· Permission or restricted-data state
```

A user should always know:

- Which tenant and organization they are acting in
- Whether they are viewing internal or partner-shared information
- Whether data is authoritative, synchronized, estimated, or stale
- Which actions are available
- Why an action is blocked

---

## 2.4 Progressive disclosure

Do not display every technical, financial, and audit field simultaneously.

Use:

1. Summary
2. Operational details
3. Commercial details
4. Technical evidence
5. Integrations
6. Audit history

Sensitive values such as cost, margin floors, credit evaluation, and internal strategy should be hidden by field-level authorization, not merely visually obscured.

---

# 3. Top-level navigation

## Recommended FFT navigation

```text
Overview

Operations
├── Events
├── Orders
├── Allocation
└── Audit

Commercial
├── Accounts
├── Farms
├── Activities
├── Opportunities
├── Assessments
├── Trials
├── Quotes
├── Contracts
└── Cases

Planning
├── Forecast
├── Targets
└── Performance

Network
├── Trade Relationships
├── Dealers
└── Shared Records

Reference
├── Products
├── Price Books
├── Territories
└── Documents

Administration
├── Configuration
├── Workflows
├── Integrations
├── Data Quality
├── Imports
├── Exports
└── Access and Audit
```

### Navigation visibility

Navigation items should be driven by:

- Module entitlement
- Tenant configuration
- Program or feature flag
- Permission code
- Legal entity or territory scope
- Data classification
- Runtime readiness

Do not render menu items solely by role names such as `admin` or `manager`.

---

# 4. Recommended Next.js App Router structure

```text
apps/web/app/
└── (authenticated)/
    └── fft/
        ├── layout.tsx
        ├── loading.tsx
        ├── error.tsx
        ├── not-found.tsx
        ├── page.tsx
        │
        ├── events/
        ├── orders/
        ├── allocation/
        ├── audit/
        │
        ├── accounts/
        ├── farms/
        ├── activities/
        ├── opportunities/
        ├── assessments/
        ├── trials/
        ├── quotes/
        ├── contracts/
        ├── cases/
        │
        ├── forecast/
        ├── targets/
        ├── performance/
        │
        ├── relationships/
        ├── dealers/
        ├── shared-records/
        │
        ├── products/
        ├── price-books/
        ├── territories/
        ├── documents/
        │
        └── admin/
            ├── configuration/
            ├── workflows/
            ├── integrations/
            ├── data-quality/
            ├── imports/
            ├── exports/
            └── access/
```

Do **not** introduce `/fft/[locale]`. Localization should be handled by the platform’s current localization mechanism, not by adding an FFT-specific locale route.

---

# 5. Shared App Router layout

## `/fft/layout.tsx`

The FFT layout should provide:

- FFT access guard
- Tenant and organization context
- Entitlement validation
- FFT navigation
- Command palette registrations
- Breadcrumb foundation
- Feature-flag context
- Permission-aware actions
- Data classification indicators
- Notification and approval counters
- Integration-health indicator
- Responsive content frame

### Recommended shell composition

```tsx
<FftAccessBoundary>
  <FftNavigationProvider>
    <ModuleHeader />
    <FftContextStrip />
    <FftNavigation />
    <main>{children}</main>
  </FftNavigationProvider>
</FftAccessBoundary>
```

This is not a new application shell. It is an FFT module composition inside the existing governed AdminCN shell. The slice map explicitly prohibits remounting a separate `FftShell`.

---

# 6. Route inventory

## 6.1 FFT overview

### `/fft`

**Purpose:** Role-aware commercial and operational landing page.

### Sections

- Today’s priorities
- Open events
- Orders awaiting action
- Allocation exceptions
- Pipeline summary
- Forecast variance
- Trials requiring attention
- Quotes awaiting approval
- Overdue next actions
- Integration warnings
- Recent audit activity

### Components

- `FftOverviewHeader`
- `CommercialPulseCards`
- `MyPriorityQueue`
- `PipelineSummary`
- `DemandForecastSummary`
- `TrialAttentionList`
- `PendingApprovalList`
- `IntegrationHealthStrip`
- `RecentActivityTimeline`

### UX rule

The page should answer:

> What requires my attention now?

It should not attempt to be the full analytics dashboard.

---

# 7. Living operational routes

These routes align most directly with the current event–order–allocation–audit baseline.

---

## 7.1 Events

### `/fft/events`

**Purpose:** Browse, filter, create, and manage trade or sales events.

### Features

- Event list
- Event status
- Order-window status
- Product count
- Supply availability
- Owner
- Start and end dates
- Allocation mode
- Clone event
- Activate scheduled event
- Close or archive event

### Components

- `EventTable`
- `EventStatusBadge`
- `EventWindowBadge`
- `EventFilterBar`
- `CreateEventButton`
- `CloneEventDialog`
- `EventBulkActions`
- `EventEmptyState`

---

### `/fft/events/new`

**Purpose:** Create an event draft.

### Form sections

1. Identity
2. Schedule
3. Products
4. Supply limits
5. Allocation method
6. Customer priority rules
7. Custom fields
8. Review

### Components

- `EventWizard`
- `EventIdentityForm`
- `EventScheduleForm`
- `EventProductSelector`
- `SupplyCapEditor`
- `PriorityPolicyEditor`
- `CustomFieldConfiguration`
- `EventReviewPanel`

---

### `/fft/events/[eventId]`

**Purpose:** Event command center.

### Header information

- Event name
- Status
- Window state
- Owner
- Period
- Total demand
- Available supply
- Allocated volume
- Completion progress

### Tabs

```text
Overview
Products
Supply
Priority
Orders
Allocation
Documents
Activity
Audit
```

### Child routes

```text
/fft/events/[eventId]
/fft/events/[eventId]/products
/fft/events/[eventId]/supply
/fft/events/[eventId]/priority
/fft/events/[eventId]/orders
/fft/events/[eventId]/allocation
/fft/events/[eventId]/documents
/fft/events/[eventId]/activity
/fft/events/[eventId]/audit
```

### Components

- `EventHeader`
- `EventCommandBar`
- `EventKpiStrip`
- `EventWindowControl`
- `EventProgressTimeline`
- `SupplyDemandChart`
- `EventExceptionPanel`
- `EventTabNavigation`

---

## 7.2 Orders

### `/fft/orders`

**Purpose:** Search and manage event-related order requests.

### Views

- All orders
- My orders
- Pending validation
- Submitted
- Transferred
- Allocated
- Shortfall
- Cancelled
- Integration exception

### Components

- `OrderTable`
- `OrderStatusBadge`
- `OrderFilterBar`
- `OrderVolumeSummary`
- `OrderCustomerCell`
- `OrderExceptionBadge`
- `OrderExportAction`

---

### `/fft/orders/new`

Prefer event context:

```text
/fft/events/[eventId]/orders/new
```

A global `/fft/orders/new` may first require choosing an active event.

### Features

- Customer or farm picker
- Product-line editor
- Quantity in tons or configured UOM
- Priority note
- Requested delivery period
- Transfer request
- Validation against window state
- Supply awareness
- Draft saving
- Submission confirmation

### Components

- `OrderEntryForm`
- `CustomerFarmPicker`
- `OrderLineEditor`
- `FeedProductPicker`
- `QuantityInput`
- `OrderWindowStatus`
- `SupplyAvailabilityHint`
- `OrderValidationSummary`
- `SubmitOrderDialog`

---

### `/fft/orders/[orderId]`

**Purpose:** Govern one order request and its downstream visibility.

### Tabs

```text
Summary
Lines
Allocation
Delivery
Documents
Activity
Audit
```

### Components

- `OrderHeader`
- `OrderLifecycle`
- `OrderLineTable`
- `AllocationSummary`
- `ErpOrderReference`
- `DeliveryStatusTimeline`
- `OrderDocumentList`
- `OrderAuditTimeline`

ERP order, invoice, and payment values should be displayed as source-linked projections, not directly editable FFT records.

---

## 7.3 Allocation

### `/fft/allocation`

**Purpose:** Show allocation work requiring action across events.

### Features

- Events pending allocation
- Supply versus demand
- Allocation status
- Allocation mode
- Shortfall count
- Overrides pending review
- Completed runs
- Failed runs

### Components

- `AllocationQueue`
- `AllocationSummaryCards`
- `AllocationStatusBadge`
- `AllocationRunHistory`
- `ShortfallAttentionList`

---

### `/fft/events/[eventId]/allocation`

**Purpose:** Preview, execute, review, and govern an event allocation.

### Sections

- Available supply
- Eligible demand
- Allocation method
- Preview result
- Customer allocation table
- Shortfall
- Exceptions
- Overrides
- Run history

### Components

- `AllocationWorkspace`
- `SupplyDemandSummary`
- `AllocationMethodPanel`
- `AllocationPreviewTable`
- `AllocationRunButton`
- `AllocationOverrideDrawer`
- `AllocationReasonField`
- `AllocationComparisonView`
- `AllocationRunTimeline`

### Required UX rules

- Preview and execution are visibly different.
- Override permission is separate from allocation-run permission.
- Override requires a reason.
- Completed allocation history is immutable.
- Re-running requires an explicit new run or revision.
- Shortfalls must be visible before confirmation.

---

## 7.4 Audit

### `/fft/audit`

**Purpose:** Search material FFT activity.

### Filters

- Organization
- Legal entity
- Event
- Actor
- Action
- Entity type
- Entity ID
- Date range
- Data classification
- Source
- Correlation ID

### Components

- `AuditFilterBar`
- `AuditEventTable`
- `AuditDetailDrawer`
- `BeforeAfterDiff`
- `CorrelationTrace`
- `AuditExportDialog`

---

### `/fft/admin/exports`

**Purpose:** Govern bulk data exports.

### Features

- Export type
- Scope
- Data classification
- Requested by
- Approval status
- Generated file
- Expiry
- Download activity
- Cancellation

### Components

- `ExportRequestTable`
- `CreateExportDialog`
- `ExportScopeBuilder`
- `ExportPermissionNotice`
- `ExportApprovalTimeline`
- `ExportDownloadAudit`

Viewing and exporting must remain separate permissions. The source documents explicitly reject silent bulk dumps and require export-specific governance.

---

# 8. Commercial foundation routes

These routes correspond to the Party–Account–Farm–Site graph and Farm 360 target capability.

---

## 8.1 Accounts

### `/fft/accounts`

**Purpose:** Browse prospects, customers, integrators, dealers, and partner organizations.

### Features

- Account type
- Parent account
- Territory
- Owner
- Customer status
- Farm count
- Estimated annual tons
- Pipeline value
- Credit status
- Last activity
- Next action
- Data-quality warning

### Components

- `AccountTable`
- `AccountTypeBadge`
- `AccountOwnerCell`
- `AccountHierarchyCell`
- `AnnualDemandCell`
- `AccountCreditIndicator`
- `DataQualityBadge`
- `AccountMapToggle`

---

### `/fft/accounts/new`

### Sections

- Party identity
- Commercial relationship
- Parent organization
- Territory and ownership
- Contacts
- ERP reference
- Data-sharing status
- Initial farm or site

### Components

- `AccountCreateForm`
- `PartyIdentityForm`
- `AccountClassificationForm`
- `AccountOwnerSelector`
- `ExternalReferenceEditor`
- `DuplicateCandidatePanel`

---

### `/fft/accounts/[accountId]`

### Header

- Account name
- Type
- Status
- Owner
- Territory
- Estimated demand
- Open pipeline
- Credit indicator
- Integration status

### Tabs

```text
Overview
Farms
Contacts
Activities
Opportunities
Trials
Quotes
Contracts
Orders
Cases
Documents
Relationships
Audit
```

### Components

- `AccountHeader`
- `AccountCommercialSummary`
- `DecisionMakerMap`
- `AccountHealthPanel`
- `AccountPlanPanel`
- `AccountRiskPanel`
- `AccountHistoryTimeline`
- `ExternalSystemReferences`

---

## 8.2 Farms

### `/fft/farms`

**Purpose:** Search and segment farm sites across authorized territories.

### Filters

- Account
- Farm group
- Country or region
- Territory
- Species
- Production type
- Capacity range
- Feedmill
- Current supplier
- Sales owner
- Risk
- Trial status
- Data quality

### Views

- Table
- Cards
- Map
- Territory cluster

### Components

- `FarmTable`
- `FarmCardGrid`
- `FarmMap`
- `FarmFilterBar`
- `FarmCapacityCell`
- `SpeciesBadgeList`
- `EstimatedDemandCell`
- `FarmDataQualityIndicator`

---

### `/fft/farms/new`

### Sections

- Parent account
- Farm identity
- Location
- Delivery points
- Species and production type
- Capacity
- Production cycles
- Feed program
- Commercial ownership
- ERP or farm-system references

### Components

- `FarmCreateForm`
- `FarmLocationForm`
- `DeliveryPointRepeater`
- `SpeciesProductionEditor`
- `CapacityEditor`
- `ProductionCycleEditor`
- `FeedProgramEditor`
- `DuplicateFarmPanel`

---

### `/fft/farms/[farmId]`

This is the principal **Farm 360 commercial view**.

### Header

- Farm name
- Parent account
- Species
- Active production phase
- Capacity
- Estimated tons per year
- Current feed supplier
- Territory
- Sales owner
- Risk
- Data freshness

### Tabs

```text
Overview
Production Context
Feed Program
Contacts
Activities
Assessments
Trials
Opportunities
Quotes
Orders
Forecast
Cases
Documents
Integrations
Audit
```

### Overview components

- `FarmHeader`
- `FarmCommercialPulse`
- `FarmCapacitySummary`
- `CurrentFeedProgramCard`
- `EstimatedDemandCard`
- `FarmRelationshipMap`
- `RecentVisitTimeline`
- `OpenOpportunityList`
- `TrialStatusPanel`
- `DeliveryAndComplaintSummary`
- `NextBestActions`

FFT Farm 360 is a **commercial view**, not a replacement for a complete farm operating system.

---

# 9. Sales activity and field execution

## 9.1 Activities

### `/fft/activities`

### Views

- My day
- My week
- Team activities
- Overdue
- Visits
- Calls
- Tasks
- Follow-ups
- Completed

### Components

- `ActivityCalendar`
- `ActivityAgenda`
- `ActivityTable`
- `OverdueActivityList`
- `ActivityTypeBadge`
- `ActivityOutcomeBadge`

---

### `/fft/activities/new`

### Activity types

- Farm visit
- Customer meeting
- Call
- Technical review
- Quote follow-up
- Collection follow-up
- Complaint follow-up
- Internal review

### Components

- `ActivityForm`
- `RelatedRecordPicker`
- `VisitObjectiveSelector`
- `ActivityDateTimePicker`
- `AttendeeEditor`
- `FollowUpBuilder`

---

### `/fft/visits/[visitId]`

A visit may be represented as an activity subtype rather than a separate domain root.

### Sections

```text
Before visit
During visit
Outcome
Evidence
Next action
Audit
```

### Components

- `VisitPreparationPanel`
- `FarmContextSnapshot`
- `VisitCheckInControl`
- `ObservationCapture`
- `PhotoEvidenceUploader`
- `VisitOutcomeForm`
- `NextActionComposer`
- `VisitSummary`

A later offline implementation should add:

- Sync state
- Local draft state
- Attachment queue
- Conflict resolution
- Authentication-expiry handling

However, the current filtered architecture defers a separate offline application until a future approved program.

---

# 10. Opportunity and pipeline

## 10.1 Opportunities

### `/fft/opportunities`

### Views

- Pipeline board
- List
- Forecast
- By farm
- By species
- By product
- By feedmill
- Stale
- Closing this period
- Lost analysis

### Components

- `OpportunityBoard`
- `OpportunityTable`
- `PipelineStageColumn`
- `OpportunityCard`
- `PipelineSummaryBar`
- `OpportunityFilterBar`
- `StageAgingIndicator`
- `NextActionIndicator`
- `PipelineCoverageWidget`

### Opportunity card fields

- Account or farm
- Opportunity type
- Expected tons
- Expected revenue
- Expected margin
- Species
- Product family
- Source mill
- Stage
- Probability
- Expected first delivery
- Next action
- Days in stage

---

### `/fft/opportunities/new`

### Sections

1. Account and farm
2. Opportunity type
3. Feed requirement
4. Product and mill
5. Financial estimate
6. Decision makers
7. Competitor
8. Expected timing
9. Next action

### Components

- `OpportunityCreateForm`
- `OpportunityTypeSelector`
- `FeedRequirementEditor`
- `OpportunityProductMix`
- `OpportunityValueEditor`
- `DecisionMakerSelector`
- `CompetitorEditor`
- `OpportunityNextActionForm`

---

### `/fft/opportunities/[opportunityId]`

### Header

- Stage
- Tons
- Revenue
- Margin
- Probability
- Close date
- Owner
- Farm
- Credit status
- Next action

### Tabs

```text
Overview
Feed Requirement
Activities
Assessment
Trial
Products
Quotes
Approvals
Competition
Documents
Stage History
Audit
```

### Components

- `OpportunityHeader`
- `OpportunityStageStepper`
- `OpportunityGateChecklist`
- `OpportunityCommercialSummary`
- `OpportunityTechnicalSummary`
- `OpportunityNextAction`
- `OpportunityStageHistory`
- `OpportunityWonEvidencePanel`
- `OpportunityLostReasonPanel`

### Required behavior

- Stage advancement must evaluate configured exit criteria.
- Blocked advancement must show missing requirements.
- Probability follows stage unless an authorized override exists.
- Won requires accepted quote, contract, or order evidence.
- Lost requires standardized reason.
- Close-date changes require a reason.

These controls are central to the target Opportunity aggregate described in the relevant architecture and slice map.

---

# 11. Technical assessment and feed trials

The UI must clearly separate:

1. Commercial observation
2. Structured field evaluation
3. Controlled technical trial
4. Formal external study reference

Treating all evidence as one generic “trial” would create misleading technical claims.

---

## 11.1 Assessments

### `/fft/assessments`

### Features

- Assessment type
- Farm
- Species
- Production phase
- Technical owner
- Sales owner
- Status
- Completion
- Findings
- Recommended next step

### Components

- `AssessmentTable`
- `AssessmentTypeBadge`
- `AssessmentStatusBadge`
- `AssessmentProgress`
- `AssessmentTemplateFilter`

---

### `/fft/assessments/new`

### Sections

- Assessment classification
- Farm and production context
- Current feed program
- Production baseline
- Consumption baseline
- Constraints
- Commercial objective
- Observations
- Proposed action

### Components

- `AssessmentWizard`
- `AssessmentClassificationSelector`
- `ProductionContextSnapshot`
- `CurrentFeedProgramForm`
- `BaselineMetricEditor`
- `ConstraintChecklist`
- `AssessmentObservationEditor`
- `AssessmentRecommendationPanel`

---

### `/fft/assessments/[assessmentId]`

### Tabs

```text
Summary
Farm Context
Feed Program
Measurements
Observations
Recommendations
Evidence
Approvals
Audit
```

---

## 11.2 Trials

### `/fft/trials`

### Views

- Proposed
- Planning
- Active
- Monitoring
- Analysis
- Technical approval
- Customer acknowledgment
- Completed
- Cancelled
- Deviated

### Components

- `TrialTable`
- `TrialStatusBadge`
- `TrialEvidenceClassBadge`
- `TrialProgressTimeline`
- `TrialAttentionIndicator`
- `TrialConversionIndicator`

---

### `/fft/trials/new`

### Trial creation stages

1. Evidence class
2. Objective and hypothesis
3. Farm and groups
4. Feed products
5. Protocol
6. Baseline
7. Measurements
8. Success criteria
9. Responsibilities
10. Approval

### Components

- `TrialWizard`
- `EvidenceClassSelector`
- `TrialObjectiveForm`
- `TrialGroupEditor`
- `TrialFeedProductEditor`
- `ProtocolVersionPicker`
- `MeasurementPlanEditor`
- `SuccessCriteriaBuilder`
- `TrialResponsibilityMatrix`
- `TrialApprovalSetup`

---

### `/fft/trials/[trialId]`

### Header

- Evidence class
- Status
- Farm
- Species
- Product
- Technical owner
- Start and end dates
- Protocol version
- Conversion opportunity

### Tabs

```text
Overview
Protocol
Groups
Baseline
Measurements
Observations
Samples
Deviations
Analysis
Approvals
Customer Acknowledgment
Commercial Conversion
Documents
Audit
```

### Components

- `TrialHeader`
- `TrialEvidenceBanner`
- `TrialStatusStepper`
- `ProtocolSummary`
- `TrialGroupComparison`
- `BaselineDataGrid`
- `MeasurementDataGrid`
- `TrialChart`
- `SampleReferenceTable`
- `DeviationLog`
- `TrialResultSummary`
- `TechnicalApprovalPanel`
- `CustomerAcknowledgmentPanel`
- `TrialConversionPanel`

### UX safeguards

- Persistent evidence-class label
- “Not a veterinary diagnosis” notice where relevant
- No success claim before technical approval
- Deviations visible before result approval
- Customer acknowledgment distinct from technical approval
- Commercial conversion does not rewrite technical evidence

---

# 12. Product, pricing, and quotation

## 12.1 Products

### `/fft/products`

### Features

- Product family
- SKU
- Species
- Life stage
- Feed form
- Package
- Source mill
- Availability
- Commercial specification
- External system status

### Components

- `ProductTable`
- `ProductApplicabilityBadge`
- `FeedFormBadge`
- `SourceMillCell`
- `ProductSpecificationDrawer`
- `ProductIntegrationStatus`

---

### `/fft/products/[productId]`

### Tabs

```text
Overview
Applicability
Commercial Specifications
Packaging
Mill Sources
Pricing
Documents
External References
Audit
```

Do not expose confidential formulation details. Store and display the approved commercial specification and formula-version reference only.

---

## 12.2 Price books

### `/fft/price-books`

### Features

- Legal entity
- Currency
- Customer or channel
- Effective period
- Product count
- Status
- Source
- Approval state

### Components

- `PriceBookTable`
- `PriceBookStatusBadge`
- `PriceBookEffectiveDate`
- `PriceBookScopeCell`

---

### `/fft/price-books/[priceBookId]`

### Tabs

```text
Overview
Products
Volume Tiers
Freight
Surcharges
Customer Exceptions
Approvals
Versions
Audit
```

### Components

- `PriceBookHeader`
- `PriceGrid`
- `VolumeTierEditor`
- `FreightRuleEditor`
- `SurchargeRuleEditor`
- `CustomerPriceExceptionTable`
- `PriceBookApprovalTimeline`

---

## 12.3 Quotes

### `/fft/quotes`

### Views

- Draft
- Technical review
- Pricing approval
- Approved
- Issued
- Accepted
- Rejected
- Expired
- Superseded
- ERP-order requested

### Components

- `QuoteTable`
- `QuoteStatusBadge`
- `QuoteValueCell`
- `QuoteMarginIndicator`
- `QuoteApprovalStatus`
- `QuoteExpiryIndicator`

---

### `/fft/quotes/new`

Prefer creation from:

```text
/fft/opportunities/[opportunityId]/quotes/new
```

### Sections

1. Customer and farm
2. Product lines
3. Quantity and units
4. Source mill
5. Pricing
6. Freight
7. Payment terms
8. Margin
9. Validity
10. Approvals
11. Customer document preview

### Components

- `QuoteBuilder`
- `QuoteLineEditor`
- `QuoteProductPicker`
- `QuoteQuantityEditor`
- `SourceMillSelector`
- `FreightCalculator`
- `QuotePriceSummary`
- `MarginGuardrail`
- `PaymentTermsSelector`
- `QuoteApprovalRequirements`
- `QuoteDocumentPreview`

---

### `/fft/quotes/[quoteId]`

### Header

- Quote number
- Version
- Status
- Customer
- Farm
- Net value
- Tons
- Margin
- Expiry
- Owner

### Tabs

```text
Summary
Lines
Commercial Terms
Margin
Approvals
Customer Document
Acceptance
Order Request
Versions
Activity
Audit
```

### Components

- `QuoteHeader`
- `QuoteLifecycleStepper`
- `QuoteLineTable`
- `QuoteCommercialTerms`
- `QuoteMarginPanel`
- `QuoteApprovalTimeline`
- `QuoteIssueAction`
- `QuoteAcceptancePanel`
- `QuoteOrderRequestPanel`
- `QuoteVersionHistory`

### Required lifecycle

```text
Draft
→ Technical review
→ Pricing approval
→ Approved
→ Issued
→ Accepted / Rejected / Expired
→ Superseded
```

Issued versions must be immutable; changes create a revision. This document-lifecycle discipline is a key recommended pattern from ERPNext-style transaction governance.

---

# 13. Contracts, commitments, and rebates

## 13.1 Contracts

### `/fft/contracts`

### Features

- Customer
- Sites
- Status
- Period
- Committed tons
- Delivered tons
- Utilization
- Price formula
- Renewal
- Rebate status

### Components

- `ContractTable`
- `ContractStatusBadge`
- `ContractUtilizationBar`
- `ContractRenewalIndicator`
- `RebateAccrualCell`

---

### `/fft/contracts/[contractId]`

### Tabs

```text
Overview
Parties
Products
Commitments
Call-offs
Pricing
Freight
Rebates
Deliveries
Documents
Approvals
Renewal
Audit
```

### Components

- `ContractHeader`
- `ContractCommitmentSummary`
- `ContractUtilizationChart`
- `CallOffSchedule`
- `ContractPriceFormula`
- `RebateTierTable`
- `RebateAccrualSummary`
- `RenewalWorkspace`

---

# 14. Forecast and demand planning

## 14.1 Forecast workspace

### `/fft/forecast`

### Views

```text
Opportunity
Commitment
Consumption
Combined demand
Actual versus forecast
```

### Dimensions

- Legal entity
- Feedmill
- Territory
- Customer
- Farm
- Species
- Production phase
- Product
- Product family
- Packaging
- Week
- Month

### Components

- `ForecastViewSwitcher`
- `ForecastDimensionBar`
- `ForecastSummaryCards`
- `ForecastGrid`
- `ForecastChart`
- `ForecastVarianceHeatmap`
- `ForecastConfidenceBadge`
- `ForecastSnapshotSelector`
- `ForecastReconciliationPanel`

---

### `/fft/forecast/consumption`

### Formula transparency

The UI should expose the demand logic:

```text
Population
× Consumption curve
× Active days
× Survival or occupancy adjustment
× Adoption rate
× Product allocation
= Expected feed demand
```

### Components

- `ConsumptionForecastGrid`
- `AssumptionSetSelector`
- `PopulationInput`
- `ConsumptionCurvePicker`
- `OccupancyAdjustmentEditor`
- `AdoptionRateEditor`
- `ProductAllocationEditor`
- `DemandCalculationBreakdown`

---

### `/fft/forecast/snapshots`

### Features

- Snapshot period
- Created by
- Calculation version
- Assumption version
- Frozen date
- Total tons
- Difference from prior snapshot
- Actual reconciliation

### Components

- `ForecastSnapshotTable`
- `FreezeSnapshotDialog`
- `SnapshotComparison`
- `SnapshotReconciliation`

---

### `/fft/forecast/assumptions`

### Components

- `AssumptionSetTable`
- `AssumptionSetEditor`
- `AssumptionVersionHistory`
- `ConsumptionCurveEditor`
- `ScenarioManager`

Every forecast line should retain source, assumption set, calculation version, override reason, confidence, snapshot, and reconciliation status.

---

# 15. Targets and KPI performance

## 15.1 Targets

### `/fft/targets`

### Features

- Target period
- Metric
- Owner
- Team
- Territory
- Feedmill
- Species
- Product
- Tons
- Revenue
- Margin
- Status

### Components

- `TargetTable`
- `TargetProgressBar`
- `TargetOwnerCell`
- `TargetDimensionBadge`
- `TargetUploadAction`

---

### `/fft/targets/[targetId]`

### Tabs

```text
Definition
Allocation
Progress
Adjustments
Versions
Audit
```

---

## 15.2 Performance

### `/fft/performance`

### Dashboard views

- Executive
- Sales director
- Regional manager
- Individual representative
- Key account
- Pricing and margin
- Technical sales
- Feedmill demand
- Dealer performance
- Credit and collections
- Complaint performance

### Components

- `PerformancePersonaSwitcher`
- `KpiCard`
- `KpiDefinitionPopover`
- `KpiTrendChart`
- `KpiDrillThrough`
- `TargetAttainmentChart`
- `PipelineCoverageChart`
- `ForecastAccuracyChart`
- `TrialConversionChart`
- `PriceRealizationChart`
- `ComplaintRateChart`

### Trust requirements

Every KPI must show:

- Definition
- Formula
- Version
- Effective date
- Source systems
- Refresh time
- Inclusion and exclusion rules
- Owner
- Drill-through scope

The source architecture requires traceable and versioned KPI definitions rather than opaque dashboard numbers.

---

# 16. Trade Relationships and network collaboration

## 16.1 Relationships

### `/fft/relationships`

### Features

- Participant organization
- Relationship type
- Direction
- Sharing scopes
- Effective date
- Expiry
- Status
- Agreement
- Shared-record count
- Last access

### Components

- `TradeRelationshipTable`
- `RelationshipStatusBadge`
- `SharingScopeBadgeList`
- `RelationshipDirectionIndicator`
- `RelationshipRiskIndicator`

---

### `/fft/relationships/new`

### Sections

1. Participants
2. Legal entity and site mappings
3. Relationship type
4. Sharing direction
5. Sharing scopes
6. Agreement or consent
7. Effective period
8. Retention behavior
9. Review
10. Approval

### Components

- `TradeRelationshipWizard`
- `ParticipantTenantPicker`
- `EntityMappingEditor`
- `SharingDirectionSelector`
- `SharingScopeBuilder`
- `AgreementReferenceForm`
- `RelationshipRetentionPanel`
- `RelationshipRiskReview`

---

### `/fft/relationships/[relationshipId]`

### Tabs

```text
Overview
Participants
Mappings
Sharing Scopes
Shared Records
Agreements
Changes
Access History
Disputes
Audit
```

### Components

- `TradeRelationshipHeader`
- `RelationshipScopeMatrix`
- `SharedRecordTable`
- `RelationshipChangeProposal`
- `RelationshipRevocationDialog`
- `AccessHistoryTable`
- `RelationshipDisputePanel`

### Shared-record classification

The UI must visibly distinguish:

| Record type         | UI treatment                               |
| ------------------- | ------------------------------------------ |
| Tenant-private      | Internal lock and classification indicator |
| Shared transaction  | Shared badge, participants, and version    |
| Referenced external | Source-owner and permitted-use indication  |

The Trade Relationship model must govern record ownership, proposed changes, approval, revocation, retention, corrections, and disputes—not merely field visibility.

---

## 16.2 Shared records

### `/fft/shared-records`

### Features

- Record type
- Owning tenant
- Participants
- Source record
- Shared version
- Effective scope
- Expiry
- Access history

### Components

- `SharedRecordTable`
- `SharedRecordTypeBadge`
- `SharedRecordOwnerBadge`
- `SharedRecordAccessDrawer`
- `SharedRecordRevocationState`

---

# 17. Complaint and commercial cases

## 17.1 Cases

### `/fft/cases`

### Views

- Open
- Investigation
- Awaiting quality response
- Awaiting customer
- Commercial resolution
- Closure approval
- Closed
- Reopened

### Components

- `CaseTable`
- `CaseStatusBadge`
- `CaseSeverityBadge`
- `CaseCommercialImpactCell`
- `CaseLotLinkIndicator`
- `CaseSlaIndicator`

---

### `/fft/cases/new`

### Sections

- Customer and farm
- Order or delivery
- Product
- Lot reference
- Complaint category
- Quantity affected
- Commercial impact
- Evidence
- QMS or LIMS reference
- Initial action

### Components

- `CaseIntakeForm`
- `OrderDeliveryPicker`
- `ProductLotReference`
- `ComplaintCategorySelector`
- `CommercialImpactEditor`
- `CaseEvidenceUploader`
- `QualitySystemReferenceEditor`

---

### `/fft/cases/[caseId]`

### Tabs

```text
Summary
Customer and Farm
Order and Delivery
Product and Lot
Evidence
Quality Links
Commercial Resolution
Communication
Approvals
Audit
```

### Components

- `CaseHeader`
- `CaseTraceabilityGraph`
- `CaseEvidenceGallery`
- `CertificateReferencePanel`
- `QmsCaseReference`
- `CorrectiveActionReference`
- `ReplacementCreditStatus`
- `CustomerCommunicationTimeline`
- `CaseClosureApproval`

FFT should own the commercial case graph while linking to QMS and LIMS, not reproducing their execution workflows.

---

# 18. Integration and operational administration

## 18.1 Integrations

### `/fft/admin/integrations`

### Features

- Connector
- External system
- Direction
- Owner
- Status
- Last successful run
- Error count
- Queue depth
- Reconciliation status
- Credential health

### Components

- `ConnectorTable`
- `ConnectorHealthBadge`
- `IntegrationDirectionBadge`
- `ConnectorRunSummary`
- `CredentialExpiryIndicator`

---

### `/fft/admin/integrations/[connectorId]`

### Tabs

```text
Overview
Configuration
Mappings
Runs
Failures
Dead Letter
Reconciliation
Webhooks
Credentials
Audit
```

### Components

- `ConnectorHeader`
- `ConnectorConfigurationForm`
- `MappingVersionTable`
- `IntegrationRunTable`
- `IntegrationFailureTable`
- `DeadLetterQueueView`
- `ReplayAction`
- `ReconciliationSummary`
- `WebhookSecretRotation`

### Required safeguards

- Replay permission separate from read
- No silent message loss
- Idempotency visible
- Mapping version visible
- Sensitive payload redaction
- Correlation and external IDs visible
- Failed records retain resolution state

---

## 18.2 Data quality

### `/fft/admin/data-quality`

### Features

- Duplicate accounts
- Duplicate farms
- Missing ERP references
- Conflicting site identities
- Invalid external mappings
- Stale farm data
- Unowned records
- Incomplete classifications

### Components

- `DataQualityDashboard`
- `DuplicateCandidateQueue`
- `MasterDataConflictTable`
- `MergeRecordDialog`
- `ExternalReferenceRepair`
- `DataFreshnessPanel`

---

## 18.3 Imports

### `/fft/admin/imports`

### Features

- Template download
- Import upload
- Validation
- Row-level errors
- Duplicate detection
- Dry run
- Approval
- Commit
- Reconciliation

### Components

- `ImportJobTable`
- `ImportUpload`
- `ImportMappingStep`
- `ImportValidationResults`
- `ImportDuplicateReview`
- `ImportReconciliationSummary`

---

# 19. Configuration routes

## 19.1 Main configuration

### `/fft/admin/configuration`

### Sections

- General
- Units and currencies
- Numbering
- Opportunity types
- Pipeline stages
- Activity types
- Assessment templates
- Trial evidence classes
- Quote lifecycle
- Forecast assumptions
- KPI definitions
- Case categories
- Custom fields
- Feature availability

---

### Child routes

```text
/fft/admin/configuration/general
/fft/admin/configuration/pipelines
/fft/admin/configuration/activities
/fft/admin/configuration/assessments
/fft/admin/configuration/trials
/fft/admin/configuration/quotes
/fft/admin/configuration/forecast
/fft/admin/configuration/kpis
/fft/admin/configuration/cases
/fft/admin/configuration/custom-fields
```

### Components

- `ConfigurationSectionNav`
- `ConfigurationVersionBadge`
- `ConfigurationEffectiveDate`
- `ConfigurationPublishDialog`
- `ConfigurationDiff`
- `ConfigurationAuditTimeline`

Configurations affecting business decisions must be versioned and effective-dated.

---

## 19.2 Workflows

### `/fft/admin/workflows`

### Workflow types

- Opportunity stage gates
- Pricing approval
- Margin approval
- Credit approval
- Trial approval
- Quote issue
- Contract activation
- Forecast freeze
- Relationship activation
- Complaint closure
- Export approval

### Components

- `WorkflowTable`
- `WorkflowDesigner`
- `WorkflowStepEditor`
- `WorkflowConditionBuilder`
- `ApprovalLimitEditor`
- `WorkflowSimulation`
- `WorkflowVersionHistory`

---

# 20. Cross-cutting component architecture

## 20.1 Feature folder structure

```text
apps/web/features/fft/
├── access/
├── overview/
├── events/
├── orders/
├── allocation/
├── accounts/
├── farms/
├── activities/
├── opportunities/
├── assessments/
├── trials/
├── products/
├── pricing/
├── quotes/
├── contracts/
├── forecast/
├── targets/
├── performance/
├── relationships/
├── cases/
├── integrations/
├── audit/
└── configuration/
```

Each feature should contain:

```text
feature/
├── components/
├── forms/
├── tables/
├── queries/
├── actions/
├── schemas/
├── permissions/
├── mappers/
├── presentation/
└── index.ts
```

---

## 20.2 Reusable FFT UI components

### Navigation and context

- `FftBreadcrumbs`
- `FftContextStrip`
- `OrganizationContextSelector`
- `LegalEntitySelector`
- `TerritorySelector`
- `FeedmillSelector`
- `DataFreshnessBadge`
- `SourceSystemBadge`
- `DataClassificationBadge`
- `PermissionBoundary`
- `FeatureAvailabilityBoundary`

### Page composition

- `EntityPageHeader`
- `EntitySummaryStrip`
- `EntityTabNav`
- `PageActionBar`
- `FilterToolbar`
- `SavedViewSelector`
- `PageEmptyState`
- `PageErrorState`
- `RestrictedDataNotice`
- `ReadOnlySourceNotice`

### Domain values

- `TonnageValue`
- `CurrencyValue`
- `MarginValue`
- `PricePerTonValue`
- `SpeciesBadge`
- `ProductionPhaseBadge`
- `FeedFormBadge`
- `MillSourceBadge`
- `ForecastConfidenceBadge`
- `TechnicalEvidenceBadge`

### Governance

- `LifecycleStepper`
- `ApprovalTimeline`
- `VersionHistory`
- `AuditTimeline`
- `ReasonRequiredDialog`
- `ImmutableRecordBanner`
- `SupersededRecordBanner`
- `ExternalSystemReference`
- `IntegrationStatusPanel`
- `DataLineagePopover`

### Tables and views

- `GovernedDataTable`
- `ColumnVisibilityManager`
- `FieldAuthorizationCell`
- `BulkActionGuard`
- `ExportGuard`
- `SavedFilterManager`
- `BoardListSwitcher`
- `MapTableSwitcher`

### Forms

- `FormSection`
- `FormProgress`
- `FormErrorSummary`
- `AutosaveIndicator`
- `UnsavedChangesGuard`
- `RepeatableFieldGroup`
- `EvidenceUploader`
- `ExternalReferencePicker`
- `EffectiveDateRange`
- `ApprovalRequirementsPanel`

---

# 21. Route-level Next.js files

Each major route should normally contain:

```text
page.tsx
loading.tsx
error.tsx
```

Use `not-found.tsx` at meaningful entity boundaries.

Example:

```text
fft/
└── opportunities/
    ├── page.tsx
    ├── loading.tsx
    ├── error.tsx
    ├── new/
    │   └── page.tsx
    └── [opportunityId]/
        ├── layout.tsx
        ├── page.tsx
        ├── loading.tsx
        ├── error.tsx
        ├── not-found.tsx
        ├── activities/
        │   └── page.tsx
        ├── assessment/
        │   └── page.tsx
        ├── trial/
        │   └── page.tsx
        ├── quotes/
        │   └── page.tsx
        ├── approvals/
        │   └── page.tsx
        └── audit/
            └── page.tsx
```

---

# 22. Intercepting routes and parallel routes

Use these selectively.

## Intercepting route candidates

Suitable for quick record inspection without losing list context:

- Account quick view
- Farm quick view
- Opportunity quick view
- Quote preview
- Audit event detail
- Integration failure detail

Example concept:

```text
/fft/opportunities
→ open opportunity in modal
→ direct URL remains /fft/opportunities/[id]
```

## Parallel route candidates

Potentially useful for:

- Approval inbox
- Contextual activity panel
- Persistent audit panel
- Integration warnings
- Entity detail side panel

Avoid making the route structure difficult to understand merely to demonstrate framework features.

---

# 23. URL and routing rules

## Required rules

1. Use stable English route segments.
2. Do not place translated labels in URLs.
3. Use opaque stable IDs or approved slugs.
4. Do not encode tenant authority through editable query parameters.
5. Tenant and organization context must come from authenticated context.
6. Query parameters may control filters, view state, pagination, and sorting.
7. Mutations must not be initiated through GET routes.
8. Sensitive action state must not depend only on hidden buttons.
9. Invalid or inaccessible records should fail closed.
10. Cross-tenant shared records must use relationship-aware authorization.

### Recommended query parameters

```text
?view=board
?status=open
?species=swine
?territory=south
?owner=me
?period=2026-07
?page=2
?sort=-expectedTons
```

---

# 24. Permission-aware frontend model

Every page should distinguish:

- Page access
- Record access
- Field access
- Action access
- Export access
- Approval access
- Override access
- Replay access
- Shared-record access

Example:

```tsx
<PermissionBoundary permission="fft.quotation.issue">
  <IssueQuoteButton />
</PermissionBoundary>
```

However, frontend permission boundaries are presentation controls only. Server actions and backend application services must repeat authorization.

### Action examples

```text
fft.event.create
fft.event.activate
fft.order.submit
fft.order.transfer
fft.allocation.preview
fft.allocation.run
fft.allocation.override
fft.audit.view
fft.export.orders
fft.account.create
fft.farm.manage
fft.opportunity.advance
fft.trial.approve
fft.quotation.issue
fft.quotation.approve-pricing
fft.forecast.freeze
fft.relationship.activate
fft.relationship.revoke
fft.case.close
fft.integration.replay
```

These are conceptual names only. The implementation must use controlled permission codes and must not invent catalog entries from UI design alone.

---

# 25. Responsive behavior

## Desktop

- Persistent module navigation
- Wide data tables
- Split-pane detail
- Board and map views
- Side panels for context
- Dense but readable commercial summaries

## Tablet

- Collapsible navigation
- Reduced columns
- Sticky action bar
- Drawer-based filters
- Two-column forms

## Mobile web

Prioritize:

- Today
- Farm lookup
- Visit capture
- Activity completion
- Opportunity next action
- Assessment capture
- Trial observation
- Quote status
- Order status
- Complaint evidence

Complex pricing, allocation, workflow design, and administration should remain desktop-first.

---

# 26. Required UI states

Every feature must provide:

- Loading
- Empty
- Error
- Restricted
- Read-only
- Stale data
- Integration unavailable
- Partial data
- Unsaved changes
- Processing
- Success
- Conflict
- Archived
- Superseded
- Deleted or unavailable

### Specialized FFT states

- Order window closed
- Supply exhausted
- Allocation shortfall
- Margin approval required
- Credit blocked
- Trial deviated
- Forecast frozen
- External system stale
- Shared scope expired
- Relationship revoked
- Lot reference unavailable
- Export awaiting approval

---

# 27. Search and command palette

The application-wide command palette should register FFT entries.

## Searchable entities

- Accounts
- Farms
- Contacts
- Opportunities
- Assessments
- Trials
- Quotes
- Contracts
- Orders
- Products
- Cases
- Trade Relationships

## Quick actions

- Create opportunity
- Record visit
- Start assessment
- Start trial
- Create quote
- Open forecast
- Submit order
- Find complaint
- View integration health

Search results must honor field-level and relationship-aware authorization.

---

# 28. Notifications and approval inbox

## `/fft/approvals`

This may be a dedicated route or a filtered global approval surface.

### Approval types

- Event activation
- Allocation override
- Pricing exception
- Margin exception
- Credit exception
- Trial result
- Quote issue
- Contract activation
- Forecast freeze or override
- Trade Relationship activation
- Complaint closure
- Data export
- Integration replay

### Components

- `ApprovalInbox`
- `ApprovalTypeBadge`
- `ApprovalRiskSummary`
- `ApprovalEvidencePanel`
- `ApprovalDecisionForm`
- `ApprovalDelegationNotice`

---

# 29. Recommended delivery waves

## Wave 1 — Existing operational FFT

Routes:

```text
/fft
/fft/events
/fft/events/new
/fft/events/[eventId]
/fft/events/[eventId]/products
/fft/events/[eventId]/supply
/fft/events/[eventId]/priority
/fft/events/[eventId]/orders
/fft/events/[eventId]/allocation
/fft/orders
/fft/orders/[orderId]
/fft/allocation
/fft/audit
/fft/admin/exports
```

This corresponds to FT5–FT8 and the Living AdminCN journey.

---

## Wave 2 — Commercial graph

Routes:

```text
/fft/accounts
/fft/accounts/[accountId]
/fft/farms
/fft/farms/[farmId]
/fft/activities
/fft/visits/[visitId]
/fft/admin/data-quality
```

Dependencies:

- Party and Farm graph
- Master-data identity resolution
- Field authorization
- Program reopen

---

## Wave 3 — Commercial conversion

Routes:

```text
/fft/opportunities
/fft/opportunities/[opportunityId]
/fft/assessments
/fft/assessments/[assessmentId]
/fft/trials
/fft/trials/[trialId]
/fft/products
/fft/price-books
/fft/quotes
/fft/quotes/[quoteId]
/fft/contracts
/fft/contracts/[contractId]
```

Dependencies:

- Opportunity aggregate
- Assessment and trial evidence classes
- Quote lifecycle
- Approval contracts
- ERP integration boundary

---

## Wave 4 — Planning, collaboration, and evidence

Routes:

```text
/fft/forecast
/fft/forecast/consumption
/fft/forecast/snapshots
/fft/forecast/assumptions
/fft/targets
/fft/performance
/fft/relationships
/fft/relationships/[relationshipId]
/fft/shared-records
/fft/cases
/fft/cases/[caseId]
/fft/admin/integrations
/fft/admin/integrations/[connectorId]
```

These align with FT15–FT18 and require promoted contracts and evidence gates before implementation.

---

# 30. Enterprise frontend acceptance criteria

| ID            | Acceptance criterion                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **FFT-UI-01** | Every FFT route validates FFT access and current organization context server-side.                                                |
| **FFT-UI-02** | Navigation items appear only when entitlement, feature state, and permissions permit access.                                      |
| **FFT-UI-03** | Pages remain thin and do not contain domain calculations or direct database mutations.                                            |
| **FFT-UI-04** | Every governed mutation uses a server action or approved API and repeats authorization server-side.                               |
| **FFT-UI-05** | Tenant and organization identifiers cannot be overridden through editable client input.                                           |
| **FFT-UI-06** | Every list supports empty, loading, error, restricted, and partial-data states.                                                   |
| **FFT-UI-07** | Every material record shows status, owner, source, last update, and audit access.                                                 |
| **FFT-UI-08** | Sensitive fields are removed from unauthorized server responses, not merely hidden with CSS.                                      |
| **FFT-UI-09** | Issued quotes and frozen forecasts display immutable-state banners and revision actions.                                          |
| **FFT-UI-10** | Stage, approval, override, closure, and revocation actions require visible reasons where mandated.                                |
| **FFT-UI-11** | Tables provide server-side filtering, pagination, sorting, saved views, and authorized exports.                                   |
| **FFT-UI-12** | KPI cards disclose definition, version, refresh time, source, and drill-through.                                                  |
| **FFT-UI-13** | External-system data shows source and freshness and remains read-only unless a governed request is supported.                     |
| **FFT-UI-14** | Shared records visibly identify owner, participants, scope, and relationship status.                                              |
| **FFT-UI-15** | Relationship revocation immediately removes future access while preserving authorized historical evidence.                        |
| **FFT-UI-16** | Trial screens distinguish evidence class, protocol version, deviations, approval, and acknowledgment.                             |
| **FFT-UI-17** | Forecast overrides preserve the original value, new value, actor, time, and reason.                                               |
| **FFT-UI-18** | Integration failures, replay actions, and reconciliation results are visible to authorized operators.                             |
| **FFT-UI-19** | Critical workflows meet WCAG 2.2 AA expectations and are keyboard operable.                                                       |
| **FFT-UI-20** | Responsive layouts preserve all critical actions without requiring horizontal page scrolling on supported mobile widths.          |
| **FFT-UI-21** | Page-level loading and error boundaries prevent one failed panel from crashing the full module shell where isolation is possible. |
| **FFT-UI-22** | No Wave 2–4 route becomes visible or deployable without its approved feature and domain gate.                                     |

---

# 31. Final recommended route map

```text
/fft
├── events
│   ├── new
│   └── [eventId]
│       ├── products
│       ├── supply
│       ├── priority
│       ├── orders
│       ├── allocation
│       ├── documents
│       ├── activity
│       └── audit
├── orders
│   └── [orderId]
├── allocation
├── audit
├── approvals
│
├── accounts
│   ├── new
│   └── [accountId]
├── farms
│   ├── new
│   └── [farmId]
├── activities
├── visits
│   └── [visitId]
├── opportunities
│   ├── new
│   └── [opportunityId]
├── assessments
│   ├── new
│   └── [assessmentId]
├── trials
│   ├── new
│   └── [trialId]
├── products
│   └── [productId]
├── price-books
│   └── [priceBookId]
├── quotes
│   ├── new
│   └── [quoteId]
├── contracts
│   └── [contractId]
├── cases
│   ├── new
│   └── [caseId]
│
├── forecast
│   ├── opportunity
│   ├── commitment
│   ├── consumption
│   ├── snapshots
│   └── assumptions
├── targets
│   └── [targetId]
├── performance
│
├── relationships
│   ├── new
│   └── [relationshipId]
├── shared-records
├── dealers
│
└── admin
    ├── configuration
    │   ├── general
    │   ├── pipelines
    │   ├── activities
    │   ├── assessments
    │   ├── trials
    │   ├── quotes
    │   ├── forecast
    │   ├── kpis
    │   ├── cases
    │   └── custom-fields
    ├── workflows
    ├── integrations
    │   └── [connectorId]
    ├── data-quality
    ├── imports
    ├── exports
    └── access
```

# Recommended decision

Adopt this complete route map as the **target FFT frontend information architecture**, but classify it into two clear states:

- **Living routes:** event, order, allocation, audit, and governed export.
- **Target routes:** Party/Farm 360, opportunities, assessments, trials, pricing, quotes, contracts, forecasts, relationships, cases, and integration operations.

The frontend should be implemented as a **thin Next.js App Router composition over controlled FFT domain contracts**, not as a UI-first expansion that invents business rules, permission codes, or new product scope. The implementation slice map specifically requires contracts and controlled reopening before Wave 2–4 product UI is introduced.
