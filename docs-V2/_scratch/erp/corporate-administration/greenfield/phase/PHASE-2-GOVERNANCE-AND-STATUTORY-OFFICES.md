# Phase 2 — Governance and Statutory Offices

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 2` |
| Initial status | `OPEN` |
| Slice count | 5 |
| Outcome | Deliver governance bodies, statutory roles, officer evidence, meetings, quorum, voting, resolutions and implementation tracking. |

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
| CA-2.1 | Governance bodies and memberships | Phase 1 DONE | DONE |
| CA-2.2 | Statutory offices, appointments, qualifications and consent | CA-2.1 | DONE |
| CA-2.3 | Officer declarations, disqualifications and conflicts | CA-2.2 | DONE |
| CA-2.4 | Meetings, notices, participants and quorum | CA-2.3 | DONE |
| CA-2.5 | Votes, resolutions, minutes and implementation actions | CA-2.4 | DONE |

## CA-2.1 — Governance bodies and memberships

**Status:** `DONE`
**Depends on:** Phase 1 DONE
**Goal:** Create effective governance bodies and membership history.

### Authoritative surface

- **Tables:** `ca_governance_body`, `ca_governance_membership`
- **Commands:** `createGovernanceBody`, `amendGovernanceBody`, `retireGovernanceBody`, `appointGovernanceMember`, `changeGovernanceMembership`, `endGovernanceMembership`
- **Queries:** `getGovernanceBody`, `listGovernanceBodiesAsOf`, `listGovernanceMembershipsAsOf`
- **Events:** `governance_body.created.v1`, `governance_membership.appointed.v1`, `governance_membership.ended.v1`

### Binding rules

- Body types include board, committee, shareholder body and configured statutory body.
- Membership references parties or permitted role-based seats.
- Voting entitlement, chair status and term are explicit.
- Membership cannot extend outside the body or company existence.
- Overlaps and duplicate active seats follow body rules.

### Required evidence

- Effective membership and term chronology
- Duplicate/chair constraints
- Party-kind/reference validation
- Concurrent appointment conflict
- Parity and tenant isolation

### Paste-ready Codex prompt

```text
Execute CA-2.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create effective governance bodies and membership history.

Authoritative tables/surfaces: `ca_governance_body`, `ca_governance_membership`.
Commands: `createGovernanceBody`, `amendGovernanceBody`, `retireGovernanceBody`, `appointGovernanceMember`, `changeGovernanceMembership`, `endGovernanceMembership`.
Queries: `getGovernanceBody`, `listGovernanceBodiesAsOf`, `listGovernanceMembershipsAsOf`.
Events: `governance_body.created.v1`, `governance_membership.appointed.v1`, `governance_membership.ended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Body types include board, committee, shareholder body and configured statutory body.
- Membership references parties or permitted role-based seats.
- Voting entitlement, chair status and term are explicit.
- Membership cannot extend outside the body or company existence.
- Overlaps and duplicate active seats follow body rules.

Add direct evidence for:
- Effective membership and term chronology
- Duplicate/chair constraints
- Party-kind/reference validation
- Concurrent appointment conflict
- Parity and tenant isolation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Governance bodies and membership can be resolved accurately as-of any date.

## CA-2.2 — Statutory offices, appointments, qualifications and consent

**Status:** `DONE`
**Depends on:** CA-2.1
**Goal:** Model jurisdiction-required offices and the evidence needed to hold them.

### Authoritative surface

- **Tables:** `ca_statutory_office`, `ca_officer_appointment`, `ca_officer_qualification`
- **Commands:** `defineStatutoryOffice`, `appointOfficer`, `amendOfficerAppointment`, `recordOfficerQualification`, `resignOfficer`, `removeOfficer`
- **Queries:** `listRequiredStatutoryOffices`, `listOfficersAsOf`, `getOfficerAppointment`, `getOfficerVacancyStatus`
- **Events:** `statutory_office.defined.v1`, `officer.appointed.v1`, `officer.resigned.v1`, `officer.removed.v1`

### Binding rules

- Office types are jurisdiction/rule-pack driven rather than hard-coded globally.
- Appointment requires consent, compatible party kind, method, appointing authority and source evidence.
- Qualifications have issuer, validity and verification status.
- Required-office vacancy and grace-period findings are deterministic.
- Protected roles can require maker-checker approval.

### Required evidence

- Required role and vacancy logic
- Qualification validity and expiry
- Consent/appointment chronology
- Approval and segregation
- Parity/Neon concurrency/atomicity

### Paste-ready Codex prompt

```text
Execute CA-2.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Model jurisdiction-required offices and the evidence needed to hold them.

Authoritative tables/surfaces: `ca_statutory_office`, `ca_officer_appointment`, `ca_officer_qualification`.
Commands: `defineStatutoryOffice`, `appointOfficer`, `amendOfficerAppointment`, `recordOfficerQualification`, `resignOfficer`, `removeOfficer`.
Queries: `listRequiredStatutoryOffices`, `listOfficersAsOf`, `getOfficerAppointment`, `getOfficerVacancyStatus`.
Events: `statutory_office.defined.v1`, `officer.appointed.v1`, `officer.resigned.v1`, `officer.removed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Office types are jurisdiction/rule-pack driven rather than hard-coded globally.
- Appointment requires consent, compatible party kind, method, appointing authority and source evidence.
- Qualifications have issuer, validity and verification status.
- Required-office vacancy and grace-period findings are deterministic.
- Protected roles can require maker-checker approval.

Add direct evidence for:
- Required role and vacancy logic
- Qualification validity and expiry
- Consent/appointment chronology
- Approval and segregation
- Parity/Neon concurrency/atomicity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Statutory offices, appointments and qualifications are enforceable and auditable.

**Implementation evidence:** `../evidence/CA-2.2-EVIDENCE.md`

## CA-2.3 — Officer declarations, disqualifications and conflicts

**Status:** `DONE`
**Depends on:** CA-2.2
**Goal:** Complete officer eligibility, independence and matter-specific conflict evidence.

### Authoritative surface

- **Tables:** `ca_officer_declaration`, `ca_officer_disqualification`, `ca_conflict_disclosure`
- **Commands:** `recordOfficerDeclaration`, `supersedeOfficerDeclaration`, `recordOfficerDisqualification`, `endOfficerDisqualification`, `discloseConflict`, `recordRecusal`
- **Queries:** `getOfficerEligibilityAsOf`, `listExpiringDeclarations`, `listActiveDisqualifications`, `listConflictsForMatter`
- **Events:** `officer.declaration_recorded.v1`, `officer.disqualified.v1`, `conflict.disclosed.v1`, `conflict.recusal_recorded.v1`

### Binding rules

- Declaration types include consent, eligibility, interest, independence, fit-and-proper and related-party declarations.
- Sensitive details are stored by reference/masked snapshot; events expose only classification/status.
- Active disqualification blocks incompatible appointment or exercise of authority.
- Conflict and recusal are linked to a meeting, resolution, transaction or corporate action.
- Expiry reminders are deterministic.

### Required evidence

- Eligibility resolution
- Sensitive-data leakage checks
- Conflict/recusal linkage
- Disqualification race with appointment
- Reminder eligibility

### Paste-ready Codex prompt

```text
Execute CA-2.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete officer eligibility, independence and matter-specific conflict evidence.

Authoritative tables/surfaces: `ca_officer_declaration`, `ca_officer_disqualification`, `ca_conflict_disclosure`.
Commands: `recordOfficerDeclaration`, `supersedeOfficerDeclaration`, `recordOfficerDisqualification`, `endOfficerDisqualification`, `discloseConflict`, `recordRecusal`.
Queries: `getOfficerEligibilityAsOf`, `listExpiringDeclarations`, `listActiveDisqualifications`, `listConflictsForMatter`.
Events: `officer.declaration_recorded.v1`, `officer.disqualified.v1`, `conflict.disclosed.v1`, `conflict.recusal_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Declaration types include consent, eligibility, interest, independence, fit-and-proper and related-party declarations.
- Sensitive details are stored by reference/masked snapshot; events expose only classification/status.
- Active disqualification blocks incompatible appointment or exercise of authority.
- Conflict and recusal are linked to a meeting, resolution, transaction or corporate action.
- Expiry reminders are deterministic.

Add direct evidence for:
- Eligibility resolution
- Sensitive-data leakage checks
- Conflict/recusal linkage
- Disqualification race with appointment
- Reminder eligibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Officer fitness, declarations and conflicts are represented without exposing protected identity data.

**Implementation evidence:** `../evidence/CA-2.3-EVIDENCE.md`

## CA-2.4 — Meetings, notices, participants and quorum

**Status:** `DONE`
**Depends on:** CA-2.3
**Goal:** Create an evidentiary meeting process before decisions and resolutions.

### Authoritative surface

- **Tables:** `ca_governance_meeting`, `ca_meeting_notice`, `ca_meeting_participant`, `ca_meeting_quorum_result`
- **Commands:** `scheduleGovernanceMeeting`, `issueMeetingNotice`, `recordNoticeDelivery`, `waiveNotice`, `recordMeetingParticipant`, `openMeeting`, `recordQuorum`, `adjournMeeting`, `closeMeeting`
- **Queries:** `getGovernanceMeeting`, `listGovernanceMeetings`, `getMeetingAttendance`, `getMeetingQuorumStatus`
- **Events:** `governance_meeting.scheduled.v1`, `meeting_notice.issued.v1`, `governance_meeting.quorum_recorded.v1`

### Binding rules

- Support physical, virtual, hybrid and written-resolution procedures.
- Notice period and waiver rules derive from body/company policy or compliance rules.
- Participant records include attendance, proxy/representation and recusal.
- Quorum uses an immutable rule snapshot and eligible membership as-of the meeting time.
- A meeting cannot be completed without a quorum result or documented no-quorum outcome.

### Required evidence

- Notice timing and waiver
- Membership-as-of attendance eligibility
- Quorum calculations
- Concurrent open/close and stale version
- Authenticated accessible meeting workflow

### Paste-ready Codex prompt

```text
Execute CA-2.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create an evidentiary meeting process before decisions and resolutions.

Authoritative tables/surfaces: `ca_governance_meeting`, `ca_meeting_notice`, `ca_meeting_participant`, `ca_meeting_quorum_result`.
Commands: `scheduleGovernanceMeeting`, `issueMeetingNotice`, `recordNoticeDelivery`, `waiveNotice`, `recordMeetingParticipant`, `openMeeting`, `recordQuorum`, `adjournMeeting`, `closeMeeting`.
Queries: `getGovernanceMeeting`, `listGovernanceMeetings`, `getMeetingAttendance`, `getMeetingQuorumStatus`.
Events: `governance_meeting.scheduled.v1`, `meeting_notice.issued.v1`, `governance_meeting.quorum_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Support physical, virtual, hybrid and written-resolution procedures.
- Notice period and waiver rules derive from body/company policy or compliance rules.
- Participant records include attendance, proxy/representation and recusal.
- Quorum uses an immutable rule snapshot and eligible membership as-of the meeting time.
- A meeting cannot be completed without a quorum result or documented no-quorum outcome.

Add direct evidence for:
- Notice timing and waiver
- Membership-as-of attendance eligibility
- Quorum calculations
- Concurrent open/close and stale version
- Authenticated accessible meeting workflow

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Meeting validity evidence exists before any resolution is adopted.

**Implementation evidence:** `../evidence/CA-2.4-EVIDENCE.md`

## CA-2.5 — Votes, resolutions, minutes and implementation actions

**Status:** `DONE`
**Depends on:** CA-2.4
**Goal:** Complete the governance decision chain from motion through implementation.

### Authoritative surface

- **Tables:** `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`
- **Commands:** `recordMeetingVote`, `adoptResolution`, `rejectResolution`, `recordWrittenResolution`, `supersedeResolution`, `assignResolutionAction`, `completeResolutionAction`, `recordMinutesDocument`
- **Queries:** `getResolution`, `listResolutionsAsOf`, `getResolutionExecutionStatus`, `listOverdueResolutionActions`
- **Events:** `meeting_vote.recorded.v1`, `resolution.adopted.v1`, `resolution.action_assigned.v1`, `resolution.action_completed.v1`

### Binding rules

- Votes preserve eligible votes, votes cast, abstentions and outcome basis.
- Resolution effectiveness cannot predate valid approval.
- Resolution text is represented by approved digest/metadata and linked versioned document.
- Supersession does not erase the prior resolution.
- Completion actions require evidence and can drive later corporate actions.

### Required evidence

- Vote arithmetic and threshold rules
- Resolution chronology and approval basis
- Written-resolution unanimity/configured threshold
- Action due/overdue and completion evidence
- Full Phase 2 journey, parity, failure injection and accessibility

### Paste-ready Codex prompt

```text
Execute CA-2.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete the governance decision chain from motion through implementation.

Authoritative tables/surfaces: `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`.
Commands: `recordMeetingVote`, `adoptResolution`, `rejectResolution`, `recordWrittenResolution`, `supersedeResolution`, `assignResolutionAction`, `completeResolutionAction`, `recordMinutesDocument`.
Queries: `getResolution`, `listResolutionsAsOf`, `getResolutionExecutionStatus`, `listOverdueResolutionActions`.
Events: `meeting_vote.recorded.v1`, `resolution.adopted.v1`, `resolution.action_assigned.v1`, `resolution.action_completed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Votes preserve eligible votes, votes cast, abstentions and outcome basis.
- Resolution effectiveness cannot predate valid approval.
- Resolution text is represented by approved digest/metadata and linked versioned document.
- Supersession does not erase the prior resolution.
- Completion actions require evidence and can drive later corporate actions.

Add direct evidence for:
- Vote arithmetic and threshold rules
- Resolution chronology and approval basis
- Written-resolution unanimity/configured threshold
- Action due/overdue and completion evidence
- Full Phase 2 journey, parity, failure injection and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 2 closes at 14/14 with an auditable chain from body membership to meeting, vote, resolution and executed action.

**Implementation evidence:** `../evidence/CA-2.5-EVIDENCE.md`

## Phase-close rule

Phase 2 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
