import { createHash } from "node:crypto";

function sha256Fingerprint(payload: unknown): string {
	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function fingerprintEmployeeCreate(input: {
	employeeNumber: string;
	legalName: string;
}): string {
	return sha256Fingerprint({
		employeeNumber: input.employeeNumber.trim(),
		legalName: input.legalName.trim(),
	});
}

export function fingerprintRequisitionCreate(input: {
	code: string;
	title: string;
	jobId: string | null;
	positionId: string | null;
	departmentId: string | null;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		title: input.title.trim(),
		jobId: input.jobId,
		positionId: input.positionId,
		departmentId: input.departmentId,
	});
}

export function fingerprintCandidateCreate(input: {
	displayName: string;
	normalizedEmail: string;
	phone: string | null;
}): string {
	return sha256Fingerprint({
		displayName: input.displayName.trim(),
		normalizedEmail: input.normalizedEmail,
		phone: input.phone,
	});
}

export function fingerprintOfferAccept(input: { offerId: string }): string {
	return sha256Fingerprint({
		offerId: input.offerId,
	});
}
