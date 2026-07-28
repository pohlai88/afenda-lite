# HR operational recovery runbooks

**Control state:** Scratch operational authority · Phase 13.6 implementation

These procedures are forward-repair only. Never use `git reset`, destructive tenant-wide SQL, or direct status edits. Operators must preserve `organizationId`, `correlationId`, idempotency keys, audit facts, and source payload hashes. Secrets are checked for presence/status only and are never pasted into evidence.

## Common incident controls

1. Declare incident owner, affected organization(s), start time, correlation IDs, and last known good event/cursor.
2. Stop only the affected connector or tenant workflow. Do not stop unrelated HR traffic.
3. Capture counts and identifiers, not employee names, documents, compensation, or other sensitive payloads.
4. Prefer idempotent replay through the owning command/workflow. Never repair by bypassing authorization, audit, outbox, or version checks.
5. Close only after tenant-bound readback, audit/outbox reconciliation, and a recorded prevention action.

## Failed migration

**Detect:** deploy migration gate fails, journal/hash differs, or a required HR relation/column is absent.

**Contain:** stop the deploy; keep the prior application version serving; prohibit ad-hoc DDL.

**Diagnose:** compare the tracked migration journal, exact file hash, database ledger, and read-only schema probes. Determine whether no statements, a complete migration, or a partial non-transactional migration ran.

**Recover:** use the tracked migration runner for untouched migrations. For a partial migration, prepare a reviewed idempotent forward-repair using the original statements and journal the original hash only after every probe passes. A destructive rollback requires explicit database-owner approval and a tested restore point.

**Verify:** run the migration status/probes, HR typecheck, affected live Drizzle parity, `pnpm audit:tenancy-nulls`, and application smoke tests. Attach command, exit code, migration name/hash, and probe counts.

## Stuck outbox

**Detect:** HR outbox lag or pending/failed count breaches its alert threshold; event attempts stop advancing.

**Contain:** pause the failing consumer, not HR writes. If the downstream side effect is unsafe, apply the reliability kernel's required/optional outage decision.

**Diagnose:** group by event type and sanitized error code; inspect oldest event, attempt count, next retry, correlation/causation chain, and downstream health. Confirm whether the downstream accepted the deduplication key.

**Recover:** repair the dependency or handler, then replay through the event publisher/consumer with the original event ID and deduplication key. Retryable events follow bounded backoff; permanent or exhausted events enter the dead-letter path and require an idempotent replay record.

**Verify:** pending lag returns below threshold; every replay has one terminal outcome; no duplicate downstream facts exist; source and projected tenant/count reconciliation passes.

## Failed payroll handoff

**Detect:** delivery remains pending beyond its retry window, becomes failed, or receives rejected/correction-required feedback.

**Contain:** do not regenerate gross-to-net inputs or mutate an approved snapshot. Hold only the affected delivery/run.

**Diagnose:** compare delivery ID, payload hash, approval evidence, organization/correlation, attempt history, external receipt, and rejection reason. Ask the payroll producer whether `deliveryId + payloadHash` was accepted.

**Recover:** retry the same delivery idempotently when the payload is unchanged. For correction-required feedback, create one changed-payload successor linked to the original. Acknowledged, rejected, and failed terminal deliveries are never silently reopened.

**Verify:** one terminal acknowledgement/rejection exists, supersession links are bidirectional, the producer receipt matches the payload hash, and compensation/leave/time/overtime source reconciliation is zero-difference.

## Failed attendance connector

**Detect:** connector-health metric degrades, cursor stops, import batch pauses, or source-reference error rate breaches threshold.

**Contain:** pause that organization/connector stream. Manual attendance remains available only through its normal authorized workflow.

**Diagnose:** inspect the last committed cursor/version, source window, batch/checkpoint ID, retryable versus terminal row errors, and provider status. Never advance a cursor past an uncommitted batch.

**Recover:** restore the connector, resume from the committed cursor, and replay with the original source references/idempotency keys. Correct rejected rows through a new source revision; do not rewrite accepted rows.

**Verify:** cursor advances monotonically by CAS, completed replay executes no row twice, downloadable error evidence matches rejected rows, and attendance totals reconcile for the source window.

## Privacy incident

**Detect:** unauthorized export/view, sensitive-field disclosure, processor-boundary violation, or missing privacy evidence.

**Contain:** revoke the affected access/integration, stop the export or processor, preserve audit evidence, and notify the privacy/security incident owners. Do not anonymize or delete evidence under investigation; apply legal hold where directed.

**Diagnose:** identify organizations, subjects, fields, recipients/processors, time range, permissions, correlation IDs, and immutable document references. Use least-privilege queries and avoid copying payloads into tickets.

**Recover:** close the authorization/projection defect, invalidate exposed artifacts and credentials, execute the approved subject/retention/anonymization decision through the platform privacy port, and record processor/subprocessor actions.

**Verify:** negative authorization and sensitive-field tests pass; export evidence exists before release; legal hold is honored; audit chain verification passes; privacy owner records notification and closure decisions.

## Data correction

**Detect:** business fact differs from approved source or effective-dated history is inconsistent.

**Contain:** stop dependent posting/handoff for the affected entity. Do not update historical rows in place.

**Diagnose:** reconstruct effective truth from source event, command fingerprint, versions, audit/outbox facts, and downstream projections. Determine the earliest incorrect fact and all derived consumers.

**Recover:** execute the owning correction/supersession command with expected version, reason, evidence reference, correlation ID, and new idempotency key. Rebuild only affected projections and replay dependent facts in causal order.

**Verify:** effective-range invariants and Memory/Drizzle parity pass; the predecessor/successor chain is complete; payroll/accounting/search/reporting reconciliation returns zero difference.

## Tenant leakage response

**Detect:** any cross-organization row, search hit, export row, document reference, event, or metric label.

**Contain:** declare P0, disable the affected route/consumer, preserve evidence, revoke exposed access, and engage security/privacy owners. Never run broad cleanup before evidence capture.

**Diagnose:** trace session organization, stamped command context, store predicates, returned organization IDs, cache/search keys, outbox envelope/payload, and all recipients. Establish full affected-tenant scope.

**Recover:** fix the boundary at the highest owning layer and add a fail-closed readback check. Remove derived cross-tenant artifacts through organization-scoped commands; rotate credentials if exposure included secrets.

**Verify:** targeted cross-tenant penetration tests, tenancy-null audit, search/export negative tests, affected projection reconciliation, and security/privacy sign-offs are complete. Record regulatory/customer notification decisions.

## Rollback or forward recovery

**Default:** forward repair. Application rollback is allowed only when the previous version is schema-compatible and does not discard accepted commands/events.

1. Freeze deployment and capture app version, migration ledger, queue positions, connector cursors, and active incidents.
2. Confirm backward compatibility across database, events, search projections, and payroll payloads.
3. Roll back the application through the deployment platform; never roll back data with unreviewed SQL.
4. Drain/replay using original idempotency keys after compatibility is restored.
5. Run focused unit tests, live Drizzle parity, tenant audits, outbox/payroll/search/reporting reconciliation, and journey smoke tests.

If compatibility cannot be proven, keep the current application contained and execute a reviewed forward repair.

## Drill evidence template

Record: scenario · date/environment · owner/observer · synthetic tenant · injected failure · expected alert · containment time · recovery time · commands and exit codes · before/after counts · correlation IDs · data/privacy checks · outcome · follow-up owner/date.

Runbooks are implemented when present; Phase 13 certification requires dated drill evidence for each scenario and independent security/privacy approval. This document alone is not drill evidence.
