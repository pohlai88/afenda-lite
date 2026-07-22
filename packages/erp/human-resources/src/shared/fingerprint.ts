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

export function fingerprintCourseCreate(input: {
	code: string;
	title: string;
	description: string | null;
	durationHours: string | null;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		title: input.title.trim(),
		description: input.description?.trim() ?? null,
		durationHours: input.durationHours,
	});
}

export function fingerprintSessionCreate(input: {
	courseId: string;
	code: string;
	title: string;
	scheduledStartsAt: string;
	scheduledEndsAt: string;
	capacity: number | null;
}): string {
	return sha256Fingerprint({
		courseId: input.courseId,
		code: input.code.trim(),
		title: input.title.trim(),
		scheduledStartsAt: input.scheduledStartsAt,
		scheduledEndsAt: input.scheduledEndsAt,
		capacity: input.capacity,
	});
}

export function fingerprintLearningAssignmentCreate(input: {
	employeeId: string;
	courseId: string;
	sessionId: string | null;
	assignedBy: string;
	assignedAt: string;
	dueOn: string | null;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		courseId: input.courseId,
		sessionId: input.sessionId,
		assignedBy: input.assignedBy,
		assignedAt: input.assignedAt,
		dueOn: input.dueOn,
	});
}

export function fingerprintCompletionRecord(input: {
	assignmentId: string;
	employeeId: string;
	courseId: string;
	sessionId: string | null;
	completedAt: string;
	outcome: string;
	assessorUserId: string | null;
	notes: string | null;
}): string {
	return sha256Fingerprint({
		assignmentId: input.assignmentId,
		employeeId: input.employeeId,
		courseId: input.courseId,
		sessionId: input.sessionId,
		completedAt: input.completedAt,
		outcome: input.outcome,
		assessorUserId: input.assessorUserId,
		notes: input.notes?.trim() ?? null,
	});
}

export function fingerprintCertificationIssue(input: {
	employeeId: string;
	courseId: string;
	completionId: string;
	certificationCode: string;
	issuedOn: string;
	expiresOn: string | null;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		courseId: input.courseId,
		completionId: input.completionId,
		certificationCode: input.certificationCode.trim(),
		issuedOn: input.issuedOn,
		expiresOn: input.expiresOn,
	});
}

export function fingerprintLeavePolicyCreate(input: {
	code: string;
	name: string;
	leaveType: string;
	unit: string;
	effectiveFrom: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		name: input.name.trim(),
		leaveType: input.leaveType,
		unit: input.unit,
		effectiveFrom: input.effectiveFrom,
	});
}

export function fingerprintLeaveEntitlementGrant(input: {
	employeeId: string;
	employmentId: string;
	policyId: string;
	periodStart: string;
	periodEnd: string;
	openingQuantity: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintLeaveAdjustment(input: {
	entitlementId: string;
	kind: string;
	delta: string;
	reason: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintLeaveRequestCreate(input: {
	employeeId: string;
	entitlementId: string;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintPerformanceCycleCreate(input: {
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	weightingModel: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		name: input.name.trim(),
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		weightingModel: input.weightingModel,
	});
}

export function fingerprintPerformanceGoalCreate(input: {
	cycleId: string;
	employeeId: string;
	employmentId: string;
	title: string;
	periodStart: string;
	periodEnd: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintPerformanceReviewFinalize(input: {
	reviewId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintImprovementPlanCreate(input: {
	reviewId: string;
	employeeId: string;
	employmentId: string;
	dueDate: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintHeadcountPlanCreate(input: {
	code: string;
	title: string;
	planningScopeKey: string;
	periodStart: string;
	periodEnd: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		title: input.title.trim(),
		planningScopeKey: input.planningScopeKey.trim(),
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
	});
}

export function fingerprintHeadcountReservation(input: {
	planLineId: string;
	requisitionId: string;
	reservedFte: string;
	reservedHeadcount: number;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintEmployeeCaseOpen(input: {
	employeeId: string;
	employmentId: string;
	caseType: string;
	severity: string;
	classificationCode: string;
	ownerActorUserId: string;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		caseType: input.caseType,
		severity: input.severity,
		classificationCode: input.classificationCode.trim(),
		ownerActorUserId: input.ownerActorUserId,
	});
}

export function fingerprintEmployeeCaseActionRecommend(input: {
	caseId: string;
	actionType: string;
}): string {
	return sha256Fingerprint({
		caseId: input.caseId,
		actionType: input.actionType,
	});
}

export function fingerprintEmployeeCaseAppeal(input: {
	caseId: string;
	originalFindingCode: string;
	originalFindingRecordedAt: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCompetencyCreate(input: {
	code: string;
	name: string;
	scaleCode: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		name: input.name.trim(),
		scaleCode: input.scaleCode,
	});
}

export function fingerprintCompetencyAssessmentCreate(input: {
	employeeId: string;
	competencyId: string;
	assessorUserId: string;
	scaleCode: string;
	level: number;
	effectiveOn: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintTalentProfileCreate(input: {
	employeeId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCompetencyAssessmentSupersede(input: {
	assessmentId: string;
	assessorUserId: string;
	level: number;
	effectiveOn: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintTalentProfileAssessmentCreate(input: {
	talentProfileId: string;
	methodCode: string;
	classification: string;
	assessorUserId: string;
}): string {
	return sha256Fingerprint({
		talentProfileId: input.talentProfileId,
		methodCode: input.methodCode,
		classification: input.classification.trim(),
		assessorUserId: input.assessorUserId,
	});
}

export function fingerprintTalentPoolCreate(input: {
	code: string;
	name: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		name: input.name.trim(),
	});
}

export function fingerprintTalentPoolMemberCreate(input: {
	poolId: string;
	employeeId: string;
	nominatorUserId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCareerPlanCreate(input: {
	employeeId: string;
	code: string;
	title: string;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		code: input.code.trim(),
		title: input.title.trim(),
	});
}

export function fingerprintSuccessionPlanCreate(input: {
	code: string;
	title: string;
	positionId: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		title: input.title.trim(),
		positionId: input.positionId,
	});
}

export function fingerprintSuccessionCandidateCreate(input: {
	successionPlanId: string;
	employeeId: string | null;
	externalCandidateRef: string | null;
	nominatorUserId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintEmployeeDocumentRegister(input: {
	employeeId: string;
	requirementId: string | null;
	documentType: string;
	issuedOn: string;
	expiresOn: string | null;
	documentRef: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintWorkEligibilityRecord(input: {
	employeeId: string;
	countryCode: string;
	jurisdiction: string | null;
	issuedOn: string;
	expiresOn: string | null;
	documentRef: string | null;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintPolicyAcknowledgementIssue(input: {
	employeeId: string;
	policyCode: string;
	policyVersion: string;
}): string {
	return sha256Fingerprint(input);
}
