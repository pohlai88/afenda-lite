import "server-only";

import { pool } from "@/lib/db";
import { noopErpAdapter } from "@/lib/domain/trade/erp/generic-noop";
import { resolveErpAdapter } from "@/lib/domain/trade/erp/registry";
import type {
  ErpAdapter,
  HotSalesSyncAttempt,
  HotSalesSyncError,
  HotSalesSyncJob,
  HotSalesSyncJobDetail,
  HotSalesSyncJobType,
} from "@/lib/domain/trade/erp/types";
import { isHotSalesErpSyncEnabled } from "@/lib/env/accessors";

const MAX_SYNC_ATTEMPTS = 5;

function mapJobRow(row: Record<string, unknown>): HotSalesSyncJob {
  return {
    id: String(row.id),
    jobType: String(row.job_type) as HotSalesSyncJobType,
    entityId: String(row.entity_id),
    idempotencyKey: String(row.idempotency_key),
    status: String(row.status) as HotSalesSyncJob["status"],
    attemptCount: Number(row.attempt_count),
    scheduledAt: new Date(String(row.scheduled_at)),
    lastError: row.last_error != null ? String(row.last_error) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export function buildSyncIdempotencyKey(
  jobType: HotSalesSyncJobType,
  entityId: string,
  version = "v1",
): string {
  return `sync:${jobType}:${entityId}:${version}`;
}

export async function enqueueErpSyncJob(input: {
  jobType: HotSalesSyncJobType;
  entityId: string;
  actorId?: string;
  version?: string;
}): Promise<HotSalesSyncJob | null> {
  if (!isHotSalesErpSyncEnabled()) return null;

  const idempotencyKey = buildSyncIdempotencyKey(
    input.jobType,
    input.entityId,
    input.version,
  );

  const result = await pool.query(
    `INSERT INTO hot_sales_sync_job
      (job_type, entity_id, idempotency_key, status, created_by)
     VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [input.jobType, input.entityId, idempotencyKey, input.actorId ?? null],
  );

  if (result.rows.length === 0) {
    const existing = await pool.query(
      `SELECT * FROM hot_sales_sync_job WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    return existing.rows[0] ? mapJobRow(existing.rows[0]) : null;
  }
  return mapJobRow(result.rows[0]);
}

export async function listSyncJobs(limit = 50): Promise<HotSalesSyncJob[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_sync_job ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapJobRow);
}

export async function listPendingSyncJobs(limit = 20): Promise<HotSalesSyncJob[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_sync_job
     WHERE status IN ('pending', 'failed') AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapJobRow);
}

export async function getSyncJobById(jobId: string): Promise<HotSalesSyncJob | null> {
  const result = await pool.query(`SELECT * FROM hot_sales_sync_job WHERE id = $1`, [jobId]);
  return result.rows[0] ? mapJobRow(result.rows[0]) : null;
}

export async function getSyncJobDetail(jobId: string): Promise<HotSalesSyncJobDetail | null> {
  const job = await getSyncJobById(jobId);
  if (!job) return null;

  const attemptsResult = await pool.query(
    `SELECT * FROM hot_sales_sync_attempt WHERE job_id = $1 ORDER BY attempt_no ASC`,
    [jobId],
  );

  const attempts: HotSalesSyncJobDetail["attempts"] = [];
  for (const row of attemptsResult.rows) {
    const attempt: HotSalesSyncAttempt = {
      id: String(row.id),
      jobId: String(row.job_id),
      attemptNo: Number(row.attempt_no),
      status: String(row.status) as HotSalesSyncAttempt["status"],
      startedAt: new Date(String(row.started_at)),
      finishedAt: row.finished_at ? new Date(String(row.finished_at)) : null,
    };
    const errorsResult = await pool.query(
      `SELECT * FROM hot_sales_sync_error WHERE attempt_id = $1 ORDER BY created_at ASC`,
      [attempt.id],
    );
    const errors: HotSalesSyncError[] = errorsResult.rows.map((err) => ({
      id: String(err.id),
      attemptId: String(err.attempt_id),
      code: String(err.code),
      message: String(err.message),
      retryable: Boolean(err.retryable),
      createdAt: new Date(String(err.created_at)),
    }));
    attempts.push({ ...attempt, errors });
  }

  return { ...job, attempts };
}

export async function listSyncJobsWithDetails(
  limit = 50,
): Promise<HotSalesSyncJobDetail[]> {
  const jobs = await listSyncJobs(limit);
  const details = await Promise.all(
    jobs.map(async (job) => {
      if (job.status === "succeeded" && job.attemptCount <= 1) {
        return { ...job, attempts: [] };
      }
      return (await getSyncJobDetail(job.id)) ?? { ...job, attempts: [] };
    }),
  );
  return details;
}

export async function retrySyncJob(jobId: string): Promise<HotSalesSyncJob | null> {
  const result = await pool.query(
    `UPDATE hot_sales_sync_job
     SET status = 'pending', scheduled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status IN ('failed', 'dead')
     RETURNING *`,
    [jobId],
  );
  return result.rows[0] ? mapJobRow(result.rows[0]) : null;
}

async function recordAttempt(input: {
  jobId: string;
  attemptNo: number;
  status: "running" | "succeeded" | "failed";
  providerResponse?: Record<string, unknown>;
}) {
  const result = await pool.query(
    `INSERT INTO hot_sales_sync_attempt (job_id, attempt_no, status, finished_at, provider_response)
     VALUES ($1, $2, $3, CASE WHEN $3 = 'running' THEN NULL ELSE NOW() END, $4::jsonb)
     RETURNING id`,
    [
      input.jobId,
      input.attemptNo,
      input.status,
      input.providerResponse ? JSON.stringify(input.providerResponse) : null,
    ],
  );
  return String(result.rows[0].id);
}

async function recordSyncError(input: {
  attemptId: string;
  code: string;
  message: string;
  retryable: boolean;
}) {
  await pool.query(
    `INSERT INTO hot_sales_sync_error (attempt_id, code, message, retryable)
     VALUES ($1, $2, $3, $4)`,
    [input.attemptId, input.code, input.message, input.retryable],
  );
}

export async function processSyncJob(
  job: HotSalesSyncJob,
  adapter: ErpAdapter = noopErpAdapter,
): Promise<{ ok: boolean }> {
  const attemptNo = job.attemptCount + 1;
  await pool.query(
    `UPDATE hot_sales_sync_job SET status = 'running', attempt_count = $2, updated_at = NOW() WHERE id = $1`,
    [job.id, attemptNo],
  );

  const attemptId = await recordAttempt({
    jobId: job.id,
    attemptNo,
    status: "running",
  });

  const result = await adapter.push({
    jobType: job.jobType,
    entityId: job.entityId,
    idempotencyKey: job.idempotencyKey,
  });

  if (result.ok) {
    await recordAttempt({
      jobId: job.id,
      attemptNo,
      status: "succeeded",
      providerResponse: { externalId: result.externalId, duplicate: result.duplicate },
    });
    if (result.externalId) {
      await pool.query(
        `INSERT INTO hot_sales_external_mapping
          (entity_type, local_id, external_system, external_id, last_synced_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (entity_type, local_id, external_system)
         DO UPDATE SET external_id = EXCLUDED.external_id, last_synced_at = NOW(), updated_at = NOW()`,
        [job.jobType, job.entityId, adapter.systemId, result.externalId],
      );
    }
    await pool.query(
      `UPDATE hot_sales_sync_job SET status = 'succeeded', last_error = NULL, updated_at = NOW() WHERE id = $1`,
      [job.id],
    );
    return { ok: true };
  }

  await recordSyncError({
    attemptId,
    code: result.code,
    message: result.message,
    retryable: result.retryable,
  });
  await recordAttempt({
    jobId: job.id,
    attemptNo,
    status: "failed",
    providerResponse: { code: result.code, message: result.message },
  });

  const nextStatus =
    attemptNo >= MAX_SYNC_ATTEMPTS || !result.retryable ? "dead" : "failed";
  await pool.query(
    `UPDATE hot_sales_sync_job
     SET status = $2, last_error = $3, scheduled_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
     WHERE id = $1`,
    [job.id, nextStatus, result.message],
  );
  return { ok: false };
}

export async function processPendingSyncJobs(
  adapter?: ErpAdapter,
  limit = 20,
): Promise<{ processed: number; succeeded: number }> {
  if (!isHotSalesErpSyncEnabled()) {
    return { processed: 0, succeeded: 0 };
  }

  const resolvedAdapter = adapter ?? resolveErpAdapter();
  const jobs = await listPendingSyncJobs(limit);
  let succeeded = 0;
  for (const job of jobs) {
    const outcome = await processSyncJob(job, resolvedAdapter);
    if (outcome.ok) succeeded += 1;
  }
  return { processed: jobs.length, succeeded };
}
