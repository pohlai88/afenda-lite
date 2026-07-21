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
