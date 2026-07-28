import type { Result } from "@afenda/errors/result";

export const HUMAN_RESOURCES_BULK_ENTITY_TYPES = [
	"employee",
	"assignment",
	"leave_entitlement",
	"attendance",
	"compensation",
	"learning_assignment",
] as const;
export type HumanResourcesBulkEntityType =
	(typeof HUMAN_RESOURCES_BULK_ENTITY_TYPES)[number];
export type BulkImportMode = "dry_run" | "commit";
export type BulkFailureDisposition = "retryable" | "terminal";

export type BulkImportRow<Row> = { sourceReference: string; payload: Row };
export type BulkImportRequest<Row> = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	batchId: string;
	entityType: HumanResourcesBulkEntityType;
	mode: BulkImportMode;
	idempotencyKey: string;
	rows: readonly BulkImportRow<Row>[];
	maxRowsPerRun?: number;
	expectedCheckpointVersion?: number;
};
export type BulkRowIssue = {
	code: string;
	message: string;
	field?: string;
	disposition: BulkFailureDisposition;
};
export type BulkRowOutcome<Output = unknown> =
	| {
			rowIndex: number;
			sourceReference: string;
			status: "accepted";
			output?: Output;
	  }
	| {
			rowIndex: number;
			sourceReference: string;
			status: "rejected";
			issues: readonly BulkRowIssue[];
	  };
export type BulkBatchStatus =
	| "checkpointed"
	| "completed"
	| "completed_with_rejections"
	| "retryable_failed";
export type BulkAuditEvent = {
	sequence: number;
	event:
		| "BATCH_STARTED"
		| "ROW_ACCEPTED"
		| "ROW_REJECTED"
		| "BATCH_CHECKPOINTED"
		| "BATCH_COMPLETED"
		| "BATCH_RETRYABLE_FAILED";
	rowIndex: number | null;
};
export type BulkErrorArtifact = {
	organizationId: string;
	batchId: string;
	checkpointVersion: number;
	contentType: "text/csv";
	content: string;
};
export type BulkCheckpoint<Output = unknown> = {
	organizationId: string;
	batchId: string;
	entityType: HumanResourcesBulkEntityType;
	idempotencyKey: string;
	requestFingerprint: string;
	status: BulkBatchStatus;
	nextRowIndex: number;
	version: number;
	rows: readonly BulkRowOutcome<Output>[];
	retryableFailure:
		| (BulkRowIssue & { rowIndex: number; sourceReference: string })
		| null;
	auditTrail: readonly BulkAuditEvent[];
};
export type BulkCheckpointPort<Output = unknown> = {
	load(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<BulkCheckpoint<Output> | null>>;
	save(input: {
		checkpoint: BulkCheckpoint<Output>;
		expectedVersion: number | null;
	}): Promise<Result<BulkCheckpoint<Output>>>;
	listAuditEvents(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<readonly BulkAuditEvent[]>>;
	loadLatestErrorArtifact(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<BulkErrorArtifact | null>>;
};
export type BulkRowValidationResult<Validated> =
	| { valid: true; value: Validated }
	| { valid: false; issues: readonly Omit<BulkRowIssue, "disposition">[] };
export type BulkRowExecutionResult<Output> =
	| { status: "applied"; output?: Output }
	| {
			status: "terminal_failure";
			issues: readonly Omit<BulkRowIssue, "disposition">[];
	  }
	| { status: "retryable_failure"; issue: Omit<BulkRowIssue, "disposition"> };
export type BulkImportPorts<Row, Validated, Output> = {
	checkpoints: BulkCheckpointPort<Output>;
	validate(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entityType: HumanResourcesBulkEntityType;
		rowIndex: number;
		row: BulkImportRow<Row>;
	}): Promise<BulkRowValidationResult<Validated>>;
	execute(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entityType: HumanResourcesBulkEntityType;
		batchId: string;
		rowIndex: number;
		sourceReference: string;
		rowIdempotencyKey: string;
		value: Validated;
	}): Promise<BulkRowExecutionResult<Output>>;
};
export type BulkImportResult<Output = unknown> = {
	mode: BulkImportMode;
	organizationId: string;
	batchId: string;
	entityType: HumanResourcesBulkEntityType;
	requestFingerprint: string;
	status: "dry_run_completed" | BulkBatchStatus;
	nextRowIndex: number;
	checkpointVersion: number | null;
	rows: readonly BulkRowOutcome<Output>[];
	totals: { accepted: number; rejected: number; pending: number };
	retryableFailure: BulkCheckpoint<Output>["retryableFailure"];
	errorFile: string | null;
};
