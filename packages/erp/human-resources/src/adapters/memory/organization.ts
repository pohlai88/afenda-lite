import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

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
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidInput, notFound } from "../../shared/domain-guards";
import {
	assertValidDateRange,
	type DepartmentStatus,
	type JobStatus,
	type PositionStatus,
	positionStatusSchema,
} from "../../shared/employment-status";
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
} from "../../shared/organization-guards";
import type {
	DepartmentCreateRecord,
	HumanResourcesStore,
	JobCreateRecord,
	PositionCreateRecord,
	ReportingLineCreateRecord,
} from "../../store";
import type {
	Department,
	Job,
	OrganizationTreePage,
	Position,
	ReportingLine,
} from "../../types";
import type { CoreMemoryState } from "./core";

export type OrganizationMemoryState = {
	departments: Map<HumanResourcesDepartmentId, Department>;
	jobs: Map<HumanResourcesJobId, Job>;
	positions: Map<HumanResourcesPositionId, Position>;
	reportingLines: Map<HumanResourcesReportingLineId, ReportingLine>;
};

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
	};
}

export function resetOrganizationMemoryState(
	state: OrganizationMemoryState,
): void {
	state.departments.clear();
	state.jobs.clear();
	state.positions.clear();
	state.reportingLines.clear();
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
				return ok(null);
			}
			return ok({ ...department });
		},

		async findDepartmentByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Department | null>> {
			for (const department of state.departments.values()) {
				if (
					department.organizationId === input.organizationId &&
					department.code === input.code
				) {
					return ok({ ...department });
				}
			}
			return ok(null);
		},

		async createDepartment(
			record: DepartmentCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Department>> {
			const existing = await this.findDepartmentByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return fail(
					"CONFLICT",
					"Department with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
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

			state.departments.set(department.id, department);

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
				return audit;
			}

			return ok({ ...department });
		},

		async updateDepartment(
			input: {
				organizationId: string;
				departmentId: HumanResourcesDepartmentId;
				name?: string;
				parentDepartmentId?: HumanResourcesDepartmentId | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const nextName = input.name !== undefined ? input.name : department.name;
			const nextParent =
				input.parentDepartmentId !== undefined
					? input.parentDepartmentId
					: department.parentDepartmentId;

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
						return undefined;
					}
					return dept.parentDepartmentId;
				},
			});
			if (!cycleCheck.ok) {
				return cycleCheck;
			}

			const now = new Date();
			const updated: Department = {
				...department,
				name: nextName,
				parentDepartmentId: nextParent,
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

			return ok({ ...updated });
		},

		async setDepartmentStatus(
			input: {
				organizationId: string;
				departmentId: HumanResourcesDepartmentId;
				status: DepartmentStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listDepartments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: DepartmentStatus;
			parentDepartmentId?: HumanResourcesDepartmentId | null;
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

			return ok({ departments, totalCount });
		},

		async listAllDepartments(input: {
			organizationId: string;
		}): Promise<Result<Department[]>> {
			const departments = Array.from(state.departments.values())
				.filter((d) => d.organizationId === input.organizationId)
				.map((d) => ({ ...d }));
			departments.sort((a, b) => a.code.localeCompare(b.code));
			return ok(departments);
		},

		// Job methods
		async getJobById(input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
		}): Promise<Result<Job | null>> {
			const job = state.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...job });
		},

		async findJobByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Job | null>> {
			for (const job of state.jobs.values()) {
				if (
					job.organizationId === input.organizationId &&
					job.code === input.code
				) {
					return ok({ ...job });
				}
			}
			return ok(null);
		},

		async createJob(
			record: JobCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Job>> {
			const existing = await this.findJobByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return fail(
					"CONFLICT",
					"Job with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}

			const idResult = parseHumanResourcesJobId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
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

			state.jobs.set(job.id, job);

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

			return ok({ ...job });
		},

		async updateJob(
			input: {
				organizationId: string;
				jobId: HumanResourcesJobId;
				title: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const now = new Date();
			const updated: Job = {
				...job,
				title: input.title,
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

			return ok({ ...updated });
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
			meta: { correlationId: string },
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

			if (input.status === "archived") {
				const positionCount = await this.countActiveOrFrozenPositionsForJob({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!positionCount.ok) {
					return positionCount;
				}
				if (positionCount.data > 0) {
					return conflict("Cannot archive job with active or frozen positions");
				}
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

			return ok({ ...updated });
		},

		async listJobs(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: JobStatus;
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

			return ok({ jobs, totalCount });
		},

		// Position methods
		async getPositionById(input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
		}): Promise<Result<Position | null>> {
			const position = state.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...position });
		},

		async findPositionByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<Position | null>> {
			for (const position of state.positions.values()) {
				if (
					position.organizationId === input.organizationId &&
					position.code === input.code
				) {
					return ok({ ...position });
				}
			}
			return ok(null);
		},

		async createPosition(
			record: PositionCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Position>> {
			const parsedStatus = positionStatusSchema.safeParse(record.status);
			if (!parsedStatus.success) {
				return fail(
					"BAD_REQUEST",
					"Invalid position status",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
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
				return fail(
					"CONFLICT",
					"Position with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}

			const idResult = parseHumanResourcesPositionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
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

			state.positions.set(position.id, position);

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
				return audit;
			}

			return ok({ ...position });
		},

		async updatePosition(
			input: {
				organizationId: string;
				positionId: HumanResourcesPositionId;
				title?: string;
				departmentId?: HumanResourcesDepartmentId;
				jobId?: HumanResourcesJobId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				input.title !== undefined ? input.title : position.title;
			const nextDepartmentId =
				input.departmentId !== undefined
					? input.departmentId
					: position.departmentId;
			const nextJobId =
				input.jobId !== undefined ? input.jobId : position.jobId;

			if (nextDepartmentId === null || nextJobId === null) {
				return invalidInput("Position requires department and job");
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
			const updated: Position = {
				...position,
				title: nextTitle,
				departmentId: nextDepartmentId,
				jobId: nextJobId,
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

			return ok({ ...updated });
		},

		async setPositionStatus(
			input: {
				organizationId: string;
				positionId: HumanResourcesPositionId;
				status: PositionStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listPositions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: string;
			departmentId?: HumanResourcesDepartmentId;
			jobId?: HumanResourcesJobId;
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

			return ok({ positions, totalCount });
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
			return ok(count);
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
			return ok(count);
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
			return ok(count);
		},

		// Reporting line methods
		async getReportingLineById(input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
		}): Promise<Result<ReportingLine | null>> {
			const line = state.reportingLines.get(input.reportingLineId);
			if (!line || line.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...line });
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
			return ok(lines);
		},

		async findOpenPrimaryReportingLine(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<ReportingLine | null>> {
			for (const line of state.reportingLines.values()) {
				if (
					line.organizationId === input.organizationId &&
					line.employeeId === input.employeeId &&
					line.relationshipKind === "primary" &&
					line.endsOn === null
				) {
					return ok({ ...line });
				}
			}
			return ok(null);
		},

		async resolvePrimaryManager(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf: string;
		}): Promise<Result<ReportingLine | null>> {
			for (const line of state.reportingLines.values()) {
				if (
					line.organizationId === input.organizationId &&
					line.employeeId === input.employeeId &&
					line.relationshipKind === "primary" &&
					line.startsOn <= input.asOf &&
					(line.endsOn === null || line.endsOn >= input.asOf)
				) {
					return ok({ ...line });
				}
			}
			return ok(null);
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

			return ok({ reportingLines, totalCount });
		},

		async assignPrimaryReportingLine(
			record: ReportingLineCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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
						return undefined;
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

			return ok({ ...reportingLine });
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
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

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
			meta: { correlationId: string },
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
						return undefined;
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

			return ok({ ...reportingLine });
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

			return ok({
				nodes: tree.nodes,
				truncated: tree.truncated,
			});
		},
	};
}
