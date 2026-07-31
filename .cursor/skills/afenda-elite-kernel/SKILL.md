---
name: afenda-elite-kernel
description: Deterministically discover, scaffold, apply, implement, semantically cut over, upgrade, verify, reopen, and readiness-seal reusable Afenda package kernels, including registered config, errors, env, testing, db, audit, events, search, notifications, logger, HTTP, security, metrics, OpenAPI, rate-limit, cache, auth, and admin contracts. Use when inventorying a package band, centralizing a shared concept behind one registry and durable facade, deriving runtime or tool-required projections from canonical definitions, planning or executing an authorized codemod and final consumer migration, upgrading a core package contract or internals, or producing repeatable readiness evidence.
---

# Afenda Elite Kernel

Operate a single evidence-driven lifecycle for reusable package kernels. Treat this skill as a delivery method, not authority to create a generic `@afenda/kernel`, shared mega-package, or new architectural layer.

## Load

Read before changing a target:

1. `AGENTS.md` and the nearest applicable repository rules.
2. The target `package.json`, public barrel, source, tests, README, and consumers.
3. `docs-V2/monorepo/README.md` and the owning farm selected by `using-afenda-elite-skills`.
4. [references/lifecycle.md](references/lifecycle.md) for mode and transition rules.
5. [references/seal-contract.md](references/seal-contract.md) for evidence and seal gates.
6. [references/config-kernel.md](references/config-kernel.md) when the target is `@afenda/config` or a mission changes shared TypeScript/Biome profiles or their consumer boundary.
7. [references/errors-kernel.md](references/errors-kernel.md) when the target is `@afenda/errors` or the mission applies its contract to a consumer.
8. [references/env-kernel.md](references/env-kernel.md) when the target is `@afenda/env` or a mission centralizes configuration registries and runtime projections.
9. [references/testing-kernel.md](references/testing-kernel.md) when the target is `@afenda/testing` or a mission centralizes runner policy, lane projections, or test database evidence.
10. [references/db-kernel.md](references/db-kernel.md) when the target is `@afenda/db` or a mission changes schema-host runtime access, tenant predicates, Neon HTTP transactions, hard-tenant-root projections, or the permission catalog.
11. [references/audit-kernel.md](references/audit-kernel.md) when the target is `@afenda/audit` or a mission changes general activity recording, guarded transaction preparation, masking, query/export/retention policy, or audit telemetry.
12. [references/logger-kernel.md](references/logger-kernel.md) when the target is `@afenda/logger` or a mission changes structured fields, redaction, correlation carriage, or Node/edge log projection.
13. [references/http-kernel.md](references/http-kernel.md) when the target is `@afenda/http` or a mission changes correlation, transport pagination, Fetch pipelines, or Retry-After/rate-limit/timing header attachment.
14. [references/security-kernel.md](references/security-kernel.md) when the target is `@afenda/security` or a mission changes CSP, CORS, security-header policy, or framework adaptation boundaries.
15. [references/metrics-kernel.md](references/metrics-kernel.md) when the target is `@afenda/metrics` or a mission changes metric registries, names, labels, recording, cardinality, or exposition.
16. [references/openapi-kernel.md](references/openapi-kernel.md) when the target is `@afenda/openapi` or a mission changes schema registration, envelopes, document generation, Node emission, or error-projection composition.
17. [references/rate-limit-kernel.md](references/rate-limit-kernel.md) when the target is `@afenda/rate-limit` or a mission changes quota policy, key construction, bounded timing, vendor normalization, or transport projections.
18. [references/cache-kernel.md](references/cache-kernel.md) when the target is `@afenda/cache` or a mission changes cache namespace, L1/L2 policy, serialization, invalidation, backend selection, or failure behavior.
19. [references/events-kernel.md](references/events-kernel.md) when the target is `@afenda/events` or a mission changes event registration, envelopes, outbox lifecycle, claims, serialization, or handler composition.
20. [references/search-kernel.md](references/search-kernel.md) when the target is `@afenda/search` or a mission changes search entities, document normalization, ranking, projection lifecycle, or testing capability isolation.
21. [references/notifications-kernel.md](references/notifications-kernel.md) when the target is `@afenda/notifications` or a mission changes in-app vocabulary, persistence, deduplication, expiry visibility, recipient ownership, read state, or event composition boundaries.
22. [references/auth-kernel.md](references/auth-kernel.md) when the target is `@afenda/auth` or a mission changes sessions, organization binding, roles, Neon Auth normalization, or server/browser capabilities.
23. [references/admin-kernel.md](references/admin-kernel.md) when the target is `@afenda/admin` or a mission changes organization administration, organization usage, platform RBAC audit, atomic role assignment, or health capabilities.

Load only the target-specific references required by the selected farm. Do not load absent Living `docs/**` as authority.

## Registered kernels

| Package | Target | Contract |
|---------|--------|----------|
| `@afenda/config` | `packages/foundation/config` | [references/config-kernel.md](references/config-kernel.md) |
| `@afenda/errors` | `packages/foundation/errors` | [references/errors-kernel.md](references/errors-kernel.md) |
| `@afenda/env` | `packages/foundation/env` | [references/env-kernel.md](references/env-kernel.md) |
| `@afenda/testing` | `packages/foundation/testing` | [references/testing-kernel.md](references/testing-kernel.md) |
| `@afenda/db` | `packages/data-plane/db` | [references/db-kernel.md](references/db-kernel.md) |
| `@afenda/audit` | `packages/data-plane/audit` | [references/audit-kernel.md](references/audit-kernel.md) |
| `@afenda/logger` | `packages/runtime/logger` | [references/logger-kernel.md](references/logger-kernel.md) |
| `@afenda/http` | `packages/runtime/http` | [references/http-kernel.md](references/http-kernel.md) |
| `@afenda/security` | `packages/runtime/security` | [references/security-kernel.md](references/security-kernel.md) |
| `@afenda/metrics` | `packages/runtime/metrics` | [references/metrics-kernel.md](references/metrics-kernel.md) |
| `@afenda/openapi` | `packages/runtime/openapi` | [references/openapi-kernel.md](references/openapi-kernel.md) |
| `@afenda/rate-limit` | `packages/runtime/rate-limit` | [references/rate-limit-kernel.md](references/rate-limit-kernel.md) |
| `@afenda/cache` | `packages/runtime/cache` | [references/cache-kernel.md](references/cache-kernel.md) |
| `@afenda/events` | `packages/data-plane/events` | [references/events-kernel.md](references/events-kernel.md) |
| `@afenda/search` | `packages/data-plane/search` | [references/search-kernel.md](references/search-kernel.md) |
| `@afenda/notifications` | `packages/data-plane/notifications` | [references/notifications-kernel.md](references/notifications-kernel.md) |
| `@afenda/auth` | `packages/control-plane/auth` | [references/auth-kernel.md](references/auth-kernel.md) |
| `@afenda/admin` | `packages/control-plane/admin` | [references/admin-kernel.md](references/admin-kernel.md) |

## Required mission contract

Resolve these fields from the request and disk before editing:

```yaml
kernel_mission:
  target: <verified package or app path>
  mode: scaffold | apply | implement | cutover | upgrade | verify | seal | reopen
  capability: <one bounded capability>
  owner: <owning package or composition root>
  consumers: <verified direct consumers>
  acceptance: <observable outcomes and commands>
  authority: <farm and on-disk sources>
```

If `target`, ownership, or public-contract intent remains materially ambiguous after disk discovery, emit the repository `CONFUSION` block and request the missing decision.

## Deterministic workflow

### 1. Snapshot

Run the read-only inspector from the repository root:

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs <target>
```

For a package target, record `contentDigest`, public exports, scripts,
dependencies, source files, tests, and working-tree state. For a category target
such as `packages/foundation`, use `childPackages` to compare its immediate
packages without treating the category directory as a package or semantic
owner.

Inventory may cover a category. Implementation must select exactly one child
package and one capability before editing. Re-run the selected package snapshot
after implementation and at seal.

### 2. Classify

Select exactly one mode using [references/lifecycle.md](references/lifecycle.md). Do not combine unrelated targets or capabilities in one mission.

### 3. Freeze the change contract

State before edits:

- owned capability and explicit non-goals;
- public inputs, outputs, error vocabulary, and compatibility class;
- allowed dependency edges and composition root;
- security, tenancy, data, and observability invariants that apply;
- focused verification commands and consumer evidence;
- seal-impacting files and expected post-change state.

Do not invent imports, exports, scripts, or helpers. Verify each on disk first.

For a shared semantic concept, also freeze:

- one canonical semantic owner and one permanent consumer facade;
- which behavior is shared policy and which remains domain-owned context;
- normalization, alias, serialization, and historical-input ownership;
- every derived projection and the exact allowed/prohibited consumer boundary;
- the current consumer graph, superseded surfaces, and final deletion set.

Do not start a codemod while any of those decisions remain distributed or
unresolved. A large migration count is an architecture finding: first move the
repeated decision behind the owner, then migrate the smallest stable call shape.

When a declaration and its runtime representation use the same key set, keep
the keys in one registry and derive the projection. Do not synchronize schema,
runtime-read, classification, documentation, or allowlist maps by hand. Preserve
separate entrypoints only when loading one would eagerly validate or expose a
different deployment/security context; isolation is not permission for parallel
versions of the same contract.

### 4. Implement one complete slice

Preserve the target's established shapes. Create real behavior, boundary validation, production adapters, and tests required by the contract.

For source-exported ESM packages loaded by native runner/config machinery, prove
both runtime resolution and downstream TypeScript resolution. When direct `.ts`
specifiers leak compiler policy and extensionless or virtual `.js` specifiers
cannot resolve the source at runtime, prefer a package-private `imports` map.
Never solve this mismatch by publishing implementation subpaths or duplicating
generated JavaScript beside the semantic source.

Route special concerns to their owning farms:

| Concern | Owning farm |
|---------|-------------|
| New package, export surface, dependency edge | `afenda-elite-monorepo-discipline` |
| Ports, adapters, module residue | `afenda-elite-backend-modules` |
| API, result, schema, or OpenAPI contract | `afenda-elite-api-contract` |
| App Router or Server Action mechanics | `afenda-elite-nextjs-best-practice` |
| Product UI capability | `afenda-elite-ui-compose` |
| Module readiness claim | `afenda-elite-module-readiness` |
| Verification lane selection | `afenda-focused-verification` |

This skill orchestrates those farms; it does not replace their acceptance rules.

### 5. Cut over shared semantics once

Use `cutover` only after the owner, facade, and consumer contract are frozen and
the owning authority explicitly unlocks migration. Execute one atomic cutover:

1. Inventory imports, call shapes, dynamic arguments, raw interpretation, and
   assertion patterns before editing.
2. Mechanically migrate imports and structurally equivalent calls only.
3. Classify dynamic messages, details, vendor data, and domain outcomes by
   semantic owner. Move shared meaning into the kernel; preserve domain-owned
   context behind a private in-process capability that cannot cross wire/public
   projections.
4. Delete the replaced exports, subpaths, constructors, adapters, maps, and
   compatibility paths in the same mission.
5. Add type fixtures, semantic and boundary repository checks, projection
   parity, hostile-input, bundle-isolation, and consumer contract tests that
   prevent the old interpretation from returning.

Never use test deletion, wording relaxation, a parallel facade, or discarded
domain details to make a codemod green. A broad failure fan-out after a
mechanical rewrite usually identifies semantic information lost at the
boundary; repair that boundary once before touching consumers further.

### 6. Verify from narrow to broad

Run target-local lint, typecheck, and tests first. Then run the smallest consumer or integration checks that prove the public contract. Use broader repository gates only when the owning verification farm requires them or the user approves them.

On failure, report the exact command and focused error, fix the cause, and rerun
the failed gate. If a broad parallel runner times out while the same focused
package gate passes, record the broad run as failed or degraded execution, not
`PASS`; inspect task-owned processes and runner pressure before deciding whether
the product contract failed. Never seal with a skipped, waived, timed-out, or
unexplained required gate.

### 7. Seal or remain verified

Apply [references/seal-contract.md](references/seal-contract.md). Emit `SEALED` only when every required gate is green and a durable seal record location already exists or is explicitly named by the user or owning farm. Otherwise report `VERIFIED` with the missing seal condition.

A kernel seal is scoped evidence for the named capability and digest. It is not release approval, edition certification, a controlled-document lifecycle state, or Module Enterprise Readiness.

## Upgrade and reopen

Treat every change to a sealed target as `reopen` before implementation. Compare the new request and current snapshot with the prior seal record, classify the delta as `internal`, `additive`, or `breaking`, and invalidate only the affected evidence. Re-run all transitively affected gates before issuing a new seal.

Never preserve compatibility through a parallel public path unless the owning authority explicitly requires that path. Update consumers in the same bounded mission when the accepted contract changes.

## Completion report

Return:

```text
KERNEL RESULT: SCAFFOLDED | APPLIED | IMPLEMENTED | UPGRADED | VERIFIED | SEALED | REOPENED | BLOCKED
Target: <path>
Capability: <name>
Compatibility: internal | additive | breaking
Before digest: <sha256 or absent>
After digest: <sha256>
Contract changes: <exports, dependencies, behavior>
Evidence: <commands and outcomes>
Consumers checked: <paths or none>
Seal record: <durable path or not emitted>
Remaining conditions: none | <blocking condition>
```

## Resources

- [references/lifecycle.md](references/lifecycle.md) — modes, transitions, and required outputs.
- [references/seal-contract.md](references/seal-contract.md) — readiness gates and seal record schema.
- [references/config-kernel.md](references/config-kernel.md) — canonical dev-time profile registry, tool-required projections, consumer boundary, and cutover gates.
- [references/errors-kernel.md](references/errors-kernel.md) — protected error-kernel contract, consumer application, upgrade rules, and focused gates.
- [references/env-kernel.md](references/env-kernel.md) — canonical environment registries, isolated deployment entrypoints, derived runtime projection, and consumer gates.
- [references/testing-kernel.md](references/testing-kernel.md) — canonical testing lanes, root capabilities, executable setup boundaries, private source resolution, and cutover gates.
- [references/db-kernel.md](references/db-kernel.md) — canonical database runtime facade, structural schema exports, tenancy and permission projections, ownership boundaries, and cutover gates.
- [references/audit-kernel.md](references/audit-kernel.md) — canonical general-activity audit facade, guarded transaction boundary, masking and serialization ownership, projections, and cutover gates.
- [references/logger-kernel.md](references/logger-kernel.md) — canonical structured fields and redaction registry, correlation carriage, leaf boundary, and Node/edge projection parity.
- [references/http-kernel.md](references/http-kernel.md) — canonical correlation, transport pagination, Fetch pipeline, safe header attachment, and error-projection ownership split.
- [references/security-kernel.md](references/security-kernel.md) — canonical CSP, CORS, neutral security-header policy, hostile-input validation, and application-owned framework adaptation.
- [references/metrics-kernel.md](references/metrics-kernel.md) — canonical registry definitions, opaque recording capability, bounded cardinality, prohibited tenancy labels, and exposition ownership.
- [references/openapi-kernel.md](references/openapi-kernel.md) — leaf schema registration, envelope and stamped document generation, Node emission isolation, and canonical error-projection composition.
- [references/rate-limit-kernel.md](references/rate-limit-kernel.md) — canonical quota/key registry, opaque decisions, bounded vendor normalization, and cross-kernel projection composition before auth.
- [references/cache-kernel.md](references/cache-kernel.md) — canonical cache namespaces, opaque keys, L1/L2 and TTL policy, identical serialization, semantic invalidation, and failure normalization independent of rate limiting.
- [references/events-kernel.md](references/events-kernel.md) — canonical event registry, durable envelope, serialization, atomic lease claims, outbox lifecycle, and application-owned handler composition.
- [references/search-kernel.md](references/search-kernel.md) — canonical search entities, document normalization, sensitive metadata filtering, ranking, lifecycle, and isolated testing capability.
- [references/notifications-kernel.md](references/notifications-kernel.md) — canonical in-app vocabulary, persistence, expiry visibility, deduplication, recipient read state, and application-owned event interpretation.
- [references/auth-kernel.md](references/auth-kernel.md) — canonical sessions, organization binding, roles, Neon normalization, and isolated server/browser capabilities.
- [references/admin-kernel.md](references/admin-kernel.md) — canonical organization administration and usage, isolated RBAC-audit and health capabilities, atomic role/audit transactions, and general-audit separation.
- `scripts/inspect-target.mjs` — stable target or immediate package-band inventory, content digests, package metadata, and working-tree evidence.
