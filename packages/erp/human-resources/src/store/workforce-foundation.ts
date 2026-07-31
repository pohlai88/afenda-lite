import type { Result } from "@afenda/errors";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { HumanResourcesRetentionClassification } from "../privacy";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type {
	NonEmployeeWorkerType,
	WorkerStatus,
} from "../workforce-foundation/classification";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Person,
	PersonContact,
	PersonDuplicateCandidate,
	PersonIdentifier,
	PersonIdentityAtAsOf,
	PersonIdentityVersion,
	Worker,
	WorkerClassificationAtAsOf,
	WorkerClassificationVersion,
} from "../workforce-foundation/types";

export interface PersonCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	legalName: string;
	organizationId: string;
	preferredName: string | null;
	privacyClassification: HumanResourcesRetentionClassification;
}

export interface PersonContactCreateRecord {
	contactType: PersonContact["contactType"];
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	isPrimary: boolean;
	normalizedValue: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
	valueText: string;
}

export interface PersonIdentifierCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	documentRef: string | null;
	effectiveFrom: string;
	identifierFingerprint: string;
	identifierLast4: string;
	identifierType: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
}

export interface IdempotentPersonContactRecord {
	contact: PersonContact;
	createRequestFingerprint: string;
}

export interface IdempotentPersonIdentifierRecord {
	createRequestFingerprint: string;
	identifier: PersonIdentifier;
}

interface WorkerCreateRecordBase {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	organizationId: string;
	personId: HumanResourcesPersonId;
	status: WorkerStatus;
}

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

export interface IdempotentPersonRecord {
	createRequestFingerprint: string;
	person: Person;
}

export interface IdempotentWorkerRecord {
	createRequestFingerprint: string;
	worker: Worker;
}

interface PersonNameCorrectionInput {
	actorUserId: string;
	effectiveOn: string;
	evidenceRef: string | null;
	expectedVersion: number;
	legalName: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
	reasonCode: string;
}

interface WorkerClassificationChangeBase {
	actorUserId: string;
	effectiveOn: string;
	evidenceRef: string | null;
	expectedVersion: number;
	organizationId: string;
	reasonCode: string;
	workerId: HumanResourcesWorkerId;
}

export interface HumanResourcesWorkforceFoundationStore {
	addPersonContact: (
		record: PersonContactCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PersonContact>>;

	addPersonIdentifier: (
		record: PersonIdentifierCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PersonIdentifier>>;

	changeWorkerStatus: (
		input: WorkerClassificationChangeBase & {
			status: WorkerStatus;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Worker>>;

	changeWorkerType: (
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
	) => Promise<Result<EmployeeWorker | NonEmployeeWorker>>;

	createPerson: (
		record: PersonCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Person>>;

	createWorker: (
		record: WorkerCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Worker>>;

	detectPersonDuplicates: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<readonly PersonDuplicateCandidate[]>>;

	findPersonAsOf: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
		asOf: string;
	}) => Promise<Result<PersonIdentityAtAsOf | null>>;

	findPersonByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPersonRecord | null>>;

	findPersonContactByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPersonContactRecord | null>>;

	findPersonIdentifierByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPersonIdentifierRecord | null>>;

	findWorkerAsOf: (input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
		asOf: string;
	}) => Promise<Result<WorkerClassificationAtAsOf | null>>;

	findWorkerByEmployeeId: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<EmployeeWorker | null>>;

	findWorkerByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentWorkerRecord | null>>;

	findWorkerByPersonId: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<Worker | null>>;
	getPersonById: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<Person | null>>;

	getWorkerById: (input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
	}) => Promise<Result<Worker | null>>;

	listPersonContacts: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<readonly PersonContact[]>>;

	listPersonIdentifiers: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<readonly PersonIdentifier[]>>;

	listPersonIdentityVersions: (input: {
		organizationId: string;
		personId: HumanResourcesPersonId;
	}) => Promise<Result<readonly PersonIdentityVersion[]>>;

	listWorkerClassificationVersions: (input: {
		organizationId: string;
		workerId: HumanResourcesWorkerId;
	}) => Promise<Result<readonly WorkerClassificationVersion[]>>;

	retirePersonContact: (
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			contactId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PersonContact>>;

	retirePersonIdentifier: (
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			identifierId: string;
			effectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PersonIdentifier>>;

	setPersonPrivacyClassification: (
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			privacyClassification: HumanResourcesRetentionClassification;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Person>>;

	updatePersonContact: (
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			contactId: string;
			valueText: string;
			normalizedValue: string;
			isPrimary?: boolean | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PersonContact>>;

	updatePersonName: (
		input: PersonNameCorrectionInput,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Person>>;

	updatePersonPreferredName: (
		input: {
			organizationId: string;
			personId: HumanResourcesPersonId;
			preferredName: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Person>>;
}
