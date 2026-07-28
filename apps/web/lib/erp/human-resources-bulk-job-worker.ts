import { createHash } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	assignmentBulkRowSchema,
	attendanceBulkRowSchema,
	compensationBulkRowSchema,
	createBulkReliabilityWorkItem,
	createHumanResourcesBulkExportArtifactChunk,
	createHumanResourcesBulkExportCsv,
	EXPORT_ARTIFACT_RETENTION_MS,
	employeeBulkRowSchema,
	type HumanResourcesBulkImportJob,
	importPayloadPurgeAt,
	learningAssignmentBulkRowSchema,
	leaveEntitlementBulkRowSchema,
	type ReliabilityExecutionOutcome,
	type ReliabilityWorkItem,
} from "@afenda/human-resources";
import { createDrizzleHumanResourcesBulkJobStore } from "@afenda/human-resources/adapters/drizzle";
import type { z } from "zod";

import { createHumanResourcesAuthorizationPort } from "@/lib/erp/human-resources-authorization-port";
import { runHumanResourcesBulkExportWorker } from "@/lib/erp/human-resources-bulk-export-worker";
import {
	runAssignmentBulkImportWorker,
	runAttendanceBulkImportWorker,
	runCompensationBulkImportWorker,
	runEmployeeBulkImportWorker,
	runLearningAssignmentBulkImportWorker,
	runLeaveEntitlementBulkImportWorker,
} from "@/lib/erp/human-resources-reporting-bulk-worker";

const store = () => createDrizzleHumanResourcesBulkJobStore();

function parseRows<Row>(
	rows: readonly { sourceReference: string; payload: unknown }[],
	schema: z.ZodType<Row>,
): Result<Array<{ sourceReference: string; payload: Row }>> {
	const parsed: Array<{ sourceReference: string; payload: Row }> = [];
	for (const row of rows) {
		const payload = schema.safeParse(row.payload);
		if (!payload.success)
			return fail("INTERNAL_ERROR", "Persisted bulk import payload is invalid");
		parsed.push({
			sourceReference: row.sourceReference,
			payload: payload.data,
		});
	}
	return ok(parsed);
}

async function runImport(
	job: HumanResourcesBulkImportJob,
	rows: readonly { sourceReference: string; payload: unknown }[],
) {
	const common = {
		organizationId: job.organizationId,
		actorUserId: job.actorUserId,
		correlationId: job.correlationId,
		batchId: job.batchId,
		mode: "commit" as const,
		idempotencyKey: job.idempotencyKey,
		maxRowsPerRun: job.maxRowsPerRun,
		...(job.checkpointVersion === null
			? {}
			: { expectedCheckpointVersion: job.checkpointVersion }),
	};
	switch (job.entityType) {
		case "employee": {
			const parsed = parseRows(rows, employeeBulkRowSchema);
			return parsed.ok
				? runEmployeeBulkImportWorker({
						...common,
						entityType: "employee",
						rows: parsed.data,
					})
				: parsed;
		}
		case "assignment": {
			const parsed = parseRows(rows, assignmentBulkRowSchema);
			return parsed.ok
				? runAssignmentBulkImportWorker({
						...common,
						entityType: "assignment",
						rows: parsed.data,
					})
				: parsed;
		}
		case "leave_entitlement": {
			const parsed = parseRows(rows, leaveEntitlementBulkRowSchema);
			return parsed.ok
				? runLeaveEntitlementBulkImportWorker({
						...common,
						entityType: "leave_entitlement",
						rows: parsed.data,
					})
				: parsed;
		}
		case "attendance": {
			const parsed = parseRows(rows, attendanceBulkRowSchema);
			return parsed.ok
				? runAttendanceBulkImportWorker({
						...common,
						entityType: "attendance",
						rows: parsed.data,
					})
				: parsed;
		}
		case "compensation": {
			const parsed = parseRows(rows, compensationBulkRowSchema);
			return parsed.ok
				? runCompensationBulkImportWorker({
						...common,
						entityType: "compensation",
						rows: parsed.data,
					})
				: parsed;
		}
		case "learning_assignment": {
			const parsed = parseRows(rows, learningAssignmentBulkRowSchema);
			return parsed.ok
				? runLearningAssignmentBulkImportWorker({
						...common,
						entityType: "learning_assignment",
						rows: parsed.data,
					})
				: parsed;
		}
	}
}

export async function processHumanResourcesBulkImportJob(
	item: ReliabilityWorkItem,
): Promise<Result<ReliabilityExecutionOutcome>> {
	const jobs = store();
	const found = await jobs.getImportJob({
		organizationId: item.organizationId,
		jobId: item.targetId,
	});
	if (!found.ok) return found;
	if (!found.data) return fail("NOT_FOUND", "Bulk import job not found");
	const job = found.data;
	if (job.status === "completed" || job.status === "completed_with_rejections")
		return ok({
			kind: "acknowledged",
			receiptId: `bulk-import:${job.id}:${job.version}`,
		});
	if (job.payloadPurgedAt !== null)
		return fail("CONFLICT", "Bulk import payload has expired");
	const allowed = await createHumanResourcesAuthorizationPort().can({
		organizationId: job.organizationId,
		actorUserId: job.actorUserId,
		permission: job.requiredPermission,
	});
	if (!allowed) return fail("FORBIDDEN", "Bulk import permission was revoked");
	const loadedRows = await jobs.listImportRows({
		organizationId: job.organizationId,
		jobId: job.id,
	});
	if (!loadedRows.ok) return loadedRows;
	if (
		loadedRows.data.length !== job.rowCount ||
		loadedRows.data.some((row) => row.payload === null)
	)
		return fail("INTERNAL_ERROR", "Bulk import source rows are incomplete");
	const result = await runImport(job, loadedRows.data);
	if (!result.ok) return result;
	const now = new Date();
	if (result.data.status === "retryable_failed") {
		const committed = await jobs.commitImportJob({
			expectedVersion: job.version,
			job: {
				...job,
				status: "running",
				version: job.version + 1,
				checkpointVersion: result.data.checkpointVersion,
				lastErrorCode:
					result.data.retryableFailure?.code ?? "SERVICE_UNAVAILABLE",
				lastErrorMessage:
					result.data.retryableFailure?.message ?? "Bulk import retry required",
				updatedAt: now,
			},
			successorWorkItem: null,
			cleanupWorkItem: null,
		});
		return committed.ok
			? fail("SERVICE_UNAVAILABLE", "Bulk import row execution requires retry")
			: committed;
	}
	const terminal =
		result.data.status === "completed" ||
		result.data.status === "completed_with_rejections";
	const successor = terminal
		? null
		: createBulkReliabilityWorkItem({
				organizationId: job.organizationId,
				operation: "resume-import",
				targetType: "bulk_import_job",
				targetId: job.id,
				correlationId: job.correlationId,
				idempotencyKey: `bulk-import:${job.id}:${result.data.checkpointVersion ?? job.version}`,
				requestFingerprint: job.requestFingerprint,
				now,
			});
	const purgeAt = terminal ? importPayloadPurgeAt(now) : null;
	const cleanup = purgeAt
		? createBulkReliabilityWorkItem({
				organizationId: job.organizationId,
				operation: "purge-import",
				targetType: "bulk_import_job",
				targetId: job.id,
				correlationId: job.correlationId,
				idempotencyKey: `bulk-import:${job.id}:purge`,
				requestFingerprint: job.requestFingerprint,
				now,
				nextAttemptAt: purgeAt,
			})
		: null;
	const committed = await jobs.commitImportJob({
		expectedVersion: job.version,
		job: {
			...job,
			status: terminal ? result.data.status : "running",
			version: job.version + 1,
			checkpointVersion: result.data.checkpointVersion,
			lastErrorCode: null,
			lastErrorMessage: null,
			payloadPurgeAt: purgeAt,
			completedAt: terminal ? now : null,
			updatedAt: now,
		},
		successorWorkItem: successor,
		cleanupWorkItem: cleanup,
	});
	return committed.ok
		? ok({
				kind: "acknowledged",
				receiptId: `bulk-import:${job.id}:${committed.data.version}`,
			})
		: committed;
}

export async function processHumanResourcesBulkExportJob(
	item: ReliabilityWorkItem,
): Promise<Result<ReliabilityExecutionOutcome>> {
	const jobs = store();
	const found = await jobs.getExportJob({
		organizationId: item.organizationId,
		jobId: item.targetId,
	});
	if (!found.ok) return found;
	if (!found.data) return fail("NOT_FOUND", "Bulk export job not found");
	const job = found.data;
	if (job.status === "completed")
		return ok({
			kind: "acknowledged",
			receiptId: `bulk-export:${job.id}:${job.version}`,
		});
	const allowed = await createHumanResourcesAuthorizationPort().can({
		organizationId: job.organizationId,
		actorUserId: job.actorUserId,
		permission: job.requiredPermission,
	});
	if (!allowed) return fail("FORBIDDEN", "Bulk export permission was revoked");
	const exported = await runHumanResourcesBulkExportWorker({
		organizationId: job.organizationId,
		actorUserId: job.actorUserId,
		correlationId: job.correlationId,
		exportType: job.exportType,
		requestedFields: job.requestedFields,
		...(job.dateFrom ? { dateFrom: job.dateFrom } : {}),
		...(job.dateTo ? { dateTo: job.dateTo } : {}),
		...(job.effectiveOn ? { effectiveOn: job.effectiveOn } : {}),
	});
	if (!exported.ok) return exported;
	const now = new Date();
	const csv = createHumanResourcesBulkExportCsv(
		exported.data.fields,
		exported.data.rows,
	);
	const chunks = createHumanResourcesBulkExportArtifactChunk({
		organizationId: job.organizationId,
		jobId: job.id,
		fields: exported.data.fields,
		rows: exported.data.rows,
		createdAt: now,
	});
	const expiresAt = new Date(now.getTime() + EXPORT_ARTIFACT_RETENTION_MS);
	const cleanup = createBulkReliabilityWorkItem({
		organizationId: job.organizationId,
		operation: "purge-export",
		targetType: "bulk_export_job",
		targetId: job.id,
		correlationId: job.correlationId,
		idempotencyKey: `bulk-export:${job.id}:purge`,
		requestFingerprint: job.requestFingerprint,
		now,
		nextAttemptAt: expiresAt,
	});
	const committed = await jobs.completeExportJob({
		expectedVersion: job.version,
		job: {
			...job,
			status: "completed",
			version: job.version + 1,
			rowCount: exported.data.rows.length,
			privacyEvidenceId: exported.data.privacyEvidenceId,
			artifactSha256: createHash("sha256").update(csv).digest("hex"),
			artifactByteCount: Buffer.byteLength(csv),
			artifactExpiresAt: expiresAt,
			completedAt: now,
			updatedAt: now,
		},
		chunks,
		cleanupWorkItem: cleanup,
	});
	return committed.ok
		? ok({
				kind: "acknowledged",
				receiptId: `bulk-export:${job.id}:${committed.data.version}`,
			})
		: committed;
}

export async function purgeHumanResourcesBulkJob(
	item: ReliabilityWorkItem,
): Promise<Result<ReliabilityExecutionOutcome>> {
	const jobs = store();
	const now = new Date();
	const purged =
		item.operation === "purge-import"
			? await jobs.purgeImportPayload({
					organizationId: item.organizationId,
					jobId: item.targetId,
					now,
				})
			: await jobs.purgeExportArtifact({
					organizationId: item.organizationId,
					jobId: item.targetId,
					now,
				});
	return purged.ok
		? ok({
				kind: "acknowledged",
				receiptId: `bulk-purge:${item.targetId}:${purged.data.version}`,
			})
		: purged;
}
