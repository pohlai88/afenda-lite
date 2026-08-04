/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
// biome-ignore lint/performance/noNamespaceImport: Rejected governance fixture proves namespace capability escape detection.
import * as errorsNamespace from "../../../src/index";
import { errorResult } from "../../../src/index";

const constFail = errorResult.fail;
const { fail: destructuredFail } = errorResult;
// biome-ignore lint/style/useConst: Rejected governance fixture requires a mutable method alias.
let mutableFail = errorResult.fail;
// biome-ignore lint/style/useConst: Rejected governance fixture requires mutable destructuring.
let { fail: mutableDestructuredFail } = errorResult;
const wrappedCapabilityMethod = { fail: errorResult.fail };
const wrappedCapabilityObject = { cap: errorResult };
const wrappedNamespaceCapabilityObject = { cap: errorsNamespace.errorResult };
const computedFailMethod = "fail";

function registerMethod(method: unknown): unknown {
	return method;
}

export const registeredCapabilityMethod = registerMethod(errorResult.fail);
export const registeredCapabilityObject = registerMethod(errorResult);

export function rejectedLiteralCodeParameter(
	code: "VALIDATION_ERROR",
	runtimeMessage: string,
): object {
	return errorResult.fail(code, {
		fieldErrors: {
			email: [formatMessage(runtimeMessage) as "Asserted field text"],
		},
		publicMessage: "Review the highlighted fields",
	});
}

export function rejectedShadowedUndefined(
	// biome-ignore lint/suspicious/noShadowRestrictedNames: Rejected symbol-resolution fixture.
	undefined: string,
): object {
	return errorResult.fail("VALIDATION_ERROR", {
		fieldErrors: { email: [undefined] },
		publicMessage: "Review the highlighted fields",
	});
}

function formatMessage(value: string): string {
	return value;
}

export function rejectedMutatedInputContainer(runtimeMessage: string): object {
	const input = { publicMessage: "Reviewed static text" } as const;
	Object.defineProperty(input, "publicMessage", { value: runtimeMessage });
	return errorResult.fail("NOT_FOUND", input);
}

export function rejectedMutatedFieldContainer(runtimeMessage: string): object {
	const fieldErrors = {
		email: ["Enter a valid email address"],
	} as const;
	Object.defineProperty(fieldErrors, "email", { value: [runtimeMessage] });
	return errorResult.fail("VALIDATION_ERROR", {
		fieldErrors,
		publicMessage: "Review the highlighted fields",
	});
}

export function rejectedMutatedFieldMessageArray(
	runtimeMessage: string,
): object {
	const messages = ["Enter a valid email address"] as const;
	Object.defineProperty(messages, "0", { value: runtimeMessage });
	return errorResult.fail("VALIDATION_ERROR", {
		fieldErrors: { email: messages },
		publicMessage: "Review the highlighted fields",
	});
}

export function rejectedDynamicPublicMessages(
	runtimeMessage: string,
	error: Error,
	runtimeInput: Readonly<Record<string, unknown>>,
): readonly object[] {
	return [
		errorResult.fail("NOT_FOUND", {
			publicMessage: `Employee ${runtimeMessage} was not found`,
		}),
		errorResult.fail("NOT_FOUND", {
			// biome-ignore lint/style/useTemplate: Rejected AST fixture preserves concatenation.
			publicMessage: "Employee " + runtimeMessage + " was not found",
		}),
		errorResult.fail("CONFLICT", { publicMessage: error.message }),
		errorResult.fail("CONFLICT", { publicMessage: runtimeMessage }),
		errorResult.fail("BAD_REQUEST", {
			publicMessage: formatMessage(runtimeMessage),
		}),
		errorResult.fail("NOT_FOUND", {
			publicMessage: "Apparently safe text",
			...runtimeInput,
		}),
		errorResult.fail("CONFLICT", {
			// biome-ignore lint/complexity/noUselessStringConcat: Rejected AST fixture preserves literal concatenation.
			publicMessage: "Entirely " + "literal concatenation",
		}),
		errorResult.fail("BAD_REQUEST", {
			publicMessage: `Entirely ${"literal"} interpolation`,
		}),
		errorResult.fail("NOT_FOUND", {
			// biome-ignore lint/style/noUnusedTemplateLiteral: Rejected AST fixture preserves template syntax.
			publicMessage: `No-substitution template text`,
		}),
		destructuredFail("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted static text",
		}),
		mutableFail("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted mutable text",
		}),
		mutableDestructuredFail("CONFLICT", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted mutable text",
		}),
		constFail("BAD_REQUEST", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted const text",
		}),
		wrappedCapabilityMethod.fail("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted wrapped text",
		}),
		wrappedCapabilityObject.cap.fail("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted object text",
		}),
		wrappedNamespaceCapabilityObject.cap.fail("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted namespace text",
		}),
		errorResult[computedFailMethod]("NOT_FOUND", {
			publicMessage: formatMessage(runtimeMessage) as "Asserted computed text",
		}),
		errorResult.fail("VALIDATION_ERROR", {
			fieldErrors: {
				email: [`Email ${runtimeMessage} is invalid`],
			},
			publicMessage: "Review the highlighted fields",
		}),
		errorResult.fail("VALIDATION_ERROR", {
			fieldErrors: {
				[runtimeMessage]: ["Enter a valid email address"],
			},
			publicMessage: "Review the highlighted fields",
		}),
	];
}
