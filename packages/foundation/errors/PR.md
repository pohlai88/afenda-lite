# PR: Establish the permanent `@afenda/errors` semantic facade

- **Status:** Approved in principle — implementation blocked pending contract freeze
- **Owner:** `@afenda/errors`
- **Audience:** package, application-boundary, API, and platform maintainers
- **Change class:** one final repository cutover; no parallel consumer APIs

## Implementation gate

Do not migrate a consumer until all four contracts below are reviewed, encoded
as compile-time fixtures, and accepted:

1. Exact grouped root-facade method signatures.
2. The opaque `Failure` versus public `ResultFailure` boundary.
3. Every canonical code's public-message and typed-details policy, based on a
   living consumer-details census.
4. The TypeScript-AST definition of allowed code use versus prohibited shared
   behavioral interpretation.

The proposed contracts in this document are the freeze candidate. Status moves
to **Ready for implementation** only after the remaining per-code details table
is completed from repository evidence and the fixtures compile.

## Decision

`@afenda/errors` becomes the sole semantic owner of Afenda failure meaning.
Consumers create, normalize, propagate, declare, or project failures through
one permanent root facade. They do not independently derive shared HTTP status,
retry policy, public-message policy, operational classification, diagnostics,
wire compatibility, or post-normalization business behavior from raw codes.

The package may contain arbitrarily complex classification and compatibility
logic. That complexity remains private. Changes within the established facade
and semantic contract must be made once in this package and must not require
consumer interpretation changes.

Deliberate changes to the public `Result` shape, removal of a facade capability,
or changes to an endpoint's declared outcomes may legitimately require explicit
consumer work. They are public-contract changes, not ordinary error-engine
maintenance.

## Problem

The current kernel centralizes important primitives but distributes semantics
through several public subpaths and consumer-owned decisions:

- `@afenda/errors/result` exposes result construction;
- `@afenda/errors/http` exposes transport assembly primitives;
- `@afenda/errors/common` exposes constructor-shaped factories;
- `@afenda/errors/adapters/postgres` makes consumers compose infrastructure
  normalization;
- public `AppError` construction exposes internal representation;
- consumers can independently map codes to status, retry, messages, or
  presentation behavior.

This is a shared library, but not yet a complete semantic boundary. Internal
changes can therefore become repository migrations instead of canonical-owner
changes.

### Living blast-radius baseline

Read-only inventory at proposal time:

- 823 files import `@afenda/errors` through any public surface;
- 740 files import an `@afenda/errors/*` subpath;
- 18 files reference `AppError` outside the package;
- 4 files reference shared HTTP status maps outside the package;
- 61 files are raw `.code` comparison/switch candidates requiring typed-AST
  classification.

These counts are migration evidence, not a hand-maintained registry. Final
governance discovers living consumers directly from the repository.

## Goals

1. Establish one canonical error-definition registry.
2. Establish one permanent grouped root facade: `@afenda/errors`.
3. Derive canonical and accepted codes, aliases, typed details, runtime details
   validation, public presentation, HTTP projection, retry policy, diagnostics,
   wire schemas, and OpenAPI metadata from the registry.
4. Normalize historical names as ingress data, never as parallel behavior.
5. Remove consumer knowledge of `AppError` and vendor implementation details.
6. Complete one final migration of existing leaks and delete superseded public
   surfaces in the same PR.
7. Enforce supported, mechanically identifiable forms of semantic leakage.

## Non-goals

- Domain-local outcome unions that never cross a public boundary.
- Translation resources or locale selection.
- Next.js response construction inside this Rank-1 leaf package.
- Runtime driver dependencies such as Drizzle, `pg`, or Prisma.
- A second error protocol, compatibility facade, or deferred migration.
- Proving mathematically that no disguised semantic duplicate can exist.

## Frozen terminology

| Term | Meaning |
|------|---------|
| `CanonicalErrorCode` | The one code emitted by current canonical projections. |
| `AcceptedErrorCode` | A canonical code or a reserved historical alias accepted only at ingress. |
| `Failure` | Opaque, package-created in-process value containing private control metadata. |
| `ResultFailure` | Safe public data projection with `ok: false`; never trusted as an internal `Failure`. |
| `Result<T>` | Transport-neutral `ResultSuccess<T> | ResultFailure`. |
| `SerializedFailureEnvelope` | Version-identified, public-safe wire data. |

Structural resemblance never converts data into a trusted `Failure`.

## Canonical semantic registry

Create one internal registry under `src/contract/`. Its implementation layout
is private, but every definition must carry enough information to derive all
shared projections:

```ts
const ERROR_DEFINITIONS = {
	FORBIDDEN: {
		aliases: [],
		category: "authorization",
		public: {
			messageKey: "errors.forbidden",
			defaultMessage: "The operation is not permitted",
			messagePolicy: "fixed",
			details: "none",
		},
		http: {
			status: 403,
			retryAfter: "never",
		},
		retry: {
			retryable: false,
		},
		operations: {
			operational: true,
			severity: "warning",
		},
		openapi: {
			description: "The caller is not permitted to perform the operation",
		},
	},
} as const;
```

The registry derives:

- `CanonicalErrorCode` and `AcceptedErrorCode`;
- alias normalization and reserved historical names;
- per-code construction input and details types;
- runtime details validation and defense-in-depth sanitation;
- stable presentation key, fallback message, and override policy;
- HTTP status, headers, and bounded `Retry-After`;
- operational, severity, and retry classification;
- safe diagnostic projection;
- serialized-wire validation and normalization;
- OpenAPI response metadata.

No consumer or sibling package maintains another error-code registry, status
map, retry map, public-message map, or wire policy.

### Public-message policy

Each definition selects exactly one policy:

```ts
type PublicMessagePolicy =
	| "fixed"
	| "sanitized-override"
	| "details-derived";
```

- `fixed`: the registry fallback is always emitted; consumer wording is not
  accepted.
- `sanitized-override`: a typed construction input may supply bounded public
  wording; the registry sanitizer remains authoritative.
- `details-derived`: wording is derived from registry-approved typed details;
  arbitrary wording is not accepted.

`INTERNAL_ERROR` is always `fixed`, emits `An unexpected error occurred`, and
emits no public details. `FORBIDDEN` and `UNAUTHORIZED` are normally `fixed`.
Validation and rate-limit definitions may use a narrower approved policy.

Consumers normally supply an internal operation label and typed details, not
public copy.

### Typed details policy

`SafeDetails` remains the bounded runtime output type. It is not the public
construction input.

The registry must derive an exhaustive code-indexed contract:

```ts
type ErrorDetailsByCode = {
	FORBIDDEN: undefined;
	INTERNAL_ERROR: undefined;
	VALIDATION_ERROR: ValidationErrorDetails;
	RATE_LIMITED: RateLimitedDetails;
	// Every other canonical code is explicit.
};
```

The same registry descriptor owns:

- the TypeScript input type;
- the runtime validator;
- sanitation and size bounds;
- the public serialized shape;
- the OpenAPI details schema.

Runtime sanitation remains mandatory even after compile-time validation.

Before implementation, inventory every living `details` shape and classify it
as one of:

- canonical public detail retained in `ErrorDetailsByCode`;
- private diagnostic metadata moved into `Failure`;
- domain outcome data moved out of the shared error contract;
- unsafe data removed.

The observed baseline includes field errors, correlation references, retry
hints, service identifiers, and domain-specific disposition data. Do not guess
their final ownership or use an open `Record<string, unknown>` escape hatch.

### Localization boundary

The registry owns stable meaning and fallback presentation:

```ts
public: {
	messageKey: "errors.forbidden",
	defaultMessage: "The operation is not permitted",
	messagePolicy: "fixed",
}
```

UI localization resources own translations for `messageKey`. Translations may
change wording only; they may not change code identity, status, retry, security,
or operational classification. UI code must not maintain a code-to-message map.

## Alias and historical-input contract

Aliases are compatibility data normalized at ingress. The generated alias
ledger must satisfy all of these invariants:

1. One alias maps to exactly one canonical code.
2. An alias is never simultaneously canonical.
3. Retired canonical codes remain reserved.
4. A historical name is never reassigned to another meaning.
5. Canonical serialization never emits an alias.
6. Alias collisions fail package initialization and contract tests.

Conceptually:

```ts
const ERROR_ALIASES = {
	FORBIDDEN: "ACCESS_DENIED",
} as const;
```

The ledger may be derived from `ERROR_DEFINITIONS`, but it is tested as a
separate generated contract. Historical values remain readable while retained
by the canonical compatibility policy and may never be reassigned to another
meaning.

## Opaque `Failure` runtime identity

TypeScript branding alone is insufficient. The implementation must establish
private runtime identity using an unexported internal class, unexported symbol,
or package-private `WeakSet<object>`.

Freeze candidate:

```ts
const trustedFailures = new WeakSet<object>();

function createFailure(input: InternalFailureInput): Failure {
	const failure = Object.freeze(createInternalFailureRecord(input));
	trustedFailures.add(failure);
	return failure as Failure;
}
```

Every operation requiring private control metadata verifies package identity.
A forged `value as Failure` is rejected or safely normalized. Wire objects and
public `ResultFailure` values are data: they pass through validation and never
gain trust through structural resemblance.

## Permanent grouped root facade

All consumers import from one root package:

```ts
import { errors, type Failure, type Result } from "@afenda/errors";
```

The grouping is capability organization, not multiple package surfaces.

### Freeze-candidate signatures

```ts
type FailureContext = Readonly<{
	operation: string;
	correlationId?: string;
}>;

type FailureInput<C extends AcceptedErrorCode> =
	& FailureContext
	& DetailsInputFor<C>
	& PublicMessageInputFor<C>;

interface ErrorsFacade {
	readonly result: {
		ok<T>(data: T): ResultSuccess<T>,
		fail<C extends AcceptedErrorCode>(
			code: C,
			input: FailureInput<C>,
		): ResultFailure<CanonicalCodeFor<C>>,
	};
	readonly ingress: {
		code<C extends AcceptedErrorCode>(
			code: C,
			input: FailureInput<C>,
		): Failure,
		unknown(error: unknown, context: FailureContext): Failure,
		postgres(error: unknown, context: FailureContext): Failure,
	};
	readonly project: {
		result(failure: Failure): ResultFailure,
		http(input: Failure | ResultFailure): HttpErrorProjection,
		presentation(
			input: Failure | ResultFailure,
		): PublicErrorPresentation,
		diagnostics(failure: Failure): ErrorDiagnosticFields,
	};
	readonly wire: {
		serialize(
			input: Failure | ResultFailure,
		): SerializedFailureEnvelope,
		deserialize(input: unknown): Failure,
	};
	readonly openapi: {
		responses<const C extends readonly CanonicalErrorCode[]>(
			codes: C,
		): OpenApiResponsesProjection<C>,
	};
}

declare const errors: ErrorsFacade;
```

Required usage is unambiguous:

```ts
const success = errors.result.ok(data);

const resultFailure = errors.result.fail("CONFLICT", {
	operation: "invoice.create",
});

const failure = errors.ingress.unknown(error, {
	operation: "invoice.create",
});

const databaseFailure = errors.ingress.postgres(error, {
	operation: "invoice.create",
});

return errors.project.result(databaseFailure);
```

Boundary projections remain explicit:

```ts
errors.project.http(failure);
errors.project.presentation(failure);
errors.project.diagnostics(failure);
errors.wire.serialize(failure);
errors.wire.deserialize(input);
```

`errors.result.fail` returns a public failed result. `errors.ingress.*` returns
an opaque `Failure`. `errors.project.result` is the only opaque-to-result
projection. These meanings must not be overloaded.

When `project.http` or `wire.serialize` receives a public `ResultFailure`, it
validates and canonicalizes the data; it does not treat it as a trusted
`Failure` or invent missing private metadata.

## Public `Result` contract

```ts
type Result<T> =
	| { ok: true; data: T }
	| {
			ok: false;
			code: CanonicalErrorCode;
			message: string;
			messageKey: string;
			details?: SafeDetails;
	  };
```

The final inclusion of `messageKey` is part of the contract freeze and must be
validated against current `ActionResult` and OpenAPI compatibility before
migration begins. If omitted from the public wire, the accepted alternative
must specify how UI localization obtains the canonical key without a code map.

The failure contains safe public data only. Cause, stack, SQL, connection data,
credentials, vendor payloads, operational classification, and the internal
retryable flag never enter `ResultFailure`. A bounded public transport hint such
as rate-limit retry seconds appears only when the registry permits it.

## Allowed and prohibited code use

Consumers may carry, declare, test, serialize, display, and expose canonical
codes. They may also normalize an owned domain outcome into a canonical code at
the boundary.

| Allowed | Prohibited shared interpretation |
|---------|-----------------------------------|
| Pass a canonical code through `Result` or a public wire | Select HTTP status from a code |
| Declare endpoint outcomes for OpenAPI | Decide retryability or `Retry-After` from a code |
| Assert an exact public contract in a test | Choose or sanitize public wording from a code |
| Supply a code to `errors.result.fail` / `errors.ingress.code` | Reclassify operational status or severity |
| Display the canonical code as diagnostic/reference data | Branch business behavior after canonical normalization |
| Translate a registry-provided `messageKey` | Maintain a code-to-message translation map |

If business behavior genuinely differs, express it as an owned domain outcome
before normalization rather than reverse-engineering behavior from the shared
canonical code.

## Wire compatibility

Callers never select a protocol version. The current serializer emits one
canonical schema identifier:

```json
{
  "schema": "afenda.failure/v1",
  "code": "CONFLICT",
  "messageKey": "errors.conflict",
  "message": "The operation conflicts with the current state"
}
```

`errors.wire.deserialize` may accept retained historical schemas and aliases,
then normalizes them to the current opaque `Failure`. Unknown, malformed, or
hostile input becomes a safe `INTERNAL_ERROR`. No `@afenda/errors/v1` or
consumer-selected decoder is introduced.

## OpenAPI ownership

The registry owns each code's body schema, safe details, HTTP status,
description, and retry headers. It does not know which endpoint may emit which
outcomes.

Endpoint code may declare possible outcomes without interpreting them:

```ts
errors.openapi.responses([
	"VALIDATION_ERROR",
	"CONFLICT",
	"INTERNAL_ERROR",
]);
```

The declaration selects registry-owned projections; it does not duplicate
status, schema, message, or retry semantics.

## Boundary flow

```text
native · vendor · owned domain outcome
                 ↓
        @afenda/errors ingress
    classify · alias · validate · redact
                 ↓
        opaque canonical Failure
                 ↓
 Result · HTTP · presentation · diagnostics · wire · OpenAPI
                 ↓
     consumers carry the selected projection
```

`apps/web` may retain thin framework constructors such as `mapPackageResult` or
`jsonAppError`, but they contain no error semantics. They only apply a canonical
projection to framework types such as `NextResponse`.

## Repository enforcement

Use the TypeScript compiler API, not regex alone, for typed raw-code rules.
Regex may assist candidate discovery but cannot decide semantic ownership.

Mechanically enforce:

- no `@afenda/errors/*` consumer subpath imports;
- no exported or consumer-constructed `AppError`;
- no typed `ResultFailure.code` switch/equality that derives prohibited shared
  behavior;
- no duplicate objects mapping canonical codes to status, retry, or messages;
- no manual known failure-wire shapes or serialization;
- no raw stack, cause, SQL, credentials, or unsafe message access at a public
  boundary;
- no consumer composition of PostgreSQL mapping and generic fallback;
- no version-selected consumer API.

Repository enforcement rejects all supported and mechanically identifiable
semantic-leakage patterns. Package ownership and review policy prohibit
equivalent disguised implementations. Do not claim mathematical proof of total
absence.

## Security invariants

- Only runtime-identified, package-created `Failure` values are trusted
  in-process.
- Wire objects and `ResultFailure` values remain untrusted data.
- `INTERNAL_ERROR` has fixed safe presentation and no public details.
- Other messages follow the registry policy and remain bounded and
  control-character free.
- Details reject credential-shaped keys, connection URLs, SQL/DML/DDL text,
  hostile accessors, cycles, and oversized values.
- Retryability is typed private policy, not inferred from caller data.
- Diagnostics exclude raw messages, causes, stacks, SQL, credentials, and
  driver payloads.

## Bundle and dependency containment

One root import must not mean one eager runtime bundle. The root remains a
Rank-1, driver-free, framework-free ESM leaf with no side effects. The facade
implementation must preserve tree-shaking so a consumer using only
`errors.result.ok` does not pull PostgreSQL, HTTP, diagnostics, wire, or OpenAPI
implementation code into its bundle.

Add a representative client/server bundle fixture or metafile assertion. If
the grouped runtime object prevents reliable property-level tree-shaking, keep
the same root package and semantic grouping through tree-shakeable named
capability exports; do not restore package subpaths merely to solve bundling.

## Sealed migration lanes

The work remains one final PR and one atomic main-branch cutover. Organize it
into reviewable, sealed lanes:

1. **Contract foundation** — registry, grouped facade, runtime opacity, wire
   schema, per-code details/message contracts, and compile-time fixtures.
2. **Boundary adapters** — HTTP, presentation, diagnostics, PostgreSQL, and
   OpenAPI projections.
3. **Mechanical imports** — root-import conversion without behavioral changes.
4. **Semantic consumers** — remove prohibited code interpretation, duplicate
   maps, unrestricted messages/details, and manual normalization.
5. **Hostile-boundary audit** — public leakage, deserialization, redaction, and
   message-policy verification.
6. **Deletion commit** — remove subpath exports, public `AppError`, and replaced
   compatibility surfaces.
7. **Governance seal** — run repository checks and refresh the protection
   digest.

Each commit must compile or document an explicit migration state in the PR.
The final PR tree exposes only the new contract. No lane may merge separately,
and no old/new dual surface remains at final review.

## Contract and enforcement tests

Add executable evidence for:

1. Registry completeness across every required projection.
2. Type-level per-code details and message-policy constraints.
3. Runtime details validation and defense-in-depth sanitation.
4. Alias uniqueness, reserved-name protection, collision failure, and
   canonical-only emission.
5. Runtime rejection of forged `Failure` values.
6. Result discrimination and accepted public wire keys.
7. Current-schema serialization and historical-schema deserialization.
8. Hostile deserialization and safe unknown fallback.
9. HTTP status/body/header and bounded retry projection.
10. PostgreSQL SQLSTATE and unknown-failure total normalization.
11. Presentation key/fallback and localization boundary.
12. OpenAPI registry parity plus endpoint outcome declaration.
13. AST fixtures for every allowed and prohibited code-use category.
14. No subpath imports, duplicate maps, manual wire construction, or public
    leakage outside the package.
15. A fixture proving that an internal representation change requires no
    consumer source change.
16. A fixture proving that adding a non-colliding alias is a registry-only
    change.
17. A bundle fixture proving result-only consumers do not include unrelated
    adapter/projection implementations.

## Acceptance criteria

- The four implementation-gate contracts are frozen before consumer migration.
- One canonical registry owns all shared error semantics.
- One grouped root facade is the only consumer surface.
- `Failure` has verified private runtime identity.
- `ResultFailure` remains safe public data and cannot impersonate `Failure`.
- Every code has an explicit message, localization, and typed-details policy.
- Wire output has a schema identifier; callers never select versions.
- Alias invariants and reserved historical names are enforced.
- Endpoint outcome declaration is supported without semantic duplication.
- The root facade remains side-effect-free and bundle-contained.
- Allowed code carriage/declaration is not falsely rejected.
- Supported prohibited interpretation patterns are rejected through typed AST
  checks and governance.
- All living consumers compile against the root facade.
- Superseded subpaths and public implementation APIs are deleted.
- Package and repository contract tests pass.
- The protection digest matches the verified final implementation.
- No shim, parallel version, deferred migration, or cleanup item remains.

The success condition is:

> A consumer can create, normalize, propagate, declare, or project a failure
> only through the root `@afenda/errors` facade. Shared meaning—including
> canonical identity, aliases, safe public presentation, HTTP behavior, retry
> policy, diagnostics, and wire compatibility—is derived from one internal
> registry. Changes within the established semantic contract require no
> consumer interpretation changes, and repository enforcement rejects
> supported forms of redistributed semantics.

## Verification

```bash
pnpm --filter @afenda/errors protect:check
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
pnpm run test:errors-normalization
pnpm run check:errors-consumption
pnpm run check:errors-adoption -- --strict
pnpm run check:errors-normalization -- --strict
pnpm lint
pnpm typecheck
pnpm test
```

The existing error governance commands may be replaced or strengthened in this
PR. Their final equivalents must enforce the semantic boundary above rather
than merely count imports or migrated files.
