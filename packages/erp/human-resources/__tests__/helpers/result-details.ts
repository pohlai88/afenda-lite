export function humanResourcesCodeFromResult(result: {
	details?: unknown;
}): string | undefined {
	const details = result.details;
	if (typeof details !== "object" || details === null) {
		return undefined;
	}
	if (!("humanResourcesCode" in details)) {
		return undefined;
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
