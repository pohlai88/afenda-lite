# Reusable kernel package scaffolding requirements

| Field | Value |
| --- | --- |
| Surface | `packages/KERNEL-SCAFFOLDING.md` |
| Status | Draft internal guide |
| Applies to | New or reworked bounded packages in foundation, runtime, data-plane, or control-plane bands |
| Does not authorize | A generic `@afenda/kernel`, a shared mega-package, a new package edge, or lifecycle promotion |
| Method | `afenda-elite-kernel` + semantic-first repository rules |

## 1. Required outcome

A kernel package owns **one bounded reusable capability** and makes its important
meaning changeable in one place. It is not a generic framework or a container for
unrelated helpers.

Every accepted kernel provides:

- one canonical semantic owner;
- one permanent package-root facade and one capability style;
- one ingress boundary that validates `unknown` and normalizes aliases immediately;
- types, behavior, serialization, diagnostics, policy, tooling artifacts, and
  documentation derived from the canonical owner;
- private adapters and representations that consumers cannot interpret;
- contract tests and repository guards that reject semantic duplication;
- reproducible evidence tied to the final package digest.

Internal representation changes require zero production-consumer edits. Only a
deliberate public-contract change may create a consumer migration.

## 2. Admission contract

Freeze and verify this from disk before creating files:

```yaml
kernel_mission:
  target: packages/<band>/<package>
  package_name: "@afenda/<package>"
  mode: scaffold
  capability: <one bounded capability>
  canonical_owner: <registry or policy owner>
  permanent_facade: "@afenda/<package>"
  owner: <package or application composition root>
  consumers: <verified intended direct consumers>
  inputs_outputs_errors: <frozen public contract>
  normalization_boundary: <ingress capability>
  projections: <derived runtime and tool artifacts>
  compatibility: additive
  dependency_edges: <package.json + authorized workspace edges>
  invariants: <security, tenancy, persistence, observability>
  acceptance: <focused commands and observable outcomes>
```

Stop when ownership, the permanent facade, or dependency direction is ambiguous.
A package band classifies the package; it never grants import rights.

## 3. Semantic ownership contract

| Concern | Requirement |
| --- | --- |
| Canonical definition | A logically singular typed registry or policy owner; physical modules may compose into it. |
| Identifiers | Stable canonical identifiers with uniqueness and referential-integrity validation. |
| Types | Derived from the canonical definitions; no separately maintained union. |
| Validation | External values enter as `unknown`; parse once and use discriminated, exhaustive results internally. |
| Aliases | Historical values live beside ingress, normalize immediately, are never accepted for new construction, and are never emitted. |
| Policy | Exhaustive centrally owned dispositions; occurrence data varies only within registry-approved bounds. |
| Projections | Runtime maps derive directly; static files are generated only for tools that require artifacts and identify their source. |
| Serialization | Package-owned, versioned, bounded, canonical-only on output, and hostile-input tested. |
| Vendor normalization | Vendor or unknown values normalize once at the package boundary; consumers never parse vendor codes. |
| Consumer behavior | Consumers call, carry, declare, narrow, or request projections; they do not reinterpret shared meaning. |

Definitions never contain live clients, transactions, stores, mutable adapters,
request state, secrets, or environment instances.

## 4. Public surface and physical scaffold

```text
packages/<band>/<package>/
├── package.json              # private ESM; root export only by default
├── tsconfig.json             # extends @afenda/config
├── README.md                 # ownership, consume, maintain, prohibitions
├── src/
│   ├── index.ts              # explicit permanent facade exports
│   ├── contract/             # canonical definitions and derived public types
│   ├── capabilities/         # representation-safe operations/projections
│   ├── ingress/              # validation, aliases, unknown/vendor normalization
│   ├── internal/             # private composition and implementation details
│   └── adapters/             # only when the capability needs adapters
├── __tests__/                # behavior, rejection, parity, boundary contracts
└── scripts/                  # deterministic checks/generation only when required
```

Folder names are dispositions, not mandatory placeholders. Omit empty surfaces,
but never omit real behavior, validation, tests, or documentation.

`package.json` must use `@afenda/<kebab-name>`, `private: true`, and `type: module`;
expose `"."` as the sole business entrypoint by default; declare every dependency;
use `workspace:*` for internal packages and the workspace catalog for catalogued
externals; and provide package-local `lint`, `typecheck`, and `test` scripts.

An auxiliary export is exceptional. It requires a named testing, composition,
tooling, deployment, or security isolation reason and accepted consumer class. It
must not expose alternate commands, results, registries, constructors, storage
shapes, or another capability style. Prove runtime and downstream TypeScript
resolution.

## 5. Boundary requirements

- Imports flow down the authorized DAG; packages never import `apps/*`.
- Cross-package imports use package names and declared exports only.
- Framework adaptation stays at the application composition root when it depends
  on Next.js, UI, request state, or higher-rank services.
- Public values reuse existing brands and canonical `@afenda/errors` `Result`.
- Implementation classes, constructors, clients, SQL, and vendor objects stay private.
- Product configuration uses `@afenda/env`; a leaf imports it only when its
  registered package contract explicitly permits that edge.
- Browser, edge, Node, and tooling contexts remain isolated when loading one would
  expose or eagerly validate another security/deployment context.

When persistence applies, canonical policy declares the durable facts needed for
truthful success; an adapter compiles the policy into its transaction. State,
required audit, required outbox, and consistency-critical derived writes commit
together or not at all. External calls begin from the committed outbox.

## 6. Required verification

| Gate | Required proof |
| --- | --- |
| Registry | Unique identifiers, exactly one owner, exhaustive dispositions, deterministic composition. |
| Ingress | Hostile input rejected; aliases normalize; output is canonical-only. |
| Projection parity | Every derived type, map, schema, and artifact has exact parity with its owner. |
| Facade | Root is the sole business API; no constructors, storage shapes, or registry representation leaks. |
| Bundle isolation | Each accepted entrypoint loads only its declared runtime/security context. |
| Errors | Unknown/vendor failures normalize once; consumers receive canonical `Result` behavior. |
| Security | Sensitive data, causes, secrets, and vendor payloads cannot reach public projections. |
| Persistence | Atomic success/rollback, tenant-hostility, and adapter parity where applicable. |
| Consumers | Every direct consumer compiles or passes its focused contract test. |
| Permanence | Checks reject deep imports, duplicate interpretation, manual projections, and forbidden entrypoints. |
| Static | Package lint and typecheck pass. |
| Snapshot | Final exports, dependencies, working-tree state, and content digest are recorded. |

Run focused package checks before consumer and workspace gates. A skipped,
timed-out, killed, or resource-starved gate is not a pass.

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/<band>/<package>
pnpm --filter @afenda/<package> lint
pnpm --filter @afenda/<package> typecheck
pnpm --filter @afenda/<package> test
pnpm governance:packages
```

Add owner-specific gates for tenancy, OpenAPI, runtime bundles, live databases, or
affected applications when those concerns belong to the capability.

## 7. Scaffold exit and lifecycle

`SCAFFOLDED` means a complete compiling and testable package shape exists. It does
not mean implemented, cut over, sealed, production-ready, or enterprise-ready.

Exit only when package identity, band, exports, scripts, dependencies, owner,
facade, ingress, projections, consumers, invariants, and non-goals match disk; real
behavior and rejection tests pass; no placeholder runtime path exists; and the
final inspector snapshot is recorded.

```text
ABSENT → SCAFFOLDED → IMPLEMENTED → VERIFIED → SEALED
```

A seal is valid only for the named capability and digest in an existing
owner-approved evidence surface. It is not release or module-readiness approval.

## 8. Rejected designs

- `@afenda/kernel`, `@afenda/shared`, `@afenda/common`, or a cross-domain registry package.
- Root plus v2, deprecated, singleton, or shim alternatives for one capability.
- Public implementation subpaths, constructors, clients, adapters, or store shapes.
- Manually synchronized types, maps, schemas, serializers, OpenAPI, or docs inventories.
- Consumer switches for shared status, retry, transport, wording, privacy, or diagnostics.
- Alias values as public construction values or emitted output.
- Framework or UI dependencies inside a neutral/leaf kernel.
- A broad consumer codemod used to conceal unresolved semantic ownership.

## 9. References

- [`afenda-elite-kernel`](../.cursor/skills/afenda-elite-kernel/SKILL.md)
- [`afenda-semantic-registry-cutover`](../.cursor/skills/afenda-semantic-registry-cutover/SKILL.md)
- [Monorepo boundaries](../docs-V2/monorepo/README.md)
- [Package catalog](./README.md)
- [`@afenda/errors` exemplar](./foundation/errors/README.md)
