import {
	database as afendaDatabase,
	and,
	eq,
	payrollJob,
	payrollJobDeadLetter,
	payrollJobWorkItem,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import {
	isPostgresUniqueViolation,
	mapConflict,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type {
	PayrollCalculationCheckpoint,
	PayrollJob,
	PayrollJobDeadLetter,
	PayrollJobKind,
	PayrollJobStatus,
	PayrollJobWorkItem,
	PayrollJobWorkStatus,
} from "./contract";
import type { PayrollJobStore } from "./jobs.store";

const jobKinds = new Set<PayrollJobKind>(["calculate-run"]);
const jobStatuses = new Set<PayrollJobStatus>([
	"queued",
	"running",
	"completed",
	"failed",
	"dead_lettered",
]);
const workStatuses = new Set<PayrollJobWorkStatus>([
	"pending",
	"processing",
	"succeeded",
	"dead_lettered",
]);

const checkpointSchema = z
	.object({
		chunkSize: z.number().int().positive(),
		employeeIds: z.array(z.string().min(1)),
		kind: z.literal("calculate-run"),
		nextIndex: z.number().int().nonnegative(),
		processedEmployeeIds: z.array(z.string().min(1)),
		runId: z.string().uuid(),
	})
	.strict();

function mapCheckpoint(value: unknown): Result<PayrollCalculationCheckpoint> {
	const parsed = checkpointSchema.safeParse(value);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

function mapJob(row: typeof payrollJob.$inferSelect): Result<PayrollJob> {
	if (!jobKinds.has(row.kind as PayrollJobKind)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (!jobStatuses.has(row.status as PayrollJobStatus)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const checkpoint = mapCheckpoint(row.checkpointJson);
	if (!checkpoint.ok) {
		return checkpoint;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		kind: row.kind as PayrollJobKind,
		status: row.status as PayrollJobStatus,
		targetRunId: row.targetRunId,
		actorUserId: row.actorUserId,
		correlationId: row.correlationId,
		idempotencyKey: row.createIdempotencyKey,
		requestFingerprint: row.createRequestFingerprint,
		checkpoint: checkpoint.data,
		lastErrorCode: row.lastErrorCode,
		lastErrorMessage: row.lastErrorMessage,
		completedAt: row.completedAt,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapWorkItem(
	row: typeof payrollJobWorkItem.$inferSelect,
): Result<PayrollJobWorkItem> {
	if (!workStatuses.has(row.status as PayrollJobWorkStatus)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		jobId: row.jobId,
		status: row.status as PayrollJobWorkStatus,
		attemptCount: row.attemptCount,
		nextAttemptAt: row.nextAttemptAt,
		lastAttemptAt: row.lastAttemptAt,
		leaseOwner: row.leaseOwner,
		leaseExpiresAt: row.leaseExpiresAt,
		lastErrorCode: row.lastErrorCode,
		lastErrorMessage: row.lastErrorMessage,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapDeadLetter(
	row: typeof payrollJobDeadLetter.$inferSelect,
): PayrollJobDeadLetter {
	return {
		id: row.id,
		organizationId: row.organizationId,
		jobId: row.jobId,
		workItemId: row.workItemId,
		errorCode: row.errorCode,
		errorMessage: row.errorMessage,
		attemptCount: row.attemptCount,
		failedAt: row.failedAt,
		replayedByWorkItemId: row.replayedByWorkItemId,
	};
}

export const drizzleJobsMethods: PayrollJobStore = {
	async findJobByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollJob)
				.where(
					and(
						eq(payrollJob.organizationId, input.organizationId),
						eq(payrollJob.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapJob(row);
			if (!mapped.ok) {
				return mapped;
			}
			const { data: mappedValue } = mapped;
			return errorResult.ok(mappedValue);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll job");
		}
	},

	async getJob(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollJob)
				.where(
					and(
						eq(payrollJob.organizationId, input.organizationId),
						eq(payrollJob.id, input.jobId),
					),
				)
				.limit(1);
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapJob(row);
			if (!mapped.ok) {
				return mapped;
			}
			const { data: mappedValue } = mapped;
			return errorResult.ok(mappedValue);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll job");
		}
	},

	async getWorkItem(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollJobWorkItem)
				.where(
					and(
						eq(payrollJobWorkItem.organizationId, input.organizationId),
						eq(payrollJobWorkItem.id, input.workItemId),
					),
				)
				.limit(1);
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapWorkItem(row);
			if (!mapped.ok) {
				return mapped;
			}
			const { data: mappedValue } = mapped;
			return errorResult.ok(mappedValue);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll job work item",
			);
		}
	},

	async createJob(input) {
		const { job, workItem } = input;
		try {
			await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					INSERT INTO payroll_job (
						id, organization_id, kind, status, target_run_id, actor_user_id,
						correlation_id, checkpoint_json, last_error_code, last_error_message,
						completed_at, create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by, created_at, updated_at
					) VALUES (
						${job.id}::uuid, ${job.organizationId}, ${job.kind},
						${job.status}, ${job.targetRunId}::uuid, ${job.actorUserId},
						${job.correlationId}, ${JSON.stringify(job.checkpoint)}::jsonb,
						${job.lastErrorCode}, ${job.lastErrorMessage},
						${job.completedAt}, ${job.idempotencyKey},
						${job.requestFingerprint}, ${job.version},
						${job.actorUserId}, ${job.actorUserId},
						${job.createdAt}, ${job.updatedAt}
					)
				`,
				sqlValue`
					INSERT INTO payroll_job_work_item (
						id, organization_id, job_id, status, attempt_count, next_attempt_at,
						last_attempt_at, lease_owner, lease_expires_at, last_error_code,
						last_error_message, idempotency_key, request_fingerprint, version,
						created_at, updated_at
					) VALUES (
						${workItem.id}::uuid, ${workItem.organizationId},
						${workItem.jobId}::uuid, ${workItem.status},
						${workItem.attemptCount}, ${workItem.nextAttemptAt},
						${workItem.lastAttemptAt}, ${workItem.leaseOwner},
						${workItem.leaseExpiresAt}, ${workItem.lastErrorCode},
						${workItem.lastErrorMessage}, ${workItem.idempotencyKey},
						${workItem.requestFingerprint}, ${workItem.version},
						${workItem.createdAt}, ${workItem.updatedAt}
					)
				`,
			]);
			return errorResult.ok(job);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Idempotency key conflict");
			}
			return mapPersistenceFailure(error, "Failed to create payroll job");
		}
	},

	async claimDueWork(input) {
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					UPDATE payroll_job_work_item AS claimed
					SET
						status = 'processing',
						lease_owner = ${input.workerId},
						lease_expires_at = ${input.leaseExpiresAt},
						version = claimed.version + 1,
						updated_at = ${input.now}
					FROM (
						SELECT id
						FROM payroll_job_work_item
						WHERE
							(
								(status = 'pending' AND next_attempt_at <= ${input.now})
								OR (
									status = 'processing'
									AND lease_expires_at IS NOT NULL
									AND lease_expires_at <= ${input.now}
								)
							)
						ORDER BY next_attempt_at ASC, id ASC
						LIMIT ${input.limit}
						FOR UPDATE SKIP LOCKED
					) AS due
					WHERE claimed.id = due.id
					RETURNING claimed.*
				`,
			]);
			const claimed: PayrollJobWorkItem[] = [];
			for (const row of rows) {
				const mapped = mapWorkItem(
					row as typeof payrollJobWorkItem.$inferSelect,
				);
				if (!mapped.ok) {
					return mapped;
				}
				const { data: claimedItem } = mapped;
				claimed.push(claimedItem);
			}
			return errorResult.ok(claimed);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to claim payroll job work");
		}
	},

	async saveJobProgress(input) {
		const {
			deadLetter,
			expectedJobVersion,
			expectedWorkVersion,
			job,
			successorWorkItem: successor,
			workItem,
		} = input;
		try {
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one CTE keeps job, work, successor, and DLQ atomic.
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH job_updated AS (
						UPDATE payroll_job
						SET
							status = ${job.status},
							checkpoint_json = ${JSON.stringify(job.checkpoint)}::jsonb,
							last_error_code = ${job.lastErrorCode},
							last_error_message = ${job.lastErrorMessage},
							completed_at = ${job.completedAt},
							version = ${job.version},
							updated_by = ${job.actorUserId},
							updated_at = ${job.updatedAt}
						WHERE organization_id = ${job.organizationId}
							AND id = ${job.id}::uuid
							AND version = ${expectedJobVersion}
						RETURNING id
					),
					work_updated AS (
						UPDATE payroll_job_work_item
						SET
							status = ${workItem.status},
							attempt_count = ${workItem.attemptCount},
							next_attempt_at = ${workItem.nextAttemptAt},
							last_attempt_at = ${workItem.lastAttemptAt},
							lease_owner = ${workItem.leaseOwner},
							lease_expires_at = ${workItem.leaseExpiresAt},
							last_error_code = ${workItem.lastErrorCode},
							last_error_message = ${workItem.lastErrorMessage},
							version = ${workItem.version},
							updated_at = ${workItem.updatedAt}
						WHERE organization_id = ${workItem.organizationId}
							AND id = ${workItem.id}::uuid
							AND version = ${expectedWorkVersion}
							AND EXISTS (SELECT 1 FROM job_updated)
						RETURNING id
					),
					successor_inserted AS (
						INSERT INTO payroll_job_work_item (
							id, organization_id, job_id, status, attempt_count, next_attempt_at,
							last_attempt_at, lease_owner, lease_expires_at, last_error_code,
							last_error_message, idempotency_key, request_fingerprint, version,
							created_at, updated_at
						)
						SELECT
							${successor?.id ?? null}::uuid,
							${successor?.organizationId ?? null},
							${successor?.jobId ?? null}::uuid,
							${successor?.status ?? null},
							${successor?.attemptCount ?? null},
							${successor?.nextAttemptAt ?? null},
							${successor?.lastAttemptAt ?? null},
							${successor?.leaseOwner ?? null},
							${successor?.leaseExpiresAt ?? null},
							${successor?.lastErrorCode ?? null},
							${successor?.lastErrorMessage ?? null},
							${successor?.idempotencyKey ?? null},
							${successor?.requestFingerprint ?? null},
							${successor?.version ?? null},
							${successor?.createdAt ?? null},
							${successor?.updatedAt ?? null}
						WHERE ${successor !== null}
							AND EXISTS (SELECT 1 FROM work_updated)
						RETURNING id
					),
					dead_letter_upserted AS (
						INSERT INTO payroll_job_dead_letter (
							id, organization_id, job_id, work_item_id, error_code, error_message,
							attempt_count, failed_at, replayed_by_work_item_id
						)
						SELECT
							${deadLetter?.id ?? null}::uuid,
							${deadLetter?.organizationId ?? null},
							${deadLetter?.jobId ?? null}::uuid,
							${deadLetter?.workItemId ?? null}::uuid,
							${deadLetter?.errorCode ?? null},
							${deadLetter?.errorMessage ?? null},
							${deadLetter?.attemptCount ?? null},
							${deadLetter?.failedAt ?? null},
							${deadLetter?.replayedByWorkItemId ?? null}::uuid
						WHERE ${deadLetter !== null}
							AND EXISTS (SELECT 1 FROM work_updated)
						ON CONFLICT (id) DO UPDATE
						SET replayed_by_work_item_id = EXCLUDED.replayed_by_work_item_id
						RETURNING id
					)
					SELECT job_updated.id
					FROM job_updated
					INNER JOIN work_updated ON true
					LEFT JOIN successor_inserted ON true
					LEFT JOIN dead_letter_upserted ON true
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Optimistic concurrency conflict");
			}
			return errorResult.ok(job);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Idempotency key conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to save payroll job progress",
			);
		}
	},

	async listDeadLetters(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollJobDeadLetter)
				.where(
					and(
						eq(payrollJobDeadLetter.organizationId, input.organizationId),
						input.jobId === undefined
							? sql`true`
							: eq(payrollJobDeadLetter.jobId, input.jobId),
					),
				);
			return errorResult.ok(rows.map(mapDeadLetter));
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll job dead letters",
			);
		}
	},

	async getDeadLetter(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollJobDeadLetter)
				.where(
					and(
						eq(payrollJobDeadLetter.organizationId, input.organizationId),
						eq(payrollJobDeadLetter.id, input.deadLetterId),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapDeadLetter(row));
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll job dead letter",
			);
		}
	},
};
