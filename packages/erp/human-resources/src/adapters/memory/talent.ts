import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
/**
 * In-memory talent domain state and attachment for HumanResourcesStore hosts.
 */

import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSMENT_EXPIRED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBER_REMOVED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
	HUMAN_RESOURCES_TALENT_PROFILE_UPDATED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";

import {
	type HumanResourcesCareerPlanActionId,
	type HumanResourcesCareerPlanId,
	type HumanResourcesCompetencyAssessmentId,
	type HumanResourcesCompetencyId,
	type HumanResourcesEmployeeId,
	type HumanResourcesJobCompetencyId,
	type HumanResourcesSuccessionCandidateId,
	type HumanResourcesSuccessionPlanId,
	type HumanResourcesTalentCriticalRoleReadinessId,
	type HumanResourcesTalentPoolId,
	type HumanResourcesTalentPoolMemberId,
	type HumanResourcesTalentProfileAssessmentId,
	type HumanResourcesTalentProfileId,
	type HumanResourcesTalentProfileMobilityId,
	parseHumanResourcesCareerPlanActionId,
	parseHumanResourcesCareerPlanId,
	parseHumanResourcesCompetencyAssessmentId,
	parseHumanResourcesCompetencyId,
	parseHumanResourcesJobCompetencyId,
	parseHumanResourcesSuccessionCandidateId,
	parseHumanResourcesSuccessionPlanId,
	parseHumanResourcesTalentCriticalRoleReadinessId,
	parseHumanResourcesTalentPoolId,
	parseHumanResourcesTalentPoolMemberId,
	parseHumanResourcesTalentProfileAssessmentId,
	parseHumanResourcesTalentProfileId,
	parseHumanResourcesTalentProfileMobilityId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import type { EmploymentStatus } from "../../shared/employment-status";
import {
	assertAssessmentCanExpire,
	assertAssessmentInputValid,
	assertAssessmentSupersedable,
	assertCareerPlanAcknowledgeable,
	assertCareerPlanActionAddable,
	assertCareerPlanActionCompletable,
	assertCareerPlanOpen,
	assertCareerPlanStatusTransition,
	assertCompetencyStatusTransition,
	assertCriticalRoleReadinessRecordable,
	assertJobCompetencyMappable,
	assertJobCompetencyRemovable,
	assertProfileAssessmentConfirmable,
	assertProfileAssessmentDraftable,
	assertReadinessAssessmentValid,
	assertReadinessNotStale,
	assertSuccessionCandidateActive,
	assertSuccessionCandidateApprovable,
	assertSuccessionCandidateNominatable,
	assertSuccessionCandidateRemovable,
	assertSuccessionPlanStatusTransition,
	assertTalentPoolClosable,
	assertTalentPoolMemberApprovable,
	assertTalentPoolMemberNominatable,
	assertTalentPoolMemberRemovable,
	assertTalentPoolOpen,
	assertTalentProfileActive,
	assertTalentProfileArchivable,
	assertTalentProfileMobilityRecordable,
} from "../../shared/talent-guards";
import type { HumanResourcesStore } from "../../store";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanWithActions,
	Competency,
	CompetencyAssessment,
	IdempotentCareerPlanRecord,
	IdempotentCompetencyAssessmentRecord,
	IdempotentCompetencyRecord,
	IdempotentSuccessionCandidateRecord,
	IdempotentSuccessionPlanRecord,
	IdempotentTalentCriticalRoleReadinessRecord,
	IdempotentTalentPoolMemberRecord,
	IdempotentTalentPoolRecord,
	IdempotentTalentProfileMobilityRecord,
	IdempotentTalentProfileRecord,
	JobCompetency,
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionPlan,
	TalentCriticalRoleReadiness,
	TalentCriticalRoleReadinessListPage,
	TalentPool,
	TalentPoolMember,
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileAssessmentListPage,
	TalentProfileMobility,
	TalentProfileMobilityListPage,
} from "../../types";
import { idempotencyMapKey } from "./shared";

export interface TalentMemoryState {
	careerPlanActions: Map<HumanResourcesCareerPlanActionId, CareerPlanAction>;
	careerPlanIdempotency: Map<string, IdempotentCareerPlanRecord>;
	careerPlans: Map<HumanResourcesCareerPlanId, CareerPlan>;
	competencies: Map<HumanResourcesCompetencyId, Competency>;
	competencyAssessmentIdempotency: Map<
		string,
		IdempotentCompetencyAssessmentRecord
	>;
	competencyAssessments: Map<
		HumanResourcesCompetencyAssessmentId,
		CompetencyAssessment
	>;
	competencyIdempotency: Map<string, IdempotentCompetencyRecord>;
	jobCompetencies: Map<HumanResourcesJobCompetencyId, JobCompetency>;
	successionCandidateIdempotency: Map<
		string,
		IdempotentSuccessionCandidateRecord
	>;
	successionCandidates: Map<
		HumanResourcesSuccessionCandidateId,
		SuccessionCandidate
	>;
	successionPlanIdempotency: Map<string, IdempotentSuccessionPlanRecord>;
	successionPlans: Map<HumanResourcesSuccessionPlanId, SuccessionPlan>;
	talentCriticalRoleReadiness: Map<
		HumanResourcesTalentCriticalRoleReadinessId,
		TalentCriticalRoleReadiness
	>;
	talentCriticalRoleReadinessIdempotency: Map<
		string,
		IdempotentTalentCriticalRoleReadinessRecord
	>;
	talentPoolIdempotency: Map<string, IdempotentTalentPoolRecord>;
	talentPoolMemberIdempotency: Map<string, IdempotentTalentPoolMemberRecord>;
	talentPoolMembers: Map<HumanResourcesTalentPoolMemberId, TalentPoolMember>;
	talentPools: Map<HumanResourcesTalentPoolId, TalentPool>;
	talentProfileAssessments: Map<
		HumanResourcesTalentProfileAssessmentId,
		TalentProfileAssessment
	>;
	talentProfileIdempotency: Map<string, IdempotentTalentProfileRecord>;
	talentProfileMobilities: Map<
		HumanResourcesTalentProfileMobilityId,
		TalentProfileMobility
	>;
	talentProfileMobilityIdempotency: Map<
		string,
		IdempotentTalentProfileMobilityRecord
	>;
	talentProfiles: Map<HumanResourcesTalentProfileId, TalentProfile>;
}

export type TalentHost = Pick<
	HumanResourcesStore,
	| "getEmployeeById"
	| "getJobById"
	| "getPositionById"
	| "findOpenEmploymentByEmployee"
>;

export type MemoryTalentMethods = Pick<
	HumanResourcesStore,
	| "getCompetencyById"
	| "findCompetencyByIdempotencyKey"
	| "createCompetency"
	| "updateCompetency"
	| "retireCompetency"
	| "listCompetencies"
	| "mapCompetencyToJob"
	| "removeCompetencyFromJob"
	| "listJobCompetencies"
	| "getCompetencyAssessmentById"
	| "findCurrentCompetencyAssessment"
	| "findCompetencyAssessmentByIdempotencyKey"
	| "createCompetencyAssessment"
	| "supersedeCompetencyAssessment"
	| "expireCompetencyAssessment"
	| "getEmployeeCompetencyProfile"
	| "getTalentProfileById"
	| "findTalentProfileByEmployeeId"
	| "findTalentProfileByIdempotencyKey"
	| "createTalentProfile"
	| "updateTalentProfile"
	| "archiveTalentProfile"
	| "getTalentProfileByEmployee"
	| "recordTalentProfileAssessment"
	| "confirmTalentProfileAssessment"
	| "listTalentProfileAssessments"
	| "findTalentProfileMobilityByIdempotencyKey"
	| "recordTalentProfileMobility"
	| "listTalentProfileMobility"
	| "findCriticalRoleReadinessByIdempotencyKey"
	| "recordCriticalRoleReadiness"
	| "listCriticalRoleReadiness"
	| "getTalentPoolById"
	| "findTalentPoolByIdempotencyKey"
	| "createTalentPool"
	| "updateTalentPool"
	| "closeTalentPool"
	| "findTalentPoolMemberByIdempotencyKey"
	| "nominateTalentPoolMember"
	| "approveTalentPoolMember"
	| "removeTalentPoolMember"
	| "listTalentPoolMembers"
	| "findCareerPlanByIdempotencyKey"
	| "createCareerPlan"
	| "updateCareerPlan"
	| "acknowledgeCareerPlan"
	| "closeCareerPlan"
	| "getCareerPlanById"
	| "listEmployeeCareerPlans"
	| "addCareerPlanAction"
	| "completeCareerPlanAction"
	| "getCareerPlanActionById"
	| "findSuccessionPlanByIdempotencyKey"
	| "createSuccessionPlan"
	| "updateSuccessionPlan"
	| "closeSuccessionPlan"
	| "getSuccessionPlanById"
	| "listSuccessionPlans"
	| "findSuccessionCandidateByIdempotencyKey"
	| "nominateSuccessionCandidate"
	| "assessSuccessionReadiness"
	| "approveSuccessionCandidate"
	| "removeSuccessionCandidate"
	| "listSuccessionCandidates"
	| "getPositionSuccessionCoverage"
>;

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function paginate<T extends { createdAt: Date }>(
	items: T[],
	page: number,
	pageSize: number,
): { items: T[]; totalCount: number } {
	const sorted = [...items].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);
	const offset = (page - 1) * pageSize;
	return {
		items: sorted.slice(offset, offset + pageSize),
		totalCount: sorted.length,
	};
}

async function recordAudit(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
	},
): Promise<Result<{ id: string }>> {
	return await ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

async function recordOutbox(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return await ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.type,
		payload: {
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		},
	});
}

export function createTalentMemoryState(): TalentMemoryState {
	return {
		competencies: new Map(),
		competencyIdempotency: new Map(),
		jobCompetencies: new Map(),
		competencyAssessments: new Map(),
		competencyAssessmentIdempotency: new Map(),
		talentProfiles: new Map(),
		talentProfileIdempotency: new Map(),
		talentProfileAssessments: new Map(),
		talentProfileMobilities: new Map(),
		talentProfileMobilityIdempotency: new Map(),
		talentCriticalRoleReadiness: new Map(),
		talentCriticalRoleReadinessIdempotency: new Map(),
		talentPools: new Map(),
		talentPoolIdempotency: new Map(),
		talentPoolMembers: new Map(),
		talentPoolMemberIdempotency: new Map(),
		careerPlans: new Map(),
		careerPlanIdempotency: new Map(),
		careerPlanActions: new Map(),
		successionPlans: new Map(),
		successionPlanIdempotency: new Map(),
		successionCandidates: new Map(),
		successionCandidateIdempotency: new Map(),
	};
}

export function resetTalentMemoryState(state: TalentMemoryState): void {
	state.competencies.clear();
	state.competencyIdempotency.clear();
	state.jobCompetencies.clear();
	state.competencyAssessments.clear();
	state.competencyAssessmentIdempotency.clear();
	state.talentProfiles.clear();
	state.talentProfileIdempotency.clear();
	state.talentProfileAssessments.clear();
	state.talentProfileMobilities.clear();
	state.talentProfileMobilityIdempotency.clear();
	state.talentCriticalRoleReadiness.clear();
	state.talentCriticalRoleReadinessIdempotency.clear();
	state.talentPools.clear();
	state.talentPoolIdempotency.clear();
	state.talentPoolMembers.clear();
	state.talentPoolMemberIdempotency.clear();
	state.careerPlans.clear();
	state.careerPlanIdempotency.clear();
	state.careerPlanActions.clear();
	state.successionPlans.clear();
	state.successionPlanIdempotency.clear();
	state.successionCandidates.clear();
	state.successionCandidateIdempotency.clear();
}

function getCompetencyInOrg(
	state: TalentMemoryState,
	organizationId: string,
	competencyId: HumanResourcesCompetencyId,
): Result<Competency> {
	const record = state.competencies.get(competencyId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Competency not found");
	}
	return ok(record);
}

function getJobCompetencyInOrg(
	state: TalentMemoryState,
	organizationId: string,
	jobCompetencyId: HumanResourcesJobCompetencyId,
): Result<JobCompetency> {
	const record = state.jobCompetencies.get(jobCompetencyId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Job competency mapping not found");
	}
	return ok(record);
}

function getCompetencyAssessmentInOrg(
	state: TalentMemoryState,
	organizationId: string,
	assessmentId: HumanResourcesCompetencyAssessmentId,
): Result<CompetencyAssessment> {
	const record = state.competencyAssessments.get(assessmentId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Competency assessment not found");
	}
	return ok(record);
}

function getTalentProfileInOrg(
	state: TalentMemoryState,
	organizationId: string,
	talentProfileId: HumanResourcesTalentProfileId,
): Result<TalentProfile> {
	const record = state.talentProfiles.get(talentProfileId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Talent profile not found");
	}
	return ok(record);
}

function getTalentProfileAssessmentInOrg(
	state: TalentMemoryState,
	organizationId: string,
	assessmentId: HumanResourcesTalentProfileAssessmentId,
): Result<TalentProfileAssessment> {
	const record = state.talentProfileAssessments.get(assessmentId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Talent profile assessment not found");
	}
	return ok(record);
}

function getTalentPoolInOrg(
	state: TalentMemoryState,
	organizationId: string,
	poolId: HumanResourcesTalentPoolId,
): Result<TalentPool> {
	const record = state.talentPools.get(poolId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Talent pool not found");
	}
	return ok(record);
}

function getTalentPoolMemberInOrg(
	state: TalentMemoryState,
	organizationId: string,
	memberId: HumanResourcesTalentPoolMemberId,
): Result<TalentPoolMember> {
	const record = state.talentPoolMembers.get(memberId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Talent pool member not found");
	}
	return ok(record);
}

function getCareerPlanInOrg(
	state: TalentMemoryState,
	organizationId: string,
	careerPlanId: HumanResourcesCareerPlanId,
): Result<CareerPlan> {
	const record = state.careerPlans.get(careerPlanId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Career plan not found");
	}
	return ok(record);
}

function getCareerPlanActionInOrg(
	state: TalentMemoryState,
	organizationId: string,
	actionId: HumanResourcesCareerPlanActionId,
): Result<CareerPlanAction> {
	const record = state.careerPlanActions.get(actionId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Career plan action not found");
	}
	return ok(record);
}

function getSuccessionPlanInOrg(
	state: TalentMemoryState,
	organizationId: string,
	successionPlanId: HumanResourcesSuccessionPlanId,
): Result<SuccessionPlan> {
	const record = state.successionPlans.get(successionPlanId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Succession plan not found");
	}
	return ok(record);
}

function getSuccessionCandidateInOrg(
	state: TalentMemoryState,
	organizationId: string,
	candidateId: HumanResourcesSuccessionCandidateId,
): Result<SuccessionCandidate> {
	const record = state.successionCandidates.get(candidateId);
	if (!record || record.organizationId !== organizationId) {
		return notFound("Succession candidate not found");
	}
	return ok(record);
}

function resolveTalentIdempotencyReplay<
	TRecord extends { createRequestFingerprint: string },
	TValue,
>(
	existing: TRecord | undefined,
	expectedFingerprint: string,
	readValue: (record: TRecord) => TValue,
): Result<TValue | null> {
	if (existing === undefined) {
		return ok(null);
	}
	if (existing.createRequestFingerprint !== expectedFingerprint) {
		return fail(
			"CONFLICT",
			"Idempotency key reused with different payload",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	return ok(readValue(existing));
}

async function resolveSuccessionEmploymentStatus(
	host: Pick<
		HumanResourcesStore,
		"getEmployeeById" | "findOpenEmploymentByEmployee"
	>,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId | null;
	},
): Promise<Result<EmploymentStatus | null>> {
	if (input.employeeId === null) {
		return ok(null);
	}
	const employee = await host.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return notFound("Employee not found");
	}
	const employment = await host.findOpenEmploymentByEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	return employment.ok ? ok(employment.data?.status ?? null) : employment;
}

export function createMemoryTalentMethods(
	state: TalentMemoryState,
): MemoryTalentMethods & ThisType<TalentHost & MemoryTalentMethods> {
	const getState = () => state;
	return {
		// Competency

		async getCompetencyById(input) {
			const stateValue65 = getState();
			const record = stateValue65.competencies.get(input.competencyId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findCompetencyByIdempotencyKey(input) {
			const stateValue64 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue64.competencyIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, competency: { ...record.competency } });
		},

		async createCompetency(record, ports, meta) {
			const stateValue63 = getState();
			const existingCode = Array.from(stateValue63.competencies.values()).find(
				(competencyValue) =>
					competencyValue.organizationId === record.organizationId &&
					competencyValue.code === record.code,
			);
			if (existingCode) {
				return conflict("Competency with this code already exists");
			}

			const idResult = parseHumanResourcesCompetencyId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const competency: Competency = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				description: record.description,
				category: record.category,
				scaleCode: record.scaleCode,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue63.competencies.set(competency.id, competency);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue63.competencyIdempotency.set(idempotencyKey, {
				competency: { ...competency },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: competency.organizationId,
				actorUserId: competency.createdBy,
				entity: "hr_competency",
				entityId: competency.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue63.competencies.delete(competency.id);
				stateValue63.competencyIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...competency });
		},

		async updateCompetency(input, ports, meta) {
			const stateValue62 = getState();
			const loaded = getCompetencyInOrg(
				stateValue62,
				input.organizationId,
				input.competencyId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: Competency = {
				...loaded.data,
				name: input.name ?? loaded.data.name,
				description:
					input.description === undefined
						? loaded.data.description
						: input.description,
				category:
					input.category === undefined ? loaded.data.category : input.category,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue62.competencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_competency",
				entityId: input.competencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue62.competencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async retireCompetency(input, ports, meta) {
			const stateValue61 = getState();
			const loaded = getCompetencyInOrg(
				stateValue61,
				input.organizationId,
				input.competencyId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const transition = assertCompetencyStatusTransition(
				loaded.data.status,
				"retired",
			);
			if (!transition.ok) {
				return transition;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: Competency = {
				...loaded.data,
				status: "retired",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue61.competencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_competency",
				entityId: input.competencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue61.competencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listCompetencies(input) {
			const stateValue60 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(stateValue60.competencies.values()).filter(
				(competency) => {
					if (competency.organizationId !== input.organizationId) {
						return false;
					}
					if (
						input.status !== undefined &&
						competency.status !== input.status
					) {
						return false;
					}
					return true;
				},
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				competencies: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Job competency

		async mapCompetencyToJob(input, ports, meta) {
			const stateValue59 = getState();
			const job = await this.getJobById({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return notFound("Job not found");
			}
			const competency = getCompetencyInOrg(
				stateValue59,
				input.organizationId,
				input.competencyId,
			);
			if (!competency.ok) {
				return competency;
			}

			const existingMapping = Array.from(
				stateValue59.jobCompetencies.values(),
			).find(
				(mappingValue) =>
					mappingValue.organizationId === input.organizationId &&
					mappingValue.jobId === input.jobId &&
					mappingValue.competencyId === input.competencyId &&
					mappingValue.status === "active",
			);
			const mappable = assertJobCompetencyMappable({
				competencyStatus: competency.data.status,
				existingMappingStatus: existingMapping?.status ?? null,
			});
			if (!mappable.ok) {
				return mappable;
			}

			const idResult = parseHumanResourcesJobCompetencyId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const mapping: JobCompetency = {
				id: idResult.data,
				organizationId: input.organizationId,
				jobId: input.jobId,
				competencyId: input.competencyId,
				requiredLevel: input.requiredLevel,
				status: "active",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			stateValue59.jobCompetencies.set(mapping.id, mapping);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_job_competency",
				entityId: mapping.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue59.jobCompetencies.delete(mapping.id);
				return audit;
			}

			return ok({ ...mapping });
		},

		async removeCompetencyFromJob(input, ports, meta) {
			const stateValue58 = getState();
			const loaded = getJobCompetencyInOrg(
				stateValue58,
				input.organizationId,
				input.jobCompetencyId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const removable = assertJobCompetencyRemovable(loaded.data.status);
			if (!removable.ok) {
				return removable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: JobCompetency = {
				...loaded.data,
				status: "removed",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue58.jobCompetencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_job_competency",
				entityId: input.jobCompetencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue58.jobCompetencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listJobCompetencies(input) {
			const stateValue57 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(stateValue57.jobCompetencies.values()).filter(
				(mapping) =>
					mapping.organizationId === input.organizationId &&
					mapping.jobId === input.jobId,
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				jobCompetencies: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Competency assessment

		async getCompetencyAssessmentById(input) {
			const stateValue56 = getState();
			const record = stateValue56.competencyAssessments.get(input.assessmentId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findCurrentCompetencyAssessment(input) {
			const stateValue55 = getState();
			const record = Array.from(
				stateValue55.competencyAssessments.values(),
			).find(
				(assessment) =>
					assessment.organizationId === input.organizationId &&
					assessment.employeeId === input.employeeId &&
					assessment.competencyId === input.competencyId &&
					assessment.status === "current",
			);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findCompetencyAssessmentByIdempotencyKey(input) {
			const stateValue54 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue54.competencyAssessmentIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, assessment: { ...record.assessment } });
		},

		async createCompetencyAssessment(record, ports, meta) {
			const stateValue53 = getState();
			const competency = getCompetencyInOrg(
				stateValue53,
				record.organizationId,
				record.competencyId,
			);
			if (!competency.ok) {
				return competency;
			}
			const validInput = assertAssessmentInputValid({
				competencyStatus: competency.data.status,
				competencyScaleCode: competency.data.scaleCode,
				assessmentScaleCode: record.scaleCode,
				assessorUserId: record.assessorUserId,
				evidenceSource: record.evidenceSource,
				level: record.level,
				effectiveOn: record.effectiveOn,
				expiresOn: record.expiresOn,
				todayDate: todayIsoDate(),
			});
			if (!validInput.ok) {
				return validInput;
			}

			const existingCurrent = Array.from(
				stateValue53.competencyAssessments.values(),
			).find(
				(assessmentValue) =>
					assessmentValue.organizationId === record.organizationId &&
					assessmentValue.employeeId === record.employeeId &&
					assessmentValue.competencyId === record.competencyId &&
					assessmentValue.status === "current",
			);
			if (existingCurrent) {
				return conflict(
					"A current assessment already exists for this employee and competency; use supersede",
				);
			}

			const idResult = parseHumanResourcesCompetencyAssessmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const assessment: CompetencyAssessment = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				competencyId: record.competencyId,
				assessorUserId: record.assessorUserId,
				evidenceSource: record.evidenceSource,
				scaleCode: record.scaleCode,
				level: record.level,
				effectiveOn: record.effectiveOn,
				expiresOn: record.expiresOn,
				status: "current",
				supersedesAssessmentId: null,
				supersededByAssessmentId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue53.competencyAssessments.set(assessment.id, assessment);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue53.competencyAssessmentIdempotency.set(idempotencyKey, {
				assessment: { ...assessment },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_competency_assessment",
				entityId: assessment.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue53.competencyAssessments.delete(assessment.id);
				stateValue53.competencyAssessmentIdempotency.delete(idempotencyKey);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				type: HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
				entityType: "hr_competency_assessment",
				entityId: assessment.id,
			});
			if (!outbox.ok) {
				stateValue53.competencyAssessments.delete(assessment.id);
				stateValue53.competencyAssessmentIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...assessment });
		},

		async supersedeCompetencyAssessment(record, ports, meta) {
			const stateValue52 = getState();
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existingByKey =
				stateValue52.competencyAssessmentIdempotency.get(idempotencyKey);
			const replay = resolveTalentIdempotencyReplay(
				existingByKey,
				record.createRequestFingerprint,
				(existing) => ({ ...existing.assessment }),
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const source = getCompetencyAssessmentInOrg(
				stateValue52,
				record.organizationId,
				record.sourceAssessmentId,
			);
			if (!source.ok) {
				return source;
			}
			const supersedable = assertAssessmentSupersedable(source.data.status);
			if (!supersedable.ok) {
				return supersedable;
			}
			const versionCheck = assertExpectedVersion(
				source.data.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const competency = getCompetencyInOrg(
				stateValue52,
				record.organizationId,
				source.data.competencyId,
			);
			if (!competency.ok) {
				return competency;
			}
			const validInput = assertAssessmentInputValid({
				competencyStatus: competency.data.status,
				competencyScaleCode: competency.data.scaleCode,
				assessmentScaleCode: source.data.scaleCode,
				assessorUserId: record.assessorUserId,
				evidenceSource: record.evidenceSource,
				level: record.level,
				effectiveOn: record.effectiveOn,
				expiresOn: record.expiresOn,
				todayDate: todayIsoDate(),
			});
			if (!validInput.ok) {
				return validInput;
			}

			const idResult = parseHumanResourcesCompetencyAssessmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const superseded: CompetencyAssessment = {
				...source.data,
				status: "superseded",
				supersededByAssessmentId: idResult.data,
				version: source.data.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			stateValue52.competencyAssessments.set(superseded.id, superseded);

			const assessment: CompetencyAssessment = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: source.data.employeeId,
				competencyId: source.data.competencyId,
				assessorUserId: record.assessorUserId,
				evidenceSource: record.evidenceSource,
				scaleCode: source.data.scaleCode,
				level: record.level,
				effectiveOn: record.effectiveOn,
				expiresOn: record.expiresOn,
				status: "current",
				supersedesAssessmentId: source.data.id,
				supersededByAssessmentId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue52.competencyAssessments.set(assessment.id, assessment);

			stateValue52.competencyAssessmentIdempotency.set(idempotencyKey, {
				assessment: { ...assessment },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_competency_assessment",
				entityId: assessment.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue52.competencyAssessments.set(source.data.id, source.data);
				stateValue52.competencyAssessments.delete(assessment.id);
				stateValue52.competencyAssessmentIdempotency.delete(idempotencyKey);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				type: HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
				entityType: "hr_competency_assessment",
				entityId: assessment.id,
			});
			if (!outbox.ok) {
				stateValue52.competencyAssessments.set(source.data.id, source.data);
				stateValue52.competencyAssessments.delete(assessment.id);
				stateValue52.competencyAssessmentIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...assessment });
		},

		async expireCompetencyAssessment(input, ports, meta) {
			const stateValue51 = getState();
			const assessmentResult = getCompetencyAssessmentInOrg(
				stateValue51,
				input.organizationId,
				input.assessmentId,
			);
			if (!assessmentResult.ok) {
				return assessmentResult;
			}
			const versionCheck = assertExpectedVersion(
				assessmentResult.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const expireGuard = assertAssessmentCanExpire(
				assessmentResult.data.status,
			);
			if (!expireGuard.ok) {
				return expireGuard;
			}

			const now = new Date();
			const updated: CompetencyAssessment = {
				...assessmentResult.data,
				status: "expired",
				version: assessmentResult.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue51.competencyAssessments.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_competency_assessment",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue51.competencyAssessments.set(
					assessmentResult.data.id,
					assessmentResult.data,
				);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_COMPETENCY_ASSESSMENT_EXPIRED_EVENT,
				entityType: "hr_competency_assessment",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				stateValue51.competencyAssessments.set(
					assessmentResult.data.id,
					assessmentResult.data,
				);
				return outbox;
			}

			return ok({ ...updated });
		},

		async getEmployeeCompetencyProfile(input) {
			const employee = await this.getEmployeeById({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return notFound("Employee not found");
			}
			const stateValue50 = getState();
			const assessments = Array.from(
				stateValue50.competencyAssessments.values(),
			)
				.filter(
					(assessment) =>
						assessment.organizationId === input.organizationId &&
						assessment.employeeId === input.employeeId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map((assessment) => ({ ...assessment }));
			return ok({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				assessments,
			});
		},

		// Talent profile

		async getTalentProfileById(input) {
			const stateValue49 = getState();
			const record = stateValue49.talentProfiles.get(input.talentProfileId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findTalentProfileByEmployeeId(input) {
			const stateValue48 = getState();
			const record = Array.from(stateValue48.talentProfiles.values()).find(
				(profile) =>
					profile.organizationId === input.organizationId &&
					profile.employeeId === input.employeeId,
			);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findTalentProfileByIdempotencyKey(input) {
			const stateValue47 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue47.talentProfileIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, profile: { ...record.profile } });
		},

		async createTalentProfile(record, ports, meta) {
			const stateValue46 = getState();
			const employee = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return notFound("Employee not found");
			}
			const existing = Array.from(stateValue46.talentProfiles.values()).find(
				(profileValue) =>
					profileValue.organizationId === record.organizationId &&
					profileValue.employeeId === record.employeeId,
			);
			if (existing) {
				return conflict("Talent profile already exists for this employee");
			}

			const idResult = parseHumanResourcesTalentProfileId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const profile: TalentProfile = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				summary: record.summary,
				currentClassification: null,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue46.talentProfiles.set(profile.id, profile);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue46.talentProfileIdempotency.set(idempotencyKey, {
				profile: { ...profile },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: profile.organizationId,
				actorUserId: profile.createdBy,
				entity: "hr_talent_profile",
				entityId: profile.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue46.talentProfiles.delete(profile.id);
				stateValue46.talentProfileIdempotency.delete(idempotencyKey);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: profile.organizationId,
				actorUserId: profile.createdBy,
				type: HUMAN_RESOURCES_TALENT_PROFILE_UPDATED_EVENT,
				entityType: "hr_talent_profile",
				entityId: profile.id,
			});
			if (!outbox.ok) {
				stateValue46.talentProfiles.delete(profile.id);
				stateValue46.talentProfileIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...profile });
		},

		async updateTalentProfile(input, ports, meta) {
			const stateValue45 = getState();
			const loaded = getTalentProfileInOrg(
				stateValue45,
				input.organizationId,
				input.talentProfileId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const active = assertTalentProfileActive(loaded.data.status);
			if (!active.ok) {
				return active;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentProfile = {
				...loaded.data,
				summary:
					input.summary === undefined ? loaded.data.summary : input.summary,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue45.talentProfiles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile",
				entityId: input.talentProfileId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue45.talentProfiles.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_TALENT_PROFILE_UPDATED_EVENT,
				entityType: "hr_talent_profile",
				entityId: input.talentProfileId,
			});
			if (!outbox.ok) {
				stateValue45.talentProfiles.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async archiveTalentProfile(input, ports, meta) {
			const stateValue44 = getState();
			const loaded = getTalentProfileInOrg(
				stateValue44,
				input.organizationId,
				input.talentProfileId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const archivable = assertTalentProfileArchivable(loaded.data.status);
			if (!archivable.ok) {
				return archivable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentProfile = {
				...loaded.data,
				status: "archived",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue44.talentProfiles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile",
				entityId: input.talentProfileId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue44.talentProfiles.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getTalentProfileByEmployee(input) {
			const stateValue43 = getState();
			const record = Array.from(stateValue43.talentProfiles.values()).find(
				(profile) =>
					profile.organizationId === input.organizationId &&
					profile.employeeId === input.employeeId,
			);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		// Talent profile assessment

		async recordTalentProfileAssessment(input, ports, meta) {
			const stateValue42 = getState();
			const profile = getTalentProfileInOrg(
				stateValue42,
				input.organizationId,
				input.talentProfileId,
			);
			if (!profile.ok) {
				return profile;
			}
			const active = assertTalentProfileActive(profile.data.status);
			if (!active.ok) {
				return active;
			}
			const draftable = assertProfileAssessmentDraftable({
				methodCode: input.methodCode,
				evidenceSummary: input.evidenceSummary,
			});
			if (!draftable.ok) {
				return draftable;
			}

			const idResult = parseHumanResourcesTalentProfileAssessmentId(
				randomUUID(),
			);
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const assessment: TalentProfileAssessment = {
				id: idResult.data,
				organizationId: input.organizationId,
				talentProfileId: input.talentProfileId,
				methodCode: input.methodCode,
				classification: input.classification,
				evidenceSummary: input.evidenceSummary,
				assessorUserId: input.assessorUserId,
				status: "draft",
				confirmedAt: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			stateValue42.talentProfileAssessments.set(assessment.id, assessment);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile_assessment",
				entityId: assessment.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue42.talentProfileAssessments.delete(assessment.id);
				return audit;
			}

			return ok({ ...assessment });
		},

		async confirmTalentProfileAssessment(input, ports, meta) {
			const stateValue41 = getState();
			const loaded = getTalentProfileAssessmentInOrg(
				stateValue41,
				input.organizationId,
				input.assessmentId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const confirmable = assertProfileAssessmentConfirmable(
				loaded.data.status,
			);
			if (!confirmable.ok) {
				return confirmable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const profile = getTalentProfileInOrg(
				stateValue41,
				input.organizationId,
				loaded.data.talentProfileId,
			);
			if (!profile.ok) {
				return profile;
			}

			const now = new Date();
			const previouslyConfirmed = Array.from(
				stateValue41.talentProfileAssessments.values(),
			).filter(
				(assessment) =>
					assessment.organizationId === input.organizationId &&
					assessment.talentProfileId === loaded.data.talentProfileId &&
					assessment.status === "confirmed",
			);
			for (const assessment of previouslyConfirmed) {
				stateValue41.talentProfileAssessments.set(assessment.id, {
					...assessment,
					status: "superseded",
					version: assessment.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: now,
				});
			}

			const updated: TalentProfileAssessment = {
				...loaded.data,
				status: "confirmed",
				confirmedAt: now,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue41.talentProfileAssessments.set(updated.id, updated);

			const updatedProfile: TalentProfile = {
				...profile.data,
				currentClassification: updated.classification,
				version: profile.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue41.talentProfiles.set(updatedProfile.id, updatedProfile);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile_assessment",
				entityId: input.assessmentId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue41.talentProfileAssessments.set(loaded.data.id, loaded.data);
				stateValue41.talentProfiles.set(profile.data.id, profile.data);
				for (const assessment of previouslyConfirmed) {
					stateValue41.talentProfileAssessments.set(assessment.id, assessment);
				}
				return audit;
			}

			return ok({ ...updated });
		},

		async listTalentProfileAssessments(input) {
			const stateValue40 = getState();
			const assessments = Array.from(
				stateValue40.talentProfileAssessments.values(),
			)
				.filter(
					(assessment) =>
						assessment.organizationId === input.organizationId &&
						assessment.talentProfileId === input.talentProfileId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map((assessment) => ({ ...assessment }));
			return await ok({
				assessments,
			} satisfies TalentProfileAssessmentListPage);
		},

		async findTalentProfileMobilityByIdempotencyKey(input) {
			const stateValue39 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue39.talentProfileMobilityIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({
				mobility: { ...record.mobility },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async recordTalentProfileMobility(record, ports, meta) {
			const stateValue38 = getState();
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existingByKey =
				stateValue38.talentProfileMobilityIdempotency.get(idempotencyKey);
			if (existingByKey) {
				if (
					existingByKey.createRequestFingerprint !==
					record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok({ ...existingByKey.mobility });
			}

			const profile = getTalentProfileInOrg(
				stateValue38,
				record.organizationId,
				record.talentProfileId,
			);
			if (!profile.ok) {
				return profile;
			}
			const active = assertTalentProfileActive(profile.data.status);
			if (!active.ok) {
				return active;
			}
			const recordable = assertTalentProfileMobilityRecordable({
				evidenceSummary: record.evidenceSummary,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
			});
			if (!recordable.ok) {
				return recordable;
			}

			const now = new Date();
			const previouslyCurrent = Array.from(
				stateValue38.talentProfileMobilities.values(),
			).filter(
				(mobilityValue) =>
					mobilityValue.organizationId === record.organizationId &&
					mobilityValue.talentProfileId === record.talentProfileId &&
					mobilityValue.dimension === record.dimension &&
					mobilityValue.status === "current",
			);
			for (const mobility of previouslyCurrent) {
				stateValue38.talentProfileMobilities.set(mobility.id, {
					...mobility,
					status: "superseded",
					version: mobility.version + 1,
					updatedBy: record.createdBy,
					updatedAt: now,
				});
			}

			const idResult = parseHumanResourcesTalentProfileMobilityId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const mobility: TalentProfileMobility = {
				id: idResult.data,
				organizationId: record.organizationId,
				talentProfileId: record.talentProfileId,
				dimension: record.dimension,
				preferenceCode: record.preferenceCode,
				scopeDetail: record.scopeDetail,
				evidenceSummary: record.evidenceSummary,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				status: "current",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue38.talentProfileMobilities.set(mobility.id, mobility);
			stateValue38.talentProfileMobilityIdempotency.set(idempotencyKey, {
				mobility: { ...mobility },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_talent_profile_mobility",
				entityId: mobility.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue38.talentProfileMobilities.delete(mobility.id);
				stateValue38.talentProfileMobilityIdempotency.delete(idempotencyKey);
				for (const prior of previouslyCurrent) {
					stateValue38.talentProfileMobilities.set(prior.id, prior);
				}
				return audit;
			}

			return ok({ ...mobility });
		},

		async listTalentProfileMobility(input) {
			const stateValue37 = getState();
			const mobilities = Array.from(
				stateValue37.talentProfileMobilities.values(),
			)
				.filter(
					(mobility) =>
						mobility.organizationId === input.organizationId &&
						mobility.talentProfileId === input.talentProfileId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map((mobility) => ({ ...mobility }));
			return await ok({
				mobilities,
			} satisfies TalentProfileMobilityListPage);
		},

		async findCriticalRoleReadinessByIdempotencyKey(input) {
			const stateValue36 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record =
				stateValue36.talentCriticalRoleReadinessIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({
				readiness: { ...record.readiness },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async recordCriticalRoleReadiness(record, ports, meta) {
			const stateValue35 = getState();
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existingByKey =
				stateValue35.talentCriticalRoleReadinessIdempotency.get(idempotencyKey);
			if (existingByKey) {
				if (
					existingByKey.createRequestFingerprint !==
					record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok({ ...existingByKey.readiness });
			}

			const profile = getTalentProfileInOrg(
				stateValue35,
				record.organizationId,
				record.talentProfileId,
			);
			if (!profile.ok) {
				return profile;
			}
			const active = assertTalentProfileActive(profile.data.status);
			if (!active.ok) {
				return active;
			}
			const position = await this.getPositionById({
				organizationId: record.organizationId,
				positionId: record.positionId,
			});
			if (!position.ok) {
				return position;
			}
			if (position.data === null) {
				return notFound("Position not found");
			}
			const recordable = assertCriticalRoleReadinessRecordable({
				evidenceSummary: record.evidenceSummary,
				assessorUserId: record.assessorUserId,
				readinessEffectiveOn: record.readinessEffectiveOn,
			});
			if (!recordable.ok) {
				return recordable;
			}

			const now = new Date();
			const previouslyCurrent = Array.from(
				stateValue35.talentCriticalRoleReadiness.values(),
			).filter(
				(readinessValue) =>
					readinessValue.organizationId === record.organizationId &&
					readinessValue.talentProfileId === record.talentProfileId &&
					readinessValue.positionId === record.positionId &&
					readinessValue.status === "current",
			);
			for (const readiness of previouslyCurrent) {
				stateValue35.talentCriticalRoleReadiness.set(readiness.id, {
					...readiness,
					status: "superseded",
					version: readiness.version + 1,
					updatedBy: record.createdBy,
					updatedAt: now,
				});
			}

			const idResult = parseHumanResourcesTalentCriticalRoleReadinessId(
				randomUUID(),
			);
			if (!idResult.ok) {
				return idResult;
			}

			const readiness: TalentCriticalRoleReadiness = {
				id: idResult.data,
				organizationId: record.organizationId,
				talentProfileId: record.talentProfileId,
				positionId: record.positionId,
				readiness: record.readiness,
				readinessEffectiveOn: record.readinessEffectiveOn,
				evidenceSummary: record.evidenceSummary,
				assessorUserId: record.assessorUserId,
				status: "current",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue35.talentCriticalRoleReadiness.set(readiness.id, readiness);
			stateValue35.talentCriticalRoleReadinessIdempotency.set(idempotencyKey, {
				readiness: { ...readiness },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_talent_critical_role_readiness",
				entityId: readiness.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue35.talentCriticalRoleReadiness.delete(readiness.id);
				stateValue35.talentCriticalRoleReadinessIdempotency.delete(
					idempotencyKey,
				);
				for (const prior of previouslyCurrent) {
					stateValue35.talentCriticalRoleReadiness.set(prior.id, prior);
				}
				return audit;
			}

			return ok({ ...readiness });
		},

		async listCriticalRoleReadiness(input) {
			const stateValue34 = getState();
			const readinessRecords = Array.from(
				stateValue34.talentCriticalRoleReadiness.values(),
			)
				.filter(
					(readiness) =>
						readiness.organizationId === input.organizationId &&
						readiness.talentProfileId === input.talentProfileId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map((readiness) => ({ ...readiness }));
			return await ok({
				readinessRecords,
			} satisfies TalentCriticalRoleReadinessListPage);
		},

		// Talent pool

		async getTalentPoolById(input) {
			const stateValue33 = getState();
			const record = stateValue33.talentPools.get(input.poolId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async findTalentPoolByIdempotencyKey(input) {
			const stateValue32 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue32.talentPoolIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, pool: { ...record.pool } });
		},

		async createTalentPool(record, ports, meta) {
			const stateValue31 = getState();
			const existingCode = Array.from(stateValue31.talentPools.values()).find(
				(poolValue) =>
					poolValue.organizationId === record.organizationId &&
					poolValue.code === record.code,
			);
			if (existingCode) {
				return conflict("Talent pool with this code already exists");
			}

			const idResult = parseHumanResourcesTalentPoolId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const pool: TalentPool = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				description: record.description,
				status: "open",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue31.talentPools.set(pool.id, pool);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue31.talentPoolIdempotency.set(idempotencyKey, {
				pool: { ...pool },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: pool.organizationId,
				actorUserId: pool.createdBy,
				entity: "hr_talent_pool",
				entityId: pool.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue31.talentPools.delete(pool.id);
				stateValue31.talentPoolIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...pool });
		},

		async updateTalentPool(input, ports, meta) {
			const stateValue30 = getState();
			const loaded = getTalentPoolInOrg(
				stateValue30,
				input.organizationId,
				input.poolId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const open = assertTalentPoolOpen(loaded.data.status);
			if (!open.ok) {
				return open;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentPool = {
				...loaded.data,
				name: input.name ?? loaded.data.name,
				description:
					input.description === undefined
						? loaded.data.description
						: input.description,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue30.talentPools.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool",
				entityId: input.poolId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue30.talentPools.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async closeTalentPool(input, ports, meta) {
			const stateValue29 = getState();
			const loaded = getTalentPoolInOrg(
				stateValue29,
				input.organizationId,
				input.poolId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const closable = assertTalentPoolClosable(loaded.data.status);
			if (!closable.ok) {
				return closable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentPool = {
				...loaded.data,
				status: "closed",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue29.talentPools.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool",
				entityId: input.poolId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue29.talentPools.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		// Talent pool member

		async findTalentPoolMemberByIdempotencyKey(input) {
			const stateValue28 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue28.talentPoolMemberIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, member: { ...record.member } });
		},

		async nominateTalentPoolMember(record, ports, meta) {
			const stateValue27 = getState();
			const pool = getTalentPoolInOrg(
				stateValue27,
				record.organizationId,
				record.poolId,
			);
			if (!pool.ok) {
				return pool;
			}
			const employee = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return notFound("Employee not found");
			}

			const existingMember = Array.from(
				stateValue27.talentPoolMembers.values(),
			).find(
				(memberValue) =>
					memberValue.organizationId === record.organizationId &&
					memberValue.poolId === record.poolId &&
					memberValue.employeeId === record.employeeId &&
					(memberValue.status === "nominated" ||
						memberValue.status === "approved"),
			);
			const nominatable = assertTalentPoolMemberNominatable({
				poolStatus: pool.data.status,
				existingMemberStatus: existingMember?.status ?? null,
				nominatorUserId: record.nominatorUserId,
			});
			if (!nominatable.ok) {
				return nominatable;
			}

			const idResult = parseHumanResourcesTalentPoolMemberId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const member: TalentPoolMember = {
				id: idResult.data,
				organizationId: record.organizationId,
				poolId: record.poolId,
				employeeId: record.employeeId,
				nominatorUserId: record.nominatorUserId,
				status: "nominated",
				nominatedAt: now,
				approvedAt: null,
				removedAt: null,
				approverUserId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue27.talentPoolMembers.set(member.id, member);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue27.talentPoolMemberIdempotency.set(idempotencyKey, {
				member: { ...member },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: member.organizationId,
				actorUserId: member.createdBy,
				entity: "hr_talent_pool_member",
				entityId: member.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue27.talentPoolMembers.delete(member.id);
				stateValue27.talentPoolMemberIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...member });
		},

		async approveTalentPoolMember(input, ports, meta) {
			const stateValue26 = getState();
			const loaded = getTalentPoolMemberInOrg(
				stateValue26,
				input.organizationId,
				input.memberId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const approvable = assertTalentPoolMemberApprovable({
				status: loaded.data.status,
				approverUserId: input.approverUserId,
			});
			if (!approvable.ok) {
				return approvable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentPoolMember = {
				...loaded.data,
				status: "approved",
				approvedAt: now,
				approverUserId: input.approverUserId,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue26.talentPoolMembers.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool_member",
				entityId: input.memberId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue26.talentPoolMembers.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
				entityType: "hr_talent_pool_member",
				entityId: input.memberId,
			});
			if (!outbox.ok) {
				stateValue26.talentPoolMembers.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async removeTalentPoolMember(input, ports, meta) {
			const stateValue25 = getState();
			const loaded = getTalentPoolMemberInOrg(
				stateValue25,
				input.organizationId,
				input.memberId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const removable = assertTalentPoolMemberRemovable(loaded.data.status);
			if (!removable.ok) {
				return removable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: TalentPoolMember = {
				...loaded.data,
				status: "removed",
				removedAt: now,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue25.talentPoolMembers.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool_member",
				entityId: input.memberId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue25.talentPoolMembers.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_TALENT_POOL_MEMBER_REMOVED_EVENT,
				entityType: "hr_talent_pool_member",
				entityId: input.memberId,
			});
			if (!outbox.ok) {
				stateValue25.talentPoolMembers.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async listTalentPoolMembers(input) {
			const stateValue24 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(
				stateValue24.talentPoolMembers.values(),
			).filter((member) => {
				if (member.organizationId !== input.organizationId) {
					return false;
				}
				if (member.poolId !== input.poolId) {
					return false;
				}
				if (input.status !== undefined && member.status !== input.status) {
					return false;
				}
				return true;
			});
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				members: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Career plan

		async findCareerPlanByIdempotencyKey(input) {
			const stateValue23 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue23.careerPlanIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, careerPlan: { ...record.careerPlan } });
		},

		async createCareerPlan(record, ports, meta) {
			const stateValue22 = getState();
			const employee = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return notFound("Employee not found");
			}
			const existingCode = Array.from(stateValue22.careerPlans.values()).find(
				(planValue2) =>
					planValue2.organizationId === record.organizationId &&
					planValue2.code === record.code,
			);
			if (existingCode) {
				return conflict("Career plan with this code already exists");
			}

			const idResult = parseHumanResourcesCareerPlanId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const plan: CareerPlan = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				ownerUserId: record.ownerUserId,
				code: record.code,
				title: record.title,
				status: "draft",
				acknowledgedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue22.careerPlans.set(plan.id, plan);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue22.careerPlanIdempotency.set(idempotencyKey, {
				careerPlan: { ...plan },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: plan.organizationId,
				actorUserId: plan.createdBy,
				entity: "hr_career_plan",
				entityId: plan.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue22.careerPlans.delete(plan.id);
				stateValue22.careerPlanIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...plan });
		},

		async updateCareerPlan(input, ports, meta) {
			const stateValue21 = getState();
			const loaded = getCareerPlanInOrg(
				stateValue21,
				input.organizationId,
				input.careerPlanId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const open = assertCareerPlanOpen(loaded.data.status);
			if (!open.ok) {
				return open;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: CareerPlan = {
				...loaded.data,
				title: input.title ?? loaded.data.title,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue21.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue21.careerPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async acknowledgeCareerPlan(input, ports, meta) {
			const stateValue20 = getState();
			const loaded = getCareerPlanInOrg(
				stateValue20,
				input.organizationId,
				input.careerPlanId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const acknowledgeable = assertCareerPlanAcknowledgeable(
				loaded.data.status,
			);
			if (!acknowledgeable.ok) {
				return acknowledgeable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: CareerPlan = {
				...loaded.data,
				status: "acknowledged",
				acknowledgedAt: now,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue20.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue20.careerPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
				entityType: "hr_career_plan",
				entityId: input.careerPlanId,
			});
			if (!outbox.ok) {
				stateValue20.careerPlans.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async closeCareerPlan(input, ports, meta) {
			const stateValue19 = getState();
			const loaded = getCareerPlanInOrg(
				stateValue19,
				input.organizationId,
				input.careerPlanId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const transition = assertCareerPlanStatusTransition(
				loaded.data.status,
				"closed",
			);
			if (!transition.ok) {
				return transition;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: CareerPlan = {
				...loaded.data,
				status: "closed",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue19.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue19.careerPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getCareerPlanById(input) {
			const stateValue18 = getState();
			const record = stateValue18.careerPlans.get(input.careerPlanId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			const actions = Array.from(stateValue18.careerPlanActions.values())
				.filter(
					(action) =>
						action.organizationId === input.organizationId &&
						action.careerPlanId === input.careerPlanId,
				)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map((action) => ({ ...action }));
			const withActions: CareerPlanWithActions = { ...record, actions };
			return await ok(withActions);
		},

		async listEmployeeCareerPlans(input) {
			const stateValue17 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(stateValue17.careerPlans.values()).filter(
				(plan) => {
					if (plan.organizationId !== input.organizationId) {
						return false;
					}
					if (plan.employeeId !== input.employeeId) {
						return false;
					}
					if (input.status !== undefined && plan.status !== input.status) {
						return false;
					}
					return true;
				},
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				careerPlans: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Career plan action

		async addCareerPlanAction(input, ports, meta) {
			const stateValue16 = getState();
			const plan = getCareerPlanInOrg(
				stateValue16,
				input.organizationId,
				input.careerPlanId,
			);
			if (!plan.ok) {
				return plan;
			}
			const addable = assertCareerPlanActionAddable(plan.data.status);
			if (!addable.ok) {
				return addable;
			}

			const idResult = parseHumanResourcesCareerPlanActionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const action: CareerPlanAction = {
				id: idResult.data,
				organizationId: input.organizationId,
				careerPlanId: input.careerPlanId,
				title: input.title,
				dueOn: input.dueOn,
				status: "open",
				learningAssignmentId: input.learningAssignmentId,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			stateValue16.careerPlanActions.set(action.id, action);

			const audit = await recordAudit(ports, meta, {
				organizationId: action.organizationId,
				actorUserId: action.createdBy,
				entity: "hr_career_plan_action",
				entityId: action.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue16.careerPlanActions.delete(action.id);
				return audit;
			}

			return ok({ ...action });
		},

		async completeCareerPlanAction(input, ports, meta) {
			const stateValue15 = getState();
			const loaded = getCareerPlanActionInOrg(
				stateValue15,
				input.organizationId,
				input.actionId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const completable = assertCareerPlanActionCompletable(loaded.data.status);
			if (!completable.ok) {
				return completable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: CareerPlanAction = {
				...loaded.data,
				status: "done",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue15.careerPlanActions.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan_action",
				entityId: input.actionId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue15.careerPlanActions.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getCareerPlanActionById(input) {
			const stateValue14 = getState();
			const record = stateValue14.careerPlanActions.get(input.actionId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		// Succession plan

		async findSuccessionPlanByIdempotencyKey(input) {
			const stateValue13 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue13.successionPlanIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({
				...record,
				successionPlan: { ...record.successionPlan },
			});
		},

		async createSuccessionPlan(record, ports, meta) {
			const stateValue12 = getState();
			const position = await this.getPositionById({
				organizationId: record.organizationId,
				positionId: record.positionId,
			});
			if (!position.ok) {
				return position;
			}
			if (position.data === null) {
				return notFound("Position not found");
			}
			const existingCode = Array.from(
				stateValue12.successionPlans.values(),
			).find(
				(planValue) =>
					planValue.organizationId === record.organizationId &&
					planValue.code === record.code,
			);
			if (existingCode) {
				return conflict("Succession plan with this code already exists");
			}

			const idResult = parseHumanResourcesSuccessionPlanId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const plan: SuccessionPlan = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				positionId: record.positionId,
				status: "draft",
				allowsExternalCandidates: record.allowsExternalCandidates,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue12.successionPlans.set(plan.id, plan);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue12.successionPlanIdempotency.set(idempotencyKey, {
				successionPlan: { ...plan },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: plan.organizationId,
				actorUserId: plan.createdBy,
				entity: "hr_succession_plan",
				entityId: plan.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue12.successionPlans.delete(plan.id);
				stateValue12.successionPlanIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...plan });
		},

		async updateSuccessionPlan(input, ports, meta) {
			const stateValue11 = getState();
			const loaded = getSuccessionPlanInOrg(
				stateValue11,
				input.organizationId,
				input.successionPlanId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data.status === "closed") {
				return invalidState("Succession plan is closed");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: SuccessionPlan = {
				...loaded.data,
				title: input.title ?? loaded.data.title,
				allowsExternalCandidates:
					input.allowsExternalCandidates ??
					loaded.data.allowsExternalCandidates,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue11.successionPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_plan",
				entityId: input.successionPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue11.successionPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async closeSuccessionPlan(input, ports, meta) {
			const stateValue10 = getState();
			const loaded = getSuccessionPlanInOrg(
				stateValue10,
				input.organizationId,
				input.successionPlanId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const transition = assertSuccessionPlanStatusTransition(
				loaded.data.status,
				"closed",
			);
			if (!transition.ok) {
				return transition;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: SuccessionPlan = {
				...loaded.data,
				status: "closed",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue10.successionPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_plan",
				entityId: input.successionPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue10.successionPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getSuccessionPlanById(input) {
			const stateValue9 = getState();
			const record = stateValue9.successionPlans.get(input.successionPlanId);
			if (!record || record.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...record });
		},

		async listSuccessionPlans(input) {
			const stateValue8 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(stateValue8.successionPlans.values()).filter(
				(plan) => {
					if (plan.organizationId !== input.organizationId) {
						return false;
					}
					if (
						input.positionId !== undefined &&
						plan.positionId !== input.positionId
					) {
						return false;
					}
					if (input.status !== undefined && plan.status !== input.status) {
						return false;
					}
					return true;
				},
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				successionPlans: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Succession candidate

		async findSuccessionCandidateByIdempotencyKey(input) {
			const stateValue7 = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = stateValue7.successionCandidateIdempotency.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, candidate: { ...record.candidate } });
		},

		async nominateSuccessionCandidate(record, ports, meta) {
			const stateValue6 = getState();
			const plan = getSuccessionPlanInOrg(
				stateValue6,
				record.organizationId,
				record.successionPlanId,
			);
			if (!plan.ok) {
				return plan;
			}

			const employmentStatus = await resolveSuccessionEmploymentStatus(this, {
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employmentStatus.ok) {
				return employmentStatus;
			}

			const nominatable = assertSuccessionCandidateNominatable({
				planStatus: plan.data.status,
				allowsExternalCandidates: plan.data.allowsExternalCandidates,
				employeeId: record.employeeId,
				externalCandidateRef: record.externalCandidateRef,
				employmentStatus: employmentStatus.data,
				nominatorUserId: record.nominatorUserId,
			});
			if (!nominatable.ok) {
				return nominatable;
			}

			const idResult = parseHumanResourcesSuccessionCandidateId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const candidate: SuccessionCandidate = {
				id: idResult.data,
				organizationId: record.organizationId,
				successionPlanId: record.successionPlanId,
				employeeId: record.employeeId,
				externalCandidateRef: record.externalCandidateRef,
				nominatorUserId: record.nominatorUserId,
				readiness: record.readiness,
				readinessEffectiveOn: record.readinessEffectiveOn,
				evidenceSummary: record.evidenceSummary,
				status: "nominated",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			stateValue6.successionCandidates.set(candidate.id, candidate);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			stateValue6.successionCandidateIdempotency.set(idempotencyKey, {
				candidate: { ...candidate },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: candidate.organizationId,
				actorUserId: candidate.createdBy,
				entity: "hr_succession_candidate",
				entityId: candidate.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				stateValue6.successionCandidates.delete(candidate.id);
				stateValue6.successionCandidateIdempotency.delete(idempotencyKey);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: candidate.organizationId,
				actorUserId: candidate.createdBy,
				type: HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
				entityType: "hr_succession_candidate",
				entityId: candidate.id,
			});
			if (!outbox.ok) {
				stateValue6.successionCandidates.delete(candidate.id);
				stateValue6.successionCandidateIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...candidate });
		},

		async assessSuccessionReadiness(input, ports, meta) {
			const stateValue5 = getState();
			const loaded = getSuccessionCandidateInOrg(
				stateValue5,
				input.organizationId,
				input.candidateId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const candidateActive = assertSuccessionCandidateActive(
				loaded.data.status,
			);
			if (!candidateActive.ok) {
				return candidateActive;
			}
			const validAssessment = assertReadinessAssessmentValid({
				evidenceSummary: input.evidenceSummary,
				effectiveOn: input.readinessEffectiveOn,
				todayDate: todayIsoDate(),
			});
			if (!validAssessment.ok) {
				return validAssessment;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: SuccessionCandidate = {
				...loaded.data,
				readiness: input.readiness,
				readinessEffectiveOn: input.readinessEffectiveOn,
				evidenceSummary: input.evidenceSummary,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue5.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue5.successionCandidates.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
				entityType: "hr_succession_candidate",
				entityId: input.candidateId,
			});
			if (!outbox.ok) {
				stateValue5.successionCandidates.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async approveSuccessionCandidate(input, ports, meta) {
			const stateValue4 = getState();
			const loaded = getSuccessionCandidateInOrg(
				stateValue4,
				input.organizationId,
				input.candidateId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const approvable = assertSuccessionCandidateApprovable(
				loaded.data.status,
			);
			if (!approvable.ok) {
				return approvable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: SuccessionCandidate = {
				...loaded.data,
				status: "approved",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue4.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue4.successionCandidates.set(loaded.data.id, loaded.data);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
				entityType: "hr_succession_candidate",
				entityId: input.candidateId,
			});
			if (!outbox.ok) {
				stateValue4.successionCandidates.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async removeSuccessionCandidate(input, ports, meta) {
			const stateValue3 = getState();
			const loaded = getSuccessionCandidateInOrg(
				stateValue3,
				input.organizationId,
				input.candidateId,
			);
			if (!loaded.ok) {
				return loaded;
			}
			const removable = assertSuccessionCandidateRemovable(loaded.data.status);
			if (!removable.ok) {
				return removable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: SuccessionCandidate = {
				...loaded.data,
				status: "removed",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			stateValue3.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				stateValue3.successionCandidates.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listSuccessionCandidates(input) {
			const stateValue2 = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(
				stateValue2.successionCandidates.values(),
			).filter((candidate) => {
				if (candidate.organizationId !== input.organizationId) {
					return false;
				}
				if (candidate.successionPlanId !== input.successionPlanId) {
					return false;
				}
				if (input.status !== undefined && candidate.status !== input.status) {
					return false;
				}
				return true;
			});
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return await ok({
				candidates: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		async getPositionSuccessionCoverage(input) {
			const stateValue = getState();
			const plans = Array.from(stateValue.successionPlans.values()).filter(
				(plan) =>
					plan.organizationId === input.organizationId &&
					plan.positionId === input.positionId,
			);
			const planIds = new Set(plans.map((plan) => plan.id));
			const asOfDate = todayIsoDate();

			let readyNowCandidateCount = 0;
			let readySoonCandidateCount = 0;
			let totalActiveCandidateCount = 0;

			for (const candidate of stateValue.successionCandidates.values()) {
				if (
					candidate.organizationId !== input.organizationId ||
					!planIds.has(candidate.successionPlanId)
				) {
					continue;
				}
				if (
					candidate.status !== "nominated" &&
					candidate.status !== "approved"
				) {
					continue;
				}
				totalActiveCandidateCount += 1;

				const notStale = assertReadinessNotStale({
					readinessEffectiveOn: candidate.readinessEffectiveOn,
					asOfDate,
				});
				if (!notStale.ok) {
					continue;
				}
				if (candidate.readiness === "ready_now") {
					readyNowCandidateCount += 1;
				} else if (candidate.readiness === "ready_soon") {
					readySoonCandidateCount += 1;
				}
			}

			const coverage: PositionSuccessionCoverage = {
				organizationId: input.organizationId,
				positionId: input.positionId,
				successionPlans: plans.map((plan) => ({ ...plan })),
				readyNowCandidateCount,
				readySoonCandidateCount,
				totalActiveCandidateCount,
			};
			return await ok(coverage);
		},
	};
}
