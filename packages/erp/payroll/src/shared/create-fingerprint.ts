export function buildPayrollCreateFingerprint(
	payload: Record<string, unknown>,
): string {
	return JSON.stringify(payload);
}
