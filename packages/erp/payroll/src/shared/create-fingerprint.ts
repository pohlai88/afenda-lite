import { hashSnapshot } from "../runs/calc/snapshot";

export function buildPayrollCreateFingerprint(
	payload: Record<string, unknown>,
): string {
	return hashSnapshot(payload);
}
