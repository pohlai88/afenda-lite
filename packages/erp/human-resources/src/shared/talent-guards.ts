import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { conflict, invalidInput, invalidState } from "./domain-guards";
import type { EmploymentStatus } from "./employment-status";
import {
	type CareerPlanActionStatus,
	type CareerPlanStatus,
	type CompetencyAssessmentStatus,
	type CompetencyScaleCode,
	type CompetencyStatus,
	isCareerPlanActionOpen,
	isCareerPlanOpen,
	isCompetencyActive,
	isJobCompetencyActive,
	isSuccessionCandidateActive,
	isSuccessionPlanActive,
	isTalentPoolMemberActive,
	isTalentPoolOpen,
	isTalentProfileActive,
	type JobCompetencyStatus,
	SUCCESSION_READINESS_MAX_AGE_DAYS,
	type SuccessionCandidateStatus,
	type SuccessionPlanStatus,
	type TalentPoolMemberStatus,
	type TalentPoolStatus,
	type TalentProfileAssessmentMethodCode,
	type TalentProfileAssessmentStatus,
	type TalentProfileStatus,
} from "./talent-status";

function alreadyInStatus(entity: string, status: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		`${entity} is already in status '${status}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

function cannotTransition(
	entity: string,
	current: string,
	next: string,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		`Cannot transition ${entity} from '${current}' to '${next}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

// Competency guards

export function assertCompetencyActive(status: CompetencyStatus): Result<void> {
	if (!isCompetencyActive(status)) {
		return invalidState("Competency must be active");
	}
	return ok(undefined);
}

export function canTransitionCompetencyStatus(
	current: CompetencyStatus,
	next: CompetencyStatus,
): boolean {
	if (current === next) return false;
	return current === "active" && next === "retired";
}

export function assertCompetencyStatusTransition(
	current: CompetencyStatus,
	next: CompetencyStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Competency", next);
	}
	if (!canTransitionCompetencyStatus(current, next)) {
		return cannotTransition("competency", current, next);
	}
	return ok(undefined);
}

export function assertJobCompetencyMappable(input: {
	competencyStatus: CompetencyStatus;
	existingMappingStatus: JobCompetencyStatus | null;
}): Result<void> {
	const competencyActive = assertCompetencyActive(input.competencyStatus);
	if (!competencyActive.ok) {
		return competencyActive;
	}
	if (
		input.existingMappingStatus !== null &&
		isJobCompetencyActive(input.existingMappingStatus)
	) {
		return conflict("Competency is already mapped to this job");
	}
	return ok(undefined);
}

export function assertJobCompetencyRemovable(
	status: JobCompetencyStatus,
): Result<void> {
	if (!isJobCompetencyActive(status)) {
		return invalidState("Job competency mapping is already removed");
	}
	return ok(undefined);
}

export function assertAssessmentInputValid(input: {
	competencyStatus: CompetencyStatus;
	competencyScaleCode: CompetencyScaleCode;
	assessmentScaleCode: CompetencyScaleCode;
	assessorUserId: string;
	evidenceSource: string;
	level: number;
	effectiveOn: string;
	todayDate: string;
}): Result<void> {
	const competencyActive = assertCompetencyActive(input.competencyStatus);
	if (!competencyActive.ok) {
		return competencyActive;
	}
	if (input.competencyScaleCode !== input.assessmentScaleCode) {
		return invalidInput(
			"Assessment scale must match the competency's scale code",
		);
	}
	if (input.assessorUserId.trim().length === 0) {
		return invalidInput("Assessment requires an assessor");
	}
	if (input.evidenceSource.trim().length === 0) {
		return invalidInput("Assessment requires an evidence source");
	}
	if (input.level < 1 || input.level > 5) {
		return invalidInput("Assessment level must be between 1 and 5");
	}
	if (input.effectiveOn > input.todayDate) {
		return invalidInput("Assessment effective date cannot be in the future");
	}
	return ok(undefined);
}

export function assertAssessmentSupersedable(
	status: CompetencyAssessmentStatus,
): Result<void> {
	if (status !== "current") {
		return invalidState("Only the current assessment can be superseded");
	}
	return ok(undefined);
}

// Talent profile guards

export function assertTalentProfileActive(
	status: TalentProfileStatus,
): Result<void> {
	if (!isTalentProfileActive(status)) {
		return invalidState("Talent profile is archived");
	}
	return ok(undefined);
}

export function assertTalentProfileArchivable(
	status: TalentProfileStatus,
): Result<void> {
	if (!isTalentProfileActive(status)) {
		return alreadyInStatus("Talent profile", status);
	}
	return ok(undefined);
}

export function assertProfileAssessmentDraftable(input: {
	methodCode: TalentProfileAssessmentMethodCode;
	evidenceSummary: string;
}): Result<void> {
	if (input.evidenceSummary.trim().length === 0) {
		return invalidInput("Talent profile assessment requires evidence summary");
	}
	return ok(undefined);
}

export function assertProfileAssessmentConfirmable(
	status: TalentProfileAssessmentStatus,
): Result<void> {
	if (status !== "draft") {
		return invalidState("Only a draft assessment can be confirmed");
	}
	return ok(undefined);
}

// Talent pool guards

export function assertTalentPoolOpen(status: TalentPoolStatus): Result<void> {
	if (!isTalentPoolOpen(status)) {
		return invalidState("Talent pool is closed");
	}
	return ok(undefined);
}

export function assertTalentPoolClosable(
	status: TalentPoolStatus,
): Result<void> {
	if (!isTalentPoolOpen(status)) {
		return alreadyInStatus("Talent pool", status);
	}
	return ok(undefined);
}

export function assertTalentPoolMemberNominatable(input: {
	poolStatus: TalentPoolStatus;
	existingMemberStatus: TalentPoolMemberStatus | null;
	nominatorUserId: string;
}): Result<void> {
	const poolOpen = assertTalentPoolOpen(input.poolStatus);
	if (!poolOpen.ok) {
		return poolOpen;
	}
	if (input.nominatorUserId.trim().length === 0) {
		return invalidInput("Talent pool nomination requires a nominator");
	}
	if (
		input.existingMemberStatus !== null &&
		isTalentPoolMemberActive(input.existingMemberStatus)
	) {
		return conflict("Employee is already an active member of this pool");
	}
	return ok(undefined);
}

export function assertTalentPoolMemberApprovable(input: {
	status: TalentPoolMemberStatus;
	approverUserId: string;
}): Result<void> {
	if (input.status !== "nominated") {
		return invalidState("Only a nominated member can be approved");
	}
	if (input.approverUserId.trim().length === 0) {
		return invalidInput("Talent pool approval requires an approver");
	}
	return ok(undefined);
}

export function assertTalentPoolMemberRemovable(
	status: TalentPoolMemberStatus,
): Result<void> {
	if (!isTalentPoolMemberActive(status)) {
		return invalidState("Talent pool member is already removed");
	}
	return ok(undefined);
}

// Career plan guards

export function assertCareerPlanOpen(status: CareerPlanStatus): Result<void> {
	if (!isCareerPlanOpen(status)) {
		return invalidState("Career plan is closed");
	}
	return ok(undefined);
}

export function canTransitionCareerPlanStatus(
	current: CareerPlanStatus,
	next: CareerPlanStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && next === "acknowledged") return true;
	if (current === "acknowledged" && next === "active") return true;
	if (
		(current === "draft" ||
			current === "acknowledged" ||
			current === "active") &&
		next === "closed"
	) {
		return true;
	}
	return false;
}

export function assertCareerPlanStatusTransition(
	current: CareerPlanStatus,
	next: CareerPlanStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Career plan", next);
	}
	if (!canTransitionCareerPlanStatus(current, next)) {
		return cannotTransition("career plan", current, next);
	}
	return ok(undefined);
}

export function assertCareerPlanAcknowledgeable(
	status: CareerPlanStatus,
): Result<void> {
	if (status !== "draft") {
		return invalidState("Only a draft career plan can be acknowledged");
	}
	return ok(undefined);
}

export function assertCareerPlanActionAddable(
	planStatus: CareerPlanStatus,
): Result<void> {
	const planOpen = assertCareerPlanOpen(planStatus);
	if (!planOpen.ok) {
		return planOpen;
	}
	return ok(undefined);
}

export function assertCareerPlanActionCompletable(
	status: CareerPlanActionStatus,
): Result<void> {
	if (!isCareerPlanActionOpen(status)) {
		return invalidState("Career plan action is not open");
	}
	return ok(undefined);
}

// Succession guards

export function assertSuccessionPlanActive(
	status: SuccessionPlanStatus,
): Result<void> {
	if (!isSuccessionPlanActive(status)) {
		return invalidState("Succession plan must be active");
	}
	return ok(undefined);
}

export function canTransitionSuccessionPlanStatus(
	current: SuccessionPlanStatus,
	next: SuccessionPlanStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && next === "active") return true;
	if ((current === "draft" || current === "active") && next === "closed") {
		return true;
	}
	return false;
}

export function assertSuccessionPlanStatusTransition(
	current: SuccessionPlanStatus,
	next: SuccessionPlanStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Succession plan", next);
	}
	if (!canTransitionSuccessionPlanStatus(current, next)) {
		return cannotTransition("succession plan", current, next);
	}
	return ok(undefined);
}

export function assertSuccessionCandidateNominatable(input: {
	planStatus: SuccessionPlanStatus;
	allowsExternalCandidates: boolean;
	employeeId: string | null;
	externalCandidateRef: string | null;
	employmentStatus: EmploymentStatus | null;
	nominatorUserId: string;
}): Result<void> {
	if (input.planStatus === "closed") {
		return invalidState("Succession plan is closed");
	}
	if (input.nominatorUserId.trim().length === 0) {
		return invalidInput("Succession nomination requires a nominator");
	}
	const hasEmployee = input.employeeId !== null;
	const hasExternal =
		input.externalCandidateRef !== null &&
		input.externalCandidateRef.trim().length > 0;
	if (hasEmployee === hasExternal) {
		return invalidInput(
			"Succession candidate must reference exactly one of employee or external candidate",
		);
	}
	if (hasExternal && !input.allowsExternalCandidates) {
		return invalidState("Succession plan does not allow external candidates");
	}
	if (hasEmployee && input.employmentStatus !== "active") {
		return invalidState(
			"Employee must have active employment to be nominated as a succession candidate",
		);
	}
	return ok(undefined);
}

export function assertSuccessionCandidateActive(
	status: SuccessionCandidateStatus,
): Result<void> {
	if (!isSuccessionCandidateActive(status)) {
		return invalidState("Succession candidate is not active");
	}
	return ok(undefined);
}

export function assertSuccessionCandidateApprovable(
	status: SuccessionCandidateStatus,
): Result<void> {
	if (status !== "nominated") {
		return invalidState("Only a nominated candidate can be approved");
	}
	return ok(undefined);
}

export function assertSuccessionCandidateRemovable(
	status: SuccessionCandidateStatus,
): Result<void> {
	if (!isSuccessionCandidateActive(status)) {
		return invalidState("Succession candidate is already removed");
	}
	return ok(undefined);
}

export function assertReadinessAssessmentValid(input: {
	evidenceSummary: string;
	effectiveOn: string;
	todayDate: string;
}): Result<void> {
	if (input.evidenceSummary.trim().length === 0) {
		return invalidInput("Readiness assessment requires an evidence summary");
	}
	if (input.effectiveOn > input.todayDate) {
		return invalidInput("Readiness effective date cannot be in the future");
	}
	return ok(undefined);
}

/** Readiness is stale once older than the maximum age window (default 365 days). */
export function assertReadinessNotStale(input: {
	readinessEffectiveOn: string;
	asOfDate: string;
	maxAgeDays?: number;
}): Result<void> {
	const maxAgeDays = input.maxAgeDays ?? SUCCESSION_READINESS_MAX_AGE_DAYS;
	const effective = new Date(`${input.readinessEffectiveOn}T00:00:00.000Z`);
	const asOf = new Date(`${input.asOfDate}T00:00:00.000Z`);
	const ageDays = Math.floor(
		(asOf.getTime() - effective.getTime()) / (24 * 60 * 60 * 1000),
	);
	if (ageDays > maxAgeDays) {
		return invalidState(
			`Succession readiness assessment is stale (older than ${maxAgeDays} days)`,
		);
	}
	return ok(undefined);
}
