import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEventType } from "@afenda/events";
import {
	HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT,
	HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT,
	HUMAN_RESOURCES_JOB_ACTIVATED_EVENT,
	HUMAN_RESOURCES_JOB_ARCHIVED_EVENT,
	HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT,
	HUMAN_RESOURCES_POSITION_CLOSED_EVENT,
	HUMAN_RESOURCES_POSITION_FROZEN_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT,
} from "@afenda/events/schemas";
import type {
	DepartmentCreateRecord,
	HumanResourcesStore,
	JobCreateRecord,
	PositionCreateRecord,
	ReportingLineCreateRecord,
} from "../../../composition/store/index";
import type {
	Department,
	Job,
	OrganizationTreePage,
	Position,
	ReportingLine,
} from "../../../kernel/contracts";
import { buildHumanResourcesEntityEventPayload } from "../../../kernel/emissions/audit-facts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { assertExpectedVersion } from "../../../kernel/execution/concurrency";
import {
	conflict,
	invalidInput,
	notFound,
} from "../../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import type { MutationPorts } from "../../../kernel/execution/ports";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../../kernel/execution/run-sequential";
import {
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesJobId,
	type HumanResourcesPositionId,
	type HumanResourcesReportingLineId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
	parseHumanResourcesReportingLineId,
} from "../../../kernel/identity/brands";
import { previousIsoDate } from "../../../kernel/temporal/effective-dates";
import { resolveUniqueEffectiveRangeRecordBy } from "../../../kernel/temporal/effective-range";
import type { CoreMemoryState } from "../../workforce-records/employment/adapters/core.memory";
import {
	assertValidDateRange,
	type DepartmentStatus,
	type JobStatus,
	type PositionStatus,
	positionStatusSchema,
} from "../../workforce-records/employment/employment-status";
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../../workforce-records/identity/lineage-segment";
import {
	assertActiveDepartment,
	assertActiveJob,
	assertDepartmentParentAcyclic,
	assertDepartmentStatusTransition,
	assertJobStatusTransition,
	assertNoPrimaryReportingOverlap,
	assertPositionStatusTransition,
	assertReportingLineAcyclic,
	buildBoundedDepartmentTree as buildOrganizationTree,
} from "../guards";
import {
	type DepartmentStructureVersion,
	findOpenDepartmentStructureVersion,
	findOpenJobDefinitionVersion,
	findOpenPositionDefinitionVersion,
	type JobDefinitionVersion,
	type PositionDefinitionAtAsOf,
	type PositionDefinitionVersion,
	resolveDepartmentStructureAsOf,
	resolveJobDefinitionAsOf,
	resolvePositionDefinitionAsOf,
} from "../organization-structure-lineage";

export interface OrganizationMemoryState {
	departmentStructureVersions: Map<string, DepartmentStructureVersion>;
	departments: Map<HumanResourcesDepartmentId, Department>;
	jobDefinitionVersions: Map<string, JobDefinitionVersion>;
	jobs: Map<HumanResourcesJobId, Job>;
	positionDefinitionVersions: Map<string, PositionDefinitionVersion>;
	positions: Map<HumanResourcesPositionId, Position>;
	reportingLines: Map<HumanResourcesReportingLineId, ReportingLine>;
}

export type MemoryOrganizationMethods = Pick<
	HumanResourcesStore,
	| "getDepartmentById"
	| "findDepartmentByCode"
	| "createDepartment"
	| "updateDepartment"
	| "setDepartmentStatus"
	| "listDepartments"
	| "listAllDepartments"
	| "getJobById"
	| "findJobByCode"
	| "createJob"
	| "updateJob"
	| "setJobStatus"
	| "listJobs"
	| "getPositionById"
	| "findPositionByCode"
	| "createPosition"
	| "updatePosition"
	| "setPositionStatus"
	| "listPositions"
	| "countActiveOrFrozenPositionsForDepartment"
	| "countActiveOrFrozenPositionsForJob"
	| "countActiveChildDepartments"
	| "getReportingLineById"
	| "listReportingLinesForEmployee"
	| "findOpenPrimaryReportingLine"
	| "resolvePrimaryManager"
	| "listDirectReports"
	| "assignPrimaryReportingLine"
	| "closeReportingLine"
	| "replacePrimaryReportingLine"
	| "getOrganizationTree"
	| "findDepartmentAsOf"
	| "findJobAsOf"
	| "findPositionAsOf"
	| "getOrganizationTreeAsOf"
>;

export type OrganizationMemoryHost = Pick<
	HumanResourcesStore,
	"getEmployeeById" | "countOpenAssignmentsForPosition"
>;

export function createOrganizationMemoryState(): OrganizationMemoryState {
	return {
		departments: new Map(),
		jobs: new Map(),
		positions: new Map(),
		reportingLines: new Map(),
		departmentStructureVersions: new Map(),
		jobDefinitionVersions: new Map(),
		positionDefinitionVersions: new Map(),
	};
}

export function resetOrganizationMemoryState(
	state: OrganizationMemoryState,
): void {
	state.departments.clear();
	state.jobs.clear();
	state.positions.clear();
	state.reportingLines.clear();
	state.departmentStructureVersions.clear();
	state.jobDefinitionVersions.clear();
	state.positionDefinitionVersions.clear();
}

async function appendOrganizationDomainEvent(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		entityType: string;
		entityId: string;
		eventType: HumanResourcesEventType;
	},
): Promise<Result<void>> {
	const outbox = await ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.eventType,
		payload: buildHumanResourcesEntityEventPayload({
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		}),
	});
	if (!outbox.ok) {
		return outbox;
	}
	return errorResult.ok(undefined);
}

async function assertJobHasNoActivePositionsWhenArchiving(
	host: Pick<HumanResourcesStore, "countActiveOrFrozenPositionsForJob">,
	input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
		status: JobStatus;
	},
): Promise<Result<void>> {
	if (input.status !== "archived") {
		return errorResult.ok(undefined);
	}
	const positionCount = await host.countActiveOrFrozenPositionsForJob(input);
	if (!positionCount.ok) {
		return positionCount;
	}
	return positionCount.data > 0
		? conflict("Cannot archive job with active or frozen positions")
		: errorResult.ok(undefined);
}

const JOB_STATUS_EVENTS: Partial<Record<JobStatus, HumanResourcesEventType>> = {
	active: HUMAN_RESOURCES_JOB_ACTIVATED_EVENT,
	archived: HUMAN_RESOURCES_JOB_ARCHIVED_EVENT,
};

function appendJobStatusEvent(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		jobId: HumanResourcesJobId;
		status: JobStatus;
	},
): Promise<Result<void>> {
	const eventType = JOB_STATUS_EVENTS[input.status];
	return eventType === undefined
		? Promise.resolve(errorResult.ok(undefined))
		: appendOrganizationDomainEvent(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entityType: "hr_job",
				entityId: input.jobId,
				eventType,
			});
}

export function createMemoryOrganizationMethods(
	state: OrganizationMemoryState,
	core: CoreMemoryState,
): MemoryOrganizationMethods &
	ThisType<OrganizationMemoryHost & MemoryOrganizationMethods> {
	return {
		async getDepartmentById(input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
		}): Promise<Result<Department | null>> {
			const department = state.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...department });
		},

		async findDepartmentByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Department | null>> {
			const sequentialOutcome1 = await runSequential(
				state.departments.values(),
				async (department) => {
					if (
						department.organizationId === input.organizationId &&
						department.code === input.code
					) {
						return sequentialReturn(await errorResult.ok({ ...department }));
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return await errorResult.ok(null);
		},

		async createDepartment(
			record: DepartmentCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Department>> {
			const existing = await this.findDepartmentByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}

			if (record.parentDepartmentId !== null) {
				const parent = state.departments.get(record.parentDepartmentId);
				if (!parent || parent.organizationId !== record.organizationId) {
					return notFound(
						"Parent department not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				const activeParent = assertActiveDepartment(parent.status);
				if (!activeParent.ok) {
					return activeParent;
				}
			}

			const idResult = parseHumanResourcesDepartmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const effectiveFrom = now.toISOString().slice(0, 10);
			const department: Department = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				parentDepartmentId: record.parentDepartmentId,
				status: record.status,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const structureVersion: DepartmentStructureVersion = {
				id: randomUUID(),
				organizationId: record.organizationId,
				departmentId: department.id,
				name: department.name,
				parentDepartmentId: department.parentDepartmentId,
				effectiveFrom,
				effectiveTo: null,
				supersedesStructureVersionId: null,
				lineageStatus: "active",
				reasonCode: "initial_record",
				evidenceRef: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.departments.set(department.id, department);
			state.departmentStructureVersions.set(
				structureVersion.id,
				structureVersion,
			);

			const audit = await ports.audit.record({
				organizationId: department.organizationId,
				actorUserId: department.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_department",
				entityId: department.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.departments.delete(department.id);
				state.departmentStructureVersions.delete(structureVersion.id);
				return audit;
			}

			return errorResult.ok({ ...department });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async updateDepartment(
			input: {
				organizationId: string;
				departmentId: HumanResourcesDepartmentId;
				name?: string | undefined;
				parentDepartmentId?: HumanResourcesDepartmentId | null | undefined;
				effectiveOn: string;
				reasonCode: string;
				evidenceRef?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Department>> {
			const department = state.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return notFound("Department not found");
			}

			const versionCheck = assertExpectedVersion(
				department.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const nextName = input.name === undefined ? department.name : input.name;
			const nextParent =
				input.parentDepartmentId === undefined
					? department.parentDepartmentId
					: input.parentDepartmentId;

			if (
				nextName === department.name &&
				nextParent === department.parentDepartmentId
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const openSegment = findOpenDepartmentStructureVersion(
				[...state.departmentStructureVersions.values()],
				input.organizationId,
				input.departmentId,
			);
			if (openSegment === null) {
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const mutableCheck = assertLineageSegmentMutable(openSegment);
			if (!mutableCheck.ok) {
				return mutableCheck;
			}

			const effectiveOnCheck = validateLineageSegmentEffectiveOn({
				openEffectiveFrom: openSegment.effectiveFrom,
				effectiveOn: input.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return effectiveOnCheck;
			}

			if (nextParent !== null) {
				const parent = state.departments.get(nextParent);
				if (!parent || parent.organizationId !== input.organizationId) {
					return notFound(
						"Parent department not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				const activeParent = assertActiveDepartment(parent.status);
				if (!activeParent.ok) {
					return activeParent;
				}
			}

			const cycleCheck = assertDepartmentParentAcyclic({
				departmentId: input.departmentId,
				proposedParentId: nextParent,
				getParentId: (id) => {
					const dept = state.departments.get(id);
					if (!dept || dept.organizationId !== input.organizationId) {
						return;
					}
					return dept.parentDepartmentId;
				},
			});
			if (!cycleCheck.ok) {
				return cycleCheck;
			}

			const now = new Date();
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const closedPredecessor: DepartmentStructureVersion = {
				...openSegment,
				effectiveTo: predecessorEnd,
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: DepartmentStructureVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				departmentId: input.departmentId,
				name: nextName,
				parentDepartmentId: nextParent,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesStructureVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef ?? null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updated: Department = {
				...department,
				name: nextName,
				parentDepartmentId: nextParent,
				version: department.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.departmentStructureVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.departmentStructureVersions.set(successor.id, successor);
			state.departments.set(input.departmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_department",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.departmentStructureVersions.set(openSegment.id, openSegment);
				state.departmentStructureVersions.delete(successor.id);
				state.departments.set(input.departmentId, department);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async setDepartmentStatus(
			input: {
				organizationId: string;
				departmentId: HumanResourcesDepartmentId;
				status: DepartmentStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Department>> {
			const department = state.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return notFound("Department not found");
			}

			const versionCheck = assertExpectedVersion(
				department.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertDepartmentStatusTransition(
				department.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			if (input.status === "archived") {
				const childCount = await this.countActiveChildDepartments({
					organizationId: input.organizationId,
					parentDepartmentId: input.departmentId,
				});
				if (!childCount.ok) {
					return childCount;
				}
				if (childCount.data > 0) {
					return conflict(
						"Cannot archive department with active child departments",
					);
				}

				const positionCount =
					await this.countActiveOrFrozenPositionsForDepartment({
						organizationId: input.organizationId,
						departmentId: input.departmentId,
					});
				if (!positionCount.ok) {
					return positionCount;
				}
				if (positionCount.data > 0) {
					return conflict(
						"Cannot archive department with active or frozen positions",
					);
				}
			}

			const now = new Date();
			const updated: Department = {
				...department,
				status: input.status,
				version: department.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.departments.set(input.departmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_department",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.departments.set(input.departmentId, department);
				return audit;
			}

			const departmentEventType = (() => {
				if (input.status === "active") {
					return HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT;
				}
				if (input.status === "archived") {
					return HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT;
				}
				return null;
			})();
			if (departmentEventType) {
				const outbox = await appendOrganizationDomainEvent(ports, meta, {
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					entityType: "hr_department",
					entityId: updated.id,
					eventType: departmentEventType,
				});
				if (!outbox.ok) {
					state.departments.set(input.departmentId, department);
					return outbox;
				}
			}

			return errorResult.ok({ ...updated });
		},

		async listDepartments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: DepartmentStatus | undefined;
			parentDepartmentId?: HumanResourcesDepartmentId | null | undefined;
		}): Promise<Result<{ departments: Department[]; totalCount: number }>> {
			let filtered = Array.from(state.departments.values()).filter(
				(d) => d.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((d) => d.status === input.status);
			}
			if (input.parentDepartmentId !== undefined) {
				filtered = filtered.filter(
					(d) => d.parentDepartmentId === input.parentDepartmentId,
				);
			}

			filtered.sort((a, b) => a.code.localeCompare(b.code));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const departments = filtered
				.slice(start, start + input.pageSize)
				.map((d) => ({ ...d }));

			return await errorResult.ok({ departments, totalCount });
		},

		async listAllDepartments(input: {
			organizationId: string;
		}): Promise<Result<Department[]>> {
			const departments = Array.from(state.departments.values())
				.filter((d) => d.organizationId === input.organizationId)
				.map((d) => ({ ...d }));
			departments.sort((a, b) => a.code.localeCompare(b.code));
			return await errorResult.ok(departments);
		},

		// Job methods
		async getJobById(input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
		}): Promise<Result<Job | null>> {
			const job = state.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...job });
		},

		async findJobByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Job | null>> {
			const sequentialOutcome2 = await runSequential(
				state.jobs.values(),
				async (job) => {
					if (
						job.organizationId === input.organizationId &&
						job.code === input.code
					) {
						return sequentialReturn(await errorResult.ok({ ...job }));
					}
				},
			);
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}
			return await errorResult.ok(null);
		},

		async createJob(
			record: JobCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Job>> {
			const existing = await this.findJobByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}

			const idResult = parseHumanResourcesJobId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const effectiveFrom = now.toISOString().slice(0, 10);
			const job: Job = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				status: record.status,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const definitionVersion: JobDefinitionVersion = {
				id: randomUUID(),
				organizationId: record.organizationId,
				jobId: job.id,
				title: job.title,
				effectiveFrom,
				effectiveTo: null,
				supersedesDefinitionVersionId: null,
				lineageStatus: "active",
				reasonCode: "initial_record",
				evidenceRef: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.jobs.set(job.id, job);
			state.jobDefinitionVersions.set(definitionVersion.id, definitionVersion);

			const audit = await ports.audit.record({
				organizationId: job.organizationId,
				actorUserId: job.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_job",
				entityId: job.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.jobs.delete(job.id);
				return audit;
			}

			return errorResult.ok({ ...job });
		},

		async updateJob(
			input: {
				organizationId: string;
				jobId: HumanResourcesJobId;
				title: string;
				effectiveOn: string;
				reasonCode: string;
				evidenceRef?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Job>> {
			const job = state.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return notFound("Job not found");
			}

			const versionCheck = assertExpectedVersion(
				job.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			if (input.title === job.title) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const openSegment = findOpenJobDefinitionVersion(
				[...state.jobDefinitionVersions.values()],
				input.organizationId,
				input.jobId,
			);
			if (openSegment === null) {
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const mutableCheck = assertLineageSegmentMutable(openSegment);
			if (!mutableCheck.ok) {
				return mutableCheck;
			}

			const effectiveOnCheck = validateLineageSegmentEffectiveOn({
				openEffectiveFrom: openSegment.effectiveFrom,
				effectiveOn: input.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return effectiveOnCheck;
			}

			const now = new Date();
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const closedPredecessor: JobDefinitionVersion = {
				...openSegment,
				effectiveTo: predecessorEnd,
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: JobDefinitionVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				jobId: input.jobId,
				title: input.title,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesDefinitionVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef ?? null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updated: Job = {
				...job,
				title: input.title,
				version: job.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.jobDefinitionVersions.set(closedPredecessor.id, closedPredecessor);
			state.jobDefinitionVersions.set(successor.id, successor);
			state.jobs.set(input.jobId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_job",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.jobDefinitionVersions.set(openSegment.id, openSegment);
				state.jobDefinitionVersions.delete(successor.id);
				state.jobs.set(input.jobId, job);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async setJobStatus(
			input: {
				organizationId: string;
				jobId: HumanResourcesJobId;
				status: JobStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Job>> {
			const job = state.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return notFound("Job not found");
			}

			const versionCheck = assertExpectedVersion(
				job.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertJobStatusTransition(job.status, input.status);
			if (!transition.ok) {
				return transition;
			}

			const archivable = await assertJobHasNoActivePositionsWhenArchiving(
				this,
				input,
			);
			if (!archivable.ok) {
				return archivable;
			}

			const now = new Date();
			const updated: Job = {
				...job,
				status: input.status,
				version: job.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.jobs.set(input.jobId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_job",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.jobs.set(input.jobId, job);
				return audit;
			}

			const outbox = await appendJobStatusEvent(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				jobId: updated.id,
				status: input.status,
			});
			if (!outbox.ok) {
				state.jobs.set(input.jobId, job);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async listJobs(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: JobStatus | undefined;
		}): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
			let filtered = Array.from(state.jobs.values()).filter(
				(j) => j.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((j) => j.status === input.status);
			}

			filtered.sort((a, b) => a.code.localeCompare(b.code));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const jobs = filtered
				.slice(start, start + input.pageSize)
				.map((j) => ({ ...j }));

			return await errorResult.ok({ jobs, totalCount });
		},

		// Position methods
		async getPositionById(input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
		}): Promise<Result<Position | null>> {
			const position = state.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...position });
		},

		async findPositionByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Position | null>> {
			const sequentialOutcome3 = await runSequential(
				state.positions.values(),
				async (position) => {
					if (
						position.organizationId === input.organizationId &&
						position.code === input.code
					) {
						return sequentialReturn(await errorResult.ok({ ...position }));
					}
				},
			);
			if (sequentialOutcome3.kind === "return") {
				return sequentialOutcome3.value;
			}
			return await errorResult.ok(null);
		},

		async createPosition(
			record: PositionCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Position>> {
			const parsedStatus = positionStatusSchema.safeParse(record.status);
			if (!parsedStatus.success) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			const department = state.departments.get(record.departmentId);
			if (!department || department.organizationId !== record.organizationId) {
				return notFound(
					"Department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeDepartment = assertActiveDepartment(department.status);
			if (!activeDepartment.ok) {
				return activeDepartment;
			}

			const job = state.jobs.get(record.jobId);
			if (!job || job.organizationId !== record.organizationId) {
				return notFound(
					"Job not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeJob = assertActiveJob(job.status);
			if (!activeJob.ok) {
				return activeJob;
			}

			const existing = await this.findPositionByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}

			const idResult = parseHumanResourcesPositionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const effectiveFrom = now.toISOString().slice(0, 10);
			const position: Position = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				departmentId: record.departmentId,
				jobId: record.jobId,
				status: parsedStatus.data,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const definitionVersion: PositionDefinitionVersion = {
				id: randomUUID(),
				organizationId: record.organizationId,
				positionId: position.id,
				title: position.title,
				departmentId: position.departmentId,
				jobId: position.jobId,
				effectiveFrom,
				effectiveTo: null,
				supersedesDefinitionVersionId: null,
				lineageStatus: "active",
				reasonCode: "initial_record",
				evidenceRef: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.positions.set(position.id, position);
			state.positionDefinitionVersions.set(
				definitionVersion.id,
				definitionVersion,
			);

			const audit = await ports.audit.record({
				organizationId: position.organizationId,
				actorUserId: position.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_position",
				entityId: position.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.positions.delete(position.id);
				state.positionDefinitionVersions.delete(definitionVersion.id);
				return audit;
			}

			return errorResult.ok({ ...position });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async updatePosition(
			input: {
				organizationId: string;
				positionId: HumanResourcesPositionId;
				title?: string | undefined;
				departmentId?: HumanResourcesDepartmentId | undefined;
				jobId?: HumanResourcesJobId | undefined;
				effectiveOn: string;
				reasonCode: string;
				evidenceRef?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Position>> {
			const position = state.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return notFound("Position not found");
			}

			const versionCheck = assertExpectedVersion(
				position.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const nextTitle =
				input.title === undefined ? position.title : input.title;
			const nextDepartmentId =
				input.departmentId === undefined
					? position.departmentId
					: input.departmentId;
			const nextJobId =
				input.jobId === undefined ? position.jobId : input.jobId;

			if (nextDepartmentId === null || nextJobId === null) {
				return invalidInput("Position requires department and job");
			}

			if (
				nextTitle === position.title &&
				nextDepartmentId === position.departmentId &&
				nextJobId === position.jobId
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const openSegment = findOpenPositionDefinitionVersion(
				[...state.positionDefinitionVersions.values()],
				input.organizationId,
				input.positionId,
			);
			if (openSegment === null) {
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const mutableCheck = assertLineageSegmentMutable(openSegment);
			if (!mutableCheck.ok) {
				return mutableCheck;
			}

			const effectiveOnCheck = validateLineageSegmentEffectiveOn({
				openEffectiveFrom: openSegment.effectiveFrom,
				effectiveOn: input.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return effectiveOnCheck;
			}

			if (input.departmentId !== undefined) {
				const department = state.departments.get(input.departmentId);
				if (!department || department.organizationId !== input.organizationId) {
					return notFound(
						"Department not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				const activeDepartment = assertActiveDepartment(department.status);
				if (!activeDepartment.ok) {
					return activeDepartment;
				}
			}

			if (input.jobId !== undefined) {
				const job = state.jobs.get(input.jobId);
				if (!job || job.organizationId !== input.organizationId) {
					return notFound(
						"Job not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				const activeJob = assertActiveJob(job.status);
				if (!activeJob.ok) {
					return activeJob;
				}
			}

			const now = new Date();
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const closedPredecessor: PositionDefinitionVersion = {
				...openSegment,
				effectiveTo: predecessorEnd,
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: PositionDefinitionVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				positionId: input.positionId,
				title: nextTitle,
				departmentId: nextDepartmentId,
				jobId: nextJobId,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesDefinitionVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef ?? null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updated: Position = {
				...position,
				title: nextTitle,
				departmentId: nextDepartmentId,
				jobId: nextJobId,
				version: position.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.positionDefinitionVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.positionDefinitionVersions.set(successor.id, successor);
			state.positions.set(input.positionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_position",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.positionDefinitionVersions.set(openSegment.id, openSegment);
				state.positionDefinitionVersions.delete(successor.id);
				state.positions.set(input.positionId, position);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async setPositionStatus(
			input: {
				organizationId: string;
				positionId: HumanResourcesPositionId;
				status: PositionStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Position>> {
			const position = state.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return notFound("Position not found");
			}

			const versionCheck = assertExpectedVersion(
				position.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertPositionStatusTransition(
				position.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			if (input.status === "frozen" || input.status === "closed") {
				const openCount = await this.countOpenAssignmentsForPosition({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!openCount.ok) {
					return openCount;
				}
				if (openCount.data > 0) {
					return conflict(
						"Cannot freeze or close position with open assignments",
					);
				}
			}

			const now = new Date();
			const updated: Position = {
				...position,
				status: input.status,
				version: position.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.positions.set(input.positionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_position",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.positions.set(input.positionId, position);
				return audit;
			}

			const positionEventType = (() => {
				if (input.status === "active") {
					return HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT;
				}
				if (input.status === "frozen") {
					return HUMAN_RESOURCES_POSITION_FROZEN_EVENT;
				}
				if (input.status === "closed") {
					return HUMAN_RESOURCES_POSITION_CLOSED_EVENT;
				}
				return null;
			})();
			if (positionEventType) {
				const outbox = await appendOrganizationDomainEvent(ports, meta, {
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					entityType: "hr_position",
					entityId: updated.id,
					eventType: positionEventType,
				});
				if (!outbox.ok) {
					state.positions.set(input.positionId, position);
					return outbox;
				}
			}

			return errorResult.ok({ ...updated });
		},

		async listPositions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: string | undefined;
			departmentId?: HumanResourcesDepartmentId | undefined;
			jobId?: HumanResourcesJobId | undefined;
		}): Promise<Result<{ positions: Position[]; totalCount: number }>> {
			let filtered = Array.from(state.positions.values()).filter(
				(p) => p.organizationId === input.organizationId,
			);

			if (input.status !== undefined) {
				filtered = filtered.filter((p) => p.status === input.status);
			}
			if (input.departmentId !== undefined) {
				filtered = filtered.filter(
					(p) => p.departmentId === input.departmentId,
				);
			}
			if (input.jobId !== undefined) {
				filtered = filtered.filter((p) => p.jobId === input.jobId);
			}

			filtered.sort((a, b) => a.title.localeCompare(b.title));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const positions = filtered
				.slice(start, start + input.pageSize)
				.map((p) => ({ ...p }));

			return await errorResult.ok({ positions, totalCount });
		},

		async countActiveOrFrozenPositionsForDepartment(input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
		}): Promise<Result<number>> {
			let count = 0;
			for (const position of state.positions.values()) {
				if (
					position.organizationId === input.organizationId &&
					position.departmentId === input.departmentId &&
					(position.status === "active" || position.status === "frozen")
				) {
					count += 1;
				}
			}
			return await errorResult.ok(count);
		},

		async countActiveOrFrozenPositionsForJob(input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
		}): Promise<Result<number>> {
			let count = 0;
			for (const position of state.positions.values()) {
				if (
					position.organizationId === input.organizationId &&
					position.jobId === input.jobId &&
					(position.status === "active" || position.status === "frozen")
				) {
					count += 1;
				}
			}
			return await errorResult.ok(count);
		},

		async countActiveChildDepartments(input: {
			organizationId: string;
			parentDepartmentId: HumanResourcesDepartmentId;
		}): Promise<Result<number>> {
			let count = 0;
			for (const department of state.departments.values()) {
				if (
					department.organizationId === input.organizationId &&
					department.parentDepartmentId === input.parentDepartmentId &&
					department.status === "active"
				) {
					count += 1;
				}
			}
			return await errorResult.ok(count);
		},

		// Reporting line methods
		async getReportingLineById(input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
		}): Promise<Result<ReportingLine | null>> {
			const line = state.reportingLines.get(input.reportingLineId);
			if (!line || line.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...line });
		},

		async listReportingLinesForEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<ReportingLine[]>> {
			const lines = Array.from(state.reportingLines.values())
				.filter(
					(line) =>
						line.organizationId === input.organizationId &&
						line.employeeId === input.employeeId,
				)
				.map((line) => ({ ...line }));
			lines.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
			return await errorResult.ok(lines);
		},

		async findOpenPrimaryReportingLine(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<ReportingLine | null>> {
			const sequentialOutcome4 = await runSequential(
				state.reportingLines.values(),
				async (line) => {
					if (
						line.organizationId === input.organizationId &&
						line.employeeId === input.employeeId &&
						line.relationshipKind === "primary" &&
						line.endsOn === null
					) {
						return sequentialReturn(await errorResult.ok({ ...line }));
					}
				},
			);
			if (sequentialOutcome4.kind === "return") {
				return sequentialOutcome4.value;
			}
			return await errorResult.ok(null);
		},

		async resolvePrimaryManager(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf: string;
		}): Promise<Result<ReportingLine | null>> {
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: Array.from(state.reportingLines.values()).filter(
					(line) =>
						line.organizationId === input.organizationId &&
						line.employeeId === input.employeeId &&
						line.relationshipKind === "primary",
				),
				asOf: input.asOf,
				getId: (line) => line.id,
				getEffectiveFrom: (line) => line.startsOn,
				getEffectiveTo: (line) => line.endsOn,
			});
			if (!resolution.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return await errorResult.ok(
				resolution.record === null ? null : { ...resolution.record },
			);
		},

		async listDirectReports(input: {
			organizationId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			asOf: string;
			page: number;
			pageSize: number;
		}): Promise<
			Result<{ reportingLines: ReportingLine[]; totalCount: number }>
		> {
			const filtered = Array.from(state.reportingLines.values()).filter(
				(line) =>
					line.organizationId === input.organizationId &&
					line.managerEmployeeId === input.managerEmployeeId &&
					line.relationshipKind === "primary" &&
					line.startsOn <= input.asOf &&
					(line.endsOn === null || line.endsOn >= input.asOf),
			);

			filtered.sort((a, b) => a.startsOn.localeCompare(b.startsOn));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const reportingLines = filtered
				.slice(start, start + input.pageSize)
				.map((line) => ({ ...line }));

			return await errorResult.ok({ reportingLines, totalCount });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async assignPrimaryReportingLine(
			record: ReportingLineCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ReportingLine>> {
			const employee = core.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const manager = core.employees.get(record.managerEmployeeId);
			if (!manager || manager.organizationId !== record.organizationId) {
				return notFound(
					"Manager employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const openPrimary = await this.findOpenPrimaryReportingLine({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!openPrimary.ok) {
				return openPrimary;
			}
			if (openPrimary.data !== null) {
				return conflict("Employee already has an open primary reporting line");
			}

			const existingLines = await this.listReportingLinesForEmployee({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!existingLines.ok) {
				return existingLines;
			}

			const overlap = assertNoPrimaryReportingOverlap({
				candidateStartsOn: record.startsOn,
				candidateEndsOn: record.endsOn,
				existing: existingLines.data,
			});
			if (!overlap.ok) {
				return overlap;
			}

			const cycleCheck = assertReportingLineAcyclic({
				employeeId: record.employeeId,
				managerEmployeeId: record.managerEmployeeId,
				getOpenPrimaryManagerId: (employeeId) => {
					const emp = core.employees.get(employeeId);
					if (!emp || emp.organizationId !== record.organizationId) {
						return;
					}
					for (const line of state.reportingLines.values()) {
						if (
							line.organizationId === record.organizationId &&
							line.employeeId === employeeId &&
							line.relationshipKind === "primary" &&
							line.endsOn === null
						) {
							return line.managerEmployeeId;
						}
					}
					return null;
				},
			});
			if (!cycleCheck.ok) {
				return cycleCheck;
			}

			const idResult = parseHumanResourcesReportingLineId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const reportingLine: ReportingLine = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				managerEmployeeId: record.managerEmployeeId,
				relationshipKind: "primary",
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				supersedesReportingLineId: null,
				supersededByReportingLineId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.reportingLines.set(reportingLine.id, reportingLine);

			const audit = await ports.audit.record({
				organizationId: reportingLine.organizationId,
				actorUserId: reportingLine.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_reporting_line",
				entityId: reportingLine.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.reportingLines.delete(reportingLine.id);
				return audit;
			}

			const assignOutbox = await appendOrganizationDomainEvent(ports, meta, {
				organizationId: reportingLine.organizationId,
				actorUserId: reportingLine.createdBy,
				entityType: "hr_reporting_line",
				entityId: reportingLine.id,
				eventType: HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT,
			});
			if (!assignOutbox.ok) {
				state.reportingLines.delete(reportingLine.id);
				return assignOutbox;
			}

			return errorResult.ok({ ...reportingLine });
		},

		async closeReportingLine(
			input: {
				organizationId: string;
				reportingLineId: HumanResourcesReportingLineId;
				endsOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ReportingLine>> {
			const line = state.reportingLines.get(input.reportingLineId);
			if (!line || line.organizationId !== input.organizationId) {
				return notFound("Reporting line not found");
			}

			const versionCheck = assertExpectedVersion(
				line.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			if (line.endsOn !== null) {
				return conflict("Reporting line is already closed");
			}

			const dateCheck = assertValidDateRange(line.startsOn, input.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const now = new Date();
			const updated: ReportingLine = {
				...line,
				endsOn: input.endsOn,
				version: line.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.reportingLines.set(input.reportingLineId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_reporting_line",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.reportingLines.set(input.reportingLineId, line);
				return audit;
			}

			const closeOutbox = await appendOrganizationDomainEvent(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entityType: "hr_reporting_line",
				entityId: updated.id,
				eventType: HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT,
			});
			if (!closeOutbox.ok) {
				state.reportingLines.set(input.reportingLineId, line);
				return closeOutbox;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async replacePrimaryReportingLine(
			input: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				managerEmployeeId: HumanResourcesEmployeeId;
				startsOn: string;
				endsOn: string | null;
				closePriorOn: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<ReportingLine>> {
			const openPrimary = await this.findOpenPrimaryReportingLine({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
			});
			if (!openPrimary.ok) {
				return openPrimary;
			}
			if (openPrimary.data === null) {
				return notFound("Open primary reporting line not found");
			}

			const prior = state.reportingLines.get(openPrimary.data.id);
			if (!prior || prior.organizationId !== input.organizationId) {
				return notFound("Open primary reporting line not found");
			}

			if (input.closePriorOn < prior.startsOn) {
				return invalidInput(
					"closePriorOn must be on or after the prior reporting line start date",
				);
			}

			const priorCloseDates = assertValidDateRange(
				prior.startsOn,
				input.closePriorOn,
			);
			if (!priorCloseDates.ok) {
				return priorCloseDates;
			}

			if (input.closePriorOn > input.startsOn) {
				return invalidInput(
					"closePriorOn must be on or before the new reporting line start date",
				);
			}

			const newDateCheck = assertValidDateRange(input.startsOn, input.endsOn);
			if (!newDateCheck.ok) {
				return newDateCheck;
			}

			const employee = core.employees.get(input.employeeId);
			if (!employee || employee.organizationId !== input.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const manager = core.employees.get(input.managerEmployeeId);
			if (!manager || manager.organizationId !== input.organizationId) {
				return notFound(
					"Manager employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const existingLines = await this.listReportingLinesForEmployee({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
			});
			if (!existingLines.ok) {
				return existingLines;
			}

			// Prior line is closed in this atomic replace; exclude it from overlap.
			const otherPrimaries = existingLines.data.filter(
				(line) => line.id !== prior.id,
			);
			const overlap = assertNoPrimaryReportingOverlap({
				candidateStartsOn: input.startsOn,
				candidateEndsOn: input.endsOn,
				existing: otherPrimaries,
			});
			if (!overlap.ok) {
				return overlap;
			}

			const cycleCheck = assertReportingLineAcyclic({
				employeeId: input.employeeId,
				managerEmployeeId: input.managerEmployeeId,
				getOpenPrimaryManagerId: (employeeId) => {
					const emp = core.employees.get(employeeId);
					if (!emp || emp.organizationId !== input.organizationId) {
						return;
					}
					if (employeeId === input.employeeId) {
						return null;
					}
					for (const line of state.reportingLines.values()) {
						if (
							line.organizationId === input.organizationId &&
							line.employeeId === employeeId &&
							line.relationshipKind === "primary" &&
							line.endsOn === null
						) {
							return line.managerEmployeeId;
						}
					}
					return null;
				},
			});
			if (!cycleCheck.ok) {
				return cycleCheck;
			}

			const idResult = parseHumanResourcesReportingLineId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const closedPrior: ReportingLine = {
				...prior,
				endsOn: input.closePriorOn,
				supersededByReportingLineId: idResult.data,
				version: prior.version + 1,
				updatedBy: input.createdBy,
				updatedAt: now,
			};
			const reportingLine: ReportingLine = {
				id: idResult.data,
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				managerEmployeeId: input.managerEmployeeId,
				relationshipKind: "primary",
				startsOn: input.startsOn,
				endsOn: input.endsOn,
				supersedesReportingLineId: prior.id,
				supersededByReportingLineId: null,
				version: 1,
				createdBy: input.createdBy,
				updatedBy: input.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.reportingLines.set(prior.id, closedPrior);
			state.reportingLines.set(reportingLine.id, reportingLine);

			const closeAudit = await ports.audit.record({
				organizationId: closedPrior.organizationId,
				actorUserId: input.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_reporting_line",
				entityId: closedPrior.id,
				action: "UPDATE",
				changes: [],
			});
			if (!closeAudit.ok) {
				state.reportingLines.set(prior.id, prior);
				state.reportingLines.delete(reportingLine.id);
				return closeAudit;
			}

			const createAudit = await ports.audit.record({
				organizationId: reportingLine.organizationId,
				actorUserId: input.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_reporting_line",
				entityId: reportingLine.id,
				action: "CREATE",
				changes: [],
			});
			if (!createAudit.ok) {
				state.reportingLines.set(prior.id, prior);
				state.reportingLines.delete(reportingLine.id);
				return createAudit;
			}

			const replaceOutbox = await appendOrganizationDomainEvent(ports, meta, {
				organizationId: reportingLine.organizationId,
				actorUserId: input.createdBy,
				entityType: "hr_reporting_line",
				entityId: reportingLine.id,
				eventType: HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT,
			});
			if (!replaceOutbox.ok) {
				state.reportingLines.set(prior.id, prior);
				state.reportingLines.delete(reportingLine.id);
				return replaceOutbox;
			}

			return errorResult.ok({ ...reportingLine });
		},

		async getOrganizationTree(input: {
			organizationId: string;
			rootDepartmentId: HumanResourcesDepartmentId | null;
			maxDepth: number;
			maxNodes: number;
		}): Promise<Result<OrganizationTreePage>> {
			const departments = await this.listAllDepartments({
				organizationId: input.organizationId,
			});
			if (!departments.ok) {
				return departments;
			}

			const tree = buildOrganizationTree({
				departments: departments.data,
				rootDepartmentId: input.rootDepartmentId,
				maxDepth: input.maxDepth,
				maxNodes: input.maxNodes,
			});

			return errorResult.ok({
				nodes: tree.nodes,
				truncated: tree.truncated,
			});
		},

		async findDepartmentAsOf(input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			asOf: string;
		}) {
			const department = state.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}

			const resolved = resolveDepartmentStructureAsOf({
				versions: [...state.departmentStructureVersions.values()],
				departmentId: input.departmentId,
				asOf: input.asOf,
			});
			if (!resolved.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			if (resolved.record === null) {
				return await errorResult.ok(null);
			}

			return await errorResult.ok({
				departmentId: input.departmentId,
				organizationId: input.organizationId,
				name: resolved.record.name,
				parentDepartmentId: resolved.record.parentDepartmentId,
				asOf: input.asOf,
				effectiveFrom: resolved.record.effectiveFrom,
				effectiveTo: resolved.record.effectiveTo,
				structureVersionId: resolved.record.id,
			});
		},

		async findJobAsOf(input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			asOf: string;
		}) {
			const job = state.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}

			const resolved = resolveJobDefinitionAsOf({
				versions: [...state.jobDefinitionVersions.values()],
				jobId: input.jobId,
				asOf: input.asOf,
			});
			if (!resolved.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			if (resolved.record === null) {
				return await errorResult.ok(null);
			}

			return await errorResult.ok({
				jobId: input.jobId,
				organizationId: input.organizationId,
				title: resolved.record.title,
				asOf: input.asOf,
				effectiveFrom: resolved.record.effectiveFrom,
				effectiveTo: resolved.record.effectiveTo,
				definitionVersionId: resolved.record.id,
			});
		},

		async findPositionAsOf(input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			asOf: string;
		}): Promise<Result<PositionDefinitionAtAsOf | null>> {
			const position = state.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}

			const resolved = resolvePositionDefinitionAsOf({
				versions: [...state.positionDefinitionVersions.values()],
				positionId: input.positionId,
				asOf: input.asOf,
			});
			if (!resolved.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			if (resolved.record === null) {
				return await errorResult.ok(null);
			}

			return await errorResult.ok({
				positionId: input.positionId,
				organizationId: input.organizationId,
				title: resolved.record.title,
				departmentId: resolved.record.departmentId,
				jobId: resolved.record.jobId,
				asOf: input.asOf,
				effectiveFrom: resolved.record.effectiveFrom,
				effectiveTo: resolved.record.effectiveTo,
				definitionVersionId: resolved.record.id,
			});
		},

		async getOrganizationTreeAsOf(input: {
			organizationId: string;
			asOf: string;
			rootDepartmentId: HumanResourcesDepartmentId | null;
			maxDepth: number;
			maxNodes: number;
		}): Promise<Result<OrganizationTreePage>> {
			const departments = await this.listAllDepartments({
				organizationId: input.organizationId,
			});
			if (!departments.ok) {
				return departments;
			}

			const historicalDepartments: Department[] = [];
			const sequentialOutcome5 = await runSequential(
				departments.data,
				async (department) => {
					const asOfStructure = await this.findDepartmentAsOf({
						organizationId: input.organizationId,
						departmentId: department.id,
						asOf: input.asOf,
					});
					if (!asOfStructure.ok) {
						return sequentialReturn(asOfStructure);
					}
					if (asOfStructure.data === null) {
						return sequentialContinue();
					}
					historicalDepartments.push({
						...department,
						name: asOfStructure.data.name,
						parentDepartmentId: asOfStructure.data.parentDepartmentId,
					});
				},
			);
			if (sequentialOutcome5.kind === "return") {
				return sequentialOutcome5.value;
			}

			const tree = buildOrganizationTree({
				departments: historicalDepartments,
				rootDepartmentId: input.rootDepartmentId,
				maxDepth: input.maxDepth,
				maxNodes: input.maxNodes,
			});

			return errorResult.ok({
				nodes: tree.nodes,
				truncated: tree.truncated,
			});
		},
	};
}
