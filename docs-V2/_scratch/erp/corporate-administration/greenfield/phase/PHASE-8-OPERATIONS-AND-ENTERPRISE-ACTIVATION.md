# Phase 8 — Operational Services and Enterprise Activation

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 8` |
| Initial status | `OPEN` |
| Slice count | 6 |
| Outcome | Add rebuildable operational services, controlled data exchange, enterprise hardening and activate only after the complete matrix is green. |

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
| CA-8.1 | Search projectors, checkpoints and rebuild | Phase 7 DONE | OPEN |
| CA-8.2 | Reminder eligibility and dispatch handoff | CA-8.1 | OPEN |
| CA-8.3 | Controlled import workflow | CA-8.2 | OPEN |
| CA-8.4 | Exports, reconciliation and entity health | CA-8.3 | OPEN |
| CA-8.5 | Enterprise security, accessibility, performance, observability and recovery | CA-8.4 | OPEN |
| CA-8.6 | Full verification matrix, migration rehearsal and activation | CA-8.5 | OPEN |

## CA-8.1 — Search projectors, checkpoints and rebuild

**Status:** `OPEN`  
**Depends on:** Phase 7 DONE  
**Goal:** Provide redacted tenant-scoped search without making the index authoritative.

### Authoritative surface

- **Tables:** `ca_projector_checkpoint` and approved `@afenda/search` documents
- **Commands:** `rebuildCorporateSearchProjection`, `replayCorporateSearchProjection` (administrative)
- **Queries:** `searchCorporateRecords`, `getCorporateSearchProjectionStatus`
- **Events:** Consumes registered CA events; emits projector diagnostics only where governed

### Binding rules

- Projection application is idempotent and version/checkpoint aware.
- Duplicate/out-of-order events are handled deterministically.
- Only approved redacted fields are searchable.
- Rebuild starts from authority and reconciles counts/digests.
- Search results link back to permission-checked authoritative queries.

### Required evidence

- Replay, duplicate and out-of-order events
- Tenant isolation and redaction
- Full rebuild/reconciliation
- Stale checkpoint detection
- Search performance and authorization

### Paste-ready Codex prompt

```text
Execute CA-8.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Provide redacted tenant-scoped search without making the index authoritative.

Authoritative tables/surfaces: `ca_projector_checkpoint` and approved `@afenda/search` documents.
Commands: `rebuildCorporateSearchProjection`, `replayCorporateSearchProjection` (administrative).
Queries: `searchCorporateRecords`, `getCorporateSearchProjectionStatus`.
Events: Consumes registered CA events; emits projector diagnostics only where governed.

Implement the slice as a production vertical. Apply these binding rules:
- Projection application is idempotent and version/checkpoint aware.
- Duplicate/out-of-order events are handled deterministically.
- Only approved redacted fields are searchable.
- Rebuild starts from authority and reconciles counts/digests.
- Search results link back to permission-checked authoritative queries.

Add direct evidence for:
- Replay, duplicate and out-of-order events
- Tenant isolation and redaction
- Full rebuild/reconciliation
- Stale checkpoint detection
- Search performance and authorization

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Search is useful, rebuildable, redacted and incapable of authorizing or mutating legal truth.

## CA-8.2 — Reminder eligibility and dispatch handoff

**Status:** `OPEN`  
**Depends on:** CA-8.1  
**Goal:** Handoff deterministic reminders for expiries, due filings, declarations, actions and vacancies.

### Authoritative surface

- **Tables:** `ca_reminder_dispatch`
- **Commands:** `prepareCorporateReminders`, `recordReminderDispatchResult`
- **Queries:** `listPendingCorporateReminders`, `getReminderDispatchHistory`
- **Events:** `corporate_reminder.eligible.v1`, `corporate_reminder.dispatch_recorded.v1`

### Binding rules

- Eligibility derives from authoritative dates/status and injected clock/timezone.
- Dispatch identity is durable and deduplicated.
- Scheduling and delivery remain external.
- Payloads are redacted and recipient resolution is permission/contact-policy aware.
- Retry does not duplicate a successfully acknowledged dispatch.

### Required evidence

- Date/timezone boundaries
- Deduplication and replay
- External dispatch failure/retry
- Recipient redaction
- Backlog observability

### Paste-ready Codex prompt

```text
Execute CA-8.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Handoff deterministic reminders for expiries, due filings, declarations, actions and vacancies.

Authoritative tables/surfaces: `ca_reminder_dispatch`.
Commands: `prepareCorporateReminders`, `recordReminderDispatchResult`.
Queries: `listPendingCorporateReminders`, `getReminderDispatchHistory`.
Events: `corporate_reminder.eligible.v1`, `corporate_reminder.dispatch_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Eligibility derives from authoritative dates/status and injected clock/timezone.
- Dispatch identity is durable and deduplicated.
- Scheduling and delivery remain external.
- Payloads are redacted and recipient resolution is permission/contact-policy aware.
- Retry does not duplicate a successfully acknowledged dispatch.

Add direct evidence for:
- Date/timezone boundaries
- Deduplication and replay
- External dispatch failure/retry
- Recipient redaction
- Backlog observability

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Reminders are deterministic and reliable without embedding a fake scheduler or notification engine.

## CA-8.3 — Controlled import workflow

**Status:** `OPEN`  
**Depends on:** CA-8.2  
**Goal:** Import greenfield or migration data through validation, dry run, approval, quarantine and public commands.

### Authoritative surface

- **Tables:** `ca_import_batch`, `ca_import_row`
- **Commands:** `createCorporateImportBatch`, `validateCorporateImportBatch`, `approveCorporateImportBatch`, `applyCorporateImportBatch`, `retryCorporateImportRow`, `cancelCorporateImportBatch`
- **Queries:** `getCorporateImportBatch`, `listCorporateImportRows`, `getImportReconciliation`
- **Events:** `corporate_import.batch_created.v1`, `corporate_import.batch_applied.v1`, `corporate_import.row_quarantined.v1`

### Binding rules

- Source checksum, schema version, mode and mutable-field allowlist are explicit.
- Dry run produces normalized row errors and unresolved party/reference quarantine.
- Prepare/approve/apply permissions are segregated.
- Apply invokes public package commands; no direct authority-table bypass.
- Per-row atomicity, replay and batch reconciliation are mandatory.

### Required evidence

- Schema/checksum validation
- Dry run and quarantine
- Approval/SoD
- Partial failure/retry/idempotency
- Large batch performance and tenant security

### Paste-ready Codex prompt

```text
Execute CA-8.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Import greenfield or migration data through validation, dry run, approval, quarantine and public commands.

Authoritative tables/surfaces: `ca_import_batch`, `ca_import_row`.
Commands: `createCorporateImportBatch`, `validateCorporateImportBatch`, `approveCorporateImportBatch`, `applyCorporateImportBatch`, `retryCorporateImportRow`, `cancelCorporateImportBatch`.
Queries: `getCorporateImportBatch`, `listCorporateImportRows`, `getImportReconciliation`.
Events: `corporate_import.batch_created.v1`, `corporate_import.batch_applied.v1`, `corporate_import.row_quarantined.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Source checksum, schema version, mode and mutable-field allowlist are explicit.
- Dry run produces normalized row errors and unresolved party/reference quarantine.
- Prepare/approve/apply permissions are segregated.
- Apply invokes public package commands; no direct authority-table bypass.
- Per-row atomicity, replay and batch reconciliation are mandatory.

Add direct evidence for:
- Schema/checksum validation
- Dry run and quarantine
- Approval/SoD
- Partial failure/retry/idempotency
- Large batch performance and tenant security

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Imports are controlled, reviewable and incapable of bypassing domain invariants.

## CA-8.4 — Exports, reconciliation and entity health

**Status:** `OPEN`  
**Depends on:** CA-8.3  
**Goal:** Produce deterministic register exports and continuously expose discrepancies/completeness.

### Authoritative surface

- **Tables:** `ca_export_job`, `ca_reconciliation_run`, `ca_reconciliation_finding`, `ca_entity_health_projection`, optional `ca_register_projection`
- **Commands:** `requestCorporateExport`, `runCorporateReconciliation`, `resolveReconciliationFinding`, `rebuildEntityHealthProjection`
- **Queries:** `getCorporateExportJob`, `getReconciliationRun`, `listReconciliationFindings`, `getCorporateEntityHealth`
- **Events:** `corporate_export.requested.v1`, `corporate_reconciliation.completed.v1`, `entity_health.rebuilt.v1`

### Binding rules

- Exports are permission-gated, schema-versioned, redacted and deterministically ordered.
- Sensitive exports use dedicated permission, reason and audit.
- Reconciliation covers root/history, capital ledger/holdings/certificates, UBO chains, obligations/submissions, documents/registers and projections.
- Entity health shows missing roles, expired licences, overdue filings, unresolved UBO discrepancies, missing evidence and unreconciled facts.
- Findings never silently repair authority.

### Required evidence

- Deterministic export digests
- Sensitive-export controls
- Reconciliation discrepancy fixtures
- Health rebuild and projection reconciliation
- Large dataset streaming/performance

### Paste-ready Codex prompt

```text
Execute CA-8.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Produce deterministic register exports and continuously expose discrepancies/completeness.

Authoritative tables/surfaces: `ca_export_job`, `ca_reconciliation_run`, `ca_reconciliation_finding`, `ca_entity_health_projection`, optional `ca_register_projection`.
Commands: `requestCorporateExport`, `runCorporateReconciliation`, `resolveReconciliationFinding`, `rebuildEntityHealthProjection`.
Queries: `getCorporateExportJob`, `getReconciliationRun`, `listReconciliationFindings`, `getCorporateEntityHealth`.
Events: `corporate_export.requested.v1`, `corporate_reconciliation.completed.v1`, `entity_health.rebuilt.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Exports are permission-gated, schema-versioned, redacted and deterministically ordered.
- Sensitive exports use dedicated permission, reason and audit.
- Reconciliation covers root/history, capital ledger/holdings/certificates, UBO chains, obligations/submissions, documents/registers and projections.
- Entity health shows missing roles, expired licences, overdue filings, unresolved UBO discrepancies, missing evidence and unreconciled facts.
- Findings never silently repair authority.

Add direct evidence for:
- Deterministic export digests
- Sensitive-export controls
- Reconciliation discrepancy fixtures
- Health rebuild and projection reconciliation
- Large dataset streaming/performance

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Operators can export certified views and see exactly where corporate records are incomplete or inconsistent.

## CA-8.5 — Enterprise security, accessibility, performance, observability and recovery

**Status:** `OPEN`  
**Depends on:** CA-8.4  
**Goal:** Harden every shipped surface and prove operational recovery.

### Authoritative surface

- **Tables:** No new catch-all domain tables; indexes/diagnostic metadata only when evidence requires
- **Commands:** Existing commands only; operational repair commands must remain explicit and permission gated
- **Queries:** Coverage, health and diagnostics queries only
- **Events:** No unregistered events

### Binding rules

- Build command/query/permission/event/table/export/route coverage matrices.
- Scan logs, audits, events, search and exports for sensitive leakage.
- Run keyboard, focus, labels, dialogs, tables, announcements and destructive-action accessibility checks.
- Measure representative tenants; add only evidence-based indexes and deterministic cursor pagination.
- Add metrics/traces for command errors, conflicts, approvals, outbox/projector lag, reminders, imports, reconciliations and DB locks.
- Prove outbox replay, projector rebuild, reminder retry, import retry and forward-repair runbooks.

### Required evidence

- Security/authorization matrix
- Accessibility suite
- EXPLAIN/query-count/performance thresholds
- Observability assertions and redaction
- Recovery and disaster-rehearsal scenarios

### Paste-ready Codex prompt

```text
Execute CA-8.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Harden every shipped surface and prove operational recovery.

Authoritative tables/surfaces: No new catch-all domain tables; indexes/diagnostic metadata only when evidence requires.
Commands: Existing commands only; operational repair commands must remain explicit and permission gated.
Queries: Coverage, health and diagnostics queries only.
Events: No unregistered events.

Implement the slice as a production vertical. Apply these binding rules:
- Build command/query/permission/event/table/export/route coverage matrices.
- Scan logs, audits, events, search and exports for sensitive leakage.
- Run keyboard, focus, labels, dialogs, tables, announcements and destructive-action accessibility checks.
- Measure representative tenants; add only evidence-based indexes and deterministic cursor pagination.
- Add metrics/traces for command errors, conflicts, approvals, outbox/projector lag, reminders, imports, reconciliations and DB locks.
- Prove outbox replay, projector rebuild, reminder retry, import retry and forward-repair runbooks.

Add direct evidence for:
- Security/authorization matrix
- Accessibility suite
- EXPLAIN/query-count/performance thresholds
- Observability assertions and redaction
- Recovery and disaster-rehearsal scenarios

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Every surface is secure, accessible, observable, performant and recoverable under representative load.

## CA-8.6 — Full verification matrix, migration rehearsal and activation

**Status:** `OPEN`  
**Depends on:** CA-8.5  
**Goal:** Activate the module only when every required lane and governance register is green.

### Authoritative surface

- **Tables:** No new domain tables
- **Commands:** Module activation through governed platform mechanism only
- **Queries:** Final completeness and diagnostics reports
- **Events:** Module activation event if platform convention requires it

### Binding rules

- Run all package, DB, event, Master Data, web, governance, tenancy, migration, Neon and authenticated journey lanes.
- Reconcile manifest IDs, permissions, events, schema ownership, hard-tenant roots, exports, routes, navigation and generated catalogs.
- Rehearse fresh install and production-like upgrade/backfill.
- Produce the 14-boundary matrix for every phase and exact test counts/exit codes.
- Leave lifecycle `scaffolded` if any required row is partial, gap, blocked, skipped or zero-matched.

### Required evidence

- Full monorepo affected gates
- All Neon concurrency/atomicity suites
- All authenticated journeys
- Fresh and upgrade migration rehearsals
- Activation/rollback smoke

### Paste-ready Codex prompt

```text
Execute CA-8.6 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Activate the module only when every required lane and governance register is green.

Authoritative tables/surfaces: No new domain tables.
Commands: Module activation through governed platform mechanism only.
Queries: Final completeness and diagnostics reports.
Events: Module activation event if platform convention requires it.

Implement the slice as a production vertical. Apply these binding rules:
- Run all package, DB, event, Master Data, web, governance, tenancy, migration, Neon and authenticated journey lanes.
- Reconcile manifest IDs, permissions, events, schema ownership, hard-tenant roots, exports, routes, navigation and generated catalogs.
- Rehearse fresh install and production-like upgrade/backfill.
- Produce the 14-boundary matrix for every phase and exact test counts/exit codes.
- Leave lifecycle `scaffolded` if any required row is partial, gap, blocked, skipped or zero-matched.

Add direct evidence for:
- Full monorepo affected gates
- All Neon concurrency/atomicity suites
- All authenticated journeys
- Fresh and upgrade migration rehearsals
- Activation/rollback smoke

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.6 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 8 and the module close only when all 47 slices and every 14-boundary row are DONE; otherwise return NOT COMPLETE with exact blockers.

## Phase-close rule

Phase 8 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
