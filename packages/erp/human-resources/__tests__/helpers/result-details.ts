import { errorResult } from "@afenda/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function humanResourcesContextFromResult(
	result: unknown,
): Record<string, unknown> | undefined {
	const context = errorResult.context(result);
	return isRecord(context) ? context : undefined;
}

export function humanResourcesCodeFromResult(result: {
	details?: unknown;
}): string | undefined {
	const details = humanResourcesContextFromResult(result);
	if (typeof details !== "object" || details === null) {
		return;
	}
	if (!("humanResourcesCode" in details)) {
		return;
	}
	const { humanResourcesCode } = details;
	return typeof humanResourcesCode === "string"
		? humanResourcesCode
		: undefined;
}

export function resultFailureMessage(result: {
	ok: boolean;
	code?: unknown;
	message?: unknown;
	details?: unknown;
}): string {
	if (result.ok) {
		return "Expected operation to succeed.";
	}

	return `Expected operation to succeed, received ${JSON.stringify({
		code: result.code,
		message: result.message,
		details: result.details,
	})}`;
}
