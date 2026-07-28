import { createHash } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import { renderBulkErrorFile } from "./error-file";
import {
	type BulkAuditEvent,
	type BulkCheckpoint,
	type BulkImportPorts,
	type BulkImportRequest,
	type BulkImportResult,
	type BulkRowExecutionResult,
	type BulkRowIssue,
	type BulkRowOutcome,
	HUMAN_RESOURCES_BULK_ENTITY_TYPES,
} from "./types";

export const MAX_HUMAN_RESOURCES_BULK_ROWS = 500;
export const DEFAULT_HUMAN_RESOURCES_BULK_ROWS_PER_RUN = 100;

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)]),
		);
	}
	return value;
}

export function fingerprintBulkRequest<Row>(
	input: BulkImportRequest<Row>,
): string {
	return createHash("sha256")
		.update(
			JSON.stringify(
				canonicalize({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					batchId: input.batchId,
					entityType: input.entityType,
					rows: input.rows,
				}),
			),
		)
		.digest("hex");
}

function validateRequest<Row>(input: BulkImportRequest<Row>): Result<number> {
	if (
		input.organizationId.trim().length === 0 ||
		input.actorUserId.trim().length === 0 ||
		input.correlationId.trim().length === 0 ||
		input.batchId.trim().length === 0 ||
		input.idempotencyKey.trim().length === 0 ||
		!HUMAN_RESOURCES_BULK_ENTITY_TYPES.includes(input.entityType) ||
		(input.mode !== "dry_run" && input.mode !== "commit") ||
		input.rows.length === 0 ||
		input.rows.length > MAX_HUMAN_RESOURCES_BULK_ROWS
	)
		return fail("VALIDATION_ERROR", "Invalid Human Resources bulk request");
	const rowsPerRun =
		input.maxRowsPerRun ?? DEFAULT_HUMAN_RESOURCES_BULK_ROWS_PER_RUN;
	if (rowsPerRun < 1 || rowsPerRun > MAX_HUMAN_RESOURCES_BULK_ROWS)
		return fail(
			"VALIDATION_ERROR",
			"Bulk rows per run is outside the safe range",
		);
	return ok(rowsPerRun);
}

function sourceReferenceIssue(
	sourceReference: string,
	seen: Set<string>,
): BulkRowIssue | null {
	if (sourceReference.trim().length === 0)
		return {
			code: "EMPTY_SOURCE_REFERENCE",
			message: "Source reference is required",
			field: "sourceReference",
			disposition: "terminal",
		};
	if (seen.has(sourceReference))
		return {
			code: "DUPLICATE_SOURCE_REFERENCE",
			message: "Source reference is duplicated in this batch",
			field: "sourceReference",
			disposition: "terminal",
		};
	seen.add(sourceReference);
	return null;
}

function terminalIssues(
	issues: readonly Omit<BulkRowIssue, "disposition">[],
): readonly BulkRowIssue[] {
	return issues.map((issue) => ({ ...issue, disposition: "terminal" }));
}

function appendAudit(
	auditTrail: readonly BulkAuditEvent[],
	event: BulkAuditEvent["event"],
	rowIndex: number | null,
): BulkAuditEvent[] {
	return [...auditTrail, { sequence: auditTrail.length + 1, event, rowIndex }];
}

function presentResult<Output>(input: {
	request: BulkImportRequest<unknown>;
	fingerprint: string;
	status: BulkImportResult<Output>["status"];
	nextRowIndex: number;
	checkpointVersion: number | null;
	rows: readonly BulkRowOutcome<Output>[];
	retryableFailure: BulkImportResult<Output>["retryableFailure"];
}): BulkImportResult<Output> {
	const accepted = input.rows.filter((row) => row.status === "accepted").length;
	const rejected = input.rows.length - accepted;
	return {
		mode: input.request.mode,
		organizationId: input.request.organizationId,
		batchId: input.request.batchId,
		entityType: input.request.entityType,
		requestFingerprint: input.fingerprint,
		status: input.status,
		nextRowIndex: input.nextRowIndex,
		checkpointVersion: input.checkpointVersion,
		rows: input.rows,
		totals: {
			accepted,
			rejected,
			pending: input.request.rows.length - input.nextRowIndex,
		},
		retryableFailure: input.retryableFailure,
		errorFile: renderBulkErrorFile(input.rows),
	};
}

export async function runHumanResourcesBulkImport<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
): Promise<Result<BulkImportResult<Output>>> {
	const validatedRequest = validateRequest(input);
	if (!validatedRequest.ok) return validatedRequest;
	const fingerprint = fingerprintBulkRequest(input);

	if (input.mode === "dry_run") {
		const outcomes: BulkRowOutcome<Output>[] = [];
		const seenSourceReferences = new Set<string>();
		for (const [rowIndex, row] of input.rows.entries()) {
			const referenceIssue = sourceReferenceIssue(
				row.sourceReference,
				seenSourceReferences,
			);
			if (referenceIssue !== null) {
				outcomes.push({
					rowIndex,
					sourceReference: row.sourceReference,
					status: "rejected",
					issues: [referenceIssue],
				});
				continue;
			}
			const validation = await ports.validate({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entityType: input.entityType,
				rowIndex,
				row,
			});
			outcomes.push(
				validation.valid
					? {
							rowIndex,
							sourceReference: row.sourceReference,
							status: "accepted",
						}
					: {
							rowIndex,
							sourceReference: row.sourceReference,
							status: "rejected",
							issues: terminalIssues(validation.issues),
						},
			);
		}
		return ok(
			presentResult({
				request: input,
				fingerprint,
				status: "dry_run_completed",
				nextRowIndex: input.rows.length,
				checkpointVersion: null,
				rows: outcomes,
				retryableFailure: null,
			}),
		);
	}

	const loaded = await ports.checkpoints.load({
		organizationId: input.organizationId,
		idempotencyKey: input.idempotencyKey,
	});
	if (!loaded.ok) return loaded;
	let checkpoint = loaded.data;
	if (checkpoint !== null && checkpoint.requestFingerprint !== fingerprint)
		return fail(
			"CONFLICT",
			"Bulk idempotency key was reused with different rows",
		);
	if (
		input.expectedCheckpointVersion !== undefined &&
		checkpoint?.version !== input.expectedCheckpointVersion
	)
		return fail("CONFLICT", "Bulk resume checkpoint version is stale");
	if (
		checkpoint !== null &&
		(checkpoint.status === "completed" ||
			checkpoint.status === "completed_with_rejections")
	)
		return ok(
			presentResult({
				request: input,
				fingerprint,
				status: checkpoint.status,
				nextRowIndex: checkpoint.nextRowIndex,
				checkpointVersion: checkpoint.version,
				rows: checkpoint.rows,
				retryableFailure: null,
			}),
		);

	let expectedVersion = checkpoint?.version ?? null;
	const outcomes = [...(checkpoint?.rows ?? [])];
	let nextRowIndex = checkpoint?.nextRowIndex ?? 0;
	let auditTrail = checkpoint?.auditTrail ?? [];
	const seenSourceReferences = new Set(
		input.rows.slice(0, nextRowIndex).map((row) => row.sourceReference),
	);
	if (checkpoint === null)
		auditTrail = appendAudit(auditTrail, "BATCH_STARTED", null);
	const runEnd = Math.min(
		nextRowIndex + validatedRequest.data,
		input.rows.length,
	);

	while (nextRowIndex < runEnd) {
		const row = input.rows[nextRowIndex];
		if (row === undefined)
			return fail(
				"INTERNAL_ERROR",
				"Bulk checkpoint exceeded the row boundary",
			);
		const referenceIssue = sourceReferenceIssue(
			row.sourceReference,
			seenSourceReferences,
		);
		const validation = await ports.validate({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entityType: input.entityType,
			rowIndex: nextRowIndex,
			row,
		});
		let outcome: BulkRowOutcome<Output>;
		if (referenceIssue !== null) {
			outcome = {
				rowIndex: nextRowIndex,
				sourceReference: row.sourceReference,
				status: "rejected",
				issues: [referenceIssue],
			};
		} else if (!validation.valid) {
			outcome = {
				rowIndex: nextRowIndex,
				sourceReference: row.sourceReference,
				status: "rejected",
				issues: terminalIssues(validation.issues),
			};
		} else {
			let execution: BulkRowExecutionResult<Output>;
			try {
				execution = await ports.execute({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entityType: input.entityType,
					batchId: input.batchId,
					rowIndex: nextRowIndex,
					sourceReference: row.sourceReference,
					rowIdempotencyKey: `${input.idempotencyKey}:${row.sourceReference}`,
					value: validation.value,
				});
			} catch {
				execution = {
					status: "retryable_failure" as const,
					issue: {
						code: "EXECUTOR_UNAVAILABLE",
						message: "Bulk row executor is temporarily unavailable",
					},
				};
			}
			if (execution.status === "retryable_failure") {
				const retryableFailure = {
					...execution.issue,
					disposition: "retryable" as const,
					rowIndex: nextRowIndex,
					sourceReference: row.sourceReference,
				};
				auditTrail = appendAudit(
					auditTrail,
					"BATCH_RETRYABLE_FAILED",
					nextRowIndex,
				);
				const saved = await ports.checkpoints.save({
					expectedVersion,
					checkpoint: {
						organizationId: input.organizationId,
						batchId: input.batchId,
						entityType: input.entityType,
						idempotencyKey: input.idempotencyKey,
						requestFingerprint: fingerprint,
						status: "retryable_failed",
						nextRowIndex,
						version: (expectedVersion ?? 0) + 1,
						rows: outcomes,
						retryableFailure,
						auditTrail,
					},
				});
				if (!saved.ok) return saved;
				return ok(
					presentResult({
						request: input,
						fingerprint,
						status: saved.data.status,
						nextRowIndex,
						checkpointVersion: saved.data.version,
						rows: outcomes,
						retryableFailure,
					}),
				);
			}
			outcome =
				execution.status === "applied"
					? {
							rowIndex: nextRowIndex,
							sourceReference: row.sourceReference,
							status: "accepted",
							output: execution.output,
						}
					: {
							rowIndex: nextRowIndex,
							sourceReference: row.sourceReference,
							status: "rejected",
							issues: terminalIssues(execution.issues),
						};
		}

		outcomes.push(outcome);
		nextRowIndex += 1;
		auditTrail = appendAudit(
			auditTrail,
			outcome.status === "accepted" ? "ROW_ACCEPTED" : "ROW_REJECTED",
			outcome.rowIndex,
		);
		const atEnd = nextRowIndex === input.rows.length;
		const status: BulkCheckpoint<Output>["status"] = atEnd
			? outcomes.some((entry) => entry.status === "rejected")
				? "completed_with_rejections"
				: "completed"
			: "checkpointed";
		if (atEnd || nextRowIndex === runEnd)
			auditTrail = appendAudit(
				auditTrail,
				atEnd ? "BATCH_COMPLETED" : "BATCH_CHECKPOINTED",
				null,
			);
		const saved = await ports.checkpoints.save({
			expectedVersion,
			checkpoint: {
				organizationId: input.organizationId,
				batchId: input.batchId,
				entityType: input.entityType,
				idempotencyKey: input.idempotencyKey,
				requestFingerprint: fingerprint,
				status,
				nextRowIndex,
				version: (expectedVersion ?? 0) + 1,
				rows: outcomes,
				retryableFailure: null,
				auditTrail,
			},
		});
		if (!saved.ok) return saved;
		checkpoint = saved.data;
		expectedVersion = saved.data.version;
	}
	if (checkpoint === null)
		return fail("INTERNAL_ERROR", "Bulk checkpoint was not persisted");
	return ok(
		presentResult({
			request: input,
			fingerprint,
			status: checkpoint.status,
			nextRowIndex: checkpoint.nextRowIndex,
			checkpointVersion: checkpoint.version,
			rows: checkpoint.rows,
			retryableFailure: checkpoint.retryableFailure,
		}),
	);
}
