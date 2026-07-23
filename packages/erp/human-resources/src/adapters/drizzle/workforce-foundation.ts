import { randomUUID } from "node:crypto";
import {
	and,
	db,
	eq,
	hrEmployee,
	hrPerson,
	hrWorker,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_PERSON_CREATED_EVENT,
	HUMAN_RESOURCES_WORKER_CREATED_EVENT,
} from "@afenda/events/schemas";
import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesPersonId,
	parseHumanResourcesWorkerId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import {
	eventPayloadJson,
	fieldChangeJson,
	valueSnapshotJson,
} from "../../shared/audit-facts";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
} from "../../store/workforce-foundation";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	Worker,
} from "../../workforce-foundation/types";

type PersonSqlRow = {
	id: string;
	organization_id: string;
	legal_name: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type WorkerSqlRow = {
	id: string;
	organization_id: string;
	person_id: string;
	worker_type: string;
	employee_id: string | null;
	status: string;
	effective_from: string;
	effective_to: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapPersonRow(row: PersonSqlRow): Result<Person> {
	const id = parseHumanResourcesPersonId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		legalName: row.legal_name,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapWorkerRow(row: WorkerSqlRow): Result<Worker> {
	const id = parseHumanResourcesWorkerId(row.id);
	const personId = parseHumanResourcesPersonId(row.person_id);
	if (!id.ok) {
		return id;
	}
	if (!personId.ok) {
		return personId;
	}

	const base = {
		id: id.data,
		organizationId: row.organization_id,
		personId: personId.data,
		status: row.status as Worker["status"],
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};

	if (row.worker_type === "employee") {
		const employeeId =
			row.employee_id === null
				? null
				: parseHumanResourcesEmployeeId(row.employee_id);
		if (employeeId !== null && !employeeId.ok) {
			return employeeId;
		}
		return ok({
			...base,
			workerType: "employee",
			employeeId: employeeId === null ? null : employeeId.data,
		} satisfies EmployeeWorker);
	}

	if (
		row.worker_type !== "contractor" &&
		row.worker_type !== "contingent_worker" &&
		row.worker_type !== "intern"
	) {
		return fail("INTERNAL_ERROR", "Invalid worker type in storage");
	}

	return ok({
		...base,
		workerType: row.worker_type,
		employeeId: null,
	} satisfies NonEmployeeWorker);
}

export const drizzleWorkforceFoundationMethods: HumanResourcesWorkforceFoundationStore =
	{
		async getPersonById(input): Promise<Result<Person | null>> {
			try {
				const rows = await db
					.select()
					.from(hrPerson)
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							eq(hrPerson.id, input.personId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				return mapPersonRow(row as unknown as PersonSqlRow);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findPersonByIdempotencyKey(
			input,
		): Promise<Result<IdempotentPersonRecord | null>> {
			try {
				const rows = await db
					.select()
					.from(hrPerson)
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							eq(hrPerson.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				const mapped = mapPersonRow(row as unknown as PersonSqlRow);
				if (!mapped.ok) {
					return mapped;
				}
				return ok({
					person: mapped.data,
					createRequestFingerprint: row.createRequestFingerprint,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async createPerson(record, _ports, meta): Promise<Result<Person>> {
			const entityId = randomUUID();
			const brandedId = parseHumanResourcesPersonId(entityId);
			if (!brandedId.ok) {
				return brandedId;
			}
			const auditId = randomUUID();
			const eventId = randomUUID();
			const changesJson = fieldChangeJson("legalName", null, record.legalName);
			const newValueJson = valueSnapshotJson({ legalName: record.legalName });
			const payloadJson = eventPayloadJson({
				organizationId: record.organizationId,
				entityType: "hr_person",
				entityId: brandedId.data,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});

			try {
				const [rows] = await runNeonHttpTransaction<[PersonSqlRow[]]>((sql) => [
					sql`
						WITH mutated AS (
							INSERT INTO hr_person (
								id, organization_id, legal_name, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.legalName},
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
								'human-resources', 'hr_person', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return fail("INTERNAL_ERROR", "Person create returned no row");
				}
				return mapPersonRow(row);
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const existing = await this.findPersonByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) {
						return existing;
					}
					if (existing.data !== null) {
						return ok(existing.data.person);
					}
				}
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async updatePersonName(input, _ports, _meta): Promise<Result<Person>> {
			try {
				const existing = await this.getPersonById({
					organizationId: input.organizationId,
					personId: input.personId,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data === null) {
					return fail(
						"NOT_FOUND",
						"Person not found",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
					);
				}
				const versionCheck = assertExpectedVersion(
					existing.data.version,
					input.expectedVersion,
				);
				if (!versionCheck.ok) {
					return versionCheck;
				}

				const rows = await db
					.update(hrPerson)
					.set({
						legalName: input.legalName,
						version: existing.data.version + 1,
						updatedBy: input.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							eq(hrPerson.id, input.personId),
							eq(hrPerson.version, input.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Person update conflict");
				}
				return mapPersonRow(row as unknown as PersonSqlRow);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async getWorkerById(input): Promise<Result<Worker | null>> {
			try {
				const rows = await db
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.id, input.workerId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				return mapWorkerRow(row as unknown as WorkerSqlRow);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findWorkerByPersonId(input): Promise<Result<Worker | null>> {
			try {
				const rows = await db
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.personId, input.personId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				return mapWorkerRow(row as unknown as WorkerSqlRow);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findWorkerByEmployeeId(
			input,
		): Promise<Result<EmployeeWorker | null>> {
			try {
				const rows = await db
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.workerType, "employee"),
							eq(hrWorker.employeeId, input.employeeId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				const mapped = mapWorkerRow(row as unknown as WorkerSqlRow);
				if (!mapped.ok) {
					return mapped;
				}
				if (mapped.data.workerType !== "employee") {
					return ok(null);
				}
				return ok(mapped.data);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findWorkerByIdempotencyKey(
			input,
		): Promise<Result<IdempotentWorkerRecord | null>> {
			try {
				const rows = await db
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				const mapped = mapWorkerRow(row as unknown as WorkerSqlRow);
				if (!mapped.ok) {
					return mapped;
				}
				return ok({
					worker: mapped.data,
					createRequestFingerprint: row.createRequestFingerprint,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async createWorker(record, _ports, meta): Promise<Result<Worker>> {
			const person = await this.getPersonById({
				organizationId: record.organizationId,
				personId: record.personId,
			});
			if (!person.ok) {
				return person;
			}
			if (person.data === null) {
				return fail(
					"NOT_FOUND",
					"Person not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			if (record.workerType === "employee" && record.employeeId !== null) {
				const employeeRows = await db
					.select({ id: hrEmployee.id })
					.from(hrEmployee)
					.where(
						and(
							eq(hrEmployee.organizationId, record.organizationId),
							eq(hrEmployee.id, record.employeeId),
						),
					)
					.limit(1);
				if (employeeRows.length === 0) {
					return fail(
						"NOT_FOUND",
						"Employee not found",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
					);
				}
			}

			const entityId = randomUUID();
			const brandedId = parseHumanResourcesWorkerId(entityId);
			if (!brandedId.ok) {
				return brandedId;
			}
			const auditId = randomUUID();
			const eventId = randomUUID();
			const payloadJson = eventPayloadJson({
				organizationId: record.organizationId,
				entityType: "hr_worker",
				entityId: brandedId.data,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});
			const employeeId =
				record.workerType === "employee" ? record.employeeId : null;

			try {
				const [rows] = await runNeonHttpTransaction<[WorkerSqlRow[]]>((sql) => [
					sql`
						WITH mutated AS (
							INSERT INTO hr_worker (
								id, organization_id, person_id, worker_type, employee_id, status,
								effective_from, effective_to, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.personId},
								${record.workerType}, ${employeeId}, ${record.status},
								${record.effectiveFrom}, ${record.effectiveTo}, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy}, ${record.createdBy}
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
								'human-resources', 'hr_worker', id, 'CREATE', '[]'::jsonb, '{}'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return fail("INTERNAL_ERROR", "Worker create returned no row");
				}
				return mapWorkerRow(row);
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const existing = await this.findWorkerByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) {
						return existing;
					}
					if (existing.data !== null) {
						return ok(existing.data.worker);
					}
				}
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async changeWorkerType(
			input,
			_ports,
			_meta,
		): Promise<Result<EmployeeWorker | NonEmployeeWorker>> {
			const existing = await this.getWorkerById({
				organizationId: input.organizationId,
				workerId: input.workerId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Worker not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const employeeId =
				input.workerType === "employee" ? input.employeeId : null;
			try {
				const rows = await db
					.update(hrWorker)
					.set({
						workerType: input.workerType,
						employeeId,
						effectiveFrom: input.effectiveOn,
						version: existing.data.version + 1,
						updatedBy: input.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.id, input.workerId),
							eq(hrWorker.version, input.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Worker type change conflict");
				}
				const mapped = mapWorkerRow(row as unknown as WorkerSqlRow);
				if (!mapped.ok) {
					return mapped;
				}
				return mapped.data.workerType === "employee"
					? ok(mapped.data as EmployeeWorker)
					: ok(mapped.data as NonEmployeeWorker);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async changeWorkerStatus(input, _ports, _meta): Promise<Result<Worker>> {
			const existing = await this.getWorkerById({
				organizationId: input.organizationId,
				workerId: input.workerId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Worker not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			const versionCheck = assertExpectedVersion(
				existing.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			try {
				const rows = await db
					.update(hrWorker)
					.set({
						status: input.status,
						effectiveFrom: input.effectiveOn,
						version: existing.data.version + 1,
						updatedBy: input.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.id, input.workerId),
							eq(hrWorker.version, input.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Worker status change conflict");
				}
				return mapWorkerRow(row as unknown as WorkerSqlRow);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},
	};
