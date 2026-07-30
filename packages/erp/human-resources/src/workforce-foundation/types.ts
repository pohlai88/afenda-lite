import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
import type { HumanResourcesRetentionClassification } from "../privacy";
import type { NonEmployeeWorkerType, WorkerStatus } from "./classification";

interface WorkforceFoundationRecord {
	createdAt: Date;
	createdBy: string;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

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

export interface PersonIdentifier {
	createdAt: Date;
	createdBy: string;
	documentRef: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: string;
	identifierFingerprint: string;
	identifierLast4: string;
	identifierType: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
	status: PersonIdentifierStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type PersonDuplicateMatchReason =
	| "legal_name"
	| "email"
	| "identifier_fingerprint";

export interface PersonDuplicateCandidate {
	legalName: string;
	matchReasons: readonly PersonDuplicateMatchReason[];
	personId: HumanResourcesPersonId;
	preferredName: string | null;
}

export type LineageSegmentStatus = "active" | "superseded";

export interface PersonIdentityVersion {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceRef: string | null;
	id: string;
	legalName: string;
	lineageStatus: LineageSegmentStatus;
	organizationId: string;
	personId: HumanResourcesPersonId;
	reasonCode: string;
	supersedesIdentityVersionId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PersonIdentityAtAsOf {
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	identityVersionId: string;
	legalName: string;
	organizationId: string;
	personId: HumanResourcesPersonId;
}

export interface WorkerClassificationVersion {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeId: HumanResourcesEmployeeId | null;
	evidenceRef: string | null;
	id: string;
	lineageStatus: LineageSegmentStatus;
	organizationId: string;
	reasonCode: string;
	supersedesClassificationVersionId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workerId: HumanResourcesWorkerId;
	workerStatus: WorkerStatus;
	workerType: "employee" | NonEmployeeWorkerType;
}

export interface WorkerClassificationAtAsOf {
	asOf: string;
	classificationVersionId: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeId: HumanResourcesEmployeeId | null;
	organizationId: string;
	personId: HumanResourcesPersonId;
	status: WorkerStatus;
	workerId: HumanResourcesWorkerId;
	workerType: "employee" | NonEmployeeWorkerType;
}

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

export interface EmployeeOrganizationEntry {
	employmentId: import("../brands").HumanResourcesEmploymentId;
	enteredOn: string;
	orgContext: import("../schemas/org-context").EmployeeOrgContextAsOf | null;
}

/** Composite employee profile for manager / self / HR reads (Slice 5.3). */
export interface EmployeeProfile {
	bankAccount: string | null;
	contacts: readonly PersonContact[] | null;
	documentRef: string | null;
	emergencyContacts: readonly PersonContact[] | null;
	employeeId: HumanResourcesEmployeeId;
	employeeNumber: string;
	employmentId: import("../brands").HumanResourcesEmploymentId | null;
	employmentStatus:
		| import("../shared/employment-status").EmploymentStatus
		| null;
	homeAddress: string | null;
	identifierFingerprint: string | null;
	identifierLast4: string | null;
	identifiers: readonly PersonIdentifier[] | null;
	legalName: string;
	organizationEntry: EmployeeOrganizationEntry | null;
	personalPhoneNumber: string | null;
	personDisplayName: string | null;
	personId: HumanResourcesPersonId | null;
	preferredName: string | null;
	socialSecurityNumber: string | null;
	ssn: string | null;
	taxId: string | null;
	workerStatus: WorkerStatus | null;
	workerType: "employee" | NonEmployeeWorkerType | null;
}
