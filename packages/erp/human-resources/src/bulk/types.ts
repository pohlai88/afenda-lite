import type { Result } from "@afenda/errors";

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

export interface BulkImportRow<Row> {
	payload: Row;
	sourceReference: string;
}
export interface BulkImportRequest<Row> {
	actorUserId: string;
	batchId: string;
	correlationId: string;
	entityType: HumanResourcesBulkEntityType;
	expectedCheckpointVersion?: number;
	idempotencyKey: string;
	maxRowsPerRun?: number;
	mode: BulkImportMode;
	organizationId: string;
	rows: readonly BulkImportRow<Row>[];
}
export interface BulkRowIssue {
	code: string;
	disposition: BulkFailureDisposition;
	field?: string;
	message: string;
}
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
export interface BulkAuditEvent {
	event:
		| "BATCH_STARTED"
		| "ROW_ACCEPTED"
		| "ROW_REJECTED"
		| "BATCH_CHECKPOINTED"
		| "BATCH_COMPLETED"
		| "BATCH_RETRYABLE_FAILED";
	rowIndex: number | null;
	sequence: number;
}
export interface BulkErrorArtifact {
	batchId: string;
	checkpointVersion: number;
	content: string;
	contentType: "text/csv";
	organizationId: string;
}
export interface BulkCheckpoint<Output = unknown> {
	auditTrail: readonly BulkAuditEvent[];
	batchId: string;
	entityType: HumanResourcesBulkEntityType;
	idempotencyKey: string;
	nextRowIndex: number;
	organizationId: string;
	requestFingerprint: string;
	retryableFailure:
		| (BulkRowIssue & { rowIndex: number; sourceReference: string })
		| null;
	rows: readonly BulkRowOutcome<Output>[];
	status: BulkBatchStatus;
	version: number;
}
export interface BulkCheckpointPort<Output = unknown> {
	listAuditEvents: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<readonly BulkAuditEvent[]>>;
	load: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<BulkCheckpoint<Output> | null>>;
	loadLatestErrorArtifact: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<BulkErrorArtifact | null>>;
	save: (input: {
		checkpoint: BulkCheckpoint<Output>;
		expectedVersion: number | null;
	}) => Promise<Result<BulkCheckpoint<Output>>>;
}
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
export interface BulkImportPorts<Row, Validated, Output> {
	checkpoints: BulkCheckpointPort<Output>;
	execute: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entityType: HumanResourcesBulkEntityType;
		batchId: string;
		rowIndex: number;
		sourceReference: string;
		rowIdempotencyKey: string;
		value: Validated;
	}) => Promise<BulkRowExecutionResult<Output>>;
	validate: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entityType: HumanResourcesBulkEntityType;
		rowIndex: number;
		row: BulkImportRow<Row>;
	}) => Promise<BulkRowValidationResult<Validated>>;
}
export interface BulkImportResult<Output = unknown> {
	batchId: string;
	checkpointVersion: number | null;
	entityType: HumanResourcesBulkEntityType;
	errorFile: string | null;
	mode: BulkImportMode;
	nextRowIndex: number;
	organizationId: string;
	requestFingerprint: string;
	retryableFailure: BulkCheckpoint<Output>["retryableFailure"];
	rows: readonly BulkRowOutcome<Output>[];
	status: "dry_run_completed" | BulkBatchStatus;
	totals: { accepted: number; rejected: number; pending: number };
}
