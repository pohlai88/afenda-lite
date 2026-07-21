import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
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

function cloneEmployee(employee: Employee): Employee {
	return { ...employee };
}

function mapEmployee(
	id: string,
	record: EmployeeCreateRecord,
	now: Date,
): Employee {
	return {
		id: id as HumanResourcesEmployeeId,
		organizationId: record.organizationId,
		employeeNumber: record.employeeNumber,
		legalName: record.legalName,
		version: 1,
		createdBy: record.createdBy,
		updatedBy: record.createdBy,
		createdAt: now,
		updatedAt: now,
	};
}

/** In-memory Human Resources store for Vitest domain tests. */
export class MemoryHumanResourcesStore implements HumanResourcesStore {
	private readonly employees = new Map<string, Employee>();
	private readonly idempotencyByKey = new Map<
		string,
		IdempotentEmployeeRecord
	>();

	private idempotencyMapKey(organizationId: string, idempotencyKey: string) {
		return `${organizationId}:${idempotencyKey}`;
	}

	async getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>> {
		const employee = this.employees.get(input.employeeId);
		if (employee === undefined) {
			return ok(null);
		}
		if (employee.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneEmployee(employee));
	}

	async findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>> {
		const record = this.idempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			employee: cloneEmployee(record.employee),
			createRequestFingerprint: record.createRequestFingerprint,
		});
	}

	async createEmployee(
		record: EmployeeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const existingByKey = await this.findEmployeeByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			return ok(cloneEmployee(existingByKey.data.employee));
		}

		for (const employee of this.employees.values()) {
			if (
				employee.organizationId === record.organizationId &&
				employee.employeeNumber.toUpperCase() ===
					record.normalizedEmployeeNumber
			) {
				return fail(
					"CONFLICT",
					"Employee number already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_EMPLOYEE_DUPLICATE),
				);
			}
		}

		const now = new Date();
		const id = randomUUID();
		const employee = mapEmployee(id, record, now);
		this.employees.set(employee.id, employee);
		this.idempotencyByKey.set(
			this.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			),
			{
				employee: cloneEmployee(employee),
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await ports.audit.record({
			organizationId: employee.organizationId,
			actorUserId: employee.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee",
			entityId: employee.id,
			action: "CREATE",
			changes: [
				{
					field: "employeeNumber",
					oldValue: null,
					newValue: employee.employeeNumber,
				},
			],
			newValue: {
				employeeNumber: employee.employeeNumber,
				legalName: employee.legalName,
			},
		});
		if (!audit.ok) {
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: employee.organizationId,
			actorUserId: employee.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
			payload: {
				organizationId: employee.organizationId,
				entityType: "hr_employee",
				entityId: employee.id,
				actorId: employee.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return outbox;
		}

		return ok(cloneEmployee(employee));
	}
}

export function createMemoryHumanResourcesStore(): MemoryHumanResourcesStore {
	return new MemoryHumanResourcesStore();
}
