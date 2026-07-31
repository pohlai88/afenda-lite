import { randomUUID } from "node:crypto";
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
import {
	type HumanResourcesEmployeeId,
	type HumanResourcesPersonId,
	type HumanResourcesWorkerId,
	parseHumanResourcesPersonId,
	parseHumanResourcesWorkerId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { previousIsoDate } from "../../shared/effective-dates";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonContactRecord,
	IdempotentPersonIdentifierRecord,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
} from "../../store";
import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../../workforce-foundation/lineage-segment";
import { resolvePersonIdentityAsOf } from "../../workforce-foundation/person-identity-lineage";
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
} from "../../workforce-foundation/types";
import { resolveWorkerClassificationAsOf } from "../../workforce-foundation/worker-classification-lineage";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

function clonePersonContact(contact: PersonContact): PersonContact {
	return { ...contact };
}

function clonePersonIdentifier(identifier: PersonIdentifier): PersonIdentifier {
	return { ...identifier };
}

function clonePerson(person: Person): Person {
	return { ...person };
}

function cloneWorker(worker: Worker): Worker {
	return { ...worker };
}

function clonePersonIdentityVersion(
	version: PersonIdentityVersion,
): PersonIdentityVersion {
	return { ...version };
}

function cloneWorkerClassificationVersion(
	version: WorkerClassificationVersion,
): WorkerClassificationVersion {
	return { ...version };
}

function listPersonIdentityVersionsForPerson(
	state: WorkforceFoundationMemoryState,
	organizationId: string,
	personId: HumanResourcesPersonId,
): PersonIdentityVersion[] {
	return Array.from(state.personIdentityVersions.values()).filter(
		(version) =>
			version.organizationId === organizationId &&
			version.personId === personId,
	);
}

function listWorkerClassificationVersionsForWorker(
	state: WorkforceFoundationMemoryState,
	organizationId: string,
	workerId: HumanResourcesWorkerId,
): WorkerClassificationVersion[] {
	return Array.from(state.workerClassificationVersions.values()).filter(
		(version) =>
			version.organizationId === organizationId &&
			version.workerId === workerId,
	);
}

function findOpenPersonIdentityVersion(
	state: WorkforceFoundationMemoryState,
	organizationId: string,
	personId: HumanResourcesPersonId,
): PersonIdentityVersion | null {
	const open = listPersonIdentityVersionsForPerson(
		state,
		organizationId,
		personId,
	).filter(
		(version) =>
			version.lineageStatus === "active" && version.effectiveTo === null,
	);
	if (open.length !== 1) {
		return null;
	}
	return open[0] ?? null;
}

function findOpenWorkerClassificationVersion(
	state: WorkforceFoundationMemoryState,
	organizationId: string,
	workerId: HumanResourcesWorkerId,
): WorkerClassificationVersion | null {
	const open = listWorkerClassificationVersionsForWorker(
		state,
		organizationId,
		workerId,
	).filter(
		(version) =>
			version.lineageStatus === "active" && version.effectiveTo === null,
	);
	if (open.length !== 1) {
		return null;
	}
	return open[0] ?? null;
}

export interface WorkforceFoundationMemoryState {
	personContactIdempotencyByKey: Map<string, IdempotentPersonContactRecord>;
	personContacts: Map<string, PersonContact>;
	personIdempotencyByKey: Map<string, IdempotentPersonRecord>;
	personIdentifierIdempotencyByKey: Map<
		string,
		IdempotentPersonIdentifierRecord
	>;
	personIdentifiers: Map<string, PersonIdentifier>;
	personIdentityVersions: Map<string, PersonIdentityVersion>;
	persons: Map<HumanResourcesPersonId, Person>;
	workerClassificationVersions: Map<string, WorkerClassificationVersion>;
	workerIdempotencyByKey: Map<string, IdempotentWorkerRecord>;
	workers: Map<HumanResourcesWorkerId, Worker>;
}

export type MemoryWorkforceFoundationMethods =
	HumanResourcesWorkforceFoundationStore;

export function createWorkforceFoundationMemoryState(): WorkforceFoundationMemoryState {
	return {
		persons: new Map(),
		workers: new Map(),
		personIdentityVersions: new Map(),
		workerClassificationVersions: new Map(),
		personContacts: new Map(),
		personIdentifiers: new Map(),
		personIdempotencyByKey: new Map(),
		personContactIdempotencyByKey: new Map(),
		personIdentifierIdempotencyByKey: new Map(),
		workerIdempotencyByKey: new Map(),
	};
}

export function resetWorkforceFoundationMemoryState(
	state: WorkforceFoundationMemoryState,
): void {
	state.persons.clear();
	state.workers.clear();
	state.personIdentityVersions.clear();
	state.workerClassificationVersions.clear();
	state.personContacts.clear();
	state.personIdentifiers.clear();
	state.personIdempotencyByKey.clear();
	state.personContactIdempotencyByKey.clear();
	state.personIdentifierIdempotencyByKey.clear();
	state.workerIdempotencyByKey.clear();
}

export function createMemoryWorkforceFoundationMethods(input: {
	state: WorkforceFoundationMemoryState;
	core: CoreMemoryState;
}): MemoryWorkforceFoundationMethods {
	const { state, core } = input;

	function rollbackWorkerClassificationLineage(inputValue15: {
		openSegment: WorkerClassificationVersion;
		successorId: string;
		previousWorker: Worker;
	}): void {
		state.workerClassificationVersions.set(
			inputValue15.openSegment.id,
			inputValue15.openSegment,
		);
		state.workerClassificationVersions.delete(inputValue15.successorId);
		state.workers.set(
			inputValue15.previousWorker.id,
			inputValue15.previousWorker,
		);
	}

	async function emitWorkerChanged(
		updated: Worker,
		previous: Worker,
		actorUserId: string,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
		lineageRollback?: {
			openSegment: WorkerClassificationVersion;
			successorId: string;
		},
	): Promise<Result<Worker>> {
		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_worker",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			if (lineageRollback === undefined) {
				state.workers.set(previous.id, previous);
			} else {
				rollbackWorkerClassificationLineage({
					openSegment: lineageRollback.openSegment,
					successorId: lineageRollback.successorId,
					previousWorker: previous,
				});
			}
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_WORKER_CHANGED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_worker",
				entityId: updated.id,
				actorId: actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			if (lineageRollback === undefined) {
				state.workers.set(previous.id, previous);
			} else {
				rollbackWorkerClassificationLineage({
					openSegment: lineageRollback.openSegment,
					successorId: lineageRollback.successorId,
					previousWorker: previous,
				});
			}
			return outbox;
		}

		return errorResult.ok(cloneWorker(updated));
	}

	async function assertEmployeeLinkForWorkerMemory(
		inputValue14: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			excludingWorkerId?: HumanResourcesWorkerId;
		},
		findWorkerByEmployeeId: HumanResourcesWorkforceFoundationStore["findWorkerByEmployeeId"],
	): Promise<Result<void>> {
		const employee = core.employees.get(inputValue14.employeeId);
		if (
			employee === undefined ||
			employee.organizationId !== inputValue14.organizationId
		) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				),
			});
		}

		const employeeWorker = await findWorkerByEmployeeId({
			organizationId: inputValue14.organizationId,
			employeeId: inputValue14.employeeId,
		});
		if (!employeeWorker.ok) {
			return employeeWorker;
		}
		if (
			employeeWorker.data !== null &&
			(inputValue14.excludingWorkerId === undefined ||
				employeeWorker.data.id !== inputValue14.excludingWorkerId)
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

	return {
		async getPersonById(query): Promise<Result<Person | null>> {
			const person = state.persons.get(query.personId);
			if (
				person === undefined ||
				person.organizationId !== query.organizationId
			) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(clonePerson(person));
		},

		async findPersonAsOf(query): Promise<Result<PersonIdentityAtAsOf | null>> {
			const person = state.persons.get(query.personId);
			if (
				person === undefined ||
				person.organizationId !== query.organizationId
			) {
				return await errorResult.ok(null);
			}

			const versions = listPersonIdentityVersionsForPerson(
				state,
				query.organizationId,
				query.personId,
			);
			const resolution = resolvePersonIdentityAsOf({
				versions,
				personId: query.personId,
				asOf: query.asOf,
			});
			if (!resolution.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			if (resolution.record === null) {
				return await errorResult.ok(null);
			}

			return await errorResult.ok({
				personId: query.personId,
				organizationId: query.organizationId,
				legalName: resolution.record.legalName,
				asOf: query.asOf,
				effectiveFrom: resolution.record.effectiveFrom,
				effectiveTo: resolution.record.effectiveTo,
				identityVersionId: resolution.record.id,
			});
		},

		async listPersonIdentityVersions(query) {
			const person = state.persons.get(query.personId);
			if (
				person === undefined ||
				person.organizationId !== query.organizationId
			) {
				return await errorResult.ok([]);
			}
			return await errorResult.ok(
				listPersonIdentityVersionsForPerson(
					state,
					query.organizationId,
					query.personId,
				).map(clonePersonIdentityVersion),
			);
		},

		async findPersonByIdempotencyKey(query) {
			const record = state.personIdempotencyByKey.get(
				idempotencyMapKey(query.organizationId, query.idempotencyKey),
			);
			if (record === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				person: clonePerson(record.person),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createPerson(record, ports, meta) {
			const existing = await this.findPersonByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.ok(clonePerson(existing.data.person));
			}

			const idResult = parseHumanResourcesPersonId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const effectiveFrom = now.toISOString().slice(0, 10);
			const person: Person = {
				id: idResult.data,
				organizationId: record.organizationId,
				legalName: record.legalName,
				preferredName: record.preferredName,
				privacyClassification: record.privacyClassification,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			const identityVersion: PersonIdentityVersion = {
				id: randomUUID(),
				organizationId: record.organizationId,
				personId: person.id,
				legalName: record.legalName,
				effectiveFrom,
				effectiveTo: null,
				supersedesIdentityVersionId: null,
				lineageStatus: "active",
				reasonCode: "initial_record",
				evidenceRef: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.persons.set(person.id, person);
			state.personIdentityVersions.set(identityVersion.id, identityVersion);
			state.personIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					person: clonePerson(person),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await ports.audit.record({
				organizationId: person.organizationId,
				actorUserId: person.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_person",
				entityId: person.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.persons.delete(person.id);
				state.personIdentityVersions.delete(identityVersion.id);
				state.personIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: person.organizationId,
				actorUserId: person.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CREATED_EVENT,
				payload: {
					organizationId: person.organizationId,
					entityType: "hr_person",
					entityId: person.id,
					actorId: person.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.persons.delete(person.id);
				state.personIdentityVersions.delete(identityVersion.id);
				state.personIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return errorResult.ok(clonePerson(person));
		},

		async updatePersonName(inputValue13, ports, meta) {
			const person = state.persons.get(inputValue13.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue13.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const versionCheck = assertExpectedVersion(
				person.version,
				inputValue13.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openSegment = findOpenPersonIdentityVersion(
				state,
				inputValue13.organizationId,
				inputValue13.personId,
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
				effectiveOn: inputValue13.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return effectiveOnCheck;
			}

			if (openSegment.legalName === inputValue13.legalName) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const now = new Date();
			const predecessorEnd = previousIsoDate(inputValue13.effectiveOn);
			const closedPredecessor: PersonIdentityVersion = {
				...openSegment,
				effectiveTo: predecessorEnd,
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: inputValue13.actorUserId,
				updatedAt: now,
			};
			const successor: PersonIdentityVersion = {
				id: randomUUID(),
				organizationId: inputValue13.organizationId,
				personId: inputValue13.personId,
				legalName: inputValue13.legalName,
				effectiveFrom: inputValue13.effectiveOn,
				effectiveTo: null,
				supersedesIdentityVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: inputValue13.reasonCode,
				evidenceRef: inputValue13.evidenceRef,
				version: 1,
				createdBy: inputValue13.actorUserId,
				updatedBy: inputValue13.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updatedPerson: Person = {
				...person,
				legalName: inputValue13.legalName,
				version: person.version + 1,
				updatedBy: inputValue13.actorUserId,
				updatedAt: now,
			};

			state.personIdentityVersions.set(closedPredecessor.id, closedPredecessor);
			state.personIdentityVersions.set(successor.id, successor);
			state.persons.set(updatedPerson.id, updatedPerson);

			const audit = await ports.audit.record({
				organizationId: updatedPerson.organizationId,
				actorUserId: inputValue13.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person",
				entityId: updatedPerson.id,
				action: "UPDATE",
				changes: [
					{
						field: "legalName",
						oldValue: person.legalName,
						newValue: updatedPerson.legalName,
					},
				],
			});
			if (!audit.ok) {
				state.personIdentityVersions.set(openSegment.id, openSegment);
				state.personIdentityVersions.delete(successor.id);
				state.persons.set(person.id, person);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updatedPerson.organizationId,
				actorUserId: inputValue13.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
				payload: {
					organizationId: updatedPerson.organizationId,
					entityType: "hr_person",
					entityId: updatedPerson.id,
					actorId: inputValue13.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personIdentityVersions.set(openSegment.id, openSegment);
				state.personIdentityVersions.delete(successor.id);
				state.persons.set(person.id, person);
				return outbox;
			}

			return errorResult.ok(clonePerson(updatedPerson));
		},

		async updatePersonPreferredName(inputValue12, ports, meta) {
			const person = state.persons.get(inputValue12.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue12.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				person.version,
				inputValue12.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (person.preferredName === inputValue12.preferredName) {
				return errorResult.ok(clonePerson(person));
			}
			const previous = clonePerson(person);
			const now = new Date();
			const updated: Person = {
				...person,
				preferredName: inputValue12.preferredName,
				version: person.version + 1,
				updatedBy: inputValue12.actorUserId,
				updatedAt: now,
			};
			state.persons.set(updated.id, updated);
			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: inputValue12.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "preferredName",
						oldValue: previous.preferredName,
						newValue: updated.preferredName,
					},
				],
			});
			if (!audit.ok) {
				state.persons.set(previous.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: inputValue12.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person",
					entityId: updated.id,
					actorId: inputValue12.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.persons.set(previous.id, previous);
				return outbox;
			}
			return errorResult.ok(clonePerson(updated));
		},

		async setPersonPrivacyClassification(inputValue11, ports, meta) {
			const person = state.persons.get(inputValue11.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue11.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				person.version,
				inputValue11.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (person.privacyClassification === inputValue11.privacyClassification) {
				return errorResult.ok(clonePerson(person));
			}
			const previous = clonePerson(person);
			const now = new Date();
			const updated: Person = {
				...person,
				privacyClassification: inputValue11.privacyClassification,
				version: person.version + 1,
				updatedBy: inputValue11.actorUserId,
				updatedAt: now,
			};
			state.persons.set(updated.id, updated);
			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: inputValue11.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "privacyClassification",
						oldValue: previous.privacyClassification,
						newValue: updated.privacyClassification,
					},
				],
			});
			if (!audit.ok) {
				state.persons.set(previous.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: inputValue11.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person",
					entityId: updated.id,
					actorId: inputValue11.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.persons.set(previous.id, previous);
				return outbox;
			}
			return errorResult.ok(clonePerson(updated));
		},

		async findPersonContactByIdempotencyKey(inputValue10) {
			const existing = state.personContactIdempotencyByKey.get(
				idempotencyMapKey(
					inputValue10.organizationId,
					inputValue10.idempotencyKey,
				),
			);
			if (existing === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				contact: clonePersonContact(existing.contact),
				createRequestFingerprint: existing.createRequestFingerprint,
			});
		},

		async addPersonContact(record, ports, meta) {
			const person = state.persons.get(record.personId);
			if (
				person === undefined ||
				person.organizationId !== record.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			if (record.isPrimary) {
				for (const contact of state.personContacts.values()) {
					if (
						contact.organizationId === record.organizationId &&
						contact.personId === record.personId &&
						contact.contactType === record.contactType &&
						contact.status === "active" &&
						contact.isPrimary
					) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
							internalContext: humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_CONFLICT,
							),
						});
					}
				}
			}
			const now = new Date();
			const contact: PersonContact = {
				id: randomUUID(),
				organizationId: record.organizationId,
				personId: record.personId,
				contactType: record.contactType,
				valueText: record.valueText,
				normalizedValue: record.normalizedValue,
				isPrimary: record.isPrimary,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.personContacts.set(contact.id, contact);
			state.personContactIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					contact: clonePersonContact(contact),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);
			const audit = await ports.audit.record({
				organizationId: contact.organizationId,
				actorUserId: contact.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_person_contact",
				entityId: contact.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.personContacts.delete(contact.id);
				state.personContactIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: contact.organizationId,
				actorUserId: contact.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CONTACT_ADDED_EVENT,
				payload: {
					organizationId: contact.organizationId,
					entityType: "hr_person_contact",
					entityId: contact.id,
					actorId: contact.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personContacts.delete(contact.id);
				state.personContactIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}
			return errorResult.ok(clonePersonContact(contact));
		},

		async updatePersonContact(inputValue9, ports, meta) {
			const contact = state.personContacts.get(inputValue9.contactId);
			if (
				contact === undefined ||
				contact.organizationId !== inputValue9.organizationId ||
				contact.personId !== inputValue9.personId ||
				contact.status !== "active"
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				contact.version,
				inputValue9.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (inputValue9.isPrimary === true) {
				for (const row of state.personContacts.values()) {
					if (
						row.organizationId === inputValue9.organizationId &&
						row.personId === inputValue9.personId &&
						row.contactType === contact.contactType &&
						row.status === "active" &&
						row.isPrimary &&
						row.id !== contact.id
					) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
							internalContext: humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_CONFLICT,
							),
						});
					}
				}
			}
			const previous = clonePersonContact(contact);
			const now = new Date();
			const updated: PersonContact = {
				...contact,
				valueText: inputValue9.valueText,
				normalizedValue: inputValue9.normalizedValue,
				isPrimary: inputValue9.isPrimary ?? contact.isPrimary,
				version: contact.version + 1,
				updatedBy: inputValue9.actorUserId,
				updatedAt: now,
			};
			state.personContacts.set(updated.id, updated);
			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: inputValue9.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person_contact",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.personContacts.set(previous.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: inputValue9.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CONTACT_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person_contact",
					entityId: updated.id,
					actorId: inputValue9.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personContacts.set(previous.id, previous);
				return outbox;
			}
			return errorResult.ok(clonePersonContact(updated));
		},

		async retirePersonContact(inputValue8, ports, meta) {
			const contact = state.personContacts.get(inputValue8.contactId);
			if (
				contact === undefined ||
				contact.organizationId !== inputValue8.organizationId ||
				contact.personId !== inputValue8.personId ||
				contact.status !== "active"
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				contact.version,
				inputValue8.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const previous = clonePersonContact(contact);
			const now = new Date();
			const updated: PersonContact = {
				...contact,
				status: "retired",
				isPrimary: false,
				version: contact.version + 1,
				updatedBy: inputValue8.actorUserId,
				updatedAt: now,
			};
			state.personContacts.set(updated.id, updated);
			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: inputValue8.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person_contact",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.personContacts.set(previous.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: inputValue8.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CONTACT_RETIRED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person_contact",
					entityId: updated.id,
					actorId: inputValue8.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personContacts.set(previous.id, previous);
				return outbox;
			}
			return errorResult.ok(clonePersonContact(updated));
		},

		async listPersonContacts(inputValue7) {
			const person = state.persons.get(inputValue7.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue7.organizationId
			) {
				return await errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return await errorResult.ok(
				Array.from(state.personContacts.values())
					.filter(
						(contact) =>
							contact.organizationId === inputValue7.organizationId &&
							contact.personId === inputValue7.personId,
					)
					.map(clonePersonContact),
			);
		},

		async findPersonIdentifierByIdempotencyKey(inputValue6) {
			const existing = state.personIdentifierIdempotencyByKey.get(
				idempotencyMapKey(
					inputValue6.organizationId,
					inputValue6.idempotencyKey,
				),
			);
			if (existing === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				identifier: clonePersonIdentifier(existing.identifier),
				createRequestFingerprint: existing.createRequestFingerprint,
			});
		},

		async addPersonIdentifier(record, ports, meta) {
			const person = state.persons.get(record.personId);
			if (
				person === undefined ||
				person.organizationId !== record.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			for (const identifier of state.personIdentifiers.values()) {
				if (
					identifier.organizationId === record.organizationId &&
					identifier.identifierType === record.identifierType &&
					identifier.identifierFingerprint === record.identifierFingerprint &&
					identifier.status === "active" &&
					identifier.effectiveTo === null
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
			}
			const now = new Date();
			const identifier: PersonIdentifier = {
				id: randomUUID(),
				organizationId: record.organizationId,
				personId: record.personId,
				identifierType: record.identifierType,
				identifierFingerprint: record.identifierFingerprint,
				identifierLast4: record.identifierLast4,
				documentRef: record.documentRef,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: null,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.personIdentifiers.set(identifier.id, identifier);
			state.personIdentifierIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					identifier: clonePersonIdentifier(identifier),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);
			const audit = await ports.audit.record({
				organizationId: identifier.organizationId,
				actorUserId: identifier.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_person_identifier",
				entityId: identifier.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.personIdentifiers.delete(identifier.id);
				state.personIdentifierIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: identifier.organizationId,
				actorUserId: identifier.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_IDENTIFIER_ADDED_EVENT,
				payload: {
					organizationId: identifier.organizationId,
					entityType: "hr_person_identifier",
					entityId: identifier.id,
					actorId: identifier.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personIdentifiers.delete(identifier.id);
				state.personIdentifierIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}
			return errorResult.ok(clonePersonIdentifier(identifier));
		},

		async retirePersonIdentifier(inputValue5, ports, meta) {
			const identifier = state.personIdentifiers.get(inputValue5.identifierId);
			if (
				identifier === undefined ||
				identifier.organizationId !== inputValue5.organizationId ||
				identifier.personId !== inputValue5.personId ||
				identifier.status !== "active"
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				identifier.version,
				inputValue5.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (inputValue5.effectiveTo < identifier.effectiveFrom) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const previous = clonePersonIdentifier(identifier);
			const now = new Date();
			const updated: PersonIdentifier = {
				...identifier,
				effectiveTo: inputValue5.effectiveTo,
				status: "retired",
				version: identifier.version + 1,
				updatedBy: inputValue5.actorUserId,
				updatedAt: now,
			};
			state.personIdentifiers.set(updated.id, updated);
			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: inputValue5.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person_identifier",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.personIdentifiers.set(previous.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: inputValue5.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_IDENTIFIER_RETIRED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person_identifier",
					entityId: updated.id,
					actorId: inputValue5.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personIdentifiers.set(previous.id, previous);
				return outbox;
			}
			return errorResult.ok(clonePersonIdentifier(updated));
		},

		async listPersonIdentifiers(inputValue4) {
			const person = state.persons.get(inputValue4.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue4.organizationId
			) {
				return await errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return await errorResult.ok(
				Array.from(state.personIdentifiers.values())
					.filter(
						(identifier) =>
							identifier.organizationId === inputValue4.organizationId &&
							identifier.personId === inputValue4.personId,
					)
					.map(clonePersonIdentifier),
			);
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async detectPersonDuplicates(inputValue3) {
			const person = state.persons.get(inputValue3.personId);
			if (
				person === undefined ||
				person.organizationId !== inputValue3.organizationId
			) {
				return await errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const matches = new Map<
				HumanResourcesPersonId,
				Set<PersonDuplicateMatchReason>
			>();
			const addMatch = (
				personId: HumanResourcesPersonId,
				reason: PersonDuplicateMatchReason,
			) => {
				if (personId === inputValue3.personId) {
					return;
				}
				const existing = matches.get(personId) ?? new Set();
				existing.add(reason);
				matches.set(personId, existing);
			};
			for (const candidate of state.persons.values()) {
				if (
					candidate.organizationId === inputValue3.organizationId &&
					candidate.legalName.trim().toLowerCase() ===
						person.legalName.trim().toLowerCase()
				) {
					addMatch(candidate.id, "legal_name");
				}
			}
			const emails = Array.from(state.personContacts.values()).filter(
				(contact) =>
					contact.organizationId === inputValue3.organizationId &&
					contact.personId === inputValue3.personId &&
					contact.contactType === "email" &&
					contact.status === "active",
			);
			for (const email of emails) {
				for (const contact of state.personContacts.values()) {
					if (
						contact.organizationId === inputValue3.organizationId &&
						contact.contactType === "email" &&
						contact.status === "active" &&
						contact.normalizedValue === email.normalizedValue
					) {
						addMatch(contact.personId, "email");
					}
				}
			}
			const identifiers = Array.from(state.personIdentifiers.values()).filter(
				(identifier) =>
					identifier.organizationId === inputValue3.organizationId &&
					identifier.personId === inputValue3.personId &&
					identifier.status === "active" &&
					identifier.effectiveTo === null,
			);
			for (const identifier of identifiers) {
				for (const row of state.personIdentifiers.values()) {
					if (
						row.organizationId === inputValue3.organizationId &&
						row.identifierType === identifier.identifierType &&
						row.identifierFingerprint === identifier.identifierFingerprint &&
						row.status === "active" &&
						row.effectiveTo === null
					) {
						addMatch(row.personId, "identifier_fingerprint");
					}
				}
			}
			const candidates: PersonDuplicateCandidate[] = [];
			for (const [personId, reasons] of matches) {
				const matched = state.persons.get(personId);
				if (matched === undefined) {
					continue;
				}
				candidates.push({
					personId,
					matchReasons: [...reasons],
					legalName: matched.legalName,
					preferredName: matched.preferredName,
				});
			}
			return await errorResult.ok(candidates);
		},

		async getWorkerById(query) {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(cloneWorker(worker));
		},

		async findWorkerAsOf(
			query,
		): Promise<Result<WorkerClassificationAtAsOf | null>> {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return await errorResult.ok(null);
			}

			const versions = listWorkerClassificationVersionsForWorker(
				state,
				query.organizationId,
				query.workerId,
			);
			const resolution = resolveWorkerClassificationAsOf({
				versions,
				workerId: query.workerId,
				asOf: query.asOf,
			});
			if (!resolution.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			if (resolution.record === null) {
				return await errorResult.ok(null);
			}

			return await errorResult.ok({
				workerId: query.workerId,
				organizationId: query.organizationId,
				personId: worker.personId,
				workerType: resolution.record.workerType,
				employeeId: resolution.record.employeeId,
				status: resolution.record.workerStatus,
				asOf: query.asOf,
				effectiveFrom: resolution.record.effectiveFrom,
				effectiveTo: resolution.record.effectiveTo,
				classificationVersionId: resolution.record.id,
			});
		},

		async listWorkerClassificationVersions(query) {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return await errorResult.ok([]);
			}
			return await errorResult.ok(
				listWorkerClassificationVersionsForWorker(
					state,
					query.organizationId,
					query.workerId,
				).map(cloneWorkerClassificationVersion),
			);
		},

		async findWorkerByPersonId(query) {
			const sequentialOutcome2 = await runSequential(
				state.workers.values(),
				async (worker) => {
					if (
						worker.organizationId === query.organizationId &&
						worker.personId === query.personId
					) {
						return sequentialReturn(await errorResult.ok(cloneWorker(worker)));
					}
				},
			);
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}
			return await errorResult.ok(null);
		},

		async findWorkerByEmployeeId(query) {
			const sequentialOutcome1 = await runSequential(
				state.workers.values(),
				async (worker) => {
					if (
						worker.organizationId === query.organizationId &&
						worker.workerType === "employee" &&
						worker.employeeId === query.employeeId
					) {
						return sequentialReturn(
							await errorResult.ok(cloneWorker(worker) as EmployeeWorker),
						);
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return await errorResult.ok(null);
		},

		async findWorkerByIdempotencyKey(query) {
			const record = state.workerIdempotencyByKey.get(
				idempotencyMapKey(query.organizationId, query.idempotencyKey),
			);
			if (record === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				worker: cloneWorker(record.worker),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createWorker(record, ports, meta) {
			const existing = await this.findWorkerByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return errorResult.ok(cloneWorker(existing.data.worker));
			}

			const person = state.persons.get(record.personId);
			if (
				person === undefined ||
				person.organizationId !== record.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const personWorker = await this.findWorkerByPersonId({
				organizationId: record.organizationId,
				personId: record.personId,
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

			if (record.workerType === "employee" && record.employeeId !== null) {
				const employeeLink = await assertEmployeeLinkForWorkerMemory(
					{
						organizationId: record.organizationId,
						employeeId: record.employeeId,
					},
					this.findWorkerByEmployeeId.bind(this),
				);
				if (!employeeLink.ok) {
					return employeeLink;
				}
			}

			const idResult = parseHumanResourcesWorkerId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const worker: Worker =
				record.workerType === "employee"
					? {
							id: idResult.data,
							organizationId: record.organizationId,
							personId: record.personId,
							workerType: "employee",
							employeeId: record.employeeId,
							status: record.status,
							effectiveFrom: record.effectiveFrom,
							effectiveTo: record.effectiveTo,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
							createdAt: now,
							updatedAt: now,
						}
					: {
							id: idResult.data,
							organizationId: record.organizationId,
							personId: record.personId,
							workerType: record.workerType,
							employeeId: null,
							status: record.status,
							effectiveFrom: record.effectiveFrom,
							effectiveTo: record.effectiveTo,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
							createdAt: now,
							updatedAt: now,
						};

			const classificationVersion: WorkerClassificationVersion = {
				id: randomUUID(),
				organizationId: record.organizationId,
				workerId: worker.id,
				workerType: worker.workerType,
				employeeId: worker.workerType === "employee" ? worker.employeeId : null,
				workerStatus: worker.status,
				effectiveFrom: worker.effectiveFrom,
				effectiveTo: null,
				supersedesClassificationVersionId: null,
				lineageStatus: "active",
				reasonCode: "initial_record",
				evidenceRef: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.workers.set(worker.id, worker);
			state.workerClassificationVersions.set(
				classificationVersion.id,
				classificationVersion,
			);
			state.workerIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					worker: cloneWorker(worker),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await ports.audit.record({
				organizationId: worker.organizationId,
				actorUserId: worker.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_worker",
				entityId: worker.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.workers.delete(worker.id);
				state.workerClassificationVersions.delete(classificationVersion.id);
				state.workerIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: worker.organizationId,
				actorUserId: worker.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_WORKER_CREATED_EVENT,
				payload: {
					organizationId: worker.organizationId,
					entityType: "hr_worker",
					entityId: worker.id,
					actorId: worker.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.workers.delete(worker.id);
				state.workerClassificationVersions.delete(classificationVersion.id);
				state.workerIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return errorResult.ok(cloneWorker(worker));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async changeWorkerType(inputValue2, ports, meta) {
			const worker = state.workers.get(inputValue2.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== inputValue2.organizationId
			) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const versionCheck = assertExpectedVersion(
				worker.version,
				inputValue2.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openSegment = findOpenWorkerClassificationVersion(
				state,
				inputValue2.organizationId,
				inputValue2.workerId,
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
				effectiveOn: inputValue2.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return effectiveOnCheck;
			}

			if (
				inputValue2.workerType === "employee" &&
				inputValue2.employeeId !== null
			) {
				const employeeLink = await assertEmployeeLinkForWorkerMemory(
					{
						organizationId: inputValue2.organizationId,
						employeeId: inputValue2.employeeId,
						excludingWorkerId: inputValue2.workerId,
					},
					this.findWorkerByEmployeeId.bind(this),
				);
				if (!employeeLink.ok) {
					return employeeLink;
				}
			}

			const nextWorkerType = inputValue2.workerType;
			const nextEmployeeId =
				inputValue2.workerType === "employee" ? inputValue2.employeeId : null;
			if (
				openSegment.workerType === nextWorkerType &&
				openSegment.employeeId === nextEmployeeId
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const now = new Date();
			const closedPredecessor: WorkerClassificationVersion = {
				...openSegment,
				effectiveTo: previousIsoDate(inputValue2.effectiveOn),
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: inputValue2.actorUserId,
				updatedAt: now,
			};
			const successor: WorkerClassificationVersion = {
				id: randomUUID(),
				organizationId: inputValue2.organizationId,
				workerId: inputValue2.workerId,
				workerType: nextWorkerType,
				employeeId: nextEmployeeId,
				workerStatus: openSegment.workerStatus,
				effectiveFrom: inputValue2.effectiveOn,
				effectiveTo: null,
				supersedesClassificationVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: inputValue2.reasonCode,
				evidenceRef: inputValue2.evidenceRef,
				version: 1,
				createdBy: inputValue2.actorUserId,
				updatedBy: inputValue2.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			const updated: Worker =
				inputValue2.workerType === "employee"
					? {
							...(worker as EmployeeWorker),
							workerType: "employee",
							employeeId: inputValue2.employeeId,
							status: openSegment.workerStatus,
							effectiveFrom: inputValue2.effectiveOn,
							version: worker.version + 1,
							updatedBy: inputValue2.actorUserId,
							updatedAt: now,
						}
					: {
							...(worker as NonEmployeeWorker),
							workerType: inputValue2.workerType,
							employeeId: null,
							status: openSegment.workerStatus,
							effectiveFrom: inputValue2.effectiveOn,
							version: worker.version + 1,
							updatedBy: inputValue2.actorUserId,
							updatedAt: now,
						};

			state.workerClassificationVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.workerClassificationVersions.set(successor.id, successor);
			state.workers.set(updated.id, updated);
			return emitWorkerChanged(
				updated,
				worker,
				inputValue2.actorUserId,
				ports,
				meta,
				{ openSegment, successorId: successor.id },
			);
		},

		async changeWorkerStatus(inputValue, ports, meta) {
			const worker = state.workers.get(inputValue.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== inputValue.organizationId
			) {
				return await errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const versionCheck = assertExpectedVersion(
				worker.version,
				inputValue.expectedVersion,
			);
			if (!versionCheck.ok) {
				return await versionCheck;
			}

			const openSegment = findOpenWorkerClassificationVersion(
				state,
				inputValue.organizationId,
				inputValue.workerId,
			);
			if (openSegment === null) {
				return await errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const mutableCheck = assertLineageSegmentMutable(openSegment);
			if (!mutableCheck.ok) {
				return await mutableCheck;
			}

			const effectiveOnCheck = validateLineageSegmentEffectiveOn({
				openEffectiveFrom: openSegment.effectiveFrom,
				effectiveOn: inputValue.effectiveOn,
			});
			if (!effectiveOnCheck.ok) {
				return await effectiveOnCheck;
			}

			if (openSegment.workerStatus === inputValue.status) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const now = new Date();
			const closedPredecessor: WorkerClassificationVersion = {
				...openSegment,
				effectiveTo: previousIsoDate(inputValue.effectiveOn),
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: inputValue.actorUserId,
				updatedAt: now,
			};
			const successor: WorkerClassificationVersion = {
				id: randomUUID(),
				organizationId: inputValue.organizationId,
				workerId: inputValue.workerId,
				workerType: openSegment.workerType,
				employeeId: openSegment.employeeId,
				workerStatus: inputValue.status,
				effectiveFrom: inputValue.effectiveOn,
				effectiveTo: null,
				supersedesClassificationVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: inputValue.reasonCode,
				evidenceRef: inputValue.evidenceRef,
				version: 1,
				createdBy: inputValue.actorUserId,
				updatedBy: inputValue.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			const updated: Worker = {
				...worker,
				status: inputValue.status,
				effectiveFrom: inputValue.effectiveOn,
				version: worker.version + 1,
				updatedBy: inputValue.actorUserId,
				updatedAt: now,
			};

			state.workerClassificationVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.workerClassificationVersions.set(successor.id, successor);
			state.workers.set(updated.id, updated);
			return await emitWorkerChanged(
				updated,
				worker,
				inputValue.actorUserId,
				ports,
				meta,
				{ openSegment, successorId: successor.id },
			);
		},
	};
}
