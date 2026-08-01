# Semantic registry verification

## Contents

1. Baseline evidence
2. Registry gates
3. Cutover gates
4. Readiness boundaries

## 1. Baseline evidence

Capture before editing:

- package exports and public signatures;
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
5. Exhaustive emission disposition and registered event references.
6. Explicit transaction, idempotency, privacy, observability, and public-projection dispositions.
7. Deterministic composition independent of import order where order has no semantic meaning.
8. Alias normalization and canonical-only output.

## 3. Cutover gates

Before deleting the old source, prove:

- old inventory equals the derived inventory;
- old authorization behavior equals the derived projection;
- event and emission behavior is unchanged;
- root public signatures are unchanged for internal compatibility;
- consumer imports remain on the permanent facade;
- no handler has gained broader store or capability access;
- package lint, typecheck, and focused tests pass;
- the smallest affected consumer integration tests pass.

After deletion, add repository checks forbidding old paths and duplicate
interpretation patterns. A grep alone is not behavioral evidence.

## 4. Readiness boundaries

Report local implementation evidence separately from:

- external security and privacy approval;
- production-scale performance evidence;
- migration and recovery execution;
- controlled lifecycle promotion;
- module enterprise-readiness approval;
- deployment or launch authorization.

Never convert a package-local green gate into one of those broader claims.
