# Phase 3 — Authority, Approvals and Company Seal

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 3` |
| Initial status | `OPEN` |
| Slice count | 4 |
| Outcome | Provide effective delegation-of-authority decisions, mandates, powers of attorney, seal control and real maker-checker enforcement. |

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
| CA-3.1 | Delegation-of-authority policies and rules | Phase 2 DONE | OPEN |
| CA-3.2 | Mandates, signatories and powers of attorney | CA-3.1 | OPEN |
| CA-3.3 | Company seal/chop identity, custody and use | CA-3.2 | OPEN |
| CA-3.4 | Maker-checker enforcement and authority decision API | CA-3.3 | OPEN |

## CA-3.1 — Delegation-of-authority policies and rules

**Status:** `OPEN`  
**Depends on:** Phase 2 DONE  
**Goal:** Create versioned policies that answer who may approve or sign a subject/action at a date and threshold.

### Authoritative surface

- **Tables:** `ca_authority_policy`, `ca_authority_rule`
- **Commands:** `createAuthorityPolicyDraft`, `addAuthorityRule`, `amendAuthorityRule`, `publishAuthorityPolicy`, `retireAuthorityPolicy`
- **Queries:** `getAuthorityPolicy`, `listAuthorityPoliciesAsOf`, `resolveAuthorityRule`
- **Events:** `authority_policy.created.v1`, `authority_policy.published.v1`, `authority_rule.amended.v1`

### Binding rules

- Rules include legal company, subject, action, role/party, threshold, currency, joint-signature group and approval requirement.
- Only one applicable published policy may resolve for a scope/date unless deterministic precedence is configured.
- Published policies are immutable; amendments create a successor version.
- Threshold comparison uses canonical decimals and explicit currency behavior.
- Publication is high risk and approval gated.

### Required evidence

- Rule precedence and ambiguity
- Decimal/currency thresholds
- Effective supersession
- Approval/SoD publication
- Concurrent publish conflict

### Paste-ready Codex prompt

```text
Execute CA-3.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create versioned policies that answer who may approve or sign a subject/action at a date and threshold.

Authoritative tables/surfaces: `ca_authority_policy`, `ca_authority_rule`.
Commands: `createAuthorityPolicyDraft`, `addAuthorityRule`, `amendAuthorityRule`, `publishAuthorityPolicy`, `retireAuthorityPolicy`.
Queries: `getAuthorityPolicy`, `listAuthorityPoliciesAsOf`, `resolveAuthorityRule`.
Events: `authority_policy.created.v1`, `authority_policy.published.v1`, `authority_rule.amended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Rules include legal company, subject, action, role/party, threshold, currency, joint-signature group and approval requirement.
- Only one applicable published policy may resolve for a scope/date unless deterministic precedence is configured.
- Published policies are immutable; amendments create a successor version.
- Threshold comparison uses canonical decimals and explicit currency behavior.
- Publication is high risk and approval gated.

Add direct evidence for:
- Rule precedence and ambiguity
- Decimal/currency thresholds
- Effective supersession
- Approval/SoD publication
- Concurrent publish conflict

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Authority policies resolve deterministically and preserve every published version.

## CA-3.2 — Mandates, signatories and powers of attorney

**Status:** `OPEN`  
**Depends on:** CA-3.1  
**Goal:** Record specific delegated instruments and their holders.

### Authoritative surface

- **Tables:** `ca_authority_mandate`, `ca_authority_mandate_holder`, `ca_power_of_attorney`, `ca_power_of_attorney_holder`
- **Commands:** `grantAuthorityMandate`, `amendAuthorityMandate`, `revokeAuthorityMandate`, `grantPowerOfAttorney`, `amendPowerOfAttorney`, `revokePowerOfAttorney`
- **Queries:** `listAuthorityMandatesAsOf`, `listPowersOfAttorneyAsOf`, `resolveAuthorizedSignatories`
- **Events:** `authority_mandate.granted.v1`, `authority_mandate.revoked.v1`, `power_of_attorney.granted.v1`, `power_of_attorney.revoked.v1`

### Binding rules

- Mandates and PoAs record scope, territory, limit, effective period, joint/several exercise and source document.
- Holders must be eligible parties/officers for the effective period.
- Revocation preserves prior exercise history.
- Overlapping instruments are allowed only when authority resolution remains deterministic.
- Grant/revocation can require approval.

### Required evidence

- Eligibility and effective-range rules
- Joint/several combinations
- Revocation/as-of resolution
- Concurrent conflicting grant
- Redacted events and parity

### Paste-ready Codex prompt

```text
Execute CA-3.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record specific delegated instruments and their holders.

Authoritative tables/surfaces: `ca_authority_mandate`, `ca_authority_mandate_holder`, `ca_power_of_attorney`, `ca_power_of_attorney_holder`.
Commands: `grantAuthorityMandate`, `amendAuthorityMandate`, `revokeAuthorityMandate`, `grantPowerOfAttorney`, `amendPowerOfAttorney`, `revokePowerOfAttorney`.
Queries: `listAuthorityMandatesAsOf`, `listPowersOfAttorneyAsOf`, `resolveAuthorizedSignatories`.
Events: `authority_mandate.granted.v1`, `authority_mandate.revoked.v1`, `power_of_attorney.granted.v1`, `power_of_attorney.revoked.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Mandates and PoAs record scope, territory, limit, effective period, joint/several exercise and source document.
- Holders must be eligible parties/officers for the effective period.
- Revocation preserves prior exercise history.
- Overlapping instruments are allowed only when authority resolution remains deterministic.
- Grant/revocation can require approval.

Add direct evidence for:
- Eligibility and effective-range rules
- Joint/several combinations
- Revocation/as-of resolution
- Concurrent conflicting grant
- Redacted events and parity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Mandates and powers of attorney can be resolved as-of without ambiguity.

## CA-3.3 — Company seal/chop identity, custody and use

**Status:** `OPEN`  
**Depends on:** CA-3.2  
**Goal:** Protect physical or digital company seals and prove every custody transfer and use.

### Authoritative surface

- **Tables:** `ca_company_seal`, `ca_seal_custody_event`, `ca_seal_use_event`
- **Commands:** `registerCompanySeal`, `assignSealCustody`, `transferSealCustody`, `recordSealUse`, `markSealLost`, `retireCompanySeal`
- **Queries:** `getCompanySeal`, `getCurrentSealCustodian`, `listSealUseHistory`
- **Events:** `company_seal.registered.v1`, `company_seal.custody_transferred.v1`, `company_seal.used.v1`, `company_seal.lost.v1`

### Binding rules

- Seal specimen is an external object reference/checksum, not binary content.
- Use requires an authorized resolution/mandate/approval where configured.
- Custody transfers are append-only and must close the prior custody interval.
- Lost/retired seals cannot be used.
- Sensitive specimen access is separately authorized.

### Required evidence

- Custody chain integrity
- Unauthorized/lost seal use
- Concurrent custody transfer
- Document-object validation
- Sensitive export and event redaction

### Paste-ready Codex prompt

```text
Execute CA-3.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Protect physical or digital company seals and prove every custody transfer and use.

Authoritative tables/surfaces: `ca_company_seal`, `ca_seal_custody_event`, `ca_seal_use_event`.
Commands: `registerCompanySeal`, `assignSealCustody`, `transferSealCustody`, `recordSealUse`, `markSealLost`, `retireCompanySeal`.
Queries: `getCompanySeal`, `getCurrentSealCustodian`, `listSealUseHistory`.
Events: `company_seal.registered.v1`, `company_seal.custody_transferred.v1`, `company_seal.used.v1`, `company_seal.lost.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Seal specimen is an external object reference/checksum, not binary content.
- Use requires an authorized resolution/mandate/approval where configured.
- Custody transfers are append-only and must close the prior custody interval.
- Lost/retired seals cannot be used.
- Sensitive specimen access is separately authorized.

Add direct evidence for:
- Custody chain integrity
- Unauthorized/lost seal use
- Concurrent custody transfer
- Document-object validation
- Sensitive export and event redaction

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Every seal has a complete custody and use chain with no silent overwrite.

## CA-3.4 — Maker-checker enforcement and authority decision API

**Status:** `OPEN`  
**Depends on:** CA-3.3  
**Goal:** Integrate external approvals and expose one reliable authorization-resolution contract to Afenda composition roots.

### Authoritative surface

- **Tables:** `ca_action_approval_binding` plus Phase 3 authority tables
- **Commands:** `bindApprovedCorporateAction`, high-risk command wrappers across completed phases
- **Queries:** `resolveCorporateAuthority`, `explainCorporateAuthorityDecision`, `listPendingAuthorityExceptions`
- **Events:** `corporate_action.approval_bound.v1`, `authority.exception_recorded.v1`

### Binding rules

- Approval must match tenant, company, command, subject, canonical fingerprint and validity window.
- Requester cannot be final approver where SoD applies.
- Rejected, withdrawn, expired, mismatched or reused approvals fail closed.
- Decision output includes allowed/denied, required signatory set, approval requirement and evidence references.
- Consumers receive read-only decisions through public API/port, never authority-table access.

### Required evidence

- Approval matching and replay
- Segregation-of-duties matrix
- Authority decision explainability
- Cross-tenant approval rejection
- Full authenticated Phase 3 journey

### Paste-ready Codex prompt

```text
Execute CA-3.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Integrate external approvals and expose one reliable authorization-resolution contract to Afenda composition roots.

Authoritative tables/surfaces: `ca_action_approval_binding` plus Phase 3 authority tables.
Commands: `bindApprovedCorporateAction`, high-risk command wrappers across completed phases.
Queries: `resolveCorporateAuthority`, `explainCorporateAuthorityDecision`, `listPendingAuthorityExceptions`.
Events: `corporate_action.approval_bound.v1`, `authority.exception_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Approval must match tenant, company, command, subject, canonical fingerprint and validity window.
- Requester cannot be final approver where SoD applies.
- Rejected, withdrawn, expired, mismatched or reused approvals fail closed.
- Decision output includes allowed/denied, required signatory set, approval requirement and evidence references.
- Consumers receive read-only decisions through public API/port, never authority-table access.

Add direct evidence for:
- Approval matching and replay
- Segregation-of-duties matrix
- Authority decision explainability
- Cross-tenant approval rejection
- Full authenticated Phase 3 journey

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 3 closes at 14/14 with effective authority resolution and proven maker-checker enforcement.

## Phase-close rule

Phase 3 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
