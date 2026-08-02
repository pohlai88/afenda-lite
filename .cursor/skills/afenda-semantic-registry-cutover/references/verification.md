# Semantic registry verification

## Contents

1. Baseline evidence
2. Registry gates
3. Facade and entrypoint gates
4. Persistence and tenancy gates
5. Cutover gates
6. Readiness boundaries
7. Feature-first ERP gates

## 1. Baseline evidence

Capture before editing:

- kernel inspector content digest, package exports, dependencies, scripts, and
  working-tree state;
- public inputs, outputs, errors, behavior, and dependency edges;
- root business facade plus the isolation reason and accepted consumers for every
  declared auxiliary entrypoint;
- direct production and test consumers;
- operation, permission, policy, event, emission, and serializer inventories;
- broad store/context consumers;
- cross-domain implementation imports;
- focused typecheck and contract-test status.

Use `scripts/inspect-semantic-surface.mjs` for repeatable structural evidence and
supplement it with target-specific tests.

## 2. Registry gates

Require tests for:

1. Unique identifiers and public names.
2. Exactly one owner per definition.
3. Registered permission and policy references.
4. Exhaustive command/query projection.
5. Exhaustive audit and emission dispositions plus registered event references.
6. Explicit transaction, idempotency, privacy, observability, and public-projection dispositions.
7. Deterministic composition independent of import order where order has no semantic meaning.
8. Alias normalization and canonical-only output.

## 3. Facade and entrypoint gates

Require evidence that:

1. The package root is the only business-consumer facade and capability style.
2. Every auxiliary entrypoint has one explicit testing, composition, tooling,
   deployment, or security isolation reason.
3. Auxiliary entrypoints expose no alternate business operations, semantic
   registry representation, or result contract.
4. Ordinary production consumers import the root facade; auxiliary consumers are
   confined to their accepted class.
5. Root and accepted auxiliary entrypoints resolve under real runtime and
   downstream TypeScript conditions.
6. Every direct affected consumer compiles or passes its focused contract tests.

An import path being declared in `package.json#exports` is necessary but not proof
that it is semantically justified.

## 4. Persistence and tenancy gates

Apply these gates only when the concept controls persisted mutations:

1. Prove each transaction-required operation derives one complete durable-effect
   plan: state, audit, outbox, and consistency-critical rows.
2. Inject failure at each durable-effect boundary and prove no partial state is
   visible after rollback.
3. Add a structural contract check forbidding direct post-commit audit/outbox calls
   and obsolete compensation or recomputation paths in the production adapter.
4. Prove every participating tenant root, relationship, and mutation predicate is
   organization-scoped, including negative cross-tenant cases.
5. Run the same semantic scenarios against memory and database adapters, but assert
   outcomes and durable facts rather than SQL text or internal call order.
6. Run focused live-database evidence for transaction rollback and tenant isolation
   when the production adapter depends on database semantics.

A source-pattern test is a permanence guard, not sufficient behavioral evidence.
Pair it with rollback, durable-fact, and hostile-tenant tests.

## 5. Cutover gates

Before deleting the old source, prove:

- old inventory equals the derived inventory;
- old authorization behavior equals the derived projection;
- event and emission behavior is unchanged;
- transaction and tenant behavior is unchanged or deliberately strengthened with
  explicit acceptance evidence;
- root public signatures are unchanged for internal compatibility;
- before/after inspector snapshots classify every export and dependency change;
- isolated auxiliary entrypoints remain isolated and representation-safe;
- consumer imports remain on the permanent facade;
- no handler has gained broader store or capability access;
- package lint, typecheck, and focused tests pass;
- the smallest affected consumer integration tests pass.

After deletion, add repository checks forbidding old paths and duplicate
interpretation patterns. A grep alone is not behavioral evidence.

## 6. Readiness boundaries

Report local implementation evidence separately from:

- external security and privacy approval;
- production-scale performance evidence;
- migration and recovery execution;
- controlled lifecycle promotion;
- module enterprise-readiness approval;
- deployment or launch authorization.

Never convert a package-local green gate into one of those broader claims.

## 7. Feature-first ERP gates

When the mission changes package structure, additionally prove:

1. The source root contains only the public entrypoint and justified horizontal
   `facade`, `kernel`, `composition`, `features`, and `testing` surfaces.
2. Every business capability has one named feature owner and follows the uniform
   capsule dispositions in [feature-first-erp.md](feature-first-erp.md).
3. Feature schemas, policies, store contracts, adapters, and tests do not return
   to package-wide layer directories.
4. The kernel contains only package-wide semantic composition or primitives; it
   is not a destination for unclassified feature vocabulary.
5. Module-import rewrites and filesystem-reading test-path rewrites are validated
   independently.
6. The permanent root facade and accepted auxiliary entrypoints are unchanged for
   an internal refactor.
7. A deterministic architecture guard rejects restored layer-first roots.
8. A recursive import guard scans every feature file, including adapters and
   colocated tests, and rejects imports from `composition`, `facade`, or `testing`.
9. No feature handler or adapter names, accepts, or constructs the composite
   package store; each depends on its feature-owned store contract or a narrow port.
10. Aggregate composition may import feature adapter factories, but feature code
    never imports aggregate constructors. The verified graph is acyclic in this
    direction.
11. Technology-specific composition directories contain only technology-specific
    aggregate construction and coverage. Adapter-neutral helpers have a neutral
    owner, and composition barrels do not re-export feature adapters.
12. Package lint, typecheck, full focused tests, and affected-consumer checks pass
   after the final move.
