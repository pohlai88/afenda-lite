import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CREATED_EVENT,
	HUMAN_RESOURCES_WORKER_CHANGED_EVENT,
	HUMAN_RESOURCES_WORKER_CREATED_EVENT,
} from "@afenda/events/schemas";
import {
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
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
	PersonCreateRecord,
	WorkerCreateRecord,
} from "../../store";
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
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

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
			version.organizationId === organizationId && version.workerId === workerId,
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

export type WorkforceFoundationMemoryState = {
	persons: Map<HumanResourcesPersonId, Person>;
	workers: Map<HumanResourcesWorkerId, Worker>;
	personIdentityVersions: Map<string, PersonIdentityVersion>;
	workerClassificationVersions: Map<string, WorkerClassificationVersion>;
	personIdempotencyByKey: Map<string, IdempotentPersonRecord>;
	workerIdempotencyByKey: Map<string, IdempotentWorkerRecord>;
};

export type MemoryWorkforceFoundationMethods = HumanResourcesWorkforceFoundationStore;

export function createWorkforceFoundationMemoryState(): WorkforceFoundationMemoryState {
	return {
		persons: new Map(),
		workers: new Map(),
		personIdentityVersions: new Map(),
		workerClassificationVersions: new Map(),
		personIdempotencyByKey: new Map(),
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
	state.personIdempotencyByKey.clear();
	state.workerIdempotencyByKey.clear();
}

export function createMemoryWorkforceFoundationMethods(input: {
	state: WorkforceFoundationMemoryState;
	core: CoreMemoryState;
}): MemoryWorkforceFoundationMethods {
	const { state, core } = input;

	async function emitWorkerChanged(
		updated: Worker,
		previous: Worker,
		actorUserId: string,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
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
			state.workers.set(previous.id, previous);
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
			state.workers.set(previous.id, previous);
			return outbox;
		}

		return ok(cloneWorker(updated));
	}

	return {
		async getPersonById(query): Promise<Result<Person | null>> {
			const person = state.persons.get(query.personId);
			if (
				person === undefined ||
				person.organizationId !== query.organizationId
			) {
				return ok(null);
			}
			return ok(clonePerson(person));
		},

		async findPersonAsOf(query): Promise<Result<PersonIdentityAtAsOf | null>> {
			const person = state.persons.get(query.personId);
			if (
				person === undefined ||
				person.organizationId !== query.organizationId
			) {
				return ok(null);
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
				return ok([]);
			}
			return ok(
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
				return ok(null);
			}
			return ok({
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
				return ok(clonePerson(existing.data.person));
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

			return ok(clonePerson(person));
		},

		async updatePersonName(input, ports, meta) {
			const person = state.persons.get(input.personId);
			if (
				person === undefined ||
				person.organizationId !== input.organizationId
			) {
				return fail(
					"NOT_FOUND",
					"Person not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				person.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openSegment = findOpenPersonIdentityVersion(
				state,
				input.organizationId,
				input.personId,
			);
			if (openSegment === null) {
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

			const now = new Date();
			const predecessorEnd = previousIsoDate(input.effectiveOn);
			const closedPredecessor: PersonIdentityVersion = {
				...openSegment,
				effectiveTo: predecessorEnd,
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: PersonIdentityVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				personId: input.personId,
				legalName: input.legalName,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesIdentityVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updatedPerson: Person = {
				...person,
				legalName: input.legalName,
				version: person.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.personIdentityVersions.set(closedPredecessor.id, closedPredecessor);
			state.personIdentityVersions.set(successor.id, successor);
			state.persons.set(updatedPerson.id, updatedPerson);

			const audit = await ports.audit.record({
				organizationId: updatedPerson.organizationId,
				actorUserId: input.actorUserId,
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
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
				payload: {
					organizationId: updatedPerson.organizationId,
					entityType: "hr_person",
					entityId: updatedPerson.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.personIdentityVersions.set(openSegment.id, openSegment);
				state.personIdentityVersions.delete(successor.id);
				state.persons.set(person.id, person);
				return outbox;
			}

			return ok(clonePerson(updatedPerson));
		},

		async getWorkerById(query) {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return ok(null);
			}
			return ok(cloneWorker(worker));
		},

		async findWorkerAsOf(query): Promise<Result<WorkerClassificationAtAsOf | null>> {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return ok(null);
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
				return ok([]);
			}
			return ok(
				listWorkerClassificationVersionsForWorker(
					state,
					query.organizationId,
					query.workerId,
				).map(cloneWorkerClassificationVersion),
			);
		},

		async findWorkerByPersonId(query) {
			for (const worker of state.workers.values()) {
				if (
					worker.organizationId === query.organizationId &&
					worker.personId === query.personId
				) {
					return ok(cloneWorker(worker));
				}
			}
			return ok(null);
		},

		async findWorkerByEmployeeId(query) {
			for (const worker of state.workers.values()) {
				if (
					worker.organizationId === query.organizationId &&
					worker.workerType === "employee" &&
					worker.employeeId === query.employeeId
				) {
					return ok(cloneWorker(worker) as EmployeeWorker);
				}
			}
			return ok(null);
		},

		async findWorkerByIdempotencyKey(query) {
			const record = state.workerIdempotencyByKey.get(
				idempotencyMapKey(query.organizationId, query.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				worker: cloneWorker(record.worker),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createWorker(record, ports, meta) {
			const existing = await this.findWorkerByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return ok(cloneWorker(existing.data.worker));
			}

			const person = state.persons.get(record.personId);
			if (
				person === undefined ||
				person.organizationId !== record.organizationId
			) {
				return fail(
					"NOT_FOUND",
					"Person not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const personWorker = await this.findWorkerByPersonId({
				organizationId: record.organizationId,
				personId: record.personId,
			});
			if (!personWorker.ok) {
				return personWorker;
			}
			if (personWorker.data !== null) {
				return fail(
					"CONFLICT",
					"Person is already linked to a worker",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			if (record.workerType === "employee" && record.employeeId !== null) {
				const employee = core.employees.get(record.employeeId);
				if (
					employee === undefined ||
					employee.organizationId !== record.organizationId
				) {
					return fail(
						"NOT_FOUND",
						"Employee not found",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
					);
				}
				const employeeWorker = await this.findWorkerByEmployeeId({
					organizationId: record.organizationId,
					employeeId: record.employeeId,
				});
				if (!employeeWorker.ok) {
					return employeeWorker;
				}
				if (employeeWorker.data !== null) {
					return fail(
						"CONFLICT",
						"Employee is already linked to a worker",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
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

			return ok(cloneWorker(worker));
		},

		async changeWorkerType(input, ports, meta) {
			const worker = state.workers.get(input.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== input.organizationId
			) {
				return fail(
					"NOT_FOUND",
					"Worker not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				worker.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openSegment = findOpenWorkerClassificationVersion(
				state,
				input.organizationId,
				input.workerId,
			);
			if (openSegment === null) {
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

			if (input.workerType === "employee" && input.employeeId !== null) {
				const employee = core.employees.get(input.employeeId);
				if (
					employee === undefined ||
					employee.organizationId !== input.organizationId
				) {
					return fail(
						"NOT_FOUND",
						"Employee not found",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
					);
				}
				const employeeWorker = await this.findWorkerByEmployeeId({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
				});
				if (!employeeWorker.ok) {
					return employeeWorker;
				}
				if (
					employeeWorker.data !== null &&
					employeeWorker.data.id !== input.workerId
				) {
					return fail(
						"CONFLICT",
						"Employee is already linked to a worker",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
			}

			const nextWorkerType = input.workerType;
			const nextEmployeeId =
				input.workerType === "employee" ? input.employeeId : null;
			if (
				openSegment.workerType === nextWorkerType &&
				openSegment.employeeId === nextEmployeeId
			) {
				return fail(
					"CONFLICT",
					"Worker type change must alter classification",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const now = new Date();
			const closedPredecessor: WorkerClassificationVersion = {
				...openSegment,
				effectiveTo: previousIsoDate(input.effectiveOn),
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: WorkerClassificationVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				workerId: input.workerId,
				workerType: nextWorkerType,
				employeeId: nextEmployeeId,
				workerStatus: openSegment.workerStatus,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesClassificationVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			const updated: Worker =
				input.workerType === "employee"
					? {
							...(worker as EmployeeWorker),
							workerType: "employee",
							employeeId: input.employeeId,
							status: openSegment.workerStatus,
							effectiveFrom: input.effectiveOn,
							version: worker.version + 1,
							updatedBy: input.actorUserId,
							updatedAt: now,
						}
					: {
							...(worker as NonEmployeeWorker),
							workerType: input.workerType,
							employeeId: null,
							status: openSegment.workerStatus,
							effectiveFrom: input.effectiveOn,
							version: worker.version + 1,
							updatedBy: input.actorUserId,
							updatedAt: now,
						};

			state.workerClassificationVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.workerClassificationVersions.set(successor.id, successor);
			state.workers.set(updated.id, updated);
			return emitWorkerChanged(updated, worker, input.actorUserId, ports, meta);
		},

		async changeWorkerStatus(input, ports, meta) {
			const worker = state.workers.get(input.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== input.organizationId
			) {
				return fail(
					"NOT_FOUND",
					"Worker not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				worker.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openSegment = findOpenWorkerClassificationVersion(
				state,
				input.organizationId,
				input.workerId,
			);
			if (openSegment === null) {
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

			const now = new Date();
			const closedPredecessor: WorkerClassificationVersion = {
				...openSegment,
				effectiveTo: previousIsoDate(input.effectiveOn),
				lineageStatus: "superseded",
				version: openSegment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const successor: WorkerClassificationVersion = {
				id: randomUUID(),
				organizationId: input.organizationId,
				workerId: input.workerId,
				workerType: openSegment.workerType,
				employeeId: openSegment.employeeId,
				workerStatus: input.status,
				effectiveFrom: input.effectiveOn,
				effectiveTo: null,
				supersedesClassificationVersionId: openSegment.id,
				lineageStatus: "active",
				reasonCode: input.reasonCode,
				evidenceRef: input.evidenceRef,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			const updated: Worker = {
				...worker,
				status: input.status,
				effectiveFrom: input.effectiveOn,
				version: worker.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.workerClassificationVersions.set(
				closedPredecessor.id,
				closedPredecessor,
			);
			state.workerClassificationVersions.set(successor.id, successor);
			state.workers.set(updated.id, updated);
			return emitWorkerChanged(updated, worker, input.actorUserId, ports, meta);
		},
	};
}
