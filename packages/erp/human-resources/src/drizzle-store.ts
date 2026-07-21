import { randomUUID } from "node:crypto";

import { and, db, eq, hrEmployee, runNeonHttpTransaction } from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import { HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT } from "@afenda/events/schemas";

import type { HumanResourcesEmployeeId } from "./brands";
import {
	HUMAN_RESOURCES_ERROR_EMPLOYEE_DUPLICATE,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import type {
	EmployeeCreateRecord,
	HumanResourcesStore,
	IdempotentEmployeeRecord,
} from "./store";
import type { Employee } from "./types";

type EmployeeSqlRow = {
	id: string;
	organization_id: string;
	employee_number: string;
	legal_name: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapEmployeeRow(row: EmployeeSqlRow): Employee {
	return {
		id: row.id as HumanResourcesEmployeeId,
		organizationId: row.organization_id,
		employeeNumber: row.employee_number,
		legalName: row.legal_name,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapEmployee(row: typeof hrEmployee.$inferSelect): Employee {
	return {
		id: row.id as HumanResourcesEmployeeId,
		organizationId: row.organizationId,
		employeeNumber: row.employeeNumber,
		legalName: row.legalName,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: string }).code === "23505"
	);
}

function isCreateIdempotencyConflict(error: unknown): boolean {
	if (!isUniqueViolation(error)) {
		return false;
	}
	const message =
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
			? (error as { message: string }).message
			: "";
	return /hr_employee_org_create_idempotency_uidx|create_idempotency_key/i.test(
		message,
	);
}

function isEmployeeNumberConflict(error: unknown): boolean {
	if (!isUniqueViolation(error)) {
		return false;
	}
	const message =
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
			? (error as { message: string }).message
			: "";
	return /hr_employee_org_normalized_number_uidx|normalized_employee_number/i.test(
		message,
	);
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

export class DrizzleHumanResourcesStore implements HumanResourcesStore {
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
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return ok(mapEmployee(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load employee");
		}
	}

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
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapEmployee(row);
			return ok({
				employee: mapped,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load employee idempotency record",
			);
		}
	}

	async createEmployee(
		record: EmployeeCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const entityId = randomUUID();
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
			entityId,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[EmployeeSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO hr_employee (
							id, organization_id, employee_number, normalized_employee_number,
							legal_name, create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.employeeNumber},
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
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Employee create returned no row");
			}
			return ok(mapEmployeeRow(row));
		} catch (error) {
			if (isCreateIdempotencyConflict(error)) {
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
			if (isEmployeeNumberConflict(error)) {
				return fail(
					"CONFLICT",
					"Employee number already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_EMPLOYEE_DUPLICATE),
				);
			}
			return failFromUnknown(error, "Failed to create employee");
		}
	}
}

export function createDrizzleHumanResourcesStore(): DrizzleHumanResourcesStore {
	return new DrizzleHumanResourcesStore();
}
