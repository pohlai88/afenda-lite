import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	hrEmployee,
	hrPerson,
	hrPersonContact,
	hrPersonIdentifier,
	hrPersonIdentityVersion,
	hrWorker,
	hrWorkerClassificationVersion,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_ADDED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_RETIRED_EVENT,
	HUMAN_RESOURCES_PERSON_CREATED_EVENT,
	HUMAN_RESOURCES_PERSON_IDENTIFIER_ADDED_EVENT,
	HUMAN_RESOURCES_PERSON_IDENTIFIER_RETIRED_EVENT,
	HUMAN_RESOURCES_WORKER_CHANGED_EVENT,
	HUMAN_RESOURCES_WORKER_CREATED_EVENT,
} from "@afenda/events/schemas";
import { eventPayloadJson } from "../../../../kernel/emissions/audit-facts";
import { assertExpectedVersion } from "../../../../kernel/execution/concurrency";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../../../kernel/execution/error-codes";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../../../kernel/execution/persistence-errors";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../../../kernel/execution/run-sequential";
import {
	type HumanResourcesEmployeeId,
	type HumanResourcesPersonId,
	type HumanResourcesWorkerId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesPersonId,
	parseHumanResourcesWorkerId,
} from "../../../../kernel/identity/brands";
import { previousIsoDate } from "../../../../kernel/temporal/effective-dates";
import {
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
	type HumanResourcesRetentionClassification,
} from "../../../privacy/contract";
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../lineage-segment";
import { resolvePersonIdentityAsOf } from "../person-identity-lineage";
import { workerStatusSchema } from "../schema";
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
} from "../store-contract";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	PersonContact,
	PersonDuplicateCandidate,
	PersonDuplicateMatchReason,
	PersonIdentifier,
	PersonIdentityAtAsOf,
	PersonIdentityVersion,
	Worker,
	WorkerClassificationAtAsOf,
	WorkerClassificationVersion,
} from "../types";
import { resolveWorkerClassificationAsOf } from "../worker-classification-lineage";

const WORKFORCE_FOUNDATION_AUDIT_SOURCE =
	"human-resources.workforce-foundation-drizzle";

interface PersonSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	legal_name: string;
	organization_id: string;
	preferred_name: string | null;
	privacy_classification: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface PersonContactSqlRow {
	contact_type: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	is_primary: boolean;
	normalized_value: string;
	organization_id: string;
	person_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	value_text: string;
	version: number;
}

interface PersonIdentifierSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	document_ref: string | null;
	effective_from: string;
	effective_to: string | null;
	id: string;
	identifier_fingerprint: string;
	identifier_last4: string;
	identifier_type: string;
	organization_id: string;
	person_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface WorkerSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	employee_id: string | null;
	id: string;
	organization_id: string;
	person_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	worker_type: string;
}

type PersonIdentityVersionSqlRow = typeof hrPersonIdentityVersion.$inferSelect;

type WorkerClassificationVersionSqlRow =
	typeof hrWorkerClassificationVersion.$inferSelect;

const HUMAN_RESOURCES_RETENTION_CLASSIFICATION_SET = new Set<string>(
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
);

function isHumanResourcesRetentionClassification(
	value: string,
): value is HumanResourcesRetentionClassification {
	return HUMAN_RESOURCES_RETENTION_CLASSIFICATION_SET.has(value);
}

function mapPersonIdentityVersionRow(
	row: PersonIdentityVersionSqlRow,
): Result<PersonIdentityVersion> {
	const personId = parseHumanResourcesPersonId(row.personId);
	if (!personId.ok) {
		return personId;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		personId: personId.data,
		legalName: row.legalName,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesIdentityVersionId: row.supersedesIdentityVersionId,
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

function mapWorkerClassificationVersionRow(
	row: WorkerClassificationVersionSqlRow,
): Result<WorkerClassificationVersion> {
	const workerId = parseHumanResourcesWorkerId(row.workerId);
	if (!workerId.ok) {
		return workerId;
	}
	const employeeId =
		row.employeeId === null
			? null
			: parseHumanResourcesEmployeeId(row.employeeId);
	if (employeeId !== null && !employeeId.ok) {
		return employeeId;
	}
	if (
		row.workerType !== "employee" &&
		row.workerType !== "contractor" &&
		row.workerType !== "contingent_worker" &&
		row.workerType !== "intern"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const workerStatus = workerStatusSchema.safeParse(row.workerStatus);
	if (!workerStatus.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		workerId: workerId.data,
		workerType: row.workerType,
		employeeId: employeeId === null ? null : employeeId.data,
		workerStatus: workerStatus.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesClassificationVersionId: row.supersedesClassificationVersionId,
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

function mapPersonRow(row: PersonSqlRow): Result<Person> {
	const id = parseHumanResourcesPersonId(row.id);
	if (!id.ok) {
		return id;
	}
	if (!isHumanResourcesRetentionClassification(row.privacy_classification)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		legalName: row.legal_name,
		preferredName: row.preferred_name,
		privacyClassification: row.privacy_classification,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapPersonSelectRow(row: typeof hrPerson.$inferSelect): Result<Person> {
	return mapPersonRow({
		id: row.id,
		organization_id: row.organizationId,
		legal_name: row.legalName,
		preferred_name: row.preferredName,
		privacy_classification: row.privacyClassification,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapPersonContactRow(row: PersonContactSqlRow): Result<PersonContact> {
	const personId = parseHumanResourcesPersonId(row.person_id);
	if (!personId.ok) {
		return personId;
	}
	if (
		row.contact_type !== "email" &&
		row.contact_type !== "phone" &&
		row.contact_type !== "postal_address"
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organization_id,
		personId: personId.data,
		contactType: row.contact_type,
		valueText: row.value_text,
		normalizedValue: row.normalized_value,
		isPrimary: row.is_primary,
		status: row.status === "retired" ? "retired" : "active",
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapPersonContactSelectRow(
	row: typeof hrPersonContact.$inferSelect,
): Result<PersonContact> {
	return mapPersonContactRow({
		id: row.id,
		organization_id: row.organizationId,
		person_id: row.personId,
		contact_type: row.contactType,
		value_text: row.valueText,
		normalized_value: row.normalizedValue,
		is_primary: row.isPrimary,
		status: row.status,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapPersonIdentifierRow(
	row: PersonIdentifierSqlRow,
): Result<PersonIdentifier> {
	const personId = parseHumanResourcesPersonId(row.person_id);
	if (!personId.ok) {
		return personId;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organization_id,
		personId: personId.data,
		identifierType: row.identifier_type,
		identifierFingerprint: row.identifier_fingerprint,
		identifierLast4: row.identifier_last4,
		documentRef: row.document_ref,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		status: row.status === "retired" ? "retired" : "active",
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapPersonIdentifierSelectRow(
	row: typeof hrPersonIdentifier.$inferSelect,
): Result<PersonIdentifier> {
	return mapPersonIdentifierRow({
		id: row.id,
		organization_id: row.organizationId,
		person_id: row.personId,
		identifier_type: row.identifierType,
		identifier_fingerprint: row.identifierFingerprint,
		identifier_last4: row.identifierLast4,
		document_ref: row.documentRef,
		effective_from: row.effectiveFrom,
		effective_to: row.effectiveTo,
		status: row.status,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
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
	const status = workerStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const base = {
		id: id.data,
		organizationId: row.organization_id,
		personId: personId.data,
		status: status.data,
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
		return errorResult.ok({
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
		return errorResult.fail("INTERNAL_ERROR");
	}

	return errorResult.ok({
		...base,
		workerType: row.worker_type,
		employeeId: null,
	} satisfies NonEmployeeWorker);
}

function mapWorkerSelectRow(row: typeof hrWorker.$inferSelect): Result<Worker> {
	return mapWorkerRow({
		id: row.id,
		organization_id: row.organizationId,
		person_id: row.personId,
		worker_type: row.workerType,
		employee_id: row.employeeId,
		status: row.status,
		effective_from: row.effectiveFrom,
		effective_to: row.effectiveTo,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

async function updatePersonScalarFieldDrizzle(input: {
	organizationId: string;
	personId: HumanResourcesPersonId;
	expectedVersion: number;
	actorUserId: string;
	field: "preferred_name" | "privacy_classification";
	value: string | null;
	changeField: "preferredName" | "privacyClassification";
	meta: {
		causationId?: string | undefined;
		correlationId: string;
		idempotencyKey?: string | undefined;
	};
	getPersonById: HumanResourcesWorkforceFoundationStore["getPersonById"];
}): Promise<Result<Person>> {
	try {
		const existing = await input.getPersonById({
			organizationId: input.organizationId,
			personId: input.personId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				),
			});
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const currentValue =
			input.changeField === "preferredName"
				? existing.data.preferredName
				: existing.data.privacyClassification;
		if (currentValue === input.value) {
			return errorResult.ok(existing.data);
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.meta.correlationId,
			module: "human-resources",
			entity: "hr_person",
			entityId: input.personId,
			action: "UPDATE",
			changes: [
				{
					field: input.changeField,
					oldValue: currentValue,
					newValue: input.value,
				},
			],
			oldValue: {
				[input.changeField]: currentValue,
				version: input.expectedVersion,
			},
			newValue: { [input.changeField]: input.value, version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
				causationId:
					input.meta.causationId ?? input.meta.idempotencyKey ?? null,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_person",
			entityId: input.personId,
			actorId: input.actorUserId,
			correlationId: input.meta.correlationId,
		});
		const [rows] = await afendaDatabase.transaction((sqlTx) => [
			input.field === "preferred_name"
				? sqlTx`
						WITH mutated AS (
							UPDATE hr_person AS person
							SET preferred_name = ${input.value},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE person.id = ${input.personId}
								AND person.organization_id = ${input.organizationId}
								AND person.version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CHANGED_EVENT}, 'human-resources',
								${input.meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
				: sqlTx`
						WITH mutated AS (
							UPDATE hr_person
							SET privacy_classification = ${input.value},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.personId}
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CHANGED_EVENT}, 'human-resources',
								${input.meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
		]);
		const [row] = rows;
		if (row === undefined) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			});
		}
		return mapPersonRow(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Workforce foundation persistence failed",
		);
	}
}

async function validateEmployeeLinkForWorkerDrizzle(
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		excludingWorkerId?: HumanResourcesWorkerId;
	},
	findWorkerByEmployeeId: HumanResourcesWorkforceFoundationStore["findWorkerByEmployeeId"],
): Promise<Result<void>> {
	const employeeRows = await afendaDatabase.client
		.select({ id: hrEmployee.id })
		.from(hrEmployee)
		.where(
			and(
				eq(hrEmployee.organizationId, input.organizationId),
				eq(hrEmployee.id, input.employeeId),
			),
		)
		.limit(1);
	if (employeeRows.length === 0) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const employeeWorker = await findWorkerByEmployeeId({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
	});
	if (!employeeWorker.ok) {
		return employeeWorker;
	}
	if (
		employeeWorker.data !== null &&
		(input.excludingWorkerId === undefined ||
			employeeWorker.data.id !== input.excludingWorkerId)
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}

	return errorResult.ok(undefined);
}

async function validateCreateWorkerPreconditions(input: {
	record: Parameters<HumanResourcesWorkforceFoundationStore["createWorker"]>[0];
	getPersonById: HumanResourcesWorkforceFoundationStore["getPersonById"];
	findWorkerByPersonId: HumanResourcesWorkforceFoundationStore["findWorkerByPersonId"];
	findWorkerByEmployeeId: HumanResourcesWorkforceFoundationStore["findWorkerByEmployeeId"];
}): Promise<Result<void>> {
	const person = await input.getPersonById({
		organizationId: input.record.organizationId,
		personId: input.record.personId,
	});
	if (!person.ok) {
		return person;
	}
	if (person.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const personWorker = await input.findWorkerByPersonId({
		organizationId: input.record.organizationId,
		personId: input.record.personId,
	});
	if (!personWorker.ok) {
		return personWorker;
	}
	if (personWorker.data !== null) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}

	if (
		input.record.workerType !== "employee" ||
		input.record.employeeId === null
	) {
		return errorResult.ok(undefined);
	}

	return validateEmployeeLinkForWorkerDrizzle(
		{
			organizationId: input.record.organizationId,
			employeeId: input.record.employeeId,
		},
		input.findWorkerByEmployeeId,
	);
}

export const drizzleWorkforceFoundationMethods: HumanResourcesWorkforceFoundationStore =
	{
		async getPersonById(input): Promise<Result<Person | null>> {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPerson)
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							eq(hrPerson.id, input.personId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapPersonSelectRow(row);
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
					return errorResult.ok(null);
				}

				const rows = await afendaDatabase.client
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
					const mapped = mapPersonIdentityVersionRow(row);
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				if (resolution.record === null) {
					return errorResult.ok(null);
				}

				return errorResult.ok({
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
				const rows = await afendaDatabase.client
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
					const mapped = mapPersonIdentityVersionRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}
				return errorResult.ok(versions);
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
				const rows = await afendaDatabase.client
					.select()
					.from(hrPerson)
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							eq(hrPerson.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				const mapped = mapPersonSelectRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				return errorResult.ok({
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
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person",
				entityId: brandedId.data,
				action: "CREATE",
				changes: [
					{ field: "legalName", oldValue: null, newValue: record.legalName },
				],
				newValue: {
					legalName: record.legalName,
					privacyClassification: record.privacyClassification,
					version: 1,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId:
						meta.causationId ??
						meta.idempotencyKey ??
						record.createIdempotencyKey,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: record.organizationId,
				entityType: "hr_person",
				entityId: brandedId.data,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});

			try {
				const [rows] = await afendaDatabase.transaction((sqlValue5) => [
					sqlValue5`
						WITH mutated AS (
							INSERT INTO hr_person (
								id, organization_id, legal_name, preferred_name,
								privacy_classification, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.legalName},
								${record.preferredName}, ${record.privacyClassification},
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, lineage, audited, outboxed
					`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("INTERNAL_ERROR");
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
						return errorResult.ok(existing.data.person);
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
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_NOT_FOUND,
						),
					});
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
				if (openSegment.legalName === input.legalName) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}

				const auditId = randomUUID();
				const eventId = randomUUID();
				const successorId = randomUUID();
				const nextVersion = input.expectedVersion + 1;
				const predecessorEnd = previousIsoDate(input.effectiveOn);
				const preparedAudit = afendaAudit.transaction.prepare({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					module: "human-resources",
					entity: "hr_person",
					entityId: input.personId,
					action: "UPDATE",
					changes: [
						{
							field: "legalName",
							oldValue: existing.data.legalName,
							newValue: input.legalName,
						},
					],
					oldValue: {
						legalName: existing.data.legalName,
						version: input.expectedVersion,
					},
					newValue: { legalName: input.legalName, version: nextVersion },
					eventContext: {
						version: 1,
						outcome: "SUCCEEDED",
						source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
						causationId: meta.causationId ?? meta.idempotencyKey ?? null,
					},
				});
				if (!preparedAudit.ok) {
					return preparedAudit;
				}
				const audit = preparedAudit.data;
				const payloadJson = eventPayloadJson({
					organizationId: input.organizationId,
					entityType: "hr_person",
					entityId: input.personId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				});

				const [rows] = await afendaDatabase.transaction((sqlValue4) => [
					sqlValue4`
						WITH mutated AS (
							UPDATE hr_person AS person
							SET legal_name = ${input.legalName},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE person.id = ${input.personId}
								AND person.organization_id = ${input.organizationId}
								AND person.version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_person_identity_version AS identity
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE identity.organization_id = ${input.organizationId}
								AND identity.person_id = ${input.personId}
								AND identity.id = ${openSegment.id}
								AND identity.effective_to IS NULL
								AND identity.lineage_status = 'active'
							RETURNING id
						),
						successor AS (
							INSERT INTO hr_person_identity_version (
								id, organization_id, person_id, legal_name, effective_from,
								effective_to, supersedes_identity_version_id, lineage_status,
								reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, mutated.organization_id, mutated.id, ${input.legalName}, ${input.effectiveOn},
								NULL, ${openSegment.id}, 'active', ${input.reasonCode}, ${input.evidenceRef},
								1, ${input.actorUserId}, ${input.actorUserId}
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				return mapPersonRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async updatePersonPreferredName(
			input,
			_ports,
			meta,
		): Promise<Result<Person>> {
			return await updatePersonScalarFieldDrizzle({
				organizationId: input.organizationId,
				personId: input.personId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				field: "preferred_name",
				value: input.preferredName,
				changeField: "preferredName",
				meta,
				getPersonById: drizzleWorkforceFoundationMethods.getPersonById,
			});
		},

		async setPersonPrivacyClassification(
			input,
			_ports,
			meta,
		): Promise<Result<Person>> {
			return await updatePersonScalarFieldDrizzle({
				organizationId: input.organizationId,
				personId: input.personId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				field: "privacy_classification",
				value: input.privacyClassification,
				changeField: "privacyClassification",
				meta,
				getPersonById: drizzleWorkforceFoundationMethods.getPersonById,
			});
		},

		async findPersonContactByIdempotencyKey(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPersonContact)
					.where(
						and(
							eq(hrPersonContact.organizationId, input.organizationId),
							eq(hrPersonContact.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				const mapped = mapPersonContactSelectRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				return errorResult.ok({
					contact: mapped.data,
					createRequestFingerprint: row.createRequestFingerprint,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async addPersonContact(
			record,
			_ports,
			meta,
		): Promise<Result<PersonContact>> {
			const entityId = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person_contact",
				entityId,
				action: "CREATE",
				changes: [
					{
						field: "contactType",
						oldValue: null,
						newValue: record.contactType,
					},
				],
				newValue: {
					contactType: record.contactType,
					isPrimary: record.isPrimary,
					status: "active",
					version: 1,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId:
						meta.causationId ??
						meta.idempotencyKey ??
						record.createIdempotencyKey,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: record.organizationId,
				entityType: "hr_person_contact",
				entityId,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlTx) => [
					sqlTx`
							WITH mutated AS (
								INSERT INTO hr_person_contact (
									id, organization_id, person_id, contact_type, value_text,
									normalized_value, is_primary, status, create_idempotency_key,
									create_request_fingerprint, version, created_by, updated_by
								) VALUES (
									${entityId}, ${record.organizationId}, ${record.personId},
									${record.contactType}, ${record.valueText}, ${record.normalizedValue},
									${record.isPrimary}, 'active', ${record.createIdempotencyKey},
									${record.createRequestFingerprint}, 1, ${record.createdBy}, ${record.createdBy}
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
									${auditId}, ${audit.organizationId}, ${audit.actorUserId},
									${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
									${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
									${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CONTACT_ADDED_EVENT},
									'human-resources', ${meta.correlationId}, created_by,
									${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return mapPersonContactRow(row);
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const existing = await this.findPersonContactByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) {
						return existing;
					}
					if (existing.data !== null) {
						return errorResult.ok(existing.data.contact);
					}
				}
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async updatePersonContact(
			input,
			_ports,
			meta,
		): Promise<Result<PersonContact>> {
			const auditId = randomUUID();
			const eventId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person_contact",
				entityId: input.contactId,
				action: "UPDATE",
				changes: [
					{
						field: "contactValue",
						oldValue: "[REDACTED]",
						newValue: "[REDACTED]",
					},
				],
				oldValue: {
					contactValue: "[REDACTED]",
					version: input.expectedVersion,
				},
				newValue: {
					contactValue: "[REDACTED]",
					isPrimary: input.isPrimary ?? null,
					version: nextVersion,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId: meta.causationId ?? meta.idempotencyKey ?? null,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_person_contact",
				entityId: input.contactId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlTx) => [
					sqlTx`
							WITH mutated AS (
								UPDATE hr_person_contact
								SET value_text = ${input.valueText},
									normalized_value = ${input.normalizedValue},
									is_primary = COALESCE(${input.isPrimary ?? null}, is_primary),
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.contactId}
									AND organization_id = ${input.organizationId}
									AND person_id = ${input.personId}
									AND status = 'active'
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
									${auditId}, ${audit.organizationId}, ${audit.actorUserId},
									${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
									${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
									${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CONTACT_CHANGED_EVENT},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				return mapPersonContactRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async retirePersonContact(
			input,
			_ports,
			meta,
		): Promise<Result<PersonContact>> {
			const auditId = randomUUID();
			const eventId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person_contact",
				entityId: input.contactId,
				action: "UPDATE",
				changes: [{ field: "status", oldValue: "active", newValue: "retired" }],
				oldValue: { status: "active", version: input.expectedVersion },
				newValue: { isPrimary: false, status: "retired", version: nextVersion },
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId: meta.causationId ?? meta.idempotencyKey ?? null,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_person_contact",
				entityId: input.contactId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlTx) => [
					sqlTx`
							WITH mutated AS (
								UPDATE hr_person_contact
								SET status = 'retired',
									is_primary = false,
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.contactId}
									AND organization_id = ${input.organizationId}
									AND person_id = ${input.personId}
									AND status = 'active'
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
									${auditId}, ${audit.organizationId}, ${audit.actorUserId},
									${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
									${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
									${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_CONTACT_RETIRED_EVENT},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				return mapPersonContactRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async listPersonContacts(input) {
			try {
				const person = await this.getPersonById(input);
				if (!person.ok) {
					return person;
				}
				if (person.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_NOT_FOUND,
						),
					});
				}
				const rows = await afendaDatabase.client
					.select()
					.from(hrPersonContact)
					.where(
						and(
							eq(hrPersonContact.organizationId, input.organizationId),
							eq(hrPersonContact.personId, input.personId),
						),
					);
				const contacts: PersonContact[] = [];
				for (const row of rows) {
					const mapped = mapPersonContactSelectRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					contacts.push(mapped.data);
				}
				return errorResult.ok(contacts);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findPersonIdentifierByIdempotencyKey(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPersonIdentifier)
					.where(
						and(
							eq(hrPersonIdentifier.organizationId, input.organizationId),
							eq(hrPersonIdentifier.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				const mapped = mapPersonIdentifierSelectRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				return errorResult.ok({
					identifier: mapped.data,
					createRequestFingerprint: row.createRequestFingerprint,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async addPersonIdentifier(
			record,
			_ports,
			meta,
		): Promise<Result<PersonIdentifier>> {
			const entityId = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person_identifier",
				entityId,
				action: "CREATE",
				changes: [
					{
						field: "identifierType",
						oldValue: null,
						newValue: record.identifierType,
					},
				],
				newValue: {
					effectiveFrom: record.effectiveFrom,
					identifierLast4: record.identifierLast4,
					identifierType: record.identifierType,
					status: "active",
					version: 1,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId:
						meta.causationId ??
						meta.idempotencyKey ??
						record.createIdempotencyKey,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: record.organizationId,
				entityType: "hr_person_identifier",
				entityId,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlTx) => [
					sqlTx`
							WITH mutated AS (
								INSERT INTO hr_person_identifier (
									id, organization_id, person_id, identifier_type,
									identifier_fingerprint, identifier_last4, document_ref,
									effective_from, effective_to, status, create_idempotency_key,
									create_request_fingerprint, version, created_by, updated_by
								) VALUES (
									${entityId}, ${record.organizationId}, ${record.personId},
									${record.identifierType}, ${record.identifierFingerprint},
									${record.identifierLast4}, ${record.documentRef},
									${record.effectiveFrom}, NULL, 'active', ${record.createIdempotencyKey},
									${record.createRequestFingerprint}, 1, ${record.createdBy}, ${record.createdBy}
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
									${auditId}, ${audit.organizationId}, ${audit.actorUserId},
									${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
									${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
									${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_IDENTIFIER_ADDED_EVENT},
									'human-resources', ${meta.correlationId}, created_by,
									${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return mapPersonIdentifierRow(row);
			} catch (error) {
				if (isCreateIdempotencyUniqueViolation(error)) {
					const existing = await this.findPersonIdentifierByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) {
						return existing;
					}
					if (existing.data !== null) {
						return errorResult.ok(existing.data.identifier);
					}
				}
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async retirePersonIdentifier(
			input,
			_ports,
			meta,
		): Promise<Result<PersonIdentifier>> {
			const auditId = randomUUID();
			const eventId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_person_identifier",
				entityId: input.identifierId,
				action: "UPDATE",
				changes: [
					{ field: "status", oldValue: "active", newValue: "retired" },
					{ field: "effectiveTo", oldValue: null, newValue: input.effectiveTo },
				],
				oldValue: {
					effectiveTo: null,
					status: "active",
					version: input.expectedVersion,
				},
				newValue: {
					effectiveTo: input.effectiveTo,
					status: "retired",
					version: nextVersion,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId: meta.causationId ?? meta.idempotencyKey ?? null,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_person_identifier",
				entityId: input.identifierId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlTx) => [
					sqlTx`
							WITH mutated AS (
								UPDATE hr_person_identifier
								SET effective_to = ${input.effectiveTo},
									status = 'retired',
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.identifierId}
									AND organization_id = ${input.organizationId}
									AND person_id = ${input.personId}
									AND status = 'active'
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
									${auditId}, ${audit.organizationId}, ${audit.actorUserId},
									${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
									${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
									${eventId}, organization_id, ${HUMAN_RESOURCES_PERSON_IDENTIFIER_RETIRED_EVENT},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				return mapPersonIdentifierRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async listPersonIdentifiers(input) {
			try {
				const person = await this.getPersonById(input);
				if (!person.ok) {
					return person;
				}
				if (person.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_NOT_FOUND,
						),
					});
				}
				const rows = await afendaDatabase.client
					.select()
					.from(hrPersonIdentifier)
					.where(
						and(
							eq(hrPersonIdentifier.organizationId, input.organizationId),
							eq(hrPersonIdentifier.personId, input.personId),
						),
					);
				const identifiers: PersonIdentifier[] = [];
				for (const row of rows) {
					const mapped = mapPersonIdentifierSelectRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					identifiers.push(mapped.data);
				}
				return errorResult.ok(identifiers);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async detectPersonDuplicates(input) {
			try {
				const person = await this.getPersonById(input);
				if (!person.ok) {
					return person;
				}
				if (person.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_NOT_FOUND,
						),
					});
				}
				const matches = new Map<string, Set<PersonDuplicateMatchReason>>();
				const addMatch = (
					personId: string,
					reason: PersonDuplicateMatchReason,
				) => {
					if (personId === input.personId) {
						return;
					}
					const existing = matches.get(personId) ?? new Set();
					existing.add(reason);
					matches.set(personId, existing);
				};
				const legalNameMatches = await afendaDatabase.client
					.select()
					.from(hrPerson)
					.where(
						and(
							eq(hrPerson.organizationId, input.organizationId),
							sql`lower(trim(${hrPerson.legalName})) = lower(trim(${person.data.legalName}))`,
						),
					);
				for (const row of legalNameMatches) {
					addMatch(row.id, "legal_name");
				}
				const sourceEmails = await afendaDatabase.client
					.select()
					.from(hrPersonContact)
					.where(
						and(
							eq(hrPersonContact.organizationId, input.organizationId),
							eq(hrPersonContact.personId, input.personId),
							eq(hrPersonContact.contactType, "email"),
							eq(hrPersonContact.status, "active"),
						),
					);
				await runSequential(sourceEmails, async (email) => {
					const emailMatches = await afendaDatabase.client
						.select()
						.from(hrPersonContact)
						.where(
							and(
								eq(hrPersonContact.organizationId, input.organizationId),
								eq(hrPersonContact.contactType, "email"),
								eq(hrPersonContact.status, "active"),
								eq(hrPersonContact.normalizedValue, email.normalizedValue),
							),
						);
					for (const match of emailMatches) {
						addMatch(match.personId, "email");
					}
				});
				const sourceIdentifiers = await afendaDatabase.client
					.select()
					.from(hrPersonIdentifier)
					.where(
						and(
							eq(hrPersonIdentifier.organizationId, input.organizationId),
							eq(hrPersonIdentifier.personId, input.personId),
							eq(hrPersonIdentifier.status, "active"),
							sql`${hrPersonIdentifier.effectiveTo} IS NULL`,
						),
					);
				await runSequential(sourceIdentifiers, async (identifier) => {
					const identifierMatches = await afendaDatabase.client
						.select()
						.from(hrPersonIdentifier)
						.where(
							and(
								eq(hrPersonIdentifier.organizationId, input.organizationId),
								eq(
									hrPersonIdentifier.identifierType,
									identifier.identifierType,
								),
								eq(
									hrPersonIdentifier.identifierFingerprint,
									identifier.identifierFingerprint,
								),
								eq(hrPersonIdentifier.status, "active"),
								sql`${hrPersonIdentifier.effectiveTo} IS NULL`,
							),
						);
					for (const match of identifierMatches) {
						addMatch(match.personId, "identifier_fingerprint");
					}
				});
				const candidates: PersonDuplicateCandidate[] = [];
				const sequentialOutcome1 = await runSequential(
					matches,
					async ([personId, reasons]) => {
						const parsed = parseHumanResourcesPersonId(personId);
						if (!parsed.ok) {
							return sequentialReturn(parsed);
						}
						const matched = await this.getPersonById({
							organizationId: input.organizationId,
							personId: parsed.data,
						});
						if (!matched.ok) {
							return sequentialReturn(matched);
						}
						if (matched.data === null) {
							return sequentialContinue();
						}
						candidates.push({
							personId: parsed.data,
							matchReasons: [...reasons],
							legalName: matched.data.legalName,
							preferredName: matched.data.preferredName,
						});
					},
				);
				if (sequentialOutcome1.kind === "return") {
					return sequentialOutcome1.value;
				}
				return errorResult.ok(candidates);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async getWorkerById(input): Promise<Result<Worker | null>> {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.id, input.workerId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapWorkerSelectRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findWorkerAsOf(
			input,
		): Promise<Result<WorkerClassificationAtAsOf | null>> {
			try {
				const workerResult = await this.getWorkerById({
					organizationId: input.organizationId,
					workerId: input.workerId,
				});
				if (!workerResult.ok) {
					return workerResult;
				}
				if (workerResult.data === null) {
					return errorResult.ok(null);
				}

				const rows = await afendaDatabase.client
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
					const mapped = mapWorkerClassificationVersionRow(row);
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				if (resolution.record === null) {
					return errorResult.ok(null);
				}

				return errorResult.ok({
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
				const rows = await afendaDatabase.client
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
					const mapped = mapWorkerClassificationVersionRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					versions.push(mapped.data);
				}
				return errorResult.ok(versions);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Workforce foundation persistence failed",
				);
			}
		},

		async findWorkerByPersonId(input): Promise<Result<Worker | null>> {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.personId, input.personId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapWorkerSelectRow(row);
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
				const rows = await afendaDatabase.client
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
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				const mapped = mapWorkerSelectRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				if (mapped.data.workerType !== "employee") {
					return errorResult.ok(null);
				}
				return errorResult.ok(mapped.data);
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
				const rows = await afendaDatabase.client
					.select()
					.from(hrWorker)
					.where(
						and(
							eq(hrWorker.organizationId, input.organizationId),
							eq(hrWorker.createIdempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				const mapped = mapWorkerSelectRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				return errorResult.ok({
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
			const preconditions = await validateCreateWorkerPreconditions({
				record,
				getPersonById: this.getPersonById.bind(this),
				findWorkerByPersonId: this.findWorkerByPersonId.bind(this),
				findWorkerByEmployeeId: this.findWorkerByEmployeeId.bind(this),
			});
			if (!preconditions.ok) {
				return preconditions;
			}

			const entityId = randomUUID();
			const brandedId = parseHumanResourcesWorkerId(entityId);
			if (!brandedId.ok) {
				return brandedId;
			}
			const classificationVersionId = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_worker",
				entityId: brandedId.data,
				action: "CREATE",
				changes: [
					{ field: "workerType", oldValue: null, newValue: record.workerType },
				],
				newValue: {
					effectiveFrom: record.effectiveFrom,
					status: record.status,
					workerType: record.workerType,
					version: 1,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId:
						meta.causationId ??
						meta.idempotencyKey ??
						record.createIdempotencyKey,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
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
				const [rows] = await afendaDatabase.transaction((sqlValue3) => [
					sqlValue3`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CREATED_EVENT}, 'human-resources',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, lineage, audited, outboxed
					`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("INTERNAL_ERROR");
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
						return errorResult.ok(existing.data.worker);
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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

			const employeeId =
				input.workerType === "employee" ? input.employeeId : null;
			if (input.workerType === "employee" && input.employeeId !== null) {
				const employeeLink = await validateEmployeeLinkForWorkerDrizzle(
					{
						organizationId: input.organizationId,
						employeeId: input.employeeId,
						excludingWorkerId: input.workerId,
					},
					this.findWorkerByEmployeeId.bind(this),
				);
				if (!employeeLink.ok) {
					return employeeLink;
				}
			}
			if (
				openSegment.workerType === input.workerType &&
				openSegment.employeeId === employeeId
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const auditId = randomUUID();
			const eventId = randomUUID();
			const successorId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_worker",
				entityId: input.workerId,
				action: "UPDATE",
				changes: [
					{
						field: "workerType",
						oldValue: openSegment.workerType,
						newValue: input.workerType,
					},
				],
				oldValue: {
					effectiveFrom: openSegment.effectiveFrom,
					workerType: openSegment.workerType,
					version: input.expectedVersion,
				},
				newValue: {
					effectiveFrom: input.effectiveOn,
					workerType: input.workerType,
					version: nextVersion,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId: meta.causationId ?? meta.idempotencyKey ?? null,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_worker",
				entityId: input.workerId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});
			try {
				const [rows] = await afendaDatabase.transaction((sqlValue2) => [
					sqlValue2`
						WITH mutated AS (
							UPDATE hr_worker AS worker
							SET worker_type = ${input.workerType},
								employee_id = ${employeeId},
								effective_from = ${input.effectiveOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE worker.id = ${input.workerId}
								AND worker.organization_id = ${input.organizationId}
								AND worker.version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_worker_classification_version AS classification
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE classification.organization_id = ${input.organizationId}
								AND classification.worker_id = ${input.workerId}
								AND classification.id = ${openSegment.id}
								AND classification.effective_to IS NULL
								AND classification.lineage_status = 'active'
							RETURNING id, worker_status
						),
						successor AS (
							INSERT INTO hr_worker_classification_version (
								id, organization_id, worker_id, worker_type, employee_id, worker_status,
								effective_from, effective_to, supersedes_classification_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, mutated.organization_id, mutated.id, ${input.workerType}, ${employeeId},
								closed.worker_status, ${input.effectiveOn}, NULL, ${openSegment.id},
								'active', ${input.reasonCode}, ${input.evidenceRef}, 1,
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				const mapped = mapWorkerRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				return errorResult.ok(mapped.data);
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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

			if (openSegment.workerStatus === input.status) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const auditId = randomUUID();
			const eventId = randomUUID();
			const successorId = randomUUID();
			const nextVersion = input.expectedVersion + 1;
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const preparedAudit = afendaAudit.transaction.prepare({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				module: "human-resources",
				entity: "hr_worker",
				entityId: input.workerId,
				action: "UPDATE",
				changes: [
					{
						field: "status",
						oldValue: openSegment.workerStatus,
						newValue: input.status,
					},
				],
				oldValue: {
					effectiveFrom: openSegment.effectiveFrom,
					status: openSegment.workerStatus,
					version: input.expectedVersion,
				},
				newValue: {
					effectiveFrom: input.effectiveOn,
					status: input.status,
					version: nextVersion,
				},
				eventContext: {
					version: 1,
					outcome: "SUCCEEDED",
					source: WORKFORCE_FOUNDATION_AUDIT_SOURCE,
					causationId: meta.causationId ?? meta.idempotencyKey ?? null,
				},
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_worker",
				entityId: input.workerId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});

			try {
				const [rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`
						WITH mutated AS (
							UPDATE hr_worker AS worker
							SET status = ${input.status},
								effective_from = ${input.effectiveOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE worker.id = ${input.workerId}
								AND worker.organization_id = ${input.organizationId}
								AND worker.version = ${input.expectedVersion}
							RETURNING *
						),
						closed AS (
							UPDATE hr_worker_classification_version AS classification
							SET effective_to = ${predecessorEnd},
								lineage_status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE classification.organization_id = ${input.organizationId}
								AND classification.worker_id = ${input.workerId}
								AND classification.id = ${openSegment.id}
								AND classification.effective_to IS NULL
								AND classification.lineage_status = 'active'
							RETURNING id, worker_type, employee_id
						),
						successor AS (
							INSERT INTO hr_worker_classification_version (
								id, organization_id, worker_id, worker_type, employee_id, worker_status,
								effective_from, effective_to, supersedes_classification_version_id,
								lineage_status, reason_code, evidence_ref, version, created_by, updated_by
							)
							SELECT
								${successorId}, mutated.organization_id, mutated.id, closed.worker_type, closed.employee_id,
								${input.status}, ${input.effectiveOn}, NULL, ${openSegment.id},
								'active', ${input.reasonCode}, ${input.evidenceRef}, 1,
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${eventId}, organization_id, ${HUMAN_RESOURCES_WORKER_CHANGED_EVENT}, 'human-resources',
								${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed, successor, audited, outboxed
					`,
				]);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
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
