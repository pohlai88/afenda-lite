import { fail, ok, type Result } from "@afenda/errors/result";

export function normalizeEmployeeNumber(
	raw: string,
): Result<{ employeeNumber: string; normalizedEmployeeNumber: string }> {
	const employeeNumber = raw.trim();
	if (employeeNumber.length === 0) {
		return fail("BAD_REQUEST", "Employee number is required");
	}
	if (employeeNumber.length > 64) {
		return fail("BAD_REQUEST", "Employee number must be at most 64 characters");
	}
	return ok({
		employeeNumber,
		normalizedEmployeeNumber: employeeNumber.toUpperCase(),
	});
}
