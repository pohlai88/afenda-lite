import { randomUUID } from "node:crypto";
import {
	type PreparedTransactionalAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "@afenda/audit";
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
import { errorResult, type Result } from "@afenda/errors";
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
import {
	type DepartmentStructureAtAsOf,
	type DepartmentStructureVersion,
	findOpenDepartmentStructureVersion,
	findOpenJobDefinitionVersion,
	findOpenPositionDefinitionVersion,
	type JobDefinitionAtAsOf,
	type JobDefinitionVersion,
	type PositionDefinitionAtAsOf,
	type PositionDefinitionVersion,
	resolveDepartmentStructureAsOf,
	resolveJobDefinitionAsOf,
	resolvePositionDefinitionAsOf,
} from "../../organization/organization-structure-lineage";
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
import { isResultFailure } from "../../shared/result-guards";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../shared/run-sequential";
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
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../../workforce-foundation/lineage-segment";

const ORGANIZATION_AUDIT_SOURCE = "human-resources.organization-drizzle";

interface OrganizationAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: "hr_department" | "hr_job" | "hr_position" | "hr_reporting_line";
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function prepareOrganizationAudit(
	input: OrganizationAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return prepareTransactionalAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: ORGANIZATION_AUDIT_SOURCE,
			occurredAt: null,
			causationId: null,
			reasonCode: input.reasonCode,
		},
	});
}

function mapNullableDepartmentId(
	value: string | null,
): Result<HumanResourcesDepartmentId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesDepartmentId(value);
}

function mapNullableJobId(
	value: string | null,
): Result<HumanResourcesJobId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesJobId(value);
}

function mapDepartment(
	row: typeof hrDepartment.$inferSelect,
): Result<Department> {
	const id = parseHumanResourcesDepartmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const parentDepartmentId = mapNullableDepartmentId(row.parentDepartmentId);
	if (!parentDepartmentId.ok) {
		return parentDepartmentId;
	}
	const status = departmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const status = jobStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const departmentId = mapNullableDepartmentId(row.departmentId);
	if (!departmentId.ok) {
		return departmentId;
	}
	const jobId = mapNullableJobId(row.jobId);
	if (!jobId.ok) {
		return jobId;
	}
	const status = positionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	if (!managerEmployeeId.ok) {
		return managerEmployeeId;
	}
	const supersedesReportingLineId =
		row.supersedesReportingLineId === null
			? errorResult.ok(null)
			: parseHumanResourcesReportingLineId(row.supersedesReportingLineId);
	if (isResultFailure(supersedesReportingLineId)) {
		return supersedesReportingLineId;
	}
	const supersededByReportingLineId =
		row.supersededByReportingLineId === null
			? errorResult.ok(null)
			: parseHumanResourcesReportingLineId(row.supersededByReportingLineId);
	if (isResultFailure(supersededByReportingLineId)) {
		return supersededByReportingLineId;
	}
	const relationshipKind = reportingRelationshipKindSchema.safeParse(
		row.relationshipKind,
	);
	if (!relationshipKind.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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

interface PositionSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	department_id: string | null;
	id: string;
	job_id: string | null;
	organization_id: string;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

interface DepartmentSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	id: string;
	name: string;
	organization_id: string;
	parent_department_id: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

interface JobSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

interface ReportingLineSqlRow {
	created_at: Date;
	created_by: string;
	employee_id: string;
	ends_on: string | null;
	id: string;
	manager_employee_id: string;
	organization_id: string;
	relationship_kind: string;
	starts_on: string;
	superseded_by_reporting_line_id: string | null;
	supersedes_reporting_line_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

type DepartmentStructureVersionSqlRow =
	typeof hrDepartmentStructureVersion.$inferSelect;

function mapDepartmentStructureVersionRow(
	row: DepartmentStructureVersionSqlRow,
): Result<DepartmentStructureVersion> {
	const departmentId = parseHumanResourcesDepartmentId(row.departmentId);
	if (!departmentId.ok) {
		return departmentId;
	}
	const parentDepartmentId = mapNullableDepartmentId(row.parentDepartmentId);
	if (!parentDepartmentId.ok) {
		return parentDepartmentId;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		departmentId: departmentId.data,
		name: row.name,
		parentDepartmentId: parentDepartmentId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesStructureVersionId: row.supersedesStructureVersionId,
		lineageStatus: row.lineageStatus === "superseded" ? "superseded" : "active",
		reasonCode: row.reasonCode,
		evidenceRef: row.evidenceRef,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type JobDefinitionVersionSqlRow = typeof hrJobDefinitionVersion.$inferSelect;

function mapJobDefinitionVersionRow(
	row: JobDefinitionVersionSqlRow,
): Result<JobDefinitionVersion> {
	const jobId = parseHumanResourcesJobId(row.jobId);
	if (!jobId.ok) {
		return jobId;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		jobId: jobId.data,
		title: row.title,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesDefinitionVersionId: row.supersedesDefinitionVersionId,
		lineageStatus: row.lineageStatus === "superseded" ? "superseded" : "active",
		reasonCode: row.reasonCode,
		evidenceRef: row.evidenceRef,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type PositionDefinitionVersionSqlRow =
	typeof hrPositionDefinitionVersion.$inferSelect;

function mapPositionDefinitionVersionRow(
	row: PositionDefinitionVersionSqlRow,
): Result<PositionDefinitionVersion> {
	const positionId = parseHumanResourcesPositionId(row.positionId);
	if (!positionId.ok) {
		return positionId;
	}
	const departmentId = mapNullableDepartmentId(row.departmentId);
	if (!departmentId.ok) {
		return departmentId;
	}
	const jobId = mapNullableJobId(row.jobId);
	if (!jobId.ok) {
		return jobId;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		positionId: positionId.data,
		title: row.title,
		departmentId: departmentId.data,
		jobId: jobId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesDefinitionVersionId: row.supersedesDefinitionVersionId,
		lineageStatus: row.lineageStatus === "superseded" ? "superseded" : "active",
		reasonCode: row.reasonCode,
		evidenceRef: row.evidenceRef,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
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
			const mapped = mapDepartmentStructureVersionRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			versions.push(mapped.data);
		}
		return errorResult.ok(versions);
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
			const mapped = mapJobDefinitionVersionRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			versions.push(mapped.data);
		}
		return errorResult.ok(versions);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to list job definition versions",
		);
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
			const mapped = mapPositionDefinitionVersionRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			versions.push(mapped.data);
		}
		return errorResult.ok(versions);
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
		excludeReportingLineId?: HumanResourcesReportingLineId | undefined;
	},
): Promise<Result<void>> {
	const dateCheck = assertValidDateRange(input.startsOn, input.endsOn);
	if (!dateCheck.ok) {
		return dateCheck;
	}

	const employee = await host.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}
	const manager = await host.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.managerEmployeeId,
	});
	if (!manager.ok) {
		return manager;
	}
	if (manager.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}

	const managerCache = new Map<
		string,
		HumanResourcesEmployeeId | null | undefined
	>();
	const loadManagerChain = async (
		current: HumanResourcesEmployeeId | null,
	): Promise<Result<void>> => {
		if (current === null || managerCache.has(current)) {
			return errorResult.ok(undefined);
		}
		const openPrimary: Result<ReportingLine | null> =
			await host.findOpenPrimaryReportingLine({
				organizationId: input.organizationId,
				employeeId: current,
			});
		if (!openPrimary.ok) {
			return openPrimary;
		}
		const next: HumanResourcesEmployeeId | null =
			openPrimary.data === null ? null : openPrimary.data.managerEmployeeId;
		managerCache.set(current, next);
		return loadManagerChain(next);
	};
	const managerChain = await loadManagerChain(input.managerEmployeeId);
	if (!managerChain.ok) {
		return managerChain;
	}

	const acyclic = assertReportingLineAcyclic({
		employeeId: input.employeeId,
		managerEmployeeId: input.managerEmployeeId,
		getOpenPrimaryManagerId: (employeeId) => managerCache.get(employeeId),
	});
	if (!acyclic.ok) {
		return acyclic;
	}

	const existingLines = await host.listReportingLinesForEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!existingLines.ok) {
		return existingLines;
	}
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
			if (!department) {
				return errorResult.ok(null);
			}
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
			if (!department) {
				return errorResult.ok(null);
			}
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

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesDepartmentId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const structureVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
		const parentId = record.parentDepartmentId;
		const preparedAudit = prepareOrganizationAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "DEPARTMENT_CREATED",
			newValue: {
				code: record.code,
				name: record.name,
				parentDepartmentId: parentId,
				status: record.status,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue12) => [
				parentId === null
					? sqlValue12`
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
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT
										${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
										${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
										${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
										${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
										${audit.ipAddress}, ${audit.userAgent}
									FROM mutated
									RETURNING id
								)
								SELECT mutated.* FROM mutated, lineage, audited
							`
					: sqlValue12`
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
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT
										${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
										${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
										${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
										${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
										${audit.ipAddress}, ${audit.userAgent}
									FROM mutated
									RETURNING id
								)
								SELECT mutated.* FROM mutated, lineage, audited
							`,
			]);
			const [row] = rows;
			if (!row) {
				if (parentId !== null) {
					const parent = await this.getDepartmentById({
						organizationId: record.organizationId,
						departmentId: parentId,
					});
					if (!parent.ok) {
						return parent;
					}
					if (parent.data === null) {
						return errorResult.fail("NOT_FOUND", {
							publicMessage: "The requested resource was not found",
							internalContext: humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
							),
						});
					}
					const parentActive = assertActiveDepartment(parent.data.status);
					if (!parentActive.ok) {
						return parentActive;
					}
				}
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}
			return mapPersistenceFailure(error, "Failed to create department");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Department>> {
		const existing = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Department not found");
		}

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextName = input.name === undefined ? existing.data.name : input.name;
		const nextParent =
			input.parentDepartmentId === undefined
				? existing.data.parentDepartmentId
				: input.parentDepartmentId;

		if (
			nextName === existing.data.name &&
			nextParent === existing.data.parentDepartmentId
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}

		const versionsResult = await listDepartmentStructureVersions({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}
		const openSegment = findOpenDepartmentStructureVersion(
			versionsResult.data,
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
			const parent = await this.getDepartmentById({
				organizationId: input.organizationId,
				departmentId: nextParent,
			});
			if (!parent.ok) {
				return parent;
			}
			if (parent.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}
			const parentActive = assertActiveDepartment(parent.data.status);
			if (!parentActive.ok) {
				return parentActive;
			}
		}

		const parentCache = new Map<
			string,
			HumanResourcesDepartmentId | null | undefined
		>();
		if (nextParent !== null) {
			const loadParentChain = async (
				current: HumanResourcesDepartmentId | null,
			): Promise<Result<void>> => {
				if (current === null || parentCache.has(current)) {
					return errorResult.ok(undefined);
				}
				const loaded = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: current,
				});
				if (!loaded.ok) {
					return loaded;
				}
				if (loaded.data === null) {
					parentCache.set(current, undefined);
					return errorResult.ok(undefined);
				}
				parentCache.set(current, loaded.data.parentDepartmentId);
				return loadParentChain(loaded.data.parentDepartmentId);
			};
			const parentChain = await loadParentChain(nextParent);
			if (!parentChain.ok) {
				return parentChain;
			}
		}
		const acyclic = assertDepartmentParentAcyclic({
			departmentId: input.departmentId,
			proposedParentId: nextParent,
			getParentId: (id) => parentCache.get(id),
		});
		if (!acyclic.ok) {
			return acyclic;
		}

		const auditId = randomUUID();
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
		const parentValue = nextParent;
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: input.departmentId,
			organizationId: input.organizationId,
			reasonCode: "DEPARTMENT_STRUCTURE_UPDATED",
			oldValue: {
				name: existing.data.name,
				parentDepartmentId: existing.data.parentDepartmentId,
			},
			newValue: { name: nextName, parentDepartmentId: nextParent },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue11) => [
				sqlValue11`
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
									${successorId}, mutated.organization_id, mutated.id, ${nextName}, ${parentValue},
									${input.effectiveOn}, NULL, ${openSegment.id}, 'active',
									${input.reasonCode}, ${input.evidenceRef ?? null}, 1,
									${input.actorUserId}, ${input.actorUserId}
								FROM mutated, closed
								RETURNING id
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
									${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
									${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
									${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
									${audit.ipAddress}, ${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, closed, successor, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Department not found");
		}
		const transition = assertDepartmentStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const children = await this.countActiveChildDepartments({
				organizationId: input.organizationId,
				parentDepartmentId: input.departmentId,
			});
			if (!children.ok) {
				return children;
			}
			if (children.data > 0) {
				return conflict(
					"Cannot archive department with active child departments",
				);
			}
			const positions = await this.countActiveOrFrozenPositionsForDepartment({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!positions.ok) {
				return positions;
			}
			if (positions.data > 0) {
				return conflict(
					"Cannot archive department with active or frozen positions",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const domainEventType = (() => {
			if (input.status === "active") {
				return HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT;
			}
			if (input.status === "archived") {
				return HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT;
			}
			return null;
		})();
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
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: input.departmentId,
			organizationId: input.organizationId,
			reasonCode: "DEPARTMENT_STATUS_CHANGED",
			oldValue: { status: existing.data.status },
			newValue: { status: input.status },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue10) => [
				domainEventType
					? sqlValue10`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
									${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
									${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
									${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
									${audit.ipAddress}, ${audit.userAgent}
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
					: sqlValue10`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
									${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
									${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
									${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
									${audit.ipAddress}, ${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) {
					return again;
				}
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
		status?: DepartmentStatus | undefined;
		parentDepartmentId?: HumanResourcesDepartmentId | null | undefined;
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
				if (!mapped.ok) {
					return mapped;
				}
				departments.push(mapped.data);
			}
			return errorResult.ok({
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
				if (!mapped.ok) {
					return mapped;
				}
				departments.push(mapped.data);
			}
			return errorResult.ok(departments);
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
			if (!job) {
				return errorResult.ok(null);
			}
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
			if (!job) {
				return errorResult.ok(null);
			}
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

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesJobId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const definitionVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
		const preparedAudit = prepareOrganizationAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "JOB_CREATED",
			newValue: {
				code: record.code,
				title: record.title,
				status: record.status,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue9) => [
				sqlValue9`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, lineage, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapJobSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
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
			evidenceRef?: string | undefined;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Job not found");
		}

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		if (input.title === existing.data.title) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}

		const versionsResult = await listJobDefinitionVersions({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}
		const openSegment = findOpenJobDefinitionVersion(
			versionsResult.data,
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

		const auditId = randomUUID();
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: input.jobId,
			organizationId: input.organizationId,
			reasonCode: "JOB_DEFINITION_UPDATED",
			oldValue: { title: existing.data.title },
			newValue: { title: input.title },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue8) => [
				sqlValue8`
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
								${successorId}, mutated.organization_id, mutated.id, ${input.title}, ${input.effectiveOn},
								NULL, ${openSegment.id}, 'active', ${input.reasonCode},
								${input.evidenceRef ?? null}, 1, ${input.actorUserId}, ${input.actorUserId}
							FROM mutated, closed
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Job not found");
		}
		const transition = assertJobStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const positions = await this.countActiveOrFrozenPositionsForJob({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!positions.ok) {
				return positions;
			}
			if (positions.data > 0) {
				return conflict("Cannot archive job with active or frozen positions");
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const domainEventType = (() => {
			if (input.status === "active") {
				return HUMAN_RESOURCES_JOB_ACTIVATED_EVENT;
			}
			if (input.status === "archived") {
				return HUMAN_RESOURCES_JOB_ARCHIVED_EVENT;
			}
			return null;
		})();
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
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: input.jobId,
			organizationId: input.organizationId,
			reasonCode: "JOB_STATUS_CHANGED",
			oldValue: { status: existing.data.status },
			newValue: { status: input.status },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue7) => [
				domainEventType
					? sqlValue7`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					: sqlValue7`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!again.ok) {
					return again;
				}
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
		status?: JobStatus | undefined;
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
				if (!mapped.ok) {
					return mapped;
				}
				jobs.push(mapped.data);
			}
			return errorResult.ok({
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
			if (!position) {
				return errorResult.ok(null);
			}
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
			if (!position) {
				return errorResult.ok(null);
			}
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
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const definitionVersionId = randomUUID();
		const effectiveFrom = new Date().toISOString().slice(0, 10);
		const preparedAudit = prepareOrganizationAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "POSITION_CREATED",
			newValue: {
				code: record.code,
				title: record.title,
				departmentId: record.departmentId,
				jobId: record.jobId,
				status: record.status,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue6) => [
				sqlValue6`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, lineage, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const department = await this.getDepartmentById({
					organizationId: record.organizationId,
					departmentId: record.departmentId,
				});
				if (!department.ok) {
					return department;
				}
				if (department.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					});
				}
				const departmentActive = assertActiveDepartment(department.data.status);
				if (!departmentActive.ok) {
					return departmentActive;
				}
				const job = await this.getJobById({
					organizationId: record.organizationId,
					jobId: record.jobId,
				});
				if (!job.ok) {
					return job;
				}
				if (job.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					});
				}
				const jobActive = assertActiveJob(job.data.status);
				if (!jobActive.ok) {
					return jobActive;
				}
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create position");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Position>> {
		const existing = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Position not found");
		}

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextTitle =
			input.title === undefined ? existing.data.title : input.title;
		const nextDepartmentId =
			input.departmentId === undefined
				? existing.data.departmentId
				: input.departmentId;
		const nextJobId =
			input.jobId === undefined ? existing.data.jobId : input.jobId;

		if (nextDepartmentId === null || nextJobId === null) {
			return invalidInput("Position requires department and job");
		}

		if (
			nextTitle === existing.data.title &&
			nextDepartmentId === existing.data.departmentId &&
			nextJobId === existing.data.jobId
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}

		const versionsResult = await listPositionDefinitionVersions({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}
		const openSegment = findOpenPositionDefinitionVersion(
			versionsResult.data,
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
			const department = await this.getDepartmentById({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!department.ok) {
				return department;
			}
			if (department.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}
			const departmentActive = assertActiveDepartment(department.data.status);
			if (!departmentActive.ok) {
				return departmentActive;
			}
		}
		if (input.jobId !== undefined) {
			const job = await this.getJobById({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}
			const jobActive = assertActiveJob(job.data.status);
			if (!jobActive.ok) {
				return jobActive;
			}
		}

		const auditId = randomUUID();
		const successorId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const predecessorEnd = previousIsoDate(input.effectiveOn);
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: input.positionId,
			organizationId: input.organizationId,
			reasonCode: "POSITION_DEFINITION_UPDATED",
			oldValue: {
				title: existing.data.title,
				departmentId: existing.data.departmentId,
				jobId: existing.data.jobId,
			},
			newValue: {
				title: nextTitle,
				departmentId: nextDepartmentId,
				jobId: nextJobId,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue5) => [
				sqlValue5`
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
								${successorId}, mutated.organization_id, mutated.id, ${nextTitle}, ${nextDepartmentId}, ${nextJobId},
								${input.effectiveOn}, NULL, ${openSegment.id}, 'active',
								${input.reasonCode}, ${input.evidenceRef ?? null}, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM mutated, closed
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Position not found");
		}
		const transition = assertPositionStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "frozen" || input.status === "closed") {
			const openAssignments = await this.countOpenAssignmentsForPosition({
				organizationId: input.organizationId,
				positionId: input.positionId,
			});
			if (!openAssignments.ok) {
				return openAssignments;
			}
			if (openAssignments.data > 0) {
				return conflict(
					"Cannot freeze or close position with open assignments",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const domainEventType = (() => {
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
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: input.positionId,
			organizationId: input.organizationId,
			reasonCode: "POSITION_STATUS_CHANGED",
			oldValue: { status: existing.data.status },
			newValue: { status: input.status },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue4) => [
				domainEventType
					? sqlValue4`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					: sqlValue4`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!again.ok) {
					return again;
				}
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
		status?: string | undefined;
		departmentId?: HumanResourcesDepartmentId | undefined;
		jobId?: HumanResourcesJobId | undefined;
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
				if (!mapped.ok) {
					return mapped;
				}
				positions.push(mapped.data);
			}

			return errorResult.ok({
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
			return errorResult.ok(rows[0]?.count ?? 0);
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
			return errorResult.ok(rows[0]?.count ?? 0);
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
			return errorResult.ok(rows[0]?.count ?? 0);
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
			if (!reportingLine) {
				return errorResult.ok(null);
			}
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
				if (!mapped.ok) {
					return mapped;
				}
				lines.push(mapped.data);
			}
			return errorResult.ok(lines);
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
			if (!reportingLine) {
				return errorResult.ok(null);
			}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return resolution.record === null
				? errorResult.ok(null)
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
				if (!mapped.ok) {
					return mapped;
				}
				reportingLines.push(mapped.data);
			}
			return errorResult.ok({
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
		if (!assignable.ok) {
			return assignable;
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = humanResourcesEntityEventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_reporting_line",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		const preparedAudit = prepareOrganizationAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: brandedId.data,
			organizationId: record.organizationId,
			reasonCode: "REPORTING_LINE_ASSIGNED",
			newValue: {
				employeeId: record.employeeId,
				managerEmployeeId: record.managerEmployeeId,
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				relationshipKind: "primary",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue3) => [
				sqlValue3`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
									${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
									${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
									${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
									${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Reporting line not found");
		}
		const dateCheck = assertValidDateRange(
			existing.data.startsOn,
			input.endsOn,
		);
		if (!dateCheck.ok) {
			return dateCheck;
		}

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
		const preparedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: input.reportingLineId,
			organizationId: input.organizationId,
			reasonCode: "REPORTING_LINE_CLOSED",
			oldValue: { endsOn: existing.data.endsOn },
			newValue: { endsOn: input.endsOn },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue2) => [
				sqlValue2`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
									${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
									${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
									${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
									${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getReportingLineById({
					organizationId: input.organizationId,
					reportingLineId: input.reportingLineId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!prior.ok) {
			return prior;
		}
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
		if (!closeDateCheck.ok) {
			return closeDateCheck;
		}
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
		if (!assignable.ok) {
			return assignable;
		}

		const newId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(newId);
		if (!brandedId.ok) {
			return brandedId;
		}
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
		const preparedClosedAudit = prepareOrganizationAudit({
			action: "UPDATE",
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: priorLine.id,
			organizationId: input.organizationId,
			reasonCode: "REPORTING_LINE_REPLACED",
			oldValue: {
				managerEmployeeId: priorLine.managerEmployeeId,
				endsOn: priorLine.endsOn,
			},
			newValue: {
				managerEmployeeId: priorLine.managerEmployeeId,
				endsOn: input.closePriorOn,
				supersededByReportingLineId: brandedId.data,
			},
		});
		if (!preparedClosedAudit.ok) {
			return preparedClosedAudit;
		}
		const closedAudit = preparedClosedAudit.data;
		const preparedCreatedAudit = prepareOrganizationAudit({
			action: "CREATE",
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: brandedId.data,
			organizationId: input.organizationId,
			reasonCode: "REPORTING_LINE_REPLACED",
			newValue: {
				employeeId: input.employeeId,
				managerEmployeeId: input.managerEmployeeId,
				startsOn: input.startsOn,
				endsOn: input.endsOn,
				relationshipKind: "primary",
				supersedesReportingLineId: priorLine.id,
			},
		});
		if (!preparedCreatedAudit.ok) {
			return preparedCreatedAudit;
		}
		const createdAudit = preparedCreatedAudit.data;
		try {
			const [rows] = await runNeonHttpTransaction((sqlValue) => [
				sqlValue`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${closeAuditId}, ${closedAudit.organizationId}, ${closedAudit.actorUserId},
									${closedAudit.correlationId}, ${closedAudit.module}, ${closedAudit.entity},
									${closedAudit.entityId}, ${closedAudit.action}, ${closedAudit.changesJson}::jsonb,
									${closedAudit.oldValueJson}::jsonb, ${closedAudit.newValueJson}::jsonb,
									${closedAudit.metadataJson}::jsonb, ${closedAudit.ipAddress}, ${closedAudit.userAgent}
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT
									${createAuditId}, ${createdAudit.organizationId}, ${createdAudit.actorUserId},
									${createdAudit.correlationId}, ${createdAudit.module}, ${createdAudit.entity},
									${createdAudit.entityId}, ${createdAudit.action}, ${createdAudit.changesJson}::jsonb,
									${createdAudit.oldValueJson}::jsonb, ${createdAudit.newValueJson}::jsonb,
									${createdAudit.metadataJson}::jsonb, ${createdAudit.ipAddress}, ${createdAudit.userAgent}
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
			]);
			const [row] = rows;
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
		if (!departments.ok) {
			return departments;
		}
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
		return errorResult.ok(tree);
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
		if (!department.ok) {
			return department;
		}
		if (department.data === null) {
			return errorResult.ok(null);
		}

		const versionsResult = await listDepartmentStructureVersions({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}

		const resolved = resolveDepartmentStructureAsOf({
			versions: versionsResult.data,
			departmentId: input.departmentId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}
		if (resolved.record === null) {
			return errorResult.ok(null);
		}

		return errorResult.ok({
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
		if (!job.ok) {
			return job;
		}
		if (job.data === null) {
			return errorResult.ok(null);
		}

		const versionsResult = await listJobDefinitionVersions({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}

		const resolved = resolveJobDefinitionAsOf({
			versions: versionsResult.data,
			jobId: input.jobId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}
		if (resolved.record === null) {
			return errorResult.ok(null);
		}

		return errorResult.ok({
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
		if (!position.ok) {
			return position;
		}
		if (position.data === null) {
			return errorResult.ok(null);
		}

		const versionsResult = await listPositionDefinitionVersions({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!versionsResult.ok) {
			return versionsResult;
		}

		const resolved = resolvePositionDefinitionAsOf({
			versions: versionsResult.data,
			positionId: input.positionId,
			asOf: input.asOf,
		});
		if (!resolved.ok) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				),
			});
		}
		if (resolved.record === null) {
			return errorResult.ok(null);
		}

		return errorResult.ok({
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
		const sequentialOutcome1 = await runSequential(
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
		if (sequentialOutcome1.kind === "return") {
			return sequentialOutcome1.value;
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
		return errorResult.ok(tree);
	},
};

export function attachDrizzleOrganization(
	target: DrizzleOrganizationHost,
): void {
	Object.assign(target, drizzleOrganizationMethods);
}
