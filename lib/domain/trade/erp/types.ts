/** Hot Sales ERP sync contracts (ADR-004). */

export const HOT_SALES_SYNC_JOB_TYPES = [
  "order",
  "deposit_summary",
  "fulfillment_summary",
] as const;

export type HotSalesSyncJobType = (typeof HOT_SALES_SYNC_JOB_TYPES)[number];

export const HOT_SALES_SYNC_ENTITY_TYPES = [
  "customer",
  "product",
  "supply_line",
  "order",
  "order_line",
  "deposit_summary",
  "fulfillment_summary",
] as const;

export type HotSalesSyncEntityType = (typeof HOT_SALES_SYNC_ENTITY_TYPES)[number];

export type HotSalesSyncJobStatus =
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
    jobType: HotSalesSyncJobType;
    entityId: string;
    idempotencyKey: string;
  }): Promise<ErpPushResult>;
};

export type HotSalesSyncJob = {
  id: string;
  jobType: HotSalesSyncJobType;
  entityId: string;
  idempotencyKey: string;
  status: HotSalesSyncJobStatus;
  attemptCount: number;
  scheduledAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HotSalesSyncAttempt = {
  id: string;
  jobId: string;
  attemptNo: number;
  status: "running" | "succeeded" | "failed";
  startedAt: Date;
  finishedAt: Date | null;
};

export type HotSalesSyncError = {
  id: string;
  attemptId: string;
  code: string;
  message: string;
  retryable: boolean;
  createdAt: Date;
};

export type HotSalesSyncJobDetail = HotSalesSyncJob & {
  attempts: Array<HotSalesSyncAttempt & { errors: HotSalesSyncError[] }>;
};
