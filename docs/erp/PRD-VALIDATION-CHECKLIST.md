# ERP PRD validation checklist

A PRD is approved only when every applicable item is `PASS`.

## 1. Product authority

- [ ] The domain architecture exists and is accepted.
- [ ] The PRD defines business outcomes rather than file structure.
- [ ] The module mission is one coherent bounded context.
- [ ] Non-ownership is explicit.
- [ ] No requirement was inferred solely from an existing table or accidental code path.
- [ ] Every term has one definition and owner.
- [ ] Every actor and responsibility is named.

## 2. Feature completeness

- [ ] Every requirement maps to one feature group and feature.
- [ ] Feature groups are business taxonomy, not technical layers.
- [ ] Every feature has one bounded mission.
- [ ] Every feature has explicit non-scope.
- [ ] No feature requires sibling implementation imports.
- [ ] Required web mirrors are declared.

## 3. Operation completeness

- [ ] Every business outcome has a command, query, or explicit non-software procedure.
- [ ] Every operation has a stable ID and owner.
- [ ] Inputs, outputs, and failures are defined.
- [ ] Permission and authorization policy are defined.
- [ ] Approval and privacy dispositions are defined.
- [ ] Transaction and idempotency dispositions are defined.
- [ ] Audit and event dispositions are defined.
- [ ] Mutation tables are declared for commands.
- [ ] Queries are side-effect free.

## 4. Data and lifecycle

- [ ] Aggregate identity and tenant scope are defined.
- [ ] Natural keys and uniqueness scope are defined.
- [ ] References identify their owner module.
- [ ] Lifecycle states and transitions are complete.
- [ ] Terminal, cancellation, reversal, and reopening behavior are resolved.
- [ ] Concurrency behavior is resolved.
- [ ] Historical-stamp requirements are resolved.
- [ ] Migration and backfill requirements are recorded.

## 5. Security and control

- [ ] Trusted organization and actor sources are defined.
- [ ] Browser-controlled security inputs are prohibited.
- [ ] Cross-tenant behavior is explicit.
- [ ] Separation of duties is explicit.
- [ ] Approval evidence and expiry are explicit.
- [ ] Public error detail is safe.
- [ ] C1 threat-review scope is identified.

## 6. Persistence and integration

- [ ] Every mutation table has one package owner.
- [ ] Atomic state/audit/outbox requirements are defined.
- [ ] Adapter parity scenarios are defined.
- [ ] Cross-module integration uses event, approved port, or app saga.
- [ ] No peer table write is required.
- [ ] Event versions and minimal payloads are defined.
- [ ] Retry, timeout, replay, and dead-letter behavior are defined.

## 7. Web product requirements

- [ ] Required user routes and outcomes are defined.
- [ ] Loader/query and Action/command maps are complete.
- [ ] User states are complete.
- [ ] Accessibility and responsive requirements are defined.
- [ ] The web workflow does not create new domain meaning.
- [ ] Activation audience and prerequisites are defined.

## 8. Delivery readiness

- [ ] Roadmap phases follow dependency order.
- [ ] Implementation slices are bounded and binary.
- [ ] Every slice has an exact write set.
- [ ] Every slice has closure evidence.
- [ ] External blockers are named.
- [ ] Exact next-slice eligibility can be calculated.
- [ ] No open decision changes ownership, operations, persistence, security, or acceptance.

## 9. Anti-placeholder review

Fail the PRD when it contains:

- “TBD” for a required ownership or security decision;
- placeholder features presented as scope;
- generic CRUD requirements without business rules;
- tables without user or business outcomes;
- events without consumers or facts;
- permissions without operations;
- tests described only as “unit tests”;
- “future proofing” folders or APIs;
- an implementation phase called “complete module”;
- success criteria that cannot be observed or tested.

## 10. Approval record

| Role | Name | Decision | Date | Conditions |
| --- | --- | --- | --- | --- |
| Product owner | `<name>` | `<approve/reject>` | `<date>` | `<conditions>` |
| Package owner | `<name>` | `<approve/reject>` | `<date>` | `<conditions>` |
| Architecture owner | `<name>` | `<approve/reject>` | `<date>` | `<conditions>` |
| Security owner, C1 | `<name>` | `<approve/reject>` | `<date>` | `<conditions>` |
| Application owner, web scope | `<name>` | `<approve/reject>` | `<date>` | `<conditions>` |
