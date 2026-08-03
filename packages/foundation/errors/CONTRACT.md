# `@afenda/errors` semantic control-plane contract

- **Status:** Complete — Lanes 1–7 implemented and repository cutover sealed
- **Owner:** `@afenda/errors`
- **Audience:** package, application-boundary, API, and platform maintainers
- **Change class:** one final repository cutover; no parallel consumer APIs
- **Consumer migration:** complete; root-only imports and the permanent
  capability surface are enforced
- **Kernel PRD:** [`PRD.md`](./PRD.md) (governance formalization open)
- **Admission draft:** [`ADMISSION.md`](./ADMISSION.md)
- **Kernel governance:** [`packages/KERNEL-GOVERNANCE.md`](../../KERNEL-GOVERNANCE.md)

## Decision summary

`@afenda/errors` becomes the sole semantic owner of shared Afenda failure
meaning. Consumers use one root package entrypoint and one permanent set of
tree-shakeable named capability objects. They may create, normalize, propagate,
declare, or project failures; they do not independently derive shared HTTP,
retry, diagnostic, or wire behavior from error codes.

The semantic registry is logically singular and physically modular. Internal
complexity may grow without widening the consumer contract.

### Frozen contract decisions

| Decision | Frozen outcome |
|----------|----------------|
| New construction | Canonical codes only; historical aliases are internal ingress data. |
| Construction inputs | Public `ResultFailureInput<C>` is separate from contextual opaque `FailureInput<C>`; neither accepts private diagnostics. |
| Retry | Exhaustive canonical per-code classification; only bounded timing varies per occurrence. |
| Root capability style | Named ESM capability objects only; no permanent singleton `errors` object. |
| Result typing | `Result<T, C>` and `ResultFailure<C>` preserve operation-specific code unions. |
| Localization | `messageKey` is included in `ResultFailure`, ActionResult, HTTP, and wire projections. |
| Runtime trust | Empty frozen identity backed by a private `WeakMap`; structural values are never trusted. |
| HTTP compatibility | Preserve the living `{ error: ... }` body wrapper; add canonical `messageKey`. |
| Wire compatibility | Emit `{ schema, error }`; accept the legacy unversioned flat value internally. |

Lane 1 and every package-owned Lane 2 boundary capability are implemented. The
authorized working-tree cutover includes the repository-wide import,
semantic-consumer, hostile-boundary, deletion, documentation, and protection
lanes. The execution evidence is recorded in `PR.md`.

### Verified implementation state — 2026-07-31

- All five permanent capability facades exist and are thin frozen composition
  surfaces: `errorResult`, `errorIngress`, `errorProject`, `errorWire`, and
  `errorOpenApi`.
- Result, ingress, retry, Result projection, HTTP projection, diagnostics, wire,
  and OpenAPI behavior lives in its owning folder; capability files contain no
  policy implementation.
- Wire emits only `afenda.failure/v1`, reads only V1 plus the retained legacy
  flat shape, applies all hostile-input bounds, and creates local opaque failure
  identity with operation `errors.wire.deserialize`.
- OpenAPI derives status, descriptions, messages, details, and headers only from
  the registry; duplicate `409` variants form one deterministic `oneOf`.
- Package evidence: lint green; source and contract typechecks green; 8 runtime
  test files / 89 tests green; 66 capability calls inspected and 28 unsafe
  fixtures rejected; result 24,832/40,960 bytes, retry 29,247/40,960 bytes,
  wire 37,309/53,248 bytes, and OpenAPI 29,931/49,152 bytes.
- Repository evidence: `check:errors-boundary` green;
  `check:errors-semantics --strict` reports 834 canonical consumers, 0 partial
  consumers, and 0 findings in every prohibited interpretation category;
  `check:openapi` is green.
- Consumer sources use the root capability facade, legacy package subpaths and
  implementation exports are deleted, and `package.json.exports` contains only
  `"."`.
- Lane 7 is complete. Package documentation, generated OpenAPI, repository
  semantic gates, focused consumer suites, and the protection digest match the
  final cutover. The saturated combined repository test run produced one
  resource-only Master Data timeout; that complete package passes standalone.

## Problem

The current package is a capable utility kernel, but shared semantics still
escape through multiple public subpaths and implementation ingredients:

- `@afenda/errors/result` exposes result construction;
- `@afenda/errors/http` exposes transport assembly primitives;
- `@afenda/errors/common` exposes constructor-shaped factories;
- `@afenda/errors/adapters/postgres` makes consumers compose infrastructure
  normalization;
- public `AppError` construction exposes representation;
- consumers can independently map codes to status, retry, messages, details,
  or other public projections.

An internal hardening change can therefore become a repository migration.
This contract governs the package cutover from shared utilities into an error
control plane.

### Living evidence baseline

Read-only inventory at proposal time:

- 823 files import `@afenda/errors` through any public surface;
- 740 files import an `@afenda/errors/*` subpath;
- 18 files reference `AppError` outside the package;
- 4 files reference shared HTTP status maps outside the package;
- 61 files are raw `.code` comparison/switch candidates requiring typed-AST
  classification;
- 2,587 valid literal-code `fail()` calls, 27 dynamic-code calls, and two
  test-only invalid `"INTERNAL"` calls exist in `apps/` and `packages/`.

These are migration evidence, not a permanent consumer registry. Governance
discovers living code directly from the repository.

## Goals

1. One logically singular, physically modular semantic registry.
2. One root package entrypoint with tree-shakeable named capabilities.
3. Opaque in-process `Failure<C>` identity with private control metadata.
4. Code-narrowable public `Result<T, C>` outcomes.
5. Canonical-only construction and internal-only alias compatibility.
6. Per-code typed details and public-message policy at compile time and runtime.
7. Derived result, HTTP, diagnostics, wire, and OpenAPI projections.
8. One final migration that deletes all superseded consumer surfaces.
9. Permanent typed-AST boundary and semantic governance.

## Non-goals

- Domain-local outcome unions that never cross an owned public boundary.
- Translation resources or locale selection.
- Next.js response construction in this Rank-1 leaf.
- Runtime dependencies on Drizzle, `pg`, Prisma, Zod, or other `@afenda/*`
  packages.
- Consumer-selected `/v1` or `/v2` APIs.
- Mathematical proof that no deliberately disguised duplicate can exist.

## Target package architecture

The registry is not one enormous source file. Modules compile into one
canonical structure:

```text
packages/foundation/errors/
├── README.md
├── package.json
├── src/
│   ├── index.ts
│   ├── public-types.ts              # registry-derived public types
│   ├── capabilities/
│   │   ├── result.ts
│   │   ├── ingress.ts
│   │   ├── project.ts
│   │   ├── wire.ts
│   │   └── openapi.ts
│   ├── contract/
│   │   ├── definitions/
│   │   │   ├── access.ts
│   │   │   ├── request.ts
│   │   │   ├── resource.ts
│   │   │   ├── concurrency.ts
│   │   │   ├── availability.ts
│   │   │   └── internal.ts
│   │   ├── aliases.ts
│   │   ├── bounds.ts
│   │   ├── define-error.ts
│   │   ├── details.ts
│   │   ├── invariants.ts
│   │   ├── openapi-metadata.ts
│   │   └── registry.ts
│   ├── failure/
│   │   ├── types.ts
│   │   ├── identity.ts
│   │   ├── create.ts
│   │   └── context.ts
│   ├── result/
│   │   ├── ok.ts
│   │   └── fail.ts
│   ├── ingress/
│   │   ├── code.ts
│   │   ├── unknown.ts
│   │   └── postgres.ts
│   ├── project/
│   │   ├── result.ts
│   │   ├── retry.ts
│   │   ├── http.ts
│   │   └── diagnostics.ts
│   ├── openapi/
│   │   ├── types.ts
│   │   └── responses.ts
│   ├── wire/
│   │   ├── types.ts
│   │   ├── schema.ts
│   │   ├── serialize.ts
│   │   ├── deserialize.ts
│   │   └── historical.ts
│   ├── security/
│   │   └── normalize.ts
│   └── internal/
│       ├── object.ts
│       └── public-error-data.ts
├── __tests__/
│   ├── contract/
│   ├── failure/
│   ├── ingress/
│   ├── projections/
│   ├── security/
│   ├── wire/
│   ├── type-fixtures/{allowed,rejected}/
│   └── bundle-fixtures/
└── scripts/
    ├── check-contract.ts
    ├── check-boundary.ts
    └── check-semantics.ts
```

This is a target responsibility map, not permission to create empty scaffolding.
Create each module with its complete implementation and tests in its sealed
migration lane.

## Canonical registry

Each definition is exhaustive. No optional semantic fields are permitted:

```ts
type RegistryDefinition = ErrorDefinition<
	string,
	`errors.${string}`,
	PublicDetailsContract<string, unknown, unknown, string | null>,
	PublicMessagePolicy,
	boolean,
	ErrorRetryAfterPolicy,
	number
>;
```

The generic literals preserve each code, message policy, retryability, and
timing policy for derived types. The machine definition in
`src/contract/define-error.ts` is authoritative; this contract does not maintain a
parallel handwritten policy interface.

Example:

```ts
const FORBIDDEN = defineError({
	aliases: aliasesFor("FORBIDDEN"),
	category: "authorization",
	code: "FORBIDDEN",
	details: noPublicDetails(),
	http: {
		status: 403,
	},
	lifecycle: {
		introduced: "2026-08",
		replacedBy: null,
		retired: null,
		status: "active",
	},
	openApi: {
		description: "The caller is not permitted to perform the operation",
		headers: {},
	},
	operations: {
		operational: true,
		severity: "warning",
	},
	public: {
		messageKey: "errors.forbidden",
		defaultMessage: "The operation is not permitted",
		messagePolicy: "fixed",
	},
	retry: {
		retryAfter: "never",
		retryable: false,
	},
});
```

Definition modules compile once:

```ts
export const ERROR_REGISTRY = defineErrorRegistry({
	...ACCESS_ERROR_DEFINITIONS,
	...REQUEST_ERROR_DEFINITIONS,
	...RESOURCE_ERROR_DEFINITIONS,
	...CONCURRENCY_ERROR_DEFINITIONS,
	...AVAILABILITY_ERROR_DEFINITIONS,
	...INTERNAL_ERROR_DEFINITIONS,
});
```

`defineErrorRegistry` enforces uniqueness and completeness at typecheck and
runtime initialization.

### Registry scalability rules

1. Shared codes are generic across multiple domains.
2. Domain outcomes such as `INVOICE_ALREADY_POSTED` or
   `LEAVE_BALANCE_INSUFFICIENT` stay domain-owned and normalize at their owner
   boundary.
3. Every definition supplies all semantics; no `httpStatus?`, `retryable?`, or
   open details record is valid.
4. Construction never accepts `Record<string, unknown>` details.
5. Each detail contract has an explicit type, validator, public keys, bounds,
   and OpenAPI schema.
6. Lifecycle metadata records introduction, retirement, replacement, and
   reserved historical names. Build output may erase maintainer-only lifecycle
   metadata from runtime bundles.
7. `defineError` clones and freezes every nested semantic surface, including
   the details descriptor, its public keys, and its OpenAPI metadata; mutable
   authoring aliases cannot change a validated registry later.

## Target canonical codes and policies

The final registry contains these generic codes:

| Code | HTTP | Retryable | Message policy | Public details |
|------|-----:|-----------|----------------|----------------|
| `BAD_REQUEST` | 400 | No | `sanitized-override` | none |
| `UNAUTHORIZED` | 401 | No | `fixed` | none |
| `FORBIDDEN` | 403 | No | `fixed` | none |
| `NOT_FOUND` | 404 | No | `sanitized-override` | none |
| `CONFLICT` | 409 | No | `sanitized-override` | none |
| `CONCURRENCY_CONFLICT` | 409 | Yes | `fixed` | none |
| `VALIDATION_ERROR` | 422 | No | `sanitized-override` | `fieldErrors` only |
| `RATE_LIMITED` | 429 | Yes | `fixed` | optional bounded `retryAfterSeconds` |
| `INTERNAL_ERROR` | 500 | No | `fixed` | optional bounded `correlationId` only |
| `SERVICE_UNAVAILABLE` | 503 | Yes | `fixed` | none |

`CONCURRENCY_CONFLICT` separates retryable PostgreSQL serialization, deadlock,
and lock contention from non-retryable business `CONFLICT`. Permanent auth or
configuration failures normalize to `INTERNAL_ERROR`, not retryable
`SERVICE_UNAVAILABLE`.

### Public-message policy

```ts
type PublicMessagePolicy =
	| "fixed"
	| "sanitized-override";
```

- `fixed`: registry fallback only; consumer wording is rejected by type.
- `sanitized-override`: construction requires bounded, statically authored
  public wording and the registry sanitizer remains authoritative.

No living evidence requires a global `details-derived` policy. It can be added
only through a future canonical-contract review.

`INTERNAL_ERROR` always emits `An unexpected error occurred`. Its caller text,
operation, source exception, and SQL remain private diagnostics. Its sole
optional public detail is a bounded correlation reference.

For `sanitized-override`, the semantic AST gate accepts only:

- a string literal at the call site; or
- a `const` identifier that resolves through `const`-only aliases to static
  source text.

It rejects every template expression and binary string concatenation, including
apparently static operands, plus `error.message`, member access, function
results, request or database values, environment values, and identifiers that
do not resolve entirely to static source text. Copy-bearing capability inputs
must be inline object literals: input aliases and every object/array spread are
rejected even when their declarations were `const`, because JavaScript can
mutate a readonly-looking container before the call. Unresolved computed
properties are rejected. An `as` assertion does not make dynamic text static.
Runtime sanitation remains mandatory defense in depth, but it never authorizes
dynamic or protected data as public copy. Empty or invalid runtime overrides
use the registry fallback and are never emitted unsanitized.

Capability ownership is part of this control. `errorResult.fail` and
`errorIngress.code` must be called from their canonical named capability
objects. Method extraction, destructuring, wrapping, higher-order handoff, or
escape of the whole capability object is rejected. Direct non-copy methods such
as `errorResult.ok`, `errorResult.retryAfterSeconds`, and
`errorIngress.unknown` remain valid. Literal and `const`-resolved computed
method names are still inspected; an unresolved computed access is not an
escape hatch.

The details descriptor owns `staticFieldMessageProperty`. When it names a
public details field, every copied field-message element and every field name
must also be statically resolvable by the semantic gate. The `fieldErrors`
object and each message array must be inline literals without spreads; only
primitive authored constants may be reused for individual strings and computed
field names. The type surface rejects widened string messages and dynamic
string-indexed field maps. This policy is derived from `ERROR_REGISTRY`; no
checker hardcodes `VALIDATION_ERROR` or `fieldErrors` as a special code path.

### Typed public details

```ts
type PublicFieldErrors = Readonly<
	Record<string, readonly string[]>
>;

declare const retryAfterSecondsBrand: unique symbol;
type RetryAfterSeconds = number & {
	readonly [retryAfterSecondsBrand]: "RetryAfterSeconds";
};

type PublicDetailsByCode = {
	BAD_REQUEST: undefined;
	UNAUTHORIZED: undefined;
	FORBIDDEN: undefined;
	NOT_FOUND: undefined;
	CONFLICT: undefined;
	CONCURRENCY_CONFLICT: undefined;
	VALIDATION_ERROR:
		| Readonly<{ fieldErrors: PublicFieldErrors }>
		| undefined;
	RATE_LIMITED:
		| Readonly<{ retryAfterSeconds: RetryAfterSeconds }>
		| undefined;
	INTERNAL_ERROR:
		| Readonly<{ correlationId: string }>
		| undefined;
	SERVICE_UNAVAILABLE: undefined;
};

type PublicDetailsFor<C extends CanonicalErrorCode> =
	PublicDetailsByCode[C];

type DefinedPublicDetailsFor<C extends CanonicalErrorCode> =
	Exclude<PublicDetailsFor<C>, undefined>;

type PublicDetailsField<C extends CanonicalErrorCode> =
	[DefinedPublicDetailsFor<C>] extends [never]
		? Readonly<{ details?: never }>
		: undefined extends PublicDetailsFor<C>
			? Readonly<{ details?: DefinedPublicDetailsFor<C> }>
			: Readonly<{ details: DefinedPublicDetailsFor<C> }>;

export type PublicErrorData<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = C extends CanonicalErrorCode
	? Readonly<{
		code: C;
		messageKey: MessageKeyFor<C>;
		message: string;
	}> & PublicDetailsField<C>
	: never;
```

`PublicErrorData<C>` is the one shared public payload. `ResultFailure`, HTTP,
wire, and OpenAPI wrap or extend it without recreating its fields. Structural
parity does not make those protocols interchangeable.

Construction may accept `readonly string[] | undefined` for field errors. The
canonical output removes empty fields and undefined entries. A public caller
cannot pass a raw number as retry timing: `RetryAfterSeconds` is an opaque
bounded value returned only by the exported result capability's validating
constructor. The constructor accepts only finite integers from 1 through
86,400 and rejects every other value. The historical `retryAfter` key is
accepted only by internal wire compatibility and canonicalizes through the
same validator to `retryAfterSeconds`.

Runtime validation and defense-in-depth sanitation remain mandatory after
compile-time validation.

### Frozen public bounds

All character counts are Unicode code points. All byte counts are UTF-8 bytes;
object limits use `JSON.stringify` followed by UTF-8 encoding. Envelope depth
counts each object or array container with the envelope root at depth 1. The
key limit counts object property names across the entire value; array indexes
do not count.

Wire copy work has two additional derived budgets. Each array is limited to the
100-position field-input window, and all array positions across the complete
value are limited to `fieldCount * fieldMessagesPerField` = 500, the maximum
valid canonical validation payload. Shared references count again on every
appearance, so a shallow graph cannot amplify copy work. String values and
object-key names reserve one cumulative 32,768-byte raw UTF-8 budget while the
inert copy is built; the final `JSON.stringify` byte check remains authoritative
for escaping and structural overhead. Global key count is checked before key
inspection.

```ts
const ERROR_LIMITS = {
	publicMessageCharacters: 500,
	publicMessageBytes: 2000,
	messageKeyCharacters: 120,
	correlationIdCharacters: 128,
	fieldCount: 50,
	fieldInputKeys: 200,
	fieldInputMessagesPerField: 100,
	fieldNameCharacters: 100,
	fieldMessagesPerField: 10,
	fieldMessageCharacters: 300,
	publicDetailsBytes: 16_384,
	retryAfterSecondsMinimum: 1,
	retryAfterSecondsMaximum: 86_400,
	operationCharacters: 120,
	textInputCodeUnitsPerCharacter: 4,
	wireDepth: 6,
	wireKeys: 64,
	wireBytes: 32_768,
} as const;

const MESSAGE_KEY_PATTERN =
	/^errors\.[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const OPERATION_PATTERN = /^[A-Za-z][A-Za-z0-9._:/-]*$/;
```

Registry initialization rejects a message key that exceeds its bound or fails
its pattern. Public message overrides are outer-trimmed, stripped of control
characters, and accepted only when the non-empty result satisfies both message
bounds; otherwise the registry fallback is emitted. Field-error normalization
applies the field count, name, per-field message count, per-message length, and
total-details byte limits before constructing `PublicErrorData`.

Package-controlled work after unavoidable JavaScript reflection is separately
bounded before canonical output work: text is rejected before scanning when
its UTF-16 code-unit length exceeds four times the relevant character limit;
field-error objects with more than 200 candidate keys are rejected before
sorting or value reads; and only the first 100 numeric positions of a
field-message array are inspected. `Object.keys` and proxy trap execution
cannot be synchronously time-bounded by this package; hostile access is caught
and fails closed. These input-work limits bound package sorting, value reads,
and text traversal and never enlarge the smaller public-output limits.

Operation labels are outer-trimmed and must satisfy their pattern and maximum
length. Invalid operations normalize privately to the literal `"unknown"`; no
operation label is ever public. Correlation IDs follow the single-source rules
below.

Wire readers reject values that exceed any wire bound before semantic parsing
and normalize them to safe `INTERNAL_ERROR`. Writers can emit only values that
already satisfy all public payload and envelope bounds.

### Details ownership closures

The final semantic-consumer lane must perform these explicit moves:

- recode field-validation `BAD_REQUEST` calls to `VALIDATION_ERROR`;
- retain `correlationId` as the only public `INTERNAL_ERROR` detail;
- move `service`, permissions, policy IDs, SQL/query text, operation labels,
  tenant/entity identifiers, and version/state payloads to private diagnostics
  or remove them;
- keep package-specific reasons and codes in typed domain outcomes;
- move admin `{ disposition, organization }` partial-success data into an owned
  typed provision outcome;
- preserve a no-window `RATE_LIMITED` path rather than inventing retry seconds;
- correct the two test-only invalid `"INTERNAL"` values.

No open details escape hatch survives.

## Alias and historical-input contract

`AcceptedErrorCode` is internal. It is not root-exported and cannot be supplied
to a new constructor.

Aliases satisfy all invariants:

1. One alias maps to exactly one canonical code.
2. An alias is never simultaneously canonical.
3. Retired canonical names remain reserved.
4. A historical name is never reassigned to another meaning.
5. Canonical serialization never emits an alias.
6. Collisions fail initialization and contract tests.

Historical values remain readable while retained by canonical compatibility
policy and may never be reassigned. Compatibility is data in the private
ingress ledger, not a second implementation or consumer API.

`HISTORICAL_ERROR_ALIASES` is the sole authored alias mapping. Definition
metadata derives its `aliases` arrays through `aliasesFor(code)`; it never
repeats alias literals. Reserved historical names are a separate non-mapping
set so a removed name cannot silently acquire a new meaning.

## Opaque `Failure<C>` identity

Type branding alone is not trust. The public object is an empty frozen identity;
the record lives only in a private `WeakMap`:

```ts
declare const failureBrand: unique symbol;

export type Failure<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = Readonly<{
	readonly [failureBrand]: C;
}>;

type InternalFailureRecord<C extends CanonicalErrorCode> = Readonly<{
	code: C;
	context: NormalizedFailureContext;
	publicData: PublicErrorData<C>;
	privateDiagnostics?: InternalDiagnosticMetadata;
	createdAt: number;
}>;

const failureRecords = new WeakMap<object, InternalFailureRecord<CanonicalErrorCode>>();

function createFailure<C extends CanonicalErrorCode>(
	record: InternalFailureRecord<C>,
): Failure<C> {
	const identity = Object.freeze({});
	failureRecords.set(identity, record);
	return identity as Failure<C>;
}
```

No class, symbol, constructor, or internal record is root-exported. A forged
`value as Failure` fails the private-map lookup. Values crossing another realm,
bundle, process, queue, or persistence boundary are wire data and must be
deserialized.

## Construction input boundary

Public result input contains no operation or private diagnostics:

```ts
type PublicMessagePropertyFor<C extends CanonicalErrorCode> =
	MessagePolicyFor<C> extends "sanitized-override"
		? Readonly<{ publicMessage: string }>
		: Readonly<{ publicMessage?: never }>;

type RawResultFailureInput<C extends CanonicalErrorCode> =
	ResultDetailsInputFor<C> & PublicMessagePropertyFor<C>;

type ResultFailureInput<C extends CanonicalErrorCode> =
	C extends PublicMessageOverrideCode
		? RawResultFailureInput<C>
		: HasAuthoredDetail<RawResultFailureInput<C>> extends true
			? RequireAtLeastOneAuthoredDetail<RawResultFailureInput<C>>
			: never;
```

`ResultDetailsInputFor<"INTERNAL_ERROR">` is the sole direct-result exception:
an optional result argument may carry top-level `{ correlationId: string }`.
The argument itself may be omitted, but a supplied details object must contain
at least one owned field. Other code-indexed inputs accept only their
registry-defined fields; there is no public `details` bag.

Opaque failure construction requires context, but no consumer-supplied private
diagnostic channel:

```ts
type FailureContext = Readonly<{
	operation: string;
	correlationId?: string;
}>;

type FailureInput<C extends CanonicalErrorCode> =
	FailureContext
	& FailureDetailsInputFor<C>
	& PublicMessagePropertyFor<C>;
```

`FailureDetailsInputFor<"INTERNAL_ERROR">` has no correlation field. For
opaque ingress, `FailureContext.correlationId` is the only source. Excess
`details`, `privateDiagnostics`, `diagnostics`, and arbitrary metadata are
rejected by type fixtures.

Package-owned adapters may call a non-exported constructor with a small closed
diagnostic type owned by that adapter:

```ts
createFailureInternal({
	code: "CONCURRENCY_CONFLICT",
	context,
	privateDiagnostics: {
		source: "postgres",
		sqlState: "40001",
	},
});
```

`InternalDiagnosticMetadata` is a discriminated union of these closed
package-owned shapes. It is never `Record<string, unknown>`, and neither the
type nor its constructor is root-exported. SQL text, credentials, vendor
payloads, personal data, cyclic values, and unbounded objects are not accepted.

### Correlation single-source contract

Both construction paths use one internal correlation normalizer:

1. Reject a non-string or raw string longer than 512 UTF-16 code units before
   trimming or character inspection.
2. Apply JavaScript `String.prototype.trim()` to the remaining value.
3. Accept it only when it is no more than 128 characters and matches
   `^[A-Za-z0-9][A-Za-z0-9._:/-]*$` exactly.
4. Store one normalized source in immutable failure context and derive the
   permitted public `INTERNAL_ERROR` projection from that source.
5. Omit an empty, over-length, or pattern-invalid value; never truncate,
   replace, hash, or emit the invalid input.

Externally supplied UUIDs and trace/correlation identifiers are accepted when
they satisfy that same rule; they receive no trusted status. For opaque ingress,
the normalized context value remains private and is projected into
`PublicErrorData<"INTERNAL_ERROR">` only because that code's public policy
permits it. `errorIngress.code("INTERNAL_ERROR", ...)` cannot accept another
correlation source. For direct construction,
`errorResult.fail("INTERNAL_ERROR", { correlationId })` feeds the same
normalizer. A context/details precedence rule is therefore impossible by
construction.

Registry-derived code groups select the exact overloads frozen below.

No-detail fixed-message codes accept no second argument. For optional-detail
fixed codes, omitting input is valid, but a supplied object must contain an
owned field (`retryAfterSeconds` or `correlationId`); meaningless `{}` values
and explicit `undefined` are not second-input forms. Construction also requires
one narrowed canonical code. A code union must be narrowed before calling a
capability so inference cannot erase one member's required message or admit
another member's details. Primitives, arrays, callables, class instances with
non-contract members, and extra object keys are rejected by contract fixtures.

## Permanent root capabilities

The final consumer surface uses named capability objects from the root only:

```ts
import {
	errorIngress,
	errorOpenApi,
	errorProject,
	errorResult,
	errorWire,
	type Failure,
	type Result,
} from "@afenda/errors";
```

There is no permanent `errors` singleton and no public subpath. This choice
provides explicit static dependencies and reliable ESM tree-shaking.

### Frozen signatures

```ts
interface ErrorResultCapability {
	ok<T>(data: T): ResultSuccess<T>;
	retryAfterSeconds(value: number): RetryAfterSeconds;

	fail<const C extends PublicMessageOverrideCode, const Input>(
		code: SingleCanonicalErrorCode<C>,
		input: Input & CheckedResultFailureInput<NoInfer<C>, NoInfer<Input>>,
	): ResultFailure<C>;

	fail<const C extends OptionalResultFailureInputCode, const Input>(
		code: SingleCanonicalErrorCode<C>,
		input: Input & CheckedResultFailureInput<NoInfer<C>, NoInfer<Input>>,
	): ResultFailure<C>;

	fail<const C extends OptionalResultFailureInputCode>(
		code: SingleCanonicalErrorCode<C>,
	): ResultFailure<C>;

	fail<const C extends EmptyResultFailureInputCode>(
		code: SingleCanonicalErrorCode<C>,
	): ResultFailure<C>;
}

interface Lane1ErrorIngressCapability {
	code<const C extends CanonicalErrorCode, const Input>(
		code: SingleCanonicalErrorCode<C>,
		input: Input & CheckedFailureInput<NoInfer<C>, NoInfer<Input>>,
	): Failure<C>;

	unknown<const Input>(
		error: unknown,
		context: Input & ExactInput<FailureContext, NoInfer<Input>>,
	): Failure;
}

type PostgresFailureCode =
	| "CONFLICT"
	| "CONCURRENCY_CONFLICT"
	| "SERVICE_UNAVAILABLE"
	| "INTERNAL_ERROR";

interface ErrorIngressCapability extends Lane1ErrorIngressCapability {
	postgres(
		error: unknown,
		context: FailureContext,
	): Failure<PostgresFailureCode>;
}

interface ErrorProjectCapability {
	retry<const C extends CanonicalErrorCode>(
		input: Failure<C>,
	): RetryDisposition<C>;

	retry<const Input extends ResultFailure>(
		input: Input,
	): RetryDisposition<Input["code"]>;

	result<C extends CanonicalErrorCode>(
		failure: Failure<C>,
	): ResultFailure<C>;

	http(
		input: Failure | ResultFailure,
	): HttpErrorProjection;

	diagnostics(
		failure: Failure,
	): ErrorDiagnosticFields;
}

interface ErrorWireCapability {
	serialize<const C extends CanonicalErrorCode>(
		input: Failure<C> | ResultFailure<C>,
	): SerializedFailureEnvelope<C>;

	deserialize(input: unknown): Failure;
}

interface ErrorOpenApiCapability {
	responses<const C extends readonly CanonicalErrorCode[]>(
		codes: C & OpenApiCodeTuple<C>,
	): OpenApiResponsesProjection<C>;
}
```

The root now exports the fully implemented `errorResult`, the
`code`/`unknown`/`postgres` methods of `errorIngress`, all registry-owned
`errorProject` methods, `errorWire`, and `errorOpenApi`. There are no placeholder
methods, throwing stubs, or empty capability objects. Consumer adoption is
implemented in the atomic repository cutover and the governance seal is
complete.

`errorResult.retryAfterSeconds` is the sole public constructor for the opaque
`RetryAfterSeconds` value. It throws `RangeError` unless the input is a finite
integer from 1 through 86,400; no clamping occurs.

### Trusted unknown normalization

`errorIngress.unknown` is total over `unknown`:

```text
identity present in this package instance's private WeakMap
→ return that exact Failure object unchanged

every other value
→ create a new INTERNAL_ERROR Failure from the supplied context
```

Trusted pass-through preserves the original code, normalized context, public
details, private diagnostics, creation time, and object identity; the newly
supplied context is ignored. A forged structural value, a type assertion, or a
`Failure` originating from another package instance, realm, process, queue, or
serialized boundary is not trusted and becomes safe `INTERNAL_ERROR`.

### PostgreSQL ingress boundary

PostgreSQL normalization belongs to Lane 2. Its final outcome union is exactly
`PostgresFailureCode`; no other canonical code may be returned without new
repository evidence and contract review.

| SQLSTATE/category | Canonical result |
|-------------------|------------------|
| `40001` serialization failure | `CONCURRENCY_CONFLICT` |
| `40P01` deadlock detected | `CONCURRENCY_CONFLICT` |
| `55P03` lock not available | `CONCURRENCY_CONFLICT` |
| `23505` unique violation | `CONFLICT` |
| proven transient connection/unavailability category | `SERVICE_UNAVAILABLE` |
| authentication, configuration, or programming failure | `INTERNAL_ERROR` |
| unknown shape or unmapped SQLSTATE | `INTERNAL_ERROR` |

Lane 2 freezes the exact transient SQLSTATE set as `08006`, `53300`, `57P01`,
`57P02`, and `57P03` before exposing the method.
Foreign-key, check, and not-null violations remain `INTERNAL_ERROR` unless
living repository evidence proves a safe, boundary-owned mapping. They are not
assumed to be `VALIDATION_ERROR`.

Final-cutover usage:

```ts
const success = errorResult.ok(invoice);

const publicFailure = errorResult.fail("CONFLICT", {
	publicMessage: "The invoice is no longer editable",
});

const failure = errorIngress.unknown(error, {
	operation: "invoice.create",
});

return errorProject.result(failure);
```

Aliases cannot typecheck in `errorResult.fail` or `errorIngress.code`.

## Code-narrowable `Result<T, C>`

```ts
type ResultSuccess<T> = Readonly<{
	ok: true;
	data: T;
}>;

type ResultFailure<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = C extends CanonicalErrorCode
	? Readonly<{ ok: false }> & PublicErrorData<C>
	: never;

type Result<
	T,
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = ResultSuccess<T> | ResultFailure<C>;
```

Example operation contract:

```ts
type CreateInvoiceResult = Result<
	Invoice,
	"VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR"
>;
```

Code narrowing supports API contracts, exhaustive tests, endpoint declarations,
and prevention of impossible outcomes. It does not authorize consumers to
derive shared behavior from codes.

## Localization contract

`messageKey` is part of every public failure projection. The final cutover
updates `ActionResult`, server actions, REST schemas, generated OpenAPI, and UI
fixtures atomically.

The registry owns stable keys and fallback English wording. Translation
resources own locale-specific wording. A translation may not alter code,
status, retry, security, or operational classification. UI code must not
maintain a code-to-message map.

## Retry model

Retryability is exhaustive canonical per-code policy. Consumers cannot set or
override it.

The public scheduling projection is discriminated and code-preserving:

```ts
declare const retryDispositionBrand: unique symbol;

type RetryDispositionBrand<C extends CanonicalErrorCode> = Readonly<{
	readonly [retryDispositionBrand]: C;
}>;

type RetryableDispositionFor<C extends RetryableErrorCode> =
	C extends RetryAfterErrorCode
		? Readonly<{
				retryable: true;
				retryAfterSeconds?: RetryAfterSeconds;
			}>
		: Readonly<{ retryable: true }>;

type RetryDisposition<C extends CanonicalErrorCode = CanonicalErrorCode> =
	C extends RetryableErrorCode
		? RetryableDispositionFor<C> & RetryDispositionBrand<C>
		: Readonly<{ retryable: false }> & RetryDispositionBrand<C>;

const disposition = errorProject.retry(failureOrResultFailure);
```

`RetryAfterErrorCode` is registry-derived. Under the frozen table it contains
only `RATE_LIMITED`; `RetryDisposition<"CONCURRENCY_CONFLICT">` and
`RetryDisposition<"SERVICE_UNAVAILABLE">` do not expose a timing field at all.
The compile-time private brand makes the type package-produced while the frozen
runtime projection remains `{ retryable, retryAfterSeconds? }`. Only
`errorProject.retry` creates a disposition. Consumers may narrow and read it
but cannot manufacture their own retry decision with an object literal.

Workers and jobs branch only on `disposition.retryable`. When a retryable
occurrence has no approved delay, the worker's own bounded attempts/backoff
configuration applies; it must not infer timing from the code. HTTP projection
uses the same internal registry projection and may emit `Retry-After` only when
the disposition carries bounded `retryAfterSeconds`.

Per-occurrence data is limited to registry-approved bounded timing:

```ts
retry: {
	retryable: true,
	retryAfter: "details.retryAfterSeconds",
}
```

Because classification is per-code, HTTP and job policy remain deterministic
after conversion to `ResultFailure`. `CONCURRENCY_CONFLICT` prevents transient
database contention from contaminating ordinary business `CONFLICT`.

## HTTP projection

Preserve the living HTTP wrapper while adding `messageKey`:

```ts
type HttpErrorProjection<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = Readonly<{
	status: number;
	headers: Readonly<Record<string, string>>;
	body: Readonly<{
		error: PublicErrorData<C>;
	}>;
}>;
```

No Next.js constructor enters the package. The BFF applies the projection:

```ts
const projection = errorProject.http(failure);

return NextResponse.json(projection.body, {
	status: projection.status,
	headers: projection.headers,
});
```

When HTTP receives public `ResultFailure`, it validates the data and derives
retry solely from canonical code and approved timing details. It does not trust
the value as an opaque `Failure`.

## Wire compatibility

`ResultFailure` is an application outcome. The wire envelope is a separate,
version-identified compatibility artifact:

```ts
type SerializedFailureEnvelope<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = C extends CanonicalErrorCode
	? Readonly<{
			schema: "afenda.failure/v1";
			error: PublicErrorData<C>;
		}>
	: never;
```

The serializer emits only this shape and canonical codes. The deserializer
accepts exactly the current V1 envelope and the retained legacy unversioned flat
`{ code, message, details? }` value. Both readers resolve aliases only through
`HISTORICAL_ERROR_ALIASES`; only the flat reader accepts the legacy
`retryAfter` key. No unnamed historical schema is accepted. All input is copied
into bounded inert data before semantic parsing. Unknown or hostile values
become safe `INTERNAL_ERROR` with the package-owned private operation
`errors.wire.deserialize`.

Callers never select a schema or import a versioned API.

## OpenAPI ownership

The registry owns each code's HTTP status, headers, description, public body,
and details schema. Endpoint code owns only the declaration of possible
outcomes:

```ts
type ErrorOpenApiPolicy = Readonly<{
	description: string;
	headers: Readonly<Record<string, ErrorOpenApiHeader>>;
}>;

type PublicDetailsOpenApi = Readonly<{
	schema: ErrorOpenApiSchema | null;
}>;
```

There is no second details `additionalProperties` flag or projector-owned
header map: the schema and definition header policy are the only authored
sources.

```ts
errorOpenApi.responses([
	"VALIDATION_ERROR",
	"CONFLICT",
	"INTERNAL_ERROR",
]);
```

This declaration does not duplicate semantics. Generated OpenAPI must match the
registry and the preserved `{ error: ... }` HTTP body.

Responses are grouped by numeric status. A status is emitted once, so
`CONFLICT` and `CONCURRENCY_CONFLICT` produce one `409` response whose body is
a deterministic `oneOf` of their code-specific `{ error: PublicErrorData<C> }`
schemas. Generation obeys these invariants:

1. Input is a finite const-authored tuple whose every slot is one canonical
   literal; widened arrays and union-valued slots are rejected by type.
2. Duplicate input codes are removed.
3. Status entries are emitted in ascending numeric order.
4. Variants within each `oneOf` follow canonical registry order, independent
   of caller input order.
5. No code or response may be silently overwritten.
6. Headers with the same name and identical schema/description are emitted
   once; a header owned by only some variants remains optional.
7. Conflicting definitions for the same header name fail generation.
8. Header names satisfy the HTTP token grammar; policy, header, details, and
   schema metadata reject unknown fields before projection.
9. The public body always retains the `{ error: ... }` wrapper.

Contract fixtures cover duplicate 409 codes, caller-order permutations,
duplicate inputs, compatible header merges, incompatible-header rejection, and
wrapper preservation.

## Allowed and prohibited code use

Consumers may carry, declare, test, display, and expose canonical codes through
approved result and wire projections. They may normalize an owned domain outcome
to a canonical code at the boundary.

| Allowed | Prohibited shared interpretation |
|---------|-----------------------------------|
| Carry a code in `Result<T, C>` | Select HTTP status from a code |
| Declare endpoint outcomes | Decide retryability or timing from a code |
| Assert an exact public contract | Choose or sanitize public wording from a code |
| Construct through root capabilities | Reclassify operational status or severity |
| Display a code as reference data | Branch business behavior after normalization |
| Translate a registry-provided `messageKey` | Maintain a code-to-message map |

Manual serialization is not allowed. Use `errorWire`.

## Public exports

Final `package.json` exposes only the root and follows the living workspace
source-export convention unless an independently approved build lane changes
the whole package posture:

```json
{
	"sideEffects": false,
	"exports": {
		".": {
			"types": "./src/index.ts",
			"default": "./src/index.ts"
		}
	}
}
```

Current verified semantic root exports (legacy exports remain until the atomic
deletion lane):

```ts
export { errorIngress } from "./capabilities/ingress";
export { errorOpenApi } from "./capabilities/openapi";
export { errorProject } from "./capabilities/project";
export { errorResult } from "./capabilities/result";
export { errorWire } from "./capabilities/wire";

export type {
	CanonicalErrorCode,
	FailureContext,
	FailureInput,
	MessageKeyFor,
	PublicErrorData,
	Result,
	ResultFailure,
	ResultFailureInput,
	ResultSuccess,
	RetryDisposition,
} from "./public-types";
export type { PublicFieldErrors, RetryAfterSeconds } from "./contract/details";
export type { Failure } from "./failure/types";
export type { OpenApiResponsesProjection } from "./openapi/types";
export type { SerializedFailureEnvelope } from "./wire/types";
```

Do not root-export:

- `AcceptedErrorCode` or alias ledgers;
- `AppError`, constructors, markers, or `isAppError`;
- registry definitions or raw policy maps;
- sanitation helpers;
- PostgreSQL SQLSTATE tables;
- serializer/deserializer implementation helpers;
- default-message constants.

Delete public exports for `./result`, `./http`, `./common`, and
`./adapters/postgres` in the deletion lane.

## Old-to-new migration map

| Current API | Permanent replacement |
|-------------|-----------------------|
| `ok(data)` | `errorResult.ok(data)` |
| direct public `fail(code, message, details)` | `errorResult.fail(code, typedInput)` |
| internal/adapter `new AppError(...)` | `errorIngress.code(code, input)` |
| `rateLimited(...)` public result | `errorResult.fail("RATE_LIMITED", input)` |
| `rateLimited(...)` opaque boundary failure | `errorIngress.code("RATE_LIMITED", input)` |
| `serviceUnavailable(...)` public result | `errorResult.fail("SERVICE_UNAVAILABLE")` |
| `serviceUnavailable(...)` opaque failure | `errorIngress.code("SERVICE_UNAVAILABLE", input)` |
| `failFromAppError(error)` | `errorProject.result(failure)` |
| `failFromUnknown(error)` | `errorProject.result(errorIngress.unknown(error, context))` |
| `normalizeUnknown(error)` | `errorIngress.unknown(error, context)` |
| `normalizePostgresUnknown(error)` | `errorIngress.postgres(error, context)` |
| `projectHttpError(error)` | `errorProject.http(error)` |
| `serializeAppError(error)` | `errorWire.serialize(error)` |
| `errorDiagnosticFields(error)` | `errorProject.diagnostics(error)` |
| `sanitizeErrorDetails(...)` | no consumer replacement; internal policy |
| `DEFAULT_INTERNAL_MESSAGE` | no consumer replacement; registry-owned |
| `ERROR_HTTP_STATUS` | no consumer replacement; projection-owned |
| `ERROR_CODES` for OpenAPI | `errorOpenApi.responses(codes)` |
| `AppError instanceof` | remove; normalize through ingress |

A codemod handles imports and mechanically equivalent calls only. Human review
owns raw-code behavior, messages, details, retry, PostgreSQL fallback, HTTP
mapping, and domain outcome decisions.

## Documentation closure

The final implementation rewrites `packages/foundation/errors/README.md` as a
150–250 line consumer entry containing:

1. Purpose and when to use the package.
2. Root-only quick start.
3. Boundary decision table.
4. Capability summary.
5. Security guarantees.
6. Package constraints and maintainer commands.
7. Links to detailed Scratch authority.

Detailed architecture, consumer contract, security model, governance, and
maintainer procedure extend the approved Scratch pack as:

```text
docs-V2/api/errors/
├── architecture.md
├── consumer-contract.md
├── security-model.md
├── governance.md
└── maintainer-guide.md
```

Do not create a repository-root Living `docs/` tree or silently establish
package-local controlled docs. The registry remains the machine semantic SSOT;
these files explain its contract and operation.

`apps/docs/content/docs/packages/errors.mdx` is generated. Update the package
README/exports and run:

```bash
pnpm --filter @afenda/docs generate:package-docs
```

Do not hand-edit the generated MDX.

Documentation closure includes all governed references to old subpaths,
`AppError`, factories, maps, old ActionResult shape, and old wire shape,
including `AGENTS.md`, `docs-V2/api/**`, `docs-V2/monorepo/README.md`, and the
official generated package page.

## Permanent governance

Replace the overlapping adoption/consumption/normalization model with two
permanent repository gates after cutover.

### `check:errors-boundary`

- root import only;
- no public `AppError` or implementation constructors;
- no duplicate `Result`;
- no manual serialization or public leakage;
- required public package boundaries use approved outcomes;
- prohibited pure/schema/UI layers do not import the package;
- `package.json.exports` contains only `.`.

### `check:errors-semantics`

Use the TypeScript compiler API for typed analysis:

- no HTTP status derivation from codes;
- no retry derivation from codes;
- no code-to-message maps;
- sanitized public-message overrides resolve entirely to static source text;
- no operational classification from codes;
- no business branching after canonical normalization;
- no manual known wire envelopes;
- no PostgreSQL normalization plus generic guessing;
- allowed code carriage, declaration, and contract tests are not false-positive
  failures.

Repository enforcement rejects supported, mechanically identifiable leakage.
Ownership and review policy prohibit equivalent disguised implementations. Do
not claim mathematical proof.

Package contract tests own registry completeness, aliases, typed details,
runtime sanitation, wire history, HTTP, diagnostics, PostgreSQL, OpenAPI,
runtime identity, and bundle containment.

## Security invariants

- Only private-map identities created by this package are trusted in-process.
- Wire values and public `ResultFailure` values remain untrusted data.
- `INTERNAL_ERROR` has fixed public wording and only an optional bounded
  correlation reference.
- Permission, policy, service, operation, SQL, vendor, tenant, and entity data
  never enters public details.
- Every public message follows its registry policy, override text resolves to
  static source copy, and emitted text is bounded and control-character free.
- Details reject hostile accessors, cycles, credentials, connection URLs,
  SQL/DML/DDL text, and oversized values.
- Field-error names reject `__proto__`, `constructor`, and `prototype` so safe
  output remains inert when downstream code copies it into an ordinary object.
- Retryability is per-code private policy; consumers cannot override it.
- Diagnostics exclude raw public leakage while retaining approved private
  operational evidence.

## Lane 1 implemented order

Lane 1 proceeds in this order; consumer changes remain locked throughout:

1. Write rejected fixtures before runtime code. They reject aliases in new
   construction, impossible `Result` codes, message input for fixed-message
   codes, missing messages for override codes, details on no-details codes, raw
   or invalid retry numbers, a second `INTERNAL_ERROR` correlation source,
   consumer private diagnostics, and dynamic public-message expressions.
2. Write allowed fixtures covering all ten canonical codes, static literal and
   resolved-constant public messages, every approved details shape, bounded
   retry construction, and both valid correlation entry paths.
3. Implement `defineError`, `defineErrorRegistry`, details/message/lifecycle
   policies, alias invariants, the centralized bounds, and derived type
   machinery. No projection implementation enters this step.
4. Derive `CanonicalErrorCode`, `MessageKeyFor<C>`,
   `PublicDetailsFor<C>`, `ResultFailureInput<C>`, `FailureInput<C>`,
   `PublicErrorData<C>`, `ResultFailure<C>`, and `Result<T, C>` from the
   registry rather than parallel unions.
5. Complete `errorResult.ok`, `errorResult.retryAfterSeconds`, and
   `errorResult.fail`, including message policy, detail normalization, deep
   immutability, and all exact bounds.
6. Complete the private `WeakMap` identity, internal frozen record, trusted
   lookup, forgery rejection, and same-instance expectations.
7. Complete only `errorIngress.code` and `errorIngress.unknown`, including
   trusted `Failure` pass-through and single-source correlation behavior.
8. Complete `errorProject.retry` for both trusted `Failure` and public
   `ResultFailure`, deriving retryability and optional timing only from the
   canonical retry policy.
9. Add representative result-only and retry-only bundle fixtures. Result-only
   excludes ingress, failure identity, all projectors, HTTP, wire, PostgreSQL,
   OpenAPI, diagnostics, and legacy implementation modules. Retry-only accepts
   the deliberately coarse final `errorProject` capability cost, but excludes
   `errorResult`, ingress, wire, OpenAPI, PostgreSQL, and legacy modules.
   Required registry policy data may remain.

Lane 1 became complete when the package typecheck executed every allowed and
rejected fixture, runtime tests proved the bounds/identity/normalization rules,
both Lane 1 bundle fixtures passed, and review accepted that evidence. This
authorized later package-local lanes; it did not independently authorize
consumer migration. PostgreSQL or remaining projection work cannot bypass the
explicit cutover decision.

## Sealed migration lanes and exit gates

The work remains one atomic main-branch cutover governed by this contract.

| Lane | Status | Scope | Exit gate |
|------|--------|-------|-----------|
| 1. Contract foundation | **Verified** | Registry DSL, bounds, derived public types, `errorResult`, private identity, `errorIngress.code`/`unknown`, `errorProject.retry`, result/retry bundle fixtures | Package lint, source/contract typechecks, runtime/contract/semantic tests, and bundle gates green |
| 2. Boundary adapters | **Verified** | HTTP, diagnostics, wire, PostgreSQL, OpenAPI, and remaining project capabilities | Complete projections derive solely from the registry; precise PostgreSQL union and grouped OpenAPI tests green |
| 3. Mechanical imports | **Implemented; focused gate green** | Root-only import/call conversion | `check:errors-boundary` green; full repository typecheck remains a Lane 7 gate |
| 4. Semantic consumers | **Implemented; focused gate green** | Messages, details, raw-code behavior, domain outcomes | Strict semantic scan reports 834 canonical, 0 partial, and no prohibited interpretation |
| 5. Hostile-boundary audit | **Verified** | Public leakage, redaction, wire history | Hostile deserialization, public-leakage, static-copy, and semantic suites pass |
| 6. Deletion | **Implemented; focused gate green** | Old exports, `AppError`, compatibility surfaces | Root-only export and boundary gate green; no living compatibility surface remains |
| 7. Governance seal | **Implemented; sealed** | Permanent checks, docs regeneration, protection | See `PR.md` and `.protected.sha256` |

Each commit compiles or documents its explicit migration state against this
contract. No lane merges separately. The final tree exposes only the new
contract.

Current state: Lanes 1–7 are implemented and the kernel is `SEALED`. Permanent
repository semantic gates are green, documentation surfaces match the root-only
contract, focused consumers pass, and the final protection digest is current.
The one saturated combined-workload timeout and its green standalone rerun are
recorded in `PR.md`.

## Contract evidence

Tests and fixtures must prove:

1. Exhaustive registry definitions and generic-code policy.
2. Canonical-only constructors reject aliases.
3. Alias uniqueness, reserved-name history, and canonical-only emission.
4. `Result<T, C>` narrowing and impossible-code rejection.
5. All ten codes' allowed inputs plus rejected fixed/override message and
   details combinations.
6. Public-message literals and primitive static constants pass; template
   expressions, any concatenation, member access, runtime identifiers,
   copy-bearing input/container aliases, every object/array spread, and
   unresolved computed properties fail the symbol-aware AST gate. Mutation via
   `Object.defineProperty` on a prior `as const` container is a rejected
   regression fixture.
7. Raw retry numbers fail typechecking; the branded constructor enforces the
   exact integer range without clamping.
8. Every numeric, pattern, depth, key-count, and UTF-8 size bound is exercised
   at its boundary and immediately outside it; package-controlled input-work
   caps are exercised before sorting, property reads, and text traversal after
   unavoidable JavaScript reflection.
9. Public consumers cannot provide private diagnostics or a second opaque
   `INTERNAL_ERROR` correlation source.
10. Correlation trimming, valid external trace acceptance, invalid omission,
    and identical direct/opaque normalization.
11. Private `WeakMap` identity rejects forged failures, while
    `errorIngress.unknown` returns a trusted failure unchanged and normalizes
    every other value to `INTERNAL_ERROR`.
12. `errorProject.result` preserves the code generic.
13. `PublicErrorData<C>` parity across Result, ActionResult, HTTP, wire, UI,
    and OpenAPI.
14. `errorProject.retry` preserves code-specific discrimination and derives the
    same immutable retry disposition from `Failure` and `ResultFailure`, with
    no consumer code map. Manual disposition literals fail opacity fixtures,
    and only `RATE_LIMITED` can carry occurrence timing.
15. Preserved HTTP `{ error: ... }` body compatibility.
16. Current wire emission and legacy flat deserialization.
17. PostgreSQL returns only `PostgresFailureCode`, including retryable
    `CONCURRENCY_CONFLICT`, and exposes no Lane 1 placeholder.
18. Duplicate-status OpenAPI outcomes group into deterministic `oneOf`
    responses without overwrites; compatible headers merge and conflicts fail.
19. AST fixtures cover every allowed and prohibited code-use category,
    including method/object rebinding, higher-order handoff, computed access,
    and namespace capability escape.
20. Result-only imports exclude PostgreSQL, ingress, project, wire, OpenAPI,
    diagnostics, failure identity, and all legacy `core`, `common`, and
    `result` implementation modules; retry-only imports may retain every
    `errorProject` implementation but exclude `errorResult`, ingress, wire,
    OpenAPI, PostgreSQL, and legacy modules by emitted identity. Wire-only
    excludes result construction, ingress, project, OpenAPI, PostgreSQL, and
    legacy modules. OpenAPI-only excludes result construction, failure identity,
    ingress, project, wire, PostgreSQL, and legacy modules.
21. Internal representation changes require no consumer source change.
22. Adding a non-colliding historical alias changes only the sole authored
    `HISTORICAL_ERROR_ALIASES` ledger; definition alias metadata derives from it.
23. Official generated docs match README and root export metadata.

The result-only, retry-only, wire-only, and OpenAPI-only bundles intentionally
accept the complete
canonical registry metadata—including HTTP, OpenAPI, operations, details, and
lifecycle policy—as the cost of a singular semantic contract. Frozen unminified
UTF-8 ceilings are 40,960 bytes for result, 40,960 for retry, 53,248 for wire,
and 49,152 for OpenAPI. The tree-shaking claim is capability-module isolation,
with exclusions asserted independently; it does not claim property-level
pruning inside a retained registry definition or capability object.

All four bundle fixtures are permanent final-cutover gates. Because
`errorProject` is one named capability object, importing `errorProject.retry`
may retain its future result, HTTP, and diagnostics implementations; that
coarse cost is frozen now rather than becoming a later surprise. It must still
exclude separate result-construction, ingress, wire, OpenAPI, PostgreSQL, and
legacy capability modules, and later lanes cannot delete or weaken the gate.

## Acceptance criteria

- One logically singular, physically modular registry owns all shared error
  semantics.
- New construction accepts canonical codes only.
- Public result input and internal failure context are separate.
- Retryability is exhaustive per code; bounded timing is the only occurrence
  variation.
- Named root capability objects are the sole consumer style and bundle cleanly.
- `Result<T, C>` preserves operation-specific outcomes.
- One derived `PublicErrorData<C>` owns the public payload shared by Result,
  HTTP, wire, and OpenAPI.
- `messageKey` is part of every agreed public failure projection.
- `Failure<C>` has verified private runtime identity.
- `errorIngress.unknown` returns same-instance trusted failures unchanged and
  safely internalizes all other values.
- Public `FailureInput` exposes no private-diagnostic channel, and correlation
  has exactly one normalized source per construction path.
- Public details match the frozen code-indexed contract and ownership closures.
- HTTP retains `{ error: ... }`; wire emits `{ schema, error }` and reads legacy
  flat values internally.
- Endpoint outcomes can be declared without semantic duplication.
- Duplicate HTTP statuses generate one deterministic OpenAPI response with
  code-specific `oneOf` variants and validated header merging.
- Supported prohibited interpretation is rejected through typed AST checks.
- All consumers compile through the root entrypoint.
- Old subpaths and implementation exports are deleted.
- README, Scratch authority, AGENTS, API/OpenAPI, and generated package docs are
  synchronized.
- The two permanent semantic gates, four capability bundle gates, and complete
  repository suite pass.
- Protection digest matches the verified final tree.
- No shim, parallel style, deferred migration, or cleanup item remains.

The success condition is:

> One root entrypoint, one modular semantic registry, one opaque internal
> failure identity, typed public outcomes, explicit ingress, derived
> projections, versioned wire compatibility, and no consumer-owned shared
> interpretation. Changes within the established semantic contract require no
> consumer interpretation changes.

## Verification

During migration, existing checks may remain available. Final verification is:

```bash
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
pnpm run check:errors-boundary
pnpm run check:errors-semantics
pnpm --filter @afenda/docs generate:package-docs
pnpm openapi:generate
pnpm check:openapi
pnpm lint
pnpm typecheck
pnpm test
$env:AFENDA_PROTECTED_EDIT_TOKEN = "<local-intent-token>"
pnpm --filter @afenda/errors protect:update
Remove-Item Env:AFENDA_PROTECTED_EDIT_TOKEN
pnpm --filter @afenda/errors protect:check
```

Refresh `.protected.sha256` only after implementation, consumers, governance,
Scratch authority, generated docs, and the full repository are green. The
final `protect:check` is last so the digest seals the exact verified tree.
