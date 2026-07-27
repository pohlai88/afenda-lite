/**
 * ## Import Application
 *
 * Import application must require an approved batch, revalidate versions,
 * enforce approved fields, invoke package-owned commands, process rows in
 * bounded chunks, report row-level outcomes, support safe retry and resume,
 * preserve the approved source snapshot, and create audit facts and domain
 * events for each successful mutation.
 *
 * A previously applied row must return its recorded result rather than repeat
 * the mutation. Replay is an idempotent success path, not a governance failure.
 */
import { ok, type Result } from "@afenda/errors/result";

import {
	governanceRequestNotApproved,
	governanceVersionConflict,
} from "./governance-errors";
import type {
	ImportBatchCounters,
	ImportBatchStatus,
	ImportRowEvidence,
} from "./import-types";

const IMPORT_APPLY_OPERATION = "import.apply" as const;

export type ImportRowIdempotencyIdentity = Readonly<{
	organizationId: string;
	importBatchId: string;
	importRowId: string;
	operationFingerprint: string;
}>;

export type ImportRowApplicationDecision =
	| Readonly<{
			kind: "apply";
			rowId: string;
	  }>
	| Readonly<{
			kind: "replay";
			rowId: string;
			recordedResultEntityId: string | null;
			recordedResultEntityVersion: number | null;
	  }>
	| Readonly<{
			kind: "busy";
			rowId: string;
	  }>
	| Readonly<{
			kind: "skip";
			rowId: string;
	  }>;

export type ImportApplySummary = ImportBatchCounters;

export function buildImportRowIdempotencyKey(
	input: ImportRowIdempotencyIdentity,
): string {
	return [
		encodeKeyPart("organization", input.organizationId),
		encodeKeyPart("batch", input.importBatchId),
		encodeKeyPart("row", input.importRowId),
		encodeKeyPart("fingerprint", input.operationFingerprint),
	].join("|");
}

export function assertImportBatchApproved(input: {
	batchId?: string;
	status: ImportBatchStatus;
}): Result<true> {
	if (input.status !== "approved") {
		return governanceRequestNotApproved({
			operation: IMPORT_APPLY_OPERATION,
			entityId: input.batchId,
			currentStatus: input.status,
		});
	}
	return ok(true);
}

export function assertImportBatchWorkflowVersion(input: {
	batchId: string;
	expectedWorkflowVersion: number;
	actualWorkflowVersion: number;
}): Result<true> {
	if (input.actualWorkflowVersion !== input.expectedWorkflowVersion) {
		return governanceVersionConflict({
			operation: IMPORT_APPLY_OPERATION,
			entityId: input.batchId,
			versionKind: "workflow",
			expectedVersion: input.expectedWorkflowVersion,
			actualVersion: input.actualWorkflowVersion,
		});
	}
	return ok(true);
}

export function decideImportRowApplication(input: {
	row: Pick<
		ImportRowEvidence,
		"rowId" | "applyStatus" | "resultEntityId" | "resultEntityVersion"
	>;
}): Result<ImportRowApplicationDecision> {
	const { row } = input;
	switch (row.applyStatus) {
		case "applied":
		case "replayed":
			return ok({
				kind: "replay",
				rowId: row.rowId,
				recordedResultEntityId: row.resultEntityId,
				recordedResultEntityVersion: row.resultEntityVersion,
			});
		case "applying":
			return ok({ kind: "busy", rowId: row.rowId });
		case "skipped":
			return ok({ kind: "skip", rowId: row.rowId });
		case "pending":
		case "failed":
			return ok({ kind: "apply", rowId: row.rowId });
		default:
			return assertNever(row.applyStatus);
	}
}

export function summarizeImportApplyRows(
	rows: readonly Pick<
		ImportRowEvidence,
		"applyStatus" | "validationStatus" | "validationFindings"
	>[],
): ImportApplySummary {
	let appliedCount = 0;
	let failedCount = 0;
	let skippedCount = 0;
	let replayedCount = 0;
	let pendingCount = 0;
	let applyingCount = 0;
	let pendingValidationCount = 0;
	let warningCount = 0;
	let validCount = 0;
	let invalidCount = 0;

	for (const row of rows) {
		warningCount += row.validationFindings.filter(
			(finding) => finding.severity === "warning",
		).length;
		if (
			row.validationStatus === "pending" ||
			row.validationStatus === "validating"
		) {
			pendingValidationCount += 1;
		}
		if (
			row.validationStatus === "valid" ||
			row.validationStatus === "warning"
		) {
			validCount += 1;
		}
		if (row.validationStatus === "invalid") {
			invalidCount += 1;
		}
		switch (row.applyStatus) {
			case "applied":
				appliedCount += 1;
				break;
			case "failed":
				failedCount += 1;
				break;
			case "skipped":
				skippedCount += 1;
				break;
			case "replayed":
				replayedCount += 1;
				break;
			case "pending":
				pendingCount += 1;
				break;
			case "applying":
				applyingCount += 1;
				break;
			default:
				assertNever(row.applyStatus);
		}
	}

	return {
		totalCount: rows.length,
		pendingValidationCount,
		validCount,
		invalidCount,
		appliedCount,
		replayedCount,
		failedCount,
		skippedCount,
		warningCount,
		applyingCount,
		pendingApplyCount: pendingCount,
	};
}

function encodeKeyPart(label: string, value: string): string {
	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new Error(`${label} must not be empty`);
	}
	return `${normalized.length}:${normalized}`;
}

function assertNever(value: never): never {
	throw new Error(`Unsupported import row apply status: ${String(value)}`);
}
