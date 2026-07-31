import {
	and,
	asc,
	db,
	desc,
	eq,
	hrBulkImportAudit,
	hrBulkImportCheckpoint,
	hrBulkImportErrorArtifact,
	type NeonHttpSql,
	runNeonHttpTransaction,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import { renderBulkErrorFile } from "../../bulk/error-file";
import type {
	BulkAuditEvent,
	BulkCheckpoint,
	BulkCheckpointPort,
	BulkErrorArtifact,
} from "../../bulk/types";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";

const issueSchema = z.object({
	code: z.string(),
	message: z.string(),
	field: z.string().optional(),
	disposition: z.enum(["retryable", "terminal"]),
});
const outcomeSchema = z.discriminatedUnion("status", [
	z.object({
		rowIndex: z.number().int().nonnegative(),
		sourceReference: z.string(),
		status: z.literal("accepted"),
		output: z.unknown().optional(),
	}),
	z.object({
		rowIndex: z.number().int().nonnegative(),
		sourceReference: z.string(),
		status: z.literal("rejected"),
		issues: z.array(issueSchema),
	}),
]);
const auditEventSchema = z.object({
	sequence: z.number().int().positive(),
	event: z.enum([
		"BATCH_STARTED",
		"ROW_ACCEPTED",
		"ROW_REJECTED",
		"BATCH_CHECKPOINTED",
		"BATCH_COMPLETED",
		"BATCH_RETRYABLE_FAILED",
	]),
	rowIndex: z.number().int().nonnegative().nullable(),
});
const checkpointSchema = z.object({
	organizationId: z.string(),
	batchId: z.string(),
	entityType: z.enum([
		"employee",
		"assignment",
		"leave_entitlement",
		"attendance",
		"compensation",
		"learning_assignment",
	]),
	idempotencyKey: z.string(),
	requestFingerprint: z.string().length(64),
	status: z.enum([
		"checkpointed",
		"completed",
		"completed_with_rejections",
		"retryable_failed",
	]),
	nextRowIndex: z.number().int().nonnegative(),
	version: z.number().int().positive(),
	rows: z.array(outcomeSchema),
	retryableFailure: issueSchema
		.extend({
			rowIndex: z.number().int().nonnegative(),
			sourceReference: z.string(),
		})
		.nullable(),
	auditTrail: z.array(auditEventSchema),
});

type CheckpointRow = typeof hrBulkImportCheckpoint.$inferSelect;

async function loadAuditTrail(input: {
	organizationId: string;
	checkpointId: string;
}): Promise<Result<BulkAuditEvent[]>> {
	try {
		const rows = await db
			.select({
				sequence: hrBulkImportAudit.sequence,
				event: hrBulkImportAudit.event,
				rowIndex: hrBulkImportAudit.rowIndex,
			})
			.from(hrBulkImportAudit)
			.where(
				and(
					eq(hrBulkImportAudit.organizationId, input.organizationId),
					eq(hrBulkImportAudit.checkpointId, input.checkpointId),
				),
			)
			.orderBy(asc(hrBulkImportAudit.sequence));
		const parsed = z.array(auditEventSchema).safeParse(rows);
		return parsed.success
			? errorResult.ok(parsed.data)
			: errorResult.fail("INTERNAL_ERROR");
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load bulk audit trail");
	}
}

async function mapCheckpointRow<Output>(
	row: CheckpointRow,
): Promise<Result<BulkCheckpoint<Output>>> {
	const auditTrail = await loadAuditTrail({
		organizationId: row.organizationId,
		checkpointId: row.id,
	});
	if (!auditTrail.ok) {
		return auditTrail;
	}
	const parsed = checkpointSchema.safeParse({
		...row,
		auditTrail: auditTrail.data,
	});
	return parsed.success
		? errorResult.ok(parsed.data as BulkCheckpoint<Output>)
		: errorResult.fail("INTERNAL_ERROR");
}

async function findRow(input: {
	organizationId: string;
	idempotencyKey: string;
}): Promise<CheckpointRow | undefined> {
	const rows = await db
		.select()
		.from(hrBulkImportCheckpoint)
		.where(
			and(
				eq(hrBulkImportCheckpoint.organizationId, input.organizationId),
				eq(hrBulkImportCheckpoint.idempotencyKey, input.idempotencyKey),
			),
		)
		.limit(1);
	return rows[0];
}

export function createDrizzleBulkCheckpointPort<
	Output = unknown,
>(): BulkCheckpointPort<Output> {
	return {
		async load(input) {
			try {
				const row = await findRow(input);
				return row ? mapCheckpointRow<Output>(row) : errorResult.ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to load bulk checkpoint");
			}
		},
		async save(input) {
			const { checkpoint, expectedVersion } = input;
			if (checkpoint.version !== (expectedVersion ?? 0) + 1) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			const auditJson = JSON.stringify(checkpoint.auditTrail);
			const rowsJson = JSON.stringify(checkpoint.rows);
			const failureJson =
				checkpoint.retryableFailure === null
					? null
					: JSON.stringify(checkpoint.retryableFailure);
			const errorFile = renderBulkErrorFile(checkpoint.rows);
			try {
				const statement = (sqlTag: NeonHttpSql) =>
					expectedVersion === null
						? sqlTag`
							WITH saved AS (
								INSERT INTO hr_bulk_import_checkpoint (
									organization_id, batch_id, entity_type, idempotency_key,
									request_fingerprint, status, next_row_index, version, rows,
									retryable_failure, updated_at
								) VALUES (
									${checkpoint.organizationId}, ${checkpoint.batchId}, ${checkpoint.entityType},
									${checkpoint.idempotencyKey}, ${checkpoint.requestFingerprint}, ${checkpoint.status},
									${checkpoint.nextRowIndex}, ${checkpoint.version}, ${rowsJson}::jsonb,
									${failureJson}::jsonb, now()
								)
								ON CONFLICT DO NOTHING
								RETURNING id, organization_id, version
							), audit_insert AS (
								INSERT INTO hr_bulk_import_audit (
									organization_id, checkpoint_id, sequence, event, row_index, checkpoint_version
								)
								SELECT saved.organization_id, saved.id, audit.sequence, audit.event, audit.row_index, saved.version
								FROM saved CROSS JOIN jsonb_to_recordset(${auditJson}::jsonb)
									AS audit(sequence integer, event text, row_index integer)
								ON CONFLICT DO NOTHING
							), error_insert AS (
								INSERT INTO hr_bulk_import_error_artifact (
									organization_id, checkpoint_id, checkpoint_version, content
								)
								SELECT saved.organization_id, saved.id, saved.version, ${errorFile}
								FROM saved WHERE ${errorFile}::text IS NOT NULL
							)
							SELECT id FROM saved
						`
						: sqlTag`
							WITH saved AS (
								UPDATE hr_bulk_import_checkpoint
								SET status = ${checkpoint.status}, next_row_index = ${checkpoint.nextRowIndex},
									version = ${checkpoint.version}, rows = ${rowsJson}::jsonb,
									retryable_failure = ${failureJson}::jsonb, updated_at = now()
								WHERE organization_id = ${checkpoint.organizationId}
									AND idempotency_key = ${checkpoint.idempotencyKey}
									AND batch_id = ${checkpoint.batchId}
									AND request_fingerprint = ${checkpoint.requestFingerprint}
									AND version = ${expectedVersion}
								RETURNING id, organization_id, version
							), audit_insert AS (
								INSERT INTO hr_bulk_import_audit (
									organization_id, checkpoint_id, sequence, event, row_index, checkpoint_version
								)
								SELECT saved.organization_id, saved.id, audit.sequence, audit.event, audit.row_index, saved.version
								FROM saved CROSS JOIN jsonb_to_recordset(${auditJson}::jsonb)
									AS audit(sequence integer, event text, row_index integer)
								ON CONFLICT DO NOTHING
							), error_insert AS (
								INSERT INTO hr_bulk_import_error_artifact (
									organization_id, checkpoint_id, checkpoint_version, content
								)
								SELECT saved.organization_id, saved.id, saved.version, ${errorFile}
								FROM saved WHERE ${errorFile}::text IS NOT NULL
								ON CONFLICT DO NOTHING
							)
							SELECT id FROM saved
						`;
				const [saved] = await runNeonHttpTransaction((sqlTag) => [
					statement(sqlTag),
				]);
				if (!saved[0]) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				const row = await findRow(checkpoint);
				return row
					? mapCheckpointRow<Output>(row)
					: errorResult.fail("INTERNAL_ERROR");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(error, "Failed to save bulk checkpoint");
			}
		},
		async listAuditEvents(input) {
			try {
				const row = await findRow(input);
				return row
					? loadAuditTrail({
							organizationId: input.organizationId,
							checkpointId: row.id,
						})
					: errorResult.ok([]);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to list bulk audit events");
			}
		},
		async loadLatestErrorArtifact(input) {
			try {
				const checkpoint = await findRow(input);
				if (!checkpoint) {
					return errorResult.ok(null);
				}
				const rows = await db
					.select()
					.from(hrBulkImportErrorArtifact)
					.where(
						and(
							eq(
								hrBulkImportErrorArtifact.organizationId,
								input.organizationId,
							),
							eq(hrBulkImportErrorArtifact.checkpointId, checkpoint.id),
						),
					)
					.orderBy(desc(hrBulkImportErrorArtifact.checkpointVersion))
					.limit(1);
				const [artifact] = rows;
				if (!artifact) {
					return errorResult.ok(null);
				}
				const result: BulkErrorArtifact = {
					organizationId: artifact.organizationId,
					batchId: checkpoint.batchId,
					checkpointVersion: artifact.checkpointVersion,
					contentType: "text/csv",
					content: artifact.content,
				};
				return errorResult.ok(result);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load bulk error artifact",
				);
			}
		},
	};
}
