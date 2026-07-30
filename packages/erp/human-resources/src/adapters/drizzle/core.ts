import { randomUUID } from "node:crypto";
import {
	and,
	db,
	desc,
	eq,
	gte,
	hrEmployee,
	hrEmployment,
	hrEmploymentContract,
	hrEmploymentStatusHistory,
	hrPosition,
	hrWorkAssignment,
	isNull,
	lte,
	or,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";
import {
	type HumanResourcesAssignmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentContractId,
	type HumanResourcesEmploymentId,
	type HumanResourcesPositionId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentContractId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	assertAssignmentWithinEmployment,
	assertNoAssignmentOverlap,
	multiplePrimaryAssignmentsAtAsOf,
} from "../../shared/assignment-guards";
import { mapAssignmentLineageFields } from "../../shared/assignment-lineage-map";
import {
	eventPayloadJson,
	fieldChangeJson,
	valueSnapshotJson,
} from "../../shared/audit-facts";
import {
	missAfterOptimisticUpdate,
	rehireRequiresEndedEmployment,
} from "../../shared/domain-guards";
import { resolveUniqueEffectiveRangeRecordBy } from "../../shared/effective-range";
import { compareEmploymentContractsByLineage } from "../../shared/employment-contract-guards";
import type { EmploymentStatusChangeKind } from "../../shared/employment-history";
import type { EmploymentStatus } from "../../shared/employment-status";
import {
	assertValidDateRange,
	employmentStatusSchema,
} from "../../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	isCreateIdempotencyUniqueViolation,
	isEmployeeNumberUniqueViolation,
	mapEmployeeNumberDuplicate,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type {
	AssignmentCreateRecord,
	EmployeeCreateRecord,
	EmploymentContractCreateRecord,
	EmploymentCreateRecord,
	EmploymentStatusHistoryAppendRecord,
	HumanResourcesStore,
	IdempotentEmployeeRecord,
	WorkforcePlanActualAssignment,
} from "../../store";
import type {
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	EmploymentStatusHistory,
	Position,
	PositionOccupancyAsOf,
	WorkAssignment,
} from "../../types";

interface EmployeeSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_number: string;
	id: string;
	legal_name: string;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapEmployeeFields(input: {
	id: HumanResourcesEmployeeId;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Employee {
	return input;
}

function mapEmployeeRow(row: EmployeeSqlRow): Result<Employee> {
	const id = parseHumanResourcesEmployeeId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok(
		mapEmployeeFields({
			id: id.data,
			organizationId: row.organization_id,
			employeeNumber: row.employee_number,
			legalName: row.legal_name,
			version: row.version,
			createdBy: row.created_by,
			updatedBy: row.updated_by,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}),
	);
}

function mapEmployee(row: typeof hrEmployee.$inferSelect): Result<Employee> {
	const id = parseHumanResourcesEmployeeId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok(
		mapEmployeeFields({
			id: id.data,
			organizationId: row.organizationId,
			employeeNumber: row.employeeNumber,
			legalName: row.legalName,
			version: row.version,
			createdBy: row.createdBy,
			updatedBy: row.updatedBy,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}),
	);
}

function mapEmployment(
	row: typeof hrEmployment.$inferSelect,
): Result<Employment> {
	const id = parseHumanResourcesEmploymentId(row.id);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!id.ok) {
		return id;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = employmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		status: status.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEmploymentStatusHistory(
	row: typeof hrEmploymentStatusHistory.$inferSelect,
): Result<EmploymentStatusHistory> {
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employmentId.ok) {
		return employmentId;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	const toStatus = employmentStatusSchema.safeParse(row.toStatus);
	if (!toStatus.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment status history in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const fromStatus =
		row.fromStatus === null
			? null
			: employmentStatusSchema.safeParse(row.fromStatus);
	if (fromStatus !== null && !fromStatus.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment status history in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const changeKind = row.changeKind as EmploymentStatusChangeKind;
	return ok({
		id: row.id,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		fromStatus: fromStatus === null ? null : fromStatus.data,
		toStatus: toStatus.data,
		startsOnSnapshot: row.startsOnSnapshot,
		endsOnSnapshot: row.endsOnSnapshot,
		effectiveOn: row.effectiveOn,
		changeKind,
		reason: row.reason,
		evidenceReference: row.evidenceReference,
		correlationId: row.correlationId,
		actorUserId: row.actorUserId,
		createdAt: row.createdAt,
	});
}

function mapEmploymentContract(
	row: typeof hrEmploymentContract.$inferSelect,
): Result<EmploymentContract> {
	const id = parseHumanResourcesEmploymentContractId(row.id);
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!id.ok) {
		return id;
	}
	if (!employmentId.ok) {
		return employmentId;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	let supersedesContractId = null as EmploymentContract["supersedesContractId"];
	if (row.supersedesContractId !== null) {
		const parsed = parseHumanResourcesEmploymentContractId(
			row.supersedesContractId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesContractId = parsed.data;
	}
	let supersededByContractId =
		null as EmploymentContract["supersededByContractId"];
	if (row.supersededByContractId !== null) {
		const parsed = parseHumanResourcesEmploymentContractId(
			row.supersededByContractId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		supersededByContractId = parsed.data;
	}
	const lineageStatus =
		row.lineageStatus === "superseded" ? "superseded" : "active";
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		referenceCode: row.referenceCode,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		lineageStatus,
		supersedesContractId,
		supersededByContractId,
		reasonCode: row.reasonCode,
		sourceReference: row.sourceReference,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

interface EmploymentContractSqlRow {
	created_at: Date | string;
	created_by: string;
	employee_id: string;
	employment_id: string;
	ends_on: string | null;
	id: string;
	lineage_status: string;
	organization_id: string;
	reason_code: string;
	reference_code: string;
	source_reference: string | null;
	starts_on: string;
	superseded_by_contract_id: string | null;
	supersedes_contract_id: string | null;
	updated_at: Date | string;
	updated_by: string;
	version: number;
}

function mapEmploymentContractSqlRow(
	row: EmploymentContractSqlRow,
): Result<EmploymentContract> {
	return mapEmploymentContract({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		referenceCode: row.reference_code,
		startsOn: row.starts_on,
		endsOn: row.ends_on,
		lineageStatus: row.lineage_status,
		supersedesContractId: row.supersedes_contract_id,
		supersededByContractId: row.superseded_by_contract_id,
		reasonCode: row.reason_code,
		sourceReference: row.source_reference,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt:
			row.created_at instanceof Date
				? row.created_at
				: new Date(row.created_at),
		updatedAt:
			row.updated_at instanceof Date
				? row.updated_at
				: new Date(row.updated_at),
	});
}

function mapAssignment(
	row: typeof hrWorkAssignment.$inferSelect,
): Result<WorkAssignment> {
	const id = parseHumanResourcesAssignmentId(row.id);
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	const positionId = parseHumanResourcesPositionId(row.positionId);
	if (!id.ok) {
		return id;
	}
	if (!employmentId.ok) {
		return employmentId;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	if (!positionId.ok) {
		return positionId;
	}
	const lineage = mapAssignmentLineageFields(row);
	if (!lineage.ok) {
		return lineage;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		positionId: positionId.data,
		organizationDimensions:
			row.legalEntityDimensionId !== null &&
			row.legalEntityKeySnapshot !== null &&
			row.legalEntityNameSnapshot !== null &&
			row.businessUnitDimensionId !== null &&
			row.businessUnitKeySnapshot !== null &&
			row.businessUnitNameSnapshot !== null &&
			row.locationDimensionId !== null &&
			row.locationKeySnapshot !== null &&
			row.locationNameSnapshot !== null &&
			row.costCentreDimensionId !== null &&
			row.costCentreKeySnapshot !== null &&
			row.costCentreNameSnapshot !== null &&
			row.projectDimensionId !== null &&
			row.projectKeySnapshot !== null &&
			row.projectNameSnapshot !== null
				? {
						legal_entity: {
							id: row.legalEntityDimensionId,
							kind: "legal_entity",
							key: row.legalEntityKeySnapshot,
							name: row.legalEntityNameSnapshot,
						},
						business_unit: {
							id: row.businessUnitDimensionId,
							kind: "business_unit",
							key: row.businessUnitKeySnapshot,
							name: row.businessUnitNameSnapshot,
						},
						location: {
							id: row.locationDimensionId,
							kind: "location",
							key: row.locationKeySnapshot,
							name: row.locationNameSnapshot,
						},
						cost_centre: {
							id: row.costCentreDimensionId,
							kind: "cost_centre",
							key: row.costCentreKeySnapshot,
							name: row.costCentreNameSnapshot,
						},
						project: {
							id: row.projectDimensionId,
							kind: "project",
							key: row.projectKeySnapshot,
							name: row.projectNameSnapshot,
						},
					}
				: null,
		...lineage.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

interface AssignmentSqlRow {
	business_unit_dimension_id: string | null;
	business_unit_key_snapshot: string | null;
	business_unit_name_snapshot: string | null;
	cost_centre_dimension_id: string | null;
	cost_centre_key_snapshot: string | null;
	cost_centre_name_snapshot: string | null;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	ends_on: string | null;
	id: string;
	legal_entity_dimension_id: string | null;
	legal_entity_key_snapshot: string | null;
	legal_entity_name_snapshot: string | null;
	location_dimension_id: string | null;
	location_key_snapshot: string | null;
	location_name_snapshot: string | null;
	manager_employee_id_snapshot: string | null;
	organization_id: string;
	position_id: string;
	predecessor_assignment_id: string | null;
	project_dimension_id: string | null;
	project_key_snapshot: string | null;
	project_name_snapshot: string | null;
	starts_on: string;
	successor_assignment_id: string | null;
	transfer_movement_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
	work_calendar_id_snapshot: string | null;
}

function mapAssignmentSqlRow(
	row: AssignmentSqlRow,
	id: HumanResourcesAssignmentId,
): Result<WorkAssignment> {
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	const positionId = parseHumanResourcesPositionId(row.position_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	if (!employeeId.ok) {
		return employeeId;
	}
	if (!positionId.ok) {
		return positionId;
	}
	const lineage = mapAssignmentLineageFields(row);
	if (!lineage.ok) {
		return lineage;
	}
	return ok({
		id,
		organizationId: row.organization_id,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		positionId: positionId.data,
		organizationDimensions:
			row.legal_entity_dimension_id !== null &&
			row.legal_entity_key_snapshot !== null &&
			row.legal_entity_name_snapshot !== null &&
			row.business_unit_dimension_id !== null &&
			row.business_unit_key_snapshot !== null &&
			row.business_unit_name_snapshot !== null &&
			row.location_dimension_id !== null &&
			row.location_key_snapshot !== null &&
			row.location_name_snapshot !== null &&
			row.cost_centre_dimension_id !== null &&
			row.cost_centre_key_snapshot !== null &&
			row.cost_centre_name_snapshot !== null &&
			row.project_dimension_id !== null &&
			row.project_key_snapshot !== null &&
			row.project_name_snapshot !== null
				? {
						legal_entity: {
							id: row.legal_entity_dimension_id,
							kind: "legal_entity",
							key: row.legal_entity_key_snapshot,
							name: row.legal_entity_name_snapshot,
						},
						business_unit: {
							id: row.business_unit_dimension_id,
							kind: "business_unit",
							key: row.business_unit_key_snapshot,
							name: row.business_unit_name_snapshot,
						},
						location: {
							id: row.location_dimension_id,
							kind: "location",
							key: row.location_key_snapshot,
							name: row.location_name_snapshot,
						},
						cost_centre: {
							id: row.cost_centre_dimension_id,
							kind: "cost_centre",
							key: row.cost_centre_key_snapshot,
							name: row.cost_centre_name_snapshot,
						},
						project: {
							id: row.project_dimension_id,
							kind: "project",
							key: row.project_key_snapshot,
							name: row.project_name_snapshot,
						},
					}
				: null,
		...lineage.data,
		startsOn: row.starts_on,
		endsOn: row.ends_on,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type DrizzleCoreHost = Pick<
	HumanResourcesStore,
	"getPositionById" | "findPositionAsOf"
>;

export type DrizzleCoreMethods = Pick<
	HumanResourcesStore,
	| "getEmployeeById"
	| "findEmployeeByIdempotencyKey"
	| "createEmployee"
	| "updateEmployee"
	| "listEmployees"
	| "getEmploymentById"
	| "findOpenEmploymentByEmployee"
	| "findEmploymentByEmployeeAsOf"
	| "listEmploymentsByEmployee"
	| "listEmploymentStatusHistory"
	| "appendEmploymentStatusHistory"
	| "createEmployment"
	| "amendEmployment"
	| "correctEmployment"
	| "getEmploymentContractById"
	| "findContractByEmploymentAndCode"
	| "listActiveContractsByEmployment"
	| "listEmploymentContractsByEmployment"
	| "findEmploymentContractByEmploymentAsOf"
	| "createEmploymentContract"
	| "correctEmploymentContract"
	| "supersedeEmploymentContract"
	| "countOpenAssignmentsForPosition"
	| "resolvePositionOccupancyAsOf"
	| "getAssignmentById"
	| "findOpenAssignmentByEmployment"
	| "findAssignmentByEmploymentAsOf"
	| "listAssignmentsByEmployment"
	| "listWorkforcePlanActualAssignments"
	| "createAssignment"
	| "endAssignment"
>;

export const drizzleCoreMethods: DrizzleCoreMethods &
	ThisType<DrizzleCoreHost & DrizzleCoreMethods> = {
	async getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployee)
				.where(
					and(
						eq(hrEmployee.organizationId, input.organizationId),
						eq(hrEmployee.id, input.employeeId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return ok(null);
			}
			return mapEmployee(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employee");
		}
	},

	async findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployee)
				.where(
					and(
						eq(hrEmployee.organizationId, input.organizationId),
						eq(hrEmployee.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapEmployee(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				employee: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee idempotency record",
			);
		}
	},

	async createEmployee(
		record: EmployeeCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Employee>> {
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmployeeId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson(
			"employeeNumber",
			null,
			record.employeeNumber,
		);
		const newValueJson = valueSnapshotJson({
			employeeNumber: record.employeeNumber,
			legalName: record.legalName,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[EmployeeSqlRow[]]>(
				(sqlValue10) => [
					sqlValue10`
						WITH mutated AS (
							INSERT INTO hr_employee (
								id, organization_id, employee_number, normalized_employee_number,
								legal_name, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.employeeNumber},
								${record.normalizedEmployeeNumber}, ${record.legalName},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, new_value
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const [row] = rows;
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Employee create returned no row");
			}
			return mapEmployeeRow(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findEmployeeByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return ok(existing.data.employee);
				}
			}
			if (isEmployeeNumberUniqueViolation(error)) {
				return mapEmployeeNumberDuplicate();
			}
			return mapPersistenceFailure(error, "Failed to create employee");
		}
	},

	async updateEmployee(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Employee>> {
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[EmployeeSqlRow[]]>(
				(sqlValue9) => [
					sqlValue9`
						WITH mutated AS (
							UPDATE hr_employee
							SET legal_name = ${input.legalName},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.employeeId}
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
								'human-resources', 'hr_employee', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const [row] = rows;
			if (row === undefined) {
				const existing = await this.getEmployeeById({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
				});
				if (!existing.ok) {
					return existing;
				}
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Employee",
				});
			}
			return mapEmployeeRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update employee");
		}
	},

	async listEmployees(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string | undefined;
		legalNamePrefix?: string | undefined;
		employmentStatus?: string | undefined;
	}): Promise<Result<EmployeeListPage>> {
		try {
			const conditions = [eq(hrEmployee.organizationId, input.organizationId)];

			if (input.employeeNumberPrefix) {
				conditions.push(
					sql`${hrEmployee.normalizedEmployeeNumber} ILIKE ${input.employeeNumberPrefix.toUpperCase()}||'%'`,
				);
			}

			if (input.legalNamePrefix) {
				conditions.push(
					sql`${hrEmployee.legalName} ILIKE ${input.legalNamePrefix}||'%'`,
				);
			}

			let employeeIds: HumanResourcesEmployeeId[] | undefined;
			if (input.employmentStatus) {
				const employments = await db
					.select({ employeeId: hrEmployment.employeeId })
					.from(hrEmployment)
					.where(
						and(
							eq(hrEmployment.organizationId, input.organizationId),
							eq(hrEmployment.status, input.employmentStatus),
						),
					);
				employeeIds = [];
				for (const employment of employments) {
					const parsed = parseHumanResourcesEmployeeId(employment.employeeId);
					if (parsed.ok) {
						employeeIds.push(parsed.data);
					}
				}
				if (employeeIds.length === 0) {
					return ok({
						employees: [],
						totalCount: 0,
						page: input.page,
						pageSize: input.pageSize,
					});
				}
			}

			if (employeeIds) {
				conditions.push(sql`${hrEmployee.id} = ANY(${employeeIds})`);
			}

			const offset = (input.page - 1) * input.pageSize;

			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrEmployee)
					.where(and(...conditions))
					.orderBy(desc(hrEmployee.updatedAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrEmployee)
					.where(and(...conditions)),
			]);

			const employees: Employee[] = [];
			for (const row of rows) {
				const mapped = mapEmployee(row);
				if (mapped.ok) {
					employees.push(mapped.data);
				}
			}

			return ok({
				employees,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list employees");
		}
	},

	async getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<Employment | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.id, input.employmentId),
					),
				)
				.limit(1);
			if (result.length === 0) {
				return ok(null);
			}
			const [record] = result;
			if (!record) {
				return ok(null);
			}
			return mapEmployment(record);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employment");
		}
	},

	async findOpenEmploymentByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employment | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, input.employeeId),
						isNull(hrEmployment.endsOn),
					),
				)
				.limit(1);
			if (result.length === 0) {
				return ok(null);
			}
			const [record] = result;
			if (!record) {
				return ok(null);
			}
			return mapEmployment(record);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find open employment");
		}
	},

	async findEmploymentByEmployeeAsOf(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<Employment | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrEmployment.startsOn));
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: result,
				asOf: input.asOf,
				getId: (employment) => employment.id,
				getEffectiveFrom: (employment) => employment.startsOn,
				getEffectiveTo: (employment) => employment.endsOn,
			});
			if (!resolution.ok) {
				return fail(
					"CONFLICT",
					"Multiple employments are effective for the Time work date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return resolution.record === null
				? ok(null)
				: mapEmployment(resolution.record);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employment for Time work date",
			);
		}
	},

	async listEmploymentsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) {
		try {
			const rows = await db
				.select({
					id: hrEmployment.id,
					startsOn: hrEmployment.startsOn,
					endsOn: hrEmployment.endsOn,
				})
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, input.employeeId),
					),
				);
			const employments: Array<{
				id: HumanResourcesEmploymentId;
				startsOn: string;
				endsOn: string | null;
			}> = [];
			for (const row of rows) {
				const id = parseHumanResourcesEmploymentId(row.id);
				if (!id.ok) {
					return id;
				}
				employments.push({
					id: id.data,
					startsOn: row.startsOn,
					endsOn: row.endsOn,
				});
			}
			return ok(employments);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list employments");
		}
	},

	async listEmploymentStatusHistory(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<EmploymentStatusHistory[]>> {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentStatusHistory)
				.where(
					and(
						eq(hrEmploymentStatusHistory.organizationId, input.organizationId),
						eq(hrEmploymentStatusHistory.employmentId, input.employmentId),
					),
				)
				.orderBy(
					hrEmploymentStatusHistory.effectiveOn,
					hrEmploymentStatusHistory.createdAt,
				);
			const history: EmploymentStatusHistory[] = [];
			for (const row of rows) {
				const mapped = mapEmploymentStatusHistory(row);
				if (!mapped.ok) {
					return mapped;
				}
				history.push(mapped.data);
			}
			return ok(history);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employment status history",
			);
		}
	},

	async appendEmploymentStatusHistory(
		record: EmploymentStatusHistoryAppendRecord,
	): Promise<Result<EmploymentStatusHistory>> {
		try {
			const [row] = await db
				.insert(hrEmploymentStatusHistory)
				.values({
					organizationId: record.organizationId,
					employmentId: record.employmentId,
					employeeId: record.employeeId,
					fromStatus: record.fromStatus,
					toStatus: record.toStatus,
					startsOnSnapshot: record.startsOnSnapshot,
					endsOnSnapshot: record.endsOnSnapshot,
					effectiveOn: record.effectiveOn,
					changeKind: record.changeKind,
					reason: record.reason,
					evidenceReference: record.evidenceReference,
					correlationId: record.correlationId,
					actorUserId: record.actorUserId,
				})
				.returning();
			if (!row) {
				return fail(
					"INTERNAL_ERROR",
					"Failed to append employment status history",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return mapEmploymentStatusHistory(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to append employment status history",
			);
		}
	},

	async createEmployment(
		record: EmploymentCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Employment>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmploymentId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const historyId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			effectiveOn: record.startsOn,
		});
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employee_id: string;
						status: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sqlValue8) => [
				sqlValue8`
						WITH parent AS (
							SELECT id, organization_id
							FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_employment (
								id, organization_id, employee_id, status, starts_on, ends_on,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, parent.organization_id, parent.id, 'active',
								${record.startsOn}, ${record.endsOn}::date, 1, ${record.createdBy}, ${record.createdBy}
							FROM parent
							WHERE NOT EXISTS (
								SELECT 1
								FROM hr_employment open_employment
								WHERE open_employment.organization_id = parent.organization_id
									AND open_employment.employee_id = parent.id
									AND open_employment.ends_on IS NULL
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
								'human-resources', 'hr_employment', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						history_inserted AS (
							INSERT INTO hr_employment_status_history (
								id, organization_id, employment_id, employee_id, from_status, to_status,
								starts_on_snapshot, ends_on_snapshot, effective_on, change_kind,
								reason, evidence_reference, correlation_id, actor_user_id
							)
							SELECT
								${historyId}, organization_id, id, employee_id, NULL, status,
								starts_on, ends_on, starts_on, 'create',
								NULL, NULL, ${meta.correlationId}, created_by
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, mutated.organization_id,
								CASE
									WHEN EXISTS (
										SELECT 1
										FROM hr_employment prior_employment
										WHERE prior_employment.organization_id = mutated.organization_id
											AND prior_employment.employee_id = mutated.employee_id
											AND prior_employment.ends_on IS NOT NULL
											AND prior_employment.id <> mutated.id
									) THEN ${HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT}
									ELSE ${HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT}
								END,
								'human-resources',
								${meta.correlationId}, mutated.created_by,
								${payloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, history_inserted, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				const employee = await this.getEmployeeById({
					organizationId: record.organizationId,
					employeeId: record.employeeId,
				});
				if (!employee.ok) {
					return employee;
				}
				if (employee.data === null) {
					return fail(
						"NOT_FOUND",
						"Employee not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				return rehireRequiresEndedEmployment();
			}
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employeeId.ok) {
				return employeeId;
			}
			const status = employmentStatusSchema.safeParse(row.status);
			if (!status.success) {
				return fail(
					"INTERNAL_ERROR",
					"Invalid employment status in persistence",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return ok({
				id: brandedId.data,
				organizationId: row.organization_id,
				employeeId: employeeId.data,
				status: status.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create employment");
		}
	},

	async amendEmployment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: string | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			lifecycleEffectiveOn?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Employment>> {
		const existing = await this.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const terminatedEventId = randomUUID();
		const historyId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment",
			entityId: input.employmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const statusValue = input.status ?? null;
			const startsOnValue = input.startsOn ?? null;
			const endsOnProvidedFlag = input.endsOn === undefined ? 0 : 1;
			const endsOnValue = input.endsOn ?? null;
			const emitTerminatedFlag = input.status === "terminated" ? 1 : 0;
			const lifecycleEffectiveOn = input.lifecycleEffectiveOn ?? null;
			const fromStatus = existing.data.status;

			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employee_id: string;
						status: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sqlValue7) => [
				sqlValue7`
						WITH mutated AS (
							UPDATE hr_employment
							SET status = COALESCE(${statusValue}::text, status),
								starts_on = COALESCE(${startsOnValue}::date, starts_on),
								ends_on = CASE
									WHEN ${endsOnProvidedFlag}::int = 1 THEN ${endsOnValue}::date
									ELSE ends_on
								END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.employmentId}
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
								'human-resources', 'hr_employment', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						),
						history_inserted AS (
							INSERT INTO hr_employment_status_history (
								id, organization_id, employment_id, employee_id, from_status, to_status,
								starts_on_snapshot, ends_on_snapshot, effective_on, change_kind,
								reason, evidence_reference, correlation_id, actor_user_id
							)
							SELECT
								${historyId}, organization_id, id, employee_id, ${fromStatus}, status,
								starts_on, ends_on, ${lifecycleEffectiveOn}::date, 'lifecycle',
								NULL, NULL, ${meta.correlationId}, ${input.actorUserId}
							FROM mutated
							WHERE ${lifecycleEffectiveOn}::text IS NOT NULL
								AND status <> ${fromStatus}
							RETURNING id
						),
						outboxed_terminated AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${terminatedEventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'hr_employee',
									'entityId', employee_id::text,
									'actorId', ${input.actorUserId}::text,
									'correlationId', ${meta.correlationId}::text
								),
								'pending', 0
							FROM mutated
							WHERE ${emitTerminatedFlag}::int = 1
								AND status = 'terminated'
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				const existingValue2 = await this.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: input.employmentId,
				});
				if (!existingValue2.ok) {
					return existingValue2;
				}
				return missAfterOptimisticUpdate({
					found: existingValue2.data !== null,
					entityLabel: "Employment",
				});
			}
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employeeId.ok) {
				return employeeId;
			}
			const status = employmentStatusSchema.safeParse(row.status);
			if (!status.success) {
				return fail(
					"INTERNAL_ERROR",
					"Invalid employment status in persistence",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return ok({
				id: input.employmentId,
				organizationId: row.organization_id,
				employeeId: employeeId.data,
				status: status.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend employment");
		}
	},

	async correctEmployment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: EmploymentStatus | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			reason: string;
			evidenceReference: string | null;
			effectiveOn?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Employment>> {
		const existing = await this.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const historyId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment",
			entityId: input.employmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		const effectiveOn = input.effectiveOn ?? existing.data.startsOn;
		const fromStatus = existing.data.status;
		try {
			const statusValue = input.status ?? null;
			const startsOnValue = input.startsOn ?? null;
			const endsOnProvidedFlag = input.endsOn === undefined ? 0 : 1;
			const endsOnValue = input.endsOn ?? null;

			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employee_id: string;
						status: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sqlValue6) => [
				sqlValue6`
						WITH mutated AS (
							UPDATE hr_employment
							SET status = COALESCE(${statusValue}::text, status),
								starts_on = COALESCE(${startsOnValue}::date, starts_on),
								ends_on = CASE
									WHEN ${endsOnProvidedFlag}::int = 1 THEN ${endsOnValue}::date
									ELSE ends_on
								END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.employmentId}
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
								'human-resources', 'hr_employment', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						history_inserted AS (
							INSERT INTO hr_employment_status_history (
								id, organization_id, employment_id, employee_id, from_status, to_status,
								starts_on_snapshot, ends_on_snapshot, effective_on, change_kind,
								reason, evidence_reference, correlation_id, actor_user_id
							)
							SELECT
								${historyId}, organization_id, id, employee_id, ${fromStatus}, status,
								starts_on, ends_on, ${effectiveOn}::date, 'correction',
								${input.reason}, ${input.evidenceReference}, ${meta.correlationId},
								${input.actorUserId}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, history_inserted, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employment",
				});
			}
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employeeId.ok) {
				return employeeId;
			}
			const status = employmentStatusSchema.safeParse(row.status);
			if (!status.success) {
				return fail(
					"INTERNAL_ERROR",
					"Invalid employment status in persistence",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return ok({
				id: input.employmentId,
				organizationId: row.organization_id,
				employeeId: employeeId.data,
				status: status.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to correct employment");
		}
	},

	async getEmploymentContractById(input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}): Promise<Result<EmploymentContract | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.id, input.employmentContractId),
					),
				)
				.limit(1);
			const [contract] = result;
			if (!contract) {
				return ok(null);
			}
			return mapEmploymentContract(contract);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employment contract");
		}
	},

	async findContractByEmploymentAndCode(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}): Promise<Result<EmploymentContract | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.employmentId, input.employmentId),
						eq(hrEmploymentContract.referenceCode, input.referenceCode),
						eq(hrEmploymentContract.lineageStatus, "active"),
					),
				)
				.limit(1);
			const [contract] = result;
			if (!contract) {
				return ok(null);
			}
			return mapEmploymentContract(contract);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find employment contract");
		}
	},

	async listActiveContractsByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) {
		try {
			const rows = await db
				.select({
					id: hrEmploymentContract.id,
					startsOn: hrEmploymentContract.startsOn,
					endsOn: hrEmploymentContract.endsOn,
				})
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.employmentId, input.employmentId),
						eq(hrEmploymentContract.lineageStatus, "active"),
					),
				);
			const mapped: Array<{
				id: HumanResourcesEmploymentContractId;
				startsOn: string;
				endsOn: string | null;
			}> = [];
			for (const row of rows) {
				const id = parseHumanResourcesEmploymentContractId(row.id);
				if (!id.ok) {
					return id;
				}
				mapped.push({
					id: id.data,
					startsOn: row.startsOn,
					endsOn: row.endsOn,
				});
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active employment contracts",
			);
		}
	},

	async listEmploymentContractsByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<EmploymentContract[]>> {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.employmentId, input.employmentId),
					),
				);
			const mapped: EmploymentContract[] = [];
			for (const row of rows) {
				const contract = mapEmploymentContract(row);
				if (!contract.ok) {
					return contract;
				}
				mapped.push(contract.data);
			}
			mapped.sort(compareEmploymentContractsByLineage);
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employment contracts",
			);
		}
	},

	async findEmploymentContractByEmploymentAsOf(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<EmploymentContract | null>> {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.employmentId, input.employmentId),
					),
				);
			const contracts: EmploymentContract[] = [];
			for (const row of rows) {
				const mapped = mapEmploymentContract(row);
				if (!mapped.ok) {
					return mapped;
				}
				contracts.push(mapped.data);
			}
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: contracts,
				asOf: input.asOf,
				getId: (contract) => contract.id,
				getEffectiveFrom: (contract) => contract.startsOn,
				getEffectiveTo: (contract) => contract.endsOn,
			});
			if (!resolution.ok) {
				return fail(
					"CONFLICT",
					"Multiple employment contracts are effective for the as-of date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return ok(resolution.record);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve employment contract as-of",
			);
		}
	},

	async createEmploymentContract(
		record: EmploymentContractCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentContract>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmploymentContractId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employment_contract",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employment_id: string;
						employee_id: string;
						reference_code: string;
						starts_on: string;
						ends_on: string | null;
						lineage_status: string;
						supersedes_contract_id: string | null;
						superseded_by_contract_id: string | null;
						reason_code: string;
						source_reference: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sqlValue5) => [
				sqlValue5`
						WITH parent AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
								AND employee_id = ${record.employeeId}
						),
						mutated AS (
							INSERT INTO hr_employment_contract (
								id, organization_id, employment_id, employee_id, reference_code,
								starts_on, ends_on, lineage_status, reason_code, source_reference,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, parent.organization_id, parent.id, parent.employee_id,
								${record.referenceCode}, ${record.startsOn}, ${record.endsOn}, 'active',
								${record.reasonCode}, ${record.sourceReference}, 1,
								${record.createdBy}, ${record.createdBy}
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
								'human-resources', 'hr_employment_contract', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			return mapEmploymentContract({
				id: row.id,
				organizationId: row.organization_id,
				employmentId: row.employment_id,
				employeeId: row.employee_id,
				referenceCode: row.reference_code,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				lineageStatus: row.lineage_status,
				supersedesContractId: row.supersedes_contract_id,
				supersededByContractId: row.superseded_by_contract_id,
				reasonCode: row.reason_code,
				sourceReference: row.source_reference,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create employment contract",
			);
		}
	},

	async correctEmploymentContract(
		input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
			referenceCode?: string | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			reasonCode: string;
			sourceReference: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentContract>> {
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment_contract",
			entityId: input.employmentContractId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[EmploymentContractSqlRow[]]>(
				(sqlValue4) => [
					sqlValue4`
					WITH updated AS (
						UPDATE hr_employment_contract
						SET
							reference_code = COALESCE(${input.referenceCode}, reference_code),
							starts_on = COALESCE(${input.startsOn}, starts_on),
							ends_on = CASE
								WHEN ${input.endsOn === undefined} THEN ends_on
								ELSE ${input.endsOn}
							END,
							reason_code = ${input.reasonCode},
							source_reference = ${input.sourceReference},
							version = version + 1,
							updated_by = ${input.actorUserId},
							updated_at = NOW()
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.employmentContractId}
							AND lineage_status = 'active'
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
							'human-resources', 'hr_employment_contract', id, 'UPDATE', '[]'::jsonb
						FROM updated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT}, 'human-resources',
							${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM updated
						RETURNING id
					)
					SELECT updated.* FROM updated, audited, outboxed
				`,
				],
			);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Employment contract",
				});
			}
			return mapEmploymentContractSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to correct employment contract",
			);
		}
	},

	async supersedeEmploymentContract(
		input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
			referenceCode: string;
			startsOn: string;
			endsOn: string | null;
			reasonCode: string;
			sourceReference: string;
			predecessorEffectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<
		Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
	> {
		const successorId = randomUUID();
		const brandedSuccessorId =
			parseHumanResourcesEmploymentContractId(successorId);
		if (!brandedSuccessorId.ok) {
			return brandedSuccessorId;
		}
		const predecessorAuditId = randomUUID();
		const successorAuditId = randomUUID();
		const supersededEventId = randomUUID();
		const createdEventId = randomUUID();
		const supersededPayloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment_contract",
			entityId: input.employmentContractId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		const createdPayloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment_contract",
			entityId: brandedSuccessorId.data,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						predecessor: EmploymentContractSqlRow;
						successor: EmploymentContractSqlRow;
					}[],
				]
			>((sqlValue3) => [
				sqlValue3`
					WITH predecessor AS (
						UPDATE hr_employment_contract
						SET
							lineage_status = 'superseded',
							ends_on = ${input.predecessorEffectiveTo},
							superseded_by_contract_id = ${brandedSuccessorId.data},
							version = version + 1,
							updated_by = ${input.actorUserId},
							updated_at = NOW()
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.employmentContractId}
							AND lineage_status = 'active'
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					successor AS (
						INSERT INTO hr_employment_contract (
							id, organization_id, employment_id, employee_id, reference_code,
							starts_on, ends_on, lineage_status, supersedes_contract_id,
							reason_code, source_reference, version, created_by, updated_by
						)
						SELECT
							${brandedSuccessorId.data}, organization_id, employment_id, employee_id,
							${input.referenceCode}, ${input.startsOn}, ${input.endsOn}, 'active',
							id, ${input.reasonCode}, ${input.sourceReference}, 1,
							${input.actorUserId}, ${input.actorUserId}
						FROM predecessor
						RETURNING *
					),
					predecessor_audit AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${predecessorAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employment_contract', id, 'UPDATE', '[]'::jsonb
						FROM predecessor
						RETURNING id
					),
					superseded_outbox AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${supersededEventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT}, 'human-resources',
							${meta.correlationId}, ${input.actorUserId}, ${supersededPayloadJson}::jsonb, 'pending', 0
						FROM predecessor
						RETURNING id
					),
					successor_audit AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${successorAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employment_contract', id, 'CREATE', '[]'::jsonb
						FROM successor
						RETURNING id
					),
					created_outbox AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${createdEventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT}, 'human-resources',
							${meta.correlationId}, ${input.actorUserId}, ${createdPayloadJson}::jsonb, 'pending', 0
						FROM successor
						RETURNING id
					)
					SELECT
						(SELECT row_to_json(predecessor) FROM predecessor) AS predecessor,
						(SELECT row_to_json(successor) FROM successor) AS successor
					FROM predecessor, successor, predecessor_audit, superseded_outbox, successor_audit, created_outbox
				`,
			]);
			const [row] = rows;
			if (!(row?.predecessor && row?.successor)) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Employment contract",
				});
			}
			const superseded = mapEmploymentContractSqlRow(row.predecessor);
			if (!superseded.ok) {
				return superseded;
			}
			const successor = mapEmploymentContractSqlRow(row.successor);
			if (!successor.ok) {
				return successor;
			}
			return ok({
				superseded: superseded.data,
				successor: successor.data,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to supersede employment contract",
			);
		}
	},

	async countOpenAssignmentsForPosition(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.positionId, input.positionId),
						isNull(hrWorkAssignment.endsOn),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count open assignments for position",
			);
		}
	},

	async resolvePositionOccupancyAsOf(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
		asOf: string;
	}): Promise<Result<PositionOccupancyAsOf | null>> {
		const current = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return ok(null);
		}

		const asOfDefinition = await this.findPositionAsOf({
			organizationId: input.organizationId,
			positionId: input.positionId,
			asOf: input.asOf,
		});
		if (!asOfDefinition.ok) {
			return asOfDefinition;
		}
		if (asOfDefinition.data === null) {
			return ok(null);
		}

		const position: Position = {
			...current.data,
			title: asOfDefinition.data.title,
			departmentId: asOfDefinition.data.departmentId,
			jobId: asOfDefinition.data.jobId,
		};

		try {
			const rows = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.positionId, input.positionId),
						lte(hrWorkAssignment.startsOn, input.asOf),
						or(
							isNull(hrWorkAssignment.endsOn),
							gte(hrWorkAssignment.endsOn, input.asOf),
						),
					),
				)
				.limit(2);
			if (rows.length > 1) {
				return fail(
					"CONFLICT",
					"Multiple assignments occupy the position on the requested date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const [row] = rows;
			if (!row) {
				return ok({
					position,
					asOf: input.asOf,
					assignment: null,
					state: "vacant",
				});
			}
			const assignment = mapAssignment(row);
			if (!assignment.ok) {
				return assignment;
			}
			return ok({
				position,
				asOf: input.asOf,
				assignment: assignment.data,
				state: "occupied",
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve position occupancy on date",
			);
		}
	},

	async getAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}): Promise<Result<WorkAssignment | null>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			const [assignment] = result;
			if (!assignment) {
				return ok(null);
			}
			return mapAssignment(assignment);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load assignment");
		}
	},

	async findOpenAssignmentByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment | null>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.employmentId, input.employmentId),
						isNull(hrWorkAssignment.endsOn),
					),
				)
				.limit(1);
			const [assignment] = result;
			if (!assignment) {
				return ok(null);
			}
			return mapAssignment(assignment);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find open assignment");
		}
	},

	async findAssignmentByEmploymentAsOf(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<WorkAssignment | null>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.employmentId, input.employmentId),
					),
				);
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: result,
				asOf: input.asOf,
				getId: (assignment) => assignment.id,
				getEffectiveFrom: (assignment) => assignment.startsOn,
				getEffectiveTo: (assignment) => assignment.endsOn,
			});
			if (!resolution.ok) {
				return multiplePrimaryAssignmentsAtAsOf();
			}
			return resolution.record === null
				? ok(null)
				: mapAssignment(resolution.record);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find assignment effective on date",
			);
		}
	},

	async listAssignmentsByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment[]>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.employmentId, input.employmentId),
					),
				);
			const mapped: WorkAssignment[] = [];
			for (const row of result) {
				const assignment = mapAssignment(row);
				if (!assignment.ok) {
					return assignment;
				}
				mapped.push(assignment.data);
			}
			return ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list assignments for employment",
			);
		}
	},

	async listWorkforcePlanActualAssignments(input: {
		organizationId: string;
		asOf: string;
	}): Promise<Result<WorkforcePlanActualAssignment[]>> {
		try {
			const [assignmentRows, employmentRows, positionRows] = await Promise.all([
				db
					.select()
					.from(hrWorkAssignment)
					.where(
						and(
							eq(hrWorkAssignment.organizationId, input.organizationId),
							lte(hrWorkAssignment.startsOn, input.asOf),
							or(
								isNull(hrWorkAssignment.endsOn),
								gte(hrWorkAssignment.endsOn, input.asOf),
							),
						),
					),
				db
					.select()
					.from(hrEmployment)
					.where(
						and(
							eq(hrEmployment.organizationId, input.organizationId),
							eq(hrEmployment.status, "active"),
							lte(hrEmployment.startsOn, input.asOf),
							or(
								isNull(hrEmployment.endsOn),
								gte(hrEmployment.endsOn, input.asOf),
							),
						),
					),
				db
					.select()
					.from(hrPosition)
					.where(eq(hrPosition.organizationId, input.organizationId)),
			]);

			const employmentsById = new Map(
				employmentRows.map((employment) => [employment.id, employment]),
			);
			const positionsById = new Map(
				positionRows.map((position) => [position.id, position]),
			);
			const actuals: WorkforcePlanActualAssignment[] = [];

			for (const row of assignmentRows) {
				const employment = employmentsById.get(row.employmentId);
				const position = positionsById.get(row.positionId);
				if (employment === undefined || position === undefined) {
					continue;
				}

				const assignment = mapAssignment(row);
				if (!assignment.ok) {
					return assignment;
				}
				const parsedEmploymentStatus = employmentStatusSchema.safeParse(
					employment.status,
				);
				if (!parsedEmploymentStatus.success) {
					return fail("INTERNAL_ERROR", "Invalid employment status");
				}
				const employmentId = parseHumanResourcesEmploymentId(employment.id);
				if (!employmentId.ok) {
					return employmentId;
				}
				const employeeId = parseHumanResourcesEmployeeId(employment.employeeId);
				if (!employeeId.ok) {
					return employeeId;
				}
				const positionId = parseHumanResourcesPositionId(row.positionId);
				if (!positionId.ok) {
					return positionId;
				}
				const departmentId =
					position.departmentId === null
						? null
						: parseHumanResourcesDepartmentId(position.departmentId);
				if (departmentId !== null && !departmentId.ok) {
					return departmentId;
				}
				const jobId =
					position.jobId === null
						? null
						: parseHumanResourcesJobId(position.jobId);
				if (jobId !== null && !jobId.ok) {
					return jobId;
				}

				actuals.push({
					employmentId: employmentId.data,
					employeeId: employeeId.data,
					positionId: positionId.data,
					departmentId: departmentId?.data ?? null,
					jobId: jobId?.data ?? null,
					locationCode:
						assignment.data.organizationDimensions?.location.key ?? null,
					employmentStatus: parsedEmploymentStatus.data,
					employmentStartsOn: employment.startsOn,
					employmentEndsOn: employment.endsOn,
					assignmentStartsOn: row.startsOn,
					assignmentEndsOn: row.endsOn,
				});
			}

			actuals.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
			return ok(actuals);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list workforce plan actual assignments",
			);
		}
	},

	async createAssignment(
		record: AssignmentCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<WorkAssignment>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		const withinEmployment = assertAssignmentWithinEmployment({
			assignmentStartsOn: record.startsOn,
			assignmentEndsOn: record.endsOn,
			employmentStartsOn: employment.data.startsOn,
			employmentEndsOn: employment.data.endsOn,
		});
		if (!withinEmployment.ok) {
			return withinEmployment;
		}

		const siblings = await this.listAssignmentsByEmployment({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!siblings.ok) {
			return siblings;
		}

		const overlap = assertNoAssignmentOverlap({
			candidateStartsOn: record.startsOn,
			candidateEndsOn: record.endsOn,
			existing: siblings.data,
		});
		if (!overlap.ok) {
			return overlap;
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesAssignmentId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_work_assignment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[AssignmentSqlRow[]]>(
				(sqlValue2) => [
					sqlValue2`
						WITH employment AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
								AND employee_id = ${record.employeeId}
						),
						position AS (
							SELECT id
							FROM hr_position
							WHERE id = ${record.positionId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						legal_entity AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${record.organizationDimensions.legal_entity.id}
								AND organization_id = ${record.organizationId}
								AND kind = 'legal_entity'
								AND effective_from <= ${record.startsOn}
								AND (effective_to IS NULL OR effective_to >= ${record.startsOn})
						),
						business_unit AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${record.organizationDimensions.business_unit.id}
								AND organization_id = ${record.organizationId}
								AND kind = 'business_unit'
								AND effective_from <= ${record.startsOn}
								AND (effective_to IS NULL OR effective_to >= ${record.startsOn})
						),
						location AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${record.organizationDimensions.location.id}
								AND organization_id = ${record.organizationId}
								AND kind = 'location'
								AND effective_from <= ${record.startsOn}
								AND (effective_to IS NULL OR effective_to >= ${record.startsOn})
						),
						cost_centre AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${record.organizationDimensions.cost_centre.id}
								AND organization_id = ${record.organizationId}
								AND kind = 'cost_centre'
								AND effective_from <= ${record.startsOn}
								AND (effective_to IS NULL OR effective_to >= ${record.startsOn})
						),
						project AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${record.organizationDimensions.project.id}
								AND organization_id = ${record.organizationId}
								AND kind = 'project'
								AND effective_from <= ${record.startsOn}
								AND (effective_to IS NULL OR effective_to >= ${record.startsOn})
						),
						mutated AS (
							INSERT INTO hr_work_assignment (
								id, organization_id, employment_id, employee_id, position_id,
								legal_entity_dimension_id, legal_entity_key_snapshot,
								legal_entity_name_snapshot, business_unit_dimension_id,
								business_unit_key_snapshot, business_unit_name_snapshot,
								location_dimension_id, location_key_snapshot, location_name_snapshot,
								cost_centre_dimension_id, cost_centre_key_snapshot,
								cost_centre_name_snapshot, project_dimension_id,
								project_key_snapshot, project_name_snapshot,
								predecessor_assignment_id, successor_assignment_id,
								transfer_movement_id, manager_employee_id_snapshot,
								work_calendar_id_snapshot,
								starts_on, ends_on, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.id,
								employment.employee_id, position.id,
								legal_entity.id, legal_entity.key, legal_entity.name,
								business_unit.id, business_unit.key, business_unit.name,
								location.id, location.key, location.name,
								cost_centre.id, cost_centre.key, cost_centre.name,
								project.id, project.key, project.name,
								${record.predecessorAssignmentId ?? null},
								${record.successorAssignmentId ?? null},
								${record.transferMovementId ?? null},
								${record.managerEmployeeIdSnapshot},
								${record.workCalendarIdSnapshot},
								${record.startsOn},
								${record.endsOn}, 1, ${record.createdBy}, ${record.createdBy}
							FROM employment, position, legal_entity, business_unit, location,
								cost_centre, project
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_work_assignment', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const [row] = rows;
			if (!row) {
				const employmentValue = await this.getEmploymentById({
					organizationId: record.organizationId,
					employmentId: record.employmentId,
				});
				if (!employmentValue.ok) {
					return employmentValue;
				}
				if (employmentValue.data === null) {
					return fail(
						"NOT_FOUND",
						"Employment not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const position = await this.getPositionById({
					organizationId: record.organizationId,
					positionId: record.positionId,
				});
				if (!position.ok) {
					return position;
				}
				if (position.data === null) {
					return fail(
						"NOT_FOUND",
						"Position not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				if (position.data.status !== "active") {
					return fail(
						"BAD_REQUEST",
						"Position is not active",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
						),
					);
				}
				return fail(
					"CONFLICT",
					"Assignment could not be created for this employment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return mapAssignmentSqlRow(row, brandedId.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create assignment");
		}
	},

	async endAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<WorkAssignment>> {
		const existing = await this.getAssignmentById({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return missAfterOptimisticUpdate({
				found: false,
				entityLabel: "Assignment",
			});
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
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_work_assignment",
			entityId: input.assignmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[AssignmentSqlRow[]]>(
				(sqlValue) => [
					sqlValue`
						WITH mutated AS (
							UPDATE hr_work_assignment
							SET ends_on = ${input.endsOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.assignmentId}
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
								'human-resources', 'hr_work_assignment', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const [row] = rows;
			if (!row) {
				const existingValue = await this.getAssignmentById({
					organizationId: input.organizationId,
					assignmentId: input.assignmentId,
				});
				if (!existingValue.ok) {
					return existingValue;
				}
				return missAfterOptimisticUpdate({
					found: existingValue.data !== null,
					entityLabel: "Assignment",
				});
			}
			return mapAssignmentSqlRow(row, input.assignmentId);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to end assignment");
		}
	},
};

export function attachDrizzleCore(target: DrizzleCoreHost): void {
	Object.assign(target, drizzleCoreMethods);
}
