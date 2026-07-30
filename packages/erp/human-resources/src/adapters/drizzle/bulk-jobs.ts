import {
	and,
	asc,
	db,
	eq,
	hrBulkExportArtifactChunk,
	hrBulkExportJob,
	hrBulkImportJob,
	hrBulkImportJobRow,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import type {
	HumanResourcesBulkExportJob,
	HumanResourcesBulkImportJob,
	HumanResourcesBulkImportJobRow,
	HumanResourcesBulkJobStatus,
	HumanResourcesBulkJobStore,
} from "../../bulk-jobs/types";
import type { HumanResourcesPermission } from "../../permissions";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";

const statuses = new Set<HumanResourcesBulkJobStatus>([
	"queued",
	"running",
	"completed",
	"completed_with_rejections",
	"failed",
]);
const fieldsSchema = z.array(z.string().trim().min(1)).min(1).max(30);

function mapImport(
	row: typeof hrBulkImportJob.$inferSelect,
): Result<HumanResourcesBulkImportJob> {
	if (!statuses.has(row.status as HumanResourcesBulkJobStatus)) {
		return fail("INTERNAL_ERROR", "Bulk import job status is invalid");
	}
	return ok({
		...row,
		entityType: row.entityType as HumanResourcesBulkImportJob["entityType"],
		requiredPermission: row.requiredPermission as HumanResourcesPermission,
		status: row.status as HumanResourcesBulkJobStatus,
	});
}

function mapExport(
	row: typeof hrBulkExportJob.$inferSelect,
): Result<HumanResourcesBulkExportJob> {
	if (!statuses.has(row.status as HumanResourcesBulkJobStatus)) {
		return fail("INTERNAL_ERROR", "Bulk export job status is invalid");
	}
	const fields = fieldsSchema.safeParse(row.requestedFields);
	if (!fields.success) {
		return fail("INTERNAL_ERROR", "Bulk export fields are invalid");
	}
	return ok({
		...row,
		exportType: row.exportType as HumanResourcesBulkExportJob["exportType"],
		requiredPermission: row.requiredPermission as HumanResourcesPermission,
		requestedFields: fields.data,
		status: row.status as HumanResourcesBulkJobStatus,
	});
}

function workJson(
	workItem: Parameters<
		HumanResourcesBulkJobStore["createImportJob"]
	>[0]["workItem"],
) {
	return JSON.stringify({
		id: workItem.id,
		organization_id: workItem.organizationId,
		connector: workItem.connector,
		operation: workItem.operation,
		target_type: workItem.targetType,
		target_id: workItem.targetId,
		correlation_id: workItem.correlationId,
		idempotency_key: workItem.idempotencyKey,
		request_fingerprint: workItem.requestFingerprint,
		status: workItem.status,
		version: workItem.version,
		attempt_count: workItem.attemptCount,
		next_attempt_at: workItem.nextAttemptAt?.toISOString() ?? null,
		created_at: workItem.createdAt.toISOString(),
		updated_at: workItem.updatedAt.toISOString(),
	});
}

export function createDrizzleHumanResourcesBulkJobStore(): HumanResourcesBulkJobStore {
	return {
		async findImportJob(input) {
			try {
				const [row] = await db
					.select()
					.from(hrBulkImportJob)
					.where(
						and(
							eq(hrBulkImportJob.organizationId, input.organizationId),
							eq(hrBulkImportJob.idempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				return row ? mapImport(row) : ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to find bulk import job");
			}
		},
		async getImportJob(input) {
			try {
				const [row] = await db
					.select()
					.from(hrBulkImportJob)
					.where(
						and(
							eq(hrBulkImportJob.organizationId, input.organizationId),
							eq(hrBulkImportJob.id, input.jobId),
						),
					)
					.limit(1);
				return row ? mapImport(row) : ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to load bulk import job");
			}
		},
		async createImportJob(input) {
			const rowsJson = JSON.stringify(
				input.rows.map((row) => ({
					row_index: row.rowIndex,
					source_reference: row.sourceReference,
					payload: row.payload,
					payload_hash: row.payloadHash,
					created_at: row.createdAt.toISOString(),
				})),
			);
			const work = workJson(input.workItem);
			try {
				const [saved] = await runNeonHttpTransaction<[Array<{ id: string }>]>(
					(sql) => [
						sql`
					WITH inserted_job AS (
						INSERT INTO hr_bulk_import_job (
							id, organization_id, batch_id, entity_type, actor_user_id, correlation_id,
							required_permission, idempotency_key, request_fingerprint, status, version,
							row_count, max_rows_per_run, created_at, updated_at
						) VALUES (
							${input.job.id}, ${input.job.organizationId}, ${input.job.batchId}, ${input.job.entityType},
							${input.job.actorUserId}, ${input.job.correlationId}, ${input.job.requiredPermission},
							${input.job.idempotencyKey}, ${input.job.requestFingerprint}, ${input.job.status},
							${input.job.version}, ${input.job.rowCount}, ${input.job.maxRowsPerRun},
							${input.job.createdAt}, ${input.job.updatedAt}
						) RETURNING id, organization_id
					), inserted_rows AS (
						INSERT INTO hr_bulk_import_job_row (
							organization_id, job_id, row_index, source_reference, payload, payload_hash, created_at
						)
						SELECT inserted_job.organization_id, inserted_job.id, source.row_index,
							source.source_reference, source.payload, source.payload_hash, source.created_at
						FROM inserted_job CROSS JOIN jsonb_to_recordset(${rowsJson}::jsonb)
							AS source(row_index integer, source_reference text, payload jsonb, payload_hash text, created_at timestamptz)
					), inserted_work AS (
						INSERT INTO hr_reliability_work_item (
							id, organization_id, connector, operation, target_type, target_id, correlation_id,
							idempotency_key, request_fingerprint, status, version, attempt_count,
							next_attempt_at, created_at, updated_at
						)
						SELECT work.id, work.organization_id, work.connector, work.operation, work.target_type,
							work.target_id, work.correlation_id, work.idempotency_key, work.request_fingerprint,
							work.status, work.version, work.attempt_count, work.next_attempt_at, work.created_at, work.updated_at
						FROM inserted_job CROSS JOIN jsonb_to_record(${work}::jsonb) AS work(
							id uuid, organization_id text, connector text, operation text, target_type text,
							target_id text, correlation_id text, idempotency_key text, request_fingerprint text,
							status text, version integer, attempt_count integer, next_attempt_at timestamptz,
							created_at timestamptz, updated_at timestamptz
						)
					) SELECT id FROM inserted_job
				`,
					],
				);
				return saved[0]
					? ok(input.job)
					: fail("CONFLICT", "Bulk import job was not created");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? fail("CONFLICT", "Bulk import job already exists")
					: mapPersistenceFailure(error, "Failed to create bulk import job");
			}
		},
		async listImportRows(input) {
			try {
				const rows = await db
					.select()
					.from(hrBulkImportJobRow)
					.where(
						and(
							eq(hrBulkImportJobRow.organizationId, input.organizationId),
							eq(hrBulkImportJobRow.jobId, input.jobId),
						),
					)
					.orderBy(asc(hrBulkImportJobRow.rowIndex));
				return ok(rows satisfies HumanResourcesBulkImportJobRow[]);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to load bulk import rows");
			}
		},
		async commitImportJob(input) {
			const successor = input.successorWorkItem
				? workJson(input.successorWorkItem)
				: null;
			const cleanup = input.cleanupWorkItem
				? workJson(input.cleanupWorkItem)
				: null;
			try {
				const [saved] = await runNeonHttpTransaction<[Array<{ id: string }>]>(
					(sql) => [
						sql`
					WITH updated AS (
						UPDATE hr_bulk_import_job SET status=${input.job.status}, version=${input.job.version},
							checkpoint_version=${input.job.checkpointVersion}, last_error_code=${input.job.lastErrorCode},
							last_error_message=${input.job.lastErrorMessage}, payload_purge_at=${input.job.payloadPurgeAt},
							completed_at=${input.job.completedAt}, updated_at=${input.job.updatedAt}
						WHERE organization_id=${input.job.organizationId} AND id=${input.job.id} AND version=${input.expectedVersion}
						RETURNING id
					), work_source AS (
						SELECT * FROM jsonb_to_recordset(${JSON.stringify([successor, cleanup].filter(Boolean).map((value) => JSON.parse(value ?? "null")))}::jsonb)
						AS work(id uuid, organization_id text, connector text, operation text, target_type text,
							target_id text, correlation_id text, idempotency_key text, request_fingerprint text,
							status text, version integer, attempt_count integer, next_attempt_at timestamptz,
							created_at timestamptz, updated_at timestamptz)
					), inserted_work AS (
						INSERT INTO hr_reliability_work_item (id, organization_id, connector, operation, target_type,
							target_id, correlation_id, idempotency_key, request_fingerprint, status, version,
							attempt_count, next_attempt_at, created_at, updated_at)
						SELECT work_source.* FROM updated CROSS JOIN work_source ON CONFLICT DO NOTHING
					) SELECT id FROM updated
				`,
					],
				);
				return saved[0]
					? ok(input.job)
					: fail("CONFLICT", "Bulk import job version changed");
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to commit bulk import job");
			}
		},
		async purgeImportPayload(input) {
			try {
				await runNeonHttpTransaction((sql) => [
					sql`UPDATE hr_bulk_import_job_row SET payload=NULL WHERE organization_id=${input.organizationId} AND job_id=${input.jobId}`,
					sql`DELETE FROM hr_bulk_import_error_artifact artifact USING hr_bulk_import_checkpoint checkpoint, hr_bulk_import_job job WHERE artifact.organization_id=${input.organizationId} AND job.id=${input.jobId} AND job.organization_id=artifact.organization_id AND checkpoint.organization_id=artifact.organization_id AND checkpoint.id=artifact.checkpoint_id AND checkpoint.idempotency_key=job.idempotency_key`,
					sql`UPDATE hr_bulk_import_job SET payload_purged_at=${input.now}, updated_at=${input.now}, version=version+1 WHERE organization_id=${input.organizationId} AND id=${input.jobId}`,
				]);
				const found = await this.getImportJob(input);
				return found.ok && found.data
					? ok(found.data)
					: fail("NOT_FOUND", "Bulk import job not found");
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to purge bulk import payload",
				);
			}
		},
		async findExportJob(input) {
			try {
				const [row] = await db
					.select()
					.from(hrBulkExportJob)
					.where(
						and(
							eq(hrBulkExportJob.organizationId, input.organizationId),
							eq(hrBulkExportJob.idempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				return row ? mapExport(row) : ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to find bulk export job");
			}
		},
		async getExportJob(input) {
			try {
				const [row] = await db
					.select()
					.from(hrBulkExportJob)
					.where(
						and(
							eq(hrBulkExportJob.organizationId, input.organizationId),
							eq(hrBulkExportJob.id, input.jobId),
						),
					)
					.limit(1);
				return row ? mapExport(row) : ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to load bulk export job");
			}
		},
		async createExportJob(input) {
			const work = workJson(input.workItem);
			try {
				const [saved] = await runNeonHttpTransaction<[Array<{ id: string }>]>(
					(sql) => [
						sql`
					WITH inserted_job AS (
						INSERT INTO hr_bulk_export_job (id, organization_id, actor_user_id, correlation_id,
							required_permission, export_type, requested_fields, date_from, date_to, effective_on,
							idempotency_key, request_fingerprint, status, version, next_page, row_count, created_at, updated_at)
						VALUES (${input.job.id}, ${input.job.organizationId}, ${input.job.actorUserId}, ${input.job.correlationId},
							${input.job.requiredPermission}, ${input.job.exportType}, ${JSON.stringify(input.job.requestedFields)}::jsonb,
							${input.job.dateFrom}, ${input.job.dateTo}, ${input.job.effectiveOn}, ${input.job.idempotencyKey},
							${input.job.requestFingerprint}, ${input.job.status}, ${input.job.version}, ${input.job.nextPage},
							${input.job.rowCount}, ${input.job.createdAt}, ${input.job.updatedAt}) RETURNING id
					), inserted_work AS (
						INSERT INTO hr_reliability_work_item (id, organization_id, connector, operation, target_type, target_id,
							correlation_id, idempotency_key, request_fingerprint, status, version, attempt_count, next_attempt_at, created_at, updated_at)
						SELECT work.* FROM inserted_job CROSS JOIN jsonb_to_record(${work}::jsonb) AS work(id uuid,
							organization_id text, connector text, operation text, target_type text, target_id text,
							correlation_id text, idempotency_key text, request_fingerprint text, status text, version integer,
							attempt_count integer, next_attempt_at timestamptz, created_at timestamptz, updated_at timestamptz)
					) SELECT id FROM inserted_job
				`,
					],
				);
				return saved[0]
					? ok(input.job)
					: fail("CONFLICT", "Bulk export job was not created");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? fail("CONFLICT", "Bulk export job already exists")
					: mapPersistenceFailure(error, "Failed to create bulk export job");
			}
		},
		async completeExportJob(input) {
			const chunks = JSON.stringify(
				input.chunks.map((chunk) => ({
					organization_id: chunk.organizationId,
					job_id: chunk.jobId,
					chunk_index: chunk.chunkIndex,
					content: chunk.content,
					content_sha256: chunk.contentSha256,
					byte_count: chunk.byteCount,
					row_count: chunk.rowCount,
					created_at: chunk.createdAt.toISOString(),
				})),
			);
			const cleanup = workJson(input.cleanupWorkItem);
			try {
				const [saved] = await runNeonHttpTransaction<[Array<{ id: string }>]>(
					(sql) => [
						sql`
					WITH updated AS (
						UPDATE hr_bulk_export_job SET status=${input.job.status}, version=${input.job.version}, next_page=${input.job.nextPage},
							row_count=${input.job.rowCount}, privacy_evidence_id=${input.job.privacyEvidenceId}, artifact_sha256=${input.job.artifactSha256},
							artifact_byte_count=${input.job.artifactByteCount}, artifact_expires_at=${input.job.artifactExpiresAt},
							completed_at=${input.job.completedAt}, updated_at=${input.job.updatedAt}
						WHERE organization_id=${input.job.organizationId} AND id=${input.job.id} AND version=${input.expectedVersion} RETURNING id
					), inserted_chunks AS (
						INSERT INTO hr_bulk_export_artifact_chunk (organization_id, job_id, chunk_index, content, content_sha256, byte_count, row_count, created_at)
						SELECT source.organization_id, source.job_id, source.chunk_index, source.content, source.content_sha256, source.byte_count, source.row_count, source.created_at
						FROM updated CROSS JOIN jsonb_to_recordset(${chunks}::jsonb) AS source(organization_id text, job_id uuid, chunk_index integer, content text, content_sha256 text, byte_count integer, row_count integer, created_at timestamptz)
						ON CONFLICT DO NOTHING
					), inserted_work AS (
						INSERT INTO hr_reliability_work_item (id, organization_id, connector, operation, target_type, target_id, correlation_id, idempotency_key, request_fingerprint, status, version, attempt_count, next_attempt_at, created_at, updated_at)
						SELECT work.* FROM updated CROSS JOIN jsonb_to_record(${cleanup}::jsonb) AS work(id uuid, organization_id text, connector text, operation text, target_type text, target_id text, correlation_id text, idempotency_key text, request_fingerprint text, status text, version integer, attempt_count integer, next_attempt_at timestamptz, created_at timestamptz, updated_at timestamptz)
					) SELECT id FROM updated
				`,
					],
				);
				return saved[0]
					? ok(input.job)
					: fail("CONFLICT", "Bulk export job version changed");
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to complete bulk export job",
				);
			}
		},
		async loadExportArtifact(input) {
			const job = await this.getExportJob(input);
			if (!(job.ok && job.data)) {
				return job.ok ? ok(null) : job;
			}
			try {
				const chunks = await db
					.select()
					.from(hrBulkExportArtifactChunk)
					.where(
						and(
							eq(
								hrBulkExportArtifactChunk.organizationId,
								input.organizationId,
							),
							eq(hrBulkExportArtifactChunk.jobId, input.jobId),
						),
					)
					.orderBy(asc(hrBulkExportArtifactChunk.chunkIndex));
				return ok({
					job: job.data,
					content: chunks.map((chunk) => chunk.content).join(""),
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load bulk export artifact",
				);
			}
		},
		async purgeExportArtifact(input) {
			try {
				await runNeonHttpTransaction((sql) => [
					sql`DELETE FROM hr_bulk_export_artifact_chunk WHERE organization_id=${input.organizationId} AND job_id=${input.jobId}`,
					sql`UPDATE hr_bulk_export_job SET artifact_purged_at=${input.now}, updated_at=${input.now}, version=version+1 WHERE organization_id=${input.organizationId} AND id=${input.jobId}`,
				]);
				const found = await this.getExportJob(input);
				return found.ok && found.data
					? ok(found.data)
					: fail("NOT_FOUND", "Bulk export job not found");
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to purge bulk export artifact",
				);
			}
		},
	};
}
