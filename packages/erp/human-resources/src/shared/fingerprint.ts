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

export function fingerprintOnboardingStart(input: {
	employmentId: string;
	sourceOfferId: string | null;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		sourceOfferId: input.sourceOfferId,
	});
}

export function fingerprintProbationOpen(input: {
	employmentId: string;
	startsOn: string;
	endsOn: string;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		startsOn: input.startsOn,
		endsOn: input.endsOn,
	});
}

export function fingerprintConfirmation(input: {
	employmentId: string;
	confirmedOn: string;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		confirmedOn: input.confirmedOn,
	});
}

export function fingerprintTransfer(input: {
	employmentId: string;
	fromPositionId: string;
	toPositionId: string;
	effectiveOn: string;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		fromPositionId: input.fromPositionId,
		toPositionId: input.toPositionId,
		effectiveOn: input.effectiveOn,
	});
}

export function fingerprintTermination(input: {
	employmentId: string;
	effectiveOn: string;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		effectiveOn: input.effectiveOn,
	});
}

export function fingerprintOffboardingStart(input: {
	employmentId: string;
	terminationId: string | null;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		terminationId: input.terminationId,
	});
}

export function fingerprintEmployeeCompensationCreate(input: {
	employmentId: string;
	baseAmount: string;
	currencyCode: string;
	effectiveFrom: string;
	reason: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCompensationReviewDraft(input: {
	employeeId: string;
	employmentId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintBenefitEnrollment(input: {
	employeeId: string;
	employmentId: string;
	planId: string;
	effectiveFrom: string;
}): string {
	return sha256Fingerprint(input);
}
