/**
 * In-memory talent domain state and attachment for HumanResourcesStore hosts.
 */

import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";

import {
	type HumanResourcesCareerPlanActionId,
	type HumanResourcesCareerPlanId,
	type HumanResourcesCompetencyAssessmentId,
	type HumanResourcesCompetencyId,
	type HumanResourcesJobCompetencyId,
	type HumanResourcesSuccessionCandidateId,
	type HumanResourcesSuccessionPlanId,
	type HumanResourcesTalentPoolId,
	type HumanResourcesTalentPoolMemberId,
	type HumanResourcesTalentProfileAssessmentId,
	type HumanResourcesTalentProfileId,
	parseHumanResourcesCareerPlanActionId,
	parseHumanResourcesCareerPlanId,
	parseHumanResourcesCompetencyAssessmentId,
	parseHumanResourcesCompetencyId,
	parseHumanResourcesJobCompetencyId,
	parseHumanResourcesSuccessionCandidateId,
	parseHumanResourcesSuccessionPlanId,
	parseHumanResourcesTalentPoolId,
	parseHumanResourcesTalentPoolMemberId,
	parseHumanResourcesTalentProfileAssessmentId,
	parseHumanResourcesTalentProfileId,
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
	assertAssessmentInputValid,
	assertAssessmentSupersedable,
	assertCareerPlanAcknowledgeable,
	assertCareerPlanActionAddable,
	assertCareerPlanActionCompletable,
	assertCareerPlanOpen,
	assertCareerPlanStatusTransition,
	assertCompetencyStatusTransition,
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
	IdempotentTalentPoolMemberRecord,
	IdempotentTalentPoolRecord,
	IdempotentTalentProfileRecord,
	JobCompetency,
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionPlan,
	TalentPool,
	TalentPoolMember,
	TalentProfile,
	TalentProfileAssessment,
} from "../../types";
import { idempotencyMapKey } from "./shared";

export type TalentMemoryState = {
	competencies: Map<HumanResourcesCompetencyId, Competency>;
	competencyIdempotency: Map<string, IdempotentCompetencyRecord>;
	jobCompetencies: Map<HumanResourcesJobCompetencyId, JobCompetency>;
	competencyAssessments: Map<
		HumanResourcesCompetencyAssessmentId,
		CompetencyAssessment
	>;
	competencyAssessmentIdempotency: Map<
		string,
		IdempotentCompetencyAssessmentRecord
	>;
	talentProfiles: Map<HumanResourcesTalentProfileId, TalentProfile>;
	talentProfileIdempotency: Map<string, IdempotentTalentProfileRecord>;
	talentProfileAssessments: Map<
		HumanResourcesTalentProfileAssessmentId,
		TalentProfileAssessment
	>;
	talentPools: Map<HumanResourcesTalentPoolId, TalentPool>;
	talentPoolIdempotency: Map<string, IdempotentTalentPoolRecord>;
	talentPoolMembers: Map<HumanResourcesTalentPoolMemberId, TalentPoolMember>;
	talentPoolMemberIdempotency: Map<string, IdempotentTalentPoolMemberRecord>;
	careerPlans: Map<HumanResourcesCareerPlanId, CareerPlan>;
	careerPlanIdempotency: Map<string, IdempotentCareerPlanRecord>;
	careerPlanActions: Map<HumanResourcesCareerPlanActionId, CareerPlanAction>;
	successionPlans: Map<HumanResourcesSuccessionPlanId, SuccessionPlan>;
	successionPlanIdempotency: Map<string, IdempotentSuccessionPlanRecord>;
	successionCandidates: Map<
		HumanResourcesSuccessionCandidateId,
		SuccessionCandidate
	>;
	successionCandidateIdempotency: Map<
		string,
		IdempotentSuccessionCandidateRecord
	>;
};

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
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
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
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
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

export function createMemoryTalentMethods(
	state: TalentMemoryState,
): MemoryTalentMethods & ThisType<TalentHost & MemoryTalentMethods> {
	const getState = () => state;
	return {
		// Competency

		async getCompetencyById(input) {
			const state = getState();
			const record = state.competencies.get(input.competencyId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findCompetencyByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.competencyIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, competency: { ...record.competency } });
		},

		async createCompetency(record, ports, meta) {
			const state = getState();
			const existingCode = Array.from(state.competencies.values()).find(
				(competency) =>
					competency.organizationId === record.organizationId &&
					competency.code === record.code,
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
			state.competencies.set(competency.id, competency);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.competencyIdempotency.set(idempotencyKey, {
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
				state.competencies.delete(competency.id);
				state.competencyIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...competency });
		},

		async updateCompetency(input, ports, meta) {
			const state = getState();
			const loaded = getCompetencyInOrg(
				state,
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
					input.description !== undefined
						? input.description
						: loaded.data.description,
				category:
					input.category !== undefined ? input.category : loaded.data.category,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.competencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_competency",
				entityId: input.competencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.competencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async retireCompetency(input, ports, meta) {
			const state = getState();
			const loaded = getCompetencyInOrg(
				state,
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
			state.competencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_competency",
				entityId: input.competencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.competencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listCompetencies(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.competencies.values()).filter(
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
			return ok({
				competencies: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Job competency

		async mapCompetencyToJob(input, ports, meta) {
			const state = getState();
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
				state,
				input.organizationId,
				input.competencyId,
			);
			if (!competency.ok) {
				return competency;
			}

			const existingMapping = Array.from(state.jobCompetencies.values()).find(
				(mapping) =>
					mapping.organizationId === input.organizationId &&
					mapping.jobId === input.jobId &&
					mapping.competencyId === input.competencyId &&
					mapping.status === "active",
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
			state.jobCompetencies.set(mapping.id, mapping);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_job_competency",
				entityId: mapping.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.jobCompetencies.delete(mapping.id);
				return audit;
			}

			return ok({ ...mapping });
		},

		async removeCompetencyFromJob(input, ports, meta) {
			const state = getState();
			const loaded = getJobCompetencyInOrg(
				state,
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
			state.jobCompetencies.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_job_competency",
				entityId: input.jobCompetencyId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.jobCompetencies.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listJobCompetencies(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.jobCompetencies.values()).filter(
				(mapping) =>
					mapping.organizationId === input.organizationId &&
					mapping.jobId === input.jobId,
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return ok({
				jobCompetencies: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Competency assessment

		async getCompetencyAssessmentById(input) {
			const state = getState();
			const record = state.competencyAssessments.get(input.assessmentId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findCurrentCompetencyAssessment(input) {
			const state = getState();
			const record = Array.from(state.competencyAssessments.values()).find(
				(assessment) =>
					assessment.organizationId === input.organizationId &&
					assessment.employeeId === input.employeeId &&
					assessment.competencyId === input.competencyId &&
					assessment.status === "current",
			);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findCompetencyAssessmentByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.competencyAssessmentIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, assessment: { ...record.assessment } });
		},

		async createCompetencyAssessment(record, ports, meta) {
			const state = getState();
			const competency = getCompetencyInOrg(
				state,
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
				todayDate: todayIsoDate(),
			});
			if (!validInput.ok) {
				return validInput;
			}

			const existingCurrent = Array.from(
				state.competencyAssessments.values(),
			).find(
				(assessment) =>
					assessment.organizationId === record.organizationId &&
					assessment.employeeId === record.employeeId &&
					assessment.competencyId === record.competencyId &&
					assessment.status === "current",
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
				status: "current",
				supersedesAssessmentId: null,
				supersededByAssessmentId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.competencyAssessments.set(assessment.id, assessment);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.competencyAssessmentIdempotency.set(idempotencyKey, {
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
				state.competencyAssessments.delete(assessment.id);
				state.competencyAssessmentIdempotency.delete(idempotencyKey);
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
				state.competencyAssessments.delete(assessment.id);
				state.competencyAssessmentIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...assessment });
		},

		async supersedeCompetencyAssessment(record, ports, meta) {
			const state = getState();
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existingByKey =
				state.competencyAssessmentIdempotency.get(idempotencyKey);
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
				return ok({ ...existingByKey.assessment });
			}

			const source = getCompetencyAssessmentInOrg(
				state,
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
				state,
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
			state.competencyAssessments.set(superseded.id, superseded);

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
				status: "current",
				supersedesAssessmentId: source.data.id,
				supersededByAssessmentId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.competencyAssessments.set(assessment.id, assessment);

			state.competencyAssessmentIdempotency.set(idempotencyKey, {
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
				state.competencyAssessments.set(source.data.id, source.data);
				state.competencyAssessments.delete(assessment.id);
				state.competencyAssessmentIdempotency.delete(idempotencyKey);
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
				state.competencyAssessments.set(source.data.id, source.data);
				state.competencyAssessments.delete(assessment.id);
				state.competencyAssessmentIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...assessment });
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
			const state = getState();
			const assessments = Array.from(state.competencyAssessments.values())
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
			const state = getState();
			const record = state.talentProfiles.get(input.talentProfileId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findTalentProfileByEmployeeId(input) {
			const state = getState();
			const record = Array.from(state.talentProfiles.values()).find(
				(profile) =>
					profile.organizationId === input.organizationId &&
					profile.employeeId === input.employeeId,
			);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findTalentProfileByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.talentProfileIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, profile: { ...record.profile } });
		},

		async createTalentProfile(record, ports, meta) {
			const state = getState();
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
			const existing = Array.from(state.talentProfiles.values()).find(
				(profile) =>
					profile.organizationId === record.organizationId &&
					profile.employeeId === record.employeeId,
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
			state.talentProfiles.set(profile.id, profile);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.talentProfileIdempotency.set(idempotencyKey, {
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
				state.talentProfiles.delete(profile.id);
				state.talentProfileIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...profile });
		},

		async updateTalentProfile(input, ports, meta) {
			const state = getState();
			const loaded = getTalentProfileInOrg(
				state,
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
					input.summary !== undefined ? input.summary : loaded.data.summary,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.talentProfiles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile",
				entityId: input.talentProfileId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentProfiles.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async archiveTalentProfile(input, ports, meta) {
			const state = getState();
			const loaded = getTalentProfileInOrg(
				state,
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
			state.talentProfiles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile",
				entityId: input.talentProfileId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentProfiles.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getTalentProfileByEmployee(input) {
			const state = getState();
			const record = Array.from(state.talentProfiles.values()).find(
				(profile) =>
					profile.organizationId === input.organizationId &&
					profile.employeeId === input.employeeId,
			);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record });
		},

		// Talent profile assessment

		async recordTalentProfileAssessment(input, ports, meta) {
			const state = getState();
			const profile = getTalentProfileInOrg(
				state,
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
			state.talentProfileAssessments.set(assessment.id, assessment);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile_assessment",
				entityId: assessment.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.talentProfileAssessments.delete(assessment.id);
				return audit;
			}

			return ok({ ...assessment });
		},

		async confirmTalentProfileAssessment(input, ports, meta) {
			const state = getState();
			const loaded = getTalentProfileAssessmentInOrg(
				state,
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
				state,
				input.organizationId,
				loaded.data.talentProfileId,
			);
			if (!profile.ok) {
				return profile;
			}

			const now = new Date();
			const previouslyConfirmed = Array.from(
				state.talentProfileAssessments.values(),
			).filter(
				(assessment) =>
					assessment.organizationId === input.organizationId &&
					assessment.talentProfileId === loaded.data.talentProfileId &&
					assessment.status === "confirmed",
			);
			for (const assessment of previouslyConfirmed) {
				state.talentProfileAssessments.set(assessment.id, {
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
			state.talentProfileAssessments.set(updated.id, updated);

			const updatedProfile: TalentProfile = {
				...profile.data,
				currentClassification: updated.classification,
				version: profile.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.talentProfiles.set(updatedProfile.id, updatedProfile);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_profile_assessment",
				entityId: input.assessmentId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentProfileAssessments.set(loaded.data.id, loaded.data);
				state.talentProfiles.set(profile.data.id, profile.data);
				for (const assessment of previouslyConfirmed) {
					state.talentProfileAssessments.set(assessment.id, assessment);
				}
				return audit;
			}

			return ok({ ...updated });
		},

		// Talent pool

		async getTalentPoolById(input) {
			const state = getState();
			const record = state.talentPools.get(input.poolId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async findTalentPoolByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.talentPoolIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, pool: { ...record.pool } });
		},

		async createTalentPool(record, ports, meta) {
			const state = getState();
			const existingCode = Array.from(state.talentPools.values()).find(
				(pool) =>
					pool.organizationId === record.organizationId &&
					pool.code === record.code,
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
			state.talentPools.set(pool.id, pool);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.talentPoolIdempotency.set(idempotencyKey, {
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
				state.talentPools.delete(pool.id);
				state.talentPoolIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...pool });
		},

		async updateTalentPool(input, ports, meta) {
			const state = getState();
			const loaded = getTalentPoolInOrg(
				state,
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
					input.description !== undefined
						? input.description
						: loaded.data.description,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.talentPools.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool",
				entityId: input.poolId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentPools.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async closeTalentPool(input, ports, meta) {
			const state = getState();
			const loaded = getTalentPoolInOrg(
				state,
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
			state.talentPools.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool",
				entityId: input.poolId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentPools.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		// Talent pool member

		async findTalentPoolMemberByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.talentPoolMemberIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, member: { ...record.member } });
		},

		async nominateTalentPoolMember(record, ports, meta) {
			const state = getState();
			const pool = getTalentPoolInOrg(
				state,
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

			const existingMember = Array.from(state.talentPoolMembers.values()).find(
				(member) =>
					member.organizationId === record.organizationId &&
					member.poolId === record.poolId &&
					member.employeeId === record.employeeId &&
					(member.status === "nominated" || member.status === "approved"),
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
			state.talentPoolMembers.set(member.id, member);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.talentPoolMemberIdempotency.set(idempotencyKey, {
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
				state.talentPoolMembers.delete(member.id);
				state.talentPoolMemberIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...member });
		},

		async approveTalentPoolMember(input, ports, meta) {
			const state = getState();
			const loaded = getTalentPoolMemberInOrg(
				state,
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
			state.talentPoolMembers.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool_member",
				entityId: input.memberId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentPoolMembers.set(loaded.data.id, loaded.data);
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
				state.talentPoolMembers.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async removeTalentPoolMember(input, ports, meta) {
			const state = getState();
			const loaded = getTalentPoolMemberInOrg(
				state,
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
			state.talentPoolMembers.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_talent_pool_member",
				entityId: input.memberId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.talentPoolMembers.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listTalentPoolMembers(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.talentPoolMembers.values()).filter(
				(member) => {
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
				},
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return ok({
				members: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Career plan

		async findCareerPlanByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.careerPlanIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, careerPlan: { ...record.careerPlan } });
		},

		async createCareerPlan(record, ports, meta) {
			const state = getState();
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
			const existingCode = Array.from(state.careerPlans.values()).find(
				(plan) =>
					plan.organizationId === record.organizationId &&
					plan.code === record.code,
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
			state.careerPlans.set(plan.id, plan);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.careerPlanIdempotency.set(idempotencyKey, {
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
				state.careerPlans.delete(plan.id);
				state.careerPlanIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...plan });
		},

		async updateCareerPlan(input, ports, meta) {
			const state = getState();
			const loaded = getCareerPlanInOrg(
				state,
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
			state.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.careerPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async acknowledgeCareerPlan(input, ports, meta) {
			const state = getState();
			const loaded = getCareerPlanInOrg(
				state,
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
			state.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.careerPlans.set(loaded.data.id, loaded.data);
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
				state.careerPlans.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async closeCareerPlan(input, ports, meta) {
			const state = getState();
			const loaded = getCareerPlanInOrg(
				state,
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
			state.careerPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan",
				entityId: input.careerPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.careerPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getCareerPlanById(input) {
			const state = getState();
			const record = state.careerPlans.get(input.careerPlanId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			const actions = Array.from(state.careerPlanActions.values())
				.filter(
					(action) =>
						action.organizationId === input.organizationId &&
						action.careerPlanId === input.careerPlanId,
				)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.map((action) => ({ ...action }));
			const withActions: CareerPlanWithActions = { ...record, actions };
			return ok(withActions);
		},

		async listEmployeeCareerPlans(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.careerPlans.values()).filter((plan) => {
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
			});
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return ok({
				careerPlans: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Career plan action

		async addCareerPlanAction(input, ports, meta) {
			const state = getState();
			const plan = getCareerPlanInOrg(
				state,
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
			state.careerPlanActions.set(action.id, action);

			const audit = await recordAudit(ports, meta, {
				organizationId: action.organizationId,
				actorUserId: action.createdBy,
				entity: "hr_career_plan_action",
				entityId: action.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.careerPlanActions.delete(action.id);
				return audit;
			}

			return ok({ ...action });
		},

		async completeCareerPlanAction(input, ports, meta) {
			const state = getState();
			const loaded = getCareerPlanActionInOrg(
				state,
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
			state.careerPlanActions.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_career_plan_action",
				entityId: input.actionId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.careerPlanActions.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getCareerPlanActionById(input) {
			const state = getState();
			const record = state.careerPlanActions.get(input.actionId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		// Succession plan

		async findSuccessionPlanByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.successionPlanIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({
				...record,
				successionPlan: { ...record.successionPlan },
			});
		},

		async createSuccessionPlan(record, ports, meta) {
			const state = getState();
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
			const existingCode = Array.from(state.successionPlans.values()).find(
				(plan) =>
					plan.organizationId === record.organizationId &&
					plan.code === record.code,
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
			state.successionPlans.set(plan.id, plan);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.successionPlanIdempotency.set(idempotencyKey, {
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
				state.successionPlans.delete(plan.id);
				state.successionPlanIdempotency.delete(idempotencyKey);
				return audit;
			}

			return ok({ ...plan });
		},

		async updateSuccessionPlan(input, ports, meta) {
			const state = getState();
			const loaded = getSuccessionPlanInOrg(
				state,
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
			state.successionPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_plan",
				entityId: input.successionPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.successionPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async closeSuccessionPlan(input, ports, meta) {
			const state = getState();
			const loaded = getSuccessionPlanInOrg(
				state,
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
			state.successionPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_plan",
				entityId: input.successionPlanId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.successionPlans.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async getSuccessionPlanById(input) {
			const state = getState();
			const record = state.successionPlans.get(input.successionPlanId);
			if (!record || record.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...record });
		},

		async listSuccessionPlans(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.successionPlans.values()).filter(
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
			return ok({
				successionPlans: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		// Succession candidate

		async findSuccessionCandidateByIdempotencyKey(input) {
			const state = getState();
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.successionCandidateIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, candidate: { ...record.candidate } });
		},

		async nominateSuccessionCandidate(record, ports, meta) {
			const state = getState();
			const plan = getSuccessionPlanInOrg(
				state,
				record.organizationId,
				record.successionPlanId,
			);
			if (!plan.ok) {
				return plan;
			}

			let employmentStatus: EmploymentStatus | null = null;
			if (record.employeeId !== null) {
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
				const employment = await this.findOpenEmploymentByEmployee({
					organizationId: record.organizationId,
					employeeId: record.employeeId,
				});
				if (!employment.ok) {
					return employment;
				}
				employmentStatus = employment.data?.status ?? null;
			}

			const nominatable = assertSuccessionCandidateNominatable({
				planStatus: plan.data.status,
				allowsExternalCandidates: plan.data.allowsExternalCandidates,
				employeeId: record.employeeId,
				externalCandidateRef: record.externalCandidateRef,
				employmentStatus,
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
			state.successionCandidates.set(candidate.id, candidate);

			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.successionCandidateIdempotency.set(idempotencyKey, {
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
				state.successionCandidates.delete(candidate.id);
				state.successionCandidateIdempotency.delete(idempotencyKey);
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
				state.successionCandidates.delete(candidate.id);
				state.successionCandidateIdempotency.delete(idempotencyKey);
				return outbox;
			}

			return ok({ ...candidate });
		},

		async assessSuccessionReadiness(input, ports, meta) {
			const state = getState();
			const loaded = getSuccessionCandidateInOrg(
				state,
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
			state.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.successionCandidates.set(loaded.data.id, loaded.data);
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
				state.successionCandidates.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async approveSuccessionCandidate(input, ports, meta) {
			const state = getState();
			const loaded = getSuccessionCandidateInOrg(
				state,
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
			state.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.successionCandidates.set(loaded.data.id, loaded.data);
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
				state.successionCandidates.set(loaded.data.id, loaded.data);
				return outbox;
			}

			return ok({ ...updated });
		},

		async removeSuccessionCandidate(input, ports, meta) {
			const state = getState();
			const loaded = getSuccessionCandidateInOrg(
				state,
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
			state.successionCandidates.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_succession_candidate",
				entityId: input.candidateId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.successionCandidates.set(loaded.data.id, loaded.data);
				return audit;
			}

			return ok({ ...updated });
		},

		async listSuccessionCandidates(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.successionCandidates.values()).filter(
				(candidate) => {
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
				},
			);
			const { items, totalCount } = paginate(filtered, page, pageSize);
			return ok({
				candidates: items.map((item) => ({ ...item })),
				totalCount,
				page,
				pageSize,
			});
		},

		async getPositionSuccessionCoverage(input) {
			const state = getState();
			const plans = Array.from(state.successionPlans.values()).filter(
				(plan) =>
					plan.organizationId === input.organizationId &&
					plan.positionId === input.positionId,
			);
			const planIds = new Set(plans.map((plan) => plan.id));
			const asOfDate = todayIsoDate();

			let readyNowCandidateCount = 0;
			let readySoonCandidateCount = 0;
			let totalActiveCandidateCount = 0;

			for (const candidate of state.successionCandidates.values()) {
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
			return ok(coverage);
		},
	};
}
