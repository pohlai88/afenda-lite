import type {
	HumanResourcesEmployeeId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
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
