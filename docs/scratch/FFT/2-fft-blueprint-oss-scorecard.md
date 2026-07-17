# FFT Blueprint vs Agri-OSS Scorecard

> **Status:** Research evaluation  
> **Authority:** Non-authoritative scratch material — does **not** replace Living `FFT-MOD-*`  
> **Assessment date:** 17 July 2026  
> **Primary source:** [1-fft-architecture.md](1-fft-architecture.md)  
> **Downstream:** [3-fft-improvement.md](3-fft-improvement.md) · [4-fft-reconciliation-and-promotion-map.md](4-fft-reconciliation-and-promotion-map.md) · [5-fft-relevant-architecture.md](5-fft-relevant-architecture.md) · [6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md)  
> **Interactive view:** Cursor Canvas `fft-blueprint-oss-scorecard.canvas.tsx`

## 1. Purpose and boundary

This report evaluates the **Feed–Farm–Trade enterprise blueprint** against five agriculture and enterprise open-source products. It enables product and architecture reviewers to:

1. identify the blueprint's strongest feed-industry differentiators;
2. identify areas where established open-source products already provide stronger documented coverage;
3. prioritize enterprise production capabilities for development; and
4. identify blueprint sections that require more precise implementation contracts.

This is a **blueprint-only assessment**. It does not score the current Afenda-Lite FFT implementation, prove implementation readiness, or replace the controlled FFT module documents under [`docs/modules/feed-farm-trade/`](../../modules/feed-farm-trade/).

### 1.1 Interpretation limits

- Scores measure specification quality and documented OSS capability, not deployed behavior.
- An absent feature in public documentation is not proof that no extension or private implementation exists.
- “Best OSS” means the strongest **single** benchmark for that capability. Scores do not combine features from multiple products.
- Odoo capabilities can differ between Community, Enterprise, and third-party extensions.
- Repository popularity is context only; stars do not determine capability scores.
- Priority scores are directional product-planning indicators, not delivery estimates.

---

## 2. Executive assessment

| Measure | Result |
| --- | ---: |
| Blueprint capability areas assessed | 16 |
| Blueprint quality average | **4.7 / 5** |
| Blueprint completeness equivalent | **94%** |
| Strongest-OSS coverage average | **3.9 / 5** |
| Average blueprint lead | **+0.8 points** |

The blueprint is unusually complete for an architecture definition. It covers product boundaries, canonical entities, workflows, acceptance criteria, security controls, measurable non-functional requirements, integration failure handling, and release gates.

Its most defensible distinction is not generic CRM functionality. The product advantage comes from combining:

- technical feed trials;
- farm-cycle consumption forecasting;
- tonnage, revenue, margin, mill-source, and freight economics;
- governed cross-tenant Trade Relationships;
- contract-volume utilization and rebates;
- complaint-to-lot commercial traceability; and
- immutable, source-linked KPI definitions.

### 2.1 Highest development priorities

| Rank | Capability | Priority score | Why it matters |
| ---: | --- | ---: | --- |
| 1 | Technical sales and feed trials | **96** | Largest defensible gap over OSS; connects technical evidence to commercial conversion. |
| 2 | Farm-cycle demand forecasting | **94** | Converts species, capacity, production phase, and consumption assumptions into feed demand. |
| 3 | Trade Relationship network | **92** | Creates a governed feedmill–farm–dealer collaboration model without direct cross-tenant access. |
| 4 | Account and Farm 360 | **90** | Establishes the shared commercial farm graph required by pipeline, trials, forecasting, and service. |
| 5 | Product, pricing, and CPQ | **88** | Competes with mature ERP suites through feed-specific freight, mill, unit, margin, and approval rules. |

### 2.2 Highest blueprint-improvement priorities

| Rank | Improvement | Priority score | Required specification work |
| ---: | --- | ---: | --- |
| 1 | Tenant-isolation execution model | **93** | Add executable threat cases, service-tier transitions, tenant restore, and isolation evidence. |
| 2 | Offline synchronization protocol | **90** | Define ownership, merge rules, deterministic conflicts, attachment queues, replay, and recovery UX. |
| 3 | Canonical integration contracts | **88** | Define feed events, connector ownership, schema evolution, replay authorization, and reconciliation tolerances. |
| 4 | Security policy execution | **87** | Add policy precedence, field classification, break-glass access, and verification mappings. |
| 5 | NFR evidence model | **86** | Bind SLOs to workloads, evidence owners, test procedures, and failure-budget policy. |

---

## 3. Open-source benchmark set

Repository metadata was collected through GitHub MCP on 17 July 2026. Capability evidence was checked against repository READMEs, official product guides, and current ERPNext and Odoo documentation through Context7.

| Project | Repository | Stars | License | Activity | Primary strength | FFT relevance |
| --- | --- | ---: | --- | --- | --- | --- |
| Odoo Community | [`odoo/odoo`](https://github.com/odoo/odoo) | 53,076 | LGPL-3.0 core | Active; pushed 17 Jul 2026 | ERP, CRM, sales, inventory, manufacturing | Strong commercial breadth; agriculture is primarily extension-led. |
| ERPNext | [`frappe/erpnext`](https://github.com/frappe/erpnext) | 36,925 | GPL-3.0 | Active; pushed 17 Jul 2026 | ERP, CRM, orders, manufacturing, accounting | Strong operational backbone; crop-cycle support exists, but the feed-sales vertical is absent. |
| farmOS | [`farmOS/farmOS`](https://github.com/farmOS/farmOS) | 1,311 | GPL-2.0 | Active; pushed 16 Jul 2026 | Farm records, livestock, mapping, sensors | Deep farm-domain model and field records; limited commercial lifecycle. |
| Tania | [`usetania/tania-core`](https://github.com/usetania/tania-core) | 812 | Apache-2.0 | Maintainer-declared unmaintained | Smallholder journal, configurable procedures, IoT | Useful field concepts but not a current enterprise platform benchmark. |
| LiteFarm | [`LiteFarmOrg/LiteFarm`](https://github.com/LiteFarmOrg/LiteFarm) | 226 | GPL-3.0 | Active; pushed 16 Jul 2026 | Sustainable farm planning, tasks, finance, certification | Strong farmer UX and production records; limited B2B commercial depth. |

### 3.1 Benchmark observations

#### Odoo

Odoo is the strongest benchmark for CRM, quotations, pricelists, subscriptions, inventory, manufacturing, reseller management, and operational reporting. Its major limitation for this comparison is that agriculture-specific capability is extension-led rather than a coherent feed-industry commercial model.

#### ERPNext

ERPNext is strongest for order management, accounting, stock, manufacturing, quotations, role-based document permissions, and REST-enabled business operations. It also contains crop-cycle concepts. Its advantage supports an **integrate, do not rebuild** posture for ledger, fulfillment, inventory, and finance.

#### farmOS

farmOS provides the most relevant open agricultural data concepts: assets, logs, quantities, land, plants, animals, equipment, locations, maps, tasks, sensors, and livestock movements. Its field and farm-record model is a useful reference for Farm 360, assessments, and offline capture, but it does not provide FFT's commercial lifecycle.

#### LiteFarm

LiteFarm demonstrates farmer-centered workflows for crops, livestock, farm maps, tasks, expenses, revenue, profitability, documents, and certification exports. It is particularly relevant to mobile usability, localization, sustainable-farm records, and farmer adoption.

#### Tania

Tania demonstrates a simple farm journal, configurable operating procedures, responsive field use, and IoT aspirations. Because maintainers describe the project as unmaintained, it should be treated as a design reference rather than an adoption or platform benchmark.

---

## 4. Scoring model

Each capability receives four measures.

| Measure | Scale | Meaning |
| --- | --- | --- |
| Blueprint quality | 0–5 | Completeness of entities, workflows, controls, acceptance criteria, and measurable requirements. |
| Best-OSS coverage | 0–5 | Strongest documented coverage from one benchmark product. |
| Gap | −5 to +5 | `Blueprint quality − Best-OSS coverage`. Positive means the blueprint is ahead. |
| Feed differentiation | 0–5 | Degree to which the capability depends on feed volume, species, cycles, trials, mill source, freight, or related vertical semantics. |

### 4.1 Quality anchors

| Score | Interpretation |
| ---: | --- |
| 0 | Absent |
| 1 | Mentioned without a usable model |
| 2 | Partial concepts or workflow |
| 3 | Credible functional coverage |
| 4 | Detailed model with meaningful controls |
| 5 | Complete, controlled, measurable, and acceptance-testable specification |

Priority combines:

- enterprise risk;
- feed-industry differentiation;
- blueprint-to-OSS position;
- system dependency order; and
- the cost of rebuilding mature ERP capability.

---

## 5. Capability scorecard

| ID | Capability | Blueprint section | FFT / 5 | Best OSS / 5 | Best OSS | Gap | Feed differentiation / 5 | Work mode | Priority |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- |
| TEN | Multi-tenancy and isolation | §5 | 4.8 | 3.5 | Odoo | +1.3 | 2.0 | Improve blueprint | Critical · 93 |
| F360 | Account and Farm 360 | §7.2 | 4.6 | 4.4 | farmOS | +0.2 | 4.5 | Develop | Critical · 90 |
| CRM | Lead, opportunity, and pipeline | §7.3, §8 | 4.8 | 4.7 | Odoo | +0.1 | 4.2 | Develop | High · 85 |
| FIELD | Field sales and offline mobile | §7.4 | 4.2 | 4.1 | farmOS | +0.1 | 3.7 | Improve blueprint | Critical · 90 |
| TRIAL | Technical sales and feed trials | §7.5 | 4.7 | 2.4 | farmOS | +2.3 | 5.0 | Develop | Critical · 96 |
| CPQ | Product, pricing, and CPQ | §7.6 | 4.8 | 4.7 | Odoo | +0.1 | 4.6 | Develop | Critical · 88 |
| CTR | Contracts, commitments, and rebates | §7.7 | 4.6 | 4.5 | Odoo | +0.1 | 4.5 | Develop | High · 81 |
| FCST | Forecasting and farm-cycle demand | §7.8 | 4.8 | 3.8 | Odoo | +1.0 | 5.0 | Develop | Critical · 94 |
| OTC | Order, delivery, and credit visibility | §7.9 | 4.5 | 4.9 | ERPNext | **−0.4** | 3.5 | Develop through integration | High · 77 |
| TRADE | Trade and channel collaboration | §5.4, §7.10 | 4.9 | 3.5 | Odoo | +1.4 | 5.0 | Develop | Critical · 92 |
| TRACE | Complaints and traceability | §7.11 | 4.7 | 4.4 | Odoo | +0.3 | 4.8 | Develop | High · 79 |
| KPI | KPI framework and analytics | §10 | 4.8 | 4.3 | Odoo | +0.5 | 4.5 | Improve blueprint | High · 78 |
| INT | Integration backbone | §9 | 4.8 | 3.8 | ERPNext | +1.0 | 3.5 | Improve blueprint | Critical · 88 |
| SEC | Security and authorization | §12, §13 | 4.8 | 4.1 | Odoo | +0.7 | 2.0 | Improve blueprint | Critical · 87 |
| NFR | Enterprise NFRs and release gates | §12, §15 | 5.0 | 3.5 | Odoo | +1.5 | 2.0 | Improve blueprint | Critical · 86 |
| AI | Analytics and AI governance | §14 | 4.5 | 2.0 | Odoo | +2.5 | 3.5 | Improve blueprint | Medium · 70 |

### 5.1 Portfolio interpretation

The strongest high-differentiation and positive-gap capabilities are:

- `TRIAL` — technical sales and feed trials;
- `FCST` — farm-cycle demand forecasting;
- `TRADE` — governed cross-tenant commercial collaboration;
- `TRACE` — commercial complaint-to-lot traceability; and
- `F360` — the commercial farm graph.

These capabilities should define FFT's product identity.

The `OTC` result is intentionally different. ERPNext and Odoo already provide mature order, delivery, inventory, credit, and finance functions. FFT should preserve the blueprint's system-of-record boundary and provide governed visibility and workflow requests rather than recreate those ledgers.

---

## 6. Development priorities

### 6.1 Technical sales and feed trials — 96

Implement the governed flow from farm baseline through trial result and commercial conversion:

- configurable assessment templates;
- species- and production-phase questions;
- baseline and trial-group measurements;
- protocol, dates, samples, observations, and evidence;
- tenant-defined success calculations;
- technical and customer approval;
- source-linked recommendations; and
- conversion into opportunity, quote, contract, or order request.

This capability must not present automated recommendations as veterinary diagnoses.

### 6.2 Farm-cycle demand forecasting — 94

Define and implement:

- opportunity, commercial-commitment, and consumption forecasts;
- farm capacity and production-cycle assumptions;
- feed consumption by species and phase;
- immutable forecast snapshots;
- authorized overrides with reasons;
- actual-sales reconciliation;
- forecast accuracy and bias; and
- drill-through from aggregate demand to authorized farms and assumptions.

### 6.3 Governed Trade Relationships — 92

Make cross-tenant collaboration explicit rather than exposing tenant-internal records:

- participating tenants and mapped legal entities/sites;
- directional data-sharing scopes;
- consent or agreement versions;
- effective and expiry dates;
- shared-record ownership;
- revocation and historical retention;
- dispute and correction handling; and
- immutable access and sharing audit events.

### 6.4 Account and Farm 360 — 90

Establish the canonical commercial graph:

- account and prospect;
- farm group, farm site, and delivery point;
- contacts and decision roles;
- species, production types, capacities, and cycles;
- current feed program and estimated requirement;
- territories, mills, and route context;
- ERP customer and site references; and
- identity matching, duplicate detection, and master-data conflict handling.

### 6.5 Feed-specific CPQ — 88

Use mature ERP patterns while differentiating on:

- product applicability by species and life stage;
- supplying feedmill;
- bulk, bag, pallet, and unit conversion;
- freight zones and route charges;
- contract and commodity-index pricing;
- margin floors and approval limits;
- immutable issued quote versions; and
- quote-to-order idempotency.

### 6.6 Lead and opportunity control — 85

Retain the blueprint's strongest commercial semantics:

- physical tons alongside revenue and margin;
- species and production phase;
- mill source and expected first delivery;
- stage-controlled probability;
- mandatory future next action;
- controlled stage and close-date changes;
- standardized loss reason; and
- accepted quote, contract, or order evidence for won business.

### 6.7 Contracts, commitments, and rebates — 81

Prioritize feed-specific execution over generic document storage:

- volume commitments and call-offs;
- utilization by site, species, product, and period;
- price formulas and freight terms;
- rebate tiers, accrual, and settlement;
- renewal alerts; and
- approval and signature history.

### 6.8 Complaint-to-lot traceability — 79

Keep FFT as the commercial case graph. Link to, but do not duplicate, QMS/LIMS execution:

- account, farm, order, delivery, invoice, product, and lot;
- quantity and commercial impact;
- photo and document evidence;
- certificate and quality-case references;
- corrective-action reference; and
- replacement or credit-note status.

### 6.9 Order, delivery, and credit visibility — 77

Integrate authoritative ERP, WMS, TMS, and finance data. FFT should:

- display status and exceptions;
- submit governed requests;
- preserve idempotency and source references;
- reconcile imported totals;
- expose connector failures and replay status; and
- prevent commercial users from modifying accounting records directly.

---

## 7. Blueprint-improvement priorities

### 7.1 Tenant-isolation execution model — 93

The blueprint has a strong isolation model but needs implementable contracts for:

- threat cases across API, SQL, cache, search, storage, events, exports, and analytics;
- tenant-tier transitions between pooled and dedicated deployment;
- immutable tenant ownership and migration;
- tenant-scoped backup export, restore, deletion, and legal hold;
- support-access approval and expiry;
- noisy-neighbor workload profiles; and
- automated isolation evidence required before release.

### 7.2 Offline synchronization protocol — 90

Specify:

- local ownership and record version identifiers;
- conflict categories and deterministic resolution;
- append-only versus editable record behavior;
- attachment upload queues and integrity checks;
- retry, replay, and duplicate prevention;
- user-visible unresolved conflicts;
- authentication expiry while offline; and
- restart and network-loss recovery tests.

### 7.3 Canonical integration contracts — 88

The blueprint names sound patterns but not the canonical payloads. Add:

- event catalogue and ownership;
- schemas for customer, product, quote, order, delivery, invoice, lot, and payment status;
- version compatibility and deprecation;
- source identifiers and idempotency scope;
- mapping-version history;
- replay authorization;
- connector-specific reconciliation tolerances; and
- sensitive-data classification for payloads and dead-letter records.

### 7.4 Security policy execution — 87

Expand the authorization model with:

- policy conflict precedence;
- role-template versus attribute-policy boundaries;
- field-classification registry;
- step-up authentication triggers;
- break-glass approval, expiry, and review;
- service-account constraints;
- export-specific authorization; and
- acceptance-test mappings for each security control.

### 7.5 NFR evidence model — 86

The blueprint's targets are strong. Make them executable by defining:

- workload and network profiles;
- supported tenant and data-volume bands;
- evidence owners and review cadence;
- measurement windows and exclusions;
- failure budgets and escalation;
- release-blocking thresholds;
- disaster-recovery exercise procedure; and
- retention of performance, security, accessibility, and recovery evidence.

### 7.6 KPI semantic lifecycle — 78

Add:

- semantic versioning for KPI definitions;
- effective-date transitions;
- late-arriving data and restatement rules;
- reconciliation tolerances;
- source-system outage behavior;
- historical snapshot reproducibility; and
- authorized drill-through behavior.

### 7.7 AI evaluation and retirement controls — 70

Extend the current governance controls with:

- representative evaluation datasets;
- accuracy, safety, and drift thresholds;
- source-grounding checks;
- human appeal and correction flow;
- prompt-injection test coverage;
- model and prompt rollback;
- model retirement and record retention; and
- per-tenant usage and cost evidence.

---

## 8. Recommended product posture

FFT should not compete with established OSS products by recreating general-purpose ERP, accounting, inventory, manufacturing, or farm-journal breadth.

The product should:

1. **Own the feed-industry commercial graph** — customer, farm, site, species, production cycle, opportunity, trial, quote, contract, and demand.
2. **Own governed commercial decisions** — pipeline stage, price exception, margin approval, forecast snapshot, trade-sharing scope, and complaint handling.
3. **Integrate operational systems of record** — ERP, formulation, MES, WMS, TMS, LIMS, QMS, finance, and farm platforms.
4. **Differentiate through physical and technical semantics** — tons, feed phase, feed form, mill source, freight, consumption, feed conversion, and trial results.
5. **Prove enterprise controls** — tenant isolation, auditability, offline integrity, reconciliation, recovery, accessibility, and measurable SLOs.

The resulting boundary is:

> **farmOS/LiteFarm depth for farm context + Odoo/ERPNext discipline for commercial operations + FFT-specific feed-sales, trials, demand, and trade governance.**

This is a comparison of capability patterns, not a recommendation to combine or copy those codebases.

---

## 9. Evidence register

| Evidence | Use |
| --- | --- |
| [FFT Enterprise Product and Architecture Definition](1-fft-architecture.md) | Primary scoring subject |
| [farmOS repository](https://github.com/farmOS/farmOS) | Repository metadata and product description |
| [farmOS User Guide](https://farmos.org/guide/) | Assets, logs, quantities, mapping, tasks, livestock, and sensors |
| [LiteFarm repository](https://github.com/LiteFarmOrg/LiteFarm) | Repository metadata, architecture, mobile web, and certification services |
| [LiteFarm product site](https://www.litefarm.org/) | Crops, livestock, tasks, finances, localization, and adoption |
| [Tania repository](https://github.com/usetania/tania-core) | Repository metadata and project status |
| [Tania product site](https://usetania.org/) | Journal, configurable procedures, IoT, and license |
| [ERPNext repository](https://github.com/frappe/erpnext) | Repository metadata, ERP scope, and REST-enabled framework |
| Context7 `/frappe/erpnext` | Quotations, price lists, CRM, orders, permissions, and crop cycle |
| [Odoo repository](https://github.com/odoo/odoo) | Repository metadata and application scope |
| Context7 `/websites/odoo` | CRM, pipeline, reporting, multi-company, and access-control coverage |

---

## 10. Maintenance triggers

Refresh this scorecard when:

- the source blueprint changes materially;
- an assessed OSS project changes architecture or maintenance status;
- FFT adopts, replaces, or rejects a benchmark pattern;
- implementation scoring is explicitly commissioned as a separate assessment;
- the relevant architecture ([5](5-fft-relevant-architecture.md)) or FT slice map ([6](6-fft-implementation-slice-map.md)) changes the Adopt/Defer set; or
- a controlled FFT document accepts priorities derived from this scratch analysis.

This scratch report must not silently become architecture authority. Accepted product locks and implementation requirements belong in the controlled FFT module document set. Slice discovery continues in [6-fft-implementation-slice-map.md](6-fft-implementation-slice-map.md).
