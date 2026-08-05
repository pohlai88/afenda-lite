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

export function fingerprintPersonCreate(input: {
	legalName: string;
	preferredName?: string | null | undefined;
	privacyClassification?: string | undefined;
}): string {
	return sha256Fingerprint({
		legalName: input.legalName.trim(),
		preferredName: input.preferredName?.trim() ?? null,
		privacyClassification: input.privacyClassification ?? "workforce_core",
	});
}

export function fingerprintPersonContactAdd(input: {
	personId: string;
	contactType: string;
	normalizedValue: string;
	isPrimary: boolean;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintPersonIdentifierAdd(input: {
	personId: string;
	identifierType: string;
	identifierFingerprint: string;
	effectiveFrom: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintWorkerCreate(input: {
	personId: string;
	workerType: string;
	employeeId: string | null;
	status: string;
	effectiveFrom: string;
	effectiveTo: string | null;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintRequisitionCreate(input: {
	code: string;
	title: string;
	jobId: string | null;
	positionId: string | null;
	departmentId: string | null;
	hiringManagerEmployeeId?: string | null | undefined;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		title: input.title.trim(),
		jobId: input.jobId,
		positionId: input.positionId,
		departmentId: input.departmentId,
		hiringManagerEmployeeId: input.hiringManagerEmployeeId ?? null,
	});
}

export function fingerprintCandidateCreate(input: {
	displayName: string;
	normalizedEmail: string;
	phone: string | null;
	consentPolicyVersion: string;
	consentCapturedAt: string;
	consentSource: string;
	retentionUntil: string;
}): string {
	return sha256Fingerprint({
		displayName: input.displayName.trim(),
		normalizedEmail: input.normalizedEmail,
		phone: input.phone,
		consentPolicyVersion: input.consentPolicyVersion,
		consentCapturedAt: input.consentCapturedAt,
		consentSource: input.consentSource,
		retentionUntil: input.retentionUntil,
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
	toPositionId: string;
	organizationDimensionIds: readonly string[];
	effectiveOn: string;
	reason: string;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		toPositionId: input.toPositionId,
		organizationDimensionIds: input.organizationDimensionIds,
		effectiveOn: input.effectiveOn,
		reason: input.reason,
	});
}

export function fingerprintTermination(input: {
	employmentId: string;
	reasonCode: string;
	reasonDetail: string;
	effectiveOn: string;
	rehireEligible: boolean;
}): string {
	return sha256Fingerprint({
		employmentId: input.employmentId,
		reasonCode: input.reasonCode.trim(),
		reasonDetail: input.reasonDetail.trim(),
		effectiveOn: input.effectiveOn,
		rehireEligible: input.rehireEligible,
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
	payFrequency: string;
	effectiveFrom: string;
	reason: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintEmployeeCompensationCorrection(input: {
	predecessorId: string;
	baseAmount: string;
	currencyCode: string;
	payFrequency: string;
	effectiveFrom: string;
	reason: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCompensationReviewDraft(input: {
	cycleId: string;
	employeeId: string;
	employmentId: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCompensationReviewCycleCreate(input: {
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	budgetTotalAmount: string;
	budgetCurrencyCode: string;
}): string {
	return sha256Fingerprint({
		code: input.code.trim(),
		name: input.name.trim(),
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		budgetTotalAmount: input.budgetTotalAmount,
		budgetCurrencyCode: input.budgetCurrencyCode,
	});
}

export function fingerprintBenefitEnrollment(input: {
	employeeId: string;
	employmentId: string;
	planId: string;
	effectiveFrom: string;
	effectiveTo?: string | null | undefined;
	employeeContributionAmount?: string | null | undefined;
	employerContributionAmount?: string | null | undefined;
	contributionCurrencyCode?: string | null | undefined;
	contributionFrequency?: string | null | undefined;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		planId: input.planId,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo ?? null,
		employeeContributionAmount: input.employeeContributionAmount ?? null,
		employerContributionAmount: input.employerContributionAmount ?? null,
		contributionCurrencyCode: input.contributionCurrencyCode ?? null,
		contributionFrequency: input.contributionFrequency ?? null,
	});
}

export function fingerprintBenefitWaiver(input: {
	enrollmentId: string;
	waiverReason: string;
	effectiveTo: string | null;
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
	primaryInstructorUserId: string | null;
}): string {
	return sha256Fingerprint({
		courseId: input.courseId,
		code: input.code.trim(),
		title: input.title.trim(),
		scheduledStartsAt: input.scheduledStartsAt,
		scheduledEndsAt: input.scheduledEndsAt,
		capacity: input.capacity,
		primaryInstructorUserId: input.primaryInstructorUserId,
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

export function fingerprintLearningAttendanceRecord(input: {
	sessionId: string;
	assignmentId: string;
	employeeId: string;
	status: string;
	recordedAt: string;
}): string {
	return sha256Fingerprint({
		sessionId: input.sessionId,
		assignmentId: input.assignmentId,
		employeeId: input.employeeId,
		status: input.status,
		recordedAt: input.recordedAt,
	});
}

export function fingerprintCertificationRenew(input: {
	certificationId: string;
	completionId: string;
	certificationCode: string;
	issuedOn: string;
	expiresOn: string | null;
}): string {
	return sha256Fingerprint({
		certificationId: input.certificationId,
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
	source?: string | undefined;
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
	goalKind: string;
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
	milestones: Array<{ dueDate: string }>;
}): string {
	return sha256Fingerprint({
		reviewId: input.reviewId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		dueDate: input.dueDate,
		milestones: input.milestones.map((milestone) => milestone.dueDate),
	});
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
	expiresOn: string | null;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintTalentProfileCreate(input: {
	employeeId: string;
	summary: string | null;
}): string {
	return sha256Fingerprint({
		employeeId: input.employeeId,
		summary: input.summary,
	});
}

export function fingerprintCompetencyAssessmentSupersede(input: {
	assessmentId: string;
	assessorUserId: string;
	level: number;
	effectiveOn: string;
	expiresOn: string | null;
}): string {
	return sha256Fingerprint(input);
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

export function fingerprintTalentProfileMobilityCreate(input: {
	talentProfileId: string;
	dimension: string;
	preferenceCode: string;
	effectiveFrom: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintCriticalRoleReadinessCreate(input: {
	talentProfileId: string;
	positionId: string;
	readiness: string;
	readinessEffectiveOn: string;
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
	dueOn: string;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintHireFromAcceptedOffer(input: {
	offerId: string;
	employeeNumber: string;
	startsOn: string;
	positionId: string | null;
	legalName: string;
	preferredName: string | null;
	legalEntityKey: string;
	businessUnitKey: string;
	locationKey: string;
	costCentreKey: string;
	projectKey: string;
	tasks: readonly { code: string; title: string; mandatory: boolean }[];
}): string {
	return sha256Fingerprint({
		offerId: input.offerId,
		employeeNumber: input.employeeNumber.trim(),
		startsOn: input.startsOn,
		positionId: input.positionId,
		legalName: input.legalName.trim(),
		preferredName: input.preferredName?.trim() ?? null,
		legalEntityKey: input.legalEntityKey.trim(),
		businessUnitKey: input.businessUnitKey.trim(),
		locationKey: input.locationKey.trim(),
		costCentreKey: input.costCentreKey.trim(),
		projectKey: input.projectKey.trim(),
		tasks: input.tasks.map((task) => ({
			code: task.code.trim(),
			title: task.title.trim(),
			mandatory: task.mandatory,
		})),
	});
}

export function fingerprintStatutoryProfileUpsert(input: {
	employeeId: string;
	jurisdictionCode: string;
	effectiveFrom: string;
	taxResidencyStatus: string;
	nationalityCountryCode: string;
	expatriate: boolean;
	minimumWageZone: string | null;
	dependantCount: number;
	reliefDeclarationVersion: string;
	reliefDeclarations: unknown;
	taxFileNumber: string | null;
	employeeProvidentFundNumber: string | null;
	socialSecurityNumber: string | null;
	socialInsuranceBookNumber: string | null;
}): string {
	return sha256Fingerprint(input);
}

export function fingerprintPriorEmployerYtdRecord(input: {
	employeeId: string;
	jurisdictionCode: string;
	taxYear: number;
	priorEmployerName: string | null;
	grossAmount: string;
	taxWithheldAmount: string;
	statutoryContributionAmount: string;
	currencyCode: string;
	recordedOn: string;
}): string {
	return sha256Fingerprint(input);
}
