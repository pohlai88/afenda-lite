import { randomUUID } from "node:crypto";
import {
	and,
	asc,
	db,
	desc,
	eq,
	gte,
	hrDepartment,
	hrJob,
	hrPosition,
	hrReportingLine,
	isNull,
	lte,
	or,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesJobId,
	type HumanResourcesPositionId,
	type HumanResourcesReportingLineId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
	parseHumanResourcesReportingLineId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	conflict,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { resolveUniqueEffectiveRangeRecordBy } from "../../shared/effective-range";
import {
	assertValidDateRange,
	type DepartmentStatus,
	departmentStatusSchema,
	type JobStatus,
	jobStatusSchema,
	type PositionStatus,
	positionStatusSchema,
	reportingRelationshipKindSchema,
} from "../../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	assertActiveDepartment,
	assertActiveJob,
	assertDepartmentParentAcyclic,
	assertDepartmentStatusTransition,
	assertJobStatusTransition,
	assertNoPrimaryReportingOverlap,
	assertPositionStatusTransition,
	assertReportingLineAcyclic,
	buildBoundedDepartmentTree,
} from "../../shared/organization-guards";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
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

function mapNullableDepartmentId(
	value: string | null,
): Result<HumanResourcesDepartmentId | null> {
	if (value === null) {
		return ok(null);
	}
	return parseHumanResourcesDepartmentId(value);
}

function mapNullableJobId(
	value: string | null,
): Result<HumanResourcesJobId | null> {
	if (value === null) {
		return ok(null);
	}
	return parseHumanResourcesJobId(value);
}

function mapDepartment(
	row: typeof hrDepartment.$inferSelect,
): Result<Department> {
	const id = parseHumanResourcesDepartmentId(row.id);
	if (!id.ok) return id;
	const parentDepartmentId = mapNullableDepartmentId(row.parentDepartmentId);
	if (!parentDepartmentId.ok) return parentDepartmentId;
	const status = departmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid department status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		parentDepartmentId: parentDepartmentId.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapJob(row: typeof hrJob.$inferSelect): Result<Job> {
	const id = parseHumanResourcesJobId(row.id);
	if (!id.ok) return id;
	const status = jobStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid job status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPosition(row: typeof hrPosition.$inferSelect): Result<Position> {
	const id = parseHumanResourcesPositionId(row.id);
	if (!id.ok) return id;
	const departmentId = mapNullableDepartmentId(row.departmentId);
	if (!departmentId.ok) return departmentId;
	const jobId = mapNullableJobId(row.jobId);
	if (!jobId.ok) return jobId;
	const status = positionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid position status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		departmentId: departmentId.data,
		jobId: jobId.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapReportingLine(
	row: typeof hrReportingLine.$inferSelect,
): Result<ReportingLine> {
	const id = parseHumanResourcesReportingLineId(row.id);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	const managerEmployeeId = parseHumanResourcesEmployeeId(
		row.managerEmployeeId,
	);
	if (!id.ok) return id;
	if (!employeeId.ok) return employeeId;
	if (!managerEmployeeId.ok) return managerEmployeeId;
	const relationshipKind = reportingRelationshipKindSchema.safeParse(
		row.relationshipKind,
	);
	if (!relationshipKind.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid reporting relationship kind in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		managerEmployeeId: managerEmployeeId.data,
		relationshipKind: relationshipKind.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type PositionSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	department_id: string | null;
	job_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapPositionSqlRow(row: PositionSqlRow): Result<Position> {
	return mapPosition({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		departmentId: row.department_id,
		jobId: row.job_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type DepartmentSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	parent_department_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapDepartmentSqlRow(row: DepartmentSqlRow): Result<Department> {
	return mapDepartment({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		parentDepartmentId: row.parent_department_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type JobSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapJobSqlRow(row: JobSqlRow): Result<Job> {
	return mapJob({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type ReportingLineSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	manager_employee_id: string;
	relationship_kind: string;
	starts_on: string;
	ends_on: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapReportingLineSqlRow(
	row: ReportingLineSqlRow,
): Result<ReportingLine> {
	return mapReportingLine({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		managerEmployeeId: row.manager_employee_id,
		relationshipKind: row.relationship_kind,
		startsOn: row.starts_on,
		endsOn: row.ends_on,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type DrizzleOrganizationHost = Pick<
	HumanResourcesStore,
	"getEmployeeById" | "countOpenAssignmentsForPosition"
>;

export type DrizzleOrganizationMethods = Pick<
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

async function assertReportingLineAssignable(
	host: DrizzleOrganizationHost & DrizzleOrganizationMethods,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		managerEmployeeId: HumanResourcesEmployeeId;
		startsOn: string;
		endsOn: string | null;
		excludeReportingLineId?: HumanResourcesReportingLineId;
	},
): Promise<Result<void>> {
	const dateCheck = assertValidDateRange(input.startsOn, input.endsOn);
	if (!dateCheck.ok) return dateCheck;

	const employee = await host.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!employee.ok) return employee;
	if (employee.data === null) {
		return fail(
			"NOT_FOUND",
			"Employee not found",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		);
	}
	const manager = await host.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.managerEmployeeId,
	});
	if (!manager.ok) return manager;
	if (manager.data === null) {
		return fail(
			"NOT_FOUND",
			"Manager employee not found",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		);
	}

	const managerCache = new Map<
		string,
		HumanResourcesEmployeeId | null | undefined
	>();
	let current: HumanResourcesEmployeeId | null = input.managerEmployeeId;
	while (current !== null) {
		if (managerCache.has(current)) break;
		const openPrimary: Result<ReportingLine | null> =
			await host.findOpenPrimaryReportingLine({
				organizationId: input.organizationId,
				employeeId: current,
			});
		if (!openPrimary.ok) return openPrimary;
		const next: HumanResourcesEmployeeId | null =
			openPrimary.data === null ? null : openPrimary.data.managerEmployeeId;
		managerCache.set(current, next);
		current = next;
	}

	const acyclic = assertReportingLineAcyclic({
		employeeId: input.employeeId,
		managerEmployeeId: input.managerEmployeeId,
		getOpenPrimaryManagerId: (employeeId) => managerCache.get(employeeId),
	});
	if (!acyclic.ok) return acyclic;

	const existingLines = await host.listReportingLinesForEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!existingLines.ok) return existingLines;
	const overlapCandidates = existingLines.data.filter(
		(line) =>
			input.excludeReportingLineId === undefined ||
			line.id !== input.excludeReportingLineId,
	);
	const openPrimary = overlapCandidates.find(
		(line) => line.relationshipKind === "primary" && line.endsOn === null,
	);
	if (openPrimary !== undefined) {
		return conflict("Employee already has an open primary reporting line");
	}
	return assertNoPrimaryReportingOverlap({
		candidateStartsOn: input.startsOn,
		candidateEndsOn: input.endsOn,
		existing: overlapCandidates,
	});
}

export const drizzleOrganizationMethods: DrizzleOrganizationMethods &
	ThisType<DrizzleOrganizationHost & DrizzleOrganizationMethods> = {
	async getDepartmentById(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<Department | null>> {
		try {
			const result = await db
				.select()
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.id, input.departmentId),
					),
				)
				.limit(1);
			const [department] = result;
			if (!department) return ok(null);
			return mapDepartment(department);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load department");
		}
	},

	async findDepartmentByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Department | null>> {
		try {
			const result = await db
				.select()
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.code, input.code),
					),
				)
				.limit(1);
			const [department] = result;
			if (!department) return ok(null);
			return mapDepartment(department);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find department by code");
		}
	},

	async createDepartment(
		record: DepartmentCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Department>> {
		const existing = await this.findDepartmentByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Department with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesDepartmentId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const parentId = record.parentDepartmentId;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					parentId === null
						? sql`
								WITH mutated AS (
									INSERT INTO hr_department (
										id, organization_id, code, name, parent_department_id, status,
										version, created_by, updated_by
									) VALUES (
										${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.name},
										NULL, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
									)
									RETURNING *
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${auditId}, organization_id, created_by, ${meta.correlationId},
										'human-resources', 'hr_department', id, 'CREATE', '[]'::jsonb
									FROM mutated
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited
							`
						: sql`
								WITH parent AS (
									SELECT id, organization_id
									FROM hr_department
									WHERE id = ${parentId}
										AND organization_id = ${record.organizationId}
										AND status = 'active'
								),
								mutated AS (
									INSERT INTO hr_department (
										id, organization_id, code, name, parent_department_id, status,
										version, created_by, updated_by
									)
									SELECT
										${brandedId.data}, parent.organization_id, ${record.code}, ${record.name},
										parent.id, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
									FROM parent
									RETURNING *
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${auditId}, organization_id, created_by, ${meta.correlationId},
										'human-resources', 'hr_department', id, 'CREATE', '[]'::jsonb
									FROM mutated
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited
							`,
				],
			);
			const row = rows[0];
			if (!row) {
				if (parentId !== null) {
					const parent = await this.getDepartmentById({
						organizationId: record.organizationId,
						departmentId: parentId,
					});
					if (!parent.ok) return parent;
					if (parent.data === null) {
						return fail(
							"NOT_FOUND",
							"Parent department not found",
							humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
							),
						);
					}
					const parentActive = assertActiveDepartment(parent.data.status);
					if (!parentActive.ok) return parentActive;
				}
				return fail("INTERNAL_ERROR", "Department create returned no row");
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Department with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}
			return mapPersistenceFailure(error, "Failed to create department");
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Department>> {
		const existing = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Department not found");
		}

		if (input.parentDepartmentId !== undefined) {
			if (input.parentDepartmentId !== null) {
				const parent = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.parentDepartmentId,
				});
				if (!parent.ok) return parent;
				if (parent.data === null) {
					return fail(
						"NOT_FOUND",
						"Parent department not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const parentActive = assertActiveDepartment(parent.data.status);
				if (!parentActive.ok) return parentActive;
			}

			// Prefetch parent chain with sequential queries to match memory semantics.
			const parentCache = new Map<
				string,
				HumanResourcesDepartmentId | null | undefined
			>();
			if (input.parentDepartmentId !== null) {
				let current: HumanResourcesDepartmentId | null =
					input.parentDepartmentId;
				while (current !== null) {
					if (parentCache.has(current)) {
						break;
					}
					const loaded: Result<Department | null> =
						await this.getDepartmentById({
							organizationId: input.organizationId,
							departmentId: current,
						});
					if (!loaded.ok) return loaded;
					if (loaded.data === null) {
						parentCache.set(current, undefined);
						break;
					}
					parentCache.set(current, loaded.data.parentDepartmentId);
					current = loaded.data.parentDepartmentId;
				}
			}
			const acyclic = assertDepartmentParentAcyclic({
				departmentId: input.departmentId,
				proposedParentId: input.parentDepartmentId,
				getParentId: (id) => parentCache.get(id),
			});
			if (!acyclic.ok) return acyclic;
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const nameValue = input.name ?? null;
		const parentProvided = input.parentDepartmentId !== undefined ? 1 : 0;
		const parentValue = input.parentDepartmentId ?? null;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_department
								SET name = COALESCE(${nameValue}::text, name),
									parent_department_id = CASE
										WHEN ${parentProvided}::int = 1 THEN ${parentValue}::uuid
										ELSE parent_department_id
									END,
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.departmentId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_department', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Department",
				});
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update department");
		}
	},

	async setDepartmentStatus(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Department>> {
		const existing = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Department not found");
		}
		const transition = assertDepartmentStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "archived") {
			const children = await this.countActiveChildDepartments({
				organizationId: input.organizationId,
				parentDepartmentId: input.departmentId,
			});
			if (!children.ok) return children;
			if (children.data > 0) {
				return conflict(
					"Cannot archive department with active child departments",
				);
			}
			const positions = await this.countActiveOrFrozenPositionsForDepartment({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!positions.ok) return positions;
			if (positions.data > 0) {
				return conflict(
					"Cannot archive department with active or frozen positions",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_department
								SET status = ${input.status},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.departmentId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_department', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Department",
				});
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set department status");
		}
	},

	async listDepartments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus;
		parentDepartmentId?: HumanResourcesDepartmentId | null;
	}): Promise<Result<{ departments: Department[]; totalCount: number }>> {
		try {
			const conditions = [
				eq(hrDepartment.organizationId, input.organizationId),
			];
			if (input.status) {
				conditions.push(eq(hrDepartment.status, input.status));
			}
			if (input.parentDepartmentId !== undefined) {
				if (input.parentDepartmentId === null) {
					conditions.push(isNull(hrDepartment.parentDepartmentId));
				} else {
					conditions.push(
						eq(hrDepartment.parentDepartmentId, input.parentDepartmentId),
					);
				}
			}

			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrDepartment)
					.where(and(...conditions))
					.orderBy(asc(hrDepartment.code))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrDepartment)
					.where(and(...conditions)),
			]);

			const departments: Department[] = [];
			for (const row of rows) {
				const mapped = mapDepartment(row);
				if (!mapped.ok) return mapped;
				departments.push(mapped.data);
			}
			return ok({
				departments,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list departments");
		}
	},

	async listAllDepartments(input: {
		organizationId: string;
	}): Promise<Result<Department[]>> {
		try {
			const rows = await db
				.select()
				.from(hrDepartment)
				.where(eq(hrDepartment.organizationId, input.organizationId))
				.orderBy(asc(hrDepartment.code));
			const departments: Department[] = [];
			for (const row of rows) {
				const mapped = mapDepartment(row);
				if (!mapped.ok) return mapped;
				departments.push(mapped.data);
			}
			return ok(departments);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list all departments");
		}
	},

	async getJobById(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<Job | null>> {
		try {
			const result = await db
				.select()
				.from(hrJob)
				.where(
					and(
						eq(hrJob.organizationId, input.organizationId),
						eq(hrJob.id, input.jobId),
					),
				)
				.limit(1);
			const [job] = result;
			if (!job) return ok(null);
			return mapJob(job);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load job");
		}
	},

	async findJobByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Job | null>> {
		try {
			const result = await db
				.select()
				.from(hrJob)
				.where(
					and(
						eq(hrJob.organizationId, input.organizationId),
						eq(hrJob.code, input.code),
					),
				)
				.limit(1);
			const [job] = result;
			if (!job) return ok(null);
			return mapJob(job);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find job by code");
		}
	},

	async createJob(
		record: JobCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Job>> {
		const existing = await this.findJobByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Job with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesJobId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							INSERT INTO hr_job (
								id, organization_id, code, title, status,
								version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
								${record.status}, 1, ${record.createdBy}, ${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_job', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				return fail("INTERNAL_ERROR", "Job create returned no row");
			}
			return mapJobSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Job with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}
			return mapPersistenceFailure(error, "Failed to create job");
		}
	},

	async updateJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Job>> {
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_job
							SET title = ${input.title},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.jobId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_job', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Job",
				});
			}
			return mapJobSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update job");
		}
	},

	async setJobStatus(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Job>> {
		const existing = await this.getJobById({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Job not found");
		}
		const transition = assertJobStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "archived") {
			const positions = await this.countActiveOrFrozenPositionsForJob({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!positions.ok) return positions;
			if (positions.data > 0) {
				return conflict("Cannot archive job with active or frozen positions");
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_job
							SET status = ${input.status},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.jobId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_job', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Job",
				});
			}
			return mapJobSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set job status");
		}
	},

	async listJobs(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus;
	}): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
		try {
			const conditions = [eq(hrJob.organizationId, input.organizationId)];
			if (input.status) {
				conditions.push(eq(hrJob.status, input.status));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrJob)
					.where(and(...conditions))
					.orderBy(asc(hrJob.code))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrJob)
					.where(and(...conditions)),
			]);
			const jobs: Job[] = [];
			for (const row of rows) {
				const mapped = mapJob(row);
				if (!mapped.ok) return mapped;
				jobs.push(mapped.data);
			}
			return ok({
				jobs,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list jobs");
		}
	},

	async getPositionById(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<Position | null>> {
		try {
			const result = await db
				.select()
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.id, input.positionId),
					),
				)
				.limit(1);
			const [position] = result;
			if (!position) return ok(null);
			return mapPosition(position);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load position");
		}
	},

	async findPositionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Position | null>> {
		try {
			const result = await db
				.select()
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.code, input.code),
					),
				)
				.limit(1);
			const [position] = result;
			if (!position) return ok(null);
			return mapPosition(position);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find position by code");
		}
	},

	async createPosition(
		record: PositionCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Position>> {
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesPositionId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
						WITH department AS (
							SELECT id, organization_id
							FROM hr_department
							WHERE id = ${record.departmentId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						job AS (
							SELECT id
							FROM hr_job
							WHERE id = ${record.jobId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						mutated AS (
							INSERT INTO hr_position (
								id, organization_id, code, title, department_id, job_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, department.organization_id, ${record.code}, ${record.title},
								department.id, job.id, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
							FROM department, job
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_position', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const department = await this.getDepartmentById({
					organizationId: record.organizationId,
					departmentId: record.departmentId,
				});
				if (!department.ok) return department;
				if (department.data === null) {
					return fail(
						"NOT_FOUND",
						"Department not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const departmentActive = assertActiveDepartment(department.data.status);
				if (!departmentActive.ok) return departmentActive;
				const job = await this.getJobById({
					organizationId: record.organizationId,
					jobId: record.jobId,
				});
				if (!job.ok) return job;
				if (job.data === null) {
					return fail(
						"NOT_FOUND",
						"Job not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const jobActive = assertActiveJob(job.data.status);
				if (!jobActive.ok) return jobActive;
				return fail("INTERNAL_ERROR", "Position create returned no row");
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create position");
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Position>> {
		if (input.departmentId !== undefined) {
			const department = await this.getDepartmentById({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!department.ok) return department;
			if (department.data === null) {
				return fail(
					"NOT_FOUND",
					"Department not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			const departmentActive = assertActiveDepartment(department.data.status);
			if (!departmentActive.ok) return departmentActive;
		}
		if (input.jobId !== undefined) {
			const job = await this.getJobById({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!job.ok) return job;
			if (job.data === null) {
				return fail(
					"NOT_FOUND",
					"Job not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			const jobActive = assertActiveJob(job.data.status);
			if (!jobActive.ok) return jobActive;
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const titleValue = input.title ?? null;
		const departmentProvided = input.departmentId !== undefined ? 1 : 0;
		const departmentValue = input.departmentId ?? null;
		const jobProvided = input.jobId !== undefined ? 1 : 0;
		const jobValue = input.jobId ?? null;
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_position
							SET title = COALESCE(${titleValue}::text, title),
								department_id = CASE
									WHEN ${departmentProvided}::int = 1 THEN ${departmentValue}::uuid
									ELSE department_id
								END,
								job_id = CASE
									WHEN ${jobProvided}::int = 1 THEN ${jobValue}::uuid
									ELSE job_id
								END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.positionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_position', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Position",
				});
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update position");
		}
	},

	async setPositionStatus(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Position>> {
		const existing = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Position not found");
		}
		const transition = assertPositionStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "frozen" || input.status === "closed") {
			const openAssignments = await this.countOpenAssignmentsForPosition({
				organizationId: input.organizationId,
				positionId: input.positionId,
			});
			if (!openAssignments.ok) return openAssignments;
			if (openAssignments.data > 0) {
				return conflict(
					"Cannot freeze or close position with open assignments",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_position
							SET status = ${input.status},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.positionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_position', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Position",
				});
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set position status");
		}
	},

	async listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
		departmentId?: HumanResourcesDepartmentId;
		jobId?: HumanResourcesJobId;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>> {
		try {
			const conditions = [eq(hrPosition.organizationId, input.organizationId)];
			if (input.status) {
				conditions.push(eq(hrPosition.status, input.status));
			}
			if (input.departmentId) {
				conditions.push(eq(hrPosition.departmentId, input.departmentId));
			}
			if (input.jobId) {
				conditions.push(eq(hrPosition.jobId, input.jobId));
			}

			const offset = (input.page - 1) * input.pageSize;

			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrPosition)
					.where(and(...conditions))
					.orderBy(asc(hrPosition.title))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrPosition)
					.where(and(...conditions)),
			]);

			const positions: Position[] = [];
			for (const row of rows) {
				const mapped = mapPosition(row);
				if (!mapped.ok) return mapped;
				positions.push(mapped.data);
			}

			return ok({
				positions,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list positions");
		}
	},

	async countActiveOrFrozenPositionsForDepartment(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.departmentId, input.departmentId),
						or(
							eq(hrPosition.status, "active"),
							eq(hrPosition.status, "frozen"),
						),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active or frozen positions for department",
			);
		}
	},

	async countActiveOrFrozenPositionsForJob(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.jobId, input.jobId),
						or(
							eq(hrPosition.status, "active"),
							eq(hrPosition.status, "frozen"),
						),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active or frozen positions for job",
			);
		}
	},

	async countActiveChildDepartments(input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.parentDepartmentId, input.parentDepartmentId),
						eq(hrDepartment.status, "active"),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active child departments",
			);
		}
	},

	async getReportingLineById(input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.id, input.reportingLineId),
					),
				)
				.limit(1);
			const [reportingLine] = result;
			if (!reportingLine) return ok(null);
			return mapReportingLine(reportingLine);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load reporting line");
		}
	},

	async listReportingLinesForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine[]>> {
		try {
			const rows = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrReportingLine.startsOn));
			const lines: ReportingLine[] = [];
			for (const row of rows) {
				const mapped = mapReportingLine(row);
				if (!mapped.ok) return mapped;
				lines.push(mapped.data);
			}
			return ok(lines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list reporting lines for employee",
			);
		}
	},

	async findOpenPrimaryReportingLine(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
						eq(hrReportingLine.relationshipKind, "primary"),
						isNull(hrReportingLine.endsOn),
					),
				)
				.limit(1);
			const [reportingLine] = result;
			if (!reportingLine) return ok(null);
			return mapReportingLine(reportingLine);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find open primary reporting line",
			);
		}
	},

	async resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
						eq(hrReportingLine.relationshipKind, "primary"),
					),
				);
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: result,
				asOf: input.asOf,
				getId: (line) => line.id,
				getEffectiveFrom: (line) => line.startsOn,
				getEffectiveTo: (line) => line.endsOn,
			});
			if (!resolution.ok) {
				return fail(
					"CONFLICT",
					"Multiple primary reporting lines are effective on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return resolution.record === null
				? ok(null)
				: mapReportingLine(resolution.record);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to resolve primary manager");
		}
	},

	async listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
		try {
			const conditions = and(
				eq(hrReportingLine.organizationId, input.organizationId),
				eq(hrReportingLine.managerEmployeeId, input.managerEmployeeId),
				eq(hrReportingLine.relationshipKind, "primary"),
				lte(hrReportingLine.startsOn, input.asOf),
				or(
					isNull(hrReportingLine.endsOn),
					gte(hrReportingLine.endsOn, input.asOf),
				),
			);
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrReportingLine)
					.where(conditions)
					.orderBy(asc(hrReportingLine.startsOn))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrReportingLine)
					.where(conditions),
			]);
			const reportingLines: ReportingLine[] = [];
			for (const row of rows) {
				const mapped = mapReportingLine(row);
				if (!mapped.ok) return mapped;
				reportingLines.push(mapped.data);
			}
			return ok({
				reportingLines,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list direct reports");
		}
	},

	async assignPrimaryReportingLine(
		record: ReportingLineCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<ReportingLine>> {
		const assignable = await assertReportingLineAssignable(this, {
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			startsOn: record.startsOn,
			endsOn: record.endsOn,
		});
		if (!assignable.ok) return assignable;

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
							WITH employee AS (
								SELECT id, organization_id
								FROM hr_employee
								WHERE id = ${record.employeeId}
									AND organization_id = ${record.organizationId}
							),
							manager AS (
								SELECT id
								FROM hr_employee
								WHERE id = ${record.managerEmployeeId}
									AND organization_id = ${record.organizationId}
							),
							mutated AS (
								INSERT INTO hr_reporting_line (
									id, organization_id, employee_id, manager_employee_id,
									relationship_kind, starts_on, ends_on, version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, employee.organization_id, employee.id, manager.id,
									'primary', ${record.startsOn}, ${record.endsOn}, 1,
									${record.createdBy}, ${record.createdBy}
								FROM employee, manager
								WHERE NOT EXISTS (
									SELECT 1
									FROM hr_reporting_line open_primary
									WHERE open_primary.organization_id = employee.organization_id
										AND open_primary.employee_id = employee.id
										AND open_primary.relationship_kind = 'primary'
										AND open_primary.ends_on IS NULL
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_reporting_line', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapPersistenceFailure(
				error,
				"Failed to assign primary reporting line",
			);
		}
	},

	async closeReportingLine(
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<ReportingLine>> {
		const existing = await this.getReportingLineById({
			organizationId: input.organizationId,
			reportingLineId: input.reportingLineId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Reporting line not found");
		}
		const dateCheck = assertValidDateRange(
			existing.data.startsOn,
			input.endsOn,
		);
		if (!dateCheck.ok) return dateCheck;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_reporting_line
								SET ends_on = ${input.endsOn},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.reportingLineId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_reporting_line', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getReportingLineById({
					organizationId: input.organizationId,
					reportingLineId: input.reportingLineId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Reporting line",
				});
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close reporting line");
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<ReportingLine>> {
		const prior = await this.findOpenPrimaryReportingLine({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!prior.ok) return prior;
		if (prior.data === null) {
			return notFound("Open primary reporting line not found");
		}
		const priorLine = prior.data;
		const closeDateCheck = assertValidDateRange(
			priorLine.startsOn,
			input.closePriorOn,
		);
		if (!closeDateCheck.ok) return closeDateCheck;
		if (input.closePriorOn > input.startsOn) {
			return fail(
				"BAD_REQUEST",
				"Prior reporting line close date must be on or before new start date",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const assignable = await assertReportingLineAssignable(this, {
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			startsOn: input.startsOn,
			endsOn: input.endsOn,
			excludeReportingLineId: priorLine.id,
		});
		if (!assignable.ok) return assignable;

		const newId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(newId);
		if (!brandedId.ok) return brandedId;
		const closeAuditId = randomUUID();
		const createAuditId = randomUUID();
		const nextPriorVersion = priorLine.version + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
							WITH closed AS (
								UPDATE hr_reporting_line
								SET ends_on = ${input.closePriorOn},
									version = ${nextPriorVersion},
									updated_by = ${input.createdBy},
									updated_at = now()
								WHERE id = ${priorLine.id}
									AND organization_id = ${input.organizationId}
									AND version = ${priorLine.version}
									AND ends_on IS NULL
								RETURNING *
							),
							closed_audit AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${closeAuditId}, organization_id, ${input.createdBy}, ${meta.correlationId},
									'human-resources', 'hr_reporting_line', id, 'UPDATE', '[]'::jsonb
								FROM closed
								RETURNING id
							),
							employee AS (
								SELECT id, organization_id
								FROM hr_employee
								WHERE id = ${input.employeeId}
									AND organization_id = ${input.organizationId}
							),
							manager AS (
								SELECT id
								FROM hr_employee
								WHERE id = ${input.managerEmployeeId}
									AND organization_id = ${input.organizationId}
							),
							mutated AS (
								INSERT INTO hr_reporting_line (
									id, organization_id, employee_id, manager_employee_id,
									relationship_kind, starts_on, ends_on, version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, employee.organization_id, employee.id, manager.id,
									'primary', ${input.startsOn}, ${input.endsOn}, 1,
									${input.createdBy}, ${input.createdBy}
								FROM employee, manager, closed
								RETURNING *
							),
							created_audit AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${createAuditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_reporting_line', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, closed_audit, created_audit
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Could not replace primary reporting line");
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapPersistenceFailure(
				error,
				"Failed to replace primary reporting line",
			);
		}
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
		if (!departments.ok) return departments;
		if (input.rootDepartmentId !== null) {
			const root = departments.data.find(
				(d) => d.id === input.rootDepartmentId,
			);
			if (root === undefined) {
				return notFound("Root department not found");
			}
		}
		const tree = buildBoundedDepartmentTree({
			departments: departments.data,
			rootDepartmentId: input.rootDepartmentId,
			maxDepth: input.maxDepth,
			maxNodes: input.maxNodes,
		});
		return ok(tree);
	},
};

export function attachDrizzleOrganization(
	target: DrizzleOrganizationHost,
): void {
	Object.assign(target, drizzleOrganizationMethods);
}
