export const WORKER_TYPES = [
	"employee",
	"contractor",
	"contingent_worker",
	"intern",
] as const;

export type WorkerType = (typeof WORKER_TYPES)[number];

export const NON_EMPLOYEE_WORKER_TYPES = [
	"contractor",
	"contingent_worker",
	"intern",
] as const satisfies readonly Exclude<WorkerType, "employee">[];

export type NonEmployeeWorkerType = (typeof NON_EMPLOYEE_WORKER_TYPES)[number];

export const WORKER_STATUSES = ["active", "inactive", "former"] as const;

export type WorkerStatus = (typeof WORKER_STATUSES)[number];
