import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
	HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
	HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
} from "@afenda/events/schemas";
import {
	type HumanResourcesClearanceId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentConfirmationId,
	type HumanResourcesEmploymentId,
	type HumanResourcesEmploymentMovementId,
	type HumanResourcesExitInterviewId,
	type HumanResourcesOffboardingAccessRevocationId,
	type HumanResourcesOffboardingCaseId,
	type HumanResourcesOffboardingPayrollHandoffId,
	type HumanResourcesOffboardingTaskId,
	type HumanResourcesOnboardingAccessHandoffId,
	type HumanResourcesOnboardingCaseId,
	type HumanResourcesOnboardingEquipmentHandoffId,
	type HumanResourcesOnboardingOrientationId,
	type HumanResourcesOnboardingTaskId,
	type HumanResourcesPositionId,
	type HumanResourcesProbationAssessmentId,
	type HumanResourcesProbationReviewId,
	type HumanResourcesTerminationId,
	type HumanResourcesWorkCalendarId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesClearanceId,
	parseHumanResourcesEmploymentConfirmationId,
	parseHumanResourcesEmploymentMovementId,
	parseHumanResourcesExitInterviewId,
	parseHumanResourcesOffboardingAccessRevocationId,
	parseHumanResourcesOffboardingCaseId,
	parseHumanResourcesOffboardingPayrollHandoffId,
	parseHumanResourcesOffboardingTaskId,
	parseHumanResourcesOnboardingAccessHandoffId,
	parseHumanResourcesOnboardingCaseId,
	parseHumanResourcesOnboardingEquipmentHandoffId,
	parseHumanResourcesOnboardingOrientationId,
	parseHumanResourcesOnboardingTaskId,
	parseHumanResourcesProbationAssessmentId,
	parseHumanResourcesProbationReviewId,
	parseHumanResourcesTerminationId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import {
	ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
	ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
	ONBOARDING_TASK_CODE_ORIENTATION,
} from "../../lifecycle/onboarding-checklist";
import type {
	HumanResourcesOrganizationDimensions,
	MutationPorts,
} from "../../ports";
import { assertTransferAssignmentRanges } from "../../shared/assignment-guards";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	assertActivePosition,
	conflict,
	invalidInput,
	invalidState,
	notFound,
} from "../../shared/domain-guards";
import { previousIsoDate } from "../../shared/effective-dates";
import { assertValidDateRange } from "../../shared/employment-status";
import { fingerprintTransfer } from "../../shared/fingerprint";
import {
	assertClearanceStatusTransition,
	assertConfirmationEffectiveOn,
	assertEmploymentActiveForOnboarding,
	assertEmploymentForOffboarding,
	assertLatestProbationPassed,
	assertLifecycleTaskStatusTransition,
	assertOffboardingAccessRevocationStatusTransition,
	assertOffboardingCaseInProgress,
	assertOffboardingPayrollHandoffStatusTransition,
	assertOffboardingReadyToComplete,
	assertOnboardingAccessHandoffStatusTransition,
	assertOnboardingCaseInProgress,
	assertOnboardingEquipmentHandoffStatusTransition,
	assertOnboardingOrientationStatusTransition,
	assertOnboardingReadyToComplete,
	assertProbationAssessmentReviewedOn,
	assertProbationDateRange,
	assertProbationExtension,
	assertProbationOpen,
	assertProbationOutcomeRecordedOn,
	assertTerminationApprovable,
	assertTerminationEffectiveDate,
	assertTerminationFinalizable,
	assertTerminationStatusTransition,
} from "../../shared/lifecycle-guards";
import type {
	LifecycleTaskStatus,
	ProbationOutcome,
} from "../../shared/lifecycle-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import type {
	EmploymentConfirmationCreateRecord,
	HumanResourcesStore,
	IdempotentEmploymentConfirmationRecord,
	IdempotentEmploymentMovementRecord,
	IdempotentOffboardingCaseRecord,
	IdempotentOnboardingCaseRecord,
	IdempotentProbationReviewRecord,
	IdempotentTerminationRecord,
	OffboardingCaseCreateRecord,
	OnboardingCaseCreateRecord,
	ProbationReviewCreateRecord,
	TerminationApproveRecord,
	TerminationCreateRecord,
	TerminationFinalizeRecord,
} from "../../store";
import type {
	Clearance,
	Employment,
	EmploymentConfirmation,
	EmploymentMovement,
	ExitInterview,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
	OnboardingAccessHandoff,
	OnboardingCase,
	OnboardingEquipmentHandoff,
	OnboardingOrientation,
	OnboardingTask,
	ProbationAssessment,
	ProbationReview,
	Termination,
	WorkAssignment,
} from "../../types";
import type { CoreMemoryState } from "./core";
import { appendEmploymentHistoryToState } from "./core";
import type { OrganizationMemoryState } from "./organization";
import type { RecruitmentMemoryState } from "./recruitment";
import { idempotencyMapKey } from "./shared";

function cloneOnboardingCase(value: OnboardingCase): OnboardingCase {
	return {
		...value,
		startedAt: new Date(value.startedAt),
		completedAt: value.completedAt ? new Date(value.completedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOnboardingOrientation(
	value: OnboardingOrientation,
): OnboardingOrientation {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOnboardingEquipmentHandoff(
	value: OnboardingEquipmentHandoff,
): OnboardingEquipmentHandoff {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOnboardingAccessHandoff(
	value: OnboardingAccessHandoff,
): OnboardingAccessHandoff {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function completeOnboardingTaskByCode(
	state: LifecycleMemoryState,
	input: {
		organizationId: string;
		caseId: HumanResourcesOnboardingCaseId;
		code: string;
		actorUserId: string;
	},
): OnboardingTask | null {
	const task = Array.from(state.onboardingTasks.values()).find(
		(row) =>
			row.organizationId === input.organizationId &&
			row.caseId === input.caseId &&
			row.code === input.code,
	);
	if (task === undefined) {
		return null;
	}
	if (task.status === "completed" || task.status === "waived") {
		return task;
	}
	const now = new Date();
	const updated: OnboardingTask = {
		...task,
		status: "completed",
		completedAt: now,
		version: task.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.onboardingTasks.set(task.id, updated);
	return updated;
}

function cloneProbationReview(value: ProbationReview): ProbationReview {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneProbationAssessment(
	value: ProbationAssessment,
): ProbationAssessment {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function probationReviewEventBase(
	probation: ProbationReview,
	actorId: string,
	correlationId: string,
) {
	return {
		organizationId: probation.organizationId,
		entityType: "hr_probation_review",
		entityId: probation.id,
		actorId,
		correlationId,
		employmentId: probation.employmentId,
	};
}

function withOptionalEvidenceReference<T extends Record<string, unknown>>(
	payload: T,
	evidenceReference: string | null,
): T & { evidenceReference?: string } {
	if (evidenceReference === null) {
		return payload;
	}
	return { ...payload, evidenceReference };
}

function cloneEmploymentConfirmation(
	value: EmploymentConfirmation,
): EmploymentConfirmation {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneEmploymentMovement(
	value: EmploymentMovement,
): EmploymentMovement {
	return {
		...value,
		createdAt: value.createdAt,
		updatedAt: value.updatedAt,
	};
}

function cloneTermination(value: Termination): Termination {
	return {
		...value,
		approvedAt: value.approvedAt ? new Date(value.approvedAt) : null,
		finalizedAt: value.finalizedAt ? new Date(value.finalizedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOffboardingAccessRevocation(
	value: OffboardingAccessRevocation,
): OffboardingAccessRevocation {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOffboardingPayrollHandoff(
	value: OffboardingPayrollHandoff,
): OffboardingPayrollHandoff {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOffboardingCase(value: OffboardingCase): OffboardingCase {
	return {
		...value,
		startedAt: new Date(value.startedAt),
		completedAt: value.completedAt ? new Date(value.completedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

export interface LifecycleMemoryState {
	clearances: Map<HumanResourcesClearanceId, Clearance>;
	confirmationIdempotencyByKey: Map<
		string,
		IdempotentEmploymentConfirmationRecord
	>;
	employmentConfirmations: Map<
		HumanResourcesEmploymentConfirmationId,
		EmploymentConfirmation
	>;
	employmentMovements: Map<
		HumanResourcesEmploymentMovementId,
		EmploymentMovement
	>;
	exitInterviews: Map<HumanResourcesExitInterviewId, ExitInterview>;
	offboardingAccessRevocations: Map<
		HumanResourcesOffboardingAccessRevocationId,
		OffboardingAccessRevocation
	>;
	offboardingCases: Map<HumanResourcesOffboardingCaseId, OffboardingCase>;
	offboardingIdempotencyByKey: Map<string, IdempotentOffboardingCaseRecord>;
	offboardingPayrollHandoffs: Map<
		HumanResourcesOffboardingPayrollHandoffId,
		OffboardingPayrollHandoff
	>;
	offboardingTasks: Map<HumanResourcesOffboardingTaskId, OffboardingTask>;
	onboardingAccessHandoffs: Map<
		HumanResourcesOnboardingAccessHandoffId,
		OnboardingAccessHandoff
	>;
	onboardingCases: Map<HumanResourcesOnboardingCaseId, OnboardingCase>;
	onboardingEquipmentHandoffs: Map<
		HumanResourcesOnboardingEquipmentHandoffId,
		OnboardingEquipmentHandoff
	>;
	onboardingIdempotencyByKey: Map<string, IdempotentOnboardingCaseRecord>;
	onboardingOrientations: Map<
		HumanResourcesOnboardingOrientationId,
		OnboardingOrientation
	>;
	onboardingTasks: Map<HumanResourcesOnboardingTaskId, OnboardingTask>;
	probationAssessments: Map<
		HumanResourcesProbationAssessmentId,
		ProbationAssessment
	>;
	probationIdempotencyByKey: Map<string, IdempotentProbationReviewRecord>;
	probationReviews: Map<HumanResourcesProbationReviewId, ProbationReview>;
	terminationIdempotencyByKey: Map<string, IdempotentTerminationRecord>;
	terminations: Map<HumanResourcesTerminationId, Termination>;
	transferIdempotencyByKey: Map<string, IdempotentEmploymentMovementRecord>;
}

export interface LifecycleDeps {
	core: CoreMemoryState;
	org: OrganizationMemoryState;
	recruitment: RecruitmentMemoryState;
}

export type MemoryLifecycleMethods = Pick<
	HumanResourcesStore,
	| "getOnboardingCase"
	| "findOnboardingByStartIdempotencyKey"
	| "startOnboarding"
	| "completeOnboardingTask"
	| "completeOnboarding"
	| "listOnboardingTasks"
	| "getOnboardingTask"
	| "getOnboardingOrientationByCase"
	| "getOnboardingEquipmentHandoffByCase"
	| "getOnboardingAccessHandoffByCase"
	| "recordOnboardingOrientation"
	| "recordOnboardingEquipmentHandoff"
	| "recordOnboardingAccessHandoff"
	| "getProbationReview"
	| "listProbationReviewsByEmployment"
	| "listProbationAssessments"
	| "findProbationByOpenIdempotencyKey"
	| "openProbation"
	| "extendProbation"
	| "recordProbationAssessment"
	| "recordProbationOutcome"
	| "getEmploymentConfirmation"
	| "findConfirmationByIdempotencyKey"
	| "confirmEmployment"
	| "findTransferByIdempotencyKey"
	| "transferAssignment"
	| "getTermination"
	| "findTerminationByIdempotencyKey"
	| "proposeTermination"
	| "approveTermination"
	| "finalizeTermination"
	| "getOffboardingCase"
	| "findOffboardingByStartIdempotencyKey"
	| "startOffboarding"
	| "completeOffboardingTask"
	| "recordExitInterview"
	| "recordClearance"
	| "completeOffboarding"
	| "listOffboardingTasks"
	| "getClearanceByOffboardingCase"
	| "getOffboardingAccessRevocationByCase"
	| "getOffboardingPayrollHandoffByCase"
	| "recordOffboardingAccessRevocation"
	| "recordOffboardingPayrollHandoff"
>;

export type LifecycleMemoryHost = Pick<
	HumanResourcesStore,
	| "getEmploymentById"
	| "getPositionById"
	| "findOpenAssignmentByEmployment"
	| "listAssignmentsByEmployment"
>;

export function createLifecycleMemoryState(): LifecycleMemoryState {
	return {
		onboardingCases: new Map(),
		onboardingTasks: new Map(),
		onboardingOrientations: new Map(),
		onboardingEquipmentHandoffs: new Map(),
		onboardingAccessHandoffs: new Map(),
		onboardingIdempotencyByKey: new Map(),
		probationReviews: new Map(),
		probationAssessments: new Map(),
		probationIdempotencyByKey: new Map(),
		employmentConfirmations: new Map(),
		confirmationIdempotencyByKey: new Map(),
		employmentMovements: new Map(),
		transferIdempotencyByKey: new Map(),
		terminations: new Map(),
		terminationIdempotencyByKey: new Map(),
		offboardingCases: new Map(),
		offboardingTasks: new Map(),
		offboardingAccessRevocations: new Map(),
		offboardingPayrollHandoffs: new Map(),
		exitInterviews: new Map(),
		clearances: new Map(),
		offboardingIdempotencyByKey: new Map(),
	};
}

export function resetLifecycleMemoryState(state: LifecycleMemoryState): void {
	state.onboardingCases.clear();
	state.onboardingTasks.clear();
	state.onboardingOrientations.clear();
	state.onboardingEquipmentHandoffs.clear();
	state.onboardingAccessHandoffs.clear();
	state.onboardingIdempotencyByKey.clear();
	state.probationReviews.clear();
	state.probationAssessments.clear();
	state.probationIdempotencyByKey.clear();
	state.employmentConfirmations.clear();
	state.confirmationIdempotencyByKey.clear();
	state.employmentMovements.clear();
	state.transferIdempotencyByKey.clear();
	state.terminations.clear();
	state.terminationIdempotencyByKey.clear();
	state.offboardingCases.clear();
	state.offboardingTasks.clear();
	state.offboardingAccessRevocations.clear();
	state.offboardingPayrollHandoffs.clear();
	state.exitInterviews.clear();
	state.clearances.clear();
	state.offboardingIdempotencyByKey.clear();
}

export function createMemoryLifecycleMethods(
	state: LifecycleMemoryState,
	deps: LifecycleDeps,
): MemoryLifecycleMethods &
	ThisType<LifecycleMemoryHost & MemoryLifecycleMethods> {
	return {
		async getOnboardingCase(input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
		}): Promise<Result<OnboardingCase | null>> {
			const row = state.onboardingCases.get(input.onboardingCaseId);
			if (!row || row.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok(cloneOnboardingCase(row));
		},

		async findOnboardingByStartIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentOnboardingCaseRecord | null>> {
			const record = state.onboardingIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				onboardingCase: cloneOnboardingCase(record.onboardingCase),
				startRequestFingerprint: record.startRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async startOnboarding(
			record: OnboardingCaseCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const existingByKey = await this.findOnboardingByStartIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.startRequestFingerprint !==
					record.startRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(cloneOnboardingCase(existingByKey.data.onboardingCase));
			}

			const employment = deps.core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeCheck = assertEmploymentActiveForOnboarding(
				employment.status,
			);
			if (!activeCheck.ok) {
				return activeCheck;
			}

			if (record.sourceOfferId !== null) {
				const offer = deps.recruitment.offers.get(record.sourceOfferId);
				if (!offer || offer.organizationId !== record.organizationId) {
					return notFound(
						"Offer not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
			}

			for (const existing of state.onboardingCases.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === record.employmentId &&
					existing.status === "in_progress"
				) {
					return conflict(
						"Employment already has an in-progress onboarding case",
					);
				}
			}

			const caseIdResult = parseHumanResourcesOnboardingCaseId(randomUUID());
			if (!caseIdResult.ok) {
				return caseIdResult;
			}

			const now = new Date();
			const onboardingCase: OnboardingCase = {
				id: caseIdResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: employment.employeeId,
				status: "in_progress",
				sourceOfferId: record.sourceOfferId,
				startedAt: now,
				completedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const seededTasks: OnboardingTask[] = [];
			for (const seed of record.tasks) {
				const taskIdResult = parseHumanResourcesOnboardingTaskId(randomUUID());
				if (!taskIdResult.ok) {
					return taskIdResult;
				}
				seededTasks.push({
					id: taskIdResult.data,
					organizationId: record.organizationId,
					caseId: onboardingCase.id,
					code: seed.code.trim(),
					title: seed.title.trim(),
					mandatory: seed.mandatory,
					status: "pending",
					completedAt: null,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
					createdAt: now,
					updatedAt: now,
				});
			}

			const orientationIdResult = parseHumanResourcesOnboardingOrientationId(
				randomUUID(),
			);
			if (!orientationIdResult.ok) {
				return orientationIdResult;
			}
			const equipmentHandoffIdResult =
				parseHumanResourcesOnboardingEquipmentHandoffId(randomUUID());
			if (!equipmentHandoffIdResult.ok) {
				return equipmentHandoffIdResult;
			}
			const accessHandoffIdResult =
				parseHumanResourcesOnboardingAccessHandoffId(randomUUID());
			if (!accessHandoffIdResult.ok) {
				return accessHandoffIdResult;
			}

			const orientation: OnboardingOrientation = {
				id: orientationIdResult.data,
				organizationId: record.organizationId,
				onboardingCaseId: onboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				acknowledgedOn: null,
				notes: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			const equipmentHandoff: OnboardingEquipmentHandoff = {
				id: equipmentHandoffIdResult.data,
				organizationId: record.organizationId,
				onboardingCaseId: onboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				handedOverOn: null,
				summary: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			const accessHandoff: OnboardingAccessHandoff = {
				id: accessHandoffIdResult.data,
				organizationId: record.organizationId,
				onboardingCaseId: onboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				grantedOn: null,
				summary: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.onboardingCases.set(onboardingCase.id, onboardingCase);
			for (const task of seededTasks) {
				state.onboardingTasks.set(task.id, task);
			}
			state.onboardingOrientations.set(orientation.id, orientation);
			state.onboardingEquipmentHandoffs.set(
				equipmentHandoff.id,
				equipmentHandoff,
			);
			state.onboardingAccessHandoffs.set(accessHandoff.id, accessHandoff);
			const idemKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			state.onboardingIdempotencyByKey.set(idemKey, {
				onboardingCase: cloneOnboardingCase(onboardingCase),
				startRequestFingerprint: record.startRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: onboardingCase.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_case",
				entityId: onboardingCase.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingCases.delete(onboardingCase.id);
				for (const task of seededTasks) {
					state.onboardingTasks.delete(task.id);
				}
				state.onboardingOrientations.delete(orientation.id);
				state.onboardingEquipmentHandoffs.delete(equipmentHandoff.id);
				state.onboardingAccessHandoffs.delete(accessHandoff.id);
				state.onboardingIdempotencyByKey.delete(idemKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: onboardingCase.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
				payload: {
					organizationId: onboardingCase.organizationId,
					entityType: "hr_onboarding_case",
					entityId: onboardingCase.id,
					actorId: record.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.onboardingCases.delete(onboardingCase.id);
				for (const task of seededTasks) {
					state.onboardingTasks.delete(task.id);
				}
				state.onboardingOrientations.delete(orientation.id);
				state.onboardingEquipmentHandoffs.delete(equipmentHandoff.id);
				state.onboardingAccessHandoffs.delete(accessHandoff.id);
				state.onboardingIdempotencyByKey.delete(idemKey);
				return outbox;
			}

			return ok(cloneOnboardingCase(onboardingCase));
		},

		async completeOnboardingTask(
			input: {
				organizationId: string;
				taskId: HumanResourcesOnboardingTaskId;
				newStatus: LifecycleTaskStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const task = state.onboardingTasks.get(input.taskId);
			if (!task || task.organizationId !== input.organizationId) {
				return notFound("Onboarding task not found");
			}
			const onboardingCase = state.onboardingCases.get(task.caseId);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Onboarding case not found");
			}
			const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				task.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertLifecycleTaskStatusTransition(
				task.status,
				input.newStatus,
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previousTask = { ...task };
			const updatedTask: OnboardingTask = {
				...task,
				status: input.newStatus,
				completedAt: now,
				version: task.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.onboardingTasks.set(task.id, updatedTask);

			const audit = await ports.audit.record({
				organizationId: updatedTask.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_task",
				entityId: updatedTask.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingTasks.set(task.id, previousTask);
				return audit;
			}

			return ok(cloneOnboardingCase(onboardingCase));
		},

		async completeOnboarding(
			input: {
				organizationId: string;
				onboardingCaseId: HumanResourcesOnboardingCaseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const onboardingCase = state.onboardingCases.get(input.onboardingCaseId);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Onboarding case not found");
			}
			const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				onboardingCase.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const tasks = Array.from(state.onboardingTasks.values()).filter(
				(task) =>
					task.organizationId === input.organizationId &&
					task.caseId === onboardingCase.id,
			);
			const mandatoryTasksComplete = tasks.every(
				(task) =>
					!task.mandatory ||
					task.status === "completed" ||
					task.status === "waived",
			);
			const orientation =
				Array.from(state.onboardingOrientations.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.onboardingCaseId === onboardingCase.id,
				) ?? null;
			const equipmentHandoff =
				Array.from(state.onboardingEquipmentHandoffs.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.onboardingCaseId === onboardingCase.id,
				) ?? null;
			const accessHandoff =
				Array.from(state.onboardingAccessHandoffs.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.onboardingCaseId === onboardingCase.id,
				) ?? null;
			const ready = assertOnboardingReadyToComplete({
				mandatoryTasksComplete,
				orientationStatus: orientation?.status ?? null,
				equipmentHandoffStatus: equipmentHandoff?.status ?? null,
				accessHandoffStatus: accessHandoff?.status ?? null,
			});
			if (!ready.ok) {
				return ready;
			}

			const now = new Date();
			const previous = { ...onboardingCase };
			const updated: OnboardingCase = {
				...onboardingCase,
				status: "completed",
				completedAt: now,
				version: onboardingCase.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.onboardingCases.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_case",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingCases.set(updated.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_onboarding_case",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.onboardingCases.set(updated.id, previous);
				return outbox;
			}

			return ok(cloneOnboardingCase(updated));
		},

		async listOnboardingTasks(input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
		}): Promise<Result<OnboardingTask[]>> {
			const onboardingCase = state.onboardingCases.get(input.onboardingCaseId);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return await notFound("Onboarding case not found");
			}
			const tasks = Array.from(state.onboardingTasks.values())
				.filter(
					(task) =>
						task.organizationId === input.organizationId &&
						task.caseId === input.onboardingCaseId,
				)
				.map((task) => ({ ...task, completedAt: task.completedAt }));
			tasks.sort((a, b) => a.code.localeCompare(b.code));
			return await ok(tasks);
		},

		async getOnboardingTask(input: {
			organizationId: string;
			taskId: HumanResourcesOnboardingTaskId;
		}): Promise<Result<OnboardingTask | null>> {
			const task = state.onboardingTasks.get(input.taskId);
			if (!task || task.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...task, completedAt: task.completedAt });
		},

		async getOnboardingOrientationByCase(input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
		}): Promise<Result<OnboardingOrientation | null>> {
			const row = Array.from(state.onboardingOrientations.values()).find(
				(item) =>
					item.organizationId === input.organizationId &&
					item.onboardingCaseId === input.onboardingCaseId,
			);
			return await ok(
				row === undefined ? null : cloneOnboardingOrientation(row),
			);
		},

		async getOnboardingEquipmentHandoffByCase(input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
		}): Promise<Result<OnboardingEquipmentHandoff | null>> {
			const row = Array.from(state.onboardingEquipmentHandoffs.values()).find(
				(item) =>
					item.organizationId === input.organizationId &&
					item.onboardingCaseId === input.onboardingCaseId,
			);
			return await ok(
				row === undefined ? null : cloneOnboardingEquipmentHandoff(row),
			);
		},

		async getOnboardingAccessHandoffByCase(input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
		}): Promise<Result<OnboardingAccessHandoff | null>> {
			const row = Array.from(state.onboardingAccessHandoffs.values()).find(
				(item) =>
					item.organizationId === input.organizationId &&
					item.onboardingCaseId === input.onboardingCaseId,
			);
			return await ok(
				row === undefined ? null : cloneOnboardingAccessHandoff(row),
			);
		},

		async recordOnboardingOrientation(
			input: {
				organizationId: string;
				orientationId: HumanResourcesOnboardingOrientationId;
				acknowledgedOn: string;
				notes: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const orientation = state.onboardingOrientations.get(input.orientationId);
			if (!orientation || orientation.organizationId !== input.organizationId) {
				return notFound("Onboarding orientation not found");
			}
			const onboardingCase = state.onboardingCases.get(
				orientation.onboardingCaseId,
			);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Onboarding case not found");
			}
			const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				orientation.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOnboardingOrientationStatusTransition(
				orientation.status,
				"acknowledged",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = { ...orientation };
			const updated: OnboardingOrientation = {
				...orientation,
				status: "acknowledged",
				acknowledgedOn: input.acknowledgedOn,
				notes: input.notes,
				version: orientation.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.onboardingOrientations.set(updated.id, updated);
			completeOnboardingTaskByCode(state, {
				organizationId: input.organizationId,
				caseId: onboardingCase.id,
				code: ONBOARDING_TASK_CODE_ORIENTATION,
				actorUserId: input.actorUserId,
			});

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_orientation",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingOrientations.set(updated.id, previous);
				return audit;
			}

			return ok(cloneOnboardingCase(onboardingCase));
		},

		async recordOnboardingEquipmentHandoff(
			input: {
				organizationId: string;
				equipmentHandoffId: HumanResourcesOnboardingEquipmentHandoffId;
				handedOverOn: string;
				summary: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const equipmentHandoff = state.onboardingEquipmentHandoffs.get(
				input.equipmentHandoffId,
			);
			if (
				!equipmentHandoff ||
				equipmentHandoff.organizationId !== input.organizationId
			) {
				return notFound("Onboarding equipment handoff not found");
			}
			const onboardingCase = state.onboardingCases.get(
				equipmentHandoff.onboardingCaseId,
			);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Onboarding case not found");
			}
			const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				equipmentHandoff.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOnboardingEquipmentHandoffStatusTransition(
				equipmentHandoff.status,
				"handed_over",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = { ...equipmentHandoff };
			const updated: OnboardingEquipmentHandoff = {
				...equipmentHandoff,
				status: "handed_over",
				handedOverOn: input.handedOverOn,
				summary: input.summary,
				version: equipmentHandoff.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.onboardingEquipmentHandoffs.set(updated.id, updated);
			completeOnboardingTaskByCode(state, {
				organizationId: input.organizationId,
				caseId: onboardingCase.id,
				code: ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
				actorUserId: input.actorUserId,
			});

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_equipment_handoff",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingEquipmentHandoffs.set(updated.id, previous);
				return audit;
			}

			return ok(cloneOnboardingCase(onboardingCase));
		},

		async recordOnboardingAccessHandoff(
			input: {
				organizationId: string;
				accessHandoffId: HumanResourcesOnboardingAccessHandoffId;
				grantedOn: string;
				summary: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OnboardingCase>> {
			const accessHandoff = state.onboardingAccessHandoffs.get(
				input.accessHandoffId,
			);
			if (
				!accessHandoff ||
				accessHandoff.organizationId !== input.organizationId
			) {
				return notFound("Onboarding access handoff not found");
			}
			const onboardingCase = state.onboardingCases.get(
				accessHandoff.onboardingCaseId,
			);
			if (
				!onboardingCase ||
				onboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Onboarding case not found");
			}
			const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				accessHandoff.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOnboardingAccessHandoffStatusTransition(
				accessHandoff.status,
				"granted",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = { ...accessHandoff };
			const updated: OnboardingAccessHandoff = {
				...accessHandoff,
				status: "granted",
				grantedOn: input.grantedOn,
				summary: input.summary,
				version: accessHandoff.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.onboardingAccessHandoffs.set(updated.id, updated);
			completeOnboardingTaskByCode(state, {
				organizationId: input.organizationId,
				caseId: onboardingCase.id,
				code: ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
				actorUserId: input.actorUserId,
			});

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_onboarding_access_handoff",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.onboardingAccessHandoffs.set(updated.id, previous);
				return audit;
			}

			return ok(cloneOnboardingCase(onboardingCase));
		},

		// --- Lifecycle: probation ---

		async getProbationReview(input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
		}): Promise<Result<ProbationReview | null>> {
			const row = state.probationReviews.get(input.probationReviewId);
			if (!row || row.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok(cloneProbationReview(row));
		},

		async listProbationReviewsByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<ProbationReview[]>> {
			const rows = Array.from(state.probationReviews.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.employmentId === input.employmentId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map(cloneProbationReview);
			return await ok(rows);
		},

		async listProbationAssessments(input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
		}): Promise<Result<ProbationAssessment[]>> {
			const probation = state.probationReviews.get(input.probationReviewId);
			if (!probation || probation.organizationId !== input.organizationId) {
				return await notFound("Probation review not found");
			}
			const rows = Array.from(state.probationAssessments.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.probationReviewId === input.probationReviewId,
				)
				.sort((a, b) => a.reviewedOn.localeCompare(b.reviewedOn))
				.map(cloneProbationAssessment);
			return await ok(rows);
		},

		async findProbationByOpenIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentProbationReviewRecord | null>> {
			const record = state.probationIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				probationReview: cloneProbationReview(record.probationReview),
				openRequestFingerprint: record.openRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async openProbation(
			record: ProbationReviewCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ProbationReview>> {
			const existingByKey = await this.findProbationByOpenIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.openRequestFingerprint !==
					record.openRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(cloneProbationReview(existingByKey.data.probationReview));
			}

			const employment = deps.core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (employment.status !== "active") {
				return invalidState("Employment must be active to open probation");
			}
			const dateCheck = assertProbationDateRange({
				startsOn: record.startsOn,
				endsOn: record.endsOn,
			});
			if (!dateCheck.ok) {
				return dateCheck;
			}

			for (const existing of state.probationReviews.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === record.employmentId &&
					existing.status === "open"
				) {
					return conflict("Employment already has an open probation review");
				}
			}

			const idResult = parseHumanResourcesProbationReviewId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const probation: ProbationReview = {
				id: idResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: employment.employeeId,
				status: "open",
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				outcome: null,
				outcomeActorId: null,
				outcomeRecordedOn: null,
				lastExtensionReason: null,
				lastExtensionEvidenceReference: null,
				outcomeReason: null,
				outcomeEvidenceReference: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.probationReviews.set(probation.id, probation);
			const idemKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			state.probationIdempotencyByKey.set(idemKey, {
				probationReview: cloneProbationReview(probation),
				openRequestFingerprint: record.openRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: probation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_probation_review",
				entityId: probation.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.probationReviews.delete(probation.id);
				state.probationIdempotencyByKey.delete(idemKey);
				return audit;
			}

			return ok(cloneProbationReview(probation));
		},

		async extendProbation(
			input: {
				organizationId: string;
				probationReviewId: HumanResourcesProbationReviewId;
				newEndsOn: string;
				reason: string;
				evidenceReference: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ProbationReview>> {
			const probation = state.probationReviews.get(input.probationReviewId);
			if (!probation || probation.organizationId !== input.organizationId) {
				return notFound("Probation review not found");
			}
			const openCheck = assertProbationOpen(probation.status);
			if (!openCheck.ok) {
				return openCheck;
			}
			const versionCheck = assertExpectedVersion(
				probation.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const extension = assertProbationExtension({
				currentEndsOn: probation.endsOn,
				newEndsOn: input.newEndsOn,
			});
			if (!extension.ok) {
				return extension;
			}

			const now = new Date();
			const previous = { ...probation };
			const updated: ProbationReview = {
				...probation,
				endsOn: input.newEndsOn,
				lastExtensionReason: input.reason,
				lastExtensionEvidenceReference: input.evidenceReference,
				version: probation.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.probationReviews.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_probation_review",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.probationReviews.set(updated.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
				payload: withOptionalEvidenceReference(
					{
						...probationReviewEventBase(
							updated,
							input.actorUserId,
							meta.correlationId,
						),
						newEndsOn: input.newEndsOn,
						reason: input.reason,
					},
					input.evidenceReference,
				),
			});
			if (!outbox.ok) {
				state.probationReviews.set(updated.id, previous);
				return outbox;
			}

			return ok(cloneProbationReview(updated));
		},

		async recordProbationAssessment(
			input: {
				organizationId: string;
				probationReviewId: HumanResourcesProbationReviewId;
				reviewedOn: string;
				reason: string;
				evidenceReference: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ProbationAssessment>> {
			const probation = state.probationReviews.get(input.probationReviewId);
			if (!probation || probation.organizationId !== input.organizationId) {
				return notFound("Probation review not found");
			}
			const openCheck = assertProbationOpen(probation.status);
			if (!openCheck.ok) {
				return openCheck;
			}
			const versionCheck = assertExpectedVersion(
				probation.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const reviewedOnCheck = assertProbationAssessmentReviewedOn({
				startsOn: probation.startsOn,
				endsOn: probation.endsOn,
				reviewedOn: input.reviewedOn,
			});
			if (!reviewedOnCheck.ok) {
				return reviewedOnCheck;
			}

			const idResult = parseHumanResourcesProbationAssessmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const previousProbation = { ...probation };
			const updatedProbation: ProbationReview = {
				...probation,
				version: probation.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const assessment: ProbationAssessment = {
				id: idResult.data,
				organizationId: input.organizationId,
				probationReviewId: input.probationReviewId,
				employmentId: probation.employmentId,
				employeeId: probation.employeeId,
				reviewedOn: input.reviewedOn,
				reason: input.reason,
				evidenceReference: input.evidenceReference,
				actorUserId: input.actorUserId,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			state.probationReviews.set(updatedProbation.id, updatedProbation);
			state.probationAssessments.set(assessment.id, assessment);

			const audit = await ports.audit.record({
				organizationId: assessment.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_probation_assessment",
				entityId: assessment.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.probationReviews.set(updatedProbation.id, previousProbation);
				state.probationAssessments.delete(assessment.id);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: assessment.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
				payload: withOptionalEvidenceReference(
					{
						...probationReviewEventBase(
							updatedProbation,
							input.actorUserId,
							meta.correlationId,
						),
						probationReviewId: assessment.probationReviewId,
						reviewedOn: input.reviewedOn,
						reason: input.reason,
					},
					input.evidenceReference,
				),
			});
			if (!outbox.ok) {
				state.probationReviews.set(updatedProbation.id, previousProbation);
				state.probationAssessments.delete(assessment.id);
				return outbox;
			}

			return ok(cloneProbationAssessment(assessment));
		},

		async recordProbationOutcome(
			input: {
				organizationId: string;
				probationReviewId: HumanResourcesProbationReviewId;
				outcome: ProbationOutcome;
				concludedOn: string;
				reason: string;
				evidenceReference: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ProbationReview>> {
			const probation = state.probationReviews.get(input.probationReviewId);
			if (!probation || probation.organizationId !== input.organizationId) {
				return notFound("Probation review not found");
			}
			const openCheck = assertProbationOpen(probation.status);
			if (!openCheck.ok) {
				return openCheck;
			}
			const versionCheck = assertExpectedVersion(
				probation.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const outcomeDateCheck = assertProbationOutcomeRecordedOn({
				startsOn: probation.startsOn,
				endsOn: probation.endsOn,
				outcomeRecordedOn: input.concludedOn,
			});
			if (!outcomeDateCheck.ok) {
				return outcomeDateCheck;
			}

			const now = new Date();
			const previous = { ...probation };
			const updated: ProbationReview = {
				...probation,
				status: "closed",
				outcome: input.outcome,
				outcomeActorId: input.actorUserId,
				outcomeRecordedOn: input.concludedOn,
				outcomeReason: input.reason,
				outcomeEvidenceReference: input.evidenceReference,
				version: probation.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.probationReviews.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_probation_review",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.probationReviews.set(updated.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
				payload: withOptionalEvidenceReference(
					{
						...probationReviewEventBase(
							updated,
							input.actorUserId,
							meta.correlationId,
						),
						outcome: input.outcome,
						outcomeRecordedOn: input.concludedOn,
						reason: input.reason,
					},
					input.evidenceReference,
				),
			});
			if (!outbox.ok) {
				state.probationReviews.set(updated.id, previous);
				return outbox;
			}

			return ok(cloneProbationReview(updated));
		},

		// --- Lifecycle: confirmation ---

		async getEmploymentConfirmation(input: {
			organizationId: string;
			employmentConfirmationId: HumanResourcesEmploymentConfirmationId;
		}): Promise<Result<EmploymentConfirmation | null>> {
			const row = state.employmentConfirmations.get(
				input.employmentConfirmationId,
			);
			if (!row || row.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok(cloneEmploymentConfirmation(row));
		},

		async findConfirmationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmploymentConfirmationRecord | null>> {
			const record = state.confirmationIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				employmentConfirmation: cloneEmploymentConfirmation(
					record.employmentConfirmation,
				),
				confirmRequestFingerprint: record.confirmRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async confirmEmployment(
			record: EmploymentConfirmationCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentConfirmation>> {
			const existingByKey = await this.findConfirmationByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.confirmRequestFingerprint !==
					record.confirmRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(
					cloneEmploymentConfirmation(
						existingByKey.data.employmentConfirmation,
					),
				);
			}

			const employment = deps.core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			for (const existing of state.employmentConfirmations.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === record.employmentId
				) {
					return conflict("Employment already has a confirmation");
				}
			}

			const probationRows = Array.from(state.probationReviews.values())
				.filter(
					(row) =>
						row.organizationId === record.organizationId &&
						row.employmentId === record.employmentId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const hasAnyProbation = probationRows.length > 0;
			const latestClosed =
				probationRows.find((row) => row.status === "closed") ?? null;
			const probationGate = assertLatestProbationPassed({
				hasAnyProbation,
				latestClosedProbation: latestClosed,
			});
			if (!probationGate.ok) {
				return probationGate;
			}
			const confirmationDateCheck = assertConfirmationEffectiveOn({
				confirmedOn: record.confirmedOn,
				latestPassedOutcomeRecordedOn:
					latestClosed?.outcome === "passed"
						? latestClosed.outcomeRecordedOn
						: null,
			});
			if (!confirmationDateCheck.ok) {
				return confirmationDateCheck;
			}

			const idResult = parseHumanResourcesEmploymentConfirmationId(
				randomUUID(),
			);
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const confirmation: EmploymentConfirmation = {
				id: idResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: employment.employeeId,
				confirmedOn: record.confirmedOn,
				confirmedBy: record.createdBy,
				evidenceNote: record.evidenceNote,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.employmentConfirmations.set(confirmation.id, confirmation);
			const idemKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			state.confirmationIdempotencyByKey.set(idemKey, {
				employmentConfirmation: cloneEmploymentConfirmation(confirmation),
				confirmRequestFingerprint: record.confirmRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: confirmation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employment_confirmation",
				entityId: confirmation.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.employmentConfirmations.delete(confirmation.id);
				state.confirmationIdempotencyByKey.delete(idemKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: confirmation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
				payload: {
					organizationId: confirmation.organizationId,
					entityType: "hr_employee",
					entityId: confirmation.employeeId,
					actorId: record.createdBy,
					correlationId: meta.correlationId,
					confirmedOn: record.confirmedOn,
					evidenceNote: record.evidenceNote,
				},
			});
			if (!outbox.ok) {
				state.employmentConfirmations.delete(confirmation.id);
				state.confirmationIdempotencyByKey.delete(idemKey);
				return outbox;
			}

			return ok(cloneEmploymentConfirmation(confirmation));
		},

		// --- Lifecycle: transfer ---

		async findTransferByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmploymentMovementRecord | null>> {
			const record = state.transferIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				employmentMovement: cloneEmploymentMovement(record.employmentMovement),
				transferRequestFingerprint: record.transferRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async transferAssignment(
			input: {
				organizationId: string;
				employmentId: HumanResourcesEmploymentId;
				toPositionId: HumanResourcesPositionId;
				organizationDimensions: HumanResourcesOrganizationDimensions;
				managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
				workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
				effectiveOn: string;
				reason: string;
				idempotencyKey: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentMovement>> {
			const fingerprint = fingerprintTransfer({
				employmentId: input.employmentId,
				toPositionId: input.toPositionId,
				organizationDimensionIds: Object.values(
					input.organizationDimensions,
				).map((dimension) => dimension.id),
				effectiveOn: input.effectiveOn,
				reason: input.reason.trim(),
			});

			const existingByKey = await this.findTransferByIdempotencyKey({
				organizationId: input.organizationId,
				idempotencyKey: input.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (existingByKey.data.transferRequestFingerprint !== fingerprint) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(
					cloneEmploymentMovement(existingByKey.data.employmentMovement),
				);
			}

			const openAssignment = await this.findOpenAssignmentByEmployment({
				organizationId: input.organizationId,
				employmentId: input.employmentId,
			});
			if (!openAssignment.ok) {
				return openAssignment;
			}
			if (openAssignment.data === null) {
				return notFound("Open assignment not found");
			}

			const employment = deps.core.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const toPosition = deps.org.positions.get(input.toPositionId);
			if (!toPosition || toPosition.organizationId !== input.organizationId) {
				return notFound(
					"Position not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeCheck = assertActivePosition(toPosition.status);
			if (!activeCheck.ok) {
				return activeCheck;
			}
			if (toPosition.id === openAssignment.data.positionId) {
				return conflict("Target position must differ from current position");
			}

			const dateCheck = assertValidDateRange(
				openAssignment.data.startsOn,
				input.effectiveOn,
			);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const siblings = await this.listAssignmentsByEmployment({
				organizationId: input.organizationId,
				employmentId: input.employmentId,
			});
			if (!siblings.ok) {
				return siblings;
			}

			const transferRanges = assertTransferAssignmentRanges({
				openAssignment: openAssignment.data,
				effectiveOn: input.effectiveOn,
				employmentStartsOn: employment.startsOn,
				employmentEndsOn: employment.endsOn,
				siblings: siblings.data,
			});
			if (!transferRanges.ok) {
				return transferRanges;
			}

			const newAssignmentIdResult = parseHumanResourcesAssignmentId(
				randomUUID(),
			);
			if (!newAssignmentIdResult.ok) {
				return newAssignmentIdResult;
			}
			const movementIdResult = parseHumanResourcesEmploymentMovementId(
				randomUUID(),
			);
			if (!movementIdResult.ok) {
				return movementIdResult;
			}

			const now = new Date();
			const nowIso = now.toISOString();
			const previousAssignment = { ...openAssignment.data };
			const endedAssignment: WorkAssignment = {
				...openAssignment.data,
				endsOn: previousIsoDate(input.effectiveOn),
				successorAssignmentId: newAssignmentIdResult.data,
				version: openAssignment.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const newAssignment: WorkAssignment = {
				id: newAssignmentIdResult.data,
				organizationId: input.organizationId,
				employmentId: input.employmentId,
				employeeId: employment.employeeId,
				positionId: input.toPositionId,
				organizationDimensions: structuredClone(input.organizationDimensions),
				predecessorAssignmentId: endedAssignment.id,
				successorAssignmentId: null,
				transferMovementId: movementIdResult.data,
				managerEmployeeIdSnapshot: input.managerEmployeeIdSnapshot,
				workCalendarIdSnapshot: input.workCalendarIdSnapshot,
				startsOn: input.effectiveOn,
				endsOn: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			endedAssignment.transferMovementId = movementIdResult.data;
			const movement: EmploymentMovement = {
				id: movementIdResult.data,
				organizationId: input.organizationId,
				employmentId: input.employmentId,
				employeeId: employment.employeeId,
				movementKind: "transfer",
				fromAssignmentId: endedAssignment.id,
				toAssignmentId: newAssignment.id,
				fromPositionId: endedAssignment.positionId,
				toPositionId: input.toPositionId,
				effectiveOn: input.effectiveOn,
				reason: input.reason.trim(),
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: nowIso,
				updatedAt: nowIso,
			};

			deps.core.assignments.set(endedAssignment.id, endedAssignment);
			deps.core.assignments.set(newAssignment.id, newAssignment);
			state.employmentMovements.set(movement.id, movement);
			const idemKey = idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			state.transferIdempotencyByKey.set(idemKey, {
				employmentMovement: cloneEmploymentMovement(movement),
				transferRequestFingerprint: fingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: movement.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_movement",
				entityId: movement.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				deps.core.assignments.set(endedAssignment.id, previousAssignment);
				deps.core.assignments.delete(newAssignment.id);
				state.employmentMovements.delete(movement.id);
				state.transferIdempotencyByKey.delete(idemKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: movement.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
				payload: {
					organizationId: movement.organizationId,
					entityType: "hr_employee",
					entityId: employment.employeeId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
					effectiveOn: input.effectiveOn,
				},
			});
			if (!outbox.ok) {
				deps.core.assignments.set(endedAssignment.id, previousAssignment);
				deps.core.assignments.delete(newAssignment.id);
				state.employmentMovements.delete(movement.id);
				state.transferIdempotencyByKey.delete(idemKey);
				return outbox;
			}

			return ok(cloneEmploymentMovement(movement));
		},

		// --- Lifecycle: termination ---

		async getTermination(input: {
			organizationId: string;
			terminationId: HumanResourcesTerminationId;
		}): Promise<Result<Termination | null>> {
			const row = state.terminations.get(input.terminationId);
			if (!row || row.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok(cloneTermination(row));
		},

		async findTerminationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentTerminationRecord | null>> {
			const record = state.terminationIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				termination: cloneTermination(record.termination),
				terminationRequestFingerprint: record.terminationRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async proposeTermination(
			record: TerminationCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Termination>> {
			const existingByKey = await this.findTerminationByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.terminationRequestFingerprint !==
					record.terminationRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(cloneTermination(existingByKey.data.termination));
			}

			const employment = deps.core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const effectiveCheck = assertTerminationEffectiveDate({
				effectiveOn: record.effectiveOn,
				employmentStartsOn: employment.startsOn,
			});
			if (!effectiveCheck.ok) {
				return effectiveCheck;
			}

			for (const existing of state.terminations.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === record.employmentId
				) {
					if (existing.status === "draft") {
						return conflict("Employment already has an open termination draft");
					}
					if (existing.status === "finalized") {
						return conflict("Employment already has a finalized termination");
					}
				}
			}

			const idResult = parseHumanResourcesTerminationId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const termination: Termination = {
				id: idResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: employment.employeeId,
				status: "draft",
				reasonCode: record.reasonCode,
				reasonDetail: record.reasonDetail,
				effectiveOn: record.effectiveOn,
				approvedAt: null,
				approvedBy: null,
				rehireEligible: record.rehireEligible,
				finalizedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.terminations.set(termination.id, termination);
			const idemKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			state.terminationIdempotencyByKey.set(idemKey, {
				termination: cloneTermination(termination),
				terminationRequestFingerprint: record.terminationRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: termination.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_termination",
				entityId: termination.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.terminations.delete(termination.id);
				state.terminationIdempotencyByKey.delete(idemKey);
				return audit;
			}

			return ok(cloneTermination(termination));
		},

		async approveTermination(
			record: TerminationApproveRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Termination>> {
			const termination = state.terminations.get(record.terminationId);
			if (
				!termination ||
				termination.organizationId !== record.organizationId
			) {
				return notFound("Termination not found");
			}
			const approvable = assertTerminationApprovable({
				status: termination.status,
				approvedAt: termination.approvedAt,
			});
			if (!approvable.ok) {
				return approvable;
			}
			const versionCheck = assertExpectedVersion(
				termination.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const previous = cloneTermination(termination);
			const updated: Termination = {
				...termination,
				approvedAt: now,
				approvedBy: record.actorUserId,
				version: termination.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			};
			state.terminations.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_termination",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.terminations.set(updated.id, previous);
				return audit;
			}

			return ok(cloneTermination(updated));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async finalizeTermination(
			record: TerminationFinalizeRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Termination>> {
			const termination = state.terminations.get(record.terminationId);
			if (
				!termination ||
				termination.organizationId !== record.organizationId
			) {
				return notFound("Termination not found");
			}
			const finalizable = assertTerminationFinalizable({
				status: termination.status,
				approvedAt: termination.approvedAt,
				approvedBy: termination.approvedBy,
			});
			if (!finalizable.ok) {
				return finalizable;
			}
			const versionCheck = assertExpectedVersion(
				termination.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const employment = deps.core.employments.get(termination.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const effectiveCheck = assertTerminationEffectiveDate({
				effectiveOn: termination.effectiveOn,
				employmentStartsOn: employment.startsOn,
			});
			if (!effectiveCheck.ok) {
				return effectiveCheck;
			}

			for (const existing of state.terminations.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === termination.employmentId &&
					existing.status === "finalized" &&
					existing.id !== termination.id
				) {
					return conflict("Employment already has a finalized termination");
				}
			}

			const transition = assertTerminationStatusTransition(
				termination.status,
				"finalized",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previousTermination = cloneTermination(termination);
			const updatedTermination: Termination = {
				...termination,
				status: "finalized",
				finalizedAt: now,
				version: termination.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			};
			const previousEmployment = { ...employment };
			const updatedEmployment: Employment = {
				...employment,
				status: "terminated",
				endsOn: termination.effectiveOn,
				version: employment.version + 1,
				updatedBy: record.actorUserId,
				updatedAt: now,
			};

			state.terminations.set(updatedTermination.id, updatedTermination);
			deps.core.employments.set(employment.id, updatedEmployment);
			appendEmploymentHistoryToState(deps.core, {
				organizationId: updatedEmployment.organizationId,
				employmentId: updatedEmployment.id,
				employeeId: updatedEmployment.employeeId,
				fromStatus: employment.status,
				toStatus: "terminated",
				startsOnSnapshot: updatedEmployment.startsOn,
				endsOnSnapshot: updatedEmployment.endsOn,
				effectiveOn: termination.effectiveOn,
				changeKind: "lifecycle",
				reason: termination.reasonCode,
				evidenceReference: termination.reasonDetail,
				correlationId: meta.correlationId,
				actorUserId: record.actorUserId,
			});

			const audit = await ports.audit.record({
				organizationId: updatedTermination.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_termination",
				entityId: updatedTermination.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.terminations.set(updatedTermination.id, previousTermination);
				deps.core.employments.set(employment.id, previousEmployment);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updatedTermination.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
				payload: {
					organizationId: updatedTermination.organizationId,
					entityType: "hr_employee",
					entityId: employment.employeeId,
					actorId: record.actorUserId,
					correlationId: meta.correlationId,
					effectiveOn: termination.effectiveOn,
				},
			});
			if (!outbox.ok) {
				state.terminations.set(updatedTermination.id, previousTermination);
				deps.core.employments.set(employment.id, previousEmployment);
				return outbox;
			}

			return ok(cloneTermination(updatedTermination));
		},

		// --- Lifecycle: offboarding ---

		async getOffboardingCase(input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
		}): Promise<Result<OffboardingCase | null>> {
			const row = state.offboardingCases.get(input.offboardingCaseId);
			if (!row || row.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok(cloneOffboardingCase(row));
		},

		async findOffboardingByStartIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentOffboardingCaseRecord | null>> {
			const record = state.offboardingIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				offboardingCase: cloneOffboardingCase(record.offboardingCase),
				startRequestFingerprint: record.startRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async startOffboarding(
			record: OffboardingCaseCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const existingByKey = await this.findOffboardingByStartIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.startRequestFingerprint !==
					record.startRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok(cloneOffboardingCase(existingByKey.data.offboardingCase));
			}

			const employment = deps.core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			let hasFinalizedTermination = false;
			if (record.terminationId === null) {
				hasFinalizedTermination = Array.from(state.terminations.values()).some(
					(row) =>
						row.organizationId === record.organizationId &&
						row.employmentId === record.employmentId &&
						row.status === "finalized",
				);
			} else {
				const termination = state.terminations.get(record.terminationId);
				if (
					!termination ||
					termination.organizationId !== record.organizationId ||
					termination.employmentId !== record.employmentId
				) {
					return notFound(
						"Termination not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				if (termination.status !== "finalized") {
					return invalidState("Linked termination must be finalized");
				}
				hasFinalizedTermination = true;
			}

			const eligibility = assertEmploymentForOffboarding({
				employmentStatus: employment.status,
				hasTermination: hasFinalizedTermination,
			});
			if (!eligibility.ok) {
				return eligibility;
			}

			for (const existing of state.offboardingCases.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.employmentId === record.employmentId &&
					existing.status === "in_progress"
				) {
					return conflict(
						"Employment already has an in-progress offboarding case",
					);
				}
			}

			const caseIdResult = parseHumanResourcesOffboardingCaseId(randomUUID());
			if (!caseIdResult.ok) {
				return caseIdResult;
			}
			const clearanceIdResult = parseHumanResourcesClearanceId(randomUUID());
			if (!clearanceIdResult.ok) {
				return clearanceIdResult;
			}
			const accessRevocationIdResult =
				parseHumanResourcesOffboardingAccessRevocationId(randomUUID());
			if (!accessRevocationIdResult.ok) {
				return accessRevocationIdResult;
			}
			const payrollHandoffIdResult =
				parseHumanResourcesOffboardingPayrollHandoffId(randomUUID());
			if (!payrollHandoffIdResult.ok) {
				return payrollHandoffIdResult;
			}

			const now = new Date();
			const offboardingCase: OffboardingCase = {
				id: caseIdResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: employment.employeeId,
				terminationId: record.terminationId,
				status: "in_progress",
				startedAt: now,
				completedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const seededTasks: OffboardingTask[] = [];
			for (const seed of record.tasks) {
				const taskIdResult = parseHumanResourcesOffboardingTaskId(randomUUID());
				if (!taskIdResult.ok) {
					return taskIdResult;
				}
				seededTasks.push({
					id: taskIdResult.data,
					organizationId: record.organizationId,
					caseId: offboardingCase.id,
					code: seed.code.trim(),
					title: seed.title.trim(),
					mandatory: seed.mandatory,
					status: "pending",
					completedAt: null,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
					createdAt: now,
					updatedAt: now,
				});
			}

			const clearance: Clearance = {
				id: clearanceIdResult.data,
				organizationId: record.organizationId,
				offboardingCaseId: offboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				clearedOn: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			const accessRevocation: OffboardingAccessRevocation = {
				id: accessRevocationIdResult.data,
				organizationId: record.organizationId,
				offboardingCaseId: offboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				revokedOn: null,
				summary: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			const payrollHandoff: OffboardingPayrollHandoff = {
				id: payrollHandoffIdResult.data,
				organizationId: record.organizationId,
				offboardingCaseId: offboardingCase.id,
				employmentId: record.employmentId,
				status: "pending",
				readyOn: null,
				summary: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.offboardingCases.set(offboardingCase.id, offboardingCase);
			for (const task of seededTasks) {
				state.offboardingTasks.set(task.id, task);
			}
			state.clearances.set(clearance.id, clearance);
			state.offboardingAccessRevocations.set(
				accessRevocation.id,
				accessRevocation,
			);
			state.offboardingPayrollHandoffs.set(payrollHandoff.id, payrollHandoff);
			const idemKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			state.offboardingIdempotencyByKey.set(idemKey, {
				offboardingCase: cloneOffboardingCase(offboardingCase),
				startRequestFingerprint: record.startRequestFingerprint,
			});

			const audit = await ports.audit.record({
				organizationId: offboardingCase.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_offboarding_case",
				entityId: offboardingCase.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offboardingCases.delete(offboardingCase.id);
				for (const task of seededTasks) {
					state.offboardingTasks.delete(task.id);
				}
				state.clearances.delete(clearance.id);
				state.offboardingAccessRevocations.delete(accessRevocation.id);
				state.offboardingPayrollHandoffs.delete(payrollHandoff.id);
				state.offboardingIdempotencyByKey.delete(idemKey);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: offboardingCase.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
				payload: {
					organizationId: offboardingCase.organizationId,
					entityType: "hr_offboarding_case",
					entityId: offboardingCase.id,
					actorId: record.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.offboardingCases.delete(offboardingCase.id);
				for (const task of seededTasks) {
					state.offboardingTasks.delete(task.id);
				}
				state.clearances.delete(clearance.id);
				state.offboardingAccessRevocations.delete(accessRevocation.id);
				state.offboardingPayrollHandoffs.delete(payrollHandoff.id);
				state.offboardingIdempotencyByKey.delete(idemKey);
				return outbox;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		async completeOffboardingTask(
			input: {
				organizationId: string;
				taskId: HumanResourcesOffboardingTaskId;
				newStatus: LifecycleTaskStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const task = state.offboardingTasks.get(input.taskId);
			if (!task || task.organizationId !== input.organizationId) {
				return notFound("Offboarding task not found");
			}
			const offboardingCase = state.offboardingCases.get(task.caseId);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				task.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertLifecycleTaskStatusTransition(
				task.status,
				input.newStatus,
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previousTask = { ...task };
			const updatedTask: OffboardingTask = {
				...task,
				status: input.newStatus,
				completedAt: now,
				version: task.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.offboardingTasks.set(task.id, updatedTask);

			const audit = await ports.audit.record({
				organizationId: updatedTask.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_offboarding_task",
				entityId: updatedTask.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offboardingTasks.set(task.id, previousTask);
				return audit;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		async recordExitInterview(
			input: {
				organizationId: string;
				offboardingCaseId: HumanResourcesOffboardingCaseId;
				conductedOn: string;
				notes: string | null;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			for (const existing of state.exitInterviews.values()) {
				if (
					existing.organizationId === input.organizationId &&
					existing.offboardingCaseId === offboardingCase.id
				) {
					return conflict("Exit interview already recorded for this case");
				}
			}
			if (input.notes === null || input.notes.trim().length === 0) {
				return invalidInput("Exit interview notes are required");
			}

			const idResult = parseHumanResourcesExitInterviewId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const interview: ExitInterview = {
				id: idResult.data,
				organizationId: input.organizationId,
				offboardingCaseId: offboardingCase.id,
				employmentId: offboardingCase.employmentId,
				conductedOn: input.conductedOn,
				notes: input.notes.trim(),
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.exitInterviews.set(interview.id, interview);

			const audit = await ports.audit.record({
				organizationId: interview.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_exit_interview",
				entityId: interview.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.exitInterviews.delete(interview.id);
				return audit;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		async recordClearance(
			input: {
				organizationId: string;
				clearanceId: HumanResourcesClearanceId;
				clearedOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const clearance = state.clearances.get(input.clearanceId);
			if (!clearance || clearance.organizationId !== input.organizationId) {
				return notFound("Clearance not found");
			}
			const offboardingCase = state.offboardingCases.get(
				clearance.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				clearance.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertClearanceStatusTransition(
				clearance.status,
				"cleared",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = { ...clearance };
			const updated: Clearance = {
				...clearance,
				status: "cleared",
				clearedOn: input.clearedOn,
				version: clearance.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.clearances.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_clearance",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.clearances.set(updated.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_clearance",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.clearances.set(updated.id, previous);
				return outbox;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		async completeOffboarding(
			input: {
				organizationId: string;
				offboardingCaseId: HumanResourcesOffboardingCaseId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				offboardingCase.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const tasks = Array.from(state.offboardingTasks.values()).filter(
				(task) =>
					task.organizationId === input.organizationId &&
					task.caseId === offboardingCase.id,
			);
			const mandatoryTasksComplete = tasks.every(
				(task) =>
					!task.mandatory ||
					task.status === "completed" ||
					task.status === "waived",
			);
			const hasExitInterview = Array.from(state.exitInterviews.values()).some(
				(row) =>
					row.organizationId === input.organizationId &&
					row.offboardingCaseId === offboardingCase.id,
			);
			const clearance =
				Array.from(state.clearances.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.offboardingCaseId === offboardingCase.id,
				) ?? null;
			const accessRevocation =
				Array.from(state.offboardingAccessRevocations.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.offboardingCaseId === offboardingCase.id,
				) ?? null;
			const payrollHandoff =
				Array.from(state.offboardingPayrollHandoffs.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.offboardingCaseId === offboardingCase.id,
				) ?? null;
			const ready = assertOffboardingReadyToComplete({
				mandatoryTasksComplete,
				hasExitInterview,
				clearanceStatus: clearance?.status ?? null,
				accessRevocationStatus: accessRevocation?.status ?? null,
				payrollHandoffStatus: payrollHandoff?.status ?? null,
			});
			if (!ready.ok) {
				return ready;
			}

			const now = new Date();
			const previous = { ...offboardingCase };
			const updated: OffboardingCase = {
				...offboardingCase,
				status: "completed",
				completedAt: now,
				version: offboardingCase.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.offboardingCases.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_offboarding_case",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offboardingCases.set(updated.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_offboarding_case",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.offboardingCases.set(updated.id, previous);
				return outbox;
			}

			return ok(cloneOffboardingCase(updated));
		},

		async listOffboardingTasks(input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
		}): Promise<Result<OffboardingTask[]>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return await notFound("Offboarding case not found");
			}
			const tasks = Array.from(state.offboardingTasks.values())
				.filter(
					(task) =>
						task.organizationId === input.organizationId &&
						task.caseId === input.offboardingCaseId,
				)
				.map((task) => ({ ...task }));
			tasks.sort((a, b) => a.code.localeCompare(b.code));
			return await ok(tasks);
		},

		async getClearanceByOffboardingCase(input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
		}): Promise<Result<Clearance | null>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return await notFound("Offboarding case not found");
			}
			const clearance =
				Array.from(state.clearances.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.offboardingCaseId === input.offboardingCaseId,
				) ?? null;
			return await ok(clearance === null ? null : { ...clearance });
		},

		async getOffboardingAccessRevocationByCase(input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
		}): Promise<Result<OffboardingAccessRevocation | null>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return await notFound("Offboarding case not found");
			}
			const row =
				Array.from(state.offboardingAccessRevocations.values()).find(
					(revocation) =>
						revocation.organizationId === input.organizationId &&
						revocation.offboardingCaseId === input.offboardingCaseId,
				) ?? null;
			return await ok(
				row === null ? null : cloneOffboardingAccessRevocation(row),
			);
		},

		async getOffboardingPayrollHandoffByCase(input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
		}): Promise<Result<OffboardingPayrollHandoff | null>> {
			const offboardingCase = state.offboardingCases.get(
				input.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return await notFound("Offboarding case not found");
			}
			const row =
				Array.from(state.offboardingPayrollHandoffs.values()).find(
					(handoff) =>
						handoff.organizationId === input.organizationId &&
						handoff.offboardingCaseId === input.offboardingCaseId,
				) ?? null;
			return await ok(
				row === null ? null : cloneOffboardingPayrollHandoff(row),
			);
		},

		async recordOffboardingAccessRevocation(
			input: {
				organizationId: string;
				accessRevocationId: HumanResourcesOffboardingAccessRevocationId;
				revokedOn: string;
				summary: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const accessRevocation = state.offboardingAccessRevocations.get(
				input.accessRevocationId,
			);
			if (
				!accessRevocation ||
				accessRevocation.organizationId !== input.organizationId
			) {
				return notFound("Offboarding access revocation not found");
			}
			const offboardingCase = state.offboardingCases.get(
				accessRevocation.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				accessRevocation.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOffboardingAccessRevocationStatusTransition(
				accessRevocation.status,
				"revoked",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = cloneOffboardingAccessRevocation(accessRevocation);
			const updated: OffboardingAccessRevocation = {
				...accessRevocation,
				status: "revoked",
				revokedOn: input.revokedOn,
				summary: input.summary,
				version: accessRevocation.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.offboardingAccessRevocations.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_offboarding_access_revocation",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offboardingAccessRevocations.set(updated.id, previous);
				return audit;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		async recordOffboardingPayrollHandoff(
			input: {
				organizationId: string;
				payrollHandoffId: HumanResourcesOffboardingPayrollHandoffId;
				readyOn: string;
				summary: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<OffboardingCase>> {
			const payrollHandoff = state.offboardingPayrollHandoffs.get(
				input.payrollHandoffId,
			);
			if (
				!payrollHandoff ||
				payrollHandoff.organizationId !== input.organizationId
			) {
				return notFound("Offboarding payroll handoff not found");
			}
			const offboardingCase = state.offboardingCases.get(
				payrollHandoff.offboardingCaseId,
			);
			if (
				!offboardingCase ||
				offboardingCase.organizationId !== input.organizationId
			) {
				return notFound("Offboarding case not found");
			}
			const caseActive = assertOffboardingCaseInProgress(
				offboardingCase.status,
			);
			if (!caseActive.ok) {
				return caseActive;
			}
			const versionCheck = assertExpectedVersion(
				payrollHandoff.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertOffboardingPayrollHandoffStatusTransition(
				payrollHandoff.status,
				"ready",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = cloneOffboardingPayrollHandoff(payrollHandoff);
			const updated: OffboardingPayrollHandoff = {
				...payrollHandoff,
				status: "ready",
				readyOn: input.readyOn,
				summary: input.summary,
				version: payrollHandoff.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.offboardingPayrollHandoffs.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_offboarding_payroll_handoff",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offboardingPayrollHandoffs.set(updated.id, previous);
				return audit;
			}

			return ok(cloneOffboardingCase(offboardingCase));
		},

		// Compensation Grade
	};
}
