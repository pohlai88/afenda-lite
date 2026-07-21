import { createHash } from "node:crypto";

export function fingerprintEmployeeCreate(input: {
	employeeNumber: string;
	legalName: string;
}): string {
	const payload = JSON.stringify({
		employeeNumber: input.employeeNumber.trim(),
		legalName: input.legalName.trim(),
	});
	return createHash("sha256").update(payload).digest("hex");
}
