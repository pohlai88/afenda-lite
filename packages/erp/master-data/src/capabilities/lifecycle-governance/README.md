# Lifecycle Governance

## Responsibility

Lifecycle governance owns shared lifecycle mechanics for `@afenda/master-data`:

- authoritative stored-state selection from master records
- approved lifecycle families and aggregate transition policies
- operational-master state meanings and recommended aggregate membership
- simple-master and effective-dated state meanings with recommended aggregate
  membership
- explicit named lifecycle operations; general updates must not mutate
  lifecycle-controlled fields
- approved change-request and import gates that still require current-domain
  revalidation before mutation
- historical identity preservation and explicit exact-vs-canonical resolution
- availability facets that distinguish existence, historical resolvability,
  active state, operational selectability, and canonical identity
- typed transition decisions with explicit source states and one resulting state
- reason-required policy and controlled reason codes
- expected-version CAS helpers
- dependency policy codes and external dependency port shape
- merge participant validation and canonical identity resolution mechanics

Aggregate commands still own aggregate-specific activation evidence, authorization
composition, persistence, audit facts, events, and search projection updates.

## Authority

Lifecycle rules are domain rules owned by `@afenda/master-data`. Applications,
Server Actions, HTTP handlers, import adapters, and transactional modules must not
recreate lifecycle decisions independently.

## Boundaries

- Lifecycle state must be selected from the explicit authoritative record field.
  Timestamps, dependencies, configuration, search projections, UI flags,
  transactional usage, and missing values are derived signals only.
- Every lifecycle-enabled aggregate declares exactly one approved lifecycle
  family. Parties, items, warehouses, and item variants are operational masters;
  not every operational master supports every optional state such as `blocked`
  or `merged`.
- Organization dimensions, item groups, and payment terms are simple masters.
  Tax registrations, party roles, addresses, contacts, external identifiers, and
  relationships are effective-dated records.
- Effective-dated records keep stored lifecycle status distinct from calculated
  effective availability. An active effective-dated record must have an
  effective range that includes the as-of instant.
- Lifecycle changes must flow through named domain commands such as
  `activateParty`, `retireItem`, `blockWarehouse`, `restoreParty`,
  `archiveParty`, or `mergeParties`.
- General update commands must reject direct lifecycle field mutation, including
  `status`, `lifecycleState`, lifecycle timestamps, lifecycle actor fields, and
  merge markers.
- Approval only permits an operation to be attempted. Named commands and import
  apply paths must still revalidate current version, lifecycle state,
  dependencies, authorization, uniqueness constraints, parent/child invariants,
  and merge status.
- `expectedVersion` is mutation correctness, not UI convenience.
- Shared helpers evaluate policy and return typed `Result` decisions. They do not
  perform persistence or authorization.
- Store methods that transition lifecycle state must enforce the same state,
  dependency, CAS, audit, event, and tenant rules as public commands.
- Merge remains package-owned. Transactional modules consume canonical identity;
  they do not rewrite peer tables during a merge.
- Retired, archived, blocked, and merged records remain historically resolvable
  by exact identity. Canonical resolution is an explicit query mode and must
  preserve merge lineage.
- A record may exist without being operationally selectable. Query and command
  surfaces must not collapse `exists`, `historicallyResolvable`, `active`,
  `operationallySelectable`, and `canonical` into a single "available" flag.
- Archival is not deletion, and physical deletion is not a normal lifecycle state.
- HTTP status codes, `ActionResult`, UI messages, redirects, and toast copy remain
  adapter responsibilities.

## Source Map

- `types.ts` — lifecycle families, states, meanings, recommended aggregate
  membership, transition definitions, reason types
- `lifecycle-policy.ts` — policy definition and transition decision helper
- `approved-apply-policy.ts` — approved-work attempt gate requirements
- `availability-policy.ts` — lifecycle availability facet evaluation
- `effective-date-policy.ts` — effective-dated availability and coherence
  helpers
- `lifecycle-errors.ts` — typed lifecycle failure details over `@afenda/errors`
- `lifecycle-reasons.ts` — controlled reason constructor
- `version-cas.ts` — shared expected-version and next-version mechanics
- `dependency-policy.ts` — stable dependency codes and dependency port
- `aggregate-policies.ts` — family declarations and explicit policies for
  master-data aggregates
- `merge-policy.ts` — merge participant guards
- `canonical-identity.ts` — canonical-chain resolution and lineage mechanics
- `index.ts` — local capability barrel for package-internal adoption

## Integration

`core-organization-masters/lifecycle.ts` and `version-cas.ts` delegate shared
mechanics here while preserving their existing public command-facing exports.
Aggregate command files continue to validate aggregate-specific requirements such
as active party roles, UoM compatibility, hierarchy rules, dependency blockers,
approved change requests, audit facts, events, and search projection recovery.
