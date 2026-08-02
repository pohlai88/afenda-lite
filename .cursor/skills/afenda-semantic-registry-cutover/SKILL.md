---
name: afenda-semantic-registry-cutover
description: Centralize duplicated package semantics behind domain-owned registries and uniform feature-first capsules while preserving one permanent root business facade. Use when coding or refactoring ERP features, adapters, aggregate composition, or kernels; when operations, permissions, statuses, policies, events, emissions, serialization, effective truth, manifests, or fixtures are manually synchronized; when a modular package mixes root adapters, schemas, stores, shared helpers, and domain folders; when features depend upward on composition or broad package stores; when auxiliary subpaths risk becoming parallel business APIs; when transaction, audit, outbox, or tenant-lineage behavior is interpreted outside its owner; or when executing a final deletion cutover after parity is proven.
---

# Afenda semantic registry cutover

Centralize package meaning without creating a runtime registry package, parallel
business facades, or a generic framework. Keep the package root as the sole
business-consumer surface. Permit a declared auxiliary subpath only when it
isolates testing, composition, tooling, or a distinct deployment/security context;
it must not expose another business contract. Keep domain definitions near their
owner, compose them centrally, and derive every non-owning projection.

## Load

Read before editing:

1. `AGENTS.md`, the target package, its consumers, and applicable repository rules.
2. `using-afenda-elite-skills` and the owning product/domain farm.
3. `afenda-elite-kernel` for the frozen public-facade and lifecycle boundary.
4. `afenda-coding-discipline` for TypeScript correctness.
5. `afenda-elite-monorepo-discipline` for exports and dependency direction.
6. [references/contract.md](references/contract.md) before selecting an owner.
7. [references/verification.md](references/verification.md) before implementation.
8. [references/transactional-persistence.md](references/transactional-persistence.md)
   when commands mutate persisted state, audit facts, outbox events, or related
   tenant-owned roots.
9. [references/feature-first-erp.md](references/feature-first-erp.md) when an ERP
   package is being created, reorganized, or normalized from a layer-first or
   hybrid tree.

Run the read-only inspector from the repository root:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs <package-path>
node .cursor/skills/afenda-semantic-registry-cutover/scripts/inspect-semantic-surface.mjs <package-path> \
  --semantic-prefix <dotted-prefix> \
  --broad-symbol <symbol>
```

Repeat `--broad-symbol` for each unrestricted context/store type under audit.

## Mission contract

Freeze one bounded concept before editing:

```yaml
semantic_registry_mission:
  target: <verified package path>
  concept: <operations | permissions | statuses | policies | events | effective-truth | serialization>
  architecture_style: <feature-first | registry-only>
  feature_capsule: <owner path and capsule disposition>
  horizontal_surfaces: <facade, kernel, composition, testing, or justified subset>
  canonical_owner: <one domain registry or policy owner>
  permanent_facade: <root business entrypoint>
  auxiliary_entrypoints: <none | path, isolated context, and accepted consumers>
  before_snapshot: <kernel content digest, exports, and dependencies>
  public_contract: <inputs, outputs, errors, behavior, and dependency edges>
  normalization_boundary: <schema or ingress capability>
  projections: <derived runtime and tool-required representations>
  persistence_boundary: <not-applicable | atomic state, audit, outbox, and derived writes>
  tenant_lineage: <not-applicable | roots and ownership predicates>
  consumers: <verified direct consumers>
  consumer_evidence: <focused compile or contract checks>
  compatibility: <internal | additive | breaking>
  deletion_set: <superseded semantic sources removed at cutover>
  acceptance: <focused commands and observable parity>
```

Stop with the repository `CONFUSION` block when ownership, the permanent facade,
or compatibility intent remains ambiguous after inspecting disk truth.

## Workflow

### 1. Discover the semantic graph

- Capture the kernel inspector digest, exports, dependencies, scripts, and
  working-tree state before editing.
- Count consumers and classify every public entrypoint as the root business
  facade or a justified isolated auxiliary surface.
- Locate every declaration, interpretation, projection, alias, serializer, test
  fixture, documentation inventory, and generated artifact for the concept.
- Separate semantic decisions from mechanical representations.
- Treat a large consumer migration as evidence that ownership is leaking.
- Preserve unrelated dirty-worktree changes.

### 2. Establish the semantic topology

For an ERP or modular-monolith package, use a feature-first tree. Permit only
genuinely horizontal `facade`, `kernel`, `composition`, and `testing` surfaces.
Place schemas, policies, narrow store contracts, domain behavior, and adapters
inside the feature that owns their meaning. Use the uniform capsule and decision
rules in the ERP reference.

Keep dependency direction one-way: composition constructs feature adapters;
features never import `composition`, `facade`, or `testing`. A feature adapter
implements its feature-owned store contract and must not accept, construct, or
name the composite package store. Keep adapter-neutral composition helpers outside
technology-specific `drizzle` or `memory` directories.

Do not move a root `adapters/`, `schemas/`, `store/`, or `shared/` directory under
another generic directory and call it feature-first. Do not use `kernel` as a dump
for feature-owned contracts. A kernel composes package-wide semantics and protects
the facade; it does not erase domain ownership.

### 3. Choose one owner

Place definitions with the domain that understands their meaning. Compose
domain registries into one authoritative package registry. The composed layer may
validate uniqueness and referential integrity; it must not redefine domain rules.

Keep separate canonical registries for genuinely separate concepts. An operation
registry may reference a permission or event registry; it must not silently become
their second owner.

### 4. Freeze the facade and compatibility

For internal representation changes:

- keep root export names and signatures unchanged;
- keep result, authorization, tenancy, privacy, and serialization behavior unchanged;
- keep internal constructors, stores, adapters, ports, and aliases unexported;
- require zero production-consumer edits.

Keep one root business capability style. An auxiliary subpath is acceptable only
when loading it from the root would expose or eagerly validate a distinct testing,
composition, tooling, deployment, or security context. Name its accepted consumer
class and prove it does not export an alternate command/query facade, registry
shape, or business interpretation.

Classify compatibility before editing:

- `internal`: preserve public inputs, outputs, errors, and behavior; require zero
  production-consumer edits;
- `additive`: add capability without invalidating accepted consumers; prove the
  existing consumers remain unchanged;
- `breaking`: name and update every accepted affected consumer in the same bounded
  cutover unless the owning authority requires a coordinated mission.

Do not introduce v1/v2 APIs, deprecated facades, business-domain subpaths,
singleton alternatives, or shims.

### 5. Build the registry kernel

Use bounded, explicit TypeScript types. Prefer domain-level composition and
`satisfies`; avoid deeply inferred global generics.

The registry must fail closed on:

- duplicate identifiers or public names;
- missing owner, permission, policy, or projection disposition;
- command/query kind disagreement;
- missing audit disposition or unknown event/emission declarations;
- contradictory transaction, idempotency, privacy, or serialization policy;
- aliases accepted outside their owning ingress contract.

Treat `transaction: "required"` as executable policy, not descriptive metadata.
When persistence applies, its derived execution projection must name the writes
that share one commit boundary.

Definitions describe semantics. Never store live database clients, stores,
transactions, request state, environment configuration, or mutable adapters in a
globally readable definition.

### 6. Derive projections

Derive runtime maps and TypeScript types directly where practical. Use deterministic
source generation only when static named exports or an external tool require an
artifact. Generated files are projections and must identify their canonical source.

Typical projections include manifest inventories, authorization maps, emission
coverage, observability labels, public-facade inventory, serialization tables,
contract fixtures, and documentation inventories.

### 7. Narrow internal capabilities

Restrict the full composite store and broad dependency container to adapter or
composition boundaries. Give each operation the smallest store and capability set
it requires. Cross-domain workflows receive explicit capability interfaces and may
not import arbitrary peer implementations.

Treat a composition adapter directory as aggregate construction only. Do not use
it as a barrel that re-exports feature adapters, and do not let a feature factory
call back upward to construct the aggregate that contains it. Scan every feature
file, including colocated adapters and tests, when enforcing these rules.

### 8. Close persistence and tenancy boundaries when applicable

For a mutating operation, derive one execution plan that commits domain state,
audit facts, outbox events, and consistency-critical derived rows atomically.
Keep database clients and live transactions outside the registry; adapters compile
the canonical plan into their transaction mechanism.

Do not commit state and then call audit or outbox ports, repair partial success with
compensation, or treat an external side effect as transactional. Route external
effects through the committed outbox. Validate organization ownership on every
participating root, relationship, supersession link, and update predicate—not only
on the primary row. Follow the conditional transactional-persistence reference.

### 9. Move, rewrite, prove parity, then cut over once

For structural cutovers, scaffold the accepted feature roots first, move files from
an explicit collision-checked manifest, and only then run a resolver-aware import
rewrite. Update filesystem-reading test fixtures separately from module imports;
they have different extension and directory semantics. Never use an unbounded
repository regex as the migration plan.

Compare old and derived projections before deletion. Prove public signature,
behavioral, authorization, emission, serialization, hostile-input, and consumer
parity as applicable.

After parity passes, switch the canonical reader and delete every replaced manual
registry, map, aggregator, alias, and compatibility path in the same cutover. Do
not retain the old source as a reference or fallback.

### 10. Enforce permanence

Add contract and repository checks that fail when:

- a public operation lacks exactly one definition and owner;
- consumers import implementation subpaths or interpret centrally owned semantics;
- a domain handler receives an unrestricted store without an approved architectural reason;
- a projection diverges from its registry;
- a historical alias escapes normalization or appears in new output/construction;
- an auxiliary entrypoint exposes another business facade or leaks into ordinary
  business consumers;
- root layer-first directories or non-uniform feature capsules return;
- a feature imports `composition`, `facade`, or `testing`, including from a
  colocated adapter;
- a feature handler or adapter depends on the composite package store instead of
  its feature-owned contract;
- an adapter-neutral helper is owned by a technology-specific composition folder,
  or a composition barrel republishes feature adapters;
- a transaction-required mutation performs audit, outbox, or repair work after
  state commit;
- a multi-root mutation trusts an identifier without proving tenant ownership for
  every participating root.

Run focused package checks before consumer and repository gates. Do not claim a
seal, lifecycle promotion, or enterprise readiness from local green tests alone.
Re-run both inspectors after implementation. Compare the root contract, auxiliary
entrypoint dispositions, dependencies, consumer graph, and content digest. Hand
seal or reopen decisions back to `afenda-elite-kernel`.

## Completion output

```text
SEMANTIC REGISTRY RESULT: DISCOVERED | IMPLEMENTED | CUT OVER | VERIFIED | BLOCKED
Target: <path>
Concept: <concept>
Canonical owner: <path/symbol>
Permanent facade: <entrypoint>
Compatibility: internal | additive | breaking
Before digest: <sha256>
After digest: <sha256>
Contract changes: <exports, inputs, outputs, errors, dependencies, behavior>
Auxiliary entrypoints: none | <path, isolation reason, accepted consumers>
Derived projections: <list>
Persistence boundary: not-applicable | <atomic writes and external-effect routing>
Tenant lineage: not-applicable | <roots and ownership predicates>
Deleted surfaces: <list or none>
Consumer blast radius: <count and rationale>
Consumers checked: <paths and focused outcomes>
Evidence: <commands and outcomes>
Remaining conditions: none | <conditions>
```

## Non-goals

- Do not create `@afenda/registry`, `@afenda/shared`, or another runtime package.
- Do not split a bounded context because it is large.
- Do not treat formatting, lint, or a codemod as semantic architecture.
- Do not delete a surface merely because no current importer exists.
- Do not lower the enterprise-production quality bar to meet a launch date.
