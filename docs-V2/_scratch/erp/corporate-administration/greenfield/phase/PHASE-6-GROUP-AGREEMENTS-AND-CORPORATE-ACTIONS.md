# Phase 6 — Group Structure, Agreements and Corporate Actions

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 6` |
| Initial status | `OPEN` |
| Slice count | 5 |
| Outcome | Deliver a concurrency-safe group/control graph, related-party register, material agreements and evidence-driven corporate lifecycle cases. |

## Execution controls

1. Execute slices strictly in the listed order.
2. Treat the module as greenfield; do not import completion claims from removed code.
3. Inspect current repository instructions, manifests, schemas, migrations and working-tree changes before editing.
4. Implement one vertical slice completely across package, database, events, app composition, Actions, UI and tests where the slice requires those layers.
5. Preserve unrelated working-tree changes. Do not commit or push unless explicitly requested.
6. A required unavailable external lane is `BLOCKED`, not passed.
7. Stop after the selected slice and return the handoff defined in `90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md`.

## Slice summary

| Slice | Title | Depends on | Status |
|---|---|---|---|
| CA-6.1 | Group-control graph and ownership evidence | Phase 5 DONE | OPEN |
| CA-6.2 | Related-party relationships and declarations | CA-6.1 | OPEN |
| CA-6.3 | Material agreements and lifecycle events | CA-6.2 | OPEN |
| CA-6.4 | Corporate-action case framework | CA-6.3 | OPEN |
| CA-6.5 | Corporate-action effects and lifecycle journeys | CA-6.4 | OPEN |

## CA-6.1 — Group-control graph and ownership evidence

**Status:** `OPEN`  
**Depends on:** Phase 5 DONE  
**Goal:** Represent direct and indirect control among internal legal companies and external parties.

### Authoritative surface

- **Tables:** `ca_group_control_relationship`, `ca_group_control_evidence`
- **Commands:** `createGroupControlRelationship`, `amendGroupControlRelationship`, `endGroupControlRelationship`, `recordGroupControlEvidence`
- **Queries:** `getGroupStructureAsOf`, `resolveUltimateParent`, `resolveSubsidiariesAsOf`, `explainControlPath`
- **Events:** `group_control.relationship_created.v1`, `group_control.relationship_ended.v1`

### Binding rules

- Endpoints are internal legal companies or external organization parties.
- Basis includes ownership, voting, contractual, board-control and other configured grounds.
- Percentages are canonical decimals and effective-dated.
- Prohibited cycles are rejected inside a transaction; permitted circular cross-holdings require explicit classification and bounded calculation.
- Control evidence snapshots the calculation/rule basis.

### Required evidence

- Direct/indirect control traversal
- Concurrent cycle attempts
- Same-tenant internal endpoint rules
- Percentage and effective-range behavior
- Graph performance and parity

### Paste-ready Codex prompt

```text
Execute CA-6.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Represent direct and indirect control among internal legal companies and external parties.

Authoritative tables/surfaces: `ca_group_control_relationship`, `ca_group_control_evidence`.
Commands: `createGroupControlRelationship`, `amendGroupControlRelationship`, `endGroupControlRelationship`, `recordGroupControlEvidence`.
Queries: `getGroupStructureAsOf`, `resolveUltimateParent`, `resolveSubsidiariesAsOf`, `explainControlPath`.
Events: `group_control.relationship_created.v1`, `group_control.relationship_ended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Endpoints are internal legal companies or external organization parties.
- Basis includes ownership, voting, contractual, board-control and other configured grounds.
- Percentages are canonical decimals and effective-dated.
- Prohibited cycles are rejected inside a transaction; permitted circular cross-holdings require explicit classification and bounded calculation.
- Control evidence snapshots the calculation/rule basis.

Add direct evidence for:
- Direct/indirect control traversal
- Concurrent cycle attempts
- Same-tenant internal endpoint rules
- Percentage and effective-range behavior
- Graph performance and parity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Group structure and ultimate-control paths are deterministic under concurrent change.

## CA-6.2 — Related-party relationships and declarations

**Status:** `OPEN`  
**Depends on:** CA-6.1  
**Goal:** Record related-party classifications derived from group, officer, ownership or other policies.

### Authoritative surface

- **Tables:** `ca_related_party_relationship`, `ca_related_party_declaration`
- **Commands:** `classifyRelatedParty`, `supersedeRelatedPartyClassification`, `recordRelatedPartyDeclaration`, `resolveRelatedPartyDeclaration`
- **Queries:** `listRelatedPartiesAsOf`, `explainRelatedPartyClassification`, `listUnresolvedRelatedPartyDeclarations`
- **Events:** `related_party.classified.v1`, `related_party.declaration_recorded.v1`

### Binding rules

- Relationship basis and governing policy/rule version are explicit.
- Derived and manually declared relationships are distinguishable.
- Discrepancies are surfaced rather than overwritten.
- Sensitive personal relationships use protected classification/access.
- Classifications can feed agreement, resolution and transaction controls through read-only ports/events.

### Required evidence

- Group/officer/ownership-derived classifications
- Manual-vs-derived discrepancy
- Sensitive authorization
- Effective supersession
- Parity and reconciliation

### Paste-ready Codex prompt

```text
Execute CA-6.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record related-party classifications derived from group, officer, ownership or other policies.

Authoritative tables/surfaces: `ca_related_party_relationship`, `ca_related_party_declaration`.
Commands: `classifyRelatedParty`, `supersedeRelatedPartyClassification`, `recordRelatedPartyDeclaration`, `resolveRelatedPartyDeclaration`.
Queries: `listRelatedPartiesAsOf`, `explainRelatedPartyClassification`, `listUnresolvedRelatedPartyDeclarations`.
Events: `related_party.classified.v1`, `related_party.declaration_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Relationship basis and governing policy/rule version are explicit.
- Derived and manually declared relationships are distinguishable.
- Discrepancies are surfaced rather than overwritten.
- Sensitive personal relationships use protected classification/access.
- Classifications can feed agreement, resolution and transaction controls through read-only ports/events.

Add direct evidence for:
- Group/officer/ownership-derived classifications
- Manual-vs-derived discrepancy
- Sensitive authorization
- Effective supersession
- Parity and reconciliation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Related-party status is explainable, historical and usable by other modules without foreign-table reads.

## CA-6.3 — Material agreements and lifecycle events

**Status:** `OPEN`  
**Depends on:** CA-6.2  
**Goal:** Administer legally material agreements without replacing the transactional package that owns their business execution.

### Authoritative surface

- **Tables:** `ca_material_agreement`, `ca_material_agreement_party`, `ca_material_agreement_event`
- **Commands:** `registerMaterialAgreement`, `amendMaterialAgreement`, `renewMaterialAgreement`, `suspendMaterialAgreement`, `terminateMaterialAgreement`, `expireMaterialAgreement`
- **Queries:** `getMaterialAgreement`, `listMaterialAgreementsAsOf`, `listExpiringMaterialAgreements`, `listRelatedPartyAgreements`
- **Events:** `material_agreement.registered.v1`, `material_agreement.amended.v1`, `material_agreement.terminated.v1`

### Binding rules

- Agreement type, parties/roles, term, governing law, value/currency snapshot, owner and document are explicit.
- Transactional orders, payroll terms or payment execution remain with their owner.
- Related-party classification and approval requirements are resolved at registration/amendment.
- Events preserve amendment/renewal/termination lineage.
- Confidential fields are excluded from normal events/search.

### Required evidence

- Party/role and related-party controls
- Term and renewal chronology
- Confidentiality/redaction
- Concurrent amendment/termination
- Cross-package no-write boundaries

### Paste-ready Codex prompt

```text
Execute CA-6.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Administer legally material agreements without replacing the transactional package that owns their business execution.

Authoritative tables/surfaces: `ca_material_agreement`, `ca_material_agreement_party`, `ca_material_agreement_event`.
Commands: `registerMaterialAgreement`, `amendMaterialAgreement`, `renewMaterialAgreement`, `suspendMaterialAgreement`, `terminateMaterialAgreement`, `expireMaterialAgreement`.
Queries: `getMaterialAgreement`, `listMaterialAgreementsAsOf`, `listExpiringMaterialAgreements`, `listRelatedPartyAgreements`.
Events: `material_agreement.registered.v1`, `material_agreement.amended.v1`, `material_agreement.terminated.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Agreement type, parties/roles, term, governing law, value/currency snapshot, owner and document are explicit.
- Transactional orders, payroll terms or payment execution remain with their owner.
- Related-party classification and approval requirements are resolved at registration/amendment.
- Events preserve amendment/renewal/termination lineage.
- Confidential fields are excluded from normal events/search.

Add direct evidence for:
- Party/role and related-party controls
- Term and renewal chronology
- Confidentiality/redaction
- Concurrent amendment/termination
- Cross-package no-write boundaries

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Material agreements have complete administration and evidence without becoming duplicate transactional contracts.

## CA-6.4 — Corporate-action case framework

**Status:** `OPEN`  
**Depends on:** CA-6.3  
**Goal:** Create a bounded case mechanism for legal-company changes without building a generic workflow engine.

### Authoritative surface

- **Tables:** `ca_corporate_action_case`, `ca_corporate_action_step`, `ca_corporate_action_condition`, `ca_corporate_action_party`
- **Commands:** `openCorporateActionCase`, `addCorporateActionStep`, `assignCorporateActionStep`, `completeCorporateActionStep`, `addCorporateActionCondition`, `satisfyCorporateActionCondition`, `cancelCorporateActionCase`
- **Queries:** `getCorporateActionCase`, `listCorporateActionCases`, `getCorporateActionReadiness`, `listOverdueCorporateActionSteps`
- **Events:** `corporate_action.case_opened.v1`, `corporate_action.step_completed.v1`, `corporate_action.condition_satisfied.v1`

### Binding rules

- Supported types are discriminated and define required steps/conditions/effects.
- Steps reference external approval, document, filing or resolution evidence rather than reimplementing those engines.
- Case completion is blocked until required conditions and approvals are satisfied.
- Case version/CAS protects concurrent coordinators.
- Cancellation preserves completed evidence and reason.

### Required evidence

- Type-specific required-step generation
- Readiness and condition logic
- Stale/concurrent step completion
- External evidence unavailable
- Action UI and accessibility

### Paste-ready Codex prompt

```text
Execute CA-6.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create a bounded case mechanism for legal-company changes without building a generic workflow engine.

Authoritative tables/surfaces: `ca_corporate_action_case`, `ca_corporate_action_step`, `ca_corporate_action_condition`, `ca_corporate_action_party`.
Commands: `openCorporateActionCase`, `addCorporateActionStep`, `assignCorporateActionStep`, `completeCorporateActionStep`, `addCorporateActionCondition`, `satisfyCorporateActionCondition`, `cancelCorporateActionCase`.
Queries: `getCorporateActionCase`, `listCorporateActionCases`, `getCorporateActionReadiness`, `listOverdueCorporateActionSteps`.
Events: `corporate_action.case_opened.v1`, `corporate_action.step_completed.v1`, `corporate_action.condition_satisfied.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Supported types are discriminated and define required steps/conditions/effects.
- Steps reference external approval, document, filing or resolution evidence rather than reimplementing those engines.
- Case completion is blocked until required conditions and approvals are satisfied.
- Case version/CAS protects concurrent coordinators.
- Cancellation preserves completed evidence and reason.

Add direct evidence for:
- Type-specific required-step generation
- Readiness and condition logic
- Stale/concurrent step completion
- External evidence unavailable
- Action UI and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Corporate changes can be coordinated through a bounded, auditable case without generic workflow ownership.

## CA-6.5 — Corporate-action effects and lifecycle journeys

**Status:** `OPEN`  
**Depends on:** CA-6.4  
**Goal:** Implement legal effects for incorporation, name/form change, conversion, merger/reorganization, restoration, strike-off, winding-up and dissolution.

### Authoritative surface

- **Tables:** `ca_corporate_action_effect` plus affected authority tables
- **Commands:** `recordCorporateActionEffect`, `completeCorporateActionCase`, type-specific effect commands
- **Queries:** `getCorporateActionEffects`, `reconcileCorporateActionToCompanyHistory`, `listActionsAwaitingFiling`
- **Events:** `corporate_action.effect_recorded.v1`, `corporate_action.completed.v1` plus type-specific events

### Binding rules

- Effects are immutable, approval gated and applied through existing public domain commands in one controlled transaction or saga boundary.
- Name/form/status/capital/group effects cannot bypass their aggregate invariants.
- Merger/reorganization records predecessor/successor and transfer references without silently moving peer-owned transactions.
- Completion distinguishes legal effectiveness from filing acknowledgement.
- Failed partial effect application must be recoverable and reconciled.

### Required evidence

- Type-specific effect matrices
- Atomic or compensatable effect behavior
- Approval/SoD and evidence
- Reconciliation to company/capital/group history
- Full Phase 6 authenticated journey

### Paste-ready Codex prompt

```text
Execute CA-6.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Implement legal effects for incorporation, name/form change, conversion, merger/reorganization, restoration, strike-off, winding-up and dissolution.

Authoritative tables/surfaces: `ca_corporate_action_effect` plus affected authority tables.
Commands: `recordCorporateActionEffect`, `completeCorporateActionCase`, type-specific effect commands.
Queries: `getCorporateActionEffects`, `reconcileCorporateActionToCompanyHistory`, `listActionsAwaitingFiling`.
Events: `corporate_action.effect_recorded.v1`, `corporate_action.completed.v1` plus type-specific events.

Implement the slice as a production vertical. Apply these binding rules:
- Effects are immutable, approval gated and applied through existing public domain commands in one controlled transaction or saga boundary.
- Name/form/status/capital/group effects cannot bypass their aggregate invariants.
- Merger/reorganization records predecessor/successor and transfer references without silently moving peer-owned transactions.
- Completion distinguishes legal effectiveness from filing acknowledgement.
- Failed partial effect application must be recoverable and reconciled.

Add direct evidence for:
- Type-specific effect matrices
- Atomic or compensatable effect behavior
- Approval/SoD and evidence
- Reconciliation to company/capital/group history
- Full Phase 6 authenticated journey

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 6 closes at 14/14 with legal-company changes coordinated, effected and reconciled without bypassing domain authority.

## Phase-close rule

Phase 6 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
