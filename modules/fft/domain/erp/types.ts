/** Feed Farm Trade ERP sync contracts (ADR-004). */

export const FFT_SYNC_JOB_TYPES = [
  "order",
  "deposit_summary",
  "fulfillment_summary",
] as const;

export type FftSyncJobType = (typeof FFT_SYNC_JOB_TYPES)[number];

export const FFT_SYNC_ENTITY_TYPES = [
  "customer",
  "product",
  "supply_line",
  "order",
  "order_line",
  "deposit_summary",
  "fulfillment_summary",
] as const;

export type FftSyncEntityType = (typeof FFT_SYNC_ENTITY_TYPES)[number];

export type FftSyncJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "dead";

export type ErpPushResult =
  | { ok: true; externalId?: string; duplicate?: boolean }
  | { ok: false; code: string; message: string; retryable: boolean };

export type ErpAdapter = {
  systemId: string;
  push(input: {
    jobType: FftSyncJobType;
    entityId: string;
    idempotencyKey: string;
  }): Promise<ErpPushResult>;
};

export type FftSyncJob = {
  id: string;
  jobType: FftSyncJobType;
  entityId: string;
  idempotencyKey: string;
  status: FftSyncJobStatus;
  attemptCount: number;
  scheduledAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FftSyncAttempt = {
  id: string;
  jobId: string;
  attemptNo: number;
  status: "running" | "succeeded" | "failed";
  startedAt: Date;
  finishedAt: Date | null;
};

export type FftSyncError = {
  id: string;
  attemptId: string;
  code: string;
  message: string;
  retryable: boolean;
  createdAt: Date;
};

export type FftSyncJobDetail = FftSyncJob & {
  attempts: Array<FftSyncAttempt & { errors: FftSyncError[] }>;
};

/** JSON-safe DTO for RSC → client (`FftErpSyncPanel`). Dates are ISO-8601. */
export type FftSyncJobDetailDto = {
  id: string;
  jobType: FftSyncJobType;
  entityId: string;
  idempotencyKey: string;
  status: FftSyncJobStatus;
  attemptCount: number;
  scheduledAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  attempts: Array<{
    id: string;
    jobId: string;
    attemptNo: number;
    status: "running" | "succeeded" | "failed";
    startedAt: string;
    finishedAt: string | null;
    errors: Array<{
      id: string;
      attemptId: string;
      code: string;
      message: string;
      retryable: boolean;
      createdAt: string;
    }>;
  }>;
};

export function toFftSyncJobDetailDto(
  job: FftSyncJobDetail,
): FftSyncJobDetailDto {
  return {
    id: job.id,
    jobType: job.jobType,
    entityId: job.entityId,
    idempotencyKey: job.idempotencyKey,
    status: job.status,
    attemptCount: job.attemptCount,
    scheduledAt: job.scheduledAt.toISOString(),
    lastError: job.lastError,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    attempts: job.attempts.map((attempt) => ({
      id: attempt.id,
      jobId: attempt.jobId,
      attemptNo: attempt.attemptNo,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      finishedAt: attempt.finishedAt
        ? attempt.finishedAt.toISOString()
        : null,
      errors: attempt.errors.map((err) => ({
        id: err.id,
        attemptId: err.attemptId,
        code: err.code,
        message: err.message,
        retryable: err.retryable,
        createdAt: err.createdAt.toISOString(),
      })),
    })),
  };
}
