import { hashSnapshot } from "../../features/calculation/calculation-snapshot";

export function buildPayrollCreateFingerprint(
	payload: Record<string, unknown>,
): string {
	return hashSnapshot(payload);
}
