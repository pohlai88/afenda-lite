import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
import type { HumanResourcesRetentionClassification } from "../privacy";
import type { NonEmployeeWorkerType, WorkerStatus } from "./classification";

type WorkforceFoundationRecord = {
	organizationId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Person = WorkforceFoundationRecord & {
	id: HumanResourcesPersonId;
	legalName: string;
	preferredName: string | null;
	privacyClassification: HumanResourcesRetentionClassification;
};

export const PERSON_CONTACT_TYPES = [
	"email",
	"phone",
	"postal_address",
] as const;

export type PersonContactType = (typeof PERSON_CONTACT_TYPES)[number];

export type PersonContactStatus = "active" | "retired";

export type PersonContact = WorkforceFoundationRecord & {
	id: string;
	personId: HumanResourcesPersonId;
	contactType: PersonContactType;
	valueText: string;
	normalizedValue: string;
	isPrimary: boolean;
	status: PersonContactStatus;
};

export type PersonIdentifierStatus = "active" | "retired";

export type PersonIdentifier = {
	id: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
	identifierType: string;
	identifierFingerprint: string;
	identifierLast4: string;
	documentRef: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: PersonIdentifierStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PersonDuplicateMatchReason =
	| "legal_name"
	| "email"
	| "identifier_fingerprint";

export type PersonDuplicateCandidate = {
	personId: HumanResourcesPersonId;
	matchReasons: readonly PersonDuplicateMatchReason[];
	legalName: string;
	preferredName: string | null;
};

export type LineageSegmentStatus = "active" | "superseded";

export type PersonIdentityVersion = {
	id: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
	legalName: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesIdentityVersionId: string | null;
	lineageStatus: LineageSegmentStatus;
	reasonCode: string;
	evidenceRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PersonIdentityAtAsOf = {
	personId: HumanResourcesPersonId;
	organizationId: string;
	legalName: string;
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	identityVersionId: string;
};

export type WorkerClassificationVersion = {
	id: string;
	organizationId: string;
	workerId: HumanResourcesWorkerId;
	workerType: "employee" | NonEmployeeWorkerType;
	employeeId: HumanResourcesEmployeeId | null;
	workerStatus: WorkerStatus;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesClassificationVersionId: string | null;
	lineageStatus: LineageSegmentStatus;
	reasonCode: string;
	evidenceRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkerClassificationAtAsOf = {
	workerId: HumanResourcesWorkerId;
	organizationId: string;
	personId: HumanResourcesPersonId;
	workerType: "employee" | NonEmployeeWorkerType;
	employeeId: HumanResourcesEmployeeId | null;
	status: WorkerStatus;
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	classificationVersionId: string;
};

type WorkerBase = WorkforceFoundationRecord & {
	id: HumanResourcesWorkerId;
	personId: HumanResourcesPersonId;
	status: WorkerStatus;
	effectiveFrom: string;
	effectiveTo: string | null;
};

export type EmployeeWorker = WorkerBase & {
	workerType: "employee";
	/**
	 * Nullable while the worker exists before the employee specialization is
	 * established. Non-employee worker variants cannot carry an employee ID.
	 */
	employeeId: HumanResourcesEmployeeId | null;
};

export type NonEmployeeWorker = WorkerBase & {
	workerType: NonEmployeeWorkerType;
	employeeId: null;
};

export type Worker = EmployeeWorker | NonEmployeeWorker;

export type EmployeeOrganizationEntry = {
	enteredOn: string;
	employmentId: import("../brands").HumanResourcesEmploymentId;
	orgContext: import("../schemas/org-context").EmployeeOrgContextAsOf | null;
};

/** Composite employee profile for manager / self / HR reads (Slice 5.3). */
export type EmployeeProfile = {
	employeeId: HumanResourcesEmployeeId;
	employeeNumber: string;
	legalName: string;
	employmentStatus:
		| import("../shared/employment-status").EmploymentStatus
		| null;
	employmentId: import("../brands").HumanResourcesEmploymentId | null;
	personId: HumanResourcesPersonId | null;
	personDisplayName: string | null;
	preferredName: string | null;
	workerType: "employee" | NonEmployeeWorkerType | null;
	workerStatus: WorkerStatus | null;
	organizationEntry: EmployeeOrganizationEntry | null;
	personalPhoneNumber: string | null;
	homeAddress: string | null;
	emergencyContacts: readonly PersonContact[] | null;
	contacts: readonly PersonContact[] | null;
	identifiers: readonly PersonIdentifier[] | null;
	ssn: string | null;
	taxId: string | null;
	socialSecurityNumber: string | null;
	identifierLast4: string | null;
	identifierFingerprint: string | null;
	documentRef: string | null;
	bankAccount: string | null;
};
