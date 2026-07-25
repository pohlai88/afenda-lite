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
	PersonIdentityAtAsOf,
	PersonIdentityVersion,
	Worker,
	WorkerClassificationAtAsOf,
	WorkerClassificationVersion,
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

type PersonNameCorrectionInput = {
	organizationId: string;
	personId: HumanResourcesPersonId;
	legalName: string;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef: string | null;
	expectedVersion: number;
	actorUserId: string;
};

type WorkerClassificationChangeBase = {
	organizationId: string;
	workerId: HumanResourcesWorkerId;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef: string | null;
	expectedVersion: number;
	actorUserId: string;
};

export type HumanResourcesWorkforceFoundationStore = {
	getPersonById(input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}): Promise<Result<Person | null>>;

	findPersonAsOf(input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
		asOf: string;
	}): Promise<Result<PersonIdentityAtAsOf | null>>;

	listPersonIdentityVersions(input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}): Promise<Result<readonly PersonIdentityVersion[]>>;

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
		input: PersonNameCorrectionInput,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Person>>;

	getWorkerById(input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
	}): Promise<Result<Worker | null>>;

	findWorkerAsOf(input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
		asOf: string;
	}): Promise<Result<WorkerClassificationAtAsOf | null>>;

	listWorkerClassificationVersions(input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
	}): Promise<Result<readonly WorkerClassificationVersion[]>>;

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
			| (WorkerClassificationChangeBase & {
					workerType: "employee";
					employeeId: HumanResourcesEmployeeId | null;
			  })
			| (WorkerClassificationChangeBase & {
					workerType: NonEmployeeWorkerType;
					employeeId: null;
			  }),
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeWorker | NonEmployeeWorker>>;

	changeWorkerStatus(
		input: WorkerClassificationChangeBase & {
			status: WorkerStatus;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Worker>>;
};
