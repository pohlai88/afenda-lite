/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import {
	defineErrorRegistry,
	ERROR_REGISTRY,
} from "../../../src/contract/registry";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Failure,
	type Result,
	type ResultFailureInput,
} from "../../../src/index";
import type {
	PublicDetailsPropertyForValue,
	PublicMessageInputFor,
} from "../../../src/public-types";

const runtimeMessage: string = "runtime input";
const runtimeFieldMessage: string = "runtime field input";
const caughtError = new Error("private source message");
const runtimeIdentifier: string = "invoice-123";
const interpolatedMessage: string = `Invoice ${runtimeIdentifier} was not found`;

// @ts-expect-error A future required-details policy cannot become optional.
export const missingRequiredDetails: PublicDetailsPropertyForValue<
	Readonly<{ reason: string }>
> = {};

// @ts-expect-error Public input aliases preserve their object boundary.
export const primitiveFixedMessageInput: PublicMessageInputFor<"FORBIDDEN"> = 3;

// @ts-expect-error Result inputs never admit primitive weak-type matches.
export const primitiveResultInput: ResultFailureInput<"FORBIDDEN"> = 3;

// @ts-expect-error Result inputs never admit arrays through optional fields.
export const arrayResultInput: ResultFailureInput<"RATE_LIMITED"> = [];

// @ts-expect-error Result inputs never admit class instances with extra members.
export const dateResultInput: ResultFailureInput<"INTERNAL_ERROR"> = new Date();

// @ts-expect-error Historical and invalid aliases are not construction codes.
errorResult.fail("INTERNAL");

// @ts-expect-error Fixed-message codes reject caller wording.
errorResult.fail("FORBIDDEN", { publicMessage: "Caller wording" });

// @ts-expect-error No-input codes reject arbitrary primitive input.
errorResult.fail("FORBIDDEN", "oops");

// @ts-expect-error No-input codes reject arbitrary numeric input.
errorResult.fail("FORBIDDEN", 3);

// @ts-expect-error Optional detail inputs reject arrays.
errorResult.fail("RATE_LIMITED", []);

// @ts-expect-error Omitted input is zero arguments, not explicit undefined.
errorResult.fail("RATE_LIMITED", undefined);

// @ts-expect-error Optional detail inputs reject class instances.
errorResult.fail("INTERNAL_ERROR", new Date());

// @ts-expect-error Primitive/object intersections cannot forge an exact input.
errorResult.fail(
	"NOT_FOUND",
	Object.assign("x", { publicMessage: "Static" as const }),
);

// @ts-expect-error Override-message codes require statically authored wording.
errorResult.fail("NOT_FOUND");

// @ts-expect-error Widened runtime strings are not statically authored copy.
errorResult.fail("NOT_FOUND", { publicMessage: runtimeMessage });

// @ts-expect-error Error messages are private runtime data.
errorResult.fail("CONFLICT", { publicMessage: caughtError.message });

// @ts-expect-error Runtime interpolation is not statically authored copy.
errorResult.fail("NOT_FOUND", {
	publicMessage: interpolatedMessage,
});

// @ts-expect-error Runtime concatenation is not statically authored copy.
errorResult.fail("CONFLICT", {
	// biome-ignore lint/style/useTemplate: Rejected contract fixture preserves concatenation.
	publicMessage: "Invoice " + runtimeIdentifier + " is not editable",
});

// @ts-expect-error Public field-error copy must also be statically authored.
errorResult.fail("VALIDATION_ERROR", {
	fieldErrors: { email: [runtimeFieldMessage] },
	publicMessage: "Review the highlighted fields",
});

// @ts-expect-error No-details codes reject unrelated details.
errorResult.fail("CONFLICT", {
	fieldErrors: { invoice: ["Invalid"] },
	publicMessage: "The invoice is not editable",
});

// @ts-expect-error Raw numbers cannot bypass the bounded retry constructor.
errorResult.fail("RATE_LIMITED", { retryAfterSeconds: 30 });

// @ts-expect-error Results have no private operation context.
errorResult.fail("INTERNAL_ERROR", {
	correlationId: "trace-123",
	operation: "invoice.create",
});

// @ts-expect-error Correlation has one top-level source, never nested details.
errorResult.fail("INTERNAL_ERROR", {
	details: { correlationId: "trace-duplicate" },
});

// @ts-expect-error Consumers cannot attach private diagnostics.
errorIngress.code("INTERNAL_ERROR", {
	operation: "invoice.create",
	privateDiagnostics: { source: "consumer" },
});

// @ts-expect-error Ingress correlation comes from FailureContext, not details.
errorIngress.code("INTERNAL_ERROR", {
	details: { correlationId: "trace-duplicate" },
	operation: "invoice.create",
});

// @ts-expect-error Ingress construction is canonical-only too.
errorIngress.code("INTERNAL", { operation: "invoice.create" });

// @ts-expect-error Empty objects cannot forge package-owned Failure identity.
export const forgedFailure: Failure = {};

const wrongCode = errorResult.fail("CONFLICT", {
	publicMessage: "The invoice is not editable",
});

// @ts-expect-error Operation-specific Result unions reject impossible codes.
export const impossibleResult: Result<never, "NOT_FOUND"> = wrongCode;

declare const mixedFixedAndOverride: "NOT_FOUND" | "FORBIDDEN";
declare const mixedOverrides: "NOT_FOUND" | "CONFLICT";
declare const mixedDetails: "INTERNAL_ERROR" | "NOT_FOUND";

// @ts-expect-error Construction requires a single narrowed canonical code.
errorResult.fail(mixedFixedAndOverride);

// @ts-expect-error A union cannot erase required override wording.
errorResult.fail(mixedOverrides);

// @ts-expect-error A union cannot accept details invalid for one possible code.
errorResult.fail(mixedDetails, { correlationId: "trace-123" });

// @ts-expect-error Ingress construction also requires one narrowed code.
errorIngress.code(mixedFixedAndOverride, { operation: "invoice.read" });

const contextWithDiagnostics = {
	operation: "invoice.catch",
	privateDiagnostics: { source: "consumer" },
};

// @ts-expect-error Unknown normalization accepts exact FailureContext only.
errorIngress.unknown(caughtError, contextWithDiagnostics);

// @ts-expect-error Public Result failures are not opaque Failure identities.
errorProject.result(errorResult.fail("FORBIDDEN"));

// @ts-expect-error Diagnostics accept only package-owned opaque Failure identities.
errorProject.diagnostics(errorResult.fail("FORBIDDEN"));

// @ts-expect-error HTTP projection rejects successful results.
errorProject.http(errorResult.ok({ id: "invoice-1" }));

const missingRegistryDefinition = {
	BAD_REQUEST: ERROR_REGISTRY.BAD_REQUEST,
	CONCURRENCY_CONFLICT: ERROR_REGISTRY.CONCURRENCY_CONFLICT,
	CONFLICT: ERROR_REGISTRY.CONFLICT,
	FORBIDDEN: ERROR_REGISTRY.FORBIDDEN,
	INTERNAL_ERROR: ERROR_REGISTRY.INTERNAL_ERROR,
	NOT_FOUND: ERROR_REGISTRY.NOT_FOUND,
	RATE_LIMITED: ERROR_REGISTRY.RATE_LIMITED,
	UNAUTHORIZED: ERROR_REGISTRY.UNAUTHORIZED,
	VALIDATION_ERROR: ERROR_REGISTRY.VALIDATION_ERROR,
};

// @ts-expect-error A complete registry cannot omit a canonical definition.
defineErrorRegistry(missingRegistryDefinition);

defineErrorRegistry({
	...ERROR_REGISTRY,
	// @ts-expect-error A complete registry cannot add an unknown definition.
	EXTRA_ERROR: ERROR_REGISTRY.INTERNAL_ERROR,
});

defineErrorRegistry({
	...ERROR_REGISTRY,
	// @ts-expect-error Registry keys and declared definition codes must match.
	BAD_REQUEST: { ...ERROR_REGISTRY.BAD_REQUEST, code: "CONFLICT" },
});
