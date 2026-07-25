import { randomUUID } from "node:crypto";
import {
	and,
	asc,
	db,
	desc,
	eq,
	gte,
	hrDepartment,
	hrDepartmentStructureVersion,
	hrJob,
	hrJobDefinitionVersion,
	hrPosition,
	hrPositionDefinitionVersion,
	hrReportingLine,
	isNull,
	lte,
	or,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
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
import { humanResourcesEntityEventPayloadJson } from "../../shared/audit-facts";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidInput,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { previousIsoDate } from "../../shared/effective-dates";
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
import {
	findOpenDepartmentStructureVersion,
	findOpenJobDefinitionVersion,
	findOpenPositionDefinitionVersion,
	resolveDepartmentStructureAsOf,
	resolveJobDefinitionAsOf,
	resolvePositionDefinitionAsOf,
	type DepartmentStructureAtAsOf,
	type DepartmentStructureVersion,
	type JobDefinitionAtAsOf,
	type JobDefinitionVersion,
	type PositionDefinitionAtAsOf,
	type PositionDefinitionVersion,
} from "../../organization/organization-structure-lineage";
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../../workforce-foundation/lineage-segment";
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
	const supersedesReportingLineId =
		row.supersedesReportingLineId === null
			? ok(null)
			: parseHumanResourcesReportingLineId(row.supersedesReportingLineId);
	if (!supersedesReportingLineId.ok) return supersedesReportingLineId;
	const supersededByReportingLineId =
		row.supersededByReportingLineId === null
			? ok(null)
			: parseHumanResourcesReportingLineId(row.supersededByReportingLineId);
	if (!supersededByReportingLineId.ok) return supersededByReportingLineId;
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
		supersedesReportingLineId: supersedesReportingLineId.data,
		supersededByReportingLineId: supersededByReportingLineId.data,
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
	supersedes_reporting_line_id: string | null;
	superseded_by_reporting_line_id: string | null;
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
		supersedesReportingLineId: row.supersedes_reporting_line_id,
		supersededByReportingLineId: row.superseded_by_reporting_line_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type DepartmentStructureVersionSqlRow = {
	id: string;
	organization_id: string;
	department_id: string;
	name: string;
	parent_department_id: string | null;
	effective_from: string;
	effective_to: string | null;
	supersedes_structure_version_id: string | null;
	lineage_status: string;
	reason_code: string;
	evidence_ref: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapDepartmentStructureVersionRow(
	row: DepartmentStructureVersionSqlRow,
): Result<DepartmentStructureVersion> {
	const departmentId = parseHumanResourcesDepartmentId(row.department_id);
	if (!departmentId.ok) return departmentId;
	const parentDepartmentId = mapNullableDepartmentId(row.parent_department_id);
	if (!parentDepartmentId.ok) return parentDepartmentId;
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		departmentId: departmentId.data,
		name: row.name,
		parentDepartmentId: parentDepartmentId.data,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesStructureVersionId: row.supersedes_structure_version_id,
		lineageStatus:
			row.lineage_status === "superseded" ? "superseded" : "active",
		reasonCode: row.reason_code,
		evidenceRef: row.evidence_ref,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type JobDefinitionVersionSqlRow = {
	id: string;
	organization_id: string;
	job_id: string;
	title: string;
	effective_from: string;
	effective_to: string | null;
	supersedes_definition_version_id: string | null;
	lineage_status: string;
	reason_code: string;
	evidence_ref: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapJobDefinitionVersionRow(
	row: JobDefinitionVersionSqlRow,
): Result<JobDefinitionVersion> {
	const jobId = parseHumanResourcesJobId(row.job_id);
	if (!jobId.ok) return jobId;
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		jobId: jobId.data,
		title: row.title,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesDefinitionVersionId: row.supersedes_definition_version_id,
		lineageStatus:
			row.lineage_status === "superseded" ? "superseded" : "active",
		reasonCode: row.reason_code,
		evidenceRef: row.evidence_ref,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type PositionDefinitionVersionSqlRow = {
	id: string;
	organization_id: string;
	position_id: string;
	title: string;
	department_id: string | null;
	job_id: string | null;
	effective_from: string;
	effective_to: string | null;
	supersedes_definition_version_id: string | null;
	lineage_status: string;
	reason_code: string;
	evidence_ref: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapPositionDefinitionVersionRow(
	row: PositionDefinitionVersionSqlRow,
): Result<PositionDefinitionVersion> {
	const positionId = parseHumanResourcesPositionId(row.position_id);
	if (!positionId.ok) return positionId;
	const departmentId = mapNullableDepartmentId(row.department_id);
	if (!departmentId.ok) return departmentId;
	const jobId = mapNullableJobId(row.job_id);
	if (!jobId.ok) return jobId;
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		positionId: positionId.data,
		title: row.title,
		departmentId: departmentId.data,
		jobId: jobId.data,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesDefinitionVersionId: row.supersedes_definition_version_id,
		lineageStatus:
			row.lineage_status === "superseded" ? "superseded" : "active",
		reasonCode: row.reason_code,
		evidenceRef: row.evidence_ref,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

async function listDepartmentStructureVersions(input: {
	organizationId: string;
	departmentId: HumanResourcesDepartmentId;
}): Promise<Result<DepartmentStructureVersion[]>> {
	try {
		const rows = await db
			.select()
			.from(hrDepartmentStructureVersion)
			.where(
				and(
					eq(hrDepartmentStructureVersion.organizationId, input.organizationId),
					eq(hrDepartmentStructureVersion.departmentId, input.departmentId),
				),
			);
		const versions: DepartmentStructureVersion[] = [];
		for (const row of rows) {
			const mapped = mapDepartmentStructureVersionRow(
				row as unknown as DepartmentStructureVersionSqlRow,
			);
			if (!mapped.ok) return mapped;
			versions.push(mapped.data);
		}
		return ok(versions);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to list department structure versions",
		);
	}
}

async function listJobDefinitionVersions(input: {
	organizationId: string;
	jobId: HumanResourcesJobId;
}): Promise<Result<JobDefinitionVersion[]>> {
	try {
		const rows = await db
			.select()
			.from(hrJobDefinitionVersion)
			.where(
				and(
					eq(hrJobDefinitionVersion.organizationId, input.organizationId),
					eq(hrJobDefinitionVersion.jobId, input.jobId),
				),
			);
		const versions: JobDefinitionVersion[] = [];
		for (const row of rows) {
			const mapped = mapJobDefinitionVersionRow(
				row as unknown as JobDefinitionVersionSqlRow,
			);
			if (!mapped.ok) return mapped;
			versions.push(mapped.data);
		}
		return ok(versions);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to list job definition versions");
	}
}

async function listPositionDefinitionVersions(input: {
	organizationId: string;
	positionId: HumanResourcesPositionId;
}): Promise<Result<PositionDefinitionVersion[]>> {
	try {
		const rows = await db
			.select()
			.from(hrPositionDefinitionVersion)
			.where(
				and(
					eq(hrPositionDefinitionVersion.organizationId, input.organizationId),
					eq(hrPositionDefinitionVersion.positionId, input.positionId),
				),
			);
		const versions: PositionDefinitionVersion[] = [];
		for (const row of rows) {
			const mapped = mapPositionDefinitionVersionRow(
				row as unknown as PositionDefinitionVersionSqlRow,
			);
			if (!mapped.ok) return mapped;
			versions.push(mapped.data);
		}
		return ok(versions);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to list position definition versions",
		);
	}
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
	| "findDepartmentAsOf"
	| "findJobAsOf"
	| "findPositionAsOf"
	| "getOrganizationTreeAsOf"
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
		const structureVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
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
								lineage AS (
									INSERT INTO hr_department_structure_version (
										id, organization_id, department_id, name, parent_department_id,
										effective_from, effective_to, supersedes_structure_version_id,
										lineage_status, reason_code, evidence_ref, version, created_by, updated_by
									)
									SELECT
										${structureVersionId}, organization_id, id, name, parent_department_id,
										${effectiveFrom}, NULL, NULL, 'active', 'initial_record', NULL, 1,
										created_by, created_by
									FROM mutated
									RETURNING id
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
								SELECT mutated.* FROM mutated, lineage, audited
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
								lineage AS (
									INSERT INTO hr_department_structure_version (
										id, organization_id, department_id, name, parent_department_id,
										effective_from, effective_to, supersedes_structure_version_id,
										lineage_status, reason_code, evidence_ref, version, created_by, updated_by
									)
									SELECT
										${structureVersionId}, organization_id, id, name, parent_department_id,
										${effectiveFrom}, NULL, NULL, 'active', 'initial_record', NULL, 1,
										created_by, created_by
									FROM mutated
									RETURNING id
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
								SELECT mutated.* FROM mutated, lineage, audited
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
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string;
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

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextName =
			input.name !== undefined ? input.name : existing.data.name;
		const nextParent =
			input.parentDepartmentId !== undefined
				? input.parentDepartmentId
				: existing.data.parentDepartmentId;

		if (
			nextName === existing.data.name &&
			nextParent === existing.data.parentDepartmentId
		) {
			return fail(
				"CONFLICT",
				"Department structure correction must change name or parent",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}

		const versionsResult = await listDepartmentStructureVersions({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!versionsResult.ok) return versionsResult;
		const openSegment = findOpenDepartmentStructureVersion(
			versionsResult.data,
			input.organizationId,
			input.departmentId,
		);
		if (openSegment === null) {
			return fail(
				"CONFLICT",
				"Department structure lineage is missing an open segment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		const mutableCheck = assertLineageSegmentMutable(openSegment);
		if (!mutableCheck.ok) return mutableCheck;
		const effectiveOnCheck = validateLineageSegmentEffectiveOn({
			openEffectiveFrom: openSegment.effectiveFrom,
			effectiveOn: input.effectiveOn,
		});
		if (!effectiveOnCheck.ok) return effectiveOnCheck;

		if (nextParent !== null) {
			const parent = await this.getDepartmentById({
				organizationId: input.organizationId,
				departmentId: nextParent,
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

		const parentCache = new Map<
			string,
			HumanResourcesDepartmentId | null | undefined
		>();
		if (nextParent !== null) {
			let current: HumanResourcesDepartmentId | null = nextParent;
			while (current !== null) {
				if (parentCache.has(current)) {
					break;
				}
				const loaded = await this.getDepartmentById({
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
			proposedParentId: nextParent,
			getParentId: (id) => parentCache.get(id),
		});
		if (!acyclic.ok) return acyclic;

		const auditId = randomUUID();
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
		const parentValue = nextParent;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_department
								SET name = ${nextName},
									parent_department_id = ${parentValue},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.departmentId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							closed AS (
								UPDATE hr_department_structure_version
								SET effective_to = ${predecessorEnd},
									lineage_status = 'superseded',
									version = version + 1,
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE organization_id = ${input.organizationId}
									AND department_id = ${input.departmentId}
									AND id = ${openSegment.id}
									AND effective_to IS NULL
									AND lineage_status = 'active'
								RETURNING id
							),
							successor AS (
								INSERT INTO hr_department_structure_version (
									id, organization_id, department_id, name, parent_department_id,
									effective_from, effective_to, supersedes_structure_version_id,
									lineage_status, reason_code, evidence_ref, version, created_by, updated_by
								)
								SELECT
									${successorId}, organization_id, id, ${nextName}, ${parentValue},
									${input.effectiveOn}, NULL, ${openSegment.id}, 'active',
									${input.reasonCode}, ${input.evidenceRef ?? null}, 1,
									${input.actorUserId}, ${input.actorUserId}
								FROM mutated, closed
								RETURNING id
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
							SELECT mutated.* FROM mutated, closed, successor, audited
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
		const domainEventType =
			input.status === "active"
				? HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT
				: input.status === "archived"
					? HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT
					: null;
		const eventId = domainEventType ? randomUUID() : null;
		const payloadJson = domainEventType
			? humanResourcesEntityEventPayloadJson({
					organizationId: input.organizationId,
					entityType: "hr_department",
					entityId: input.departmentId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				})
			: null;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					domainEventType
						? sql`
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
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${domainEventType}, 'human-resources',
									${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`
						: sql`
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
		const definitionVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
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
						lineage AS (
							INSERT INTO hr_job_definition_version (
								id, organization_id, job_id, title, effective_from,
								effective_to, supersedes_definition_version_id, lineage_status,
								reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${definitionVersionId}, organization_id, id, title, ${effectiveFrom},
								NULL, NULL, 'active', 'initial_record', NULL, 1, created_by, created_by
							FROM mutated
							RETURNING id
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
						SELECT mutated.* FROM mutated, lineage, audited
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
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string;
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

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		if (input.title === existing.data.title) {
			return fail(
				"CONFLICT",
				"Job definition correction must change title",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}

		const versionsResult = await listJobDefinitionVersions({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!versionsResult.ok) return versionsResult;
		const openSegment = findOpenJobDefinitionVersion(
			versionsResult.data,
			input.organizationId,
			input.jobId,
		);
		if (openSegment === null) {
			return fail(
				"CONFLICT",
				"Job definition lineage is missing an open segment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		const mutableCheck = assertLineageSegmentMutable(openSegment);
		if (!mutableCheck.ok) return mutableCheck;
		const effectiveOnCheck = validateLineageSegmentEffectiveOn({
			openEffectiveFrom: openSegment.effectiveFrom,
			effectiveOn: input.effectiveOn,
		});
		if (!effectiveOnCheck.ok) return effectiveOnCheck;

		const auditId = randomUUID();
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
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
						closed AS (
							UPDATE hr_job_definition_version
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE organization_id = ${input.organizationId}
								AND job_id = ${input.jobId}
								AND id = ${openSegment.id}
								AND effective_to IS NULL
								AND lineage_status = 'active'
							RETURNING id
						),
						successor AS (
							INSERT INTO hr_job_definition_version (
								id, organization_id, job_id, title, effective_from,
								effective_to, supersedes_definition_version_id, lineage_status,
								reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, organization_id, id, ${input.title}, ${input.effectiveOn},
								NULL, ${openSegment.id}, 'active', ${input.reasonCode},
								${input.evidenceRef ?? null}, 1, ${input.actorUserId}, ${input.actorUserId}
							FROM mutated, closed
							RETURNING id
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
						SELECT mutated.* FROM mutated, closed, successor, audited
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
		const domainEventType =
			input.status === "active"
				? HUMAN_RESOURCES_JOB_ACTIVATED_EVENT
				: input.status === "archived"
					? HUMAN_RESOURCES_JOB_ARCHIVED_EVENT
					: null;
		const eventId = domainEventType ? randomUUID() : null;
		const payloadJson = domainEventType
			? humanResourcesEntityEventPayloadJson({
					organizationId: input.organizationId,
					entityType: "hr_job",
					entityId: input.jobId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				})
			: null;
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				domainEventType
					? sql`
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
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${domainEventType}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
					: sql`
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
		const definitionVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
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
						lineage AS (
							INSERT INTO hr_position_definition_version (
								id, organization_id, position_id, title, department_id, job_id,
								effective_from, effective_to, supersedes_definition_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${definitionVersionId}, organization_id, id, title, department_id, job_id,
								${effectiveFrom}, NULL, NULL, 'active', 'initial_record', NULL, 1,
								created_by, created_by
							FROM mutated
							RETURNING id
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
						SELECT mutated.* FROM mutated, lineage, audited
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
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string;
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

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextTitle =
			input.title !== undefined ? input.title : existing.data.title;
		const nextDepartmentId =
			input.departmentId !== undefined
				? input.departmentId
				: existing.data.departmentId;
		const nextJobId =
			input.jobId !== undefined ? input.jobId : existing.data.jobId;

		if (nextDepartmentId === null || nextJobId === null) {
			return invalidInput("Position requires department and job");
		}

		if (
			nextTitle === existing.data.title &&
			nextDepartmentId === existing.data.departmentId &&
			nextJobId === existing.data.jobId
		) {
			return fail(
				"CONFLICT",
				"Position definition correction must change title, department, or job",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}

		const versionsResult = await listPositionDefinitionVersions({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!versionsResult.ok) return versionsResult;
		const openSegment = findOpenPositionDefinitionVersion(
			versionsResult.data,
			input.organizationId,
			input.positionId,
		);
		if (openSegment === null) {
			return fail(
				"CONFLICT",
				"Position definition lineage is missing an open segment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		const mutableCheck = assertLineageSegmentMutable(openSegment);
		if (!mutableCheck.ok) return mutableCheck;
		const effectiveOnCheck = validateLineageSegmentEffectiveOn({
			openEffectiveFrom: openSegment.effectiveFrom,
			effectiveOn: input.effectiveOn,
		});
		if (!effectiveOnCheck.ok) return effectiveOnCheck;

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
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_position
							SET title = ${nextTitle},
								department_id = ${nextDepartmentId},
								job_id = ${nextJobId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.positionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_position_definition_version
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE organization_id = ${input.organizationId}
								AND position_id = ${input.positionId}
								AND id = ${openSegment.id}
								AND effective_to IS NULL
								AND lineage_status = 'active'
							RETURNING id
						),
						successor AS (
							INSERT INTO hr_position_definition_version (
								id, organization_id, position_id, title, department_id, job_id,
								effective_from, effective_to, supersedes_definition_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, organization_id, id, ${nextTitle}, ${nextDepartmentId}, ${nextJobId},
								${input.effectiveOn}, NULL, ${openSegment.id}, 'active',
								${input.reasonCode}, ${input.evidenceRef ?? null}, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM mutated, closed
							RETURNING id
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
						SELECT mutated.* FROM mutated, closed, successor, audited
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
		const domainEventType =
			input.status === "active"
				? HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT
				: input.status === "frozen"
					? HUMAN_RESOURCES_POSITION_FROZEN_EVENT
					: input.status === "closed"
						? HUMAN_RESOURCES_POSITION_CLOSED_EVENT
						: null;
		const eventId = domainEventType ? randomUUID() : null;
		const payloadJson = domainEventType
			? humanResourcesEntityEventPayloadJson({
					organizationId: input.organizationId,
					entityType: "hr_position",
					entityId: input.positionId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				})
			: null;
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				domainEventType
					? sql`
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
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${domainEventType}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
					: sql`
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
		const eventId = randomUUID();
		const payloadJson = humanResourcesEntityEventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_reporting_line",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
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
									relationship_kind, starts_on, ends_on,
									supersedes_reporting_line_id, superseded_by_reporting_line_id,
									version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, employee.organization_id, employee.id, manager.id,
									'primary', ${record.startsOn}, ${record.endsOn}, NULL, NULL, 1,
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
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT}, 'human-resources',
									${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
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
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const payloadJson = humanResourcesEntityEventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_reporting_line",
			entityId: input.reportingLineId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
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
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT}, 'human-resources',
									${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
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
		if (input.closePriorOn < priorLine.startsOn) {
			return invalidInput(
				"closePriorOn must be on or after the prior reporting line start date",
			);
		}
		const closeDateCheck = assertValidDateRange(
			priorLine.startsOn,
			input.closePriorOn,
		);
		if (!closeDateCheck.ok) return closeDateCheck;
		if (input.closePriorOn > input.startsOn) {
			return invalidInput(
				"closePriorOn must be on or before the new reporting line start date",
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
		const replaceEventId = randomUUID();
		const nextPriorVersion = priorLine.version + 1;
		const replacePayloadJson = humanResourcesEntityEventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_reporting_line",
			entityId: brandedId.data,
			actorId: input.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
							WITH closed AS (
								UPDATE hr_reporting_line
								SET ends_on = ${input.closePriorOn},
									superseded_by_reporting_line_id = ${brandedId.data},
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
									relationship_kind, starts_on, ends_on,
									supersedes_reporting_line_id, superseded_by_reporting_line_id,
									version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, employee.organization_id, employee.id, manager.id,
									'primary', ${input.startsOn}, ${input.endsOn},
									${priorLine.id}, NULL, 1,
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
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${replaceEventId}, organization_id, ${HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT}, 'human-resources',
									${meta.correlationId}, created_by, ${replacePayloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, closed_audit, created_audit, outboxed
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

	async findDepartmentAsOf(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
		asOf: string;
	}): Promise<Result<DepartmentStructureAtAsOf | null>> {
		const department = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!department.ok) return department;
		if (department.data === null) return ok(null);

		const versionsResult = await listDepartmentStructureVersions({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!versionsResult.ok) return versionsResult;

		const resolved = resolveDepartmentStructureAsOf({
			versions: versionsResult.data,
			departmentId: input.departmentId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return fail(
				"CONFLICT",
				`Department structure is not deterministic for as-of date (${resolved.reason})`,
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		if (resolved.record === null) return ok(null);

		return ok({
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
	}): Promise<Result<JobDefinitionAtAsOf | null>> {
		const job = await this.getJobById({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!job.ok) return job;
		if (job.data === null) return ok(null);

		const versionsResult = await listJobDefinitionVersions({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!versionsResult.ok) return versionsResult;

		const resolved = resolveJobDefinitionAsOf({
			versions: versionsResult.data,
			jobId: input.jobId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return fail(
				"CONFLICT",
				`Job definition is not deterministic for as-of date (${resolved.reason})`,
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		if (resolved.record === null) return ok(null);

		return ok({
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
		const position = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!position.ok) return position;
		if (position.data === null) return ok(null);

		const versionsResult = await listPositionDefinitionVersions({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!versionsResult.ok) return versionsResult;

		const resolved = resolvePositionDefinitionAsOf({
			versions: versionsResult.data,
			positionId: input.positionId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return fail(
				"CONFLICT",
				`Position definition is not deterministic for as-of date (${resolved.reason})`,
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
		if (resolved.record === null) return ok(null);

		return ok({
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
		if (!departments.ok) return departments;

		const historicalDepartments: Department[] = [];
		for (const department of departments.data) {
			const asOfStructure = await this.findDepartmentAsOf({
				organizationId: input.organizationId,
				departmentId: department.id,
				asOf: input.asOf,
			});
			if (!asOfStructure.ok) return asOfStructure;
			if (asOfStructure.data === null) continue;
			historicalDepartments.push({
				...department,
				name: asOfStructure.data.name,
				parentDepartmentId: asOfStructure.data.parentDepartmentId,
			});
		}

		if (input.rootDepartmentId !== null) {
			const root = historicalDepartments.find(
				(d) => d.id === input.rootDepartmentId,
			);
			if (root === undefined) {
				return notFound("Root department not found");
			}
		}

		const tree = buildBoundedDepartmentTree({
			departments: historicalDepartments,
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
