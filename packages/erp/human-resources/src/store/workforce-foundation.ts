import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type {
	NonEmployeeWorkerType,
	WorkerStatus,
} from "../workforce-foundation/classification";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	Worker,
} from "../workforce-foundation/types";

export type PersonCreateRecord = {
	organizationId: string;
	legalName: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

type WorkerCreateRecordBase = {
	organizationId: string;
	personId: HumanResourcesPersonId;
	status: WorkerStatus;
	effectiveFrom: string;
	effectiveTo: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type EmployeeWorkerCreateRecord = WorkerCreateRecordBase & {
	workerType: "employee";
	employeeId: HumanResourcesEmployeeId | null;
};

export type NonEmployeeWorkerCreateRecord = WorkerCreateRecordBase & {
	workerType: NonEmployeeWorkerType;
	employeeId: null;
};

export type WorkerCreateRecord =
	| EmployeeWorkerCreateRecord
	| NonEmployeeWorkerCreateRecord;

export type IdempotentPersonRecord = {
	person: Person;
	createRequestFingerprint: string;
};

export type IdempotentWorkerRecord = {
	worker: Worker;
	createRequestFingerprint: string;
};

export type HumanResourcesWorkforceFoundationStore = {
	getPersonById(input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}): Promise<Result<Person | null>>;

	findPersonByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPersonRecord | null>>;

	createPerson(
		record: PersonCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Person>>;

	updatePersonName(
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Person>>;

	getWorkerById(input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
	}): Promise<Result<Worker | null>>;

	findWorkerByPersonId(input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}): Promise<Result<Worker | null>>;

	findWorkerByEmployeeId(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<EmployeeWorker | null>>;

	findWorkerByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentWorkerRecord | null>>;

	createWorker(
		record: WorkerCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Worker>>;

	changeWorkerType(
		input:
			| {
					organizationId: string;
					workerId: HumanResourcesWorkerId;
					workerType: "employee";
					employeeId: HumanResourcesEmployeeId | null;
					effectiveOn: string;
					expectedVersion: number;
					actorUserId: string;
			  }
			| {
					organizationId: string;
					workerId: HumanResourcesWorkerId;
					workerType: NonEmployeeWorkerType;
					employeeId: null;
					effectiveOn: string;
					expectedVersion: number;
					actorUserId: string;
			  },
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeWorker | NonEmployeeWorker>>;

	changeWorkerStatus(
		input: {
			organizationId: string;
			workerId: HumanResourcesWorkerId;
			status: WorkerStatus;
			effectiveOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Worker>>;
};
