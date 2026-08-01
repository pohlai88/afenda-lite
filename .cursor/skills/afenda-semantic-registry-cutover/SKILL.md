---
name: afenda-semantic-registry-cutover
description: Centralize duplicated semantic facts inside an established Afenda package behind domain-owned canonical registries while preserving one permanent public facade. Use when operations, permissions, statuses, policies, events, emissions, serialization, effective truth, manifests, documentation inventories, or contract fixtures are manually synchronized across files; when an internal modular monolith needs narrow capability contexts; or when executing a final deletion cutover after projection parity is proven.
---

# Afenda semantic registry cutover

Centralize package meaning without creating a runtime registry package, public
subpaths, parallel facades, or a generic framework. Keep domain definitions near
their owner, compose them centrally, and derive every non-owning projection.

## Load

Read before editing:

1. `AGENTS.md`, the target package, its consumers, and applicable repository rules.
2. `using-afenda-elite-skills` and the owning product/domain farm.
3. `afenda-elite-kernel` for the frozen public-facade and lifecycle boundary.
4. `afenda-coding-discipline` for TypeScript correctness.
5. `afenda-elite-monorepo-discipline` for exports and dependency direction.
6. [references/contract.md](references/contract.md) before selecting an owner.
7. [references/verification.md](references/verification.md) before implementation.

Run the read-only inspector from the repository root:

```bash
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
  canonical_owner: <one domain registry or policy owner>
  permanent_facade: <existing consumer entrypoint>
  normalization_boundary: <schema or ingress capability>
  projections: <derived runtime and tool-required representations>
  consumers: <verified direct consumers>
  compatibility: <internal | additive | breaking>
  deletion_set: <superseded semantic sources removed at cutover>
  acceptance: <focused commands and observable parity>
```

Stop with the repository `CONFUSION` block when ownership, the permanent facade,
or compatibility intent remains ambiguous after inspecting disk truth.

## Workflow

### 1. Discover the semantic graph

- Count consumers and public entrypoints.
- Locate every declaration, interpretation, projection, alias, serializer, test
  fixture, documentation inventory, and generated artifact for the concept.
- Separate semantic decisions from mechanical representations.
- Treat a large consumer migration as evidence that ownership is leaking.
- Preserve unrelated dirty-worktree changes.

### 2. Choose one owner

Place definitions with the domain that understands their meaning. Compose
domain registries into one authoritative package registry. The composed layer may
validate uniqueness and referential integrity; it must not redefine domain rules.

Keep separate canonical registries for genuinely separate concepts. An operation
registry may reference a permission or event registry; it must not silently become
their second owner.

### 3. Freeze the facade and compatibility

For internal representation changes:

- keep root export names and signatures unchanged;
- keep result, authorization, tenancy, privacy, and serialization behavior unchanged;
- keep internal constructors, stores, adapters, ports, and aliases unexported;
- require zero production-consumer edits.

Change consumers only for a deliberate business-contract change. Do not introduce
v1/v2 APIs, deprecated facades, domain subpaths, singleton alternatives, or shims.

### 4. Build the registry kernel

Use bounded, explicit TypeScript types. Prefer domain-level composition and
`satisfies`; avoid deeply inferred global generics.

The registry must fail closed on:

- duplicate identifiers or public names;
- missing owner, permission, policy, or projection disposition;
- command/query kind disagreement;
- unknown event or emission declarations;
- contradictory transaction, idempotency, privacy, or serialization policy;
- aliases accepted outside their owning ingress contract.

Definitions describe semantics. Never store live database clients, stores,
transactions, request state, environment configuration, or mutable adapters in a
globally readable definition.

### 5. Derive projections

Derive runtime maps and TypeScript types directly where practical. Use deterministic
source generation only when static named exports or an external tool require an
artifact. Generated files are projections and must identify their canonical source.

Typical projections include manifest inventories, authorization maps, emission
coverage, observability labels, public-facade inventory, serialization tables,
contract fixtures, and documentation inventories.

### 6. Narrow internal capabilities

Restrict the full composite store and broad dependency container to adapter or
composition boundaries. Give each operation the smallest store and capability set
it requires. Cross-domain workflows receive explicit capability interfaces and may
not import arbitrary peer implementations.

### 7. Prove parity, then cut over once

Compare old and derived projections before deletion. Prove public signature,
behavioral, authorization, emission, serialization, hostile-input, and consumer
parity as applicable.

After parity passes, switch the canonical reader and delete every replaced manual
registry, map, aggregator, alias, and compatibility path in the same cutover. Do
not retain the old source as a reference or fallback.

### 8. Enforce permanence

Add contract and repository checks that fail when:

- a public operation lacks exactly one definition and owner;
- consumers import implementation subpaths or interpret centrally owned semantics;
- a domain handler receives an unrestricted store without an approved architectural reason;
- a projection diverges from its registry;
- a historical alias escapes normalization or appears in new output/construction.

Run focused package checks before consumer and repository gates. Do not claim a
seal, lifecycle promotion, or enterprise readiness from local green tests alone.

## Completion output

```text
SEMANTIC REGISTRY RESULT: DISCOVERED | IMPLEMENTED | CUT OVER | VERIFIED | BLOCKED
Target: <path>
Concept: <concept>
Canonical owner: <path/symbol>
Permanent facade: <entrypoint>
Compatibility: internal | additive | breaking
Derived projections: <list>
Deleted surfaces: <list or none>
Consumer blast radius: <count and rationale>
Evidence: <commands and outcomes>
Remaining conditions: none | <conditions>
```

## Non-goals

- Do not create `@afenda/registry`, `@afenda/shared`, or another runtime package.
- Do not split a bounded context because it is large.
- Do not treat formatting, lint, or a codemod as semantic architecture.
- Do not delete a surface merely because no current importer exists.
- Do not lower the enterprise-production quality bar to meet a launch date.
