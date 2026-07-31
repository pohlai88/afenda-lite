import { createHash } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
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
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
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
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	const rowsPerRun =
		input.maxRowsPerRun ?? DEFAULT_HUMAN_RESOURCES_BULK_ROWS_PER_RUN;
	if (rowsPerRun < 1 || rowsPerRun > MAX_HUMAN_RESOURCES_BULK_ROWS) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	return errorResult.ok(rowsPerRun);
}

function sourceReferenceIssue(
	sourceReference: string,
	seen: Set<string>,
): BulkRowIssue | null {
	if (sourceReference.trim().length === 0) {
		return {
			code: "EMPTY_SOURCE_REFERENCE",
			message: "Source reference is required",
			field: "sourceReference",
			disposition: "terminal",
		};
	}
	if (seen.has(sourceReference)) {
		return {
			code: "DUPLICATE_SOURCE_REFERENCE",
			message: "Source reference is duplicated in this batch",
			field: "sourceReference",
			disposition: "terminal",
		};
	}
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

async function validateDryRunRows<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
	rowIndex: number,
	outcomes: readonly BulkRowOutcome<Output>[],
	seenSourceReferences: Set<string>,
): Promise<Result<readonly BulkRowOutcome<Output>[]>> {
	const row = input.rows[rowIndex];
	if (row === undefined) {
		return errorResult.ok(outcomes);
	}
	const referenceIssue = sourceReferenceIssue(
		row.sourceReference,
		seenSourceReferences,
	);
	if (referenceIssue !== null) {
		return validateDryRunRows(
			input,
			ports,
			rowIndex + 1,
			[
				...outcomes,
				{
					rowIndex,
					sourceReference: row.sourceReference,
					status: "rejected",
					issues: [referenceIssue],
				},
			],
			seenSourceReferences,
		);
	}
	const validation = await ports.validate({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entityType: input.entityType,
		rowIndex,
		row,
	});
	const outcome: BulkRowOutcome<Output> = validation.valid
		? { rowIndex, sourceReference: row.sourceReference, status: "accepted" }
		: {
				rowIndex,
				sourceReference: row.sourceReference,
				status: "rejected",
				issues: terminalIssues(validation.issues),
			};
	return validateDryRunRows(
		input,
		ports,
		rowIndex + 1,
		[...outcomes, outcome],
		seenSourceReferences,
	);
}

type CommitRowResolution<Output> =
	| { kind: "outcome"; outcome: BulkRowOutcome<Output> }
	| {
			kind: "retryable_failure";
			failure: NonNullable<BulkCheckpoint<Output>["retryableFailure"]>;
	  };

async function resolveCommitRow<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
	rowIndex: number,
	seenSourceReferences: Set<string>,
): Promise<Result<CommitRowResolution<Output>>> {
	const row = input.rows[rowIndex];
	if (row === undefined) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const referenceIssue = sourceReferenceIssue(
		row.sourceReference,
		seenSourceReferences,
	);
	const validation = await ports.validate({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entityType: input.entityType,
		rowIndex,
		row,
	});
	if (referenceIssue !== null) {
		return errorResult.ok({
			kind: "outcome",
			outcome: {
				rowIndex,
				sourceReference: row.sourceReference,
				status: "rejected",
				issues: [referenceIssue],
			},
		});
	}
	if (!validation.valid) {
		return errorResult.ok({
			kind: "outcome",
			outcome: {
				rowIndex,
				sourceReference: row.sourceReference,
				status: "rejected",
				issues: terminalIssues(validation.issues),
			},
		});
	}
	let execution: BulkRowExecutionResult<Output>;
	try {
		execution = await ports.execute({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			entityType: input.entityType,
			batchId: input.batchId,
			rowIndex,
			sourceReference: row.sourceReference,
			rowIdempotencyKey: `${input.idempotencyKey}:${row.sourceReference}`,
			value: validation.value,
		});
	} catch {
		execution = {
			status: "retryable_failure",
			issue: {
				code: "EXECUTOR_UNAVAILABLE",
				message: "Bulk row executor is temporarily unavailable",
			},
		};
	}
	if (execution.status === "retryable_failure") {
		return errorResult.ok({
			kind: "retryable_failure",
			failure: {
				...execution.issue,
				disposition: "retryable",
				rowIndex,
				sourceReference: row.sourceReference,
			},
		});
	}
	if (execution.status === "applied") {
		return errorResult.ok({
			kind: "outcome",
			outcome: {
				rowIndex,
				sourceReference: row.sourceReference,
				status: "accepted",
				...(execution.output === undefined ? {} : { output: execution.output }),
			},
		});
	}
	return errorResult.ok({
		kind: "outcome",
		outcome: {
			rowIndex,
			sourceReference: row.sourceReference,
			status: "rejected",
			issues: terminalIssues(execution.issues),
		},
	});
}

function checkpointStatus<Output>(
	atEnd: boolean,
	outcomes: readonly BulkRowOutcome<Output>[],
): BulkCheckpoint<Output>["status"] {
	if (!atEnd) {
		return "checkpointed";
	}
	return outcomes.some((entry) => entry.status === "rejected")
		? "completed_with_rejections"
		: "completed";
}

interface CommitProcessingState<Output> {
	auditTrail: readonly BulkAuditEvent[];
	checkpoint: BulkCheckpoint<Output> | null;
	expectedVersion: number | null;
	nextRowIndex: number;
	outcomes: readonly BulkRowOutcome<Output>[];
	runEnd: number;
	seenSourceReferences: Set<string>;
}

async function processCommitRows<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
	fingerprint: string,
	state: CommitProcessingState<Output>,
): Promise<Result<BulkImportResult<Output>>> {
	if (state.nextRowIndex >= state.runEnd) {
		if (state.checkpoint === null) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		return errorResult.ok(
			presentResult({
				request: input,
				fingerprint,
				status: state.checkpoint.status,
				nextRowIndex: state.checkpoint.nextRowIndex,
				checkpointVersion: state.checkpoint.version,
				rows: state.checkpoint.rows,
				retryableFailure: state.checkpoint.retryableFailure,
			}),
		);
	}
	const resolved = await resolveCommitRow(
		input,
		ports,
		state.nextRowIndex,
		state.seenSourceReferences,
	);
	if (!resolved.ok) {
		return resolved;
	}
	if (resolved.data.kind === "retryable_failure") {
		const auditTrail = appendAudit(
			state.auditTrail,
			"BATCH_RETRYABLE_FAILED",
			state.nextRowIndex,
		);
		const saved = await ports.checkpoints.save({
			expectedVersion: state.expectedVersion,
			checkpoint: {
				organizationId: input.organizationId,
				batchId: input.batchId,
				entityType: input.entityType,
				idempotencyKey: input.idempotencyKey,
				requestFingerprint: fingerprint,
				status: "retryable_failed",
				nextRowIndex: state.nextRowIndex,
				version: (state.expectedVersion ?? 0) + 1,
				rows: state.outcomes,
				retryableFailure: resolved.data.failure,
				auditTrail,
			},
		});
		if (!saved.ok) {
			return saved;
		}
		return errorResult.ok(
			presentResult({
				request: input,
				fingerprint,
				status: saved.data.status,
				nextRowIndex: state.nextRowIndex,
				checkpointVersion: saved.data.version,
				rows: state.outcomes,
				retryableFailure: resolved.data.failure,
			}),
		);
	}
	const outcomes = [...state.outcomes, resolved.data.outcome];
	const nextRowIndex = state.nextRowIndex + 1;
	let auditTrail = appendAudit(
		state.auditTrail,
		resolved.data.outcome.status === "accepted"
			? "ROW_ACCEPTED"
			: "ROW_REJECTED",
		resolved.data.outcome.rowIndex,
	);
	const atEnd = nextRowIndex === input.rows.length;
	if (atEnd || nextRowIndex === state.runEnd) {
		auditTrail = appendAudit(
			auditTrail,
			atEnd ? "BATCH_COMPLETED" : "BATCH_CHECKPOINTED",
			null,
		);
	}
	const saved = await ports.checkpoints.save({
		expectedVersion: state.expectedVersion,
		checkpoint: {
			organizationId: input.organizationId,
			batchId: input.batchId,
			entityType: input.entityType,
			idempotencyKey: input.idempotencyKey,
			requestFingerprint: fingerprint,
			status: checkpointStatus(atEnd, outcomes),
			nextRowIndex,
			version: (state.expectedVersion ?? 0) + 1,
			rows: outcomes,
			retryableFailure: null,
			auditTrail,
		},
	});
	if (!saved.ok) {
		return saved;
	}
	return processCommitRows(input, ports, fingerprint, {
		...state,
		auditTrail,
		checkpoint: saved.data,
		expectedVersion: saved.data.version,
		nextRowIndex,
		outcomes,
	});
}

async function runCommitImport<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
	fingerprint: string,
	rowsPerRun: number,
): Promise<Result<BulkImportResult<Output>>> {
	const loaded = await ports.checkpoints.load({
		organizationId: input.organizationId,
		idempotencyKey: input.idempotencyKey,
	});
	if (!loaded.ok) {
		return loaded;
	}
	const checkpoint = loaded.data;
	if (checkpoint !== null && checkpoint.requestFingerprint !== fingerprint) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	if (
		input.expectedCheckpointVersion !== undefined &&
		checkpoint?.version !== input.expectedCheckpointVersion
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	if (
		checkpoint !== null &&
		(checkpoint.status === "completed" ||
			checkpoint.status === "completed_with_rejections")
	) {
		return errorResult.ok(
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
	}
	const nextRowIndex = checkpoint?.nextRowIndex ?? 0;
	const initialAuditTrail = checkpoint?.auditTrail ?? [];
	return processCommitRows(input, ports, fingerprint, {
		auditTrail:
			checkpoint === null
				? appendAudit(initialAuditTrail, "BATCH_STARTED", null)
				: initialAuditTrail,
		checkpoint,
		expectedVersion: checkpoint?.version ?? null,
		nextRowIndex,
		outcomes: checkpoint?.rows ?? [],
		runEnd: Math.min(nextRowIndex + rowsPerRun, input.rows.length),
		seenSourceReferences: new Set(
			input.rows.slice(0, nextRowIndex).map((row) => row.sourceReference),
		),
	});
}

export async function runHumanResourcesBulkImport<Row, Validated, Output>(
	input: BulkImportRequest<Row>,
	ports: BulkImportPorts<Row, Validated, Output>,
): Promise<Result<BulkImportResult<Output>>> {
	const validatedRequest = validateRequest(input);
	if (!validatedRequest.ok) {
		return validatedRequest;
	}
	const fingerprint = fingerprintBulkRequest(input);
	if (input.mode === "commit") {
		return runCommitImport(input, ports, fingerprint, validatedRequest.data);
	}
	const outcomes = await validateDryRunRows(
		input,
		ports,
		0,
		[],
		new Set<string>(),
	);
	if (!outcomes.ok) {
		return outcomes;
	}
	return errorResult.ok(
		presentResult({
			request: input,
			fingerprint,
			status: "dry_run_completed",
			nextRowIndex: input.rows.length,
			checkpointVersion: null,
			rows: outcomes.data,
			retryableFailure: null,
		}),
	);
}
