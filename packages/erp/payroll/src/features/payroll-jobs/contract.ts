import type { Result } from "@afenda/errors";

export const PAYROLL_JOB_KINDS = ["calculate-run"] as const;
export type PayrollJobKind = (typeof PAYROLL_JOB_KINDS)[number];

export const PAYROLL_JOB_STATUSES = [
	"queued",
	"running",
	"completed",
	"failed",
	"dead_lettered",
] as const;
export type PayrollJobStatus = (typeof PAYROLL_JOB_STATUSES)[number];

export const PAYROLL_JOB_WORK_STATUSES = [
	"pending",
	"processing",
	"succeeded",
	"dead_lettered",
] as const;
export type PayrollJobWorkStatus = (typeof PAYROLL_JOB_WORK_STATUSES)[number];

export interface PayrollCalculationCheckpoint {
	chunkSize: number;
	employeeIds: readonly string[];
	kind: "calculate-run";
	nextIndex: number;
	processedEmployeeIds: readonly string[];
	runId: string;
}

export interface PayrollJob {
	actorUserId: string;
	checkpoint: PayrollCalculationCheckpoint;
	completedAt: Date | null;
	correlationId: string;
	createdAt: Date;
	id: string;
	idempotencyKey: string;
	kind: PayrollJobKind;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	organizationId: string;
	requestFingerprint: string;
	status: PayrollJobStatus;
	targetRunId: string;
	updatedAt: Date;
	version: number;
}

export interface PayrollJobWorkItem {
	attemptCount: number;
	createdAt: Date;
	id: string;
	idempotencyKey: string;
	jobId: string;
	lastAttemptAt: Date | null;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	leaseExpiresAt: Date | null;
	leaseOwner: string | null;
	nextAttemptAt: Date;
	organizationId: string;
	requestFingerprint: string;
	status: PayrollJobWorkStatus;
	updatedAt: Date;
	version: number;
}

export interface PayrollJobDeadLetter {
	attemptCount: number;
	errorCode: string;
	errorMessage: string;
	failedAt: Date;
	id: string;
	jobId: string;
	organizationId: string;
	replayedByWorkItemId: string | null;
	workItemId: string;
}

export interface PayrollJobChunkExecutorPort {
	executeChunk: (input: {
		actorUserId: string;
		correlationId: string;
		employeeIds: readonly string[];
		organizationId: string;
		runId: string;
	}) => Promise<Result<{ processedEmployeeIds: readonly string[] }>>;
}

export interface PayrollJobEmployeeDirectoryPort {
	listEmployeeIdsForRun: (input: {
		actorUserId: string;
		correlationId: string;
		organizationId: string;
		runId: string;
	}) => Promise<Result<readonly string[]>>;
}
