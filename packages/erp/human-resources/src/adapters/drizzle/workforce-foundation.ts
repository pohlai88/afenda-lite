import { randomUUID } from "node:crypto";
import {
	and,
	db,
	eq,
	hrEmployee,
	hrPerson,
	hrPersonIdentityVersion,
	hrWorker,
	hrWorkerClassificationVersion,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CREATED_EVENT,
	HUMAN_RESOURCES_WORKER_CHANGED_EVENT,
	HUMAN_RESOURCES_WORKER_CREATED_EVENT,
} from "@afenda/events/schemas";
import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesPersonId,
	parseHumanResourcesWorkerId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import {
	eventPayloadJson,
	fieldChangeJson,
	valueSnapshotJson,
} from "../../shared/audit-facts";
import { assertExpectedVersion } from "../../shared/concurrency";
import { previousIsoDate } from "../../shared/effective-dates";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
} from "../../store/workforce-foundation";
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../../workforce-foundation/lineage-segment";
import { resolvePersonIdentityAsOf } from "../../workforce-foundation/person-identity-lineage";
import { resolveWorkerClassificationAsOf } from "../../workforce-foundation/worker-classification-lineage";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	PersonIdentityAtAsOf,
	PersonIdentityVersion,
	Worker,
	WorkerClassificationAtAsOf,
	WorkerClassificationVersion,
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

type PersonIdentityVersionSqlRow = {
	id: string;
	organization_id: string;
	person_id: string;
	legal_name: string;
	effective_from: string;
	effective_to: string | null;
	supersedes_identity_version_id: string | null;
	lineage_status: string;
	reason_code: string;
	evidence_ref: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type WorkerClassificationVersionSqlRow = {
	id: string;
	organization_id: string;
	worker_id: string;
	worker_type: string;
	employee_id: string | null;
	worker_status: string;
	effective_from: string;
	effective_to: string | null;
	supersedes_classification_version_id: string | null;
	lineage_status: string;
	reason_code: string;
	evidence_ref: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapPersonIdentityVersionRow(
	row: PersonIdentityVersionSqlRow,
): Result<PersonIdentityVersion> {
	const personId = parseHumanResourcesPersonId(row.person_id);
	if (!personId.ok) {
		return personId;
	}
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		personId: personId.data,
		legalName: row.legal_name,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesIdentityVersionId: row.supersedes_identity_version_id,
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

function mapWorkerClassificationVersionRow(
	row: WorkerClassificationVersionSqlRow,
): Result<WorkerClassificationVersion> {
	const workerId = parseHumanResourcesWorkerId(row.worker_id);
	if (!workerId.ok) {
		return workerId;
	}
	const employeeId =
		row.employee_id === null
			? null
			: parseHumanResourcesEmployeeId(row.employee_id);
	if (employeeId !== null && !employeeId.ok) {
		return employeeId;
	}
	if (
		row.worker_type !== "employee" &&
		row.worker_type !== "contractor" &&
		row.worker_type !== "contingent_worker" &&
		row.worker_type !== "intern"
	) {
		return fail("INTERNAL_ERROR", "Invalid worker type in classification storage");
	}
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		workerId: workerId.data,
		workerType: row.worker_type,
		employeeId: employeeId === null ? null : employeeId.data,
		workerStatus: row.worker_status as WorkerClassificationVersion["workerStatus"],
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesClassificationVersionId: row.supersedes_classification_version_id,
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

		async findPersonAsOf(input): Promise<Result<PersonIdentityAtAsOf | null>> {
			try {
				const personResult = await this.getPersonById({
					organizationId: input.organizationId,
					personId: input.personId,
				});
				if (!personResult.ok) {
					return personResult;
				}
				if (personResult.data === null) {
					return ok(null);
				}

				const rows = await db
					.select()
					.from(hrPersonIdentityVersion)
					.where(
						and(
							eq(hrPersonIdentityVersion.organizationId, input.organizationId),
							eq(hrPersonIdentityVersion.personId, input.personId),
						),
					);
				const versions: PersonIdentityVersion[] = [];
				for (const row of rows) {
					const mapped = mapPersonIdentityVersionRow(
						row as unknown as PersonIdentityVersionSqlRow,
					);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}

				const resolution = resolvePersonIdentityAsOf({
					versions,
					personId: input.personId,
					asOf: input.asOf,
				});
				if (!resolution.ok) {
					return fail(
						"CONFLICT",
						`Person identity lineage is invalid: ${resolution.reason}`,
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				if (resolution.record === null) {
					return ok(null);
				}

				return ok({
					personId: input.personId,
					organizationId: input.organizationId,
					legalName: resolution.record.legalName,
					asOf: input.asOf,
					effectiveFrom: resolution.record.effectiveFrom,
					effectiveTo: resolution.record.effectiveTo,
					identityVersionId: resolution.record.id,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async listPersonIdentityVersions(input) {
			try {
				const rows = await db
					.select()
					.from(hrPersonIdentityVersion)
					.where(
						and(
							eq(hrPersonIdentityVersion.organizationId, input.organizationId),
							eq(hrPersonIdentityVersion.personId, input.personId),
						),
					);
				const versions: PersonIdentityVersion[] = [];
				for (const row of rows) {
					const mapped = mapPersonIdentityVersionRow(
						row as unknown as PersonIdentityVersionSqlRow,
					);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}
				return ok(versions);
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
			const identityVersionId = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const effectiveFrom = new Date().toISOString().slice(0, 10);
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
						lineage AS (
							INSERT INTO hr_person_identity_version (
								id, organization_id, person_id, legal_name, effective_from,
								effective_to, supersedes_identity_version_id, lineage_status,
								reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${identityVersionId}, organization_id, id, legal_name, ${effectiveFrom},
								NULL, NULL, 'active', 'initial_record', NULL, 1, created_by, created_by
							FROM mutated
							RETURNING id
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
						SELECT mutated.* FROM mutated, lineage, audited, outboxed
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

		async updatePersonName(input, _ports, meta): Promise<Result<Person>> {
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

				const versionsResult = await this.listPersonIdentityVersions({
					organizationId: input.organizationId,
					personId: input.personId,
				});
				if (!versionsResult.ok) {
					return versionsResult;
				}
				const openSegment = versionsResult.data.find(
					(version) =>
						version.lineageStatus === "active" && version.effectiveTo === null,
				);
				if (openSegment === undefined) {
					return fail(
						"CONFLICT",
						"Person identity lineage is missing an open segment",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
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
				if (openSegment.legalName === input.legalName) {
					return fail(
						"CONFLICT",
						"Person identity correction must change legal name",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}

				const auditId = randomUUID();
				const eventId = randomUUID();
				const successorId = randomUUID();
				const nextVersion = input.expectedVersion + 1;
				const predecessorEnd = previousIsoDate(input.effectiveOn);
				const changesJson = fieldChangeJson(
					"legalName",
					existing.data.legalName,
					input.legalName,
				);
				const payloadJson = eventPayloadJson({
					organizationId: input.organizationId,
					entityType: "hr_person",
					entityId: input.personId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				});

				const [rows] = await runNeonHttpTransaction<[PersonSqlRow[]]>((sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_person
							SET legal_name = ${input.legalName},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.personId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_person_identity_version
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE organization_id = ${input.organizationId}
								AND person_id = ${input.personId}
								AND id = ${openSegment.id}
								AND effective_to IS NULL
								AND lineage_status = 'active'
							RETURNING id
						),
						successor AS (
							INSERT INTO hr_person_identity_version (
								id, organization_id, person_id, legal_name, effective_from,
								effective_to, supersedes_identity_version_id, lineage_status,
								reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, organization_id, id, ${input.legalName}, ${input.effectiveOn},
								NULL, ${openSegment.id}, 'active', ${input.reasonCode}, ${input.evidenceRef},
								1, ${input.actorUserId}, ${input.actorUserId}
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
								'human-resources', 'hr_person', id, 'UPDATE', ${changesJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Person update conflict");
				}
				return mapPersonRow(row);
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

		async findWorkerAsOf(input): Promise<Result<WorkerClassificationAtAsOf | null>> {
			try {
				const workerResult = await this.getWorkerById({
					organizationId: input.organizationId,
					workerId: input.workerId,
				});
				if (!workerResult.ok) {
					return workerResult;
				}
				if (workerResult.data === null) {
					return ok(null);
				}

				const rows = await db
					.select()
					.from(hrWorkerClassificationVersion)
					.where(
						and(
							eq(
								hrWorkerClassificationVersion.organizationId,
								input.organizationId,
							),
							eq(hrWorkerClassificationVersion.workerId, input.workerId),
						),
					);
				const versions: WorkerClassificationVersion[] = [];
				for (const row of rows) {
					const mapped = mapWorkerClassificationVersionRow(
						row as unknown as WorkerClassificationVersionSqlRow,
					);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}

				const resolution = resolveWorkerClassificationAsOf({
					versions,
					workerId: input.workerId,
					asOf: input.asOf,
				});
				if (!resolution.ok) {
					return fail(
						"CONFLICT",
						`Worker classification lineage is invalid: ${resolution.reason}`,
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				if (resolution.record === null) {
					return ok(null);
				}

				return ok({
					workerId: input.workerId,
					organizationId: input.organizationId,
					personId: workerResult.data.personId,
					workerType: resolution.record.workerType,
					employeeId: resolution.record.employeeId,
					status: resolution.record.workerStatus,
					asOf: input.asOf,
					effectiveFrom: resolution.record.effectiveFrom,
					effectiveTo: resolution.record.effectiveTo,
					classificationVersionId: resolution.record.id,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async listWorkerClassificationVersions(input) {
			try {
				const rows = await db
					.select()
					.from(hrWorkerClassificationVersion)
					.where(
						and(
							eq(
								hrWorkerClassificationVersion.organizationId,
								input.organizationId,
							),
							eq(hrWorkerClassificationVersion.workerId, input.workerId),
						),
					);
				const versions: WorkerClassificationVersion[] = [];
				for (const row of rows) {
					const mapped = mapWorkerClassificationVersionRow(
						row as unknown as WorkerClassificationVersionSqlRow,
					);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}
				return ok(versions);
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
			const classificationVersionId = randomUUID();
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
						lineage AS (
							INSERT INTO hr_worker_classification_version (
								id, organization_id, worker_id, worker_type, employee_id, worker_status,
								effective_from, effective_to, supersedes_classification_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${classificationVersionId}, organization_id, id, worker_type, employee_id, status,
								effective_from, NULL, NULL, 'active', 'initial_record', NULL, 1, created_by, created_by
							FROM mutated
							RETURNING id
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
						SELECT mutated.* FROM mutated, lineage, audited, outboxed
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
			meta,
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

			const versionsResult = await this.listWorkerClassificationVersions({
				organizationId: input.organizationId,
				workerId: input.workerId,
			});
			if (!versionsResult.ok) {
				return versionsResult;
			}
			const openSegment = versionsResult.data.find(
				(version) =>
					version.lineageStatus === "active" && version.effectiveTo === null,
			);
			if (openSegment === undefined) {
				return fail(
					"CONFLICT",
					"Worker classification lineage is missing an open segment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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

			const employeeId =
				input.workerType === "employee" ? input.employeeId : null;
			if (
				openSegment.workerType === input.workerType &&
				openSegment.employeeId === employeeId
			) {
				return fail(
					"CONFLICT",
					"Worker type change must alter classification",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const auditId = randomUUID();
			const eventId = randomUUID();
			const successorId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_worker",
				entityId: input.workerId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await runNeonHttpTransaction<[WorkerSqlRow[]]>((sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_worker
							SET worker_type = ${input.workerType},
								employee_id = ${employeeId},
								effective_from = ${input.effectiveOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.workerId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_worker_classification_version
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE organization_id = ${input.organizationId}
								AND worker_id = ${input.workerId}
								AND id = ${openSegment.id}
								AND effective_to IS NULL
								AND lineage_status = 'active'
							RETURNING id, worker_status
						),
						successor AS (
							INSERT INTO hr_worker_classification_version (
								id, organization_id, worker_id, worker_type, employee_id, worker_status,
								effective_from, effective_to, supersedes_classification_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, organization_id, id, ${input.workerType}, ${employeeId},
								closed.worker_status, ${input.effectiveOn}, NULL, ${openSegment.id},
								'active', ${input.reasonCode}, ${input.evidenceRef}, 1,
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
								'human-resources', 'hr_worker', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Worker type change conflict");
				}
				const mapped = mapWorkerRow(row);
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

		async changeWorkerStatus(input, _ports, meta): Promise<Result<Worker>> {
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

			const versionsResult = await this.listWorkerClassificationVersions({
				organizationId: input.organizationId,
				workerId: input.workerId,
			});
			if (!versionsResult.ok) {
				return versionsResult;
			}
			const openSegment = versionsResult.data.find(
				(version) =>
					version.lineageStatus === "active" && version.effectiveTo === null,
			);
			if (openSegment === undefined) {
				return fail(
					"CONFLICT",
					"Worker classification lineage is missing an open segment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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

			if (openSegment.workerStatus === input.status) {
				return fail(
					"CONFLICT",
					"Worker status change must alter classification",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const auditId = randomUUID();
			const eventId = randomUUID();
			const successorId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_worker",
				entityId: input.workerId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});

			try {
				const [rows] = await runNeonHttpTransaction<[WorkerSqlRow[]]>((sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_worker
							SET status = ${input.status},
								effective_from = ${input.effectiveOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.workerId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_worker_classification_version
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE organization_id = ${input.organizationId}
								AND worker_id = ${input.workerId}
								AND id = ${openSegment.id}
								AND effective_to IS NULL
								AND lineage_status = 'active'
							RETURNING id, worker_type, employee_id
						),
						successor AS (
							INSERT INTO hr_worker_classification_version (
								id, organization_id, worker_id, worker_type, employee_id, worker_status,
								effective_from, effective_to, supersedes_classification_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, organization_id, id, closed.worker_type, closed.employee_id,
								${input.status}, ${input.effectiveOn}, NULL, ${openSegment.id},
								'active', ${input.reasonCode}, ${input.evidenceRef}, 1,
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
								'human-resources', 'hr_worker', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const row = rows[0];
				if (row === undefined) {
					return fail("CONFLICT", "Worker status change conflict");
				}
				return mapWorkerRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},
	};
