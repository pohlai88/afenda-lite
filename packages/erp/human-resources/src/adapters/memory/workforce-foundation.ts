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
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import type {
	HumanResourcesWorkforceFoundationStore,
	IdempotentPersonRecord,
	IdempotentWorkerRecord,
	PersonCreateRecord,
	WorkerCreateRecord,
} from "../../store";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	Worker,
} from "../../workforce-foundation/types";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

function clonePerson(person: Person): Person {
	return { ...person };
}

function cloneWorker(worker: Worker): Worker {
	return { ...worker };
}

export type WorkforceFoundationMemoryState = {
	persons: Map<HumanResourcesPersonId, Person>;
	workers: Map<HumanResourcesWorkerId, Worker>;
	personIdempotencyByKey: Map<string, IdempotentPersonRecord>;
	workerIdempotencyByKey: Map<string, IdempotentWorkerRecord>;
};

export type MemoryWorkforceFoundationMethods = Pick<
	HumanResourcesWorkforceFoundationStore,
	| "getPersonById"
	| "findPersonByIdempotencyKey"
	| "createPerson"
	| "updatePersonName"
	| "getWorkerById"
	| "findWorkerByPersonId"
	| "findWorkerByEmployeeId"
	| "findWorkerByIdempotencyKey"
	| "createWorker"
	| "changeWorkerType"
	| "changeWorkerStatus"
>;

export function createWorkforceFoundationMemoryState(): WorkforceFoundationMemoryState {
	return {
		persons: new Map(),
		workers: new Map(),
		personIdempotencyByKey: new Map(),
		workerIdempotencyByKey: new Map(),
	};
}

export function resetWorkforceFoundationMemoryState(
	state: WorkforceFoundationMemoryState,
): void {
	state.persons.clear();
	state.workers.clear();
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

		async findPersonByIdempotencyKey(
			query,
		): Promise<Result<IdempotentPersonRecord | null>> {
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

		async createPerson(
			record: PersonCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Person>> {
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

			state.persons.set(person.id, person);
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
				state.personIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return ok(clonePerson(person));
		},

		async updatePersonName(input, ports, meta): Promise<Result<Person>> {
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

			const now = new Date();
			const updated: Person = {
				...person,
				legalName: input.legalName,
				version: person.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.persons.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_person",
				entityId: updated.id,
				action: "UPDATE",
				changes: [
					{
						field: "legalName",
						oldValue: person.legalName,
						newValue: updated.legalName,
					},
				],
			});
			if (!audit.ok) {
				state.persons.set(person.id, person);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_person",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.persons.set(person.id, person);
				return outbox;
			}

			return ok(clonePerson(updated));
		},

		async getWorkerById(query): Promise<Result<Worker | null>> {
			const worker = state.workers.get(query.workerId);
			if (
				worker === undefined ||
				worker.organizationId !== query.organizationId
			) {
				return ok(null);
			}
			return ok(cloneWorker(worker));
		},

		async findWorkerByPersonId(query): Promise<Result<Worker | null>> {
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

		async findWorkerByEmployeeId(
			query,
		): Promise<Result<EmployeeWorker | null>> {
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

		async findWorkerByIdempotencyKey(
			query,
		): Promise<Result<IdempotentWorkerRecord | null>> {
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

		async createWorker(
			record: WorkerCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Worker>> {
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

			state.workers.set(worker.id, worker);
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
				state.workerIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return ok(cloneWorker(worker));
		},

		async changeWorkerType(
			input,
			ports,
			meta,
		): Promise<Result<EmployeeWorker | NonEmployeeWorker>> {
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

			const now = new Date();
			const updated: Worker =
				input.workerType === "employee"
					? {
							...(worker as EmployeeWorker),
							workerType: "employee",
							employeeId: input.employeeId,
							effectiveFrom: input.effectiveOn,
							version: worker.version + 1,
							updatedBy: input.actorUserId,
							updatedAt: now,
						}
					: {
							...(worker as NonEmployeeWorker),
							workerType: input.workerType,
							employeeId: null,
							effectiveFrom: input.effectiveOn,
							version: worker.version + 1,
							updatedBy: input.actorUserId,
							updatedAt: now,
						};

			state.workers.set(updated.id, updated);
			return emitWorkerChanged(updated, worker, input.actorUserId, ports, meta);
		},

		async changeWorkerStatus(input, ports, meta): Promise<Result<Worker>> {
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

			const now = new Date();
			const updated: Worker = {
				...worker,
				status: input.status,
				effectiveFrom: input.effectiveOn,
				version: worker.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.workers.set(updated.id, updated);
			return emitWorkerChanged(updated, worker, input.actorUserId, ports, meta);
		},
	};
}
