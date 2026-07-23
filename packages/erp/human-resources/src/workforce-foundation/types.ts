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
